# LendMail Meeting Notes Extractor — Implementation Plan

## Summary

LendMail will turn a Gemini meeting-notes notification into a reviewed, client-ready Gmail draft. For each connected Lendsqr user, the system will detect eligible Gemini notifications, retrieve the linked Google Doc, resolve the client and note style, extract a structured note with an LLM, validate it, and create a draft in the meeting organizer's mailbox.

The system will not send email, alter Gemini's note generation, or give administrators default access to mailbox or transcript content. This is a new project, so the repository layout and application framework named below are proposed boundaries to confirm during foundation work rather than existing code.

## Product Outcome

Reduce the manual work after a client meeting from 15–30 minutes to a short review while improving timeliness and consistency. The human attendee remains responsible for checking and sending every note.

Initial success means:

- a Gemini note for a connected organizer becomes one pipeline item within a few minutes;
- a clear client and approved style produce a structurally valid note;
- a correctly addressed Gmail draft appears in the organizer's mailbox;
- ambiguous, invalid, or unauthorized work stops in a visible recoverable state;
- no application path can send the draft.

## Scope

### In scope

- Per-user Google OAuth connection and disconnection.
- Scheduled Gmail capture for connected accounts.
- Linked Google Doc retrieval and transcript normalization.
- Client matching from attendee domains with manual resolution.
- Versioned organization, client, and personal note styles.
- Human-reviewed style distillation from uploaded samples.
- Structured LLM extraction and schema validation.
- HTML and plain-text note rendering.
- Gmail draft creation in the organizer's mailbox.
- User meeting-status views and administrator configuration queues.
- Retries, audit events, operational alerts, and controlled rollout.

### Out of scope

- Sending email automatically.
- Changing Gemini or how it generates meeting notes.
- Calendar polling or a separate meeting webhook in v1.
- Reading unrelated mailbox content.
- Administrators browsing raw mail or transcripts by default.
- Guessing a client, recipient, fact, owner, or deadline when evidence is unclear.

## Use Cases

| Actor | Use case | Expected result |
| :---- | :---- | :---- |
| User | Connect Google account | Required access is granted in one consent flow and capture becomes eligible. |
| User | Disconnect Google account | Stored credentials are invalidated, future polling stops immediately, and the UI reflects disconnection. |
| System | Capture a Gemini notification | One durable meeting record is created and the linked transcript is retrieved without duplicates. |
| System | Resolve client and style | A unique client and the highest-precedence approved style are attached, or processing pauses for review. |
| System | Extract and validate a note | Transcript-supported structured fields are produced; unsupported values remain empty. |
| System | Create a draft | A validated, rendered note becomes a Gmail draft in the organizer's mailbox and is never sent. |
| User | Monitor own meetings | The user sees current status, safe failure detail, and available recovery action. |
| User | Manage personal style | The user chooses an approved style, uploads a sample, and confirms a distilled style before use. |
| Admin | Manage clients and global styles | The admin maintains domain mappings, client context, and approved organization styles. |
| Admin | Resolve ambiguous meetings | The admin assigns a client without receiving default access to transcript or mailbox content. |

## Simple Flow

1. A user connects their Google account and the encrypted refresh token is stored.
2. A scheduled capture job searches only that user's mailbox for new Gemini note notifications after the user's saved checkpoint.
3. The system claims an unseen source message, parses safe metadata, identifies the linked Google Doc, and retrieves its content.
4. A durable meeting item is created before downstream processing begins.
5. Attendee domains are matched against active client-domain records. No unique match pauses the item at `needs_client`.
6. The system resolves an approved style in this order: meeting override, client default, user default, organization default.
7. The transcript, client context, and exact style version are sent once to the configured model for structured extraction.
8. Server-side validation accepts the result or moves the item to a visible failure state.
9. Validated output is rendered to HTML and plain text and saved as a Gmail draft in the organizer's mailbox.
10. The organizer reviews and manually sends the draft in Gmail.

## Codebase Responsibilities

Because no project repository exists yet, use one repository with independently deployable process boundaries unless foundation work identifies an organizational constraint.

