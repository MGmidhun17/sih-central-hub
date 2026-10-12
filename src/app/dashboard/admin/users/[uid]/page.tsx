import { UserDetail } from "@/components/admin-dashboard";
export default async function Page({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  return <UserDetail uid={(await params).uid} />;
}
