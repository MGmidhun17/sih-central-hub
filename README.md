# HackRepo

**SIH Aligned Dynamic Student Hackathon Project Repository with Automated Technology Stack Taxonomy Tagging**

A Next.js + TypeScript application for student project submissions, controlled technology tagging, related-project discovery, teacher review, and single-owner administration. Firebase Authentication handles identities, Cloud Firestore stores records, and the application is prepared for Vercel deployment.

## What is included

- Responsive landing page, email/password login, registration, password reset, project explorer, domain directory and project details.
- Student workspace: create drafts, edit eligible projects, analyze content, submit for review, view feedback, delete drafts.
- Teacher workspace: approval gate, review queue, approve/reject/request changes, review history.
- Owner workspace: aggregate counts, status chart, paginated users, name/email search, individual profiles, teacher approval/rejection, confirmed cascading deletion.
- Canonical technology taxonomy, dictionary matching, optional server-side Gemini extraction/classification, content-keyed caching and daily request caps.
- TF-IDF cosine similarity against up to 200 approved projects. **This is lexical comparison, not Sentence-BERT, FAISS, semantic proof, or plagiarism detection.**
- An isolated, explicitly labeled demo stored in the browser. Demo identities never authorize backend requests.
- Server authorization, strict input validation, optimistic revisions, atomic reviews, deny-all client Firestore rules, owner bootstrap and sample-data scripts.
- Automated unit tests and an emulator integration workflow covering access controls, reviews, direct Firestore rules and account deletion.

## Delivery status

The source is implemented. Real Firebase, Gemini and Vercel accounts/credentials are not included. Live authentication, provider calls and production deployment must be configured and checked in your own accounts. The public interface can display sample projects without configuration; select a demo role on the home/login screen to exercise browser-local workflows.

See `docs/verification.md` for the checks actually performed and remaining verification limits.

## 1. Run the project

Install **Node.js 22 or newer**. Extract this project, open its folder in VS Code, then run:

```powershell
npm ci
npm run dev
```

Open the localhost URL printed in the terminal, normally `http://localhost:3000`.

No credentials are needed for the demo. Demo data is shared among the three role views in the same browser; switch through the home page to demonstrate submission and review. Exit demo returns to normal mode. To reset the demo, remove the `hackrepo-demo-v1` item from local storage and the `hackrepo-demo-role` session-storage item, then reload.

## 2. Set up Firebase

1. Create your Firebase project at https://console.firebase.google.com/. Keep it on the **Spark** plan for the intended small academic prototype; do not enable paid products just to run this app.
2. Add a **Web app** in Project settings. Copy its configuration values.
3. In **Authentication → Sign-in method**, enable **Email/Password**. Google and GitHub OAuth are intentionally not required or shown as working buttons.
4. In **Firestore Database**, create the default database. Choose a region appropriate for your users and retain it; pick production mode.
5. Open **Firestore → Rules** and publish the exact contents of `firestore.rules`. These rules deny all direct client reads and writes. The app uses its verified server API for all database access.
6. In **Project settings → Service accounts**, generate a Firebase Admin service-account key. Store it securely outside the repository. Copy only its `project_id`, `client_email`, and `private_key` into your local environment and Vercel environment settings. Do not upload the JSON file or paste secrets into a chat.
7. Copy the template:

```powershell
Copy-Item .env.example .env.local
```

