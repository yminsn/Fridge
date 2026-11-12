# [PRD] 1단계: 냉장고 이미지 입력 및 식재료 자동 인식 (Ingredient Recognition)

---

## 1. 개요 (Overview)

### 1.1 프로젝트 배경 및 목적
- **목적**: 사용자가 직접 식재료를 하나씩 텍스트로 입력하는 번거로움을 줄이기 위해, 냉장고 내부 사진을 촬영하거나 업로드하면 OpenRouter API의 `google/gemma-4-26b-a4b-it:free` 비전 모델을 활용하여 사진 속 식재료를 자동으로 추출·인식하고 구조화된 데이터로 변환합니다.
- **핵심 가치**: 직관적인 모바일/데스크톱 반응형 UI와 정확도 높은 AI 이미지 인식을 통한 사용자 입력 단계의 극적인 간소화.

---

## 2. 사용자 스토리 (User Stories)

- **US 1-1**: 사용자로서, 모바일 브라우저에서 냉장고 문을 열고 즉시 카메라로 사진을 찍거나 갤러리의 사진을 업로드할 수 있어야 한다.
- **US 1-2**: 사용자로서, 사진 업로드 후 AI가 식재료를 분석하는 동안 직관적인 로딩 피드백(진행률/애니메이션)을 볼 수 있어야 한다.
- **US 1-3**: 사용자로서, AI가 인식한 식재료 목록(예: 계란, 대파, 양파 등)을 태그/카드 형태로 확인하고, 잘못 인식된 것은 삭제하거나 누락된 재료를 수동으로 추가/수정할 수 있어야 한다.
- **US 1-4**: 데스크톱 사용자로서, 이미지 파일을 드래그 앤 드롭(Drag & Drop)하여 손쉽게 업로드할 수 있어야 한다.

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 이미지 입력 & 업로드 모듈
1. **입력 방식 지원**:
   - 모바일: 디바이스 기본 카메라 연동 촬영 (`capture="environment"`), 사진 보관함 선택.
   - 데스크톱/태블릿: 파일 탐색기 선택 및 Drag & Drop 영역 지원.
2. **클라이언트 전처리 (성능 최적화)**:
   - 파일 포맷: `image/jpeg`, `image/png`, `image/webp`, `image/heic` (HEIC는 브라우저 단에서 JPEG 변환).
   - 용량 제한: 원본 최대 15MB 제한.
   - 자동 압축/리사이즈: 브라우저 Canvas API 등을 활용하여 최대 해상도 1920x1080, 용량 1~2MB 수준으로 리사이즈 후 Base64 또는 Blob 생성 (네트워크 전송 속도 향상 및 토큰 절약).
3. **미리보기 및 재촬영**:
   - 업로드된 이미지 썸네일 미리보기.
   - '다시 찍기/다른 사진 선택' 버튼 제공.

### 3.2 AI 비전 분석 모듈 (OpenRouter API 연동)
1. **모델 지정**: `google/gemma-4-26b-a4b-it:free`
2. **API 호출 방식**:
   - 백엔드 프록시 API(권장: API Key 노출 방지)를 통해 OpenRouter API 호출.
   - 이미지를 Base64 Data URL 또는 이미지 URL 형식으로 멀티모달 프롬프트와 함께 전송.
3. **추출 정보**:
   - 식재료 이름 (국문 기준)
   - 대략적인 수량/상태 (식별 가능한 경우: 예: 계란 3개, 반쯤 남은 양파 등)
   - 카테고리 분류 (채소/과일, 육류/해산물, 유제품, 조미료/소스, 가공식품 등)
4. **출력 제약 (JSON Output)**:
   - 후속 2단계 처리를 위해 순수 JSON 스키마 형태로 반환하도록 시스템 프롬프트 엄격 제어.

### 3.3 식재료 확인 및 인터랙티브 편집 모듈
1. **인식 결과 화면**:
   - 카테고리별 배지(Badge) 또는 칩(Chip) 컴포넌트로 인식된 재료 나열.
2. **수정/보완 인터랙션**:
   - 재료 태그의 `X` 버튼 클릭 시 즉시 제거.
   - '재료 추가' 인풋창을 통해 오인식되거나 보이지 않는 재료(예: 소금, 간장 등 기본 양념) 수동 추가.
   - 재료 이름 탭 시 인라인 편집 가능.
3. **다음 단계 전환**:
   - 최소 1개 이상의 식재료가 확정되면 "레시피 추천받기(2단계)" 버튼 활성화.

---

## 4. 기술 스택 및 아키텍처 (Tech Stack & Architecture)

