-- notices.source 체크 제약에 'gh'(경기주택도시공사) 추가.
-- 0001의 인라인 제약(자동명 notices_source_check) 교체.

alter table notices drop constraint if exists notices_source_check;
alter table notices add constraint notices_source_check
  check (source in ('apt', 'lh', 'sh', 'gh', 'private'));
