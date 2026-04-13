/**
 * apply-permission-template — Applies a named permission template to a team member.
 * Status: Pending server-side implementation. Returns without error to avoid blocking team flows.
 */
export async function applyPermissionTemplate(
  _orgId: string,
  _userId: string,
  _templateName: string,
): Promise<{ applied: false; reason: string }> {
  return { applied: false, reason: "Permission template engine not yet configured" };
}
