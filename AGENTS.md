# AGENTS.md: AI 에이전트 개발 지침 및 운영 규칙

이 문서는 **"냉장고 사진 식재료 인식 및 맞춤 레시피 추천 웹앱"** 개발에 참여하는 AI 에이전트가 반드시 준수해야 하는 아키텍처 원칙, 개발 환경 제약, 단계별 진행 가이드 및 행동 규칙을 정의합니다.

---

## 1. 핵심 개발 규칙 (Core Rules - 절대 준수)

1. **기술 스택 제약 (순수 웹 표준 + Vercel Serverless)**:
   - **프론트엔드**: 순수 **HTML5, CSS3, Vanilla JavaScript**만 사용 (`index.html`, `style.css`, `script.js`).
   - **프레임워크 및 번들러/빌드 도구 사용 절대 금지** (React, Vue, Next.js, Vite, Webpack, Tailwind CLI 등 일체 사용 금지).
   - **백엔드**: Vercel 서버리스 함수 (`api/*.js` - Node.js 환경)만 사용.
2. **OpenRouter API 호출 보안**:
   - 클라이언트(`script.js`)에서 OpenRouter API를 직접 호출하는 것을 엄격히 금지합니다.
   - 모든 AI 추론 호출은 `api/` 디렉토리 내의 서버리스 함수를 통해서만 수행합니다.
   - 환경 변수:
     - API 키: `process.env.OPENROUTER_API_KEY`
     - 모델 이름: `process.env.OPENROUTER_MODEL` (기본값: `google/gemma-4-26b-a4b-it:free`)
3. **단일 기능 단위 점진적 개발 (One Feature at a Time)**:
   - 한 번에 하나의 기능(Feature)만 구현합니다.
   - 기능을 구현한 직후, 사용자가 브라우저나 터미널에서 **어떻게 테스트하고 검증할 수 있는지 구체적인 확인 방법**을 명확히 안내합니다.
4. **모든 코드 한국어 주석 필수**:
   - `index.html`, `style.css`, `script.js`, `api/*.js` 등 작성 및 수정하는 모든 코드 파일에 **상세한 한국어 주석**을 작성합니다.
   - 함수의 역할, 파라미터, 반환값, 비즈니스 로직, 에러 처리 이유를 명시합니다.
5. **환경 변수 및 보안 관리**:
   - 민감한 키는 `.env.local` 파일에 저장합니다.
   - `.env*`, `node_modules`, `.vercel` 등은 반드시 `.gitignore`에 등록하여 버전 관리에서 제외합니다.
6. **터미널 명령 직접 실행**:
   - 필요한 패키지 설치, 로컬 서버 실행, 파일 구조 확인 등 터미널 명령은 사용자가 직접 치게 하지 않고, **에이전트가 직접 실행한 뒤 실행 결과와 상태를 설명**합니다.

---

## 2. 프로젝트 디렉토리 구조 (Directory Structure)

```text
AI개발과실전_프로젝트/
├── index.html            # 메인 단일 페이지 반응형 웹 UI
├── style.css             # 모바일/데스크톱 반응형 순수 CSS
├── script.js             # 클라이언트 상호작용 및 API 통신 (Vanilla JS)
├── api/                  # Vercel 서버리스 함수 디렉토리
│   ├── analyze-image.js  # [1단계] 이미지 분석 및 식재료 추출 (OpenRouter 연동)
│   ├── generate-recipe.js# [2단계] 식재료 기반 레시피 생성 (OpenRouter 연동)
│   └── profile.js        # [3단계] 사용자 프로필/설정 처리 (선택적)
├── .env.local            # 로컬 환경 변수 (OPENROUTER_API_KEY 등, 커밋 금지)
├── .gitignore            # Git 제외 설정
├── package.json          # Node.js 패키지 정의 (필요 시 최소 의존성)
├── PRD_step1.md          # 1단계 상세 기획서 (식재료 인식)
├── PRD_step2.md          # 2단계 상세 기획서 (레시피 생성)
├── PRD_step3.md          # 3단계 상세 기획서 (프로필/저장)
└── AGENTS.md             # 본 가이드 문서
```

---

## 3. 기능 개발 로드맵 (Feature Roadmap & Verification)

에이전트는 아래 순서에 따라 **반드시 한 번에 한 항목씩** 구현하고 사용자 확인 절차를 거칩니다.

### Phase 1: 기반 설정 및 1단계 (이미지 식재료 인식)
1. **[F1-1] 환경 설정 및 기본 골격**:
   - `.gitignore`, `.env.local` 템플릿 구성, 기본 `index.html`, `style.css`, `script.js` 레이아웃 생성.
   - *확인 방법*: 정적 파일 실행 또는 로컬 서버로 기본 UI 렌더링 확인.
