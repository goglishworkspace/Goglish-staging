import { ErrorPage } from "@/components/ErrorPage";

export default function Unauthorized() {
  return (
    <ErrorPage
      code={401}
      heading="لازم تسجل دخول الأول"
      message="الصفحة دي محتاجة تسجيل دخول عشان تقدر تشوفها."
      action={{ label: "تسجيل الدخول", href: "/login" }}
    />
  );
}
