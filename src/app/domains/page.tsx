"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DOMAINS } from "@/lib/taxonomy";
import { PageTitle, domainIcons } from "@/components/ui";
export default function Domains() {
  return (
    <main className="container section">
      <PageTitle
        eyebrow="FIND YOUR FIELD OF INNOVATION"
        title="SIH (Smart India Hackathon) domains"
        description="Explore projects across all 17 SIH domains. Technologies are classified separately by their role in the technical stack."
      />
      <div className="domain-grid">
        {DOMAINS.map((d, i) => {
          const Icon = domainIcons[i];
          return (
            <Link
              className={`domain-card domain-${i % 4}`}
              key={d}
              href={`/projects?domain=${encodeURIComponent(d)}`}
            >
              <Icon size={30} />
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h2>{d}</h2>
              <p>Discover student ideas in this domain</p>
              <ArrowUpRight size={21} />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