| Proposed area | Responsibility |
| :---- | :---- |
| Web application | OAuth entry/callback, user meeting views, style management, and admin configuration. |
| API/domain application | Authorization, client and style resolution, pipeline commands, state transitions, and safe portal contracts. |
| Capture worker | Per-user Gmail polling, source claiming, linked-document retrieval, and capture checkpointing. |
| Processing worker | Extraction, validation, rendering, Gmail draft creation, and bounded retries. |
| PostgreSQL | Users, encrypted credential references, meetings, source identities, clients, styles, extraction results, attempts, and audit events. |
| Secrets/KMS service | Google client secret, LLM credentials, token-encryption keys, and key rotation. |
| Observability | Structured logs, metrics, alerts, traces, and redaction controls. |

Keep the pipeline's business rules in shared domain modules used by the API and workers. Workers should invoke those rules rather than reimplement state transitions.

## Code Changes

All entries are **new** because this is a greenfield project. Names describe the symbols engineers should create; final paths should follow the framework selected in Phase 0.

| Change | Code | What To Do |
| :---- | :---- | :---- |
| Bootstrap applications | `new web application`, `new API application`, `new capture worker`, `new processing worker` | Establish one versioned repository, shared configuration validation, database migrations, health checks, local development, CI, and separate web/worker process commands. |
| Authenticate portal users | `new SessionAuth`, `new User`, `new RoleGuard` | Restrict the portal to approved Lendsqr Workspace identities and enforce user/admin permissions on the server, not only in the UI. |
| Connect Google account | `new GoogleOAuthService.begin`, `new GoogleOAuthService.callback`, `new GoogleConnection` | Use state and PKCE, verify the returned Workspace identity, request only approved scopes, encrypt refresh tokens, and record connection health without returning credentials to the browser. |
| Disconnect Google account | `new GoogleOAuthService.disconnect` | Revoke the grant with Google, delete or render the local refresh token unusable, disable capture immediately, and retain only the audit metadata allowed by policy. |
| Poll eligible mailboxes | `new CaptureScheduler`, `new GmailNotificationFinder`, `new CaptureCheckpoint` | Poll connected users on a bounded schedule using a sender/signature query plus a per-user checkpoint; isolate failures so one account cannot stop the run. |
| Claim source once | `new SourceMessage`, `new CaptureService.claim` | Enforce a database uniqueness rule for the agreed source identity and make reruns return the existing item rather than duplicate it. |
| Parse notification | `new GeminiNotificationParser` | Extract meeting title/date, organizer, attendees, and document reference using verified notification samples; reject or quarantine unrecognized formats and emit a capture alert. |
| Retrieve transcript | `new GoogleDocumentReader`, `new TranscriptNormalizer` | Fetch the linked Doc with the connected user's authorized access, normalize supported Docs structures, cap size, and fail explicitly when the document is missing or inaccessible. |
| Manage clients | `new ClientService`, `new Client`, `new ClientDomain`, admin client UI | Maintain client context, active domain patterns, known contacts, and defaults; normalize domains and prevent unsafe overlapping mappings. |
| Resolve client | `new ClientResolver.resolve` | Exclude approved internal and consumer domains, require one unambiguous client result, and move all other items to `needs_client` without invoking the LLM. |
| Resolve a flagged client | `new MeetingService.assignClient`, admin resolution UI | Allow an authorized admin to assign the client, record actor/reason, and resume from the correct stage without duplicating completed work. |
| Manage styles | `new StyleService`, `new Style`, `new StyleVersion`, style management UI | Store immutable versions containing section order, labels, tone constraints, conditional fields, render rules, status, and ownership scope. |
| Distill sample style | `new StyleDistillationService`, `new StyleReview` | Treat uploaded content as untrusted input, produce a draft template, render a preview against test content, and require owner/admin approval before activation. |
| Resolve style | `new StyleResolver.resolve` | Select an active version by meeting override → client default → user default → organization default and persist the chosen version on the meeting. |
| Extract note | `new NoteExtractor.extract`, `new ModelProvider` | Send the normalized transcript, minimal client context, and resolved style schema in one call; require schema-constrained output and instruct the model not to infer unsupported facts. |
| Validate extraction | `new ExtractionValidator.validate` | Validate types, required keys, conditional sections, source-supported constraints, size limits, and policy rules before the result can be rendered. |
| Render note | `new NoteRenderer.renderHtml`, `new NoteRenderer.renderText` | Render only validated structured data with escaped values and deterministic templates; do not render model-supplied HTML. |
| Resolve recipients | `new RecipientResolver.resolve` | Apply the approved To/Cc policy from verified meeting metadata and client contacts; pause for review when organizer or external recipients are uncertain. |
| Create Gmail draft | `new GmailDraftService.create`, `new DraftRecord` | Build a MIME message with HTML and plain-text parts, create—not send—it with the organizer's token, and persist the Gmail draft ID under an idempotency guard. |
| Orchestrate pipeline | `new MeetingPipeline`, `new MeetingStatusPolicy`, `new ProcessingAttempt` | Permit only documented state transitions, claim work atomically, retry transient failures with backoff, and prevent concurrent or repeated execution of completed stages. |
| Show user status | `new MeetingsApi`, `new MeetingsPage`, `new ConnectionPage` | Return only the signed-in user's records and safe failure reasons; show loading, empty, pending, blocked, failed, reconnect, drafted, and recovery states. |
| Show admin operations | `new AdminApi`, `new AdminClientsPage`, `new AdminStylesPage`, `new AdminResolutionQueue` | Expose aggregate connection state and configuration/triage data without returning transcript bodies, raw email, tokens, or extracted content by default. |
| Audit sensitive actions | `new AuditService`, `new AuditEvent` | Record connection, disconnection, client assignment, style approval, retries, state changes, and draft creation with redacted metadata. |
| Monitor pipeline | `new PipelineMetrics`, `new AlertPolicy` | Measure capture lag, stage latency, failure/reconnect counts, unresolved queue age, duplicate prevention, and abnormal capture-volume drops. |
| Verify behavior | `new unit tests`, `new integration tests`, `new end-to-end tests` | Cover domain rules, Google/LLM adapters, database constraints, authorization, failure recovery, and one consented real-account smoke test in a controlled environment. |

