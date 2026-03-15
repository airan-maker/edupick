# 에듀픽(EduPick) OpenSpec — API & 시스템 기술 명세

**버전**: v1.0
**작성일**: 2026-03-11
**Base URL**: `https://api.edupick.kr/v1`

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        클라이언트 레이어                          │
│   iOS App (Swift/SwiftUI)  │  Android App (Kotlin/Jetpack)      │
│   Web PWA (Next.js)        │  카카오 알림톡 (외부)               │
└──────────────┬──────────────────────────────────────────────────┘
               │ HTTPS / REST + WebSocket
┌──────────────▼──────────────────────────────────────────────────┐
│                        API Gateway (Kong)                         │
│   Rate Limiting │ Auth (JWT) │ Routing │ Logging                 │
└──────────────┬──────────────────────────────────────────────────┘
               │
   ┌───────────┼────────────┬──────────────┬──────────────────┐
   ▼           ▼            ▼              ▼                  ▼
Auth       Class/Schedule  Payment       Notification      Community
Service    Service         Service       Service           Service
(NestJS)   (NestJS)        (NestJS)      (NestJS)          (NestJS)
   │           │            │              │                  │
   └───────────┴────────────┴──────────────┴──────────────────┘
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
         PostgreSQL       Redis Cache         Elasticsearch
         (주 DB)          (세션/캐시)          (검색)
              │
         AWS S3 (미디어)
```

---

## 2. 인증 (Authentication)

### 2.1 소셜 로그인

```http
POST /auth/social
Content-Type: application/json

{
  "provider": "kakao" | "apple" | "google",
  "access_token": "string",
  "role": "parent" | "instructor"
}
```

**Response 200**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 3600,
  "user": {
    "id": "usr_01HX...",
    "role": "parent",
    "name": "김수진",
    "profile_image_url": "https://cdn.edupick.kr/..."
  }
}
```

### 2.2 토큰 갱신

```http
POST /auth/refresh
Authorization: Bearer {refresh_token}
```

### 2.3 가족 계정 연결

```http
POST /auth/family/link
Authorization: Bearer {access_token}

{
  "invite_code": "FAMILY-XXXX"
}
```

---

## 3. 강사/학원 탐색 (Discovery)

### 3.1 위치 기반 탐색

```http
GET /classes/nearby
Authorization: Bearer {access_token}

Query Parameters:
  lat        float    required  위도
  lng        float    required  경도
  radius_km  float    default=3 검색 반경
  category   string   optional  ballet|piano|art|math|english|soccer|...
  age_group  string   optional  elementary|middle|high|adult
  price_max  int      optional  월 최대 수강료 (원)
  has_voucher bool    optional  바우처 사용 가능 여부
  page       int      default=1
  limit      int      default=20
```

**Response 200**
```json
{
  "data": [
    {
      "id": "cls_01HX...",
      "name": "선라이즈 발레 아카데미",
      "category": "ballet",
      "address": "서울시 강남구 역삼동 123",
      "lat": 37.5012,
      "lng": 127.0395,
      "distance_m": 850,
      "rating": 4.7,
      "review_count": 23,
      "price_from": 120000,
      "has_shuttle": true,
      "has_voucher": false,
      "thumbnail_url": "https://cdn.edupick.kr/...",
      "available_slots": 3
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### 3.2 학원 상세 정보

```http
GET /classes/{class_id}
Authorization: Bearer {access_token}
```

**Response 200**
```json
{
  "id": "cls_01HX...",
  "name": "선라이즈 발레 아카데미",
  "description": "...",
  "instructor": {
    "id": "inst_01HX...",
    "name": "이지현",
    "bio": "...",
    "certifications": ["한국발레협회 지도자 자격증"]
  },
  "schedules": [
    {
      "id": "sch_01HX...",
      "day_of_week": "MON",
      "start_time": "17:00",
      "end_time": "18:00",
      "age_group": "elementary",
      "max_capacity": 8,
      "current_enrollment": 5
    }
  ],
  "shuttle_routes": [
    {
      "stop_name": "역삼 래미안 1단지",
      "pickup_time": "16:45",
      "dropoff_time": "18:10",
      "lat": 37.4998,
      "lng": 127.0412
    }
  ],
  "pricing": {
    "monthly_fee": 150000,
    "registration_fee": 30000,
    "accepted_vouchers": ["평생교육바우처", "문화누리카드"]
  },
  "reviews": {
    "average_rating": 4.7,
    "total_count": 23,
    "breakdown": {
      "curriculum": 4.8,
      "instructor": 4.9,
      "facility": 4.5,
      "shuttle": 4.6
    }
  },
  "photos": ["https://cdn.edupick.kr/..."]
}
```

### 3.3 인증 리뷰 작성

```http
POST /classes/{class_id}/reviews
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

