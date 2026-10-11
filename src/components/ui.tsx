"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  LayoutDashboard,
  FolderOpen,
  Plus,
  LogOut,
  ShieldCheck,
  BookOpen,
  Users,
  Sparkles,
  Menu,
  X,
  CheckCircle2,
  Leaf,
  GraduationCap,
  HeartPulse,
  Shield,
  Radio,
  Trees,
  Lightbulb,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useApp } from "./provider";
import type { Project, Role } from "@/lib/types";
export const domainIcons = [
  Radio,
  Leaf,
  Shield,
  HeartPulse,
  Trees,
  GraduationCap,
  Sparkles,
  Radio,
];
export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="HackRepo home">
      <span className="logo-mark">
        <BookOpen size={19} />
      </span>
      Hack<span>Repo</span>
      <small>PROJECT LIBRARY</small>
    </Link>
  );
}
export function Header() {
  const { profile, demo, logout, leaveDemo } = useApp();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <>
      <header className="header">
        <div className="container nav">
          <Logo />
          <nav
            className={open ? "nav-links open" : "nav-links"}
            aria-label="Main navigation"
          >
            <Link
              className={path === "/projects" ? "active" : ""}
              href="/projects"
              onClick={() => setOpen(false)}
            >
              Explore projects
            </Link>
            <Link
              className={path === "/domains" ? "active" : ""}
              href="/domains"
              onClick={() => setOpen(false)}
            >
              SIH domains
            </Link>
            <Link href="/#how-it-works" onClick={() => setOpen(false)}>
              How it works
            </Link>
          </nav>
          <div className="nav-actions">
            {profile ? (
              <>
                <Link
                  className="button small"
                  href={`/dashboard/${profile.role}`}
                >
                  Workspace <ArrowUpRight size={15} />
                </Link>
                <button
                  className="icon-button"
                  onClick={() => void logout()}
                  aria-label="Sign out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link className="login-link" href="/login">
                  Log in
                </Link>
                <Link className="button small" href="/register">
                  Get started <ArrowRight size={15} />
                </Link>
              </>
            )}
            <button
              className="icon-button mobile-menu"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {demo && (
        <div className="demo-banner">
          <span>
            <strong>Demo workspace</strong> · Sample data saved only in this
            browser · {profile?.role} view
          </span>
          <button onClick={leaveDemo}>Exit demo ↗</button>
        </div>
      )}
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer container">
      <Logo />
      <p>Good ideas deserve to be found.</p>
      <span>Student innovation, connected.</span>
    </footer>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge status-${status}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="tags">
      {tags.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  );
}
export function ProjectArt({
  project,
  large = false,
}: {
  project: Pick<Project, "sihDomain" | "title">;
  large?: boolean;
}) {
  const theme = project.sihDomain.includes("Green")
    ? "green"
    : project.sihDomain.includes("Agriculture")
      ? "olive"
      : project.sihDomain.includes("Education")
        ? "purple"
        : project.sihDomain.includes("Healthcare")
          ? "rose"
          : "blue";
  return (
    <div
      className={`project-art art-${theme} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <div className="art-grid" />
      <div className="art-orbit orbit-a" />
      <div className="art-orbit orbit-b" />
      <div className="art-core">
        {theme === "green" ? (
          <Trees />
        ) : theme === "olive" ? (
          <Leaf />
        ) : theme === "purple" ? (
          <GraduationCap />
        ) : theme === "rose" ? (
          <HeartPulse />
        ) : (
          <ShieldCheck />
        )}
      </div>
      <span className="art-chip chip-a">
        <span /> LIVE CONCEPT
      </span>
      <span className="art-chip chip-b">
        {theme === "purple"
          ? "LEARN. BUILD. GROW."
          : theme === "green"
            ? "A BETTER TOMORROW"
            : "BUILT WITH PURPOSE"}
      </span>
    </div>
  );
}
export function ProjectCard({ project: p }: { project: Project }) {
  return (
    <article className="project-card">
      <Link href={`/projects/${p.id}`} className="art-link" tabIndex={-1}>
        <ProjectArt project={p} />
      </Link>
      <div className="card-body">
        <div className="card-kicker">
          {p.sihDomain.split(" & ")[0] || "Student innovation"}
          <ArrowUpRight size={16} />
        </div>
        <h3>
          <Link href={`/projects/${p.id}`}>{p.title}</Link>
        </h3>
        <p>{p.abstract}</p>
        <Tags tags={p.techStack.slice(0, 3)} />
        <div className="card-footer">
          <span className="avatar tiny">{p.studentName[0]}</span>
          <span>{p.studentName}</span>
          <Badge status={p.status} />
        </div>
      </div>
    </article>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "Your next great idea can start here.",
  children,
}: {
  title?: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Lightbulb size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> Loading your workspace…
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Workspace({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { profile, loading } = useApp();
  const path = usePathname(),
    router = useRouter();
  useEffect(() => {
    if (!loading && !profile) router.replace("/login");
    else if (profile && profile.role !== role)
      router.replace(`/dashboard/${profile.role}`);
  }, [loading, profile, role, router]);
  if (loading || !profile || profile.role !== role) return <Loading />;
  if (role === "teacher" && !profile.approved)
    return (
      <main className="container narrow">
        <Empty
          title={
            profile.rejected
              ? "Teacher request not approved"
              : "Your teaching workspace is almost ready"
          }
          text={
            profile.rejected
              ? "Contact the project owner to discuss your registration."
              : "The project owner needs to approve your teacher account before you can review submissions."
          }
        >
          <ShieldCheck size={36} />
        </Empty>
      </main>
    );
  const base = `/dashboard/${role}`;
  const links =
    role === "student"
      ? ([
          [base, "Overview", LayoutDashboard],
          ["/projects/new", "Submit project", Plus],
          ["/projects", "Explore projects", FolderOpen],
        ] as const)
      : role === "teacher"
        ? ([
            [base, "Review queue", LayoutDashboard],
            [`${base}/reviews`, "My reviews", CheckCircle2],
            ["/projects", "Repository", FolderOpen],
          ] as const)
        : ([
            [base, "Overview & users", LayoutDashboard],
            ["/projects", "Repository", FolderOpen],
            ["/domains", "Domain taxonomy", Users],
          ] as const);
  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-label">{role} WORKSPACE</div>
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            className={path === href ? "selected" : ""}
            href={href}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
        <div className="sidebar-tip">
          <Sparkles size={19} />
          <strong>Ideas with a future.</strong>
          <p>Discover, build and share work that makes a difference.</p>
        </div>
        <div className="sidebar-profile">
          <span className="avatar">{profile.name[0]}</span>
          <div>
            <strong>{profile.name}</strong>
            <small>{role}</small>
          </div>
        </div>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
export function StatCards({
  items,
}: {
  items: { label: string; value: number | string; hint?: string }[];
}) {
  return (
    <div className="stats-grid">
      {items.map((x, i) => (
        <div className="stat-card" key={x.label}>
          <span>{x.label}</span>
          <strong>{x.value}</strong>
          <small>
            {x.hint ??
              [
                "Your innovation journey",
                "Ready for discovery",
                "Moving ideas forward",
                "Keep building",
              ][i % 4]}
          </small>
        </div>
      ))}
    </div>
  );
}
export const date = (s: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(s));
