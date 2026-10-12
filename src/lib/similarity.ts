import type { SimilarProject } from "./types";
const stop = new Set(
  "a an the is are of for and to in on with by this that from using system project platform it as at be can our we".split(
    " ",
  ),
);
export function similarityText(p: { title: string; abstract: string; description: string }) {
  return `${p.title} ${p.abstract} ${p.description.split("\n\nRepository evidence")[0]}`;
}
export function tokens(text: string) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length > 1 && !stop.has(t),
  );
}
export interface SimilarityService {
  compare(
    text: string,
    projects: {
      id: string;
      title: string;
      abstract: string;
      description: string;
    }[],
  ): SimilarProject[];
}
export class LexicalSimilarityService implements SimilarityService {
  compare(
    text: string,
    projects: {
      id: string;
      title: string;
      abstract: string;
      description: string;
    }[],
  ) {
    if (!projects.length) return [];
    const docs = [
      tokens(text),
      ...projects.map((p) =>
        tokens(similarityText(p)),
      ),
    ];
    const df = new Map<string, number>();
    for (const d of docs)
      for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
    const vectors = docs.map((d) => {
      const v = new Map<string, number>();
      for (const t of d) v.set(t, (v.get(t) ?? 0) + 1);
      for (const [t, n] of v)
        v.set(
          t,
          (1 + Math.log(n)) *
            (1 + Math.log((docs.length + 1) / ((df.get(t) ?? 0) + 1))),
        );
      return v;
    });
    const norm = (v: Map<string, number>) =>
      Math.sqrt([...v.values()].reduce((s, n) => s + n * n, 0));
    const a = vectors[0];
    return projects
      .map((p, i) => {
        const b = vectors[i + 1];
        const den = norm(a) * norm(b);
        const dot = [...a].reduce((s, [t, n]) => s + n * (b.get(t) ?? 0), 0);
        return {
          projectId: p.id,
          title: p.title,
          score: den ? Math.min(1, dot / den) : 0,
        };
      })
      .filter((p) => p.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
}
export const similarityService: SimilarityService =
  new LexicalSimilarityService();