| 구분 | 추천 기술 스택 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js (또는 Vue 3 / Vite) | 반응형 웹, 컴포넌트 기반 아키텍처 |
| **Styling** | Tailwind CSS + shadcn/ui | 모바일 퍼스트 반응형 레이아웃, 모던 UI |
| **Backend / API Route** | Next.js App Router API or Express/FastAPI | OpenRouter API Key 보호 및 중계 서버 |
| **AI Vision Provider** | OpenRouter API | 모델: `google/gemma-4-26b-a4b-it:free` |
| **Client Image Processing** | `browser-image-compression` | 클라이언트 사이드 이미지 리사이징 |

---

## 5. UI/UX 및 반응형 화면 기획

### 5.1 반응형 브레이크포인트
- Mobile: `360px ~ 640px` (원터치 촬영 버튼 강조, 풀스크린 카드)
- Tablet: `641px ~ 1024px` (2열 레이아웃: 좌측 이미지 미리보기, 우측 재료 목록)
- Desktop: `1025px+` (최대 폭 960px 컨테이너, 좌우 분할 뷰)

### 5.2 화면 플로우 (Screen Flow)
1. **[홈 / 업로드 전]**:
   - 가이드 문구: "냉장고 사진 한 장으로 시작하는 맞춤 요리"
   - 카메라/갤러리 선택 버튼 (모바일 큰 터치 영역).
2. **[이미지 로딩 & 분석 중]**:
   - 스켈레톤 UI 또는 회전하는 로더 + 위트 있는 안내 텍스트 ("냉장고 안의 재료들을 열심히 살피고 있어요...").
3. **[인식 완료 & 검토 화면]**:
   - 상단: 업로드한 냉장고 사진 (축소형 썸네일, 클릭 시 확대).
   - 중앙: 인식된 식재료 태그 목록 (수정/삭제/추가 가능).
   - 하단: 고정 플로팅 액션 버튼 (FAB) "이 재료들로 레시피 만들기 ->".

---

## 6. API 명세 및 프롬프트 엔지니어링

### 6.1 OpenRouter 요청 프롬프트 (System & User Prompt)
- **Model**: `google/gemma-4-26b-a4b-it:free`
- **System Prompt**:
```text
You are an expert culinary vision assistant.
Analyze the provided refrigerator image carefully and identify all visible food ingredients, drinks, condiments, and groceries.
Return ONLY a valid JSON object matching the requested schema without markdown formatting or codeblocks.
```
- **User Prompt**:
```text
Identify all visible ingredients from this refrigerator image.
Format your output strictly as:
{
  "ingredients": [
    {
      "name": "string (Korean ingredient name, e.g., 계란, 양파, 김치)",
      "category": "string (채소/과일 | 육류/수산 | 유제품 | 양념/소스 | 가공식품 | 기타)",
      "confidence": "high | medium | low",
      "quantity_estimate": "string (optional, e.g., 2개, 반 통)"
    }
  ]
}
```

### 6.2 내부 API 엔드포인트 명세
- **Endpoint**: `POST /api/vision/analyze`
- **Request Body**:
  ```json
  {
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "ingredients": [
        { "name": "계란", "category": "유제품", "confidence": "high", "quantity_estimate": "4개" },
        { "name": "대파", "category": "채소/과일", "confidence": "high", "quantity_estimate": "1단" },
        { "name": "두부", "category": "가공식품", "confidence": "medium", "quantity_estimate": "1모" }
      ]
    }
  }
  ```

---

## 7. 예외 처리 및 엣지 케이스 (Error Handling & Edge Cases)

1. **식재료가 거의 식별되지 않는 경우 (어두운 사진/초점 흐림)**:
   - "식재료를 명확히 찾지 못했습니다. 조명을 켜고 다시 찍거나, 아래에서 직접 재료를 입력해보세요!" 안내 팝업 노출.
2. **OpenRouter API 무료 티어 Rate Limit / 503 에러 발생 시**:
   - 지수 백오프(Exponential Backoff)로 최대 2회 자동 재시도.
   - 재시도 실패 시 친절한 오류 메시지 제공 ("AI 서비스 이용량이 많아 지연되고 있습니다. 잠시 후 다시 시도해주세요").
3. **비식품 사진 업로드 (예: 사람, 풍경, 가구)**:
   - 식재료가 감지되지 않으면 빈 배열 반환 및 사용자 안내.
4. **네트워크 단절**:
   - 모바일 오프라인 상태 감지 시 토스트 알림 표시.

---

## 8. 완료 조건 및 성공 지표 (Acceptance Criteria)

- [ ] 모바일/PC 반응형 브라우저에서 이미지 촬영 및 업로드가 정상 동작한다.
- [ ] OpenRouter의 `google/gemma-4-26b-a4b-it:free` 모델을 통해 냉장고 이미지에서 식재료가 3개 이상 정상 추출된다.
- [ ] 추출된 식재료 태그를 사용자가 직접 삭제, 추가, 수정할 수 있다.
- [ ] 식재료 편집이 완료된 데이터가 2단계(레시피 생성)로 상태값(State) 유실 없이 전달된다.
