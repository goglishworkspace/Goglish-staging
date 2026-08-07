import { describe, it, expect } from "vitest";
import { scoreResponse, scoreAttempt } from "@/lib/services/scoring.service";

describe("scoreResponse", () => {
  it("scores mcq correctly", () => {
    const question = { id: "q1", type: "mcq" as const, points: 2 };
    const answers = [
      { id: "a1", content: "3", is_correct: false, order_index: null, side: null, match_group: null },
      { id: "a2", content: "4", is_correct: true, order_index: null, side: null, match_group: null },
    ];
    expect(scoreResponse(question, answers, "a2")).toEqual({ isCorrect: true, pointsAwarded: 2 });
    expect(scoreResponse(question, answers, "a1")).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("scores true_false correctly", () => {
    const question = { id: "q1", type: "true_false" as const, points: 1 };
    const answers = [
      { id: "t", content: "True", is_correct: true, order_index: 0, side: null, match_group: null },
      { id: "f", content: "False", is_correct: false, order_index: 1, side: null, match_group: null },
    ];
    expect(scoreResponse(question, answers, "t").isCorrect).toBe(true);
    expect(scoreResponse(question, answers, "f").isCorrect).toBe(false);
  });

  it("scores fill_blank case/whitespace-insensitively", () => {
    const question = { id: "q1", type: "fill_blank" as const, points: 1 };
    const answers = [
      { id: "a1", content: "Cairo", is_correct: true, order_index: null, side: null, match_group: null },
    ];
    expect(scoreResponse(question, answers, "  cairo  ").isCorrect).toBe(true);
    expect(scoreResponse(question, answers, "Alex").isCorrect).toBe(false);
  });

  it("scores ordering exactly, no partial credit", () => {
    const question = { id: "q1", type: "ordering" as const, points: 3 };
    const answers = [
      { id: "a", content: "one", is_correct: null, order_index: 0, side: null, match_group: null },
      { id: "b", content: "two", is_correct: null, order_index: 1, side: null, match_group: null },
      { id: "c", content: "three", is_correct: null, order_index: 2, side: null, match_group: null },
    ];
    expect(scoreResponse(question, answers, ["a", "b", "c"]).isCorrect).toBe(true);
    expect(scoreResponse(question, answers, ["a", "c", "b"]).isCorrect).toBe(false);
  });

  it("scores matching/drag_drop pairs", () => {
    const question = { id: "q1", type: "matching" as const, points: 2 };
    const answers = [
      { id: "l1", content: "Cat", is_correct: null, order_index: null, side: "left" as const, match_group: "pair-0" },
      { id: "r1", content: "Meow", is_correct: null, order_index: null, side: "right" as const, match_group: "pair-0" },
      { id: "l2", content: "Dog", is_correct: null, order_index: null, side: "left" as const, match_group: "pair-1" },
      { id: "r2", content: "Bark", is_correct: null, order_index: null, side: "right" as const, match_group: "pair-1" },
    ];
    const correct = [
      { left: "l1", right: "r1" },
      { left: "l2", right: "r2" },
    ];
    const wrong = [
      { left: "l1", right: "r2" },
      { left: "l2", right: "r1" },
    ];
    expect(scoreResponse(question, answers, correct).isCorrect).toBe(true);
    expect(scoreResponse(question, answers, wrong).isCorrect).toBe(false);
  });

  it("never auto-scores essay", () => {
    const question = { id: "q1", type: "essay" as const, points: 5 };
    expect(scoreResponse(question, [], "some long answer")).toEqual({ isCorrect: null, pointsAwarded: 0 });
  });
});

describe("scoreAttempt", () => {
  it("computes percent and pass/fail against the passing threshold", () => {
    const questions = [
      { id: "q1", type: "mcq" as const, points: 1 },
      { id: "q2", type: "mcq" as const, points: 1 },
    ];
    const responses = [
      { isCorrect: true, pointsAwarded: 1 },
      { isCorrect: false, pointsAwarded: 0 },
    ];
    expect(scoreAttempt(questions, 50, responses)).toEqual({ scorePercent: 50, passed: true });
    expect(scoreAttempt(questions, 60, responses)).toEqual({ scorePercent: 50, passed: false });
  });
});
