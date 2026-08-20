# LendMail | Meeting Notes Extractor

*Automatic capture, restructuring, and draft delivery of client meeting notes*

Background

Stakeholders

High-level engineering efforts

Engineering implementation activities

Specification

Authentication model

Capture trigger

Client resolution

Style resolution

Extraction and validation

Draft creation

The portal

What is explicitly not changing

Acceptance criteria

How to test

Risks and mitigations

Open questions before implementation

Engineering sequencing plan

# **Background**

At Lendsqr, a meeting note must go out to the client after every client meeting. Today the process is entirely manual: someone takes the raw notes Gemini generates, rewrites them into the company's standard format, opens their email, composes the message, and sends it.

That manual step costs 15 to 30 minutes after every single meeting, and it is repetitive in a way that invites inconsistency. Notes go out late when someone is busy, formatted differently depending on who wrote them, or occasionally not at all when the task gets forgotten in the rush to the next call.

None of that inconsistency comes from a lack of care. It comes from asking a person to do the same rewriting and formatting work after every meeting, on top of whatever else the meeting produced for them to act on. The fix is not a reminder or a checklist. It is removing the writing and formatting work entirely, while keeping a human in charge of the one decision that actually matters: whether the note is accurate enough to send.

This plan covers a tool that automates everything between Gemini generating its raw notes and a formatted draft sitting in the attendee's inbox. It does not automate the sending. The person who attended the meeting still opens their inbox, reviews the draft, and sends it themselves.

The scope is confined to note capture, client and style resolution, LLM based extraction and formatting, and draft creation in the user's own mailbox, plus a portal to track and manage the pipeline. It does not touch how Gemini itself generates notes, and it does not change Lendsqr's client communication policy.

# **Team Members**

| Role | Person |
| :---- | :---- |
| Project Managers | [Tosin Fawehinmi](mailto:oluwatosin@lendsqr.com), [Distinction Joseph](mailto:distinction@lendsqr.com) |
| Engineer | [Nanret John](mailto:nanret@lendsqr.com) |
| Quality Assurance | [Tosin Fawehinmi](mailto:oluwatosin@lendsqr.com), [Distinction Joseph](mailto:distinction@lendsqr.com) |

# **High-level engineering efforts**

**Capture**

* Treat the Gemini notification email itself as the trigger. No calendar polling and no separate webhook, since Gemini already emails the organizer and attendees the moment notes are ready.

* Read that email through the Gmail API, scoped to each user's own consent, and pull the actual transcript text from the linked Google Doc through the Docs API.

* Queue each captured note as a pending item, keyed to avoid processing the same message twice, so a downstream failure never loses the source transcript.

**Authentication**

* Default to per user OAuth consent rather than a single domain wide delegated credential, so access to any one mailbox is something that person explicitly granted and can revoke themselves.

* Set the OAuth consent screen to Internal, since every user sits inside the Lendsqr Workspace domain, which skips Google's external verification process entirely.

**Client and style resolution**

* Resolve which client a meeting belongs to by matching attendee email domains against a maintained clients table, flagging anything unclear for a human to tag rather than guessing.

* Resolve which note style applies in order: an override picked for that specific meeting, the client's default, the user's personal default, then the org wide default.

**LLM extraction and formatting**

* Send the transcript, the resolved client context, and the resolved style template to the model in a single call, returning structured output rather than free text.

* Validate that structured output against the expected fields for the resolved style before it is allowed to reach the draft stage.

**Draft email creation**

* Create the note as a Gmail draft directly in the organizer's own mailbox, using their own token, addressed and ready.

* Never send automatically. The draft waits for a human to review and press send.

**Portal**

* Give each user a connect and disconnect control and a view of their own meetings moving through status.

* Give admins a global style library, client records, and a queue of meetings flagged as needing a client tag, without giving them default visibility into anyone's mail content.

**Client Voice and product intelligence**

* Extract potential feature requests, pain points, product friction, confusing workflows, competitor mentions, and churn indicators as separately reviewable product signals alongside the meeting note.

