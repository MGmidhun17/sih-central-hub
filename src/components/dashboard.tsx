"use client";
import Link from "next/link";
import { useEffect, useState, useEffectEvent } from "react";
import { Plus, ArrowUpRight, Search, Trash2, PenLine, Sparkles, CheckCircle2, BookOpen, RefreshCw } from "lucide-react";
import { useApp } from "./provider";
import {
  Workspace,
  PageTitle,
  StatCards,
  Badge,
  Tags,
  Loading,
  ErrorBox,
  Empty,
  date,
} from "./ui";
import { canEditProject } from "@/lib/policy";
import type { Project, Review } from "@/lib/types";
export function Dashboard({
  teacher = false,
  history = false,
}: {
  teacher?: boolean;
  history?: boolean;
}) {
  const { api, profile, toast } = useApp();
  const [projects, setProjects] = useState<Project[]>([]),
    [reviews, setReviews] = useState<Review[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [deleting, setDeleting] = useState<Project | null>(null),
    [busy, setBusy] = useState(false);
  async function load(more = false) {
    setError("");
    setLoading(true);
    try {
      const base = teacher ? "projects?queue=1" : "projects?mine=1";
      const data = (await api(
        `${base}${more && cursor ? `&cursor=${cursor}` : ""}`,
      )) as { items: Project[]; nextCursor: string | null };
      setProjects((old) => (more ? [...old, ...data.items] : data.items));
      setCursor(data.nextCursor);
      if (teacher) setReviews((await api("reviews")) as Review[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const initialLoad = useEffectEvent(() => {
    if (profile && (!teacher || profile.approved)) void load();
  });
  useEffect(() => {
    queueMicrotask(() => initialLoad());
    const onFocus = () => initialLoad();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [profile?.uid, profile?.approved, teacher, history]);
  async function remove() {
    setBusy(true);
    try {
      await api(`projects/${deleting!.id}`, { method: "DELETE" });
      setProjects((old) => old.filter((p) => p.id !== deleting!.id));
      setDeleting(null);
      toast("Draft deleted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) &&
      (!status || p.status === status),
  );
  return (
    <Workspace role={teacher ? "teacher" : "student"}>
      <PageTitle
        eyebrow={
          teacher ? "GUIDE THE NEXT GENERATION" : "YOUR IDEAS, MOVING FORWARD"
        }
        title={
          history
            ? "Your review history"
            : teacher
              ? "Teacher overview"
              : "Your project workspace"
        }
        description={
          teacher
            ? "Review student ideas, share useful feedback, and recognize great work."
            : "Manage your submissions and turn your work into shared knowledge."
        }
      >
        {teacher && <button className="button secondary" disabled={loading} onClick={() => void load()}><RefreshCw size={16}/> Refresh</button>}
        {!teacher && (
          <Link className="button" href="/projects/new">
            <Plus size={18} />
            New project
          </Link>
        )}
      </PageTitle>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <StatCards
            items={
              teacher
                ? [
                    { label: "Awaiting review", value: projects.length },
                    { label: "Your reviews", value: reviews.length },
                    {
                      label: "Approved by you",
                      value: reviews.filter((r) => r.decision === "approved")
                        .length,
                    },
                    {
                      label: "Changes requested",
                      value: reviews.filter(
                        (r) => r.decision === "changes_requested",
                      ).length,
                    },
                  ]
                : [
                    { label: "Your projects", value: projects.length },
                    {
                      label: "Approved",
                      value: projects.filter((p) => p.status === "approved")
                        .length,
                    },
                    {
                      label: "In review",
                      value: projects.filter((p) => p.status === "pending")
                        .length,
                    },
                    {
                      label: "Needs attention",
                      value: projects.filter((p) =>
                        ["changes_requested", "rejected"].includes(p.status),
                      ).length,
                    },
                  ]
            }
          />
          {!history && <section className="workspace-guide">
            <div className="guide-copy"><span className="guide-icon">{teacher ? <BookOpen size={24}/> : <Sparkles size={24}/>}</span><div><span className="eyebrow">{teacher ? "YOUR NEXT STEP" : "GITHUB TO PROJECT PROFILE"}</span><h2>{teacher ? projects.length ? "New ideas are ready for your feedback" : "You’re up to date" : "One repository. A world of possibilities."}</h2><p>{teacher ? projects.length ? "Open a submission below to inspect its source, technology tags, and SIH classification." : "There are no submissions waiting for review. Your completed reviews are saved in My reviews." : "Paste your GitHub link to organize your project, discover its technology stack, and submit it for review."}</p></div></div>
            <Link className="button" href={teacher ? "/dashboard/teacher/reviews" : "/projects/new"}>{teacher ? "My reviews" : "Import repository"}<ArrowUpRight size={17}/></Link>
          </section>}
          {cursor && (
            <p className="muted">
              Counts reflect loaded projects. Load more below to include
              additional records.
            </p>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2>
                {history
                  ? "Your review history"
                  : teacher
                    ? "Student submissions awaiting review"
                    : "Your project collection"}
              </h2>
              <span className="badge">
                {history ? reviews.length : projects.length} records
              </span>
            </div>
            {history ? (
              reviews.length ? (
                <div>
                  {reviews.map((r) => (
                    <div className="review-item" key={r.id}>
                      <div>
                        <Link
                          href={`/dashboard/teacher/projects/${r.projectId}`}
                        >
                          Open reviewed project <ArrowUpRight size={14} />
                        </Link>
                        <Badge status={r.decision} />
                      </div>
                      <p>{r.comments}</p>
                      <small>{date(r.createdAt)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Your first review is ahead"
                  text="Visit the review queue to help a student improve their work."
                />
              )
            ) : (
              <>
                <div className="table-filters">
                  <div className="search-field">
                    <Search size={17} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Search your projects"
                      placeholder="Find a project…"
                    />
                  </div>
                  {!teacher && (
                    <select
                      aria-label="Project status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">All statuses</option>
                      {[
                        "draft",
                        "pending",
                        "approved",
                        "changes_requested",
                        "rejected",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {filtered.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Project</th>
                          {teacher && <th>Student</th>}
                          <th>Status</th>
                          <th>Last updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <Link
                                className="table-title"
                                href={
                                  teacher
                                    ? `/dashboard/teacher/projects/${p.id}`
                                    : `/projects/${p.id}`
                                }
                              >
                                {p.title}
                              </Link>
                              <small className="table-subtitle">
                                {p.sihDomain || "Domain not classified"}
                              </small>
                              <Tags tags={p.techStack.slice(0, 3)} />
                            </td>
                            {teacher && <td>{p.studentName}</td>}
                            <td>
                              <Badge status={p.status} />
                            </td>
                            <td className="nowrap">{date(p.updatedAt)}</td>
                            <td>
                              <div className="row-actions">
                                <Link
                                  className="button small secondary"
                                  href={
                                    teacher
                                      ? `/dashboard/teacher/projects/${p.id}`
                                      : `/projects/${p.id}`
                                  }
                                >
                                  {teacher ? "Review" : "View"}
                                  <ArrowUpRight size={14} />
                                </Link>
                                {!teacher &&
                                  profile &&
                                  canEditProject(p, profile) && (
                                    <Link
                                      aria-label={`Edit ${p.title}`}
                                      className="icon-button"
                                      href={`/projects/${p.id}/edit`}
                                    >
                                      <PenLine size={16} />
                                    </Link>
                                  )}
                                {!teacher && p.status === "draft" && (
                                  <button
                                    aria-label={`Delete ${p.title}`}
                                    className="icon-button danger"
                                    onClick={() => setDeleting(p)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="queue-empty">
                    <span className="queue-empty-icon"><CheckCircle2 size={28}/></span>
                    <h3>{query || status ? "No matching projects" : teacher ? "Your review queue is clear" : "Your first project starts here"}</h3>
                    <p>{query || status ? "Change your search or status filter to see more results." : teacher ? "New student submissions will appear here. Approved projects are available in the repository." : "Import a GitHub repository, check the details, and submit it for teacher review."}</p>
                    <Link className="button secondary" href={teacher ? "/projects" : "/projects/new"}>{teacher ? "Explore approved projects" : "Submit a project"}<ArrowUpRight size={16}/></Link>
                  </div>
                )}{" "}
                {cursor && (
                  <button
                    className="button secondary"
                    onClick={() => void load(true)}
                  >
                    Load more projects
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}
      {deleting && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-draft"
          >
            <h2 id="delete-draft">Delete this draft?</h2>
            <p>“{deleting.title}” will be permanently removed.</p>
            <div className="form-actions">
              <button
                autoFocus
                className="button secondary"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button
                className="button destructive"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "Deleting…" : "Delete draft"}
              </button>
            </div>
          </section>
        </div>
      )}
    </Workspace>
  );
}
