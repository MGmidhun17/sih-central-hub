# Update your existing HackRepo deployment

This package contains the complete updated application. Your currently deployed Vercel site does not change until these files are committed to its connected GitHub repository and Vercel successfully deploys that commit.

## What changes

The interface follows the supplied blue/navy reference: dark landing hero, blue calls to action, white sign-in/sign-up cards, light dashboard panels, left navigation, cards and charts. Student and Teacher are the only signup roles. Admin remains the privately configured owner. The reference's Google/GitHub login buttons, bookmark/profile-view/shortlist metrics and decorative thumbnails have not been added as nonworking controls; only implemented actions and real counts are shown.

Students open Submit Project, paste a public GitHub repository root URL, press Import & analyze, review the extracted title/summary/methodology/tags/domain/similarity results, and submit for teacher approval. A URL is enough to begin; no manual project description is needed when the repository has useful documentation. Sparse documentation produces a limited draft which the student should correct.

## Replace files without terminal commands

Preferred for avoiding failed folder uploads:

1. Open GitHub Desktop and sign into the account owning your existing repository.
2. File → Clone repository → URL → enter the SAME repository connected to your Vercel project. Choose a new local folder.
3. Extract this ZIP. Copy the CONTENTS of its `hackrepo` folder into the cloned repository folder beside the existing `package.json`. Replace the existing source files. Do not create an extra `hackrepo/hackrepo` or `src/src` level.
4. GitHub Desktop will list the changes. Review them; do not include `.env.local`, service-account JSON, `node_modules` or `.next`.
5. Commit to the production branch (usually `main`), then Push origin.
6. Open Vercel → the existing project → Deployments. Confirm the new commit builds and reaches Ready. If automatic deployment is unavailable, import/deploy the existing repository through the Vercel dashboard.

Browser-only alternative: create/replace each file at its exact path using GitHub's editor. Folder uploads can fail, as in your earlier screenshots. At the repository root, use Add file → Create new file and type a complete path such as `src/app/api/[...path]/route.ts`; paste its local contents. If a file exists, open it and use the edit button instead. Do not rename bracket folders or flatten `page.tsx` files into one directory. The new build check lists missing route files explicitly.

## Keep your existing Vercel configuration

- Framework: Next.js. Root directory: the folder containing `package.json`. Build: `npm run build`. Install: `npm ci`.
- Keep the four `NEXT_PUBLIC_FIREBASE_*` variables, Firebase Admin credentials and `ADMIN_UID` in the Production environment.
- Keep `GEMINI_API_KEY` and `GEMINI_MODEL` to enable AI summaries/domain classification. Confirm your selected model is available to your key. The fallback is extraction, not semantic AI.
- Optional new setting: `GITHUB_TOKEN`, server-only, for public GitHub API rate limits. Do not share this token or include it in the source.
- `AI_USER_DAILY_LIMIT` and `AI_GLOBAL_DAILY_LIMIT` apply jointly to new text analyses and imports. Defaults are 10/user/day and 100/day globally. These are not provider billing limits.
- Leave local emulator host variables unset on Vercel. Never paste `.env` quotes around the entire private key value in a Vercel field; supply the key itself, using real newlines or literal `\n` escapes as supported by the code.
- Redeploy after environment changes, especially `NEXT_PUBLIC_*` settings.

## Firebase setup still required

Enable Email/Password sign-in, create the default Firestore database, and deploy the included deny-all direct-client Firestore rules. Your server service account performs database access after verifying the caller. Keep admin role setup from the original README. Adding ADMIN_UID alone does not create the admin profile or role.

## Browser acceptance walkthrough

1. Visit `/login`, `/register`, `/projects`, `/domains`, and `/analytics`. None should return the app's not-found page.
2. Sign into a Student account. Open `/projects/new`.
3. Paste YOUR public project URL, e.g. `https://github.com/your-account/your-project` (replace the placeholders).
4. Press Import & analyze. Verify fields populate. Open View evidence & limitations and compare the listed files/revision with GitHub. For Gemini results, confirm the method label says AI-generated summary / Gemini + dictionary. Otherwise read the visible fallback notice.
5. Correct any unsupported claims, then Submit for review. Confirm it appears in the student's dashboard but not public search yet.
6. Sign into an approved Teacher account; review and approve. Confirm the project is now searchable and included in analytics.
7. Import the same public URL again. If the prior submission is in the compared set (up to 200 approved projects), an exact-repository warning should appear. Similarity scores are text overlap, not plagiarism verdicts.
8. Search for a tag alias such as `nextjs`. Confirm domain/technology filters and relevance sorting behave as expected.
9. Repeat on mobile. Confirm navigation, forms, project cards and charts remain usable.

## Known scope

Only public GitHub repository root URLs are accepted. GitHub API metadata plus up to seven eligible README/dependency files are inspected. Files above 60 KB are skipped; each selected file contributes at most 14,000 characters. Inspection is pinned to the default branch commit; aggregate language counts may reflect GitHub's current default-branch indexing. No code is run. Returned HTML is never rendered. No repository images are fetched.

Search is a bounded ranked keyword/alias system, not an embedding-based semantic engine. Search and approved analytics scan up to 500 projects; similarity compares up to 200 approved projects. Existing records are preserved. Legacy domain labels are mapped to the current taxonomy on read; re-analyze to refresh AI suggestions.

## Verification of this delivery

See `docs/verification.md`. Local build/test success does not verify your live Firebase/GitHub/Gemini access, model quota or Vercel environment. This package does not include account secrets or a live deployment.

## Changes in this package

Browser-only accounts, role shortcuts, artificial project data and sample seeding have been removed. The app always uses Firebase. Previously browser-only submissions were never stored in Firebase; submit the repository again using a registered student account.

After replacing files, delete `src/lib/demo.ts` and `scripts/seed.ts` from the old GitHub checkout if present (replacement copies do not delete old files). The updated package does not use either file. If you previously ran a database seed script, existing seeded Firestore documents are not automatically deleted: review and remove only your known artificial records in Firebase.

Owner: approve the Teacher account in Admin → Teachers. Teacher: select Check approval status, then Review queue → Refresh submissions. Student: use Submit for review, not just Save draft. Both accounts must use this same deployment/Firebase project.

The domain selector includes all 17 requested SIH categories. Technologies are grouped separately into Frontend, Backend, Programming Languages, Database, AI/ML, NLP, IoT/Embedded, Cloud/Deployment, Mobile, DevOps/Infrastructure, Testing, Blockchain/Security and Version Control.
