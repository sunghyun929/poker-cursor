# GitHub 압축 파일 업로드 방법

## 방법 1: GitHub Release 업로드 (권장)

1. **GitHub에서 새 저장소 생성**
   - GitHub.com → "New repository"
   - 저장소 이름: `poker-game`
   - Public 선택 후 생성

2. **Release를 통한 압축 파일 업로드**
   - 저장소 생성 후 → "Releases" 탭 클릭
   - "Create a new release" 클릭
   - Tag version: `v1.0.0` 입력
   - Release title: `Poker Game Source Code`
   - 아래 "Attach binaries" 영역에 압축 파일 드래그 앤 드롭
   - "Publish release" 클릭

3. **압축 파일에서 소스 코드 추출**
   - Release에서 압축 파일 다운로드
   - 압축 해제 후 내용을 저장소 메인 브랜치에 커밋

## 방법 2: GitHub Desktop 사용

1. **GitHub Desktop 다운로드 및 설치**
   - desktop.github.com에서 다운로드
   - GitHub 계정으로 로그인

2. **로컬에서 저장소 클론**
   - "Clone a repository from the Internet"
   - 생성한 저장소 URL 입력

3. **파일 복사 및 커밋**
   - 프로젝트 파일들을 클론된 폴더에 복사
   - GitHub Desktop에서 변경사항 확인
   - "Commit to main" 클릭
   - "Push origin" 클릭

## 방법 3: 웹에서 직접 압축 업로드

1. **README.md 파일 생성**
   - 저장소에서 "Create new file"
   - 파일명: `README.md`
   - 내용은 간단한 프로젝트 설명

2. **Issue에 압축 파일 첨부**
   - "Issues" 탭 → "New issue"
   - 제목: "Source Code Archive"
   - 압축 파일을 드래그 앤 드롭
   - GitHub가 자동으로 다운로드 링크 생성

3. **수동으로 파일 추출 및 업로드**
   - Issue에서 압축 파일 다운로드
   - 로컬에서 압축 해제
   - 웹 인터페이스로 폴더별 업로드

## 현재 상황에서 가장 쉬운 방법

**GitHub Release 방법**이 가장 간단합니다:
1. 새 저장소 생성
2. Releases 탭에서 압축 파일 업로드
3. 나중에 Render 배포 시 Release에서 소스 코드 다운로드

이 방법으로 한 번에 모든 파일을 업로드할 수 있습니다!