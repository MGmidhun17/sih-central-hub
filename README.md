# HackRepo — source uploads and linked versions

**SIH Aligned Dynamic Student Hackathon Project Repository with Automated Technology Stack Taxonomy Tagging**

A Next.js + TypeScript application for student project submissions, controlled technology tagging, related-project discovery, teacher review, and single-owner administration. Firebase Authentication handles identities, Cloud Firestore stores records, and the application is prepared for Vercel deployment.

## New in this edition

- Navy hero, bright-blue actions, white auth cards, compact role dashboards and responsive layouts based on the supplied 11-screen reference.
- GitHub URL-first submission: read public repo metadata, README, languages and dependency manifests; generate editable title/abstract/methodology; normalize tags; classify SIH domain; compare approved work.
- Ranked server-side keyword search with technology aliases, related terms and domain/technology filters.
- `/analytics`: approved project, contributor and institution counts; domain distribution; technology usage; monthly creation charts.
- Complete route check before builds so a partial upload fails clearly instead of silently deploying missing login pages.

For an existing Vercel installation, start with **`UPDATE_GUIDE.md`**. This source package does not update your deployed website automatically.

## What is included

- Responsive landing page, email/password login, registration, password reset, project explorer, domain directory and project details.
- Student workspace: create drafts, edit eligible projects, analyze content, submit for review, view feedback, delete drafts.
- Teacher workspace: approval gate, review queue, approve/reject/request changes, review history.
- Owner workspace: aggregate counts, status chart, paginated users, name/email search, individual profiles, teacher approval/rejection, confirmed cascading deletion.
- Canonical technology taxonomy, dictionary matching, optional server-side Gemini extraction/classification, content-keyed caching and daily request caps.
- TF-IDF cosine similarity against up to 200 approved projects. **This is lexical comparison, not Sentence-BERT, FAISS, semantic proof, or plagiarism detection.**
- Server authorization, strict input validation, optimistic revisions, atomic reviews, deny-all client Firestore rules, owner bootstrap.
- Automated unit tests and an emulator integration workflow covering access controls, reviews, direct Firestore rules and account deletion.

## Delivery status

The source is implemented. Real Firebase, Gemini and Vercel accounts/credentials are not included. Live authentication, provider calls and production deployment must be configured and checked in your own accounts. All records and identities come from Firebase; empty repositories show empty states.

See `docs/verification.md` for the checks actually performed and remaining verification limits.

## 1. Run the project

Install **Node.js 22 or newer**. Extract this project, open its folder in VS Code, then run:

```powershell
npm ci
npm run dev
```

Open the localhost URL printed in the terminal, normally `http://localhost:3000`.

Firebase credentials are required for authentication and repository data.

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

1. Register your own account as a **Student**.
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

Without both values, analysis uses its dictionary and keyword fallback. Quota failures, timeouts and malformed responses also fall back with a visible explanation.

For GitHub imports, students can paste a public repository root URL and press **Import & analyze**. The authenticated server reads GitHub metadata, language totals, the default branch commit, its file tree and up to seven README/dependency files at that exact commit. No repository code or install scripts are executed. When Gemini is configured, this bounded evidence is sent to Gemini to draft the title, abstract, methodology, domain and keywords. Canonical technology tags come from inspected evidence. Generated details are editable and do not claim ownership or verification of code quality. Students must review and submit; teachers decide publication.

If Gemini is unavailable, repository excerpts and dependency extraction still populate the form with an explicit fallback label. Private, missing, empty or inaccessible repositories produce actionable errors. Metadata, file-size, time and request limits bound this academic prototype; this is not a full source-code audit. Presentation and video links are stored without being fetched.

Optionally set `GITHUB_TOKEN` as a server-only Vercel variable to raise the public GitHub API rate limit. Use minimum access appropriate for public repository reads. Never prefix it with `NEXT_PUBLIC_`. Import remains public-only even if a token can access private repositories. GitHub credentials are sent only to the fixed `api.github.com` endpoint. The app does not follow returned download URLs or redirects.

Manual editing and text analysis remain available. Imported analysis is cached for saving against the generated content and repository URL. A fresh Import deliberately reads the repository again and consumes one shared daily analysis quota slot.

Analysis is cached by user + content hash. To deliberately rerun the same text after changing provider configuration, remove the matching `analysisCache` document using the trusted Firebase console, then analyze again. Editing title, abstract, description or GitHub URL automatically changes the cache key. Presentation/video links do not invalidate classification.

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

## Architecture

