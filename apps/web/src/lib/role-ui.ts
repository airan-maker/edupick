export type UserRole = "PARENT" | "INSTRUCTOR";
export type ViewRole = "PARENT" | "INSTRUCTOR";

export function parseRoleParam(role: string | null | undefined): ViewRole {
  return role === "INSTRUCTOR" ? "INSTRUCTOR" : "PARENT";
}

export function normalizeRole(role: UserRole | null | undefined): ViewRole {
  return role === "INSTRUCTOR" ? "INSTRUCTOR" : "PARENT";
}

export function getRoleLabel(role: UserRole | null | undefined) {
  return normalizeRole(role) === "INSTRUCTOR" ? "강사" : "학부모";
}

export function isOperatorRole(role: UserRole | null | undefined) {
  return normalizeRole(role) === "INSTRUCTOR";
}

export function getRoleHomePath(role: UserRole | null | undefined) {
  return normalizeRole(role) === "INSTRUCTOR" ? "/studio" : "/home";
}
