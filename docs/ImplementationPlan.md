# 에듀픽 서비스 구현 계획서

> 최종 수정: 2026-03-12
> 기반 문서: PRD.md, OpenSpec.md, TechStack.md, Roadmap.md

---

## 목차

1. [구현 모듈 총괄](#1-구현-모듈-총괄)
2. [모듈별 상세 구현 계획](#2-모듈별-상세-구현-계획)
3. [AI 엔진 구현](#3-ai-엔진-구현)
4. [강사 View 구현](#4-강사-view-구현)
5. [프론트엔드 화면 설계](#5-프론트엔드-화면-설계)
6. [데이터 모델 설계](#6-데이터-모델-설계)
7. [구현 우선순위 & 스프린트 계획](#7-구현-우선순위--스프린트-계획)
8. [기술 리스크 & 대응](#8-기술-리스크--대응)

---

## 1. 구현 모듈 총괄

| # | 모듈명 | 우선순위 | Phase | 핵심 기술 |
|---|--------|---------|-------|----------|
| M1 | 탐색/비교 (투-트랙 뷰) | P0 | 1 | Naver Maps, Elasticsearch, Next.js |
| M2 | AI 학원 스케줄 추천 | P1 | 2 | Claude API, PostGIS, BullMQ |
| M3 | 원스톱 신청 & 결제 | P0 | 1 | 포트원, NestJS, PostgreSQL |
| M4 | 스마트 통합 일정표 | P0 | 1 | React Calendar, WebSocket |
| M5 | 희망 반 개설 (공구/펀딩) | P1 | 2 | Redis Pub/Sub, BullMQ |
| M6 | 에듀픽 톡 | P1 | 2 | Socket.io, S3, FCM |
| M7 | 셔틀 내비게이션 연동 | P1 | 2 | Naver Directions API, FCM |
| M8 | 희망 매칭 엔진 | P2 | 3 | PostGIS, Claude API |
| M9 | 교육비 통합 장부 | P1 | 2 | PDF 생성, 포트원 |
| M10 | 강사 View (운영 최적화) | P0 | 1 | NestJS, Dashboard |
| M11 | 셔틀 노선 마법사 | P2 | 3 | OSRM/Naver Directions, AI |
| M12 | 행정 자동화 | P1 | 2 | 카카오 알림톡, BullMQ |

---

## 2. 모듈별 상세 구현 계획

### M1. 탐색/비교 — 투-트랙(Two-track) UI

**목표**: 배민식 리스트 뷰 + 지도 기반 뷰로 학원을 한눈에 비교

#### 2.1.1 배민식 리스트 뷰

```
화면 구조:
┌─────────────────────────────┐
│ 🔍 검색바 + 위치 설정        │
├─────────────────────────────┤
│ [수학] [영어] [발레] [축구].. │  ← 카테고리 아이콘 가로 스크롤
├─────────────────────────────┤
│ 필터: 거리순│평점순│수강료순│시간대 │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ 🏫 에이스 영어학원     │   │  ← 학원 카드
│ │ ⭐4.7 · 도보 8분 · 셔틀✅│   │
│ │ 월/수/금 16:00~17:30   │   │
│ │ 월 25만원              │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ 🏫 점프 체육관         │   │
│ │ ...                    │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

**백엔드 구현:**

```typescript
// GET /v1/classes/nearby
interface NearbyClassesQuery {
  lat: number;              // 기준 위도
  lng: number;              // 기준 경도
  radius_km?: number;       // 반경 (기본 3km)
  category?: string[];      // 과목 필터 ['math', 'english', 'ballet']
  sort_by?: 'distance' | 'rating' | 'price' | 'time';
  time_after?: string;      // 시간대 필터 (예: "16:00")
  shuttle_only?: boolean;   // 셔틀 가능만
  price_min?: number;
  price_max?: number;
  page?: number;
  limit?: number;           // 기본 20
}

interface NearbyClassResult {
  academy_id: string;
  name: string;
  category: string;
  distance_m: number;
  rating: number;
  review_count: number;
  has_shuttle: boolean;
  shuttle_minutes?: number;  // 셔틀 소요 시간
  schedules: ClassSchedule[];
  monthly_fee: number;
  thumbnail_url: string;
  lat: number;
  lng: number;
}
```

**Elasticsearch 인덱스:**

```json
{
  "mappings": {
    "properties": {
      "name": { "type": "text", "analyzer": "nori" },
      "category": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "has_shuttle": { "type": "boolean" },
      "monthly_fee": { "type": "integer" },
      "rating": { "type": "float" },
      "schedules": {
        "type": "nested",
        "properties": {
          "day_of_week": { "type": "keyword" },
          "start_time": { "type": "keyword" },
          "end_time": { "type": "keyword" }
        }
      }
    }
  }
}
```

**프론트엔드 핵심 컴포넌트:**

```
src/
├── features/discovery/
│   ├── components/
│   │   ├── SearchBar.tsx              # 검색 + 위치 설정
│   │   ├── CategoryScroller.tsx       # 가로 스크롤 카테고리 아이콘
│   │   ├── FilterBar.tsx              # 정렬/필터 토글
│   │   ├── AcademyCard.tsx            # 학원 카드 (리스트 아이템)
│   │   ├── AcademyList.tsx            # 무한 스크롤 리스트
│   │   ├── MapView.tsx                # 네이버 지도 + 핀
│   │   ├── MapPin.tsx                 # 커스텀 핀 (과목별 색상)
│   │   ├── ViewToggle.tsx             # 리스트↔지도 전환
│   │   └── AcademyBottomSheet.tsx     # 지도에서 핀 클릭 시 바텀시트
│   ├── hooks/
│   │   ├── useNearbyClasses.ts        # TanStack Query + API
│   │   ├── useUserLocation.ts         # Geolocation + 집/학교 저장
│   │   └── useSearchFilters.ts        # 필터 상태 관리
│   └── types.ts
```

#### 2.1.2 지도 기반 뷰

```
화면 구조:
┌─────────────────────────────┐
│ 🔍 "농구" 검색               │
├─────────────────────────────┤
│                             │
│     🏠 우리 집               │
│         ·  📍A              │
│    📍B  ·     · 📍C         │  ← 네이버 지도 + 학원 핀
│         ·                   │
│     🏫 아이 학교             │
│                             │
├─────────────────────────────┤
│ [📍A 에이스 체육관] 도보 5분  │  ← 하단 카드 캐러셀
│  화/목 16:00 · 셔틀✅ · ⭐4.8│
└─────────────────────────────┘
```

**핵심 구현 포인트:**

1. **기준점 전환**: '우리 집' / '아이 학교' 버튼으로 기준 좌표 변경
2. **과목별 핀 색상**: 수학=파랑, 영어=빨강, 체육=초록 등
3. **시간대 필터 연동**: "오후 4시 이후" 선택 시 해당 시간 수업이 없는 학원 핀 회색 처리
4. **클러스터링**: 줌 레벨에 따라 핀 그룹화 (naver-maps-clustering)

```typescript
// MapView.tsx 핵심 로직
const MapView = () => {
  const { data: classes } = useNearbyClasses(filters);
  const [basePoint, setBasePoint] = useState<'home' | 'school'>('home');

  return (
    <NaverMap
      center={basePoint === 'home' ? userHome : childSchool}
      zoom={14}
    >
      {classes?.map(cls => (
        <Marker
          key={cls.academy_id}
          position={{ lat: cls.lat, lng: cls.lng }}
          icon={getCategoryIcon(cls.category)}
          opacity={matchesTimeFilter(cls) ? 1 : 0.3}
          onClick={() => setSelectedAcademy(cls)}
        />
      ))}
    </NaverMap>
  );
};
```

---

### M2. AI 학원 스케줄 추천

**목표**: 원하는 과목 선택 → 집/학교 기준 → 셔틀·스케줄 고려한 최적 시간표 자동 생성

#### 2.2.1 추천 플로우

```
[과목 선택] → [기준점 설정] → [기존 일정 입력] → [AI 분석] → [추천 결과]

1. 과목 선택: 영어, 수학, 발레 (복수 선택)
2. 기준점: 우리 집 주소 + 아이 학교 주소
3. 기존 일정: 학교 끝나는 시간, 이미 다니는 학원
4. AI 분석:
   - 인근 학원 검색 (반경 3km)
   - 셔틀 유무/소요시간 계산
   - 수업 시간 겹침 체크
   - 이동 시간 여유 계산 (최소 15분)
   - 학원 평점/리뷰 가중치
5. 추천 결과: 요일별 최적 조합 3안 제시
```

**백엔드 API:**

```typescript
// POST /v1/schedule/ai-recommend
interface AIScheduleRequest {
  child_id: string;
  desired_subjects: string[];        // ['english', 'math', 'ballet']
  base_locations: {
    home: { lat: number; lng: number };
    school: { lat: number; lng: number };
  };
  school_end_time: string;            // "15:00"
  existing_schedules: ExistingSlot[]; // 이미 다니는 학원
  preferences: {
    max_daily_classes: number;        // 하루 최대 수업 수
    prefer_shuttle: boolean;
    budget_max?: number;              // 월 예산 상한
    prefer_weekday_only?: boolean;
  };
}

interface AIScheduleResponse {
  recommendations: SchedulePlan[];    // 3개 안
  analysis: {
    total_monthly_cost: number;
    total_weekly_hours: number;
    shuttle_coverage: number;         // 셔틀로 커버되는 비율
    free_time_ratio: number;          // 여유 시간 비율
  };
}

interface SchedulePlan {
  plan_id: string;
  label: string;                      // "균형 추천안", "비용 절약안", "시간 효율안"
  score: number;                      // 0~100 추천 점수
  slots: RecommendedSlot[];
  reasons: string[];                  // 추천 이유
}

interface RecommendedSlot {
  academy_id: string;
  academy_name: string;
  subject: string;
  day_of_week: string[];
  start_time: string;
  end_time: string;
  monthly_fee: number;
  has_shuttle: boolean;
  travel_minutes: number;             // 이전 일정에서 이동 시간
  rating: number;
}
```

#### 2.2.2 AI 추천 엔진 내부 로직

```typescript
// services/schedule-recommender.service.ts

class ScheduleRecommenderService {
  async recommend(req: AIScheduleRequest): Promise<AIScheduleResponse> {
    // Step 1: 후보 학원 검색 (과목별)
    const candidates = await this.searchCandidates(req);

    // Step 2: 제약 조건 필터링
    const filtered = this.applyConstraints(candidates, req);

    // Step 3: 스케줄 조합 생성 (Constraint Satisfaction)
    const combinations = this.generateCombinations(filtered, req);

    // Step 4: 각 조합에 점수 부여
    const scored = combinations.map(combo => ({
      ...combo,
      score: this.calculateScore(combo, req),
    }));

    // Step 5: 상위 3개 + Claude API로 추천 이유 생성
    const top3 = scored.sort((a, b) => b.score - a.score).slice(0, 3);
    const withReasons = await this.generateReasons(top3, req);

    return { recommendations: withReasons, analysis: this.summarize(top3) };
  }

  private calculateScore(combo: ScheduleCombo, req: AIScheduleRequest): number {
    let score = 0;

    // 거리 점수 (가까울수록 높음) — 가중치 25%
    score += this.distanceScore(combo) * 0.25;

    // 셔틀 점수 (셔틀 있으면 가산) — 가중치 20%
    score += this.shuttleScore(combo) * 0.20;

    // 이동 여유 시간 (최소 15분 확보) — 가중치 20%
    score += this.travelBufferScore(combo) * 0.20;

    // 평점 점수 — 가중치 15%
    score += this.ratingScore(combo) * 0.15;

    // 비용 점수 (예산 내) — 가중치 10%
    score += this.costScore(combo, req.preferences.budget_max) * 0.10;

    // 일정 분산 점수 (하루 몰리지 않게) — 가중치 10%
    score += this.distributionScore(combo) * 0.10;

    return Math.round(score);
  }
}
```

#### 2.2.3 추천 결과 UI

```
┌─────────────────────────────┐
│ 🤖 AI 스케줄 추천 결과        │
├─────────────────────────────┤
│                             │
│ [추천 1] 균형 추천안 ⭐92점   │
│ ┌─────────────────────┐     │
│ │ 월 수 금              │     │
│ │ 15:30 영어(에이스)    │     │  ← 시간표 블록 UI
│ │ 17:00 발레(스완)      │     │
│ │                      │     │
│ │ 화 목                 │     │
│ │ 16:00 수학(명인)      │     │
│ └─────────────────────┘     │
│ 총 월 75만원 · 셔틀 3/3     │
│ "모든 수업 셔틀 연계 가능"    │
│            [이 안으로 신청하기]│
│                             │
│ [추천 2] 비용 절약안 ⭐85점   │
│ ...                         │
│                             │
│ [추천 3] 시간 효율안 ⭐80점   │
│ ...                         │
└─────────────────────────────┘
```

---

### M3. 원스톱 신청 & 결제

**목표**: 반 선택 → 신청 → 카드 등록 1회 → 매월 자동 결제

#### 2.3.1 결제 플로우

```
[반 상세 페이지] → [신청하기] → [결제 수단 선택/등록] → [결제 완료]
                                                         ↓
                                              [캘린더 자동 등록]
                                              [반 단톡방 자동 입장]
                                              [다음 달 자동 결제 예약]
```

**백엔드 구현:**

```typescript
// POST /v1/enrollments
interface EnrollmentRequest {
  class_id: string;              // 반 ID
  child_id?: string;             // 자녀 ID (학부모인 경우)
  payment_method: {
    type: 'card' | 'bank_transfer';
    billing_key?: string;        // 저장된 카드 (포트원 빌링키)
  };
  auto_pay: boolean;             // 자동 결제 동의
}

// 결제 처리 서비스
class EnrollmentService {
  async enroll(req: EnrollmentRequest, userId: string) {
    // 1. 정원 체크 (동시성 제어 — Redis SETNX)
    const slot = await this.reserveSlot(req.class_id);
    if (!slot) throw new ConflictException('정원이 마감되었습니다');

    try {
      // 2. 포트원 결제 요청
      const payment = await this.portoneService.pay({
        billing_key: req.payment_method.billing_key,
        amount: slot.monthly_fee,
        order_name: `${slot.academy_name} - ${slot.class_name}`,
      });

      // 3. 등록 확정
      const enrollment = await this.prisma.enrollment.create({
        data: {
          userId, classId: req.class_id, childId: req.child_id,
          paymentId: payment.id, status: 'ACTIVE',
          autoPayEnabled: req.auto_pay,
          nextPaymentDate: this.calcNextPaymentDate(),
        },
      });

      // 4. 후속 처리 (비동기 — BullMQ)
      await this.eventQueue.add('enrollment.completed', {
        enrollmentId: enrollment.id,
        classId: req.class_id,
        userId,
      });
      // → 캘린더 자동 등록
      // → 반 단톡방 자동 입장
      // → 환영 알림톡 발송

      return enrollment;
    } catch (error) {
      await this.releaseSlot(req.class_id);
      throw error;
    }
  }
}
```

#### 2.3.2 자동 결제 스케줄러

```typescript
// jobs/auto-payment.processor.ts
@Processor('auto-payment')
class AutoPaymentProcessor {
  @Process()
  async handleAutoPayment(job: Job<{ enrollmentId: string }>) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: job.data.enrollmentId },
      include: { user: true, class: true },
    });

    // 결제 3일 전 알림
    if (job.data.type === 'pre-notify') {
      await this.notificationService.send({
        userId: enrollment.userId,
        template: 'PAYMENT_UPCOMING',
        data: {
          academyName: enrollment.class.academyName,
          amount: enrollment.class.monthlyFee,
          paymentDate: enrollment.nextPaymentDate,
        },
        channels: ['push', 'alimtalk'],
      });
      return;
    }

    // 자동 결제 실행
    try {
      await this.portoneService.pay({
        billing_key: enrollment.billingKey,
        amount: enrollment.class.monthlyFee,
      });
      // 다음 결제일 갱신
      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { nextPaymentDate: addMonths(enrollment.nextPaymentDate, 1) },
      });
    } catch (error) {
      // 결제 실패 → 미납 알림
      await this.notificationService.send({
        userId: enrollment.userId,
        template: 'PAYMENT_FAILED',
        channels: ['push', 'alimtalk', 'sms'],
      });
    }
  }
}
```

---

### M4. 스마트 통합 일정표

**목표**: 신청한 모든 학원 스케줄이 자동으로 달력에 반영

#### 2.4.1 캘린더 UI

```
┌─────────────────────────────────┐
│ 📅 2026년 3월 · 3째주           │
│ [주간] [월간] [아이별]           │
├───┬───┬───┬───┬───┬───┬───┤
│ 월 │ 화 │ 수 │ 목 │ 금 │ 토 │ 일 │
├───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │
│15 │   │15 │   │15 │   │   │
│:30│   │:30│   │:30│   │   │
│🔵 │   │🔵 │   │🔵 │   │   │
│영어│   │영어│   │영어│   │   │
│   │   │   │   │   │   │   │
│   │16 │   │16 │   │10 │   │
│   │:00│   │:00│   │:00│   │
│   │🟢 │   │🟢 │   │🩰 │   │
│   │수학│   │수학│   │발레│   │
│   │   │   │   │   │   │   │
│17 │   │17 │   │17 │   │   │
│:00│   │:00│   │:00│   │   │
│🩰 │   │🩰 │   │🩰 │   │   │
│발레│   │발레│   │발레│   │   │
└───┴───┴───┴───┴───┴───┴───┘
│ 🚐 셔틀 알림: 15:15 에이스영어 픽업 │
└─────────────────────────────────┘
```

**핵심 구현:**

```typescript
// GET /v1/schedule/family-calendar
interface FamilyCalendarQuery {
  child_id?: string;       // 특정 자녀만 (없으면 전체)
  start_date: string;      // 2026-03-16
  end_date: string;        // 2026-03-22
  view: 'week' | 'month';
}

interface CalendarEvent {
  id: string;
  enrollment_id: string;
  child_id: string;
  child_name: string;
  academy_name: string;
  subject: string;
  color: string;           // 과목별 색상
  start_at: string;        // ISO 8601
  end_at: string;
  location: string;
  has_shuttle: boolean;
  shuttle_pickup_time?: string;
  status: 'scheduled' | 'cancelled' | 'makeup';  // 보강
  memo?: string;
}
```

**프론트엔드 구조:**

```
src/features/calendar/
├── components/
│   ├── WeekView.tsx              # 주간 뷰 (시간 축)
│   ├── MonthView.tsx             # 월간 뷰 (도트)
│   ├── EventBlock.tsx            # 수업 블록 (과목 색상)
│   ├── ChildSelector.tsx         # 자녀 탭 전환
│   ├── ShuttleAlert.tsx          # 셔틀 알림 배너
│   └── DayDetail.tsx             # 날짜 클릭 시 상세
├── hooks/
│   ├── useCalendarEvents.ts      # TanStack Query
│   └── useCalendarSync.ts        # WebSocket 실시간 동기화
└── utils/
    └── colorMap.ts               # 과목별 색상 매핑
```

**실시간 동기화 (WebSocket):**

```typescript
// 강사가 수업 시간 변경 시 → 학부모 캘린더 즉시 반영
socket.on('schedule.updated', (data: {
  class_id: string;
  changes: Partial<ClassSchedule>;
}) => {
  queryClient.invalidateQueries(['calendar']);
  showToast(`${data.academy_name} 수업 시간이 변경되었습니다`);
});
```

---

### M5. 희망 반 개설 (공구/펀딩)

**목표**: "화목 4시 농구반" 같은 조건으로 인원 모집 → 달성 시 개설

#### 2.5.1 펀딩 플로우

```
학부모 A: "화/목 4시 농구반 원해요" [희망 등록]
     ↓
에듀픽: 인근 체육관에 수요 알림 전달
     ↓
운영자: "4/5명 모이면 개설!" [펀딩 승인, 최소인원 설정]
     ↓
학부모 B, C, D 참여: [3/5명]
     ↓
에듀픽: 인근 유사 희망자에게 추천 알림
     ↓
학부모 E 참여: [5/5명 ✅]
     ↓
운영자: 최종 승인 → 결제 일괄 진행 → 캘린더 자동 등록
```

**백엔드 API:**

```typescript
// POST /v1/funding/wishes — 학부모 희망 등록
interface WishRequest {
  subject: string;              // 'basketball'
  desired_schedule: {
    days: string[];             // ['tue', 'thu']
    preferred_time: string;     // '16:00'
  };
  location: { lat: number; lng: number };
  radius_km: number;            // 탐색 반경
  child_id?: string;
  description?: string;         // "초등 3~4학년 대상"
}

// POST /v1/funding/classes — 운영자 펀딩 개설
interface FundingClassRequest {
  wish_id?: string;             // 특정 희망에 응답
  academy_id: string;
  subject: string;
  schedule: ClassSchedule;
  min_students: number;         // 최소 인원 (예: 5)
  max_students: number;
  monthly_fee: number;
  deadline: string;             // 모집 마감일
  instructor_id: string;
}

// POST /v1/funding/classes/:id/join — 수강생 참여
interface FundingJoinRequest {
  child_id?: string;
  payment_method: PaymentMethod;  // 사전 결제 정보 (달성 시 자동 결제)
}
```

**매칭 알림 로직:**

```typescript
// services/wish-matcher.service.ts
class WishMatcherService {
  // 새 희망 등록 시 유사 희망자 매칭
  async onNewWish(wish: Wish) {
    // 1. 반경 5km 내 같은 과목 희망자 검색
    const similar = await this.prisma.wish.findMany({
      where: {
        subject: wish.subject,
        location: { nearby: wish.location, radius: 5000 },
        status: 'OPEN',
      },
    });

    // 2. 3명 이상이면 인근 학원에 수요 알림
    if (similar.length >= 3) {
      const nearbyAcademies = await this.findRelevantAcademies(wish);
      for (const academy of nearbyAcademies) {
        await this.notificationService.send({
          userId: academy.ownerId,
          template: 'DEMAND_ALERT',
          data: {
            subject: wish.subject,
            count: similar.length,
            area: wish.area_name,
          },
        });
      }
    }

    // 3. 기존 펀딩 중인 반에 매칭
    const matchingFundings = await this.findMatchingFundings(wish);
    if (matchingFundings.length > 0) {
      await this.notificationService.send({
        userId: wish.userId,
        template: 'MATCHING_FUNDING_FOUND',
        data: { fundings: matchingFundings },
      });
    }
  }
}
```

#### 2.5.2 펀딩 UI

```
┌─────────────────────────────┐
│ 🏀 화/목 4시 농구반          │
│ 📍 서초구 · 점프체육관        │
│                             │
│ ████████░░  4/5명           │  ← 프로그레스 바
│                             │
│ 월 20만원 · 마감 3/25       │
│                             │
│ 👤 김○○ 어머니 "같이 해요!"  │
│ 👤 이○○ 어머니 "관심있어요"  │
│                             │
│ [참여하기]  [공유하기]        │
└─────────────────────────────┘
```

---

### M6. 에듀픽 톡

**목표**: 개인번호 노출 없이 강사-학부모 1:1 및 반 단톡방 소통

#### 2.6.1 채팅 시스템 아키텍처

```
┌──────────────┐     WebSocket     ┌──────────────┐
│  Client App  │ ◄──────────────► │  Socket.io   │
│  (RN/Next)   │                  │   Gateway    │
└──────────────┘                  └──────┬───────┘
                                         │
                                  ┌──────▼───────┐
                                  │   NestJS     │
                                  │  Chat Module │
                                  └──────┬───────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                   ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼─────┐
                   │ PostgreSQL  │ │  Redis   │ │   AWS S3  │
                   │ (메시지 저장)│ │ (Pub/Sub)│ │ (미디어)   │
                   └─────────────┘ └──────────┘ └───────────┘
```

**핵심 기능:**

```typescript
// 채팅방 타입
enum ChatRoomType {
  CLASS_GROUP = 'class_group',    // 반별 단톡방 (수강 신청 시 자동 입장)
  DIRECT = 'direct',             // 강사-학부모 1:1
}

// 메시지 타입
enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',               // 수업 사진
  ANNOUNCEMENT = 'announcement', // 공지사항 (고정 가능)
  FILE = 'file',                 // PDF 등
  SCHEDULE_CHANGE = 'schedule_change',  // 수업 변경 알림
}

// 주요 기능
// - 수강 신청 시 반별 단톡방 자동 입장
// - 공지사항 상단 고정 + 읽음 확인
// - 사진 갤러리 (수업 사진 모아보기)
// - 미읽음 카운트 + 푸시 알림
// - 퇴원 시 자동 퇴장 (히스토리는 보존)
```

---

### M7. 셔틀 내비게이션 연동 시스템

**목표**: 셔틀 실시간 위치 + "3분 전 도착" 알림 + 기사님 전용 내비

#### 2.7.1 세이프티 타임라인

```
학부모 앱:
┌─────────────────────────────┐
│ 🚐 에이스영어 셔틀            │
│                             │
│ ──●──────●──────●──────◐    │
│  출발   정류장1  정류장2  우리집│
│  15:00  15:08  15:15  15:22 │
│                             │
│ 📍 현재 위치: 서초대로 120    │
│ ⏱ 도착 예정: 약 3분 후        │
│                             │
│ ⚡ "지금 내려보내세요!"        │  ← 3분 전 푸시 알림
└─────────────────────────────┘

기사님 전용 앱:
┌─────────────────────────────┐
│ 🚐 오늘 픽업 명단 (5명)       │
│                             │
│ ✅ 1. 김민준 (서초 래미안)     │
│ ✅ 2. 이서윤 (반포 자이)       │
│ ⬜ 3. 박하늘 (잠원 아파트)     │  ← 체크리스트
│ ⬜ 4. 최지호 (서초 푸르지오)   │
│ ⬜ 5. 정하은 (반포 리체)       │
│                             │
│ [내비게이션 시작]              │  ← 최적 경로 자동 계산
└─────────────────────────────┘
```

**백엔드 구현:**

```typescript
// 셔틀 위치 업데이트 (기사님 앱에서 1분 간격)
// POST /v1/shuttle/:shuttle_id/location
interface ShuttleLocationUpdate {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: string;
}

// 셔틀 ETA 계산 서비스
class ShuttleETAService {
  async updateLocation(shuttleId: string, location: ShuttleLocationUpdate) {
    // 1. Redis에 현재 위치 저장
    await this.redis.set(`shuttle:${shuttleId}:location`, JSON.stringify(location));

    // 2. 남은 정류장별 ETA 계산 (Naver Directions API)
    const remainingStops = await this.getRemainingStops(shuttleId);
    const etas = await this.calculateETAs(location, remainingStops);

    // 3. 각 정류장 학부모에게 ETA 브로드캐스트
    for (const stop of etas) {
      // WebSocket으로 실시간 위치 전송
      this.socketGateway.emitToRoom(`shuttle:${shuttleId}`, 'shuttle.eta', {
        stop_id: stop.id,
        eta_minutes: stop.eta,
        current_location: location,
      });

      // 3분 전 도착 알림 (1회만)
      if (stop.eta <= 3 && !stop.notified) {
        await this.notificationService.send({
          userId: stop.parentUserId,
          template: 'SHUTTLE_ARRIVING',
          data: { minutes: stop.eta, childName: stop.childName },
          channels: ['push', 'alimtalk'],
        });
        await this.markNotified(shuttleId, stop.id);
      }
    }
  }
}
```

---

### M8. 희망 매칭 엔진

**목표**: "옆 아파트 민수 어머니도 화요일 4시 코딩반을 찾고 있어요!" — 당근마켓식 지역 매칭

```typescript
// services/wish-matching-engine.service.ts
class WishMatchingEngine {
  // 매 30분마다 BullMQ 크론으로 실행
  async matchNearbyWishes() {
    const openWishes = await this.prisma.wish.findMany({
      where: { status: 'OPEN' },
    });

    // 지역별 그룹핑
    const clusters = this.clusterByLocation(openWishes, 2000); // 2km 반경

    for (const cluster of clusters) {
      // 같은 과목 + 유사 시간대 그룹
      const matches = this.groupBySimilarity(cluster);

      for (const group of matches) {
        if (group.length >= 2) {
          // 각 희망자에게 매칭 알림
          for (const wish of group) {
            const others = group.filter(w => w.id !== wish.id);
            await this.notificationService.send({
              userId: wish.userId,
              template: 'WISH_MATCH_FOUND',
              data: {
                subject: wish.subject,
                matchCount: others.length,
                areaName: wish.areaName,
                // "근처 2명의 학부모도 화요일 코딩반을 찾고 있어요!"
              },
            });
          }
        }
      }
    }
  }
}
```

---

### M9. 교육비 통합 장부 & 증명서

**목표**: 총 사교육비 통계 + 클릭 한 번 납입증명서 PDF

#### 2.9.1 지출 대시보드

```
┌─────────────────────────────┐
│ 💰 2026년 3월 교육비 리포트    │
├─────────────────────────────┤
│                             │
│ 총 지출: 1,250,000원         │
│                             │
│ 📊 과목별 비율               │
│ ████████ 영어  400,000 (32%)│
│ ██████  수학  350,000 (28%) │
│ █████   발레  300,000 (24%) │
│ ███     체육  200,000 (16%) │
│                             │
│ 📈 추이 (최근 6개월)          │
│ 11월: 100만 → 3월: 125만    │
│                             │
│ [납입증명서 다운로드 📄]       │
│ [연간 리포트 보기]            │
└─────────────────────────────┘
```

**납입증명서 PDF 생성:**

```typescript
// services/certificate.service.ts
class CertificateService {
  async generatePaymentCertificate(userId: string, year: number) {
    // 1. 해당 연도 결제 내역 조회 (학원별)
    const payments = await this.prisma.payment.findMany({
      where: {
        userId,
        paidAt: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
        status: 'COMPLETED',
      },
      include: { enrollment: { include: { class: { include: { academy: true } } } } },
    });

    // 2. 학원별 그룹핑 & 합산
    const grouped = this.groupByAcademy(payments);

    // 3. PDF 생성 (Puppeteer + HTML 템플릿)
    const pdf = await this.pdfService.generate('payment-certificate', {
      userName: payments[0].user.name,
      year,
      academies: grouped,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      generatedAt: new Date(),
    });

    // 4. S3 업로드 + 임시 다운로드 URL (24시간)
    const url = await this.s3Service.upload(pdf, `certificates/${userId}/${year}.pdf`);
    return this.s3Service.getSignedUrl(url, 86400);
  }
}
```

---

## 3. AI 엔진 구현

### 3.1 Claude API 활용 영역

| 기능 | 활용 방식 | API 호출 빈도 |
|------|----------|-------------|
| 스케줄 추천 이유 생성 | 추천안 데이터 → 자연어 설명 | 추천 요청 시 1회 |
| 희망 매칭 메시지 | 매칭 데이터 → 친근한 알림 문구 | 매칭 발생 시 |
| 리뷰 요약 | 다수 리뷰 → 핵심 키워드 추출 | 학원 상세 조회 시 (캐시) |
| 셔틀 노선 최적화 | 주소 데이터 → 경유 순서 결정 | 노선 생성/변경 시 |

```typescript
// services/ai.service.ts
class AIService {
  private anthropic = new Anthropic();

  async generateScheduleReasons(plan: SchedulePlan, context: AIScheduleRequest) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `다음 학원 스케줄 추천안의 장점을 학부모 관점에서 2~3문장으로 설명해주세요.

추천안: ${JSON.stringify(plan.slots)}
학부모 조건: 집 위치(${context.base_locations.home}), 학교 끝나는 시간(${context.school_end_time})
선호: 셔틀 선호(${context.preferences.prefer_shuttle}), 예산(${context.preferences.budget_max})

친근하고 간결하게, 구체적 수치(이동시간, 비용 등)를 포함해서 작성해주세요.`,
      }],
    });

    return response.content[0].text;
  }
}
```

---

## 4. 강사 View 구현

### 4.1 강사 View 대시보드

```
┌───────────────────────────────────────┐
│ 🏫 에이스영어학원 대시보드              │
├───────────────────────────────────────┤
│                                       │
│ 📊 이번 달 현황                        │
│ ┌─────────┬─────────┬─────────┐       │
│ │ 재원생   │ 이번달 매출│ 미납    │       │
│ │ 127명    │ 3,200만원 │ 3건    │       │
│ │ +5 ▲    │ +8% ▲   │ -2 ▼   │       │
│ └─────────┴─────────┴─────────┘       │
│                                       │
│ 📈 수강생 증감 추이 (6개월)              │
│ ┌─────────────────────────────┐       │
│ │     ·                       │       │
│ │   ·   ·   ·               · │       │
│ │ ·       ·   · · ·       ·   │       │
│ │               ·   · · ·     │       │
│ │ 10월  11월  12월  1월  2월  3월│       │
│ └─────────────────────────────┘       │
│                                       │
│ 🔔 오늘 할 일                          │
│ · 미납 3건 알림톡 발송 [발송하기]        │
│ · 신규 수요 알림: "화목 코딩반 5명"      │
│ · 내일 셔틀 노선: 7명 탑승 예정          │
│                                       │
│ [반 관리] [결제 관리] [셔틀 관리] [통계]  │
└───────────────────────────────────────┘
```

### 4.2 수요 응답형 개설

```typescript
// 운영자에게 수요 데이터 제공
// GET /v1/academy/:academy_id/demand-insights
interface DemandInsight {
  subject: string;
  wish_count: number;          // 해당 과목 희망자 수
  preferred_times: {
    time: string;
    count: number;
  }[];                          // 선호 시간대별 인원
  area_distribution: {
    area_name: string;
    count: number;
  }[];                          // 지역별 분포
  recommendation: string;      // "화/목 16:00 코딩반 개설 시 5명 즉시 확보 가능"
}
```

### 4.3 행정 자동화

```typescript
// BullMQ 크론 작업 목록
const adminAutomationJobs = [
  {
    name: 'auto-unpaid-reminder',
    cron: '0 10 * * *',          // 매일 오전 10시
    // 미납 3일 경과 → 카카오 알림톡 자동 발송
  },
  {
    name: 'monthly-tax-certificate',
    cron: '0 9 1 * *',           // 매월 1일
    // 전월 납입증명서 자동 생성 → 학부모에게 알림
  },
  {
    name: 'monthly-revenue-report',
    cron: '0 9 1 * *',           // 매월 1일
    // 운영자에게 월간 매출 리포트 푸시
  },
  {
    name: 'year-end-tax-docs',
    cron: '0 9 15 1 *',          // 매년 1월 15일
    // 연말정산용 서류 자동 생성
  },
];
```

---

## 5. 프론트엔드 화면 설계

### 5.1 화면 목록 & 라우팅

```
앱 구조 (React Native + Next.js 공통):

