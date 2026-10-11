"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Search,
  GitBranch,
  CheckCircle2,
  Layers,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useEffectEvent } from "react";
import { useApp } from "@/components/provider";
import { ProjectCard } from "@/components/ui";
import { demoProjects } from "@/lib/demo";
import { firebaseConfigured } from "@/lib/firebase/client";
import type { Project, Role } from "@/lib/types";
export default function Home() {
  const { enterDemo, api } = useApp(),
    router = useRouter();
  const [projects, setProjects] = useState<Project[]>(
    demoProjects.filter((p) => p.status === "approved").slice(0, 3),
  );
  const [query, setQuery] = useState("");
  const loadHome = useEffectEvent(() => {
    if (firebaseConfigured)
      api("projects")
        .then((x) => setProjects((x as { items: Project[] }).items.slice(0, 3)))
        .catch(() => setProjects([]));
  });
  useEffect(() => {
    loadHome();
  }, []);
  const demo = (r: Role) => {
    enterDemo(r);
    router.push(`/dashboard/${r}`);
  };
  return (
    <main>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> A HOME FOR STUDENT INNOVATION
          </div>
          <h1>
            Great ideas.
            <br />
            Shared knowledge.
            <br />
            <em>Limitless possibility.</em>
          </h1>
          <p>
            Discover what students are building. Share your breakthrough. Turn
            yesterday’s inspiration into tomorrow’s innovation.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/projects">
              Explore projects <ArrowUpRight size={18} />
            </Link>
            <Link className="button secondary" href="/projects/new">
              Share your project <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span className="mini-avatars">
              <i>M</i>
              <i>A</i>
              <i>P</i>
            </span>
            <span>
              Built for curious minds.
              <br />
              <strong>Designed for the next big idea.</strong>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-grid" />
          <div className="floating-label">
            <span className="live-dot" /> YOUR NEXT IDEA STARTS HERE
          </div>
          <div className="visual-window">
            <div className="window-top">
              <span />
              <span />
              <span />
              <small>innovation.workspace</small>
              <Layers size={13} />
            </div>
            <div className="visual-card-head">
              <div className="visual-icon">
                <BookOpen />
              </div>
              <span>
                THE PROJECT SPOTLIGHT
                <small>From a student idea to real-world impact</small>
              </span>
              <ArrowUpRight />
            </div>
            <div className="visual-cover">
              <div className="network-circle c1" />
              <div className="network-circle c2" />
              <div className="network-circle c3" />
              <GitBranch size={80} />
              <div className="cover-label">
                CONNECT THE DOTS.
                <br />
                <strong>BUILD WHAT’S NEXT.</strong>
              </div>
            </div>
            <div className="visual-bottom">
              <strong>Intelligence meets innovation.</strong>
              <p>A smarter way to discover student projects.</p>
              <div className="tags">
                <span>Next.js</span>
                <span>Firebase</span>
                <span>Gemini</span>
              </div>
            </div>
          </div>
          <div className="float-card ai-float">
            <span>
              <Sparkles size={19} />
            </span>
            <div>
              <strong>Automatically organized</strong>
              <small>Technology tags, thoughtfully connected</small>
            </div>
            <CheckCircle2 size={18} />
          </div>
          <div className="float-card review-float">
            <span>
              <CheckCircle2 size={18} />
            </span>
            <div>
              <strong>Reviewed by educators</strong>
              <small>Knowledge worth sharing</small>
            </div>
          </div>
          <div className="visual-caption">IDEAS → CONNECTIONS → IMPACT</div>
        </div>
      </section>
      <section className="value-strip">
        <div className="container">
          <span>
            <Layers />
            One shared repository
          </span>
          <span>
            <Sparkles />
            Intelligent technology tagging
          </span>
          <span>
            <CheckCircle2 />
            Teacher-reviewed projects
          </span>
          <span>
            <GitBranch />
            Aligned to SIH domains
          </span>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE DISCOVERY BOARD</div>
            <h2>Small beginnings. Big potential.</h2>
            <p>
              {firebaseConfigured
                ? "Explore approved projects from the community."
                : "A glimpse of what your repository can hold. Sample projects shown below."}
            </p>
          </div>
          <Link className="text-link" href="/projects">
            View all projects <ArrowRight size={17} />
          </Link>
        </div>
        <form
          className="home-search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/projects?q=${encodeURIComponent(query)}`);
          }}
        >
          <Search size={19} />
          <input
            aria-label="Search projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What sparks your curiosity? Search projects, ideas, technologies…"
          />
          <button className="button small">
            Find inspiration <ArrowRight size={16} />
          </button>
        </form>
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>
      <section className="how-section" id="how-it-works">
        <div className="container section">
          <div className="eyebrow">FROM IDEA TO IMPACT</div>
          <h2>Your work deserves more than a folder.</h2>
          <div className="steps">
            {[
              [
                "01",
                "Share your story",
                "Add your project, methodology and resource links.",
              ],
              [
                "02",
                "Connect the knowledge",
                "Identify technologies, suggest a domain and discover related work.",
              ],
              [
                "03",
                "Grow through feedback",
                "Get a teacher’s review and make your work discoverable.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container demo-cta section">
        <div>
          <div className="eyebrow">TAKE A LOOK AROUND</div>
          <h2>Three perspectives. One community.</h2>
          <p>Try the complete workflow with sample data. No account needed.</p>
        </div>
        <div className="demo-buttons">
          {(["student", "teacher", "admin"] as Role[]).map((r) => (
            <button
              className="button secondary"
              key={r}
              onClick={() => demo(r)}
            >
              {r} demo <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
