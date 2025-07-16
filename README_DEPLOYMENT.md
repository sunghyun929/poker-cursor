# 포커 게임 배포 가이드

## Render에서 배포하기

### 1. Render 계정 생성 및 연결
1. [Render.com](https://render.com)에서 계정 생성
2. GitHub 저장소와 연결

### 2. 웹 서비스 생성
1. Render 대시보드에서 "New +" → "Web Service" 선택
2. GitHub 저장소 선택
3. 다음 설정 사용:
   - **Name**: poker-game (또는 원하는 이름)
   - **Environment**: Node
   - **Region**: Oregon (또는 가장 가까운 지역)
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 3. 환경 변수 설정
Render 설정에서 다음 환경 변수 추가:
- `NODE_ENV`: `production`
- `PORT`: `10000`

### 4. 배포 완료
- 배포 과정은 자동으로 진행됩니다
- 약 5-10분 후 `.onrender.com` 도메인으로 접근 가능
- WebSocket과 실시간 채팅이 모두 작동합니다

## 주요 기능
- ✅ 텍사스 홀덤 포커 게임
- ✅ 실시간 멀티플레이어 (WebSocket)
- ✅ 채팅 시스템
- ✅ 반응형 UI (모바일/데스크탑)
- ✅ 상대 단위 기반 레이아웃
- ✅ 파산 vs 올인 구분
- ✅ 사이드 팟 계산

## 모바일 최적화
- 가로 화면 모드 권장
- 상대 단위(vw, vh) 기반 반응형 디자인
- 터치 친화적 UI

## 문제 해결
배포 중 문제가 발생하면:
1. Render 로그 확인
2. 빌드 과정에서 오류 메시지 확인
3. 환경 변수가 올바르게 설정되었는지 확인