* Require a human to verify a signal before it contributes to cross-client reporting. Keep explicit client statements separate from model inference and never let the model decide roadmap priority.

* Cluster verified signals across distinct clients and meetings into a Voice of Customer report showing frequency, client impact, recurrence, first/latest mention, related commitments, and minimal approved evidence excerpts.

* Let an authorized Product user convert a verified cluster into a Product Opportunity with a human-controlled lifecycle: New, Investigating, Planned, In progress, and Resolved. Future issue-tracker export remains a reviewed action, never automatic.

* Bring the current Product Opportunity status back into the next-meeting preparation brief so client-facing teams can close the feedback loop.

**Rollout**

* Prove capture end to end against one connected account before building client resolution, style resolution, or extraction on top of it.

* Add draft creation once extraction is reliable, then layer the portal on top for visibility and control.

# **Engineering implementation activities**

| \# | Phase | Key steps | Exit criteria |
| :---- | :---- | :---- | :---- |
| 0 | **Foundations and access** Get the accounts, approvals, and infrastructure in place before any pipeline code is written. | Register an OAuth client in Google Cloud Console with the consent screen set to Internal, since every user sits inside the Lendsqr Workspace domain. Request gmail.readonly and the Gmail compose scope together at registration, so a user grants both in a single consent step instead of reconnecting later. Confirm data handling terms with the Claude API in writing before any real transcript touches the pipeline, since meeting content is leaving the Workspace boundary. Stand up Postgres, a background worker for the scheduled capture job, and a secrets manager for API keys, none of it committed to the repo. | **Exit criteria** OAuth client registered and approved, data handling terms confirmed in writing, and infrastructure reachable from a first test script. |
| 1 | **Connect and disconnect** Build the one piece of user facing plumbing that every other phase depends on. | Build the Connect your Gmail button, the OAuth redirect, and the callback that exchanges the code for a refresh token stored against the user record. Test the flow against one real account end to end: connect, confirm a token is stored, confirm one live Gmail API call succeeds using it. Build disconnect as part of the same piece of work, not a follow up, so revoking a token immediately and verifiably stops capture for that user. | **Exit criteria** One real account connects and disconnects successfully, with capture probably gated on the presence of a stored token. |
| 2 | **Capture, gated on connection** Turn a Gemini notification email into a captured, queued meeting. | Add the connected user check as the first line of the capture job, skipping anyone without a stored token rather than attempting and failing. Query each connected mailbox for the message from gemini notes at google, parse the subject line for meeting title and date, and pull the transcript text from the linked Doc through the Docs API. Write each captured meeting to a queue table with status captured, keyed so a repeated message is never processed twice. | **Exit criteria** A real Gemini email lands in a connected test mailbox and produces exactly one captured row, with no duplicate on a rerun. |
| 3 | **Client resolution** Work out whose meeting this is before any client specific context or style is applied. | Build a clients table seeded by hand with the first real clients, including domain patterns, standing context, and known stakeholders. Match each captured meeting's attendee domains against that table, resolving a client automatically wherever the match is clean. Flag anything that does not match cleanly as needing a manual tag rather than guessing. | **Exit criteria** Real captured meetings resolve to the correct client automatically, and meetings that should not be guessed at are correctly flagged instead. |
| 4 | **Style resolution** Work out which note format applies before extraction runs. | Design a style template schema covering section order, heading text, tone notes, and which fields are conditional. Encode the known styles by hand as the first rows in a styles table, using real sample notes as the standard to check against. Build a style distillation call that takes an uploaded sample and returns a template in the same schema, proven first against styles whose correct answer is already known. | **Exit criteria** The known styles are encoded and verified, and distillation on a newly uploaded sample produces a template a human confirms is usable before it is offered to anyone else. |
| 5 | **Extraction and validation** Turn a transcript plus context plus style into a structured, trustworthy note. | Build the extraction call: transcript, client context, and the resolved style template go in together, structured output matching the style's schema comes out. Instruct the model to leave a field blank rather than invent content whenever the transcript does not support it. Validate the returned structure against the resolved style's expected fields before anything downstream can use it, marking a failure explicitly rather than passing it through. | **Exit criteria** A real captured transcript produces validated structured output end to end, and a deliberately broken transcript is correctly marked as failed rather than silently accepted. |
| 6 | **Draft creation** Turn a validated note into something sitting ready in a real inbox. | Render the validated structured note into the resolved style's layout as HTML. Create it as a Gmail draft in the organizer's own mailbox using their stored token, addressed to the right people, and never sent by the system. Run one real meeting through the full pipeline for the first time, from the Gemini email landing to a draft sitting ready in a real inbox. | **Exit criteria** One real meeting completes the entire pipeline unattended up to the draft, and a human confirms the draft is accurate and ready to send. |
| 7 | **The portal** Give people a way to see and control the pipeline without touching a database. | Build authentication and the connect and disconnect screen as the first thing a user sees, since the rest of their experience depends on it. Build the meetings view showing a user's own meetings and current status, reading directly from the queue table that has been running since Phase 2\. Add personal style management for users, and separately, admin views for the global style library, client records, and the queue of meetings needing a client tag. | **Exit criteria** A user can connect, see their meetings move through status, and manage their own style, and an admin can resolve a flagged meeting, all without touching a database directly. |
| 8 | **Hardening and demo** Make failure states visible instead of silent, then prove the whole loop works. | Add bounded retry logic for LLM calls and draft creation failures, landing on failed rather than retrying forever or dropping silently. Add explicit handling for a revoked or expired token, marking affected meetings as needing reconnection instead of failing quietly. Run the test scenarios that matter most: a clean transcript through each style, and a malformed transcript that must fail cleanly. | **Exit criteria** A revoked token and a malformed transcript both produce a visible, correctly labelled failure state, and the demo runs a real recent meeting end to end within the review time target. |

