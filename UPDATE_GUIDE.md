# Update: duplicate links, sign-in-only projects and navigation

## What changed on 14 October 2026

- Exact duplicates show “This project already exists” and a link to the earlier project when the current user has permission to view it. Another student's private draft is not disclosed.
- GitHub import checks an existing repository revision; source-file import checks an identical source fingerprint. Saving still repeats the atomic check, so two simultaneous saves cannot store duplicates.
- Changed source/revisions can still be linked as advanced versions. A similarity percentage alone is not an exact-duplicate verdict.
- Logout clears the session and returns to `/` with a full page navigation.
- Visitors see the landing page without project cards, repository search or project statistics. Project pages, details, downloads, versions and analytics require authentication on the server; protected pages direct visitors to login.
- Login is highlighted only on `/login`; Sign up only on `/register`. The signup arrow is removed. The navigation menu icon is hidden on desktop and retained where needed on narrow screens.

## Update without terminal commands

1. Extract this ZIP and copy the contents of `hackrepo` into your GitHub Desktop checkout, replacing existing files. This includes new files under `src/components` and `src/lib/server`.
2. Commit and Push origin using GitHub Desktop.
3. Wait for Vercel to show Ready for that commit. No new environment variables or Firebase rules are required.
4. Verify signed-out access with a private browser: `/projects`, a known project URL and `/analytics` must lead to login. The landing page must not show real projects.
5. Sign in, import a previously submitted repository revision, and confirm the duplicate message opens the original. Repeat with the same source file/ZIP. No extra record should be saved.
6. Log out from project details or a dashboard: the browser must return to the landing page.
7. Open Login and Sign up: only the current navigation item should be colored.

Google provider settings are still documented in `GOOGLE_SIGN_IN_SETUP.md`. Existing uploads, optional presentations and linked advanced versions are retained.

## Previous release details

This update changes both frontend and backend. Replace the complete project contents, not just CSS. No new environment variables or Firebase Storage setup are required. Existing Vercel/Firebase credentials remain in their dashboards.

## Without terminal commands

1. Extract this ZIP.
2. In GitHub Desktop, open the same repository connected to Vercel.
3. Copy the CONTENTS of the extracted `hackrepo` folder into the repository folder beside `package.json`. Replace existing files. Include all new files under `src/lib/server`, the new `src/app/interface.css`, and existing `public/fonts` files.
4. Review the changes, commit and Push origin. Do not include environment secrets, dependencies or build output.
5. Wait for Vercel → Deployments → Ready for the new commit. Refresh the website.

If you use GitHub's browser editor, preserve every file's exact relative path. This is a full application update, so copying only the stylesheet will not enable uploads or duplicate checks.

## New in this update

- Restored stacked labels with full-width fields in project submission and authentication forms. Character counters sit below text areas.
- Aligned repository URL input and import action; stacked them on smaller screens.
- Matched project-card title/description space, aligned footers and removed hover movement.
- Added internal padding and readable labels to analysis results; made the header opaque and moved navigation into a menu earlier at narrower widths.
- Added Google sign-in to login and signup, first-time profile completion, existing-role preservation and actionable error messages.

**Required:** follow `GOOGLE_SIGN_IN_SETUP.md` to enable Google in Firebase and authorize your Vercel domain. No new API key is needed for Google sign-in.

## What students can submit

- Public GitHub repository: Import & analyze.
- Source file or ZIP: choose Source file / ZIP, select a file, then Import & analyze files.
- Optional PowerPoint: attach .pptx or .ppt below the project details; a shareable presentation link also remains supported.
- Enter or correct the title, summary and methodology, then Save draft or Submit for review.

Each source/presentation file must be no larger than 1 MiB. ZIP limits: 500 entries, 8 MiB expanded total, 2 MiB per member. Remove dependency folders, build output and secrets. For larger projects use a GitHub repository and a presentation link.

PPTX slide text contributes to classification when saved and is readable on the details page. Both PPT/PPTX originals can be downloaded by permitted viewers. Legacy PPT text extraction is unsupported: use PPTX to analyze slide text. Files do not need to be uploaded again when editing text on an existing project.

## Duplicates and advanced models

Exact source fingerprints, repeated GitHub repository revisions, and repeated manually entered details are blocked on the server. Renaming the title or ZIP alone cannot bypass source checks. Failed duplicate saves do not write projects or attachments. Similarity alone does not prove a duplicate; changed implementations remain subject to teacher review.

For an advanced version, choose the checkbox, enter the approved original project's link/ID, and explain the improvements in at least 40 characters. Upload changed source or use an updated GitHub revision. The basic project stays unchanged. The original project page links to approved advanced versions.

## Verify after deployment

1. Student: upload a small source file/ZIP and submit; teacher: open, download and review it.
2. Submit identical source again with a new title: expect a duplicate error and no extra project.
3. Approve the original, then submit changed code as an advanced version. Approve it and confirm both versions remain visible.
4. Attach a PPTX and confirm slide text and download work. Save a project without any presentation and confirm it succeeds.
5. Check the same pages at desktop and mobile widths. Body text is 16px, controls/labels 14px, secondary text 13px; important text uses darker contrasting colors.

The local Firebase emulator suite and production build were tested. Your live deployment and browser rendering were not modified or verified here. See `docs/verification.md` for exact checks and limits.