(tabs)/
├── home/                           # 메인 홈
│   ├── index.tsx                   # 카테고리 + 추천
│   └── notifications.tsx           # 알림 센터
├── discover/                       # 탐색
│   ├── index.tsx                   # 리스트/지도 토글
│   ├── map.tsx                     # 지도 뷰 (전체화면)
│   ├── [academy_id]/               # 학원 상세
│   │   ├── index.tsx               # 정보 + 반 목록
│   │   ├── reviews.tsx             # 리뷰 목록
│   │   └── classes/[class_id].tsx  # 반 상세 + 신청
│   ├── ai-recommend.tsx            # AI 스케줄 추천
│   └── funding/                    # 펀딩/공구
│       ├── index.tsx               # 펀딩 목록
│       ├── [funding_id].tsx        # 펀딩 상세
│       └── create.tsx              # 희망 등록
├── calendar/                       # 통합 일정표
│   ├── index.tsx                   # 주간/월간 뷰
│   └── [event_id].tsx              # 일정 상세
├── chat/                           # 에듀픽 톡
│   ├── index.tsx                   # 채팅방 목록
│   └── [room_id].tsx               # 채팅방
├── mypage/                         # 마이페이지
│   ├── index.tsx                   # 프로필 + 메뉴
│   ├── children/                   # 자녀 관리
│   ├── payments/                   # 결제 내역
│   │   ├── index.tsx               # 결제 목록
│   │   └── certificates.tsx        # 납입증명서
│   ├── expense-report.tsx          # 교육비 리포트
│   └── settings.tsx                # 설정

