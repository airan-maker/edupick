"use client";

import Link from "next/link";
import { startTransition, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, MessageCircle, Phone, Sparkles, User } from "lucide-react";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getRoleHomePath, parseRoleParam } from "@/lib/role-ui";

interface RegisterResponse {
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

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuth((state) => state.login);
  const requestedRole = parseRoleParam(searchParams.get("role"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      requestedRole === "INSTRUCTOR"
        ? {
            badge: "강사 전용",
            title: "강사 계정 만들기",
            description: "가입이 완료되면 스튜디오와 운영 하단 네비가 바로 활성화됩니다.",
            helper: "강사 전용 경로에서 가입하면 기본 역할이 강사로 생성됩니다.",
          }
        : {
            badge: "학부모 메인",
            title: "학부모 계정 만들기",
            description: "가입 즉시 학원 탐색, 신청, 일정, 결제 흐름을 사용할 수 있습니다.",
            helper: "기본 진입은 학부모 서비스이며, 일반 이메일 계정도 함께 지원합니다.",
          },
    [requestedRole]
  );

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post<RegisterResponse>("/auth/register", {
        name,
        email,
        phone: phone || undefined,
        password,
        role: requestedRole,
      });

      login(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      startTransition(() => {
        router.push(getRoleHomePath(response.user.role));
      });
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : "회원가입 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleKakaoSignup() {
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

  const loginHref =
    requestedRole === "INSTRUCTOR" ? "/login?role=INSTRUCTOR" : "/login";

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <PublicHeader />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="hidden space-y-5 rounded-[34px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-7 shadow-[0_22px_38px_rgba(188,196,222,0.18)] lg:block">
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold tracking-[0.12em] text-text-secondary">
              {copy.badge}
            </span>
            <h1 className="display-font text-4xl font-bold leading-[1.04] tracking-[-0.06em] text-text-primary">
              {copy.title}
            </h1>
            <p className="max-w-lg text-sm leading-7 text-text-secondary">
              {copy.description}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
                <p className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
                  일반 회원가입
                </p>
                <p className="mt-3 text-base font-semibold text-text-primary">
                  카카오 계정이 없어도 바로 가입할 수 있습니다
                </p>
              </Card>
              <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fff9dd_100%)]">
                <p className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
                  카카오 시작
                </p>
                <p className="mt-3 text-base font-semibold text-text-primary">
                  원하는 진입 경로에 맞춰 역할을 바로 생성합니다
                </p>
              </Card>
            </div>
          </div>

          <Card className="p-6">
            <div className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-text-secondary">
                    {copy.badge}
                  </p>
                  <h2 className="display-font mt-2 text-2xl font-bold tracking-[-0.05em] text-text-primary">
                    {copy.title}
                  </h2>
                </div>
                <div className="rounded-full bg-amber-50 p-3 text-accent" aria-hidden="true">
                  <Sparkles size={18} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-text-secondary">
                {copy.helper}
              </p>

              <form className="mt-6 space-y-3" onSubmit={handleSignup}>
                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">이름</span>
                  <div className="mt-1.5 flex items-center gap-3 rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
                    <User size={16} className="text-text-secondary" />
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full bg-transparent text-sm text-text-primary outline-none"
                      placeholder="이름을 입력해 주세요"
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>

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
                  <span className="text-xs font-semibold text-text-secondary">전화번호</span>
                  <div className="mt-1.5 flex items-center gap-3 rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
                    <Phone size={16} className="text-text-secondary" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="w-full bg-transparent text-sm text-text-primary outline-none"
                      placeholder="010-0000-0000"
                      autoComplete="tel"
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
                      placeholder="8자 이상 비밀번호"
                      autoComplete="new-password"
                      minLength={8}
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
                  {submitting ? "가입 중..." : "이메일로 회원가입"}
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
                  onClick={handleKakaoSignup}
                >
                  <MessageCircle size={20} aria-hidden="true" />
                  카카오로 빠르게 시작하기
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-text-secondary">
                이미 계정이 있나요?{" "}
                <Link href={loginHref} className="font-semibold text-primary">
                  로그인
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
