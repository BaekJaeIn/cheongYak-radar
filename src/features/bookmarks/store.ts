// 북마크 localStorage 저장 (BR-U5-1). v6부터 DB(repository.ts)가 주 저장소 —
// 이 모듈은 레거시 병합(mergeLocalOnce) 소스 + 순수 유틸로만 유지 (BR-U8-8).
const KEY = "cheongyak:bookmarks";

/** 순수: 목록 파싱(방어적). */
export function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** 순수: 토글. */
export function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseList(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

function write(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 프라이빗 모드 등 — 무시 */
  }
}

export const BookmarkStore = {
  list(): string[] {
    return read();
  },
  has(id: string): boolean {
    return read().includes(id);
  },
  /** 토글 후 북마크 여부 반환. */
  toggle(id: string): boolean {
    const next = toggleInList(read(), id);
    write(next);
    return next.includes(id);
  },
  /** DB 병합 성공 후 로컬 비우기 (BR-U8-8). */
  clear(): void {
    write([]);
  },
};
