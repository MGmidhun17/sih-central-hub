# Update: consistent UI, source uploads, PowerPoint and versions

This update changes both frontend and backend. Replace the complete project contents, not just CSS. No new environment variables or Firebase Storage setup are required. Existing Vercel/Firebase credentials remain in their dashboards.

## Without terminal commands

1. Extract this ZIP.
2. In GitHub Desktop, open the same repository connected to Vercel.
3. Copy the CONTENTS of the extracted `hackrepo` folder into the repository folder beside `package.json`. Replace existing files. Include all new files under `src/lib/server`, the new `src/app/interface.css`, and existing `public/fonts` files.
4. Review the changes, commit and Push origin. Do not include environment secrets, dependencies or build output.
5. Wait for Vercel → Deployments → Ready for the new commit. Refresh the website.

If you use GitHub's browser editor, preserve every file's exact relative path. This is a full application update, so copying only the stylesheet will not enable uploads or duplicate checks.

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
