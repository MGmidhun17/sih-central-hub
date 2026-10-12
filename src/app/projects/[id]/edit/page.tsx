import { ProjectEditor } from "@/components/project-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProjectEditor id={(await params).id} />;
}
