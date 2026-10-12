import { parseGitHubUrl } from "../github-url";
import { normalizeTechnologies } from "../taxonomy";
import { HttpError } from "./http";
export interface RepositoryEvidence {
  url: string; name: string; description: string; topics: string[];
  languages: string[]; commit: string; files: { path: string; text: string }[];
  warnings: string[]; technologies: string[];
}
const manifests = /(^|\/)(package\.json|requirements\.txt|pyproject\.toml|pom\.xml|build\.gradle|Cargo\.toml|go\.mod|pubspec\.yaml|composer\.json)$/i;
const ignore = /(^|\/)(node_modules|vendor|\.git|dist|build|\.next|venv|\.venv)(\/|$)/;
export function chooseFiles(tree: { path: string; type: string; size?: number; mode?: string }[]) {
  return tree.filter(x => x.type === "blob" && x.mode !== "120000" && (x.size ?? Infinity) <= 60000 && !ignore.test(x.path) && (manifests.test(x.path) || /(^|\/)readme(?:\.md|\.rst|\.txt)?$/i.test(x.path)))
    .sort((a,b) => (a.path.split("/").length - b.path.split("/").length) || Number(!/readme/i.test(a.path)) - Number(!/readme/i.test(b.path)) || a.path.localeCompare(b.path)).slice(0, 7);
}
export function dependencyEvidence(files: { path: string; text: string }[], languages: string[]) {
  const names: string[] = [...languages];
  const aliases: Record<string,string> = { next: "Next.js", react: "React", "react-dom": "React", tailwindcss: "Tailwind CSS", "@tailwindcss/postcss": "Tailwind CSS", "firebase-admin": "Firebase", "@google/genai": "Gemini", "@google/generative-ai": "Gemini", "@tensorflow/tfjs": "TensorFlow", torch: "PyTorch", "opencv-python": "OpenCV", "sentence-transformers": "Sentence-BERT", "spring-boot-starter": "Spring Boot" };
  for (const f of files) {
    if (/package\.json$/i.test(f.path)) {
      try {
        const p = JSON.parse(f.text);
        for (const name of Object.keys({ ...p.dependencies, ...p.devDependencies })) names.push(aliases[name] ?? name);
        names.push("Node.js");
      } catch { /* Other readable evidence remains useful. */ }
    } else if (manifests.test(f.path)) {
      names.push(f.text);
      for (const [name, canonical] of Object.entries(aliases)) if (f.text.includes(name)) names.push(canonical);
    }
  }
  return normalizeTechnologies(names.join("\n")).technologies;
}
async function boundedJSON(response: Response, maxBytes = 4000000) {
  if (Number(response.headers.get("content-length")) > maxBytes) throw new HttpError(422, "Repository metadata is too large to inspect.");
  const reader = response.body?.getReader();
  if (!reader) throw new HttpError(502, "GitHub returned an empty response.");
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const x = await reader.read(); if (x.done) break; size += x.value.length; if (size > maxBytes) throw new HttpError(422, "Repository metadata exceeds the analysis limit."); chunks.push(x.value); } }
  finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function fetchRepository(value: string, request: typeof fetch = fetch): Promise<RepositoryEvidence> {
  let parsed: ReturnType<typeof parseGitHubUrl>;
  try { parsed = parseGitHubUrl(value); } catch (e) { throw new HttpError(400, (e as Error).message); }
  const base = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const signal = AbortSignal.timeout(15000);
  const headers: Record<string,string> = { Accept: "application/vnd.github+json", "User-Agent": "HackRepo-Repository-Analyzer", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  async function get(path: string) {
    let r: Response;
    try { r = await request(`${base}${path}`, { headers, signal, redirect: "error", cache: "no-store" }); }
    catch { throw new HttpError(502, "GitHub could not be reached. Check the URL and try again."); }
    if (r.status === 404) throw new HttpError(404, "Public repository not found, or its default branch is empty.");
    if (r.status === 403 || r.status === 429) throw new HttpError(429, "GitHub access or rate limit reached. Try later, or ask the owner to configure a server-side GitHub token.");
    if (!r.ok) throw new HttpError(502, "GitHub could not read this repository. Use its current, canonical URL.");
    return boundedJSON(r);
  }
  const meta = await get("");
  if (meta.private || meta.visibility === "private") throw new HttpError(400, "Only public repositories can be imported.");
  const [snapshot, languages] = await Promise.all([get(`/commits/${encodeURIComponent(meta.default_branch)}`), get("/languages")]);
  const commit = String(snapshot.sha);
  if (!/^[a-f0-9]{40,64}$/i.test(commit)) throw new HttpError(502, "GitHub returned an invalid revision.");
  const tree = await get(`/git/trees/${commit}?recursive=1`);
  const warnings: string[] = [];
  if (tree.truncated) warnings.push("GitHub truncated the file listing; some files were not inspected.");
  const candidates = chooseFiles(tree.tree ?? []);
  const files = (await Promise.all(candidates.map(async x => {
    try {
      const path = x.path.split("/").map(encodeURIComponent).join("/");
      const f = await get(`/contents/${path}?ref=${commit}`);
      if (f.type !== "file" || f.encoding !== "base64" || f.size > 60000 || typeof f.content !== "string") throw new Error("Unsupported file");
      return { path: x.path, text: Buffer.from(f.content, "base64").toString("utf8").slice(0, 14000) };
    } catch { warnings.push(`Could not read ${x.path}; other evidence was used.`); return null; }
  }))).filter((x): x is {path:string;text:string} => !!x);
  if (!files.some(f => /readme/i.test(f.path))) warnings.push("No readable README found. Add a README describing the problem and methodology for a better summary.");
  const languageNames = Object.keys(languages).slice(0, 15);
  warnings.push("Inspection is limited to repository metadata, language totals and up to seven README/dependency files. Repository code is not executed or fully audited.");
  return { url: parsed.url, name: String(meta.name).slice(0,160), description: String(meta.description ?? "").slice(0,2000), topics: Array.isArray(meta.topics) ? meta.topics.slice(0,20) : [], languages: languageNames, commit, files, warnings, technologies: dependencyEvidence(files, languageNames) };
}
