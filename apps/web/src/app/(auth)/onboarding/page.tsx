"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { School, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getRoleHomePath } from "@/lib/role-ui";

const roles = [
  {
    id: "PARENT" as const,
    icon: Users,
    title: "학부모",
    description: "학원 비교, 신청, 셔틀 알림, 일정 관리를 한곳에서.",
    tint: "from-blue-100 to-sky-50",
  },
  {
    id: "INSTRUCTOR" as const,
    icon: School,
    title: "강사 View",
    description: "학원, 반, 공지, 수납 관리를 한 화면 흐름으로 사용합니다.",
    tint: "from-amber-100 to-orange-50",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const setUser = useAuth((state) => state.setUser);
  const [mounted, setMounted] = useState(false);
  const [submittingRole, setSubmittingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSelectRole(role: (typeof roles)[number]["id"]) {
    setSubmittingRole(role);
    setError(null);

    try {
      const nextUser = await api.patch<NonNullable<typeof user>>("/users/me/role", {
        role,
      });
      setUser(nextUser);
      startTransition(() => {
        router.push(getRoleHomePath(nextUser.role));
      });
    } catch (roleError) {
      setError(
        roleError instanceof Error
          ? roleError.message
          : "역할 설정 중 오류가 발생했습니다."
      );
    } finally {
      setSubmittingRole(null);
    }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="soft-card h-40 w-full max-w-xl animate-pulse rounded-[34px]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-lg p-8 text-center">
          <h1 className="display-font text-2xl font-bold tracking-[-0.05em] text-text-primary">
            로그인이 필요합니다
          </h1>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            역할 선택을 위해 먼저 로그인해 주세요.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]"
          >
            로그인
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-lg lg:max-w-5xl">
        <div className="grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          {/* Left */}
          <div className="space-y-4">
            <h1 className="display-font text-3xl font-bold leading-[1.08] tracking-[-0.06em] text-text-primary sm:text-4xl">
              어떻게 사용하실 건가요?
            </h1>
            <p className="text-sm leading-7 text-text-secondary">
              지금은 학부모 View와 강사 View 두 흐름에 집중합니다.
            </p>

            <Card className="hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 lg:block">
              <p className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
                현재 계정
              </p>
              <p className="mt-3 text-base font-semibold text-text-primary">
                {user.name ?? "에듀픽 사용자"}
              </p>
            </Card>
          </div>

          {/* Right — 역할 카드 */}
          <div className="space-y-3">
            {error ? (
              <p role="alert" className="rounded-[24px] bg-rose-50 px-5 py-4 text-sm text-rose-500">
                {error}
              </p>
            ) : null}

            {roles.map((role) => {
              const Icon = role.icon;
              const isSubmitting = submittingRole === role.id;

              return (
                <button
                  key={role.id}
                  type="button"
                  className={`soft-card w-full cursor-pointer rounded-[30px] p-5 text-left transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isSubmitting ? "ring-2 ring-primary/25" : ""
                  }`}
                  disabled={!!submittingRole}
                  onClick={() => handleSelectRole(role.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br ${role.tint}`}
                    >
                      <Icon size={26} className="text-text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-text-primary">
                          {role.title}
                        </h3>
                        {isSubmitting ? (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-primary">
                            저장 중…
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {role.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
