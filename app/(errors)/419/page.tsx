import { ErrorPage } from "@/components/ErrorPage";

export default function SessionExpired() {
  return (
    <ErrorPage
      code={419}
      heading="انتهت صلاحية الجلسة"
      message="خلاص وقت جلستك انتهى، سجل دخول تاني عشان تكمل."
      action={{ label: "تسجيل الدخول", href: "/login" }}
    />
  );
}
