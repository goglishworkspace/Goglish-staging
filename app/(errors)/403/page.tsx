import { ErrorPage } from "@/components/ErrorPage";

export default function Forbidden() {
  return (
    <ErrorPage
      code={403}
      heading="مش مسموح لك بالوصول"
      message="مالكش صلاحية توصل للصفحة دي."
      action={{ label: "الرجوع للرئيسية", href: "/" }}
    />
  );
}
