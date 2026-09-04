# Cart integration hand-off

## 적용 상태

- 프로젝트: `C:\dev\caremarket`
- 환경변수 URL에서 확인한 Supabase project ref: `owxgtzepynkwdixmwhim`.
- 작업 당시 Supabase CLI 실행 파일, 로컬 CLI, `supabase/config.toml`, `supabase/.temp/project-ref`가 없었습니다. CLI 로그인/원격 link는 확인할 수 없었습니다.
- 원격 SQL 실행, Auth 사용자 생성/수정, seed 실행은 하지 않았습니다. 실제 원격 policy 목록도 확인하지 못했습니다.
- 기존 로컬 migration에는 cart 정책이 없습니다. 새 migration은 기존 원격 정책을 먼저 검사하고, 알 수 없거나 호환되지 않는 정책이 있으면 전체 transaction을 중단합니다. 정책을 임의 삭제하거나 중복 추가하지 않습니다.

## Supabase 적용 순서

가장 단순한 방법은 프로젝트 `owxgtzepynkwdixmwhim`의 SQL Editor에서 **새 파일 하나만** 실행하는 것입니다.

1. 아래 읽기 전용 SQL로 현재 테이블/정책을 확인합니다.
2. `supabase/migrations/20260904000100_cart_rls_and_atomic_quantity.sql` 전체를 실행합니다.
3. 정책 확인 SQL을 다시 실행하여 RLS 활성화와 authenticated 전용 4개 정책을 확인합니다.
4. 브라우저를 새로고침한 뒤 아래 실제 계정 체크리스트를 수행합니다.

```sql
select c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'cart_items';

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'cart_items'
order by policyname;

select cart_item_id, user_id, product_id, quantity, created_at, updated_at
from public.cart_items
order by user_id, created_at;
```

`Review existing...` 또는 `Review incompatible...` 오류가 발생하면 기존 정책을 검토해야 합니다. 파일의 검사 부분을 지우거나 기존 정책을 일괄 삭제하지 마세요. SQL Editor의 postgres 조회는 RLS를 우회하므로 다른 사용자의 행이 보이는 것이 정상이며, 이것만으로 사용자별 RLS를 검증할 수는 없습니다.

### CLI를 사용하는 경우

아래 명령은 아직 실행하지 않았습니다. 비밀번호/토큰을 명령문이나 소스에 넣지 말고 CLI의 대화형 인증을 사용합니다.

```powershell
Set-Location C:\dev\caremarket
npx supabase --version
npx supabase login
npx supabase init
npx supabase link --project-ref owxgtzepynkwdixmwhim
npx supabase migration list
npx supabase db push --dry-run
```

이미 `config.toml`이 생겼다면 `init`은 생략합니다. **dry-run 결과에 새 cart migration 하나만 나올 때에만** 다음 명령을 실행합니다.

```powershell
npx supabase db push
```

기존 스키마를 SQL Editor로 수동 적용한 경우 migration 이력이 맞지 않을 수 있습니다. 과거 initial/Auth/products migration까지 적용하려고 하면 중단하고, 위 SQL Editor 방식으로 새 cart 파일만 실행하세요. 이력을 확인하지 않은 `migration repair`, `db reset`, seed 재실행은 금지합니다.

참고: [Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows).

## 구현 방식

