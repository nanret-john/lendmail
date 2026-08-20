# LendMail

LendMail turns Gemini meeting notes into polished, client-ready Gmail drafts, tracks commitments across recurring conversations, and surfaces verified cross-client product signals while keeping humans in control of sending and product decisions.

This repository currently contains the interactive hackathon prototype. Google sign-in, Gmail connection, meeting processing, commitment tracking, continuity reports, Voice of Customer signals, and Product Opportunities are deliberately simulated. Production integrations begin after the first demo and follow `docs/IMPLEMENTATION_PLAN.md`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run build
```

## Deploy to Render

This demo is configured as a Render Static Site through `render.yaml`.

1. Push this repository to GitHub or GitLab.
2. In Render, select **New → Blueprint**.
3. Connect the repository and allow Render to read `render.yaml`.
4. Review the `lendmail-demo` service and select **Apply**.

Render will run `npm ci && npm run build` and publish the generated `out` directory. Commits to the connected default branch deploy automatically.

No environment variables are required for the prototype. When real OAuth or server-side integrations are introduced, remove the static export configuration and deploy the application as a Render Web Service instead.

## Documentation

- `docs/PRODUCT_BRIEF.md` — original product and engineering brief.
- `docs/IMPLEMENTATION_PLAN.md` — complete production implementation plan.
- `docs/DEMO_PLAN.md` — Friday demo scope, script, and definition of done.
