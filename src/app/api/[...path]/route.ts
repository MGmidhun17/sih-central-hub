import { dispatch } from "@/lib/server/api";
import { handled } from "@/lib/server/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
async function route(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handled(async () => dispatch(req, (await context.params).path));
}
export { route as GET, route as POST, route as PATCH, route as DELETE };
