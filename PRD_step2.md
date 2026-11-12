# [PRD] 2단계: 식재료 기반 AI 맞춤 레시피 생성 및 추천 (Recipe Generation)

---

## 1. 개요 (Overview)

### 1.1 프로젝트 배경 및 목적
- **목적**: 1단계에서 인식 및 검증된 식재료 목록을 기반으로, OpenRouter API의 `google/gemma-4-26b-a4b-it:free` 모델을 활용하여 사용자가 냉장고 속 재료만으로 즉시 조리할 수 있는 실현 가능한 맞춤형 요리 레시피(2~3종)를 생성·제공합니다.
- **핵심 가치**: "오늘 뭐 먹지?" 고민 해결, 음식물 쓰레기 감소, 냉장고 속 남은 재료의 100% 활용.

---

## 2. 사용자 스토리 (User Stories)

- **US 2-1**: 사용자로서, 1단계에서 확정된 식재료 목록 외에 조리 시간(15분/30분/무제한), 난이도(초급/중급), 식사 유형(간편식/다이어트/안주 등) 등의 세부 필터를 선택하여 레시피를 추천받고 싶다.
- **US 2-2**: 사용자로서, AI가 레시피를 생성하는 동안 재미있는 팁이나 조리 인용구가 포함된 스켈레톤 화면을 보며 지루하지 않게 기다릴 수 있어야 한다.
- **US 2-3**: 사용자로서, 추천된 레시피 중 마음에 드는 요리를 선택하여 단계별 조리 순서(Step-by-step), 필요한 양념 및 대체 가능한 식재료를 명확하게 확인하고 싶다.
- **US 2-4**: 사용자로서, 냉장고에 없는 추가 필수 재료가 무엇인지 한눈에 구분할 수 있어야 한다 (예: "집에 있는 재료: 계란, 파 / 추가 필요: 소금, 식용유").

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 사용자 맞춤 필터 및 옵션 설정
1. **기본 보유 양념 토글**:
   - 일반 가정 기본 양념(간장, 소금, 설탕, 식용유, 고춧가루, 후추, 다진마늘 등)의 보유 여부를 간편 토글로 체크.
2. **취향/상황 필터**:
   - **조리 소요 시간**: 15분 이내(초간단) / 30분 이내 / 상관없음.
   - **요리 목적/카테고리**: 혼밥/자취요리, 다이어트/건강식, 든든한 한 끼, 홈술/안주.
   - **매운맛/난이도**: 순한맛/매콤함, 초보자용/일반.

### 3.2 AI 레시피 생성 모듈 (OpenRouter API 연동)
1. **모델 지정**: `google/gemma-4-26b-a4b-it:free`
2. **생성 전략**:
   - 인식된 냉장고 식재료를 메인으로 사용하는 실현 가능한 요리 2~3개 추천.
   - '냉장고 재료 소진 우선형'과 '조리 난이도 최저형' 등 다양성 확보.
3. **응답 데이터 포맷 (Strict JSON Schema)**:
   - 요리명 (Title)
   - 한 줄 소개 (Description)
   - 소요 시간 (Cooking Time) 및 난이도 (Difficulty: 쉬움/보통/어려움)
   - 재료 구분:
     - `available_ingredients`: 냉장고에 있는 재료 목록과 활용량
     - `pantry_ingredients`: 기본 양념/필수 추가 재료
     - `substitutes`: 없을 경우 대체할 수 있는 재료
   - 단계별 조리법 (`steps`: 순서 번호, 지침, 예상 소요 분)
   - 셰프의 꿀팁 (`chef_tips`)
   - 예상 영양/칼로리 정보 (`estimated_calories`)

### 3.3 레시피 결과 탐색 및 상세 인터랙션 UI
1. **레시피 카드 덱 (Deck / Tab View)**:
   - 모바일: 좌우 스와이프 가능한 카드 캐러셀 또는 탭 형태 (2~3개 레시피 요약 카드).
   - 데스크톱: 3열 그리드 카드 배치.
2. **단계별 인터랙티브 조리 뷰 (Cooking Mode)**:
   - "요리 시작하기" 버튼 클릭 시, 한 단계씩 큼직한 글씨로 볼 수 있는 '조리 모드(Step View)' 진입.
   - 요리 타이머 기능 제공 (예: "3분간 끓여주세요" 클릭 시 웹 타이머 작동).
3. **다음 단계 연계 (3단계 저장)**:
   - 각 레시피 카드 상단에 '북마크(저장하기)' 아이콘 배치 (3단계 프로필/저장 기능과 연결).

---

## 4. 기술 스택 및 아키텍처

| 구분 | 추천 기술 스택 | 설명 |
| :--- | :--- | :--- |
| **Frontend State** | React State / Zustand or Pinia | 1단계 식재료 및 2단계 생성 레시피 글로벌 상태 관리 |
| **Animation & UI** | Framer Motion, Lucide Icons | 카드 전환 애니메이션, 모바일 터치 제스처 |
| **Backend / API Route** | Next.js API Routes (Serverless) | 프롬프트 조립 및 OpenRouter 요청 처리 |
| **AI LLM Provider** | OpenRouter API | 모델: `google/gemma-4-26b-a4b-it:free` |

---

## 5. UI/UX 및 반응형 화면 기획