{
  "rating": 5,
  "curriculum_rating": 5,
  "instructor_rating": 5,
  "facility_rating": 4,
  "shuttle_rating": 5,
  "content": "선생님이 꼼꼼하게 손 모양부터 잡아주세요.",
  "receipt_image": File  // 결제 영수증 이미지 (필수)
}
```

---

## 4. 시간표 & 일정 (Schedule)

### 4.1 고정 일정 등록

```http
POST /schedule/fixed-slots
Authorization: Bearer {access_token}

{
  "title": "직장",
  "recurrence": "WEEKLY",
  "days_of_week": ["MON", "TUE", "WED", "THU", "FRI"],
  "start_time": "09:00",
  "end_time": "18:30"
}
```

### 4.2 빈 시간대 기반 수업 추천

```http
GET /schedule/recommendations
Authorization: Bearer {access_token}

Query Parameters:
  lat      float  required
  lng      float  required
  category string optional
```

**Response 200**
```json
{
  "free_slots": [
    {
      "day_of_week": "SAT",
      "start_time": "10:00",
      "end_time": "13:00"
    }
  ],
  "recommendations": [
    {
      "class_id": "cls_01HX...",
      "class_name": "주말 발레 초급반",
      "schedule_day": "SAT",
      "schedule_time": "10:30",
      "travel_time_minutes": 12,
      "match_score": 0.92,
      "reason": "토요일 오전 빈 시간 + 도보 12분 거리"
    }
  ]
}
```

### 4.3 셔틀 연계 가능 여부 조회

```http
GET /schedule/shuttle-link-check
Authorization: Bearer {access_token}

Query Parameters:
  from_class_id string  required  현재 수업 ID
  to_class_id   string  required  다음 수업 후보 ID
  child_id      string  required  자녀 ID
```

**Response 200**
```json
{
  "feasible": true,
  "details": {
    "from_class_end": "17:00",
    "from_shuttle_departs": "17:05",
    "from_shuttle_stop": "역삼 래미안 1단지",
    "to_shuttle_pickup_stop": "역삼 래미안 2단지",
    "walk_distance_meters": 230,
    "walk_time_minutes": 3,
    "to_shuttle_time": "17:15",
    "to_class_start": "17:30",
    "buffer_minutes": 15
  },
  "message": "A 학원 셔틀 하차 후 도보 3분으로 B 학원 셔틀 탑승 가능"
}
```

### 4.4 멀티 자녀 통합 캘린더 조회

```http
GET /schedule/family-calendar
Authorization: Bearer {access_token}

Query Parameters:
  year  int  required
  month int  required
```

**Response 200**
```json
{
  "year": 2026,
  "month": 3,
  "children": [
    {
      "child_id": "child_01HX...",
      "name": "김민준",
      "color": "#FF6B6B",
      "events": [
        {
          "date": "2026-03-16",
          "time": "17:00",
          "class_name": "영어 학원",
          "type": "class",
          "shuttle_alert": true
        }
      ]
    }
  ]
}
```

---

## 5. 자녀 관리 (Child Management)

### 5.1 자녀 등록

```http
POST /children
Authorization: Bearer {access_token}

{
  "name": "김민준",
  "birth_date": "2016-05-12",
  "school": "역삼초등학교",
  "grade": 4
}
```

### 5.2 프라이빗 리포트 조회

```http
GET /children/{child_id}/reports
Authorization: Bearer {access_token}

Query Parameters:
  class_id  string  optional
  page      int     default=1
  limit     int     default=20
```

**Response 200**
```json
{
  "data": [
    {
      "id": "report_01HX...",
      "date": "2026-03-10",
      "class_name": "발레 아카데미",
      "instructor_note": "오늘 팔 자세 많이 늘었어요!",
      "photos": ["https://cdn.edupick.kr/..."],
      "activity_summary": "기초 포르 드 브라 완성"
    }
  ]
}
```

---

## 6. 결제 (Payment)

### 6.1 수업 등록 & 결제

```http
POST /payments/enroll
Authorization: Bearer {access_token}

