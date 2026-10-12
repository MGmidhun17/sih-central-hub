"use client";
import { useEffect, useEffectEvent, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useApp } from "@/components/provider";
import { PageTitle, StatCards, Loading, ErrorBox, Empty } from "@/components/ui";
import { firebaseConfigured } from "@/lib/firebase/client";
import type { RepositoryAnalytics } from "@/lib/discovery";
const colors=["#0875fa","#16b8a6","#f59e0b","#7754e8","#ef6474","#179cc4","#689a33","#d77837"];
export default function Analytics(){
  const {api,demo}=useApp(); const [data,setData]=useState<RepositoryAnalytics|null>(null),[error,setError]=useState("");
  const load=useEffectEvent(()=> {api("analytics").then(x=>{setData(x as RepositoryAnalytics);setError("");}).catch(e=>setError(e.message));});
  useEffect(()=>{load();},[demo]);
  return <main className="container section"><PageTitle eyebrow="REPOSITORY INSIGHTS" title="Innovation at a glance" description="Understand the domains, technologies and participation behind the approved project collection."/>
    {(demo || !firebaseConfigured) && <div className="info">Demo analytics · These charts use sample projects.</div>}
    <ErrorBox message={error}/>{!data ? !error && <Loading/> : <>
      <StatCards items={[{label:"Approved projects",value:data.total,hint:"Published collection"},{label:"Student contributors",value:data.students,hint:"Unique project owners"},{label:"Institutions",value:data.institutions,hint:"From submitted profiles"},{label:"GitHub repositories",value:data.githubProjects,hint:"Projects with source links"}]}/>
      <p className="search-explainer">{data.truncated ? "These statistics cover the first 500 approved projects, not the entire repository." : "Statistics cover approved projects only. Drafts and pending submissions are private."}</p>
      {!data.total ? <Empty title="Your insights will start here" text="Approve the first student project to populate these charts."/> : <div className="insights-grid">
        <section className="panel"><h2>Projects by SIH domain</h2><div className="chart-box" role="img" aria-label="Project distribution by SIH domain"><ResponsiveContainer width="100%" height={270}><PieChart><Pie data={data.domains} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>{data.domains.map((d,i)=><Cell key={d.name} fill={colors[i%colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="chart-legend">{data.domains.map((d,i)=><div key={d.name}><i style={{background:colors[i%colors.length]}}/><span>{d.name}</span><strong>{d.value}</strong></div>)}</div></section>
        <section className="panel"><h2>Most used technologies</h2><div className="chart-box" role="img" aria-label="Project counts for the ten most used technologies"><ResponsiveContainer width="100%" height={350}><BarChart data={data.technologies.slice(0,10)} layout="vertical" margin={{left:15,right:25}}><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={100} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="value" fill="#0875fa" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div><details><summary>View technology counts</summary>{data.technologies.map(d=><p key={d.name}>{d.name}: {d.value}</p>)}</details></section>
        <section className="panel"><h2>Project creation by month</h2><div className="chart-box" role="img" aria-label="Approved projects grouped by their creation month"><ResponsiveContainer width="100%" height={240}><BarChart data={data.months}><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#16b8a6" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><details><summary>View monthly counts</summary>{data.months.map(d=><p key={d.name}>{d.name}: {d.value}</p>)}</details></section>
        <section className="panel insights-summary"><span className="eyebrow">AUTOMATED ORGANIZATION</span><strong>{data.aiAnalyzed}</strong><h2>Projects analyzed with Gemini</h2><p>AI-assisted descriptions and domain suggestions help make student work discoverable. Technology tags are grouped into a controlled taxonomy and teachers retain publication approval.</p><div className="tags"><span>{data.technologies.length} technologies</span><span>{data.domains.filter(d=>d.name!=="Unclassified").length} domains represented</span></div></section>
      </div>}
    </>}</main>;
}
