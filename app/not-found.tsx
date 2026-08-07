import { ErrorPage } from "@/components/ErrorPage";

export default function NotFound() {
  return (
    <ErrorPage
      code={404}
      heading="الصفحة غير موجودة"
      message="الصفحة اللي بتدور عليها مش موجودة أو اتشالت."
      action={{ label: "الرجوع للرئيسية", href: "/" }}
    />
  );
}
