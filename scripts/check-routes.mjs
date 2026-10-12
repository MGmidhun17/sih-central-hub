import { existsSync } from "node:fs";
const routes = [
 "src/app/layout.tsx", "src/app/page.tsx", "src/app/globals.css", "src/app/error.tsx", "src/app/not-found.tsx",
 "src/app/login/page.tsx", "src/app/register/page.tsx", "src/app/domains/page.tsx", "src/app/analytics/page.tsx",
 "src/app/projects/page.tsx", "src/app/projects/new/page.tsx", "src/app/projects/[id]/page.tsx", "src/app/projects/[id]/edit/page.tsx",
 "src/app/dashboard/student/page.tsx", "src/app/dashboard/admin/page.tsx", "src/app/dashboard/admin/users/[uid]/page.tsx",
 "src/app/dashboard/teacher/page.tsx", "src/app/dashboard/teacher/reviews/page.tsx", "src/app/dashboard/teacher/projects/[id]/page.tsx",
 "src/app/api/[...path]/route.ts",
];
const missing=routes.filter(path=>!existsSync(path));
if(missing.length){ console.error("Incomplete source upload. Restore these exact paths before deploying:\n"+missing.join("\n"));process.exit(1); }
console.log(`Source check: all ${routes.length} required route/layout files are present.`);
