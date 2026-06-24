-- U2 스키마 검증용 목업 시드 (로컬 개발 전용)
-- 실제 목업 생성은 U1 MockDataProvider가 담당. 여기선 스키마/RLS 확인용 소량.

insert into notices (id, source_no, source, title, region_sido, region_sigu,
  area_min, area_max, notice_date, apply_start, apply_end, winner_date,
  supply_type, newlywed, pre_newlywed, priority, url, raw)
values
  ('apt:2026000123', '2026000123', 'apt', '평촌 어바인퍼스트 신혼희망타운',
   '경기', '안양시', 46, 59, '2026-06-20', '2026-06-28', '2026-07-02', '2026-07-10',
   '신혼부부', true, true, '1순위', 'https://www.applyhome.co.kr', '{}'::jsonb),
  ('lh:2026LH0456', '2026LH0456', 'lh', '산본 행복주택 입주자모집',
   '경기', '군포시', 16, 36, '2026-06-22', '2026-06-30', '2026-07-08', null,
   '행복주택', false, false, '2순위', 'https://www.myhome.go.kr', '{}'::jsonb),
  ('apt:2026000099', '2026000099', 'apt', '의왕 백운밸리 무순위 줍줍',
   '경기', '의왕시', 84, 84, '2026-06-10', '2026-06-15', '2026-06-18', '2026-06-25',
   '일반', false, false, '무순위', 'https://www.applyhome.co.kr', '{}'::jsonb)
on conflict (id) do nothing;
