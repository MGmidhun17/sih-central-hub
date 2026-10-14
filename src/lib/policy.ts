import type { Profile, Project } from "./types";
export const editable = (p: Pick<Project, "status">) =>
  ["draft", "changes_requested", "rejected"].includes(p.status);
export function isAdmin(u: Profile, adminUid: string | undefined) {
  return !!adminUid && u.uid === adminUid && u.role === "admin" && !u.deleting;
}
export function isTeacher(u: Profile) {
  return u.role === "teacher" && u.approved && !u.deleting;
}
export function canReadProject(
  p: Pick<Project, "status" | "studentId">,
  u: Profile | null,
  adminUid?: string,
) {
  return (
    (!!u && !u.deleting && p.status === "approved") ||
    !!(
      u &&
      !u.deleting &&
      (p.studentId === u.uid ||
        isAdmin(u, adminUid) ||
        (isTeacher(u) && p.status !== "draft"))
    )
  );
}
export function canEditProject(
  p: Pick<Project, "status" | "studentId">,
  u: Profile,
) {
  return (
    u.role === "student" && !u.deleting && u.uid === p.studentId && editable(p)
  );
}