(instructor-view)/                 # 강사 View
├── dashboard.tsx                   # 대시보드
├── classes/                        # 반 관리
├── students/                       # 원생 관리
├── payments/                       # 수납 관리
├── shuttle/                        # 셔틀 관리
│   ├── routes.tsx                  # 노선 관리
│   └── wizard.tsx                  # 노선 마법사
├── demand/                         # 수요 인사이트
├── announcements/                  # 공지 발송
└── statistics/                     # 매출 통계
```

### 5.2 디자인 시스템 (컴포넌트 라이브러리)

```
src/components/ui/                  # 공통 UI (shadcn/ui 기반)
├── Button.tsx
├── Card.tsx
├── Badge.tsx                       # 셔틀✅, 인증리뷰 등
├── BottomSheet.tsx                 # 모바일 바텀시트
├── FilterChip.tsx                  # 필터 칩 (다중 선택)
├── ProgressBar.tsx                 # 펀딩 진행률
├── Avatar.tsx                      # 프로필 이미지
├── Calendar/
│   ├── WeekGrid.tsx
│   ├── MonthGrid.tsx
│   └── EventBlock.tsx
├── Map/
│   ├── NaverMap.tsx                # 네이버 지도 래퍼
│   ├── ClusterMarker.tsx
│   └── CustomPin.tsx
└── Chat/
    ├── MessageBubble.tsx
    ├── AnnouncementCard.tsx
    └── ImageGallery.tsx
