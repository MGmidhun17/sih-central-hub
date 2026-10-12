# Architecture and workflow

The Next.js App Router serves public pages and client-side role workspaces. A catch-all Node.js route dispatches explicit HTTP endpoints in `src/lib/server/api.ts`. Firebase Admin is initialized lazily so production builds do not need credentials. It is imported only by server code or trusted scripts.

Firebase Auth ID tokens are attached as Bearer headers. Every protected request verifies the token with revocation checking, loads the profile, and applies the role/approval/deletion policy. Browser route guards improve navigation but provide no authorization by themselves.

## Project state machine

- Student creates `draft` or submits `pending`.
- `draft`, `changes_requested`, `rejected` can be edited by their student owner and saved as `draft` or submitted as `pending`.
- `pending` can transition only through an approved teacher review to `approved`, `changes_requested`, or `rejected`.
- Published `approved` records are read-only to students in this version.
- Only own drafts can be deleted by a student.
- Every edit/review increments `revision`. A stale revision receives 409 where the state remains editable; inaccessible states receive 403.

Teacher review creates a review document and updates the project inside one Firestore transaction. The transaction rechecks teacher approval and both active accounts. Two teachers racing to review the same revision cannot both succeed.

Registration creates the Firebase identity first, then an idempotent server-side profile. If profile creation is interrupted, sign in and open Sign up to complete the profile; an existing profile is never overwritten by registration.

## Routes

Public: `/`, `/login`, `/register`, `/projects`, `/projects/[id]`, `/domains`, `/analytics`.
Student: `/dashboard/student`, `/projects/new`, `/projects/[id]/edit`.
Teacher: `/dashboard/teacher`, `/dashboard/teacher/reviews`, `/dashboard/teacher/projects/[id]`.
Admin: `/dashboard/admin`, `/dashboard/admin/users/[uid]`.

API: `POST auth/register`, `GET me`, `GET/POST projects`, `GET/PATCH/DELETE projects/:id`, `POST projects/:id/review`, `GET reviews`, `POST ai/analyze`, `POST ai/import-repository`, `GET projects/search`, `GET analytics`, `GET admin/stats`, `GET admin/users`, `GET/DELETE admin/users/:uid`, `PATCH admin/teachers/:uid` (all under `/api/`).

## Authenticated data