## Technical Direction

### Architecture

Start as a modular monolith with a web/API process and two worker process types sharing domain packages and PostgreSQL. This keeps the first release operable by a small team while separating interactive traffic from polling and long-running model work. Do not split into networked microservices unless measured scale or security boundaries require it.

Use a durable database-backed job mechanism initially if the chosen framework supports atomic claiming, delayed retries, and visibility. Introduce a separate broker only if foundation testing shows the database mechanism cannot meet capture latency or operational requirements.

### Authentication and Google access

- Portal authentication and Google API authorization are separate concerns. A valid portal session does not imply an active Google grant.
- OAuth callback requests must validate state, PKCE verifier, redirect URI, hosted Workspace domain, and returned Google identity.
- Refresh tokens must be envelope-encrypted at rest; access tokens should remain short-lived and must not be logged.
- Disconnect must disable work transactionally before attempting remote revocation, so capture stops even if Google's revocation endpoint is temporarily unavailable.
- `gmail.readonly` and `gmail.compose` are required by the stated flow. Reading the linked Google Doc also needs an approved Docs/Drive access strategy and scope; this is unresolved and must be proven in Phase 0.
- The implementation must contain no Gmail send call or send-capable product operation. Add an automated guard test around the Gmail adapter.

### Durable state machine

Use explicit states rather than deriving progress from nullable timestamps:

```text
captured
  -> needs_client -> client_resolved
  -> needs_style  -> style_resolved
  -> extracting -> extracted
  -> drafting -> drafted

Any active stage -> retry_scheduled -> same active stage
Any active stage -> failed
Google authorization failure -> needs_reconnection
```

The exact transition table must define who or what may perform each transition. Store attempt count, next retry time, stable error code, safe user message, internal diagnostic reference, and stage timestamps. Manual resolution resumes at the first incomplete stage.

### Idempotency and concurrency

- Capture identity must account for the same meeting notification appearing in more than one connected mailbox. Decide whether the canonical key is per Gmail message, Google Doc, meeting event, or a compound identity before schema freeze.
- Claim work with an atomic update or row lock and a lease timeout so multiple workers cannot process the same stage concurrently.
- Persist the extraction result before rendering and persist the remote Gmail draft ID immediately after creation.
- Before retrying draft creation after an uncertain response, search for an application-generated marker or reconcile the stored operation identifier to avoid duplicate drafts.
- A completed stage may be replayed only through an explicit, audited operator action with defined replacement behavior.