On macOS/Linux, use `cp .env.example .env.local` instead. Fill in:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-web-app-id
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
ADMIN_UID=
GEMINI_API_KEY=
GEMINI_MODEL=
AI_USER_DAILY_LIMIT=10
AI_GLOBAL_DAILY_LIMIT=100
```

The public web-app configuration is expected in browser code. The Admin private key and Gemini key must **never** have a `NEXT_PUBLIC_` prefix. `.env.local` is ignored by Git. Restart the dev server after environment changes.

For CLI rule deployment, install the current Firebase CLI, log in, and run:

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

The included queries use equality filters and document-ID pagination. `firestore.indexes.json` currently has no custom composite indexes. If you change query shapes and Firebase requests an index, add that exact index to the file and deploy it.

## 3. Create your single admin account

There is no public Admin signup option.

1. Exit demo and register your own account as a **Student**.
2. Copy its UID from **Firebase Authentication → Users**.
3. Set `ADMIN_UID` to that exact UID in `.env.local`.
4. Run:

```powershell
npm run bootstrap-admin -- YOUR_OWNER_UID
```

5. Sign out, restart the dev server if needed, and sign back in. Open `/dashboard/admin`.
6. Set the same `ADMIN_UID` on Vercel.

The script verifies the Auth account, requires an existing profile, refuses another configured owner, and writes an owner lock in `system/owner`. Backend admin access requires both the configured UID and Firestore `role: admin`. Keep the script in your trusted local checkout; it exposes no HTTP bootstrap route.

## 4. Optional Gemini setup

Create an API key in https://aistudio.google.com/ and confirm which models and free quota are available for your account. Set `GEMINI_API_KEY` and the exact supported model identifier in `GEMINI_MODEL`. The app calls the Gemini `generateContent` REST endpoint with a JSON response schema and validates the response.

Without both values, analysis uses its dictionary and keyword fallback. Quota failures, timeouts and malformed responses also fall back with a visible explanation. No credentials or successful live Gemini call are implied by the demo.

The UI sends title, abstract, description and resource URLs to the analysis endpoint. That content is sent to Gemini only when configured and the user presses Analyze. The app does not fetch linked GitHub/Drive/video files. Be sure the submitted text may be shared with the configured provider.

Analysis is cached by user + content hash. To deliberately rerun the same text after changing provider configuration, remove the matching `analysisCache` document using the trusted Firebase console, then analyze again. Editing title, abstract or description automatically changes the cache key.

## 5. Deploy on Vercel

1. Create your own GitHub repository and push this folder. Do not push `node_modules`, `.next`, `.env.local` or service-account JSON files.
2. In https://vercel.com/new, import that repository.
3. Framework: **Next.js**. Root directory: the folder containing `package.json`. Build: `npm run build`. Install: `npm ci`. Use Node.js 22+ supported by your Vercel project.
4. Add every environment variable from your completed `.env.local` to the appropriate Vercel environment. Paste the actual private key or its escaped-newline representation into the secret field. Leave emulator variables unset.
5. Deploy. Add the deployed hostname to **Firebase Authentication → Settings → Authorized domains** if needed. Also add `localhost` for local development if it is not already present.
6. Redeploy after changing `NEXT_PUBLIC_` configuration because it is compiled into the client bundle.
7. Perform the production acceptance walkthrough in `docs/deployment.md`.

No Vercel deployment or GitHub push has been performed for you. Do not treat a successful local build as proof that production credentials, permissions or provider quotas are correct.

## 6. Test

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` runs unit tests; the integration suite explicitly skips unless both Firebase emulator host variables are present.

For the full local emulator suite, install a Java version supported by the Firebase CLI/emulator you choose. The supplied CI uses Firebase CLI 13.35.1 with Java 17, solely as a reproducible test tool for a `demo-` project (not a production deployment tool):

```powershell
$env:FIREBASE_PROJECT_ID="demo-hackrepo"
npx --yes --package firebase-tools@13.35.1 firebase emulators:exec --project demo-hackrepo --only auth,firestore "npm test"
```

macOS/Linux:

```sh
FIREBASE_PROJECT_ID=demo-hackrepo npx --yes --package firebase-tools@13.35.1 firebase emulators:exec --project demo-hackrepo --only auth,firestore 'npm test'
```

This starts local Auth and Firestore, applies the local rules, creates throwaway accounts, exercises the real API dispatch/SDK against the emulators, and stops them. It never requires real project credentials. The pinned emulator CLI is not a runtime dependency. Use an up-to-date CLI for production administration.