```

---

## 6. 데이터 모델 설계

### 6.1 핵심 ERD

```sql
-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kakao_id VARCHAR UNIQUE,
  name VARCHAR NOT NULL,
  phone VARCHAR,
  role VARCHAR NOT NULL,           -- 'parent' | 'instructor'
  profile_image_url VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자녀
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES users(id),
  name VARCHAR NOT NULL,
  birth_date DATE,
  school_name VARCHAR,
  school_address VARCHAR,
  school_lat DOUBLE PRECISION,
  school_lng DOUBLE PRECISION,
  grade VARCHAR                     -- '초3', '중1' 등
);

-- 학원
CREATE TABLE academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name VARCHAR NOT NULL,
  address VARCHAR NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone VARCHAR,
  category VARCHAR[],               -- ['english', 'math']
  description TEXT,
  has_shuttle BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false,
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  monthly_fee_min INT,
  monthly_fee_max INT,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PostGIS 확장
CREATE INDEX idx_academies_location ON academies USING GIST (
  ST_MakePoint(lng, lat)::geography
);

-- 반 (클래스)
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES academies(id),
  instructor_id UUID REFERENCES users(id),
  name VARCHAR NOT NULL,            -- '초등 기초반'
  subject VARCHAR NOT NULL,
  age_group VARCHAR,                -- '초등 3~4'
  max_students INT NOT NULL,
  current_students INT DEFAULT 0,
  monthly_fee INT NOT NULL,
  status VARCHAR DEFAULT 'open',    -- 'open' | 'full' | 'closed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 수업 시간표
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  day_of_week VARCHAR NOT NULL,     -- 'mon' | 'tue' | ...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- 수강 등록
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  child_id UUID REFERENCES children(id),
  class_id UUID REFERENCES classes(id),
  status VARCHAR DEFAULT 'active',  -- 'active' | 'paused' | 'cancelled'
  auto_pay_enabled BOOLEAN DEFAULT true,
  billing_key VARCHAR,              -- 포트원 빌링키
  next_payment_date DATE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

