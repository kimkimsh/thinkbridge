# 11. Nested Git Repository Cleanup (frontend/.git 제거)

## 작업 일자
2026-04-12

## 증상 (Symptom)
`frontend/` 폴더가 Vercel과 연동되어 있으나, 동시에 내부에 별도의 `.git` 디렉토리와 파일들이 존재하여 "Git repo 안에 또 다른 Git repo가 있는" 중첩 구조가 형성됨.

- 외부 repo: `/home/mark-minipc/workspace/thinkbridge/.git` (remote: `github.com/kimkimsh/thinkbridge`, branch `main`)
- 내부 repo: `/home/mark-minipc/workspace/thinkbridge/frontend/.git` (remote 없음, branch `master`)

## 근본 원인 (Root Cause)
`npx create-next-app` 계열 scaffold 도구가 프로젝트 생성 시 자동으로 `git init`을 수행하여 `frontend/` 내부에 독립 repo를 만든 후, 이후 상위 디렉토리에서 별도로 `git init`이 실행된 것으로 추정.

일반적으로 부모 repo에서 `git add frontend/`를 할 때 하위에 `.git`이 있으면 Git은 이를 **submodule (gitlink, mode `160000`)** 로 자동 처리해야 하지만, 이 프로젝트에서는 `ls-tree HEAD frontend` 결과가 `040000 tree ...`로 나타남. 이는 개별 파일이 커밋된 뒤 내부 `.git`이 추가된 순서였음을 시사함.

## 진단 과정 (Diagnosis)

### 1. 중첩 repo 모드 확인
```
git ls-tree HEAD frontend
→ 040000 tree cc2158ee... frontend
```
`160000` (submodule)이 아닌 `040000` (tree)로 확인됨. 외부 repo가 frontend 내부 파일을 개별 파일로 정상 추적 중.

### 2. 파일 목록 동일성 검증
- 외부 repo가 `frontend/` 하위로 추적하는 파일: 60개
- 내부 repo가 추적하는 파일: 60개
- `diff <(git ls-files frontend/) <(cd frontend && git ls-files)` 결과: **빈 출력 (완전 일치)**

### 3. 파일 내용 동일성 검증
샘플 파일 `page.tsx`의 blob hash 비교:
- 외부 repo: `605d5b4f50d9f74283807031cab6deb19dce369d`
- 내부 repo: `605d5b4f50d9f74283807031cab6deb19dce369d`

완전 동일.

### 4. 내부 repo 고유 자산 확인
- stash: 없음
- 다른 branch: 없음 (`master`만 존재)
- reflog: 3개 commit만 존재 (`feat: initial commit`, `revised`, `revised`)
- uncommitted 변경: 없음
- unpushed 작업: remote가 없으므로 해당 없음

결론: 내부 repo에는 외부 repo에 없는 고유 데이터가 전혀 없음.

### 5. Vercel 연동 메커니즘 분석
- `.vercel/project.json`만 존재 (`frontend/.vercel/`)
  - `projectId`: `prj_hGjjTffMXgDqeKunv3kZyO0ZdFW5`
  - `orgId`: `team_A8aE7hxQUmWuJCHTDAF6enVn`
- 외부 repo에는 `.vercel/` 없음, `vercel.json` 없음
- 결론: Vercel은 **CLI 기반 배포** (`vercel` 명령으로 직접 push), Git remote와 독립적으로 작동

## 적용한 수정 (Fix Applied)

### 1. 내부 `.git` 디렉토리 삭제
```bash
rm -rf /home/mark-minipc/workspace/thinkbridge/frontend/.git
```
- 삭제 대상 크기: 1.4M
- 보존된 항목: `frontend/.gitignore`, `frontend/.vercel/`, `frontend/.env.example`, `frontend/.env.local`, 모든 소스 파일

### 2. 루트 `.gitignore`에 Vercel 경로 명시 추가
```
# Vercel CLI local linkage (frontend deploys via .vercel/project.json)
.vercel/
frontend/.vercel/
```
`frontend/.gitignore`에도 `.vercel` 규칙이 이미 존재하지만, 루트에 명시하여 의도를 분명히 함.

## 검증 결과 (Verification)

삭제 직후 외부 repo 상태:
```
$ git status
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean

$ git ls-files frontend/ | wc -l
60
```

추적 파일 수 변화 없음(60개 유지), dirty 변경 없음, Vercel 연동 정보 보존 확인.

## 영향 범위 (Impact)
- **코드**: 변경 없음 (파일 내용·구조 동일)
- **Vercel 배포**: 영향 없음 (`.vercel/project.json` 보존, CLI 배포 정상 동작)
- **GitHub 외부 repo**: 영향 없음 (frontend 파일 60개 그대로 추적)
- **로컬 개발 환경**: `frontend/`에서 `git` 명령을 실행하면 이제 외부 repo (`main` 브랜치)가 반응함. 이전의 혼란스러운 `master` 브랜치 상태가 사라짐.

## 향후 고려사항 (Future Consideration)

현재 Vercel은 **CLI push 방식**이다. 공모전 심사위원에게 "GitHub push → 자동 배포" 플로우를 보여주고 싶다면 Vercel 대시보드에서 다음과 같이 변경 가능:

1. Vercel 프로젝트 설정 → Git → GitHub 연동
2. `kimkimsh/thinkbridge` 저장소 선택
3. **Root Directory**: `frontend` 로 지정
4. 이후 `main` 브랜치 push 시 자동 배포

단, 현재 CLI 배포도 정상 동작 중이므로 공모전 제출 직전 시점에는 변경하지 않는 것이 안전.

## 관련 파일
- 삭제: `frontend/.git/` (전체)
- 수정: `.gitignore`
- 신규: `docs/work_log/11_nested_git_cleanup.md`

## 관련 커밋
(이 작업 직후 커밋 예정)
