import { describe, expect, test } from "bun:test";

// The hero copy is a product artefact with mandatory statements. This test fails
// when a rewrite drops one of them, which is exactly when someone should be
// forced to re-read the claim rules in content/README.md.

const copy = await Bun.file(new URL("../content/hero.zh-CN.md", import.meta.url)).text();

describe("hero copy", () => {
  test("states the product phase honestly", () => {
    expect(copy).toContain("开发阶段");
    expect(copy).toContain("不是已发布功能");
  });

  test("keeps the spoiler guarantee qualified", () => {
    expect(copy).toContain("不等于数学保证");
  });

  test("separates open source from the hosted service", () => {
    expect(copy).toContain("托管服务");
  });

  test("never claims an AI that solves the mystery", () => {
    expect(copy).not.toContain("自动推理出凶手");
  });
});
