# LendMail First Demo Plan

## Demo goal

Earn a place in the hackathon Top 5 by making the problem, value, and first-user experience immediately clear. This is an interactive prototype, not a claim that production Google or LLM integrations are complete.

## Friday scope

```text
Introduction → Google sign-in → Gmail permissions → Meeting draft → Commitments → Client Continuity → Voice of Customer → Product Opportunity
```

The workspace uses clearly labelled demo meetings. Authentication, OAuth, Gmail, Gemini, and extraction are simulated through `src/lib/demo-service.ts` and will be replaced during production implementation.

## Demo script

1. **Problem — 30 seconds:** “After every client meeting, someone spends another 15 to 30 minutes rewriting Gemini notes, formatting an email, and preparing it for the client.”
2. **Idea — 20 seconds:** “LendMail picks up where Gemini stops. It turns the raw note into a polished Gmail draft. The attendee reviews and sends it.”
3. Select **Continue with Google**, confirm the Lendsqr identity, and select **Set up LendMail**.
4. Explain each requested permission and emphasize that LendMail creates drafts but never sends them.
5. Select **Connect Gmail** and show the connected workspace, time saved, and sample pipeline.
6. **Close:** “The next build stages replace the demo adapters with real OAuth, note capture, structured extraction, and Gmail draft creation.”

### Product intelligence reveal

1. Open **Reports → Client Continuity** and show four recurring Northstar meetings becoming one monthly narrative.
2. Switch to **Voice of Customer** and reveal that manual transaction reconciliation was independently raised by six clients across eleven meetings.
3. Open the signal to show verified, minimal evidence excerpts and related commitments without exposing full transcripts.
4. Select **Create Product Opportunity**, review the structured problem and evidence, then move it from New to Investigating.
5. Return to the next-meeting brief and show that Product's investigation is now part of the account manager's context.
6. **Close:** “LendMail drafts the follow-up, remembers what was promised, and shows Product what clients are repeatedly asking for—before the next roadmap or client meeting.”

## Demo guardrails

- Say this is an interactive prototype.
- Do not imply that real inbox or transcript access is active.
- Use no real client data in the sample workspace.
- Do not attempt live external OAuth during the judged demo.
- Do not claim AI decides the roadmap; it organizes verified evidence and a human creates or updates the Product Opportunity.
- Treat evidence excerpts, integrations, opportunity updates, and cross-client aggregation as simulated prototype data.
- Keep a screen recording as a fallback.

## Definition of done

- The full interaction works without page reloads or external services.
- Loading states prevent double clicks and demo data is labelled.
- `npm run lint` and `npm run build` pass.
- The presenter rehearses the flow within three minutes.
- A fallback recording and deployed preview are available before Friday.

## After Friday

Preserve the visual components and replace `src/lib/demo-service.ts` one interface at a time. Begin with Phase 0 and Phase 1 of `IMPLEMENTATION_PLAN.md`; do not evolve simulated methods into production OAuth or credential storage.