-- 결제
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES enrollments(id),
  user_id UUID REFERENCES users(id),
  amount INT NOT NULL,
  status VARCHAR NOT NULL,          -- 'pending' | 'completed' | 'failed' | 'refunded'
  portone_payment_id VARCHAR,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 셔틀 노선
CREATE TABLE shuttle_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES academies(id),
  name VARCHAR NOT NULL,            -- '오후 1코스'
  driver_name VARCHAR,
  driver_phone VARCHAR,
  status VARCHAR DEFAULT 'active'
);

-- 셔틀 정류장
CREATE TABLE shuttle_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES shuttle_routes(id),
  stop_order INT NOT NULL,
  address VARCHAR NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  estimated_time TIME,
  child_ids UUID[]                  -- 이 정류장에서 타는 아이들
);

-- 펀딩 (희망 반 개설)
CREATE TABLE fundings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID REFERENCES academies(id),
  subject VARCHAR NOT NULL,
  min_students INT NOT NULL,
  max_students INT NOT NULL,
  current_students INT DEFAULT 0,
  monthly_fee INT NOT NULL,
  deadline DATE NOT NULL,
  status VARCHAR DEFAULT 'recruiting', -- 'recruiting' | 'confirmed' | 'failed' | 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 희망 등록
CREATE TABLE wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  child_id UUID REFERENCES children(id),
  subject VARCHAR NOT NULL,
  preferred_days VARCHAR[],
  preferred_time VARCHAR,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  area_name VARCHAR,
  status VARCHAR DEFAULT 'open',    -- 'open' | 'matched' | 'enrolled' | 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅방
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR NOT NULL,            -- 'class_group' | 'direct'
  class_id UUID REFERENCES classes(id),
  name VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 메시지
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id),
  sender_id UUID REFERENCES users(id),
  type VARCHAR NOT NULL,            -- 'text' | 'image' | 'announcement' | 'file'
  content TEXT,
  media_url VARCHAR,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅방 멤버
