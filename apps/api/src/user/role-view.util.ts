import { Role } from '@prisma/client';

export enum SupportedViewRole {
  PARENT = 'PARENT',
  INSTRUCTOR = 'INSTRUCTOR',
}

export function normalizeRoleToView(
  role: Role | SupportedViewRole | undefined,
): Role {
  return role === 'INSTRUCTOR' ? Role.INSTRUCTOR : Role.PARENT;
}
