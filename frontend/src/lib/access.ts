import type { RoleName, UserSummary } from "../types";

export const ADMIN_ROLES: RoleName[] = ["ADMIN"];
export const HR_ROLES: RoleName[] = ["ADMIN", "HR"];
export const MANAGER_ROLES: RoleName[] = ["ADMIN", "HR", "MANAGER"];
export const MANAGEMENT_ROLES: RoleName[] = ["ADMIN", "HR", "MANAGER"];

export function hasRoleAccess(user: Pick<UserSummary, "role"> | null | undefined, allowedRoles?: RoleName[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return Boolean(user && allowedRoles.includes(user.role));
}
