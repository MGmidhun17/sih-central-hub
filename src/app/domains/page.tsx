"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DOMAINS } from "@/lib/taxonomy";
import { PageTitle, domainIcons } from "@/components/ui";
export default function Domains() {
  return (
    <main className="container section">
      <PageTitle
        eyebrow="IDEAS WITHOUT BOUNDARIES"
        title="A world of challenges to solve."
        description="Explore our SIH-aligned domain taxonomy. These are repository categories, not an official SIH endorsement."
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
              <span>0{i + 1}</span>
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
