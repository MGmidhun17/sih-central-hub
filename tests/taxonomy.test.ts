import test from "node:test";
import assert from "node:assert/strict";
import { DOMAINS, classifyByRules, currentDomain, normalizeTechnologies } from "../src/lib/taxonomy";
import { geminiSchema } from "../src/lib/validation";
test("all 17 requested SIH domains classify independently", () => {
  const cases = [
    ["industrial control automation", "Smart Automation"],
    ["athlete workout sports", "Fitness & Sports"],
    ["archaeology heritage culture", "Heritage & Culture"],
    ["patient hospital diagnosis", "MedTech / BioTech / HealthTech"],
    ["crop farming irrigation", "Agriculture, FoodTech & Rural Development"],
    ["driver assistance connected car", "Smart Vehicles"],
    ["logistics fleet delivery route", "Transportation & Logistics"],
    ["robotics drones", "Robotics and Drones"],
    ["waste recycling pollution", "Clean & Green Technology"],
    ["tourist travel guide tourism", "Tourism"],
    ["solar renewable wind energy", "Renewable / Sustainable Energy"],
    ["phishing malware cybersecurity", "Blockchain & Cybersecurity"],
    ["student classroom education", "Smart Education"],
    ["earthquake flood disaster", "Disaster Management"],
    ["toy puzzle games", "Toys and Games"],
    ["uncategorized creative utility", "Miscellaneous"],
    ["satellite orbital spacecraft", "Space Technology"],
  ];
  assert.deepEqual(cases.map(x => x[1]), [...DOMAINS]);
  for (const [text, domain] of cases) assert.equal(classifyByRules(text).domain, domain);
  assert.equal(classifyByRules("Workspace management").domain, "Miscellaneous");
});
test("legacy domains map to current labels and ambiguous categories use project purpose", () => {
  assert.equal(currentDomain("Smart Education & E-Learning", ""), "Smart Education");
  assert.equal(currentDomain("Smart Automation & Transportation", "fleet logistics"), "Transportation & Logistics");
  assert.equal(currentDomain("IoT & Embedded Systems", "crop irrigation"), "Agriculture, FoodTech & Rural Development");
  assert.equal(currentDomain("AI / ML & Data Science", "patient diagnosis"), "MedTech / BioTech / HealthTech");
});
test("Gemini accepts exactly the requested domain labels", () => {
  const base = { technologies: [], confidence: .5, reason: "Project purpose", keywords: [] };
  for (const domain of DOMAINS) assert(geminiSchema.safeParse({ ...base, domain }).success);
  for (const domain of ["", "AI / ML & Data Science", "IoT & Embedded Systems", "Other"])
    assert(!geminiSchema.safeParse({ ...base, domain }).success);
});
test("technical stacks are grouped separately from SIH project domains", () => {
  const c = normalizeTechnologies("React Django Python PostgreSQL PyTorch spaCy ESP32 Firebase Flutter Docker Vitest Solidity Git").technologyCategories;
  for (const category of ["Frontend", "Backend", "Programming Languages", "Database", "AI / ML", "NLP", "IoT / Embedded", "Cloud / Deployment", "Mobile", "DevOps / Infrastructure", "Testing", "Blockchain / Security", "Version Control"])
    assert(c[category]?.length, category);
});
