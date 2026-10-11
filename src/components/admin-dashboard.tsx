"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useEffectEvent } from "react";
import { Search, Trash2, ArrowUpRight, Check, X, Users } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useApp } from "./provider";
import {
  Workspace,
  PageTitle,
  StatCards,
  Badge,
  ErrorBox,
  Loading,
  Empty,
  date,
} from "./ui";
import type { Profile, Project, Review, Stats } from "@/lib/types";
const colors = ["#91a9b2", "#e4b35b", "#c28461", "#438d77", "#cd7373"];
export function AdminDashboard() {
  const router = useRouter();
  const { api, profile, toast } = useApp();
  const [stats, setStats] = useState<Stats | null>(null),
    [users, setUsers] = useState<Profile[]>([]),
    [tab, setTab] = useState("student"),
    [query, setQuery] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [target, setTarget] = useState<Profile | null>(null),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false);
  async function load(more = false) {
    try {
      const [s, u] = (await Promise.all([
        api("admin/stats"),
        api(`admin/users${more && cursor ? `?cursor=${cursor}` : ""}`),
      ])) as [Stats, { items: Profile[]; nextCursor: string | null }];
      setStats(s);
      setUsers((old) => (more ? [...old, ...u.items] : u.items));
      setCursor(u.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const initialLoad = useEffectEvent(() => {
    if (profile?.role === "admin") void load();
  });
  useEffect(() => {
    queueMicrotask(() => initialLoad());
  }, [profile?.uid]);
  async function approve(uid: string, approved: boolean) {
    setBusy(true);
    setError("");
    try {
      await api(`admin/teachers/${uid}`, {
        method: "PATCH",
        body: { approved },
      });
      toast(approved ? "Teacher approved." : "Teacher request rejected.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`admin/users/${target!.uid}`, { method: "DELETE" });
      setTarget(null);
      setConfirmation("");
      toast("Account and related records deleted.");
      await load();
    } catch (e) {
      setError(
        `${(e as Error).message} If deletion partially completed, retry this same account to finish.`,
      );
      setTarget(null);
    } finally {
      setBusy(false);
    }
  }
  const filtered = users.filter(
    (u) =>
      u.role === tab &&
      `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Workspace role="admin">
      <PageTitle
        eyebrow="THE BIG PICTURE"
        title="A community worth building."
        description="Keep the repository healthy, support educators, and make room for new ideas."
      />
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : (
        stats && (
          <>
            <StatCards
              items={[
                { label: "Students", value: stats.students },
                { label: "Approved teachers", value: stats.teachers },
                { label: "Pending teachers", value: stats.pendingTeachers },
                { label: "Total projects", value: stats.projects },
                { label: "Reviews recorded", value: stats.reviews },
              ]}
            />
            <div className="admin-summary">
              <section className="panel">
                <div className="panel-heading">
                  <h2>The project journey</h2>
                  <span className="muted">By status</span>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(stats.statuses).map(
                        ([name, total]) => ({
                          name: name.replaceAll("_", " "),
                          total,
                        }),
                      )}
                      margin={{ top: 10, right: 15, left: -25, bottom: 15 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="total"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={44}
                      >
                        {Object.keys(stats.statuses).map((s, i) => (
                          <Cell key={s} fill={colors[i % colors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="admin-callout">
                <Users size={28} />
                <h2>
                  Great guidance
                  <br />
                  starts with access.
                </h2>
                <p>
                  {stats.pendingTeachers
                    ? `${stats.pendingTeachers} teacher account(s) are waiting for your approval.`
                    : "Your teaching community is up to date."}
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setTab("teacher");
                    document
                      .getElementById("user-management")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Manage teachers <ArrowUpRight size={16} />
                </button>
              </section>
            </div>
            <section className="panel" id="user-management">
              <div className="panel-heading">
                <h2>Your community</h2>
                <span className="badge">{users.length} loaded accounts</span>
              </div>
              <div className="table-filters">
                <div className="tabs">
                  <button
                    className={tab === "student" ? "selected" : ""}
                    onClick={() => setTab("student")}
                  >
                    Students
                  </button>
                  <button
                    className={tab === "teacher" ? "selected" : ""}
                    onClick={() => setTab("teacher")}
                  >
                    Teachers
                  </button>
                </div>
                <div className="search-field">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search users"
                    placeholder="Search name or email…"
                  />
                </div>
              </div>
              {filtered.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name & email</th>
                        <th>Role</th>
                        <th>Approval</th>
                        <th>Joined</th>
                        <th>{tab === "student" ? "Projects" : "Reviews"}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => (
                        <tr
                          key={u.uid}
                          className="clickable-row"
                          onClick={(event) => {
                            if (
                              !(event.target as HTMLElement).closest("a,button")
                            )
                              router.push(`/dashboard/admin/users/${u.uid}`);
                          }}
                        >
                          <td>
                            <Link
                              className="table-title"
                              href={`/dashboard/admin/users/${u.uid}`}
                            >
                              {u.name}
                            </Link>
                            <small className="table-subtitle">{u.email}</small>
                          </td>
                          <td>{u.role}</td>
                          <td>
                            <Badge
                              status={
                                u.deleting
                                  ? "deleting"
                                  : u.approved
                                    ? "approved"
                                    : u.rejected
                                      ? "rejected"
                                      : "pending"
                              }
                            />
                          </td>
                          <td className="nowrap">{date(u.createdAt)}</td>
                          <td>
                            {tab === "student" ? u.projectCount : u.reviewCount}
                          </td>
                          <td>
                            <div className="row-actions">
                              <Link
                                aria-label={`View ${u.name}`}
                                className="icon-button"
                                href={`/dashboard/admin/users/${u.uid}`}
                              >
                                <ArrowUpRight size={17} />
                              </Link>
                              {u.role === "teacher" &&
                                !u.approved &&
                                !u.deleting && (
                                  <>
                                    <button
                                      className="icon-button success"
                                      disabled={busy}
                                      aria-label={`Approve ${u.name}`}
                                      onClick={() => void approve(u.uid, true)}
                                    >
                                      <Check size={17} />
                                    </button>
                                    {!u.rejected && (
                                      <button
                                        className="icon-button danger"
                                        disabled={busy}
                                        aria-label={`Reject ${u.name}`}
                                        onClick={() =>
                                          void approve(u.uid, false)
                                        }
                                      >
                                        <X size={17} />
                                      </button>
                                    )}
                                  </>
                                )}
                              <button
                                className="icon-button danger"
                                aria-label={`Delete ${u.name}`}
                                onClick={() => {
                                  setTarget(u);
                                  setConfirmation("");
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="No matching accounts"
                  text="Try another search or check the other role tab."
                />
              )}
              {cursor && (
                <div className="center">
                  <button
                    className="button secondary"
                    onClick={() => void load(true)}
                  >
                    Load more users
                  </button>
                  <small>Search covers loaded accounts.</small>
                </div>
              )}
            </section>
          </>
        )
      )}
      {target && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account"
          >
            <h2 id="delete-account">Permanently delete {target.name}?</h2>
            <p>
              This removes the authentication account, profile, their projects,
              and associated reviews. This cannot be undone.
            </p>
            <label>
              Type DELETE to confirm
              <input
                autoFocus
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setTarget(null)}
              >
                Cancel
              </button>
              <button
                className="button destructive"
                disabled={busy || confirmation !== "DELETE"}
                onClick={() => void remove()}
              >
                {busy ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </section>
        </div>
      )}
    </Workspace>
  );
}
export function UserDetail({ uid }: { uid: string }) {
  const { api, profile } = useApp();
  const [data, setData] = useState<{
      user: Profile;
      projects: Project[];
      reviews: Review[];
    } | null>(null),
    [error, setError] = useState("");
  const fetchUser = useEffectEvent(() => {
    if (profile?.role === "admin")
      api(`admin/users/${uid}`)
        .then((x) => setData(x as typeof data))
        .catch((e) => setError(e.message));
  });
  useEffect(() => {
    fetchUser();
  }, [uid, profile?.uid]);
  return (
    <Workspace role="admin">
      <Link className="back-link" href="/dashboard/admin">
        ← Back to community
      </Link>
      <ErrorBox message={error} />
      {data ? (
        <>
          <PageTitle
            eyebrow={`${data.user.role.toUpperCase()} PROFILE`}
            title={data.user.name}
            description={data.user.email}
          />
          <section className="panel profile-details">
            <dl>
              <dt>Institution</dt>
              <dd>{data.user.institution}</dd>
              <dt>Joined</dt>
              <dd>{date(data.user.createdAt)}</dd>
              <dt>Account status</dt>
              <dd>
                <Badge status={data.user.approved ? "approved" : "pending"} />
              </dd>
              <dt>UID</dt>
              <dd>{data.user.uid}</dd>
            </dl>
          </section>
          <section className="panel">
            <h2>
              {data.user.role === "student"
                ? "Student projects"
                : "Teacher reviews"}
            </h2>
            {data.projects.map((p) => (
              <div className="review-item" key={p.id}>
                <Link href={`/projects/${p.id}`}>{p.title} ↗</Link>
                <Badge status={p.status} />
              </div>
            ))}
            {data.reviews.map((r) => (
              <div className="review-item" key={r.id}>
                <Link href={`/projects/${r.projectId}`}>Open project ↗</Link>
                <Badge status={r.decision} />
                <p>{r.comments}</p>
              </div>
            ))}
            {!data.projects.length && !data.reviews.length && (
              <Empty title="No activity yet" />
            )}
            <small className="muted">
              Up to 200 projects and 200 reviews are shown.
            </small>
          </section>
        </>
      ) : (
        !error && <Loading />
      )}
    </Workspace>
  );
}
