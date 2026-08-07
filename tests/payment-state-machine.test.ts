import { describe, it, expect } from "vitest";
import { canTransition, MAX_PAYMENT_ATTEMPTS } from "@/lib/services/payment-state-machine.service";

describe("canTransition", () => {
  it("allows the happy path: pending -> processing -> completed", () => {
    expect(canTransition("pending", "processing")).toBe(true);
    expect(canTransition("processing", "completed")).toBe(true);
  });

  it("allows the retry path: processing -> failed -> retrying -> processing -> completed", () => {
    expect(canTransition("processing", "failed")).toBe(true);
    expect(canTransition("failed", "retrying")).toBe(true);
    expect(canTransition("retrying", "processing")).toBe(true);
    expect(canTransition("retrying", "completed")).toBe(false); // must re-enter processing first
  });

  it("allows cancellation from pending, failed, and retrying", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("failed", "cancelled")).toBe(true);
    expect(canTransition("retrying", "cancelled")).toBe(true);
  });

  it("rejects transitions out of terminal states", () => {
    expect(canTransition("completed", "processing")).toBe(false);
    expect(canTransition("completed", "refunded" as never)).toBe(false);
    expect(canTransition("cancelled", "pending")).toBe(false);
  });

  it("rejects skipping states", () => {
    expect(canTransition("pending", "completed")).toBe(false);
    expect(canTransition("pending", "failed")).toBe(false);
  });

  it("caps attempts at 3", () => {
    expect(MAX_PAYMENT_ATTEMPTS).toBe(3);
  });
});
