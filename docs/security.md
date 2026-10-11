# Security model

- Authentication: Firebase Admin `verifyIdToken(token, true)` for revocation-aware identity verification. Missing/invalid tokens receive 401; authenticated role failures receive 403.
- Administrator: Firestore role must be `admin`, UID must equal configured `ADMIN_UID`, and the account must not be deleting. Public registration accepts only `student`/`teacher`.
- Teacher: role must be `teacher` and approved true. Review transactions re-read the profile to prevent a revoked approval from succeeding on a stale check.
- Student: owner-only editable projects. Protected AI, identity and review fields cannot be supplied through schemas. Students cannot mark projects approved.
- Firestore rules: deny all direct client access. Every supported database operation goes through verified server handlers. Admin SDK bypasses rules and therefore requires its own policy tests.
- Input: strict Zod objects, text limits, HTTPS-only external links, no URL credentials. Linked content is not fetched, so user links do not create a server-side request proxy. React escapes text output; no raw HTML rendering is used.
- Secrets: Admin key and Gemini key are server environment variables, never public variables. Emulators are rejected when `NODE_ENV=production`.
- Errors: expected validation/auth/state failures are explicit; internal/provider details and credentials are not returned to browsers.
- Model output: untrusted and schema-checked. The model cannot approve projects or grant roles. Prompts instruct it to treat project descriptions as data.
- Browser demo: not an authorization mechanism, never grants live access.

## Deletion policy

The owner confirms by typing DELETE. The primary admin cannot be deleted. A transaction first marks the target `deleting`; protected operations reject that account. The Auth user is disabled and refresh tokens revoked. The handler deletes owned projects, reviews about those projects (by denormalized studentId), reviews authored by the target, user analysis caches and usage records, then Auth and finally the profile.

Deleting a teacher removes their review records; existing project publication statuses remain. Deleting a student removes their projects and all reviews attached to those projects. Resources hosted elsewhere are not deleted.

Cross-service deletion is not atomic. The profile remains marked deleting until all steps complete. Repeating the same owner deletion retries remaining work, and Auth `user-not-found` is tolerated. Very large accounts may exceed a Vercel request duration; retry rather than unmarking the user. A durable background job would be a future scale improvement.

Project creation, edits, AI cache writes and reviews read active user documents in transactions so they cannot recreate user-owned records after the deletion lock wins a concurrent transaction.

## Scope limits

This prototype is not a complete enterprise abuse prevention system. Public repository reads and registration can consume provider quota. No production secrets, IAM roles, authorized domains, live provider policies or production network behavior were validated in this delivery. Run the deployment walkthrough and review your provider settings before public use.

A permanent `deletedUsers/{uid}` marker contains only a deletion timestamp, not the deleted name/email. Registration checks this marker transactionally to prevent an in-flight, previously verified registration from recreating a profile after deletion. Do not remove these markers when cleaning application data.