# 

# **Specification**

## **Authentication model**

The pipeline uses per user OAuth consent as the default, not a single domain wide delegated credential. Each person connects their own Gmail through a normal consent screen, sees exactly what is being requested, and approves it themselves. A refresh token is stored against their user record, and capture only ever runs for someone who has one on file.

This is a deliberate choice, not just a configuration detail. A domain wide delegated credential is an all or nothing switch an admin flips once, centrally, and it does not change what the credential is capable of even if the code only ever touches a narrow slice of mail. Per user consent keeps the blast radius of any one credential to a single mailbox, and puts revocation directly in that person's own hands through their Google account permissions page, with no admin involved.

The consent screen is set to Internal rather than External, since every user is already inside the Lendsqr Workspace domain. That is what allows gmail.readonly, a restricted scope, to be used without Google's formal external verification review. Both gmail.readonly and the Gmail compose scope are requested together at connect time, so a user sees one consent screen rather than being asked to reconnect later once draft creation is added.

## **Capture trigger**

A meeting enters the pipeline the moment Gemini emails its notification, gemini notes at google dot com, to the organizer and attendees, subject line carrying the meeting title and date. There is no calendar integration and no separate webhook. The capture job runs on a short interval, checking only mailboxes with a stored token, querying for that sender, parsing the subject line, and pulling the actual transcript text from the linked Google Doc through the Docs API.

Each captured meeting is written to a queue table with the title, date, organizer, attendees, and transcript, status captured, keyed on the source message so a rerun or a resend never produces a duplicate.

## **Client resolution**

Attendee email domains are matched against a maintained clients table, for example everyone at a given client domain resolving to that client's record. A clean match resolves automatically. Anything that does not match cleanly is flagged as needing a client tag and does not proceed until a human resolves it, since guessing at client identity is worse than waiting.

## **Style resolution**

Each client record carries standing context: terminology, figures, known stakeholders, pulled in alongside the transcript so the model is not working from the raw transcript alone. Which note style applies is resolved in order: a style picked for that specific meeting, then the client's default, then the user's personal default, then the org wide default. Styles themselves are encoded as versioned templates, and a new style can be added by uploading a sample and running it through a distillation call that returns a template in the same schema, checked by a human before it becomes selectable by anyone else.

