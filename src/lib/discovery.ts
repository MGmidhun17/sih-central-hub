import type { Project } from "./types";
import { normalizeTechnologies } from "./taxonomy";
import { tokens } from "./similarity";
const synonyms: Record<string,string[]> = { ai: ["artificial intelligence", "machine learning", "gemini"], ml: ["machine learning", "tensorflow", "pytorch"], iot: ["internet of things", "sensor", "esp32", "arduino"], healthcare: ["health", "medical", "patient"], education: ["learning", "student", "school"], recycling: ["recycle", "waste"], irrigation: ["water", "agriculture"] };
export function searchScore(p: Project, query: string) {
  if (!query.trim()) return 1;
  const fields = [p.title, p.techStack.join(" "), p.sihDomain, p.abstract, p.description, p.analysis?.keywords.join(" ") ?? ""].map(s => s.toLowerCase());
  const canonical = normalizeTechnologies(query).technologies;
  const words = tokens(query);
  if (!words.length) return fields.some(f => f.includes(query.toLowerCase())) ? 1 : 0;
  let score = 0;
  for (const word of words) {
    const variants = [word, ...(synonyms[word] ?? [])];
    let hit = 0;
    fields.forEach((f, i) => { if (variants.some(v => f.includes(v))) hit += [8,6,4,3,1,2][i]; });
    // Alias queries such as nextjs or tailwind resolve against canonical tags.
    if (!hit && normalizeTechnologies(word).technologies.some(t => canonical.includes(t) && p.techStack.includes(t))) hit = 5;
    if (!hit) return 0;
    score += hit;
  }
  return score + (fields[0].includes(query.toLowerCase()) ? 12 : 0);
}
export function searchProjects(projects: Project[], params: URLSearchParams) {
  const q = (params.get("q") ?? "").slice(0,200), domain = params.get("domain"), tech = params.get("tech"), sort = params.get("sort") ?? "relevance";
  return projects.filter(p => (!domain || p.sihDomain === domain) && (!tech || p.techStack.includes(tech)))
    .map(p => ({ p, score: searchScore(p,q) })).filter(x => x.score > 0)
    .sort((a,b) => sort === "title" ? a.p.title.localeCompare(b.p.title) : sort === "newest" || !q ? b.p.createdAt.localeCompare(a.p.createdAt) : b.score - a.score || b.p.createdAt.localeCompare(a.p.createdAt))
    .map(x => x.p);
}
export function projectAnalytics(projects: Project[]) {
  const counts = (values: string[]) => Object.entries(values.reduce((a,v) => ({...a,[v]:(a[v]??0)+1}),{} as Record<string,number>)).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  return {
    total: projects.length, students: new Set(projects.map(p=>p.studentId)).size, institutions: new Set(projects.map(p=>p.institution).filter(Boolean)).size,
    domains: counts(projects.map(p=>p.sihDomain || "Unclassified")), technologies: counts(projects.flatMap(p=>[...new Set(p.techStack)])),
    months: counts(projects.map(p=>p.createdAt.slice(0,7))).sort((a,b)=>a.name.localeCompare(b.name)),
    githubProjects: projects.filter(p=>!!p.githubUrl).length,
    aiAnalyzed: projects.filter(p=>p.analysis?.method === "gemini+dictionary").length,
  };
}
export type RepositoryAnalytics = ReturnType<typeof projectAnalytics> & { truncated?: boolean };