### Client resolution

Normalize domains to lowercase and validate patterns on write. Maintain explicit internal-domain and non-client-domain exclusions. If attendees point to more than one active client, or a domain maps to multiple records, stop at `needs_client`.

Manual client assignment should not reveal the transcript by default. Present meeting title, date, organizer, attendee addresses/domains as policy permits, and candidate clients. Any privileged content-view escape hatch requires separate approval, authorization, and auditing.

### Styles and extraction

Store immutable style versions so a later edit cannot change how an existing meeting was generated. A style version should define stable field identifiers separately from visible headings, field types, ordering, conditions, and render instructions.

Sample uploads and transcripts are untrusted data, not instructions. The model request must delimit source content and forbid source text from changing system behavior. Use provider-supported structured output where available, followed by local schema and business validation. Record model/provider version, prompt/template version, style version, latency, and token usage without logging source content.

Structural validation can prove shape, not factual correctness. The mandatory human review remains the factual safety control. A future evidence-linking or quote-support check may improve review, but it is not required for v1 unless QA finds attribution errors above the agreed threshold.

### Recipient and draft safety

Recipient resolution must be deterministic and policy-backed. Do not assume every meeting attendee should receive client notes. Until To/Cc inclusion rules and treatment of internal, optional, resource, bot, and consumer-domain attendees are approved, draft creation is blocked.

Render both escaped HTML and plain text. Draft subject format, reply/thread behavior, sender alias behavior, and recording-link handling must be verified with real examples before the adapter is finalized.

### Privacy and retention

Minimize data at every boundary. Send only required transcript and client context to the model. Never place tokens, raw mail, transcripts, prompts, or model responses in ordinary logs, analytics, error trackers, or admin list APIs.

Before production, approve retention periods and deletion behavior for source metadata, transcript bodies, extracted content, uploaded style samples, model request records, and audit events. A user disconnecting must not silently erase business records that policy requires retaining, but it must remove future mailbox access.

## Database and Migration Plan

PostgreSQL is the source of truth for application state. Create migrations through the selected framework and verify forward migration and rollback behavior in CI. Initial schema should include:

| Table | Purpose and key constraints |
| :---- | :---- |
| `users` | Workspace identity, role, active state, personal default style. Unique normalized email/Google subject as appropriate. |
| `google_connections` | User connection state, encrypted refresh-token payload or secret reference, granted scopes, health, checkpoint, and timestamps. One active connection per user. |
| `source_messages` | Mailbox/source identifiers, document reference/fingerprint, received time, and capture result. Unique constraint based on the approved dedupe rule. |
| `meetings` | Canonical metadata, owner/organizer, client, selected style version, status, safe error code, and stage timestamps. |
| `meeting_attendees` | Normalized attendee identity, domain, internal/external classification, and recipient disposition once approved. |
| `meeting_content` | Encrypted transcript and validated extraction, separated to support stricter authorization and retention. |
| `clients` | Client identity, active status, standing context, and default style. |
| `client_domains` | Normalized domain/pattern and client ownership. Prevent ambiguous exact mappings where possible. |
| `client_contacts` | Approved recipient/contact metadata if recipient policy uses maintained contacts. |
| `styles` | Stable style identity, scope/owner, lifecycle state, and current approved version. |
| `style_versions` | Immutable template schema, render configuration, provenance, approver, and approval time. |
| `meeting_style_overrides` | Audited meeting-specific selection where an override exists. |
| `processing_attempts` | Stage, lease, attempt number, next retry, error classification, and diagnostic reference. |
| `drafts` | Meeting, Gmail draft/message identifiers, operation marker, recipient snapshot, and creation time. One active draft per meeting unless replacement is explicitly supported. |
| `audit_events` | Actor, action, target type/id, redacted metadata, and timestamp; append-only to the extent supported. |

