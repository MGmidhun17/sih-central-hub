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
  BarChart3,
  Search, ClipboardList, Activity,
  Dumbbell, Landmark, Car, Truck, Bot, MapPin, Zap, Siren, Gamepad2, Rocket,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useApp } from "./provider";
import type { Project, Role } from "@/lib/types";
export const domainIcons = [Radio, Dumbbell, Landmark, HeartPulse, Leaf, Car, Truck, Bot, Trees, MapPin, Zap, Shield, GraduationCap, Siren, Gamepad2, Lightbulb, Rocket];
export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="HackRepo home">
      <span className="logo-mark">
        <BookOpen size={19} />
      </span>
      Hack<span>Repo</span>
      <small>STUDENT INNOVATION HUB</small>
    </Link>
  );
}
export function Header() {
  const { profile, logout } = useApp();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const inWorkspace = path.startsWith("/dashboard") || path === "/projects/new" || path.endsWith("/edit");
  if (inWorkspace && profile && !(profile.role === "teacher" && !profile.approved)) return (
    <header className="workspace-topbar">
      <div className="workspace-breadcrumb"><span>Workspace</span><span>/</span><strong>{profile.role === "teacher" ? "Teaching" : profile.role === "admin" ? "Administration" : "My projects"}</strong></div>
      <form action="/projects" className="workspace-search"><Search size={18}/><input name="q" aria-label="Search approved projects" placeholder="Search the repository…"/></form>
      <div className="workspace-account"><span className="avatar">{profile.name.charAt(0).toUpperCase()}</span><div><strong>{profile.name}</strong><small>{profile.role}</small></div><button className="icon-button" onClick={() => void logout()} aria-label="Sign out"><LogOut size={18}/></button></div>
    </header>
  );
  return (
    <>
      <header className="header">
        <div className="container nav">
          <Logo />
          <nav
            className={open ? "nav-links open" : "nav-links"}
            id="main-navigation"
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
            <Link href="/analytics" onClick={() => setOpen(false)}>Analytics</Link>
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
                  Sign up <ArrowRight size={15} />
                </Link>
              </>
            )}
            <button
              className="icon-button mobile-menu"
              onClick={() => setOpen(!open)}
              onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="main-navigation"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  const path = usePathname();
  if (path.startsWith("/dashboard") || path === "/projects/new" || path.endsWith("/edit")) return null;
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
        : project.sihDomain.includes("HealthTech")
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
  const { profile, loading, refresh, toast } = useApp();
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
          <button className="button secondary" onClick={() => void refresh().catch(e => toast((e as Error).message))}>Check approval status</button>
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
          ["/analytics", "Analytics", BarChart3],
        ] as const)
      : role === "teacher"
        ? ([
            [base, "Review queue", LayoutDashboard],
            [`${base}/reviews`, "My reviews", CheckCircle2],
            ["/projects", "Repository", FolderOpen],
            ["/analytics", "Analytics", BarChart3],
          ] as const)
        : ([
            [base, "Overview & users", LayoutDashboard],
            ["/projects", "Repository", FolderOpen],
            ["/analytics", "Analytics", BarChart3],
            ["/domains", "Domain taxonomy", Users],
          ] as const);
  return (
    <div className="workspace">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="sidebar-brand"><Logo /></div>
        <div className="sidebar-label">{role === "teacher" ? "TEACHING WORKSPACE" : role === "admin" ? "ADMINISTRATION" : "YOUR WORKSPACE"}</div>
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            className={path === href ? "selected" : ""}
            aria-current={path === href ? "page" : undefined}
            href={href}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
        <div className="sidebar-tip">
          <Sparkles size={19} />
          <strong>{role === "teacher" ? "Make feedback count" : role === "admin" ? "A trusted community" : "From code to discovery"}</strong>
          <p>{role === "teacher" ? "Review the idea, inspect the source, and help students take their next step." : role === "admin" ? "Approve educators and keep your student repository organized." : "Import your repository. Get technology tags and an SIH domain suggestion."}</p>
          <Link href={role === "teacher" ? "/dashboard/teacher/reviews" : role === "admin" ? "/domains" : "/projects/new"}>{role === "teacher" ? "View your reviews" : role === "admin" ? "Explore domains" : "Start a submission"} <ArrowUpRight size={15}/></Link>
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
          <div className="stat-heading"><span>{x.label}</span><span className={`stat-symbol tone-${i % 4}`}>{i % 4 === 0 ? <ClipboardList size={20}/> : i % 4 === 1 ? <Activity size={20}/> : i % 4 === 2 ? <CheckCircle2 size={20}/> : <BarChart3 size={20}/>}</span></div>
          <strong>{x.value}</strong>
          {x.hint && <small>{x.hint}</small>}
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
