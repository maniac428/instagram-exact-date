# Instagram Exact Post Date (KST)

인스타그램 웹의 `329주`, `48주`, `3일` 같은 상대 날짜를 **한국 시간 기준 `YYYY.MM.DD`**로 바꾸는 무료 Tampermonkey 유저스크립트입니다. 날짜에 마우스를 올리면 초 단위 시각과 `(KST)`를 표시합니다.

**상대 날짜를 역산하지 않습니다.** 화면의 `<time datetime="…">`가 제공하는 원본 시각을 읽습니다. 원본 시각이 없으면 정확한 날짜를 복원할 수 없으므로 그대로 둡니다. Instagram/Meta와 무관한 비공식 도구입니다.

## 설치

1. [Tampermonkey 공식 사이트](https://www.tampermonkey.net/)에서 사용하는 브라우저용 확장을 설치합니다.
2. Chrome 계열에서는 확장 관리 → Tampermonkey → **사용자 스크립트 허용**을 켭니다. 해당 항목이 없는 버전은 개발자 모드 설정을 확인하세요. [공식 설명](https://www.tampermonkey.net/faq.php#Q209)
3. **[스크립트 설치](https://raw.githubusercontent.com/maniac428/instagram-exact-date/main/instagram-exact-date.user.js)**를 열고 Tampermonkey의 설치 버튼을 누릅니다.
4. 인스타그램 웹을 새로고침합니다.

코드만 표시되면 Tampermonkey → 대시보드 → 새 스크립트 만들기에서 기존 내용을 지우고 [스크립트 코드](./instagram-exact-date.user.js)를 붙여넣은 다음 `Ctrl+S`로 저장하세요. 이전 대화의 1.0.0을 수동 설치했다면 기존 항목을 끄거나 삭제해 중복 실행을 피하세요.

## 표시 예시

| 원본 `datetime` | 화면 표시 | 마우스 오버 시각 |
| --- | --- | --- |
| `2024-05-12T09:35:21Z` | `2024.05.12` | 한국 시간 18:35:21 |
| `2024-12-31T15:00:00Z` | `2025.01.01` | 한국 시간 00:00:00 |

컴퓨터의 시간대 설정과 관계없이 `Asia/Seoul`로 변환합니다. UTC 날짜와 한국 날짜가 하루 다른 것은 정상입니다. 툴팁의 구두점·공백은 브라우저에 따라 달라질 수 있습니다.

## 작동 범위와 한계

- 웹 피드, 개별 게시물, 릴스 등에서 `time[datetime]`가 제공되는 경우에 적용합니다. 같은 요소를 사용하는 댓글 등의 날짜도 변경될 수 있습니다.
- 스크롤로 추가된 요소, 화면 전환, 원본 시각 변경과 상대 날짜 재렌더링을 감지합니다. 변경된 부분을 150ms 단위로 묶어 처리합니다.
- 프로필 격자에 원본 시각이 없으면 날짜를 추가할 수 없습니다. 게시물을 열어야 할 수 있습니다.
- 시간대 없는 시각, 날짜만 있는 값, 해석할 수 없는 값은 추측하지 않습니다.
- 원본 `datetime` 속성과 게시물 링크는 유지하고 화면 텍스트와 툴팁만 변경합니다. Instagram이 제공하는 시각 자체의 정확성은 검증하지 않습니다.
- 원본 데이터의 초 정밀도가 낮으면 툴팁의 초 표시가 실제 초 단위 정확성을 보장하지 않습니다.
- **로그인된 Instagram 화면 및 실제 Tampermonkey 환경에서 실사용 검증하지 않았습니다.** Instagram의 화면 구조 변경으로 작동하지 않을 수 있습니다.

## 개인정보와 비용

스크립트는 화면 안에서만 동작하며 별도의 서버 요청, 쿠키 접근, 저장, 분석·추적, 외부 라이브러리를 사용하지 않습니다. 결제나 API 키는 필요 없습니다. 동작 대상은 `https://www.instagram.com/*`와 `https://instagram.com/*`입니다.

Tampermonkey 자체의 확장 권한은 이 스크립트의 동작 범위와 별개입니다. 자동 업데이트를 켜 두면 Tampermonkey가 GitHub의 새 버전을 확인·다운로드할 수 있습니다. 스크립트의 네트워크 요청이 없는 것과 확장의 업데이트 통신이 없는 것은 다릅니다.

## 문제 해결 / 제거

- 작동하지 않으면 확장과 스크립트 활성화, 사용자 스크립트 실행 허용, Instagram 사이트 접근 권한을 확인한 뒤 새로고침하세요.
- 일부 화면만 그대로라면 해당 날짜에 원본 `datetime`이 없는지 확인하세요. 이를 우회하기 위한 비공식 API 호출은 하지 않습니다.
- Tampermonkey 대시보드에서 이 스크립트를 끄거나 삭제한 후 인스타그램을 새로고침하면 기존 표시로 돌아갑니다.
- 오류 제보는 [Issues](https://github.com/maniac428/instagram-exact-date/issues)에 남겨 주세요. 세션 쿠키·토큰·비공개 게시물 내용은 첨부하지 마세요.

## 검증

추가 패키지 없이 Node.js 22 이상에서 실행할 수 있습니다.

```sh
node --check instagram-exact-date.user.js
node --test tests/userscript.test.cjs
```

테스트는 독립된 가상 DOM 환경에서 스크립트 전체를 실행해 KST 날짜 경계, 잘못된 입력, 최초 변환, 동적 추가, 재렌더링, 원본 속성 유지, 중복 실행 안정성을 확인합니다. 실제 브라우저 및 Instagram 호환성 확인을 대체하지 않습니다.

## 참고 문서

- [Tampermonkey: 유저스크립트 설치](https://www.tampermonkey.net/faq.php#Q102)
- [Tampermonkey: 실행 권한](https://www.tampermonkey.net/faq.php#Q209)
- [Tampermonkey: 메타데이터와 API](https://www.tampermonkey.net/documentation.php)
- [MDN: time 요소와 datetime](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/time)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)

## 변경 내역

- **1.0.1**: GitHub 배포용 메타데이터·설치 안내 추가. 시간대가 불명확한 입력을 제외하고 변경된 요소를 묶어 처리하도록 보완.
- **1.0.0**: 최초 작성. 원본 `datetime`을 한국 날짜로 표시하고 시각 툴팁 제공.