Add indexes for worker scans on connection/status/checkpoint, meetings on status/next retry/owner/date, unresolved client items, and audit target/time. Keep content columns out of common list queries. No production backfill is expected for the first release; seed only approved organization defaults, known clients/domains, and hand-authored style versions through auditable migrations or an authorized admin import.

## Frontend Implementation

### Shared experience

- Authenticate only approved Workspace users.
- Use server-derived permissions and never rely on hidden navigation for access control.
- Show connection state consistently and provide an actionable reconnect path.
- Use accessible confirmation dialogs for disconnect, style activation, and client assignment.
- Never expose OAuth tokens, raw provider errors, or sensitive content in browser telemetry.

### User application

1. **Connection screen:** connected account, granted/required access summary, last successful check, connect/reconnect, and disconnect confirmation.
2. **Meetings list:** title, date, safe client label, current status, last update, and recovery action; include loading, empty, pagination, and error states.
3. **Meeting detail:** stage timeline and safe failure/retry information. Show transcript or extracted content only if product and privacy policy explicitly approve it.
4. **Personal styles:** list predefined/owned styles, select a personal default, upload supported sample types with size validation, preview distilled output, approve or reject it.

### Admin application

1. **Client management:** create/edit/deactivate clients, domains, approved context, contacts, and default style; warn on domain conflicts.
2. **Global style library:** create/version/preview/approve/deactivate organization styles without mutating historical versions.
3. **Resolution queue:** show age and safe metadata for `needs_client`, allow client assignment, and record resolution reason.
4. **Operations summary:** aggregate connection and pipeline health only; no raw mailbox, transcript, or extracted-note content by default.

## Backend Implementation

### API boundaries

Expose versioned endpoints or equivalent framework handlers for:

- session identity and role;
- Google connect, callback, status, reconnect, and disconnect;
- current user's paginated meetings and meeting status;
- current user's styles, sample upload, preview, approval, and default selection;
- admin clients, domains, contacts, and defaults;
- admin organization styles and approval;
- admin unresolved-meeting queue and client assignment.

Use request schemas, authorization policies, rate limits on sensitive operations, content-type/size checks on uploads, CSRF protection where applicable, and consistent safe error codes. Callback and worker operations should be service calls, not business logic embedded in route handlers.

### Capture worker

For each eligible connection, obtain an access token, query only the incremental Gmail window, page results safely, claim source identities, retrieve and normalize linked documents, write durable records, and advance the checkpoint only according to a documented partial-failure policy. One account failure must not roll back or block another account.

### Processing worker

Select due work, claim a lease, resolve client/style, invoke extraction, validate, render, resolve recipients, and create a draft. Classify errors as transient, authorization, validation, manual-resolution, or terminal. Apply capped exponential backoff with jitter only to transient errors and alert when retry limits or queue-age targets are exceeded.

### Provider adapters

Keep Google and model SDK calls behind narrow interfaces with contract tests. Normalize provider errors into stable internal codes. Set timeouts, bound payloads, and record rate-limit metadata. This allows test doubles and a future provider change without moving pipeline rules into integrations.

## Implementation Phases

| Phase | Deliverable | Exit criteria |
| :---- | :---- | :---- |
| 0. Decisions and foundations | Approved data handling, Google access proof, stack/repository, CI, environments, secrets, Postgres, worker skeleton, observability baseline. | A test script completes the approved OAuth flow, reads one eligible notification and linked document, and confirms required scopes; launch-blocking open questions have owners. |
| 1. Connect and disconnect | Portal session, Workspace restriction, Google OAuth, encrypted token storage, connection health, and revocation. | One real test user connects, makes an authorized Gmail call, disconnects, and cannot be polled afterward. |
| 2. Durable capture | Scheduler, incremental Gmail search, parser, document reader, checkpoints, source uniqueness, and captured meeting state. | One real notification creates exactly one captured meeting; reruns and concurrent workers create no duplicate, and format drift is visible. |
| 3. Client resolution | Client/domain administration, deterministic resolver, and safe unresolved queue. | Known domains resolve correctly; unknown, conflicting, internal-only, and multi-client meetings pause for manual assignment. |
| 4. Versioned styles | Style schema, hand-authored defaults, precedence resolver, upload/distillation preview, and approval lifecycle. | Known samples reproduce acceptable layouts; no unapproved version can be selected; precedence tests pass. |
| 5. Extraction and validation | Model adapter, structured extraction, prompt-injection boundaries, validation, attempt tracking, and failure states. | Representative real transcripts validate; missing facts remain empty; malformed/adversarial inputs cannot reach drafting. |
| 6. Safe draft creation | Recipient policy implementation, deterministic renderers, MIME builder, Gmail draft adapter, and draft idempotency. | One real meeting reaches one correctly addressed, review-ready draft; retry creates no duplicate; automated tests prove no send operation exists. |
| 7. Complete portal | User meetings/status/recovery and admin configuration/triage/health views. | Users see only their records; admins complete client/style workflows without database access or default content visibility. |
| 8. Hardening and pilot | Retry tuning, reconciliation, retention jobs, alerts, runbooks, security/privacy review, load tests, and controlled pilot. | Revoked access, rate limits, provider timeouts, malformed docs, duplicate notifications, and queue backlog produce visible and recoverable outcomes within agreed targets. |

