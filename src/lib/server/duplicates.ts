import type { Profile,Project } from "../types";
import { canReadProject } from "../policy";
import { HttpError } from "./http";
export function duplicateError(project:Project,user:Profile) {
  const visible=canReadProject(project,user,process.env.ADMIN_UID);
  return new HttpError(409,"This project already exists. No duplicate was saved.",{
    code:"DUPLICATE_PROJECT",
    ...(visible?{existingProject:{id:project.id,title:project.title,status:project.status}}:{}),
  });
}
