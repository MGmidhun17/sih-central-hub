"use client";
import { useEffect, useState, useEffectEvent } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowDown,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/provider";
import {
  PageTitle,
  ProjectCard,
  Loading,
  ErrorBox,
  Empty,
} from "@/components/ui";
import { DOMAINS, allTechnologies } from "@/lib/taxonomy";
import type { Project } from "@/lib/types";
import { firebaseConfigured } from "@/lib/firebase/client";
export default function Projects() {
  const { api, demo } = useApp();
  const [items, setItems] = useState<Project[]>([]),
    [query, setQuery] = useState(""),
    [domain, setDomain] = useState(""),
    [tech, setTech] = useState(""),
    [sort, setSort] = useState("newest"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [cursor, setCursor] = useState<string | null>(null);
  async function load(more = false) {
    setLoading(true);
    try {
      const data = (await api(
        `projects${more && cursor ? `?cursor=${cursor}` : ""}`,
      )) as { items: Project[]; nextCursor: string | null };
      setItems((old) => (more ? [...old, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const onMount = useEffectEvent(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    setDomain(new URLSearchParams(window.location.search).get("domain") ?? "");
    void load();
  });
  useEffect(() => {
    queueMicrotask(() => onMount());
  }, [demo]);
  const filtered = items
    .filter(
      (p) =>
        (!domain || p.sihDomain === domain) &&
        (!tech || p.techStack.includes(tech)) &&
        `${p.title} ${p.abstract} ${p.techStack.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b.createdAt.localeCompare(a.createdAt),
    );
  return (
    <main className="container section">
      <PageTitle
        eyebrow="THE SHARED KNOWLEDGE SPACE"
        title="Find your next spark."
        description="Explore ideas, discover technologies, and build on what came before."
      >
        <Link className="button" href="/projects/new">
          Share a project <ArrowUpRight size={17} />
        </Link>
      </PageTitle>
      {!firebaseConfigured && !demo && (
        <div className="info">
          Sample repository preview. Configure Firebase to load real projects,
          or enter a demo workspace to try the workflow.
        </div>
      )}
      <div className="filter-panel">
        <div className="search-field">
          <Search size={20} />
          <input
            aria-label="Search repository"
            placeholder="Search by project, idea or technology…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-row">
          <span>
            <SlidersHorizontal size={16} /> Filter by
          </span>
          <select
            aria-label="Domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="">All domains</option>
            {DOMAINS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Technology"
            value={tech}
            onChange={(e) => setTech(e.target.value)}
          >
            <option value="">All technologies</option>
            {allTechnologies.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button
            className="text-link"
            onClick={() => {
              setDomain("");
              setTech("");
              setQuery("");
            }}
          >
            Reset
          </button>
          <select
            className="sort-select"
            aria-label="Sort projects"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>
      <div className="results-header">
        <span>
          <strong>{filtered.length}</strong>{" "}
          {cursor ? "matches in loaded projects" : "projects to discover"}
        </span>
        <span>
          <span className="live-dot" /> Teacher-approved collection
        </span>
      </div>
      <ErrorBox message={error} />
      {loading && items.length === 0 ? (
        <Loading />
      ) : filtered.length ? (
        <div className="project-grid">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="No projects match just yet"
          text="Try a different keyword or reset your filters."
        />
      )}
      {cursor && (
        <div className="center">
          <button
            className="button secondary"
            disabled={loading}
            onClick={() => void load(true)}
          >
            Load more projects <ArrowDown size={17} />
          </button>
          <small className="muted">
            Search and filters apply to loaded projects. Load more to expand
            your search.
          </small>
        </div>
      )}
    </main>
  );
}
