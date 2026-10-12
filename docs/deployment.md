# Deployment and acceptance walkthrough

Use the Firebase/Vercel steps in README. No alternate hosting platform is substituted. The app has no live credentials or deployed URL included.

## Before deployment

- Confirm the Firebase web config and Admin service account belong to the same project.
- Enable email/password and Google Authentication, authorize the deployed hostname, and create the default Firestore database. Follow `GOOGLE_SIGN_IN_SETUP.md`.
- Publish `firestore.rules` exactly; do not use open test-mode rules.
- Bootstrap the one owner and set its exact ADMIN_UID on Vercel.
- Keep all emulator variables unset in production.
- Add Gemini only after checking current model availability and your account's free quota. Dictionary mode works without it.
- Run lint, typecheck, unit/emulator tests and production build.

## Production walkthrough (requires your accounts)

1. Open the production URL in a signed-out/private browser. Approved repository records are public; user emails and draft IDs must not be accessible.
2. Register a student, create a draft and reload. The draft should persist in Firestore. Analyze, verify method labels, then submit.
3. Register a teacher. The teacher must see a pending-approval screen and get 403 if directly calling review endpoints.
4. Sign in as owner. Check counts, search, user details; approve the teacher.
5. Teacher signs back in, opens the queue and requests changes with feedback.
6. Student sees feedback, edits, and resubmits. Teacher approves. The approved project appears in public browsing and can no longer be edited by the student.
7. Try duplicate reviews/stale revisions. One valid review succeeds; stale state fails.
8. Test password reset. Verify actual email delivery and the action URL on your deployed domain.
9. If Gemini is configured, check `gemini+dictionary` in the returned report. Disable/misconfigure the model once to verify visible dictionary fallback, using changed content or clearing the matching cache.
10. Use expendable test accounts to verify teacher rejection and confirmed user deletion. Check Firebase Auth and Firestore records after deletion. Never test deletion with your real student work.
11. Check navigation, forms, tables, dialogs and charts on desktop and a narrow mobile viewport, with keyboard focus and a screen reader where available.

## Operational troubleshooting

- 503 service unavailable: verify project IDs, private key newlines, service-account IAM and server logs. The client intentionally does not receive raw internal errors.
- 401: sign out/in and check Auth project configuration.
- 403 admin: check both Firestore role and ADMIN_UID; a role by itself is insufficient.
- Teacher still pending: reload/sign back in after owner approval.
- New account exists in Auth but has no profile: sign in and complete the profile form shown after authentication. Sign up also lets an authenticated user finish their profile.
- Gemini always uses dictionary: check both GEMINI_API_KEY and GEMINI_MODEL; clear the matching cached fallback or alter the content before trying again.
- Deleted account remains marked deleting: retry deletion from the owner dashboard to finish interrupted work.
- Search misses a record: load additional pages; filters apply to currently loaded records.