## **Extraction and validation**

The transcript, the resolved client context, and the resolved style template are sent to the model together in a single call. The model returns structured output, attendees, decisions, action items with owner and deadline, follow ups, and any style specific field such as a recording link, following the resolved style's section order rather than free text. Where the transcript does not support a field, the model is instructed to leave it blank rather than invent content, since an empty field tells the reviewer nothing was said, and a guessed one tells them something false.

The returned structure is validated against the resolved style's expected fields before anything downstream can use it. Anything that fails validation is marked failed explicitly, never silently passed along as if it were complete.

## **Draft creation**

Once a note passes validation, it is rendered into the resolved style's layout and created as a Gmail draft directly in the organizer's own mailbox, using that same person's own token, addressed to the client contacts and internal attendees from the meeting. The draft is never sent by the system. The attendee reviews it and sends it themselves, which remains the one step this tool deliberately does not automate.

## **The portal**

Every user's own experience starts with connecting their Gmail, and their dashboard shows that connection state plainly alongside each meeting's status, captured, extracted, drafted, or needing reconnection. Users manage their own personal style, viewing predefined styles, uploading a sample, and setting a default. Admins additionally manage the global style library, client records, and the queue of meetings flagged as needing a client tag, along with aggregate connection status across the organisation, without ever getting default visibility into anyone's actual mail content.

## **What is explicitly not changing**

* How Gemini itself generates the raw meeting transcript.

* Lendsqr's policy that a client meeting note must always go out after every client meeting.

* The requirement that a human reviews and sends the note. The tool removes the writing and formatting work, not the decision to send.

* The company's existing email system. Drafts are created within the user's own mailbox rather than through a separate channel.

# **Acceptance criteria**

**Connect and disconnect**

* A user can connect their Gmail in one consent step covering both read and compose access, and disconnect at any time, with capture stopping for them immediately.

**Capture**

* A completed Gemini note becomes a pending pipeline item within a few minutes of the meeting ending, for any connected user, without anyone exporting it by hand.

* Each pending item carries accurate meeting metadata before extraction runs, and a meeting is never captured for a user who has not connected.

**Client and style resolution**

* A meeting with attendees matching a known client domain resolves to that client automatically. A meeting that does not match cleanly is flagged rather than guessed at.

* The applied style always follows the documented precedence order, and a newly distilled style is never selectable until a human has confirmed it.

**Extraction and formatting**

* The structured output follows the resolved style's section order for every processed meeting.

* Fields with no supporting content in the transcript are left blank rather than filled with invented detail.

* Output that fails structural validation is marked failed and never reaches the draft stage.

**Draft email creation**

* A ready to send draft appears in the correct organizer's mailbox, addressed to the right client contacts, without that person writing anything.

* No note is ever sent by the system. Every note sent is a deliberate human action.

**Portal**

* Every processed meeting shows an accurate, current status, including connection state, and a failed or needs reconnection item is clearly distinguishable from one simply still in progress.

# **How to test**

| \# | Scenario | Steps | Expected result |
| :---- | :---- | :---- | :---- |
| 1 | Clean transcript, clear action items | Run a meeting with explicit decisions, owners, and deadlines. Let the pipeline capture and process the note. | A draft appears with every decision and action item correctly attributed and dated. |
| 2 | Meeting with no action items | Run a meeting that is purely informational, with no decisions or tasks. Let the pipeline process the note. | The draft is created with the action items section left blank rather than invented content. |
| 3 | Multiple attendees, mixed follow up dates | Run a meeting where different attendees agree to different follow up dates. Let the pipeline process the note. | Each follow up date is attributed to the correct item, not merged into a single date. |
| 4 | Incomplete or malformed transcript | Feed the pipeline a transcript that is cut off mid sentence or missing sections. Observe the extraction step. | The item is marked failed. No draft is created from unvalidated output. |
| 5 | Disconnect mid cycle | Connect a test account, let one meeting capture successfully, then disconnect before the next capture run. Trigger the next scheduled capture job. | No further meetings are captured for that user. Meetings already captured before disconnect are unaffected. |
| 6 | Attendee domain matches no known client | Run a meeting whose attendees fall outside every domain in the clients table. Let the pipeline attempt client resolution. | The meeting is flagged as needing a client tag rather than proceeding on a guess. |
| 7 | Newly uploaded style | Upload a brand new sample note, run the distillation call, then apply the resulting template to a real transcript. Review the rendered draft against the uploaded sample. | A human reviewer can confirm the draft matches the intended new style before it becomes selectable by anyone else. |
| 8 | Revoked or expired token | Revoke access from the Google account permissions page for a connected test user, then let a new Gemini email arrive for them. | The affected meeting is marked as needing reconnection, not failed for an unrelated reason, and the dashboard reflects this clearly. |
| 9 | Dashboard status accuracy | Process several meetings through every stage of the pipeline. Check the dashboard against the pipeline's actual internal state. | The dashboard status for each meeting matches its true stage at all times, including connection state. |

