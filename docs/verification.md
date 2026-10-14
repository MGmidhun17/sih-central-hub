# Verification — membership and duplicate navigation update

Prepared 14 October 2026.

- Full unit + Firebase Auth/Firestore emulator suite: 64 passed, no failures or skips.
- Production build and TypeScript: passed.
- All 20 required route files present.
- Browser rendering, active-button styles, scroll-to-error and logout navigation: not exercised in a browser; supported browser capability unavailable.
- Live Firebase, Google consent and Vercel deployment: not changed or verified.

The suite checks anonymous denial for project listing, search, approved detail, related versions, attachments and analytics. Signed-in users retain access to approved projects while drafts and pending submissions retain their existing permission rules. Repeat GitHub import returns the earlier project ID for its owner, withholds it from a different student when private, and allows the owner to reimport while editing that record. Repeated source saves return the original ID and store no additional project or attachment. Concurrent duplicate saves still create exactly one project.

Existing tests also cover Google profile completion, role preservation, teacher approval, project review, publication to the member collection, uploads, PowerPoint extraction, advanced versions, deletion cleanup, taxonomy and similarity.

Exact source/revision duplication is distinct from lexical similarity. Changed source may be accepted as a separate version and needs teacher review. PPTX text extraction and uploaded file size limits remain unchanged. Prior documentation describing approved projects as public is superseded by the sign-in requirement in this release.
