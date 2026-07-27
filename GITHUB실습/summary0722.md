📝 개발 환경 & Git 핵심 개념 정리
1. 개발 환경 (IDE / 에디터) 비교
도구	특징 및 용도	비고
VS Code	범용성이 뛰어남 (넘사벽 활용도)	다양한 언어 및 플러그인 지원
PyCharm	파이썬 개발 특화 IDE	파이썬 프로젝트 전문 기능 내장
Jupyter Notebook	실행 결과 및 데이터 시각화 특화	코드 블록 단위 즉시 실행 / 구글 Colab과 유사
> 💡 **Ghostty / Kitty 등:** 터미널 에뮬레이터 프로그램이며, 에디터나 IDE와는 다름.
---
2. Git 프로젝트 시작하기
`git init`: 새로운 폴더를 만들고 Git으로 버전 관리를 시작할 때 필수 실행.
`git clone [URL]`: 원격 저장소의 프로젝트를 가져올 때는 이미 Git 설정이 포함되어 있으므로 `git init`을 따로 할 필요 없음.
---
3. Git의 3가지 핵심 공간 (Working Directory 영역)
Working Directory (작업 디렉토리)
현재 작업 중인 공간.
Untracked File: 아직 Git이 추적하지 않는(업데이트/등록되지 않은) 새로운 파일.
Staging Area (준비 영역)
다음 커밋에 포함할 변경사항을 골라 올려두는 공간.
명령어: `git add [파일명]`
Repository / Commit (저장소 / 확정 영역)
변경사항을 하나의 확정된 버전으로 기록하고 저장하는 공간.
명령어: `git commit -m "메시지"`
---
4. 상태 확인 및 커밋 규칙
상태 확인: `git status` 명령어로 현재 작업 영역의 상태를 조회.
좋은 커밋 메시지 예시:
✅ `README 작성`
✅ `설치 방법 추가`
✅ `로그인 기능 오타 수정`
좋지 않은 커밋 메시지 예시:
❌ `수정`
❌ `작업함`
❌ `최종_진짜최종`
---
5. 브랜치와 HEAD의 개념 (로컬 저장소)
main / master: 현재 작업 중인 메인 브랜치.
HEAD: 현재 내가 작업하고 가리키고 있는 커밋의 위치.
`HEAD -> main`: 현재 `main` 브랜치의 최신 커밋을 바라보고 있다는 의미.
---
6. 원격 저장소 (Remote Repository)
GitHub와 같이 인터넷상에 존재하는 Git 저장소. 다른 컴퓨터로 작업 환경을 옮기거나, 팀원과 협업하고, 로컬 커밋을 안전하게 백업할 때 사용.
🔗 주요 명령어
원격 저장소 연결:
`​`​`bash git remote add origin [원격 저장소 URL] `​`​`
로컬 커밋을 원격 저장소로 업로드:
`​`​`bash
git push -u origin main
(기존/구버전 브랜치명이 master인 경우: git push -u origin master)
`​`​`
---
