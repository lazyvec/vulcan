import { describe, it, expect } from "vitest";
import { parseStringArray, parseJsonRecord } from "./store";

describe("parseStringArray", () => {
  it("null이면 빈 배열을 반환한다", () => {
    expect(parseStringArray(null)).toEqual([]);
  });

  it("undefined면 빈 배열을 반환한다", () => {
    expect(parseStringArray(undefined)).toEqual([]);
  });

  it("빈 문자열이면 빈 배열을 반환한다", () => {
    expect(parseStringArray("")).toEqual([]);
  });

  it("유효한 JSON 배열을 파싱한다", () => {
    expect(parseStringArray('["a","b","c"]')).toEqual(["a", "b", "c"]);
  });

  it("숫자 배열을 문자열로 변환한다", () => {
    expect(parseStringArray("[1,2,3]")).toEqual(["1", "2", "3"]);
  });

  it("배열이 아닌 JSON이면 빈 배열을 반환한다", () => {
    expect(parseStringArray('{"key":"val"}')).toEqual([]);
  });

  it("잘못된 JSON이면 빈 배열을 반환한다", () => {
    expect(parseStringArray("not json")).toEqual([]);
  });
});

describe("parseJsonRecord", () => {
  it("null이면 빈 객체를 반환한다", () => {
    expect(parseJsonRecord(null)).toEqual({});
  });

  it("undefined면 빈 객체를 반환한다", () => {
    expect(parseJsonRecord(undefined)).toEqual({});
  });

  it("빈 문자열이면 빈 객체를 반환한다", () => {
    expect(parseJsonRecord("")).toEqual({});
  });

  it("유효한 JSON 객체를 파싱한다", () => {
    expect(parseJsonRecord('{"a":1,"b":"two"}')).toEqual({ a: 1, b: "two" });
  });

  it("배열 JSON이면 빈 객체를 반환한다", () => {
    expect(parseJsonRecord("[1,2,3]")).toEqual({});
  });

  it("잘못된 JSON이면 빈 객체를 반환한다", () => {
    expect(parseJsonRecord("not json")).toEqual({});
  });

  it("중첩 객체를 파싱한다", () => {
    const input = '{"nested":{"key":"val"},"arr":[1,2]}';
    const result = parseJsonRecord(input);
    expect(result).toEqual({ nested: { key: "val" }, arr: [1, 2] });
  });
});