{
  "schedule_id": "sch_01HX...",
  "child_id": "child_01HX...",       // 학생용
  "payment_method": "card" | "transfer" | "kakaopay" | "naverpay" | "voucher",
  "voucher_code": "string",           // 바우처 사용 시
  "months": 1
}
```

**Response 200**
```json
{
  "enrollment_id": "enrl_01HX...",
  "amount": 150000,
  "payment_status": "paid",
  "invoice_url": "https://cdn.edupick.kr/invoices/...",
  "next_payment_date": "2026-04-01"
}
```

### 6.2 결제 내역 조회

```http
GET /payments/history
Authorization: Bearer {access_token}

Query Parameters:
  year  int  required
  month int  optional
```

### 6.3 환불 요청

```http
POST /payments/{payment_id}/refund
Authorization: Bearer {access_token}

{
  "reason": "string",
  "refund_amount": 75000
}
```

---

## 7. 알림 (Notifications)

### 7.1 셔틀 알림 (강사 발송)

```http
POST /notifications/shuttle
Authorization: Bearer {access_token}  // instructor only

{
  "schedule_id": "sch_01HX...",
  "date": "2026-03-11",
  "shuttle_route_id": "route_01HX...",
  "eta_minutes": 5
}
```

### 7.2 공지 발송 (강사 → 수강생 전체)

```http
POST /notifications/announcement
Authorization: Bearer {access_token}  // instructor only

{
  "class_id": "cls_01HX...",
  "title": "이번 주 준비물 안내",
  "content": "실내용 운동화를 꼭 챙겨주세요.",
  "channels": ["push", "kakao_alimtalk"],
  "schedule_datetime": null  // null이면 즉시 발송
}
```

### 7.3 알림 수신 목록

```http
GET /notifications
Authorization: Bearer {access_token}

Query Parameters:
  page   int  default=1
  limit  int  default=30
  read   bool optional
```

---

## 8. 수업 개설 펀딩 (Class Funding)

### 8.1 펀딩 수업 개설

```http
POST /funding/classes
Authorization: Bearer {access_token}  // instructor only

{
  "title": "토요일 오전 발레 초급반",
  "description": "...",
  "category": "ballet",
  "target_participants": 5,
  "min_participants": 3,
  "price_per_person": 120000,
  "schedule": {
    "day_of_week": "SAT",
    "start_time": "10:30",
    "duration_minutes": 60
  },
  "funding_deadline": "2026-04-01T23:59:59Z",
  "class_start_date": "2026-04-12"
}
```

### 8.2 사전 신청

```http
POST /funding/classes/{funding_id}/join
Authorization: Bearer {access_token}

{
  "message": "피아노 병행하면서 유산소 운동 겸 배우고 싶어요."
}
```

### 8.3 펀딩 현황 조회

```http
GET /funding/classes/{funding_id}
```

**Response 200**
```json
{
  "id": "fund_01HX...",
  "title": "토요일 오전 발레 초급반",
  "status": "in_progress",
  "current_participants": 2,
  "min_participants": 3,
  "target_participants": 5,
  "deadline": "2026-04-01T23:59:59Z",
  "progress_percent": 40
}
```

---

## 9. 커뮤니티 (Community)

### 9.1 게시글 작성 (인증 필요)

```http
POST /community/posts
Authorization: Bearer {access_token}

{
  "board": "parent_reviews" | "adult_tips",
  "region": "서울 강남구",
  "class_id": "cls_01HX...",  // optional
  "content": "이 학원 내신 대비 정말 잘 해주나요?",
  "is_anonymous": true
}
```

---

## 10. 에러 코드

| 코드 | HTTP 상태 | 설명 |
|---|---|---|
| `AUTH_001` | 401 | 토큰 만료 |
| `AUTH_002` | 403 | 권한 없음 (역할 불일치) |
| `CLASS_001` | 404 | 수업 미존재 |
| `CLASS_002` | 409 | 정원 초과 |
| `SCHEDULE_001` | 422 | 셔틀 연계 불가 (이동 시간 부족) |
| `PAY_001` | 400 | 결제 실패 |
| `PAY_002` | 400 | 바우처 코드 유효하지 않음 |
| `REVIEW_001` | 422 | 영수증 인증 실패 |

---

## 11. WebSocket 이벤트 (실시간)

### 연결

```
wss://api.edupick.kr/v1/ws
Authorization: Bearer {access_token}
```

### 이벤트 목록

| 이벤트 | 방향 | 설명 |
|---|---|---|
| `shuttle.eta` | Server → Client | 셔틀 도착 예정 알림 |
| `funding.updated` | Server → Client | 펀딩 참가자 수 변동 |
| `class.slot_available` | Server → Client | 빈자리 발생 알림 |
| `notification.new` | Server → Client | 새 공지 알림 |