```mermaid
flowchart TD
  UI["Next.js interface"] --> Auth["Firebase Authentication"]
  UI --> API["Verified Node.js API"]
  API --> DB["Cloud Firestore"]
  API --> GH["Public GitHub evidence"]
  GH --> AI["Dictionary and optional Gemini"]
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
- `scripts/`: trusted admin bootstrap.
- `tests/`: unit and emulator integration tests.
- `docs/`: architecture, deployment, security and verification notes.

## Free-tier scope and practical limits

This is a small, non-commercial academic prototype, not an unlimited free production service. Firestore has finite daily quotas, Vercel Hobby has usage and personal/non-commercial restrictions, and Gemini quotas vary by model/account. The application does not enable billing or guarantee a provider's future pricing.

- External resource links avoid large file-storage costs; no Cloud Storage upload or paid search service is introduced.
- Public smart search scans up to 500 approved projects and returns the top 100 ranked matches. The UI indicates truncation. Analytics uses the same 500-record scope. Personal/admin lists still use 100-record pagination.
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

Future/optional: genuine Sentence-BERT embeddings, FAISS with durable indexing and a suitable Python host, spaCy/custom NER, an indexed search service beyond the bounded keyword ranker, large-scale counters, recommendation ranking, institutional SSO, and repository-wide semantic evaluation. None is claimed to be running in this version.

## Screenshots

No browser screenshots are included in this delivery. After configuring and running the app, capture your own desktop/mobile screens for your academic report; avoid including personal emails or secrets.

## Current SIH taxonomy and teacher access

The app uses exactly 17 SIH domains from the supplied requirements; AI/ML and IoT are technology categories, not SIH domains. See `src/lib/taxonomy.ts`. Projects with no specific keyword match receive provisional Miscellaneous. Existing legacy categories are mapped on read; ambiguous old categories are classified from project text. Cached analysis keys include the taxonomy version. Re-analyze existing projects for fresh AI results.

Teachers require owner approval. Submitted (pending) projects appear in the teacher review queue; drafts remain private. The queue refreshes when the tab regains focus and has a Refresh submissions button. The account approval screen has Check approval status.

## Source files, PowerPoint and duplicate prevention

Students may import a public GitHub repository, upload one UTF-8 source file, or upload a ZIP of source files. A presentation is optional. Each uploaded source or presentation file is limited to 1 MiB; combined multipart requests are bounded before parsing. ZIP files may contain at most 500 entries and expand to at most 8 MiB total / 2 MiB per member. Dependencies/build folders are not analyzed. Remove secrets/environment/key files before uploading.

PPTX slide text (up to 60 slides / 16,000 characters) contributes to classification and can be read on the project page. Legacy PPT files are stored for download; save as PPTX for text extraction. Source excerpts inspect up to 20 files / 32,000 characters. Files are not executed. File-based saves explicitly label dictionary classification; the Import & analyze action uses Gemini when configured, with a labelled extraction fallback.

Files are stored as 512 KiB binary chunks in Firestore `projectFiles`, atomically with the project. Firebase Storage is not required. They consume Firestore storage/write/read quotas. Public downloads are available only after project approval; before approval the same project-read permissions govern downloads. The API forces downloads with attachment headers and does not execute uploaded content. User/draft deletion also removes file chunks and uniqueness records.

`projectFingerprints` provides atomic duplicate blocking, including concurrent submissions. Identical code is detected despite renamed ZIP roots or different ZIP compression, and Markdown/README changes alone do not make unchanged code new. Identical canonical GitHub repository+commit pairs are rejected. Manual submissions with identical normalized abstract/methodology/improvement text are rejected, even with a renamed title. A rejected save creates neither a project nor file chunks. Already-existing GitHub records with matching revision evidence are checked, but old file-less records cannot be retrospectively fingerprinted.

Similarity is still a warning, not proof of duplication. Rewritten copies, mirrored repositories, novel-looking descriptions and semantic equivalence are not reliably detected. Changes to actual source receive a different fingerprint and remain subject to teacher review.

To submit an advanced model, select “advanced version,” enter the approved original project's link/ID, describe improvements (at least 40 characters), and submit changed source. Both records remain separate and become public after their own teacher approval. Original pages show approved advanced versions; private versions are filtered by access permissions. No automatic claim of superior performance is made.

## Google sign-in

The login and signup forms support Google popup authentication through the existing Firebase project. Enable the Google provider and authorize the deployed domain as described in `GOOGLE_SIGN_IN_SETUP.md`. New users complete name, institution and role; existing roles and approval state remain unchanged. Teachers still require owner approval. Admin access still requires the configured UID and server-side admin role. Email/password remains supported.

## Member-only browsing update

As of 14 October 2026, project browsing, details, attachments and analytics require sign-in. Earlier references to “public approved projects” mean the approved member-visible collection in this release. Visitors see the landing page and authentication forms. Logout returns to the landing page. Exact duplicates are blocked with a permission-checked link to the original. See `UPDATE_GUIDE.md`.
