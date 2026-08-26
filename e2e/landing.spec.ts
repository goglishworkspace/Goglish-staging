import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads in RTL Arabic with the marketing navbar and CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");

    await expect(page.getByRole("link", { name: "Goglish" }).first()).toBeVisible();
    // The navbar's CTAs are <Link>s wrapped by the base-ui Button primitive,
    // which reports an accessible role of "button" (not "link") even though
    // the underlying element is an <a href>.
    await expect(page.getByRole("button", { name: "تسجيل الدخول" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "إنشاء حساب" }).first()).toBeVisible();
  });

  test("navigates to the leaderboard from the navbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "الصدارة" }).first().click();
    await expect(page).toHaveURL(/\/leaderboard$/);
  });
});