Work on portal screens may proceed in parallel once API contracts and authorization rules for the relevant phase are stable. Do not postpone connection UI to Phase 7; the Phase 1 connection experience is required for testing every later phase.

## Non-Breaking Rules

- Do not send email automatically or expose a send operation through application code.
- Do not capture mail for a user without an active, consented connection.
- Do not use one user's Google credential to read another user's mailbox or create another user's draft.
- Do not proceed when organizer, client, style, or recipients are ambiguous.
- Do not invent decisions, owners, deadlines, attendees, links, or client context.
- Do not make an unapproved distilled style selectable.
- Do not allow an administrator to view raw mail, transcripts, or extracted content by default.
- Do not log credentials, source content, full prompts/responses, or sensitive recipient data.
- Do not retry permanent, validation, or authorization errors indefinitely.
- Do not create duplicate meeting items or drafts when jobs are rerun or overlap.
- Do not mutate historical style versions or silently reprocess meetings after a style edit.
- Do not expand Google scopes, model data use, or retention beyond what security/privacy stakeholders approve.

## Testing

### Unit tests

- OAuth state/PKCE and connection-state transitions.
- Notification parsing against sanitized real fixtures and changed/invalid formats.
- Domain normalization, exclusions, ambiguity, and client resolution.
- Style precedence, version lifecycle, and schema validation.
- State-transition permissions, retry classification, and lease expiry.
- Transcript normalization, structured-output validation, and deterministic rendering/escaping.
- Recipient policy and prohibition of draft creation on ambiguity.

### Integration tests

- PostgreSQL uniqueness, atomic claiming, migrations, indexes, and rollback/retry behavior.
- Gmail search pagination/checkpoint behavior through a fake server or recorded sanitized contracts.
- Google Doc retrieval for supported content, missing access, deletion, large documents, and malformed links.
- Model structured-output success, timeout, rate limit, invalid schema, oversized input, and adversarial source text.
- Gmail MIME draft creation, uncertain response reconciliation, and duplicate prevention.
- Revoked token detection and reconnection recovery.
- API authorization proving user isolation and admin content restrictions.

### End-to-end scenarios

1. Clear decisions, owners, and deadlines produce one accurate draft.
2. An informational meeting leaves action items blank.
3. Multiple owners and dates remain correctly associated.
4. A truncated or malformed transcript stops before drafting.
5. Disconnect stops later capture while preserving already captured work according to policy.
6. Unknown, conflicting, and multi-client domains require manual resolution.
7. A new style remains unavailable until a human approves its preview.
8. Revoked access produces `needs_reconnection` and a working recovery path.
9. Repeated polling and concurrent processing create neither duplicate meetings nor drafts.
10. A changed Gemini notification format triggers a visible capture failure/alert.
11. Users cannot access another user's meeting; admins cannot retrieve protected content through list/detail APIs.
12. No test or production adapter path can invoke Gmail send.

Use sanitized or synthetic transcripts in automated suites. Real-account smoke tests require explicit test accounts, approved data, cleanup instructions, and must never target real clients.

## Rollout Plan

