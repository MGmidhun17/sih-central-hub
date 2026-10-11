# Analysis and similarity

1. The student explicitly requests analysis; renders and page loads do not trigger it.
2. The server validates text, caller role and optional project ownership.
3. A SHA-256 hash over title/abstract/description selects a user-specific cache record. Resource URL changes do not invalidate semantic content analysis.
4. A new analysis reserves user and global UTC-day allowance in one transaction. Failed provider attempts consume the reservation; they do not retry automatically and multiply costs.
5. A dictionary recognizes canonical technologies and aliases with token boundaries. Unknown model-generated names are discarded, aliases canonicalized, duplicate tags removed, and categories assigned by the controlled taxonomy.
6. With a configured key/model, Gemini receives a constrained extraction/classification prompt and a JSON response schema. Zod validates the resulting JSON and the domain must be in the controlled list. Confidence is explicitly an uncalibrated model estimate.
7. On missing configuration, malformed response, timeout or provider failure, dictionary and domain-keyword fallback is returned with its actual method. It is never labeled as a successful Gemini analysis.
8. Similarity is recalculated against a bounded collection of approved projects, then the server stores the final report under the content hash. Editing input clears the browser's visible analysis; saving different content cannot reuse the previous hash.

## Actual similarity algorithm

`SimilarityService` exposes `compare(text, projects)`. `LexicalSimilarityService` tokenizes lowercase alphanumeric words, removes a short stopword list, builds corpus document frequencies, computes log-scaled term frequency × smoothed inverse document frequency, and calculates cosine similarity. Scores are bounded to [0,1]. It returns up to five results above 0.05 from at most 200 approved candidate projects.

Displayed low/moderate/high labels use <60%, 60–79%, and >=80% lexical scores. These thresholds are illustrative and not calibrated plagiarism thresholds. Vocabulary paraphrases may be missed; unrelated projects sharing terminology may appear similar. A percentage represents vector similarity, not a percentage of copied content.

Sentence-BERT and FAISS are extension targets, not installed services. A future semantic service can replace the implementation behind the abstraction while keeping the response shape, but it needs a suitable embedding runtime, model license review, persistence, reindexing and evaluation.
