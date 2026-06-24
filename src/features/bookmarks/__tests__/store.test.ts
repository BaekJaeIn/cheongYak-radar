import { describe, it, expect } from "vitest";
import { parseList, toggleInList } from "@/features/bookmarks/store";

describe("parseList (BR-U5-1)", () => {
  it("유효한 배열 파싱", () => {
    expect(parseList('["apt:1","lh:2"]')).toEqual(["apt:1", "lh:2"]);
  });
  it("null/깨진 값은 빈 배열", () => {
    expect(parseList(null)).toEqual([]);
    expect(parseList("not-json")).toEqual([]);
    expect(parseList('{"a":1}')).toEqual([]);
  });
  it("문자열 아닌 항목 제거", () => {
    expect(parseList('["apt:1",2,null]')).toEqual(["apt:1"]);
  });
});

describe("toggleInList (BR-U5-3)", () => {
  it("없으면 추가", () => {
    expect(toggleInList(["a"], "b")).toEqual(["a", "b"]);
  });
  it("있으면 제거", () => {
    expect(toggleInList(["a", "b"], "a")).toEqual(["b"]);
  });
});