CREATE TABLE chat_room_members (
  room_id UUID REFERENCES chat_rooms(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (room_id, user_id)
);
```

---

## 7. 구현 우선순위 & 스프린트 계획

### Phase 1: MVP (2026년 4~6월) — 12 스프린트 (2주 단위)

```
Sprint 1-2 (4월 1주~2주): 인프라 & 인증
├── AWS 인프라 셋업 (ECS, RDS, Redis, S3)
├── NestJS 프로젝트 초기 설정 (Prisma, 모듈 구조)
├── 카카오 소셜 로그인 + JWT 발급
├── 역할 선택 (학부모/강사 View) 온보딩
└── Next.js + React Native 프로젝트 셋업

Sprint 3-4 (4월 3주~4주): 탐색 (M1)
├── Elasticsearch 학원 인덱스 구축
├── 교육청 API → 강남 3구 기초 데이터 수집
├── 리스트 뷰 (카테고리, 필터, 무한스크롤)
├── 지도 뷰 (네이버 지도, 핀, 바텀시트)
├── 학원 상세 페이지
└── 자녀 등록 + 집/학교 주소 설정

Sprint 5-6 (5월 1주~2주): 결제 & 신청 (M3)
├── 포트원 연동 (카드 등록, 빌링키 발급)
├── 반(Class) 목록 + 상세 페이지
├── 수강 신청 플로우
├── 첫 결제 처리
├── 자동 결제 스케줄러 (BullMQ)
└── 결제 알림 (FCM + 알림톡)

Sprint 7-8 (5월 3주~4주): 일정표 & 공지 (M4 + M10 일부)
├── 통합 캘린더 (주간/월간)
├── 수강 신청 → 캘린더 자동 등록
├── 공지 발송 기능 (강사 → 학부모)
├── 카카오 알림톡 연동
├── 강사 View 기본 대시보드 (재원생, 매출)
└── 미납 알림 자동화

Sprint 9-10 (6월 1주~2주): 리뷰 & 대시보드 (M10)
├── 인증 리뷰 (영수증 사진 업로드)
├── 학원 평점 집계
├── 강사 View 반 관리 (생성, 수정, 삭제)
├── 수납 관리 (미납자 목록, 알림 발송)
└── 학부모 결제 내역 조회

Sprint 11-12 (6월 3주~4주): QA & 베타 출시
├── 통합 테스트 / E2E 테스트
├── 성능 최적화 (번들 사이즈, API 응답)
├── 강남 3구 베타 출시
├── 초기 강사 50명 온보딩 지원
└── 피드백 수집 체계 구축
```

### Phase 2: Growth (2026년 7~9월)

```
M4 (7월): 스마트 시간표 + AI 추천 (M2)
├── 고정 일정 입력 UI
├── AI 스케줄 추천 엔진 구현
├── Claude API 연동 (추천 이유 생성)
├── 멀티 자녀 캘린더
└── 셔틀 연계 자동 판단

M5 (8월): 셔틀 & 톡 (M6, M7)
├── 셔틀 실시간 위치 추적
├── 세이프티 타임라인 (3분 전 알림)
├── 기사님 전용 앱 (내비 연동)
├── 에듀픽 톡 (1:1 + 반 단톡방)
├── 수업 사진 갤러리
└── 공지 상단 고정

M6 (9월): 펀딩 & 교육비 (M5, M9)
├── 희망 반 등록 + 펀딩 UI
├── 펀딩 참여 + 달성 시 자동 결제
├── 교육비 통합 리포트
├── 납입증명서 PDF 생성
└── 교육비/펀딩 흐름 고도화
```

### Phase 3: Scale (2026년 10월~2027년 3월)

```
M7-M8 (10~11월): 매칭 & 노선 (M8, M11)
├── 희망 매칭 엔진 (지역 기반 유사 매칭)
├── 셔틀 노선 마법사 (AI 경로 최적화)
├── 커뮤니티 기능 확장
└── 학원 비교 기능

M9-M10 (12~1월): 수익화 (M12 확장)
├── 강사 구독 플랜 (무료/스탠다드/프로)
├── 광고 상품 (지역 탑 배너)
├── 연말정산 서류 자동 생성
└── 패밀리 구독

M11-M12 (2~3월): 확장
├── 수도권 전역 확장
├── 셔틀 GPS 실시간 추적 고도화
├── 학원 데이터 자동 갱신 파이프라인
└── 성과 분석 & BEP 달성
```

---

## 8. 기술 리스크 & 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| 학원 데이터 부족 (초기 콜드 스타트) | HIGH | 교육청 API로 기초 DB 확보 + BD팀 오프라인 영업 병행 |
| 포트원 자동결제 실패율 | HIGH | 재시도 로직 (1일/3일/7일) + 다중 PG 폴백 |
| 셔틀 GPS 배터리 소모 | MEDIUM | Background Location → 1분 간격 수집, 포그라운드 서비스 |
| 지도 API 호출 비용 증가 | MEDIUM | 결과 캐싱 (Redis 5분 TTL) + 클러스터링으로 호출 절감 |
| 실시간 채팅 확장성 | MEDIUM | Socket.io Redis Adapter로 수평 확장 대비 |
| Claude API 비용/지연 | LOW | 추천 결과 캐시 (동일 조건 24시간) + 배치 처리 |
| 개인정보 보호 (위치/아이 정보) | HIGH | 암호화 저장, 최소 수집, ISMS 가이드 준수 |

---

## 부록: User Journey 요약

```
진입 → 탐색 → 발견 → 확정 → 등원 → 소통 → 결제

1. 진입: 카카오 로그인 → 역할 선택 → 자녀/위치 등록
2. 탐색: [지도] 또는 [카테고리] → 필터 (과목, 거리, 시간, 셔틀)
3. 발견: 개설된 반 → [바로 신청] / 없으면 → [희망 반 등록]
4. 확정: 결제 → 캘린더 자동 등록 → 반 단톡방 자동 입장
5. 등원: 셔틀 도착 3분 전 알림 → "지금 내려보내세요!"
6. 소통: 에듀픽 톡으로 수업 사진·피드백 확인
7. 결제: 매달 자동 수납 → 미납 시 알림톡 → 연말정산 증명서
```

---

> **다음 단계**: 이 구현 계획서를 기반으로 Sprint 1-2 (인프라 & 인증) 코드 구현을 시작합니다.
> 각 모듈의 상세 API 스펙은 `docs/OpenSpec.md`를 참조하세요.
