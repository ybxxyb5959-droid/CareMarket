-- P1 product image-only rollout.
-- Do not apply until every new_image_url below returns HTTP 200 in Production.
-- The old URLs are retained here as the rollback source and as an all-or-nothing guard.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table p1_product_image_changes (
  product_id bigint primary key,
  expected_name text not null,
  old_image_url text not null,
  new_image_url text not null
) on commit drop;

insert into p1_product_image_changes (product_id, expected_name, old_image_url, new_image_url)
values
  (9, '프로틴 흰살생선 대구살 큐브 120g', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Frozen_cod_fillet_%2820240124%29.jpg/960px-Frozen_cod_fillet_%2820240124%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-009-cod-cubes.webp'),
  (18, '단백질 듬뿍 오트밀 닭가슴살 영양죽 280g', 'https://upload.wikimedia.org/wikipedia/commons/7/72/Oat_porridge_in_Ghana.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', '/assets/products/product-018-chicken-oatmeal-porridge.webp'),
  (19, '지중해식 구운 병아리콩 & 가지 그라탕 220g', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Vegetarian_Moussaka_and_Spinach_%26_Button_Mushrooms_With_Pesto_Dressing_-_Foodilic_2024-08-12.jpg/960px-Vegetarian_Moussaka_and_Spinach_%26_Button_Mushrooms_With_Pesto_Dressing_-_Foodilic_2024-08-12.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-019-chickpea-eggplant-gratin.webp'),
  (36, '글루텐프리 퀴노아 라이스 크런치 280g', 'https://upload.wikimedia.org/wikipedia/commons/3/39/Puffed_Rice_Sugar_Coated.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', '/assets/products/product-036-quinoa-rice-crunch.webp'),
  (47, '코코넛 워터 베이스 무가당 코코넛 밀크 330ml', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Coconut_Milk.JPG/960px-Coconut_Milk.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-047-unsweetened-coconut-milk.webp'),
  (55, '유기농 콤부차 레몬진저 310ml', 'https://upload.wikimedia.org/wikipedia/commons/2/21/Kombucha_cordial.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled', '/assets/products/product-055-lemon-ginger-kombucha.webp'),
  (57, '단호박 팥 데일리 호박즙 100ml x 14포', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Sliced_pumpkin.jpg/960px-Sliced_pumpkin.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-057-pumpkin-redbean-juice.webp'),
  (60, '에너지 부스터 과라나 샷 60ml', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Guarana.jpg/960px-Guarana.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-060-guarana-energy-shot.webp'),
  (68, '볶은 검은콩 서리태 스낵 200g', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Black_soybeans.jpg/960px-Black_soybeans.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-068-roasted-black-soybeans.webp'),
  (71, '데일리 올인원 활력 멀티비타민 & 미네랄 60정', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80', '/assets/products/product-071-multivitamin-mineral.webp'),
  (73, '100억 생유산균 신바이오틱스 포스트바이오틱스 30포', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&auto=format&fit=crop&q=80', '/assets/products/product-073-synbiotics-sticks.webp'),
  (74, '간 편한 밀크씨슬 실리마린 & 비타민B 60정', 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80', '/assets/products/product-074-milk-thistle-silymarin.webp'),
  (76, '햇살 비타민D3 4000IU + 비타민K2 60캡슐', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Algae_omega-3_270mg_capsules_-_vegan.jpg/960px-Algae_omega-3_270mg_capsules_-_vegan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-076-vitamin-d3-k2.webp'),
  (77, '루테인 지아잔틴 아스타잔틴 아이케어 30캡슐', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Algae_omega-3_270mg_capsules_-_vegan.jpg/960px-Algae_omega-3_270mg_capsules_-_vegan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-077-lutein-eye-care.webp'),
  (79, '옥타코사놀 아르기닌 맥스 활력환 30포', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&auto=format&fit=crop&q=80', '/assets/products/product-079-octacosanol-arginine-pellets.webp'),
  (87, '천연 효모 추출 비건 감칠맛 채수 파우더 120g', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Mushroom_powder%2C_Boletus_edulis%2C_dried_and_freshly_ground.jpg/960px-Mushroom_powder%2C_Boletus_edulis%2C_dried_and_freshly_ground.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-087-vegan-stock-powder.webp'),
  (95, '국산 발효 흑마늘 진액 70ml x 15포', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/2023_Czarny_czosnek_fermentowany_%281%29.jpg/960px-2023_Czarny_czosnek_fermentowany_%281%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-095-black-garlic-extract.webp'),
  (98, '스위트 바질씨드 워터 믹스 150g', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Basil_seeds.jpg/960px-Basil_seeds.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-098-basil-seed-water.webp'),
  (99, '동결건조 맥주효모 분말 250g', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Bj%C3%A4st.jpg/960px-Bj%C3%A4st.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-099-brewers-yeast-powder.webp'),
  (100, '유기농 야생 빌베리 루테인 파우더 100g', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Purple_potato_powder_and_blueberry_powder.jpg/960px-Purple_potato_powder_and_blueberry_powder.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail', '/assets/products/product-100-bilberry-lutein-powder.webp');

do $p1_product_images$
declare
  target_count integer;
  missing_ids bigint[];
  mismatched_ids bigint[];
  updated_count integer;
begin
  select count(*) into target_count from p1_product_image_changes;
  if target_count <> 20 then
    raise exception 'Expected exactly 20 P1 image targets, found %.', target_count;
  end if;

  select array_agg(c.product_id order by c.product_id)
    into missing_ids
  from p1_product_image_changes c
  left join public.products p on p.product_id = c.product_id
  where p.product_id is null;

  if coalesce(array_length(missing_ids, 1), 0) > 0 then
    raise exception 'Missing P1 product IDs: %. No changes committed.', missing_ids;
  end if;

  select array_agg(c.product_id order by c.product_id)
    into mismatched_ids
  from p1_product_image_changes c
  join public.products p on p.product_id = c.product_id
  where p.name is distinct from c.expected_name
     or p.image_url is distinct from c.old_image_url;

  if coalesce(array_length(mismatched_ids, 1), 0) > 0 then
    raise exception 'P1 product identity or existing image URL mismatch for IDs: %. No changes committed.', mismatched_ids;
  end if;

  update public.products p
  set image_url = c.new_image_url
  from p1_product_image_changes c
  where p.product_id = c.product_id
    and p.name = c.expected_name
    and p.image_url = c.old_image_url;

  get diagnostics updated_count = row_count;
  if updated_count <> 20 then
    raise exception 'Expected 20 P1 image URL updates, updated %. No changes committed.', updated_count;
  end if;

  if exists (
    select 1
    from p1_product_image_changes c
    join public.products p on p.product_id = c.product_id
    where p.image_url is distinct from c.new_image_url
  ) then
    raise exception 'P1 image URL post-update verification failed. No changes committed.';
  end if;

  raise notice 'Updated exactly 20 P1 product image URLs.';
end;
$p1_product_images$;

commit;
