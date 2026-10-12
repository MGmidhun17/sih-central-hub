"use client";
import Link from "next/link";
import { useEffect, useState, useEffectEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  GitBranch,
  FileText,
  Play,
  Clock,
  User,
  CheckCircle2,
  PenLine,
} from "lucide-react";
import { useApp } from "./provider";
import {
  ProjectArt,
  Badge,
  Tags,
  Loading,
  ErrorBox,
  date,
  Workspace,
} from "./ui";
import { AnalysisPanel } from "./project-editor";
import { canEditProject } from "@/lib/policy";
import type { Project, Review } from "@/lib/types";
export function ProjectDetail({
  id,
  review = false,
}: {
  id: string;
  review?: boolean;
}) {
  const { api, profile, toast, download, loading: sessionLoading } = useApp();
  const [project, setProject] = useState<Project | null>(null),
    [reviews, setReviews] = useState<Review[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [comments, setComments] = useState(""),
    [decision, setDecision] = useState<Review["decision"]>("approved");
  const [versions,setVersions]=useState<{id:string;title:string;status:string;improvements:string}[]>([]);
  const [downloading,setDownloading]=useState("");
  async function getFile(kind:"source"|"presentation",name:string){setDownloading(kind);setError("");try{await download(`projects/${id}/files/${kind}`,name);}catch(e){setError((e as Error).message);}finally{setDownloading("");}}

  async function load() {
    setError("");
    try {
      const result = (await api(`projects/${id}`)) as {
        project: Project;
        reviews: Review[];
      };
      setProject(result.project);
      setReviews(result.reviews);
      const related=await api(`projects/${id}/versions`) as typeof versions;setVersions(related);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const initialLoad = useEffectEvent(() => {
    void load();
  });
  useEffect(() => {
    if (!sessionLoading) queueMicrotask(() => initialLoad());
  }, [id, profile?.uid, profile?.approved, sessionLoading]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`projects/${id}/review`, {
        method: "POST",
        body: { decision, comments, revision: project!.revision },
      });
      toast("Review recorded. The student can now see your feedback.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const content = (
    <>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : project ? (
        <>
          <Link
            className="back-link"
            href={review ? "/dashboard/teacher" : "/projects"}
          >
            <ArrowLeft size={16} />
            {review ? "Back to review queue" : "Back to discovery"}
          </Link>
          <div className="detail-title">
            <div className="eyebrow">
              {project.sihDomain || "STUDENT INNOVATION"}
            </div>
            <h1>{project.title}</h1>
            <div className="detail-meta">
              <span>
                <User size={15} />
                {project.studentName}
              </span>
              <span>{project.institution}</span>
              <span>
                <Clock size={15} />
                {date(project.createdAt)}
              </span>
              <Badge status={project.status} />
            </div>
          </div>
          {project.baseProjectId&&<section className="version-banner panel"><span className="badge">Advanced version</span><h2>Builds on <Link href={`/projects/${project.baseProjectId}`}>{project.baseProjectTitle??"the original project"}</Link></h2><p className="preserve-lines">{project.improvements}</p><small>The original and advanced version are separate records. Improvements are reviewed by a teacher.</small></section>}
          {(project.sourceFile||project.presentationFile)&&<section className="panel attachments-panel"><h2>Project files</h2><div className="attachment-grid">{(["source","presentation"] as const).map(kind=>{const file=kind==="source"?project.sourceFile:project.presentationFile;return file?<div className="attachment-card" key={kind}><FileText size={22}/><div><strong>{file.name}</strong><small>{kind==="source"?"Source code":"Presentation"} · {Math.ceil(file.size/1024)} KB</small></div><button className="button secondary" disabled={!!downloading} onClick={()=>void getFile(kind,file.name)}>{downloading===kind?"Downloading…":"Download"}</button></div>:null;})}</div>{project.presentationFile?.text&&<details className="slide-preview"><summary>Read presentation slide text</summary><p className="preserve-lines">{project.presentationFile.text}</p></details>}</section>}
          {versions.length>0&&<section className="panel"><h2>Advanced versions</h2>{versions.map(v=><div className="version-row" key={v.id}><Link href={`/projects/${v.id}`}>{v.title}<ArrowUpRight size={16}/></Link><Badge status={v.status}/><p>{v.improvements}</p></div>)}</section>}
          <div className="detail-grid">
            <div>
              <ProjectArt project={project} large />
              <section className="panel detail-description">
                <h2>The idea</h2>
                <p className="lead">{project.abstract}</p>
                <h3>How it works</h3>
                <p className="preserve-lines">
                  {project.description ||
                    "No detailed methodology has been added yet."}
                </p>
              </section>
              {project.analysis && (
                <AnalysisPanel analysis={project.analysis} />
              )}{" "}
              {reviews.length > 0 && (
                <section className="panel">
                  <h2>Review history</h2>
                  {reviews
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((r) => (
                      <div className="review-item" key={r.id}>
                        <div>
                          <strong>{r.teacherName}</strong>
                          <Badge status={r.decision} />
                        </div>
                        <p className="preserve-lines">{r.comments}</p>
                        <small>{date(r.createdAt)}</small>
                      </div>
                    ))}
                </section>
              )}
            </div>
            <aside>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Under the hood</h3>
                  <GitBranch size={18} />
                </div>
                {Object.entries(project.techCategories).map(([c, t]) => (
                  <div className="taxonomy-row" key={c}>
                    <small>{c}</small>
                    <Tags tags={t} />
                  </div>
                ))}
                {!project.techStack.length && (
                  <p className="muted">No technology tags identified yet.</p>
                )}
                <hr />
                <h4>Project resources</h4>
                {(
                  [
                    ["githubUrl", "Source code", GitBranch],
                    ["presentationUrl", "Presentation", FileText],
                    ["demoUrl", "Watch project video", Play],
                  ] as const
                ).map(([key, label, Icon]) =>
                  project[key] ? (
                    <a
                      className="resource-link"
                      key={key}
                      href={project[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon size={17} />
                      {label}
                      <ArrowUpRight size={16} />
                    </a>
                  ) : (
                    <div className="resource-link disabled" key={key}>
                      <Icon size={17} />
                      {label}
                      <small>Not added</small>
                    </div>
                  ),
                )}
                {profile && canEditProject(project, profile) && (
                  <Link className="button full" href={`/projects/${id}/edit`}>
                    <PenLine size={16} />
                    Edit project
                  </Link>
                )}
              </section>
              {review && project.status === "pending" && (
                <section className="panel review-form">
                  <h3>
                    <CheckCircle2 size={20} /> Your perspective matters
                  </h3>
                  <p>
                    Review the work and give constructive, specific feedback.
                  </p>
                  <form onSubmit={submit}>
                    <label>
                      Decision
                      <select
                        value={decision}
                        onChange={(e) =>
                          setDecision(e.target.value as Review["decision"])
                        }
                      >
                        <option value="approved">
                          Approve for the repository
                        </option>
                        <option value="changes_requested">
                          Request changes
                        </option>
                        <option value="rejected">Reject submission</option>
                      </select>
                    </label>
                    <label>
                      Feedback *
                      <textarea
                        required
                        minLength={10}
                        maxLength={3000}
                        rows={5}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="What works well? What could improve?"
                      />
                    </label>
                    <button className="button full" disabled={busy}>
                      {busy ? "Recording review…" : "Submit review"}
                      <ArrowUpRight size={16} />
                    </button>
                  </form>
                </section>
              )}
              <div className="editor-tip">
                <CheckCircle2 size={20} />
                <p>
                  AI suggests. Educators decide.
                  <br />
                  Every published idea goes through teacher review.
                </p>
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </>
  );
  return review ? (
    <Workspace role="teacher">{content}</Workspace>
  ) : (
    <main className="container section">{content}</main>
  );
}
