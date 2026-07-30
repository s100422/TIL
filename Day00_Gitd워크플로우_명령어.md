## 1. Git 핵심 워크플로우 (4단계 흐름)

Git은 내가 작성한 코드나 파일을 바로 인터넷(GitHub)에 올리지 않고, **총 4단계의 과정**을 거쳐 저장합니다.

1. **Working Directory (내 작업실)**
   * 현재 내 컴퓨터 폴더에서 파일 작성/수정/삭제 작업을 진행하는 공간입니다.
2. **Staging Area (임시 대기소)** ── `git add`
   * 수정된 파일 중 "이 파일만 저장하겠다"고 골라서 임시로 올려두는 장소입니다.
3. **Local Repository (내 컴퓨터 저장소)** ── `git commit`
   * 대기소에 올려둔 파일들을 하나의 버전(기록)으로 만들어 내 컴퓨터 Git DB에 정식 저장합니다.
4. **Remote Repository (원격 저장소 / GitHub)** ── `git push`
   * 내 컴퓨터에 저장된 기록들을 GitHub 온라인 서버로 전송해 안전하게 백업하고 공유합니다.

## 2. 필수 Git 핵심 명령어 정리

### 1) 기본 설정 & 초기화
* `git init` : 현재 폴더를 Git 저장소로 초기화 (내부에 `.git` 숨김 폴더 생성)
* `git clone <URL>` : GitHub 등 원격 저장소의 프로젝트를 내 컴퓨터로 복사해오기
* `git config --global user.name "이름"` : 작성자 이름 등록
* `git config --global user.email "이메일"` : 작성자 이메일 등록

### 2) 상태 확인 & 버전 관리 (가장 많이 씀!)
* `git status` : 현재 변경된 파일들의 상태 확인 (수정됨, 대기 중, 추적 안 됨 등)
* `git add <파일명>` : 특정 파일만 Staging Area에 올리기
* `git add .` : **변경된 모든 파일**을 한 번에 Staging Area에 올리기
* `git commit -m "커밋 메시지"` : Staging Area의 파일들을 메세지와 함께 저장하기
* `git log` : 지금까지 쌓인 커밋 기록(히스토리) 확인하기
* `git log --oneline` : 커밋 히스토리를 한 줄씩 깔끔하게 요약해서 보기

### 3) 원격 저장소(GitHub) 연결 & 동기화
* `git remote add origin <URL>` : 내 로컬 저장소를 원격 저장소(GitHub)와 연결
* `git push -u origin main` : 내 로컬 커밋 내역을 GitHub에 올리기
* `git pull origin main` : GitHub의 최신 변경 사항을 내 컴퓨터로 가져와 합치기

---

## 3. CLI 필수 명령어 요약표 (PowerShell vs Git Bash)

| 기능 | PowerShell | Git Bash / Linux | 비고 |
| :--- | :--- | :--- | :--- |
| **목록 보기 (숨김 파일 포함)** | `ls -Force` | `ls -al` | `.git` 숨김 폴더 확인할 때 사용 |
| **디렉토리 이동** | `cd "경로"` | `cd "경로"` | 띄어쓰기 있으면 큰따옴표 필수 |
| **상위 폴더로 이동** | `cd ..` | `cd ..` | 이전 폴더로 빠져나오기 |
| **빈 폴더 삭제** | `rmdir 폴더명` | `rmdir 폴더명` | 비어있는 폴더만 삭제 |
| **내용물 포함 폴더 삭제** | `rmdir 폴더명 -Recurse -Force` | `rm -rf 폴더명` | **주의:** 영구 삭제됨 (복구 불가) |
| **터미널 화면 지우기** | `cls` / `clear` | `clear` | 터미널 로그 깔끔하게 정리 |

---

## 4. 오늘 해결한 주요 트러블슈팅

### 1) `ls -a` / `ls -al` 입력 시 에러 (`Get-ChildItem...`)
* **원인**: 윈도우 **PowerShell**에서 `ls`는 리눅스 명령어가 아니라 PowerShell 별칭이라 리눅스 옵션(`-a`, `-al`)을 인식 못 함.
* **해결**: PowerShell에서는 `ls -Force`를 쓰거나, **VS Code 터미널을 Git Bash로 변경**해 사용.

### 2) `cd` 경로 이동 안 됨 에러
* **원인**: `바탕 화면`처럼 **경로에 띄어쓰기**가 포함되어 있으면 터미널이 중간에 끊어서 인식함.
* **해결**: 경로 전체를 큰따옴표로 감싸기 (`cd "C:\...\바탕 화면\..."`) 또는 입력 중 **`Tab` 키** 눌러 자동완성 활용.

### 3) 폴더 삭제 시 액세스 권한 부족 (`rmdir` 에러)
* **원인**: 폴더 안에 파일/하위 폴더가 들어있으면 기본 `rmdir` 명령어가 보안상 삭제를 차단함.
* **해결**: 
  * PowerShell: `rmdir 폴더명 -Recurse -Force`
  * Git Bash: `rm -rf 폴더명`

---

## 💡 Tip: VS Code 기본 터미널을 Git Bash로 변경하기
1. VS Code 터미널 우측 상단 **`+` 옆 아래 화살표(`˅`)** 클릭
2. **`Select Default Profile`** 클릭
3. **`Git Bash`** 선택 후 터미널 재열기 (`Ctrl` + `~`)
