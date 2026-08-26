import { describe, it, expect } from "vitest";
import { resolveLevelForXp, type Level } from "@/lib/services/level.service";
import { createTestClient } from "./http-client";

const LEVELS: Level[] = [
  { level_number: 1, min_xp: 0, title: "مبتدئ" },
  { level_number: 2, min_xp: 100, title: "متعلم" },
  { level_number: 3, min_xp: 250, title: "مجتهد" },
];

describe("resolveLevelForXp", () => {
  it("resolves the highest level whose min_xp does not exceed the given xp", () => {
    expect(resolveLevelForXp(LEVELS, 0)?.level_number).toBe(1);
    expect(resolveLevelForXp(LEVELS, 99)?.level_number).toBe(1);
    expect(resolveLevelForXp(LEVELS, 100)?.level_number).toBe(2);
    expect(resolveLevelForXp(LEVELS, 300)?.level_number).toBe(3);
  });

  it("returns null when even the first level's threshold isn't met", () => {
    const levelsWithoutZero: Level[] = [{ level_number: 1, min_xp: 10, title: "x" }];
    expect(resolveLevelForXp(levelsWithoutZero, 5)).toBeNull();
  });
});

describe("GET /api/levels", () => {
  it("returns the public level catalog ordered by min_xp", async () => {
    const anon = createTestClient();
    const { status, json } = await anon.get<Array<{ level_number: number; min_xp: number }>>("/api/levels");
    expect(status).toBe(200);
    expect(json?.data?.length).toBeGreaterThanOrEqual(10);
    expect(json!.data![0].min_xp).toBe(0);
    const minXps = json!.data!.map((l) => l.min_xp);
    expect([...minXps].sort((a, b) => a - b)).toEqual(minXps);
  });
});
