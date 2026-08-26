import { test, expect } from "@playwright/test";
import { clearRegisterRateLimit, fetchConfirmationLink, validRegisterFields } from "./helpers";

test.describe("Register -> confirm -> login", () => {
  test.beforeEach(async () => {
    // Shares rate_limit_counters with the Vitest suite against the same
    // local Supabase instance (register is capped at 3/hour/IP) - clear it
    // so this doesn't flake behind an earlier test run's leftover counters.
    await clearRegisterRateLimit();
  });

  test("a new student can register, confirm by email, land on /choose-grade, then reach the dashboard", async ({
    page,
  }) => {
    const fields = validRegisterFields();

    await page.goto("/register");
    await page.getByRole("button", { name: "أنا طالب" }).click();
    await page.getByRole("button", { name: "متابعة" }).click();

    await page.getByLabel("الاسم الأول").fill(fields.firstName);
    await page.getByLabel("الاسم الأخير").fill(fields.lastName);
    await page.getByLabel("الإيميل").fill(fields.email);
    await page.getByLabel("الرقم القومي").fill(fields.nationalId);
    await page.getByRole("button", { name: "ثانية ثانوي" }).click();
    await page.getByLabel("الباسورد", { exact: true }).fill(fields.password);
    await page.getByLabel("تأكيد الباسورد").fill(fields.password);

    // The new flow calls supabase.auth.signUp() directly from the browser
    // (a different origin than the app itself), not /api/auth/register.
    const [signUpResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/auth/v1/signup")),
      page.getByRole("button", { name: "إنشاء حساب" }).click(),
    ]);
    expect(signUpResponse.status()).toBe(200);

    await expect(page).toHaveURL(new RegExp(`/verify-email\\?email=${encodeURIComponent(fields.email)}`));
    await expect(page.getByText("Spam أو Junk Mail")).toBeVisible();

    const confirmationLink = await fetchConfirmationLink(fields.email);
    await page.goto(confirmationLink);

    // app/auth/callback/route.ts completes the profile (grade from the form
    // above) and routes a student here, not to a fixed "/".
    await expect(page).toHaveURL(/\/student\/choose-grade$/);
    await expect(page.getByText("الصف الحالي: ثانية ثانوي")).toBeVisible();

    await page.goto("/student/dashboard");
    await expect(page).toHaveURL(/\/student\/dashboard$/);
    await expect(page.getByRole("link", { name: "Goglish" }).first()).toBeVisible();
  });

  test("a new parent registering with a matching child national ID is auto-linked and lands on the parent portal", async ({
    page,
  }) => {
    // Seed a student first so the parent's child_national_id has something
    // to match against (parent auto-linking decrypts every student's
    // national ID server-side to find a match - see auth/callback/route.ts).
    const studentFields = validRegisterFields();
    await page.goto("/register");
    await page.getByRole("button", { name: "أنا طالب" }).click();
    await page.getByRole("button", { name: "متابعة" }).click();
    await page.getByLabel("الاسم الأول").fill(studentFields.firstName);
    await page.getByLabel("الاسم الأخير").fill(studentFields.lastName);
    await page.getByLabel("الإيميل").fill(studentFields.email);
    await page.getByLabel("الرقم القومي").fill(studentFields.nationalId);
    await page.getByRole("button", { name: "أولى ثانوي" }).click();
    await page.getByLabel("الباسورد", { exact: true }).fill(studentFields.password);
    await page.getByLabel("تأكيد الباسورد").fill(studentFields.password);
    await page.getByRole("button", { name: "إنشاء حساب" }).click();
    await expect(page).toHaveURL(new RegExp(`/verify-email`));
    const studentLink = await fetchConfirmationLink(studentFields.email);
    await page.goto(studentLink);
    await expect(page).toHaveURL(/\/student\/choose-grade$/);

    // Now register the parent, in the same browser context, with the
    // student's national ID as the child to link to.
    const parentFields = validRegisterFields();
    await page.goto("/register");
    await page.getByRole("button", { name: "أنا ولي أمر" }).click();
    await page.getByRole("button", { name: "متابعة" }).click();
    await page.getByLabel("الاسم الأول").fill(parentFields.firstName);
    await page.getByLabel("الاسم الأخير").fill(parentFields.lastName);
    await page.getByLabel("الإيميل").fill(parentFields.email);
    await page.getByLabel("الرقم القومي للطالب").fill(studentFields.nationalId);
    await page.getByLabel("الباسورد", { exact: true }).fill(parentFields.password);
    await page.getByLabel("تأكيد الباسورد").fill(parentFields.password);
    await page.getByRole("button", { name: "إنشاء حساب" }).click();
    await expect(page).toHaveURL(new RegExp(`/verify-email`));

    const parentLink = await fetchConfirmationLink(parentFields.email);
    await page.goto(parentLink);

    await expect(page).toHaveURL(/\/parent\/dashboard$/);
  });

  test("shows an error toast on a wrong password instead of navigating away", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("الإيميل").fill("no-such-user@example.com");
    await page.getByLabel("الباسورد", { exact: true }).fill("WrongPass1!");
    await page.getByRole("button", { name: "دخول" }).click();

    await expect(page.getByText("الإيميل أو الباسورد غير صحيح")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
