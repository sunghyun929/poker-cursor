# GitHub 업로드 가이드 (웹 브라우저 사용)

## 문제 해결 방법

### 1. 새 GitHub 저장소 생성
1. GitHub.com에 로그인
2. 우상단 "+" 버튼 → "New repository" 클릭
3. Repository name: `poker-game` (또는 원하는 이름)
4. Public 선택
5. "Create repository" 클릭

### 2. 파일 업로드 전략 (폴더별 분할 업로드)

#### A. 루트 파일들부터 업로드
먼저 다음 파일들을 개별적으로 업로드:
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`
- `components.json`
- `render.yaml`
- `README.md`
- `DEPLOYMENT.md`
- `.gitignore`

#### B. shared 폴더 업로드
1. "Create new file" 클릭
2. 파일명에 `shared/schema.ts` 입력
3. 파일 내용 복사하여 붙여넣기
4. "Commit new file" 클릭

#### C. server 폴더 업로드
각 파일을 개별 생성:
- `server/index.ts`
- `server/routes.ts`
- `server/storage.ts`
- `server/vite.ts`
- `server/game/GameManager.ts`
- `server/game/HandEvaluator.ts`
- `server/game/PokerGame.ts`

#### D. client 폴더 업로드
주요 파일들만 업로드:
- `client/index.html`
- `client/src/main.tsx`
- `client/src/App.tsx`
- `client/src/index.css`
- `client/src/vite-env.d.ts`

그리고 각 하위 폴더:
- `client/src/pages/` 폴더의 모든 파일
- `client/src/components/poker/` 폴더의 모든 파일
- `client/src/components/ui/` 폴더의 주요 파일들
- `client/src/hooks/` 폴더의 모든 파일
- `client/src/lib/` 폴더의 모든 파일

### 3. .git 파일 문제 해결
- `.git` 폴더는 업로드하지 마세요
- GitHub가 자동으로 버전 관리를 처리합니다
- "This file is hidden" 메시지가 나오는 파일들은 무시하세요

### 4. 업로드 팁
- 한 번에 너무 많은 파일을 선택하지 마세요 (최대 10-15개)
- 큰 폴더는 하위 폴더별로 나누어 업로드
- 각 업로드 후 "Commit changes" 버튼 클릭
- 파일 구조가 복잡하면 "Create new file"을 사용해서 경로와 함께 생성

### 5. 완료 확인
모든 파일 업로드 후 저장소에서 다음 구조 확인:
```
poker-game/
├── client/
├── server/
├── shared/
├── package.json
├── render.yaml
└── 기타 설정 파일들
```

### 6. Render 배포
1. Render.com → "New" → "Blueprint"
2. GitHub 저장소 연결
3. 자동 배포 시작
4. 완료 후 제공되는 URL로 접속