"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, Search, Github, CheckCircle2, Layers, Code2, FolderGit2, Tags, GraduationCap, BarChart3, ScanSearch, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useEffectEvent } from "react";
import { useApp } from "@/components/provider";
import { ProjectCard, ErrorBox } from "@/components/ui";
import type { Project } from "@/lib/types";
import type { RepositoryAnalytics } from "@/lib/discovery";
export default function Home(){
  const {api,profile}=useApp(),router=useRouter();
  const [projects,setProjects]=useState<Project[]>([]),[stats,setStats]=useState<RepositoryAnalytics|null>(null),[query,setQuery]=useState(""),[error,setError]=useState("");
  const load=useEffectEvent(()=>{Promise.all([api("projects/search?sort=newest"),api("analytics")]).then(([p,s])=>{setProjects((p as {items:Project[]}).items.slice(0,6));setStats(s as RepositoryAnalytics);setError("");}).catch(()=>setError("The repository is temporarily unavailable. Please try again shortly."));});
  useEffect(()=>{if(profile)load();},[profile]);
  return <main>
    <section className="landing-hero"><div className="container hero">
      <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> CONNECTING STUDENT INNOVATION</div>
        <h1>Great ideas.<br/><em>Shared possibilities.</em></h1>
        <p>A centralized repository of student hackathon projects. Turn a GitHub repository or source upload into a project profile with automated technology tags and SIH domain alignment.</p>
        <div className="hero-actions"><Link className="button" href="/projects">Explore projects <ArrowRight size={17}/></Link><Link className="button secondary" href="/projects/new"><Github size={18}/> Submit project</Link></div>
        <div className="hero-trust"><CheckCircle2 size={16}/> Teacher-reviewed projects <span>•</span> Built for students</div>
      </div>
      <div className="hero-art" aria-label="Illustration of a GitHub repository becoming an organized project profile">
        <div className="art-glow"/><div className="art-orbitline"/>
        <div className="repo-window"><div className="repo-window-bar"><span/><span/><span/><small>github.com / your-next-idea</small><Github size={16}/></div>
          <div className="repo-window-body"><div className="repo-file-nav"><FolderGit2 size={28}/><span>README.md</span><span>package.json</span><span>src /</span></div><div className="repo-code"><small>YOUR REPOSITORY</small><h3>Ideas begin<br/>with a commit.</h3><div className="code-line w90"/><div className="code-line w65"/><div className="code-line w80"/><div className="code-line w55"/><div className="code-line w70"/></div></div>
        </div>
        <div className="profile-window"><div className="profile-window-top"><span><Code2 size={21}/></span><div><small>PROJECT PROFILE</small><strong>Your next big idea</strong></div><span className="ai-pill"><Sparkles size={12}/> AI</span></div><div className="profile-window-content"><small>TECHNOLOGIES DETECTED</small><div className="tags"><span>Languages</span><span>Frameworks</span><span>Databases</span></div><div className="profile-domain"><GraduationCap size={22}/><div><small>SIH DOMAIN</small><strong>17 SIH domains</strong></div><CheckCircle2 size={18}/></div><div className="profile-progress"><i/><i/><i/><i/></div><small>IMPORT → CLASSIFY → REVIEW</small></div></div>
        <div className="hero-float"><Sparkles size={19}/><span>Your code. <strong>Connected knowledge.</strong></span></div><div className="hero-code-badge"><GitBranch size={25}/></div>
      </div>
    </div></section>
    {profile && <><section className="landing-metrics container" aria-label="Approved repository statistics">
      {[ [stats?.total,"Approved projects"],[stats?.institutions,"Institutions"],[stats?.domains.filter(d=>d.name!=="Unclassified").length,"Domains represented"],[stats?.students,"Student contributors"] ].map(([value,label])=><div key={String(label)}><strong>{value ?? "—"}</strong><span>{label}</span></div>)}
    </section>
    {stats?.truncated && <p className="metrics-note">Counts cover up to 500 approved projects.</p>}
    <section className="container section"><div className="section-heading"><div><div className="eyebrow">CENTRALIZED REPOSITORY</div><h2>Explore what students are building</h2><p>From the first prototype to a project worth sharing.</p></div><Link className="text-link" href="/projects">View all projects <ArrowRight size={17}/></Link></div>
      <form className="home-search" onSubmit={e=>{e.preventDefault();router.push(`/projects?q=${encodeURIComponent(query)}`);}}><Search size={20}/><input aria-label="Search projects" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by title, technology, or keyword…"/><button className="button small">Search</button></form>
      <ErrorBox message={error}/><div className="project-grid">{projects.map(p=><ProjectCard key={p.id} project={p}/>)}</div>
      {!error && stats?.total===0 && <div className="empty"><FolderGit2 size={32}/><h3>Your community starts here</h3><p>Submit a repository and get a teacher’s review to publish your first project.</p><Link className="button" href="/projects/new">Submit a repository</Link></div>}
    </section>
    </>}
    {!profile && <section className="container section"><div className="panel"><h2>Sign in to explore student projects</h2><p>Access project details, presentations and the reviewed repository with your account.</p><Link className="button" href="/login">Log in</Link></div></section>}
    <section className="feature-section" id="how-it-works"><div className="container section"><div className="center-heading"><div className="eyebrow">ONE REPOSITORY. MORE POSSIBILITIES.</div><h2>From source code to shared knowledge</h2><p>Import a public GitHub repository, raw source file or ZIP, review the extracted details, and submit for teacher approval.</p></div>
      <div className="feature-grid">{[
        [FolderGit2,"Centralized repository","Keep approved student projects, source links, and reviews in one searchable collection."],
        [Tags,"Automated technology tagging","Identify languages and frameworks from README files and dependency manifests."],
        [GraduationCap,"SIH domain classification","Suggest a domain from the project’s purpose, with an explanation for reviewers."],
        [ScanSearch,"Smart search","Find relevant projects with ranked keywords, technology aliases, and domain filters."],
        [Layers,"Similarity detection","Compare project descriptions and flag repeated repository links for review."],
        [BarChart3,"Analytics","Explore project counts, technology trends, and participation across institutions."],
      ].map(([Icon,title,description])=>{const I=Icon as typeof FolderGit2;return <article key={String(title)}><span className="feature-icon"><I size={23}/></span><h3>{String(title)}</h3><p>{String(description)}</p></article>;})}</div>
    </div></section>
    <section className="container community-cta section"><div><div className="eyebrow">JOIN THE COMMUNITY</div><h2>Students build. Teachers guide.</h2><p>Sign in to submit a repository or review student projects.</p></div><Link className="button" href="/register">Create account <ArrowRight size={16}/></Link></section>
  </main>;
}
