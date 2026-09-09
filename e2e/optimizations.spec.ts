import { test, expect } from "@playwright/test";

test.describe("E2E Frontend & Scalability Verifications", () => {
  test("Landing page renders in RTL Arabic with full navigation controls", async ({ page }) => {
    await page.goto("/");

    // Verify HTML layout & language
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");

    // Brand and primary navigation CTAs
    await expect(page.getByRole("link", { name: "Goglish" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "تسجيل الدخول" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "إنشاء حساب" }).first()).toBeVisible();
  });

  test("Rapid navigation across pages causes zero 429 rate-limit errors", async ({ page }) => {
    const errorStatuses: number[] = [];
    page.on("response", (res) => {
      if (res.status() === 429) {
        errorStatuses.push(res.status());
      }
    });

    // Simulate fast sequential navigation across multiple pages
    await page.goto("/");
    await page.goto("/leaderboard");
    await page.goto("/login");
    await page.goto("/register");

    // Must never encounter 429 on GET browsing
    expect(errorStatuses).toHaveLength(0);
  });

  test("Login page loads form elements correctly without crash", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("الإيميل")).toBeVisible();
    await expect(page.getByLabel("الباسورد", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "دخول", exact: true })).toBeVisible();
  });

  test("Register page multi-step role selection works seamlessly", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("button", { name: "أنا طالب" })).toBeVisible();
    await expect(page.getByRole("button", { name: "أنا ولي أمر" })).toBeVisible();

    // Select student role (transitions to step 2)
    await page.getByRole("button", { name: "أنا طالب" }).click();

    // Form inputs should now be revealed
    await expect(page.getByLabel("الاسم الأول")).toBeVisible();
    await expect(page.getByLabel("اسم العائلة")).toBeVisible();
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
    await expect(page.getByLabel("كلمة المرور")).toBeVisible();
  });
});
