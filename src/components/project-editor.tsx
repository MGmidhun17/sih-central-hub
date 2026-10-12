"use client";
import { useEffect, useState, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Save, Link2, CheckCircle2, Github, FileCheck2, UploadCloud, FileArchive, Presentation } from "lucide-react";
import { useApp } from "./provider";
import { Workspace, PageTitle, ErrorBox, Tags, Loading } from "./ui";
import { parseGitHubUrl } from "@/lib/github-url";
import { projectSchema } from "@/lib/validation";
import type { ProjectInput, Analysis, Project, Attachment } from "@/lib/types";
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
      {a.repository && <div className="repository-evidence">
        <strong><FileCheck2 size={16} /> {a.repository.url ? "Repository inspected" : "Uploaded files inspected"}</strong>
        {a.repository.url && <a href={a.repository.url} target="_blank" rel="noreferrer">{a.repository.url.replace("https://github.com/", "")}</a>}
        <small>{a.repository.url ? "Revision" : "File checksum"} {a.repository.commit.slice(0, 8)} · {a.repository.summaryMethod === "gemini" ? "AI-generated summary" : "Extracted summary"}</small>
        <details><summary>View evidence & limitations</summary>
          <p>Languages: {a.repository.languages.join(", ") || "Not reported"}</p>
          <ul>{a.repository.files.map(f => <li key={f}>{f}</li>)}</ul>
          {a.repository.warnings.map(w => <p key={w}>{w}</p>)}
        </details>
      </div>}
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
  const [sourceMode,setSourceMode]=useState<"github"|"files">("github"),[source,setSource]=useState<File|null>(null),[presentation,setPresentation]=useState<File|null>(null),[storedSource,setStoredSource]=useState<Attachment|null>(null),[storedPresentation,setStoredPresentation]=useState<Attachment|null>(null),[removeSource,setRemoveSource]=useState(false),[removePresentation,setRemovePresentation]=useState(false),[advanced,setAdvanced]=useState(false);
  function choose(file:File|undefined,kind:"source"|"presentation") {
    setError("");if(file && file.size>1024*1024){setError("Each file must be 1 MB or smaller. Remove dependencies and build folders from source ZIPs.");return;}
    if(kind==="source"){setSource(file??null);setRemoveSource(false);}else{setPresentation(file??null);setRemovePresentation(false);}setAnalysis(null);
  }
  const fileForm=()=>{const data=new FormData();if(source)data.set("source",source);if(presentation)data.set("presentation",presentation);return data;};
  async function importUpload(){setError("");if(!source&&!presentation){setError("Choose a source file/ZIP or a presentation first.");return;}setBusy("files");try{const result=await api("ai/import-files",{method:"POST",body:fileForm()}) as {project:ProjectInput;analysis:Analysis};setForm(old=>({...result.project,githubUrl:old.githubUrl,presentationUrl:old.presentationUrl,demoUrl:old.demoUrl,baseProjectId:old.baseProjectId,improvements:old.improvements}));setAnalysis(result.analysis);toast("Files inspected. Review the details before submitting.");}catch(e){setError((e as Error).message);}finally{setBusy("");}}

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
          baseProjectId:p.baseProjectId??"",improvements:p.improvements??"",
        });
        setStoredSource(p.sourceFile??null);setStoredPresentation(p.presentationFile??null);setSourceMode(p.sourceFile?"files":"github");setAdvanced(!!p.baseProjectId);
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
    if (["title", "abstract", "description", "githubUrl", "improvements"].includes(key)) setAnalysis(null);
  };
  async function importRepo() {
    setError("");
    try { parseGitHubUrl(form.githubUrl); } catch {
      setError("Paste a public GitHub repository URL, for example https://github.com/owner/repository."); return;
    }
    setBusy("import");
    try {
      const result = await api("ai/import-repository", { method: "POST", body: { githubUrl: form.githubUrl, ...(id ? { excludeProjectId: id } : {}) } }) as { project: ProjectInput; analysis: Analysis };
      setForm(old => ({ ...result.project, presentationUrl: old.presentationUrl, demoUrl: old.demoUrl,baseProjectId:old.baseProjectId,improvements:old.improvements }));
      setAnalysis(result.analysis);
      toast("Repository inspected. Review the extracted details, then submit.");
    } catch(e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
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
      if (kind === "analyze" && (source || presentation)) {
        const result=await api("ai/import-files",{method:"POST",body:fileForm()}) as {analysis:Analysis};setAnalysis(result.analysis);
      } else if (kind === "analyze")
        setAnalysis(
          (await api("ai/analyze", {
            method: "POST",
            body: { ...parsed.data, ...(id ? { excludeProjectId: id } : {}) },
          })) as Analysis,
        );
      else {
        const payload={ ...parsed.data, status: kind, removeSource,removePresentation,...(id ? { revision } : {}) };
        const data=fileForm();data.set("payload",JSON.stringify(payload));
        const p = (await api(id ? `projects/${id}` : "projects", {
          method: id ? "PATCH" : "POST",
          body: source||presentation ? data : payload,
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
        title={id ? "Edit your project" : "Submit your project"}
        description="Submit a GitHub repository, source file, or ZIP. Add a presentation if you have one."
      />
      {loading ? (
        <Loading />
      ) : (
        <>
        <div className="submission-steps" aria-label="Submission workflow">
          <span className="active"><b>1</b> Choose source</span><span className={analysis ? "active" : ""}><b>2</b> Review analysis</span><span><b>3</b> Teacher approval</span>
        </div>
        <section className="repo-import panel">
          <div className="repo-import-heading"><span className="github-icon"><Github size={28}/></span><div><h2>Add your project source</h2><p>We’ll extract your project details, detect technologies, suggest an SIH domain, and check similar work.</p></div></div>
          <div className="source-options" role="group" aria-label="Project source type">
            <button type="button" disabled={!!busy} aria-pressed={sourceMode==="github"} onClick={()=>{setSourceMode("github");setSource(null);setRemoveSource(true);}}><Github size={20}/>GitHub repository</button>
            <button type="button" disabled={!!busy} aria-pressed={sourceMode==="files"} onClick={()=>{setSourceMode("files");change("githubUrl","");}}><UploadCloud size={20}/>Source file / ZIP</button>
          </div>
          {sourceMode==="github" ? <form onSubmit={e=>{e.preventDefault();void importRepo();}} className="repo-import-form">
            <label htmlFor="repo-url">Public GitHub repository URL<input id="repo-url" type="url" required value={form.githubUrl} disabled={!!busy} onChange={e=>change("githubUrl",e.target.value)} placeholder="https://github.com/your-name/your-project"/></label>
            <button className="button" disabled={!!busy}><Sparkles size={18}/>{busy==="import"?"Reading repository…":"Import & analyze"}</button>
          </form> : <div className="upload-box"><FileArchive size={28}/><label htmlFor="source-file">Source code or ZIP archive<input id="source-file" type="file" disabled={!!busy} accept=".zip,.txt,.md,.py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.h,.cs,.go,.rs,.php,.rb,.swift,.kt,.dart,.html,.css,.json,.yaml,.yml,.toml,.xml,.sql,.ipynb,.r" onChange={e=>choose(e.target.files?.[0],"source")}/></label><p>Up to 1 MB. ZIP: at most 500 files and 8 MB expanded. Exclude dependencies, generated files, and credentials.</p>{storedSource&&!removeSource&&!source&&<p>Saved source: <strong>{storedSource.name}</strong></p>}<button type="button" className="button" disabled={!!busy||!source} onClick={()=>void importUpload()}>{busy==="files"?"Reading files…":"Import & analyze files"}<Sparkles size={18}/></button></div>}
          <small>Source files are never executed. Identical uploads/repository revisions are blocked when saving. Similar projects are reviewed rather than automatically rejected.</small>
          <ErrorBox message={error}/>
        </section>
        <div className="editor-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2><FileCheck2 size={19}/> Review project details</h2>
              <span className="muted">* Required fields</span>
            </div>
            <p className="muted">Filled automatically after import. You can correct the text or enter details manually.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action("pending");
              }}
            >
              <fieldset disabled={!!busy}>
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
              <section className="version-fields">
                <label className="checkbox-field"><input type="checkbox" checked={advanced} onChange={e=>{setAdvanced(e.target.checked);if(!e.target.checked)setForm(x=>({...x,baseProjectId:"",improvements:""}));}}/>This is an advanced version of an existing project</label>
                {advanced&&<><label>Original approved project link or ID<input required value={form.baseProjectId??""} onChange={e=>change("baseProjectId",e.target.value.trim().split("/").filter(Boolean).pop()??"")} placeholder="Paste the original project's link or ID"/></label><label>What is improved? *<textarea required minLength={40} maxLength={3000} value={form.improvements??""} onChange={e=>change("improvements",e.target.value)} placeholder="Explain the new model, capabilities, or evaluation improvements. Both versions will remain separate."/></label></>}
              </section>
              <section className="upload-box presentation-upload"><Presentation size={24}/><label htmlFor="presentation-file">PowerPoint presentation (optional)<input id="presentation-file" type="file" accept=".ppt,.pptx" onChange={e=>choose(e.target.files?.[0],"presentation")}/></label><p>Up to 1 MB. PPTX slide text is included in classification when you save. PPT files can be downloaded for review.</p>{storedPresentation&&!removePresentation&&!presentation&&<p>Saved presentation: <strong>{storedPresentation.name}</strong></p>}{(presentation||storedPresentation&&!removePresentation)&&<button type="button" className="text-link" onClick={()=>{setPresentation(null);setRemovePresentation(true);}}>Remove presentation</button>}</section>
              <div className="form-section-title">
                <Link2 size={17} />
                <h3>Bring your work to life</h3>
              </div>
              {(
                [
                  [
                    "presentationUrl",
                    "Presentation / document link (optional)",
                    "https://drive.google.com/…",
                  ],
                  ["demoUrl", "Project video", "https://youtube.com/watch?v=…"],
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
                Links are optional. Uploaded files are saved with the project only after duplicate checks pass.
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
              </fieldset>
            </form>
          </section>
          <aside>
            <div className="ai-card">
              <div className="ai-icon">
                <Sparkles />
              </div>
              <div className="eyebrow">
                AUTOMATED PROJECT ANALYSIS
              </div>
              <h2>
                Your project, organized.
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
              <small>Edited the details? Analyze again to refresh tags and matches.</small>
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
        </>
      )}
    </Workspace>
  );
}