1. **Offline proof:** use sanitized fixtures to validate parsing, client/style resolution, extraction, rendering, and validation. Verify zero external recipients.
2. **Single-account capture:** connect one approved internal test account and observe capture only; do not enable model processing or drafts until Gmail/Docs access and dedupe are verified.
3. **Single-account shadow processing:** run extraction and rendering, store results internally, and compare them with human-authored notes. Approve accuracy thresholds and failure behavior.
4. **Single-account drafts:** create drafts for controlled meetings with test recipients only. Verify address policy, content, latency, idempotency, and reconnection.
5. **Small internal pilot:** enable named users through a server-side allowlist/feature setting, monitor unresolved items, corrections, capture lag, model failure rate, and duplicate count daily.
6. **Organization rollout:** expand in batches only when pilot targets hold and queue ownership/support runbooks are staffed.

Each stage must have an immediate disable control for capture, model processing, and drafting independently. Rollback disables the affected stage without deleting durable work; workers finish or release current leases safely. Re-enablement resumes from the first incomplete stage.

## Operational Measures

Define exact targets before the pilot. At minimum monitor:

- notification-to-capture and notification-to-draft latency;
- capture count against recent baseline;
- unique-source conflict/duplicate prevention count;
- percentage automatically resolving a client and style;
- extraction validation, provider, and draft failure rates;
- reconnect count and time to recovery;
- age and size of manual-resolution and retry queues;
- draft correctness/rework rate from pilot reviewers;
- accidental send count, which must remain zero.

## Open Questions and Blocking Decisions

| Decision | Why it matters | Required before |
| :---- | :---- | :---- |
| Which application stack, hosting platform, job mechanism, secrets/KMS service, and monitoring stack will be used? | Determines repository structure, deployment, migrations, worker semantics, and verified commands. | Phase 0 completion. |
| What exact Google scope and sharing behavior allow the app to read Gemini's linked Doc? | Gmail access alone does not authorize Docs content; the consent and least-privilege model cannot be finalized without a live proof. | OAuth registration and Phase 1. |
| What exact sender address, headers, subject patterns, body/link shapes, and localization variants does Gemini use? | Capture must use sanitized real samples and cannot safely rely on the prose sender description or subject alone. | Parser implementation in Phase 2. |
| When multiple connected attendees receive the same note, which user owns processing and whose mailbox receives the draft? | Defines canonical identity, dedupe constraints, authorization, and organizer fallback behavior. | Schema freeze and Phase 2. |
| What are the approved To/Cc rules, including internal attendees, optional attendees, bots/resources, client contacts, and consumer domains? | An incorrect recipient is a client-facing data leak even though the message remains a draft. | Phase 6. |
| Does a captured meeting continue processing after the user disconnects? | The brief says captured meetings are unaffected, while access and privacy expectations may require stopping before model/draft work. | State policy in Phase 1. |
| Which LLM/provider and contractual data controls are approved, including training, retention, region, subprocessors, and deletion? | Real client transcripts leave Google Workspace and may be contractually sensitive. | Any real-content model call. |
| What retention/deletion rules apply to transcripts, extracted notes, samples, recipient snapshots, and audits? | Determines schema separation, encryption, cleanup jobs, disconnect behavior, and admin access. | Production schema and pilot. |
| Who owns the unresolved-client queue and what is the response-time target? | Items otherwise remain blocked indefinitely. | Phase 3 launch. |
| What constitutes an extraction failure versus an acceptable partial note? | A truncated transcript should fail, but a complete meeting can legitimately omit optional sections. | Validator acceptance in Phase 5. |
| What accuracy, latency, and review-time targets permit rollout expansion? | Exit criteria need measurable release gates rather than subjective readiness. | Shadow processing and pilot. |
| Should drafts start new threads or reply to existing client threads, and what is the approved subject format/sender alias behavior? | Affects Gmail message construction, discoverability, and client communication conventions. | Phase 6. |

## Definition of Done

LendMail v1 is done when approved Workspace users can connect and revoke Google access; eligible Gemini notes are captured once; ambiguous client/style/recipient cases stop safely; validated, transcript-supported notes become exactly one review-ready draft in the correct organizer's mailbox; all user and admin boundaries are enforced; failures and queue health are visible; retention and provider terms are approved; the documented pilot tests pass; and there is no automated send capability.
