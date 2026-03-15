export interface PublicFaqItem {
  question: string;
  answer: string;
  label: string;
}

export const publicFaqItems: PublicFaqItem[] = [
  {
    label: "학부모 시작",
    question: "학부모는 어디서 시작하면 되나요?",
    answer:
      "회원가입 후 `/home`에서 오늘 일정, 알림, 결제를 확인할 수 있습니다. 로그인 전에는 `/discover`에서 주변 학원과 상세 정보를 먼저 둘러볼 수 있습니다.",
  },
  {
    label: "강사 진입",
    question: "강사는 일반 로그인과 다른 경로를 써야 하나요?",
    answer:
      "네. 강사는 `/instructor`에서 시작하는 흐름을 기준으로 안내합니다. 강사 계정으로 로그인하면 운영 홈이 `/studio`로 열리고, 학원·반·공지·수납 화면을 바로 사용할 수 있습니다.",
  },
  {
    label: "로그인 전",
    question: "로그인 없이 볼 수 있는 범위는 어디까지인가요?",
    answer:
      "공개 페이지, 주변 학원 목록, 학원 상세, 강사 전용 소개는 로그인 없이 볼 수 있습니다. 수강 신청, 결제, 캘린더, 마이페이지는 로그인 후 사용할 수 있습니다.",
  },
  {
    label: "신청 후",
    question: "수업을 신청하면 일정과 결제는 어디서 확인하나요?",
    answer:
      "신청 후에는 `/home`과 `/calendar`에 일정이 반영되고, 결제 상태는 홈 요약과 `/mypage/payments`에서 이어서 확인할 수 있습니다.",
  },
];
