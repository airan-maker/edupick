export enum UserRole {
  PARENT = 'PARENT',
  INSTRUCTOR = 'INSTRUCTOR',
}

export interface User {
  id: string;
  kakaoId: string | null;
  email: string | null;
  name: string;
  phone: string | null;
  role: UserRole;
  profileImageUrl: string | null;
  createdAt: string;
}

export interface Child {
  id: string;
  parentId: string;
  name: string;
  birthDate: string | null;
  schoolName: string | null;
  schoolAddress: string | null;
  schoolLat: number | null;
  schoolLng: number | null;
  grade: string | null;
}
