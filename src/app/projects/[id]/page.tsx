import { ProjectDetail } from "@/components/project-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProjectDetail id={(await params).id} />;
}
