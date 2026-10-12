# Data model

Application timestamps are UTC ISO-8601 strings, chosen to serialize consistently across API responses. They are assigned by trusted server code. If converting them to Firestore Timestamps later, update serialization and ordered queries together.

| Collection | Key | Main fields |
| --- | --- | --- |
| users | Firebase UID | uid, name, email, institution, role, approved, rejected, deleting, createdAt, updatedAt |
| projects | Auto ID | id, title, abstract, description, githubUrl, presentationUrl, demoUrl, studentId, studentName, institution, status, techStack, techCategories, sihDomain, analysis, revision, createdAt, updatedAt, submittedAt |
| reviews | Auto ID | projectId, studentId, teacherId, teacherName, decision, comments, createdAt |
| analysisCache | UID + content hash | uid, hash, result, createdAt |
| aiUsage | UID + UTC date, or global + date | count, day, uid when user-scoped |
| system | owner | uid |

Technology/domain taxonomies are versioned in source (`src/lib/taxonomy.ts`) rather than mutable collections. Change them there, then review affected cached analyses before redeploying. The admin domain link is an explorer, not a taxonomy editor.

`analysis` contains normalized tags/categories, domain, confidence (nullable), reason, keywords, analysis method, timestamp, similar projects and the explicit similarity method. Client-supplied analysis is rejected. A save may attach only the caller's server cache matching the current content hash, or use server dictionary extraction when there is no matching cache.

Public responses remove analysis and internal review history. Approved project descriptions, student display names and institutions are public by design; account email and user tables require administrative authorization.

All writes are server-side. Firestore rules deny client SDK/REST access, even to approved projects. Lists use document-ID cursors (100/page); sorting/filtering then operates on loaded records. No implicit chronological pagination is claimed.

Old AI usage/cache documents can be removed manually using a trusted maintenance environment. Automatic TTL is not configured because enabling additional provider features can change pricing requirements. Cache and usage cleanup is included in account deletion.

`deletedUsers/{uid}` retains a minimal `{ deletedAt }` tombstone after account deletion to prevent registration races from resurrecting a deleted profile. It is not exposed by any API.

| projectFiles | projectId_kind_chunk | projectId, studentId, binary bytes (512 KiB chunks) |
| projectFingerprints | hash identity | projectId, studentId, createdAt |

Projects now optionally include sourceFile/presentationFile metadata, sourceFingerprint, repoRevision, duplicateKeys, baseProjectId/baseProjectTitle and improvements. New file blobs and uniqueness claims are written atomically with project saves.