## 7. Optional sample records in Firebase

First create a dedicated test student normally. Add these temporary values to `.env.local`:

```dotenv
SEED_STUDENT_UID=that-test-student-uid
SEED_CONFIRM=yes
```

Then run `npm run seed`. It creates six clearly labeled sample projects using existing test-account ownership. It refuses to overwrite an existing seed. Some records are pre-approved to populate discovery, via the trusted Admin SDK script. Empty resource links are intentional; no fake repositories or videos are represented as real.

## Architecture

```mermaid
flowchart TD
  UI["Next.js interface"] --> Auth["Firebase Authentication"]
  UI --> API["Verified Node.js API"]
  API --> DB["Cloud Firestore"]
  API --> AI["Dictionary and optional Gemini"]
  API --> Similarity["Lexical similarity"]
  AI --> DB
```

All database access passes through server routes. Browsers do not use Firestore SDK access directly. See `docs/architecture.md`, `docs/database.md`, `docs/security.md`, and `docs/ai-module.md` for contracts and tradeoffs.

## Project structure

- `src/app/`: pages, layout, styles and the API route dispatcher entry point.
- `src/components/`: role workspaces, forms, details, charts and shared UI.
- `src/lib/server/`: authorization, API handlers, Gemini/caching/rate limits.
- `src/lib/firebase/`: client identity and server Admin initialization.
- `src/lib/taxonomy.ts`: controlled names, aliases, categories and domains.
- `src/lib/similarity.ts`: service abstraction and lexical implementation.
- `scripts/`: trusted admin bootstrap and sample-data generation.
- `tests/`: unit and emulator integration tests.
- `docs/`: architecture, deployment, security and verification notes.

## Free-tier scope and practical limits

This is a small, non-commercial academic prototype, not an unlimited free production service. Firestore has finite daily quotas, Vercel Hobby has usage and personal/non-commercial restrictions, and Gemini quotas vary by model/account. The application does not enable billing or guarantee a provider's future pricing.

- External resource links avoid large file-storage costs; no Cloud Storage upload or paid search service is introduced.
- Public/user project lists and admin users load 100 records per page. Search/filtering applies to the loaded collection; the interface explains this. Load further pages to broaden results.
- Similarity examines at most 200 approved records. Teacher history, per-project review history and admin details have explicit display bounds. These are documented prototype limits, not invisible completeness claims.
- Admin totals use Firestore aggregation queries. Per-user counts add reads proportional to a page of users. Avoid repeated refreshes at large scale.
- AI caps default to 10 new analyses/user/day and 100 globally/day. The counters are shared in Firestore. They are application limits, not billing caps, and may exceed a provider's actual free quota; reduce them as needed.
- Cached analyses avoid repeat model calls. Dictionary-only mode remains usable when no free Gemini quota exists.
- Public endpoints still consume Vercel and database quota; this is not a claim of comprehensive anti-abuse protection for large public traffic.

Official references checked while preparing the project:
- https://nextjs.org/docs/app/getting-started/installation
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/firestore/quotas
- https://firebase.google.com/pricing
- https://vercel.com/docs/plans/hobby
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/generate-content/structured-output

## Academic scope and future extensions

Implemented: central repository, student submission, taxonomy normalization, optional Gemini classification, lexical related-project discovery, teacher review, search/filtering and owner management. SIH alignment means the project's maintained categories, not official SIH affiliation.

Future/optional: genuine Sentence-BERT embeddings, FAISS with durable indexing and a suitable Python host, spaCy/custom NER, server-side full-text search, large-scale counters, recommendation ranking, institutional SSO, and repository-wide semantic evaluation. None is claimed to be running in this version.

## Screenshots

No browser screenshots are included in this delivery. After configuring and running the app, capture your own desktop/mobile screens for your academic report; avoid including personal emails or secrets.
