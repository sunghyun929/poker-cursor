# Render 배포 가이드

## 배포 전 준비사항

1. GitHub 리포지토리에 코드 업로드
2. Render 계정 생성 및 GitHub 연결

## 배포 설정

### 자동 배포
- `render.yaml` 파일이 포함되어 있어 자동으로 설정됩니다
- Render에서 리포지토리 연결 시 자동으로 감지됩니다

### 수동 배포 설정
Render 대시보드에서 다음 설정을 사용하세요:

- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free (또는 원하는 플랜)

### 환경 변수
- `NODE_ENV`: production
- `PORT`: 10000 (Render가 자동 설정)

## 배포 과정

1. GitHub에 코드 push
2. Render에서 새 Web Service 생성
3. GitHub 리포지토리 연결
4. 자동 빌드 및 배포 대기
5. 배포 완료 후 제공되는 URL로 접속

## 확인사항

- 웹소켓 연결이 정상 작동하는지 확인
- 게임 생성 및 참여가 정상 작동하는지 확인
- 모든 게임 기능이 정상 작동하는지 확인

## 문제 해결

### 빌드 실패
- 로그에서 누락된 의존성 확인
- `package.json`의 의존성 버전 확인

### 웹소켓 연결 실패
- HTTPS 환경에서 WSS 프로토콜 사용 확인
- Render의 웹소켓 지원 확인

### 메모리 부족
- Free 플랜의 메모리 제한 확인
- 필요시 유료 플랜으로 업그레이드