### 5.1 레이아웃 구조
- **모바일 (360px ~ 640px)**:
  - 상단: 1단계 재료 요약 바 (클릭 시 접힘/펼침).
  - 중앙: 옵션 태그 선택기 (가로 스크롤 칩).
  - 결과 화면: 스와이프 가능한 상하/좌우 풀카드 레이아웃.
- **데스크톱 (1025px+)**:
  - 좌측 사이드바 (25%): 선택된 식재료 태그 + 취향 필터 옵션.
  - 우측 메인 영역 (75%): 생성된 3가지 레시피 비교 그리드 카드.

### 5.2 사용자 인터랙션 흐름
1. `[1단계 완료]` → 식재료 리스트가 상단 바에 고정.
2. `[옵션 선택]` → 조리시간, 카테고리 태그 클릭 후 "레시피 생성" 버튼 클릭.
3. `[로딩 화면]` → Lottie 애니메이션 (지글지글 프라이팬 등) + 요리 상식 문구 롤링.
4. `[결과 확인]` → 레시피 카드 열람, 각 단계별 팁 확인, 3단계 '레시피 저장' 버튼 클릭 유도.

---

## 6. API 명세 및 프롬프트 엔지니어링

### 6.1 OpenRouter 요청 프롬프트 (System & User Prompt)
- **Model**: `google/gemma-4-26b-a4b-it:free`
- **System Prompt**:
```text
You are a professional chef and recipe developer specializing in practical home cooking and zero-waste refrigerator clearing.
Your task is to generate 2 to 3 creative, delicious, and easy-to-cook recipes based strictly on the provided available ingredients.
Prioritize the given ingredients as primary ingredients. You may assume basic pantry essentials (salt, sugar, water, soy sauce, cooking oil) are available.
Always output purely valid JSON adhering to the specified schema, without markdown blocks.
```
- **User Prompt 예시**:
```text
Available Refrigerator Ingredients: [계란, 대파, 두부, 양파]
User Preferences:
- Maximum Cooking Time: 20 minutes
- Meal Category: 자취생 간단 한 끼
- Available Pantry Items: [소금, 설탕, 간장, 식용유, 고춧가루]

Output Schema:
{
  "recipes": [
    {
      "id": "recipe_1",
      "title": "백종원식 초간단 대파계란 덮밥",
      "description": "대파기름과 고소한 반숙 계란이 어우러진 10분 완성 덮밥",
      "cooking_time": "15분",
      "difficulty": "쉬움",
      "main_ingredients_used": ["대파 1대", "계란 2개"],
      "pantry_items_needed": ["간장 1스푼", "식용유 2스푼", "밥 1공기"],
      "substitutes": { "대파": "쪽파 또는 양파" },
      "steps": [
        "1. 대파를 송송 썰어 팬에 식용유와 함께 볶아 파기름을 냅니다.",
        "2. 파가 노릇해지면 계란을 깨 넣고 스크램블하듯 살짝 익힙니다.",
        "3. 간장을 둘러 향을 입힌 후 밥 위에 얹어 완성합니다."
      ],
      "chef_tip": "간장을 팬 가장자리에 둘러 태우듯 넣으면 불맛이 확 살아납니다.",
      "estimated_calories": "420 kcal"
    }
  ]
}
```

### 6.2 내부 API 엔드포인트 명세
- **Endpoint**: `POST /api/recipe/generate`
- **Request Body**:
  ```json
  {
    "ingredients": ["계란", "대파", "두부"],
    "preferences": {
      "cookingTime": 20,
      "category": "quick",
      "pantry": ["간장", "식용유", "소금"]
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "recipes": [ /* 상기 JSON Schema 배열 */ ]
  }
  ```

---

## 7. 예외 처리 및 엣지 케이스 (Error Handling & Edge Cases)

1. **환각(Hallucination) 방지**:
   - 없는 고가의 식재료(예: 트러플, 고급 치즈 등)를 무단으로 사용하는 현상 방지를 위해 프롬프트에 `Do not introduce uncommon ingredients not listed in pantry` 페널티 부여.
2. **조합이 어려운 재료 (예: 수박 + 된장 등)**:
   - 부조화 재료의 경우, 억지로 섞기보다 재료별 개별 활용 요리를 분리 추천하거나 간단한 퓨전 요리 가이드 제공.
3. **JSON 파싱 에러 대응**:
   - Gemma 모델 출력에 간혹 코드블록(```json)이 포함되는 경우 백엔드 정규식 파서(`replace(/```json/g, '')`)로 안정적인 파싱 보장.
4. **API 지연 시 폴백 (Fallback)**:
   - 응답 시간이 15초 이상 지연될 경우, 안내 토스트와 함께 진행 상태 지속 유지.

---

## 8. 완료 조건 및 성공 지표 (Acceptance Criteria)

- [ ] 1단계에서 전달받은 식재료가 2단계 레시피 생성 프롬프트에 정확히 바인딩된다.
- [ ] OpenRouter `google/gemma-4-26b-a4b-it:free` 모델을 통해 2~3개의 현실적인 레시피가 JSON으로 정상 반환된다.
- [ ] 생성된 레시피 카드가 모바일 및 데스크톱 반응형 뷰에서 깨짐 없이 렌더링된다.
- [ ] 각 레시피의 단계별 조리법 및 셰프 팁이 정상 출력된다.
- [ ] '저장하기' 버튼을 누르면 3단계 프로필/북마크 데이터로 연결될 준비가 완료된다.
