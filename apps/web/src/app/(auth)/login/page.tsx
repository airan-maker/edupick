"use client";

import Link from "next/link";
import { startTransition, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, MessageCircle, Sparkles } from "lucide-react";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuth((state) => state.login);
  const requestedRole = parseRoleParam(searchParams.get("role"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entryCopy = useMemo(
    () =>
      requestedRole === "INSTRUCTOR"
        ? {
            badge: "강사 전용",
            titleFirstLine: "강사 계정으로 로그인하면",
            titleSecondLine: "운영 화면이 바로 열립니다",
            description:
              "학원, 반, 원생, 공지, 원비 현황을 바로 확인하고 필요한 작업을 이어서 처리할 수 있습니다",
            primaryActionLabel: "강사 로그인",
            secondaryActionLabel: "강사 회원가입",
          }
        : {
            badge: "학부모 메인",
            titleFirstLine: "학부모 계정으로 로그인하면",
            titleSecondLine: "탐색과 일정 화면이 바로 열립니다",
            description:
              "주변 학원 비교부터 신청, 일정 확인, 원비 납부까지 한 곳에서 이어집니다",
            primaryActionLabel: "학부모 로그인",
            secondaryActionLabel: "학부모 회원가입",
          },
    [requestedRole]
  );

  const formCopy = useMemo(
    () =>
      requestedRole === "INSTRUCTOR"
        ? {
            badge: "강사 로그인",
            title: "계정 정보를 입력해 주세요",
            helper: "로그인 후 스튜디오 화면으로 바로 이동합니다",
          }
        : {
            badge: "학부모 로그인",
            title: "계정 정보를 입력해 주세요",
            helper: "로그인 후 학원 탐색과 일정 화면으로 바로 이동합니다",
          },
    [requestedRole]
  );

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      login(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      startTransition(() => {
        router.push(getRoleHomePath(response.user.role));
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "로그인 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleKakaoLogin() {
    const kakaoKey =
      process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ??
      process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

    if (!kakaoKey) {
      alert("카카오 로그인 키가 설정되지 않았습니다.");
      return;
    }

    const redirectUri = `${window.location.origin}/kakao/callback`;
    const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", kakaoKey);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", requestedRole);

    window.location.href = authorizeUrl.toString();
  }

  const signupHref =
    requestedRole === "INSTRUCTOR" ? "/signup?role=INSTRUCTOR" : "/signup";

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <PublicHeader />

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.02fr_0.98fr]">
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 sm:p-7">
            <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-primary">
              {entryCopy.badge}
            </span>
            <h1 className="display-font mt-4 text-3xl font-bold leading-[1.06] tracking-[-0.06em] text-text-primary sm:text-4xl">
              {entryCopy.titleFirstLine}
              <br />
              {entryCopy.titleSecondLine}
            </h1>
            <p className="max-w-lg text-sm leading-7 text-text-secondary">
              {entryCopy.description}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#login-form"
                className="rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-6 py-3.5 text-center text-sm font-semibold text-white shadow-[0_18px_34px_rgba(106,168,255,0.32)]"
              >
                {entryCopy.primaryActionLabel}
              </Link>
              <Link
                href={signupHref}
                className="rounded-full border border-white/70 bg-white/80 px-6 py-3.5 text-center text-sm font-semibold text-text-primary shadow-[0_12px_24px_rgba(193,199,221,0.22)]"
              >
                {entryCopy.secondaryActionLabel}
              </Link>
            </div>
          </Card>

          <Card id="login-form" className="p-6">
            <div className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-text-secondary">
                    {formCopy.badge}
                  </p>
                  <h2 className="display-font mt-2 text-2xl font-bold tracking-[-0.05em] text-text-primary">
                    {formCopy.title}
                  </h2>
                </div>
                <div className="rounded-full bg-amber-50 p-3 text-accent" aria-hidden="true">
                  <Sparkles size={18} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-text-secondary">
                {formCopy.helper}
              </p>

              <form className="mt-6 space-y-3" onSubmit={handleEmailLogin}>
                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">이메일</span>
                  <div className="mt-1.5 flex items-center gap-3 rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
                    <Mail size={16} className="text-text-secondary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full bg-transparent text-sm text-text-primary outline-none"
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">비밀번호</span>
                  <div className="mt-1.5 flex items-center gap-3 rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
                    <Lock size={16} className="text-text-secondary" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full bg-transparent text-sm text-text-primary outline-none"
                      placeholder="비밀번호를 입력해 주세요"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </label>

                {error ? (
                  <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? "로그인 중..." : "이메일로 로그인"}
                </Button>
              </form>

              <div className="mt-5">
                <p className="text-center text-xs font-semibold tracking-[0.14em] text-text-secondary">
                  또는
                </p>
                <Button
                  variant="kakao"
                  size="lg"
                  className="mt-3 w-full gap-2"
                  onClick={handleKakaoLogin}
                >
                  <MessageCircle size={20} aria-hidden="true" />
                  카카오로 계속하기
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-text-secondary">
                아직 계정이 없나요?{" "}
                <Link href={signupHref} className="font-semibold text-primary">
                  회원가입
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
