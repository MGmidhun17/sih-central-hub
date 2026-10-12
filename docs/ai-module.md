# GitHub-first analysis

POST `/api/ai/import-repository` requires a verified, active Student profile. The JSON body contains only `githubUrl` and optional `excludeProjectId` belonging to that student. Every field is validated. The server normalizes an HTTPS github.com repository-root URL and never directly fetches arbitrary submitted URLs.

A transaction consumes one shared daily analysis slot before external requests. The fixed GitHub REST host supplies metadata, default-branch commit, language counts, recursive tree and selected README/dependency files. Private repositories, rate-limited responses and empty default branches return explicit errors. Redirects, symlinks and dependency/build directories are not followed. Maximum seven files, 60 KB/file, 14,000 input characters/file and a 15-second GitHub request budget. Response bodies have byte limits. No archive is cloned; code and installation scripts never execute.

Dependency names are mapped to controlled technology names (next → Next.js, torch → PyTorch, @google/genai → Gemini). README/language evidence supplements this map. A configured Gemini model receives bounded repository evidence as untrusted data and returns a validated JSON draft and domain/keywords. It is instructed to distinguish planned functionality from implemented claims. Unavailable or invalid Gemini output uses an explicitly labelled repository-extract fallback. Neither method proves correctness, authorship or completeness.

The student reviews generated fields. The resulting analysis records canonical tags/categories, domain/reason/confidence, source URL, snapshot SHA, inspected files, languages, warnings and summary method. A server-owned analysisCache entry is keyed by user and content hash including GitHub URL. Save endpoints retrieve that record rather than trusting client-supplied analysis. Editing content or repository URL invalidates it. Text-only analysis remains available; exact unchanged analyzed content may reuse the cache.

Similarity uses TF-IDF cosine scores against up to 200 approved records; common appended evidence boilerplate is excluded. Import also warns if the canonical repository URL matches an existing compared record. Comparisons are not plagiarism verdicts. No Sentence-BERT, spaCy or FAISS runtime is claimed.

Public search ranks title, tag, domain, abstract, description and stored keyword matches, with aliases and a small related-term dictionary. It requires every meaningful query term to match, scans up to 500 approved projects, and returns the top 100. It is not embedding-based semantic search. Analytics aggregates the same approved scope. Public responses remove internal analysis details.

The request limits are shared between imports and new text analyses, in Firestore aiUsage. They control application calls, not provider billing. Public search and analytics can still consume database quota; a large public deployment should use cached aggregates and an indexed search service.