# 

# **Risks and mitigations**

| Risk | Likelihood | Mitigation |
| :---- | :---- | :---- |
| The LLM misreads the transcript and attributes a decision or deadline to the wrong person. | Medium | The human review step before sending is mandatory, not optional. The draft is never auto sent, so a misattribution is caught before it reaches the client. |
| The subject line format Gemini sends changes, and capture goes silent without an obvious alarm. | Medium | Do not rely on the subject string alone. Add a fallback match against the linked Doc itself, and alert if the daily capture volume drops sharply against the recent baseline. |
| A meeting is flagged needing a client tag and nobody owns resolving it, so it simply sits. | Medium | Assign explicit ownership of the queue and a turnaround target, and surface the open count on the admin view rather than leaving it buried. |
| A newly distilled style is trusted in production without anyone confirming it actually matches the uploaded sample. | Low | Require a human to confirm the first rendered output of any newly uploaded style before it becomes selectable by other users. |
| A user's token is revoked or expires and their meetings quietly stop being captured. | Medium | Detect the failed refresh explicitly and mark affected meetings as needing reconnection on the dashboard, rather than letting the job fail silently or retry forever. |
| Client meeting transcripts leave the Workspace boundary through the Claude API, which is a client facing data handling question, not only an internal one. | Medium | Confirm data handling terms internally before build, and check whether any client relationship requires a documented disclosure given transcripts now reach a third party model. |
| A validation failure is misclassified as success, and an incomplete note reaches the draft stage unnoticed. | Low | Extraction output is validated against the resolved style's expected fields before a draft is created. Anything that fails validation is marked failed, not complete. |

Worth stating plainly: because the send step stays manual, the worst case for any failure in this pipeline is a note that a human catches and fixes before it reaches a client, not a bad note reaching one automatically.

# 

# **Engineering sequencing plan**

This is the build order end to end. Everything after Phase 1 depends on at least one real connected account to test against, which is why connect and disconnect comes right after foundations rather than being added later as a portal feature.

1. Phase 0, foundations: register the OAuth client, confirm data handling terms with the LLM provider, stand up the database, background worker, and secrets management.

2. Phase 1, connect and disconnect: build and prove the OAuth flow against one real account, treating connect and disconnect as one feature, not two.

3. Phase 2, capture: read the Gemini notification email for connected users only, parse it, pull the transcript, and log a pending item with no duplicates.

4. Phase 3, client resolution: match attendees to a maintained clients table, flagging anything that does not match cleanly instead of guessing.

5. Phase 4, style resolution: encode the known styles by hand, then build and test the distillation call that turns an uploaded sample into a new one.

6. Phase 5, extraction and validation: build the single model call and the structural check that must pass before anything moves downstream.

7. Phase 6, draft creation: render a validated note into its resolved style and create it as a draft in the organizer's mailbox, then run one real meeting fully end to end.

8. Phase 7, the portal: build connect and disconnect as the entry screen, then the meetings view, personal style management, and admin views.

9. Phase 8, hardening and demo: add retry and reconnection handling, run the scenarios that matter most, and demo a real recent meeting within the review time target.
