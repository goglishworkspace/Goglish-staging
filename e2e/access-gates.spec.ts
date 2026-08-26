import { test, expect } from "@playwright/test";

test.describe("Role-gated route redirects (logged out)", () => {
  test("student dashboard redirects an unauthenticated visitor to /login", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("admin area redirects an unauthenticated visitor to /login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("teacher area redirects an unauthenticated visitor to /login", async ({ page }) => {
    await page.goto("/teacher/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("parent area redirects an unauthenticated visitor to /login", async ({ page }) => {
    await page.goto("/parent/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});