- Auth session의 사용자 ID를 기준으로 cart를 조회하고 `product:products(*)` 관계 조회 결과를 기존 product adapter에 전달합니다. mock 상품 ID는 사용하지 않습니다.
- 로그인/새로고침/계정 전환 및 창 포커스 복귀 시 다시 조회합니다. 실시간 구독은 추가하지 않았습니다.
- `add_my_cart_item`은 `ON CONFLICT (user_id, product_id) DO UPDATE`로 수량을 원자적으로 증가시킵니다. 한 화면의 쓰기도 순서대로 처리합니다.
- `change_my_cart_quantity`는 기존 수량에 +1/-1을 원자적으로 적용하고 최솟값 1을 유지합니다.
- 두 RPC 모두 `SECURITY INVOKER`, 빈 `search_path`, authenticated 전용 실행 권한을 사용합니다. `p_user_id`는 현재 `auth.uid()`와 반드시 일치해야 합니다. 실제 행 소유자는 `auth.uid()`로 결정합니다.
- 삭제는 `user_id`와 실제 `product_id`를 모두 지정하며 RLS를 적용받습니다.
- 저장 후 서버를 재조회하고 성공할 때만 완료 토스트/담기 drawer를 표시합니다. 실패는 console과 기존 toast에 표시하며 mock fallback은 없습니다. 응답이 불확실한 쓰기는 자동 재시도하지 않습니다.
- 로그아웃 시작 시 cart를 즉시 비우고, 계정별 요청 세대 번호로 이전 요청/대기 작업을 차단합니다.
- Header는 기존처럼 수량 합계, Cart 페이지의 상품 종류 수는 행 개수입니다. 가격/영양은 관계 조회한 실제 상품 값으로 계산합니다.
- 비활성화되어 products RLS로 읽을 수 없는 상품은 목록/합산에서 제외됩니다. 원래 cart 행은 자동 삭제하지 않습니다.
- wishlist는 기존 메모리 상태를 유지합니다. 주문은 여전히 mock입니다. 가상 주문으로 실제 DB cart가 삭제되지 않도록 cart를 유지합니다.

## 수행한 검증과 한계

- 실제 개발 서버 + 실제 Supabase 상품 조회 + 비로그인 브라우저: 카드/상세/바로 구매/일괄 담기/헤더 진입 차단, 계속 둘러보기, 로그인 이동, cart 0. cart API 요청 0건, runtime/console 오류 0건.
- 새 로그인 안내 모달: 데스크톱 1440x1000, 모바일 390x844에서 표시/버튼/화면 내 배치 확인.
- 실제 Supabase SDK를 사용하되 HTTP를 테스트 대역으로 가로챈 브라우저: 로그인 A, 중복 담기, 수량 +/- 및 최소 1, 삭제, F5 재조회, 로그아웃 즉시 0, 로그인 B의 독립 cart 표시 통과. 원격 Auth/DB 검증은 아닙니다.
- Node controller 테스트: 비로그인 요청 없음, 연속 쓰기, 실패 처리, 늦은 응답, A→B 및 A→로그아웃→A 분리.
- 로컬 PostgreSQL 엔진(PGlite): migration 실행/재실행, RPC, anon 거부, A의 B 행 SELECT/INSERT/UPDATE/DELETE 차단, owner 변조 차단, 기존 알 수 없는 정책 발견 시 중단. 실제 remote 사용자 토큰 검증은 아닙니다.

```powershell
node --test tests/cart.test.mjs
```

선택적 SQL 테스트는 설치된 PGlite 모듈의 절대 경로를 `PGLITE_MODULE` 환경변수로 지정한 뒤 실행합니다. 지정하지 않으면 SQL 테스트는 skip됩니다. 프로젝트 의존성은 추가하지 않았습니다.

```powershell
node --test tests/cart.test.mjs tests/cart-rls.test.mjs
npm run lint
npm run build
```

## 실제 계정 확인

개발 서버: http://127.0.0.1:5173

1. 비로그인 상태에서 카드/상세 담기를 눌러 상품이 추가되지 않고 로그인 안내가 뜨는지 확인합니다.
2. A 계정으로 로그인하고 동일 상품을 두 번 추가합니다. Table Editor의 cart_items에서 A의 해당 product_id가 1행, quantity=2인지 확인합니다.
3. Cart/Drawer에서 +/-와 삭제 후 DB 수량/행이 일치하는지 확인합니다.
4. 다시 상품을 담고 F5 후 동일 수량이 복구되는지 확인합니다.
5. 로그아웃 직후 Header가 0인지 확인하고 B 계정으로 로그인합니다. A 상품이 노출되지 않아야 합니다.
6. 두 브라우저 프로필에서 A/B를 각각 로그인하여 동일 상품을 담고 user_id별 별도 행이 생기는지 확인합니다.
7. RLS는 각 계정의 실제 사용자 세션으로 B 행 SELECT/UPDATE/DELETE와 B user_id INSERT를 요청해서 검증해야 합니다. A 요청에서 SELECT/UPDATE/DELETE는 B 행을 반환/변경하지 않고 INSERT는 거부되어야 합니다. 사용자 access token을 채팅/소스/로그에 붙여 넣지 마세요.

원격 migration과 실제 계정 확인이 끝나기 전에는 원격 연동 검증 완료로 간주하지 않습니다.
