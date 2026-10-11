"use client";
import { useEffect, useState, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Save, Link2, CheckCircle2 } from "lucide-react";
import { useApp } from "./provider";
import { Workspace, PageTitle, ErrorBox, Tags, Loading } from "./ui";
import { projectSchema } from "@/lib/validation";
import type { ProjectInput, Analysis, Project } from "@/lib/types";
const blank: ProjectInput = {
  title: "",
  abstract: "",
  description: "",
  githubUrl: "",
  presentationUrl: "",
  demoUrl: "",
};
export function AnalysisPanel({ analysis: a }: { analysis: Analysis }) {
  return (
    <div className="analysis-panel">
      <div className="panel-heading">
        <h3>
          <Sparkles size={18} /> Analysis results
        </h3>
        <span className="badge">
          {a.method === "dictionary" ? "Dictionary" : "Gemini + dictionary"}
        </span>
      </div>
      {Object.entries(a.technologyCategories).map(([category, tags]) => (
        <div className="taxonomy-row" key={category}>
          <small>{category}</small>
          <Tags tags={tags} />
        </div>
      ))}
      {!a.technologies.length && (
        <p>
          No supported technologies found. Mention your actual stack in the
          description.
        </p>
      )}
      <div className="analysis-domain">
        <small>SUGGESTED DOMAIN</small>
        <strong>{a.domain || "Not classified"}</strong>
        <p>{a.reason}</p>
        {a.domainConfidence !== null && (
          <small>
            Model estimate: {Math.round(a.domainConfidence * 100)}% · not
            calibrated
          </small>
        )}
      </div>
      <h4>Potentially similar projects</h4>
      <small className="muted">
        {a.similarityMethod} · Text overlap is not proof of duplication.
      </small>
      {a.similarProjects.map((p) => (
        <a
          className="similar-row"
          key={p.projectId}
          href={`/projects/${p.projectId}`}
          target="_blank"
          rel="noreferrer"
        >
          <span>
            {p.title}
            <small>
              {p.score >= 0.8 ? "High" : p.score >= 0.6 ? "Moderate" : "Low"}{" "}
              lexical similarity
            </small>
          </span>
          <strong>{Math.round(p.score * 100)}%</strong>
        </a>
      ))}
      {!a.similarProjects.length && (
        <p>No close text matches in the checked collection.</p>
      )}
      <p className="analysis-notice">{a.notice}</p>
    </div>
  );
}
export function ProjectEditor({ id }: { id?: string }) {
  const { api, profile, toast } = useApp(),
    router = useRouter();
  const [form, setForm] = useState<ProjectInput>(blank),
    [revision, setRevision] = useState(0),
    [analysis, setAnalysis] = useState<Analysis | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!!id);
  const initialLoad = useEffectEvent(() => {
    if (!id || !profile) return;
    api(`projects/${id}`)
      .then((x) => {
        const p = (x as { project: Project }).project;
        setForm({
          title: p.title,
          abstract: p.abstract,
          description: p.description,
          githubUrl: p.githubUrl,
          presentationUrl: p.presentationUrl,
          demoUrl: p.demoUrl,
        });
        setRevision(p.revision);
        setAnalysis(p.analysis);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  });
  useEffect(() => {
    initialLoad();
  }, [id, profile?.uid]);
  const change = (key: keyof ProjectInput, value: string) => {
    setForm((x) => ({ ...x, [key]: value }));
    if (["title", "abstract", "description"].includes(key)) setAnalysis(null);
  };
  async function action(kind: "analyze" | "draft" | "pending") {
    setError("");
    const parsed = projectSchema.safeParse(form);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
      return;
    }
    setBusy(kind);
    try {
      if (kind === "analyze")
        setAnalysis(
          (await api("ai/analyze", {
            method: "POST",
            body: { ...parsed.data, ...(id ? { excludeProjectId: id } : {}) },
          })) as Analysis,
        );
      else {
        const p = (await api(id ? `projects/${id}` : "projects", {
          method: id ? "PATCH" : "POST",
          body: { ...parsed.data, status: kind, ...(id ? { revision } : {}) },
        })) as { id: string };
        toast(
          kind === "draft"
            ? "Draft saved."
            : "Project submitted for teacher review.",
        );
        router.push(`/projects/${p.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Workspace role="student">
      <PageTitle
        eyebrow="TURN YOUR WORK INTO SHARED KNOWLEDGE"
        title={id ? "Refine your idea." : "Share what you’re building."}
        description="Tell the story, connect the technology, and let your work inspire someone."
      />
      {loading ? (
        <Loading />
      ) : (
        <div className="editor-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Project details</h2>
              <span className="muted">* Required fields</span>
            </div>
            <ErrorBox message={error} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action("pending");
              }}
            >
              <label>
                Project title *
                <input
                  value={form.title}
                  required
                  minLength={5}
                  maxLength={160}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="A clear name for a meaningful idea"
                />
              </label>
              <label>
                Abstract / short summary *
                <textarea
                  rows={4}
                  value={form.abstract}
                  minLength={30}
                  maxLength={2000}
                  required
                  onChange={(e) => change("abstract", e.target.value)}
                  placeholder="What problem does your project solve, and who does it help?"
                />
                <small>
                  {form.abstract.length}/2000 characters · minimum 30
                </small>
              </label>
              <label>
                Methodology & technology
                <textarea
                  rows={7}
                  value={form.description}
                  maxLength={12000}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder="Explain how it works. Name the technologies you actually use so we can tag them accurately."
                />
              </label>
              <div className="form-section-title">
                <Link2 size={17} />
                <h3>Bring your work to life</h3>
              </div>
              {(
                [
                  [
                    "githubUrl",
                    "GitHub repository",
                    "https://github.com/you/project",
                  ],
                  [
                    "presentationUrl",
                    "Presentation / document",
                    "https://drive.google.com/…",
                  ],
                  ["demoUrl", "Demo video", "https://youtube.com/watch?v=…"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key}>
                  {label}
                  <input
                    type="url"
                    value={form[key]}
                    onChange={(e) => change(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </label>
              ))}
              <small className="muted">
                Use shareable HTTPS links. Files stay with your original
                provider.
              </small>
              <div className="form-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => void action("draft")}
                >
                  <Save size={17} />
                  {busy === "draft" ? "Saving…" : "Save draft"}
                </button>
                <button className="button" disabled={!!busy}>
                  {busy === "pending" ? "Submitting…" : "Submit for review"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </form>
          </section>
          <aside>
            <div className="ai-card">
              <div className="ai-icon">
                <Sparkles />
              </div>
              <div className="eyebrow">
                A LITTLE INTELLIGENCE, A LOT OF CLARITY
              </div>
              <h2>
                Connect your project
                <br />
                to the bigger picture.
              </h2>
              <p>
                Identify technologies, suggest a domain, and find potentially
                similar projects before you submit.
              </p>
              <button
                className="button full"
                disabled={!!busy}
                onClick={() => void action("analyze")}
              >
                <Sparkles size={17} />
                {busy === "analyze"
                  ? "Analyzing your project…"
                  : "Analyze project"}
              </button>
              <small>Optional. Your project can be submitted without AI.</small>
            </div>
            {analysis ? (
              <AnalysisPanel analysis={analysis} />
            ) : (
              <div className="editor-tip">
                <CheckCircle2 size={19} />
                <p>
                  <strong>Make your work easy to discover.</strong>
                  <br />
                  Specific descriptions lead to better tags and more useful
                  matches.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </Workspace>
  );
}
