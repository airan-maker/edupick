"use client";

import { Suspense, useEffect, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getRoleHomePath, parseRoleParam } from "@/lib/role-ui";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    role: "PARENT" | "INSTRUCTOR";
    profileImageUrl: string | null;
  };
}

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuth((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);
  const requestedRole = parseRoleParam(searchParams.get("state"));
  const retryHref =
    requestedRole === "INSTRUCTOR" ? "/login?role=INSTRUCTOR" : "/login";

  useEffect(() => {
    if (attemptedRef.current) {
      return;
    }

    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError("카카오 로그인에 실패했습니다. 다시 시도해 주세요.");
      return;
    }

    if (!code) {
      setError("인가 코드가 없어 로그인을 진행할 수 없습니다.");
      return;
    }

    attemptedRef.current = true;
    let cancelled = false;

    async function signIn() {
      try {
        const redirectUri = `${window.location.origin}/kakao/callback`;
        const response = await api.post<LoginResponse>("/auth/kakao/code", {
          code,
          redirectUri,
          role: requestedRole,
        });

        if (cancelled) {
          return;
        }

        login(response.user, {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });

        startTransition(() => {
          router.replace(getRoleHomePath(response.user.role));
        });
      } catch (loginError) {
        if (cancelled) {
          return;
        }

        setError(
          loginError instanceof Error
            ? loginError.message
            : "로그인 처리 중 오류가 발생했습니다."
        );
      }
    }

    void signIn();

    return () => {
      cancelled = true;
    };
  }, [login, router, searchParams]);

  return (
    <div className="w-full max-w-sm rounded-[34px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 text-center shadow-[0_22px_38px_rgba(188,196,222,0.24)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
        Kakao Auth
      </p>
      <h1 className="display-font mt-3 text-3xl font-bold tracking-[-0.05em] text-text-primary">
        카카오 로그인
      </h1>
      {error ? (
        <>
          <p className="mt-4 text-sm leading-7 text-red-500">{error}</p>
          <Link
            href={retryHref}
            className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]"
          >
            다시 로그인
          </Link>
        </>
      ) : (
        <p className="mt-4 text-sm leading-7 text-text-secondary">
          에듀픽 계정을 확인하고 있습니다.
        </p>
      )}
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-[34px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 text-center shadow-[0_22px_38px_rgba(188,196,222,0.24)]">
            <p className="text-sm text-text-secondary">로그인 처리 중…</p>
          </div>
        }
      >
        <KakaoCallbackContent />
      </Suspense>
    </div>
  );
}
