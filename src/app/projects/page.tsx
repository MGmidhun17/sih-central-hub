"use client";
import { useEffect, useState, useEffectEvent, useRef } from "react";
import { Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/provider";
import { PageTitle, ProjectCard, Loading, ErrorBox, Empty } from "@/components/ui";
import { DOMAINS, allTechnologies } from "@/lib/taxonomy";
import type { Project } from "@/lib/types";
export default function Projects() {
  const { api } = useApp();
  const [items, setItems] = useState<Project[]>([]), [query, setQuery] = useState(""), [domain,setDomain] = useState(""), [tech,setTech]=useState(""), [sort,setSort]=useState("relevance"), [loading,setLoading]=useState(true), [error,setError]=useState(""), [scope,setScope]=useState({matched:0,scanned:0,truncated:false}), [ready,setReady]=useState(false);
  const sequence = useRef(0);
  useEffect(()=> { queueMicrotask(()=> { const p=new URLSearchParams(window.location.search); setQuery(p.get("q")??""); setDomain(p.get("domain")??""); setReady(true); }); },[]);
  const runSearch = useEffectEvent(async (seq:number) => {
    setLoading(true); setError("");
    const params = new URLSearchParams({q:query,domain,tech,sort});
    try {
      const data = await api(`projects/search?${params}`) as {items:Project[];matched:number;scanned:number;truncated:boolean};
      if(seq===sequence.current) {setItems(data.items);setScope(data);}
    } catch(e) {if(seq===sequence.current){setError((e as Error).message);setItems([]);}}
    finally {if(seq===sequence.current)setLoading(false);}
  });
  useEffect(()=> {if(!ready)return; const seq=++sequence.current; const timer=setTimeout(()=>void runSearch(seq),250); return ()=>{clearTimeout(timer);sequence.current = seq + 1;};},[query,domain,tech,sort,ready]);
  return <main className="container section">
    <PageTitle eyebrow="CENTRALIZED REPOSITORY" title="Explore projects" description="Discover student innovation by idea, technology, or SIH domain."><Link className="button" href="/projects/new">Submit project <ArrowUpRight size={17}/></Link></PageTitle>
    <div className="filter-panel"><div className="search-field"><Search size={20}/><input aria-label="Search repository" placeholder="Search by title, technology, or keyword…" value={query} maxLength={200} onChange={e=>setQuery(e.target.value)}/><span className="search-hint">Smart search</span></div>
      <div className="filter-row"><span><SlidersHorizontal size={16}/> Filters</span>
        <select aria-label="SIH domain" value={domain} onChange={e=>setDomain(e.target.value)}><option value="">All domains</option>{DOMAINS.map(d=><option key={d}>{d}</option>)}</select>
        <select aria-label="Technology" value={tech} onChange={e=>setTech(e.target.value)}><option value="">All technologies</option>{allTechnologies.map(t=><option key={t}>{t}</option>)}</select>
        <button className="text-link" onClick={()=>{setQuery("");setDomain("");setTech("");}}>Reset</button>
        <select className="sort-select" aria-label="Sort projects" value={sort} onChange={e=>setSort(e.target.value)}><option value="relevance">Most relevant</option><option value="newest">Newest first</option><option value="title">Title A–Z</option></select>
      </div>
    </div>
    <div className="results-header"><span><strong>{items.length}</strong> projects{scope.matched>items.length ? ` of ${scope.matched} matches` : ""}</span><span>Teacher-approved collection</span></div>
    <p className="search-explainer">Ranked keyword search with technology aliases and related terms. Try “nextjs”, “AI education”, or “IoT irrigation”.</p>
    {scope.truncated && <div className="info">Search covers up to 500 approved projects and displays the top 100 matches. Refine your filters to narrow results.</div>}
    <ErrorBox message={error}/>
    {loading ? <Loading/> : items.length ? <div className="project-grid">{items.map(p=><ProjectCard key={p.id} project={p}/>)}</div> : !error && <Empty title="No matching projects" text="Try another keyword, reset the filters, or publish your first reviewed project."/>}
  </main>;
}
