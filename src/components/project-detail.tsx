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
  const { api, profile, toast, demo } = useApp();
  const [project, setProject] = useState<Project | null>(null),
    [reviews, setReviews] = useState<Review[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [comments, setComments] = useState(""),
    [decision, setDecision] = useState<Review["decision"]>("approved");
  async function load() {
    try {
      const result = (await api(`projects/${id}`)) as {
        project: Project;
        reviews: Review[];
      };
      setProject(result.project);
      setReviews(result.reviews);
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
    queueMicrotask(() => initialLoad());
  }, [id, profile?.uid, demo]);
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
                    ["demoUrl", "Watch the demo", Play],
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