2. **[F1-2] 이미지 업로드 & 클라이언트 리사이징**:
   - 카메라/파일 선택 input 및 브라우저 Canvas 기반 이미지 리사이즈/Base64 인코딩.
   - *확인 방법*: 이미지 업로드 시 화면에 미리보기 및 리사이즈된 이미지 데이터 콘솔 출력 확인.
3. **[F1-3] OpenRouter 이미지 분석 서버리스 API (`api/analyze-image.js`)**:
   - `google/gemma-4-26b-a4b-it:free` 모델을 호출하여 식재료 JSON 추출.
   - *확인 방법*: 테스트 이미지를 전송하여 터미널/콘솔에서 식재료 JSON 응답 수신 확인.
4. **[F1-4] 식재료 태그 시각화 및 인터랙티브 편집 UI**:
   - 인식된 재료 태그 표시, 추가, 삭제, 수정 인터랙션 구현.
   - *확인 방법*: 브라우저에서 직접 태그를 클릭해 삭제하고 새 태그를 추가해보기.

### Phase 2: 2단계 (레시피 생성 및 추천)
5. **[F2-1] 요리 조건 옵션 UI (시간, 난이도, 기본 양념)**:
   - 1단계 재료 목록 하단에 조리 시간 및 보유 양념 선택 UI 추가.
   - *확인 방법*: 옵션 선택 시 UI 토글 상태 및 데이터 바인딩 확인.
6. **[F2-2] OpenRouter 레시피 생성 서버리스 API (`api/generate-recipe.js`)**:
   - `google/gemma-4-26b-a4b-it:free` 모델로 맞춤 레시피 2~3종 JSON 생성.
   - *확인 방법*: API 호출 테스트 후 조리 순서, 셰프 팁 등이 포함된 JSON 구조 검증.
7. **[F2-3] 레시피 결과 반응형 카드 및 상세 보기 UI**:
   - 모바일 스와이프/탭 및 데스크톱 그리드 뷰, 로딩 상태 Lottie/애니메이션 구현.
   - *확인 방법*: 추천 레시피 카드가 화면에 깨짐 없이 렌더링되는지 확인.

### Phase 3: 3단계 (사용자 프로필 및 레시피 저장)
8. **[F3-1] 로컬스토리지 기반 레시피 북마크(저장) 기능**:
   - 레시피 카드 북마크 클릭 시 LocalStorage에 저장/해제.
   - *확인 방법*: 브라우저 개발자 도구 Application/Local Storage 및 저장 토스트 알림 확인.
9. **[F3-2] 사용자 프로필 설정 (알레르기, 보유 양념장)**:
   - 프로필 모달을 통해 알레르기 및 식습관 설정 저장. 2단계 레시피 생성 시 자동 주입.
   - *확인 방법*: 특정 알레르기(예: 견과류) 설정 후 레시피 생성 시 해당 재료가 배제되는지 확인.
10. **[F3-3] 보관함(마이페이지) 뷰 및 나만의 메모/별점 관리**:
    - 저장된 레시피 리스트 모아보기, 사용자 요리 메모 및 5점 평점 기능.
    - *확인 방법*: 보관함에서 저장된 레시피를 열어 메모를 입력하고 새로고침 후에도 유지되는지 확인.

---

## 4. 환경 변수 및 설정 가이드

### `.env.local`
```bash
# OpenRouter API 설정
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free

# 로컬 개발 포트 (선택 사항)
PORT=3000
```

### Vercel 로컬 서버 실행 명령
```bash
# Vercel CLI 로컬 개발 서버 구동 (api/ 함수 및 정적 파일 동시 지원)
vercel dev
```

---

## 5. 코드 작성 시 준수 스타일

- **Vanilla JS**: ES6+ 문법(async/await, fetch, destructuring 등)을 적극 사용하되, 가독성을 최우선으로 합니다.
- **주석 예시**:
```javascript
/**
 * 브라우저 캔버스를 이용해 이미지를 리사이징하고 Base64 문자열로 변환합니다.
 * @param {File} file - 사용자가 업로드한 원본 이미지 파일
 * @param {number} maxWidth - 변환할 최대 너비 (기본 1280px)
 * @returns {Promise<string>} Base64 Data URL 문자열
 */
async function compressImage(file, maxWidth = 1280) {
    // 이미지 리사이즈 로직...
}
```
- **CSS**: CSS Flexbox / Grid 기반의 유연한 반응형 레이아웃, CSS 변수(`--primary-color`, `--bg-color` 등)를 활용한 테마 관리.
