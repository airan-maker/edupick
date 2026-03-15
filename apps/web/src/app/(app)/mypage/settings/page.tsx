"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Save, School, Users } from "lucide-react";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useProtectedPage } from "@/lib/use-protected-page";
import {
  type ViewRole,
  getRoleHomePath,
  getRoleLabel,
  normalizeRole,
} from "@/lib/role-ui";

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: "PARENT" | "INSTRUCTOR";
  profileImageUrl: string | null;
  createdAt: string;
}

const roleOptions = [
  {
    id: "PARENT" as const,
    title: "학부모",
    description: "탐색, 신청, 일정표, 결제 관리 중심",
    icon: Users,
    tint: "from-blue-100 to-sky-50",
  },
  {
    id: "INSTRUCTOR" as const,
    title: "강사",
    description: "학원, 반, 공지, 수납 운영 중심",
    icon: School,
    tint: "from-amber-100 to-orange-50",
  },
] satisfies Array<{
  id: ViewRole;
  title: string;
  description: string;
  icon: typeof Users;
  tint: string;
}>;

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const setUser = useAuth((state) => state.setUser);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<ViewRole>("PARENT");

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.get<UserProfile>("/users/me"),
    enabled: canUseProtectedApi,
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    setName(profileQuery.data.name ?? "");
    setPhone(profileQuery.data.phone ?? "");
    setSelectedRole(normalizeRole(profileQuery.data.role));
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () =>
      api.patch<UserProfile>("/users/me", {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    onSuccess: (user) => {
      setUser(user);
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      router.push(getRoleHomePath(user.role));
    },
  });

  const roleMutation = useMutation({
    mutationFn: async () =>
      api.patch<UserProfile>("/users/me/role", {
        role: selectedRole,
      }),
    onSuccess: (user) => {
      setUser(user);
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setSelectedRole(normalizeRole(user.role));
      router.push(getRoleHomePath(user.role));
    },
  });

  if (!mounted) {
    return (
      <div className="px-4 py-8">
        <div className="soft-card h-56 animate-pulse rounded-[34px]" />
      </div>
    );
  }

  if (!canUseProtectedApi) {
    return (
      <div className="px-4 py-8">
        <LoginRequiredCard description="계정 설정을 변경하려면 로그인해 주세요." />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="flex items-center gap-2">
        <Link
          href="/mypage"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-[0_10px_18px_rgba(195,200,220,0.14)]"
          aria-label="마이페이지로 돌아가기"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary">
            설정
          </h1>
          <p className="text-xs text-text-secondary">프로필과 연락처 정보를 업데이트합니다.</p>
        </div>
      </div>

      <Card className="mt-4 p-5">
        <p className="text-sm font-semibold text-text-primary">기본 정보</p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">이름</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder="이름을 입력해 주세요"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">전화번호</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder="010-0000-0000"
            />
          </label>

          <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-3 text-sm text-text-secondary">
            <p>이메일: {profileQuery.data?.email ?? "미설정"}</p>
            <p className="mt-1">현재 View: {getRoleLabel(profileQuery.data?.role)}</p>
          </div>
        </div>

        {updateMutation.error instanceof Error ? (
          <p className="mt-4 rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
            {updateMutation.error.message}
          </p>
        ) : null}

        <Button
          className="mt-5 gap-2"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          <Save size={16} />
          {updateMutation.isPending ? "저장 중..." : "변경 사항 저장"}
        </Button>
      </Card>

      <Card className="mt-4 p-5">
        <p className="text-sm font-semibold text-text-primary">사용 View</p>
        <p className="mt-1 text-xs leading-6 text-text-secondary">
          현재는 학부모와 강사 두 흐름에 집중합니다. 운영 화면을 보려면 여기서 `강사`를 선택하면 됩니다.
        </p>

        <div className="mt-4 grid gap-3">
          {roleOptions.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`w-full rounded-[24px] p-4 text-left transition-transform ${
                  isSelected
                    ? "bg-[linear-gradient(180deg,#f5f9ff_0%,#eef5ff_100%)] ring-2 ring-primary/20"
                    : "bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] shadow-[0_10px_18px_rgba(195,200,220,0.12)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-[18px] bg-gradient-to-br ${role.tint}`}
                  >
                    <Icon size={20} className="text-text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{role.title}</p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {role.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {roleMutation.error instanceof Error ? (
          <p className="mt-4 rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
            {roleMutation.error.message}
          </p>
        ) : null}

        <Button
          className="mt-5 gap-2"
          onClick={() => roleMutation.mutate()}
          disabled={
            roleMutation.isPending ||
            selectedRole === normalizeRole(profileQuery.data?.role)
          }
        >
          <Save size={16} />
          {roleMutation.isPending ? "View 변경 중..." : "View 전환 저장"}
        </Button>
      </Card>
    </div>
  );
}
