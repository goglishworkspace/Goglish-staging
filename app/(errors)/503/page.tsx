import { ErrorPage } from "@/components/ErrorPage";

export default function ServiceUnavailable() {
  return (
    <ErrorPage
      code={503}
      heading="المنصة تحت الصيانة"
      message="بنشتغل على تحسين المنصة دلوقتي، ارجع تاني بعد شوية."
      action={{ label: "الرجوع للرئيسية", href: "/" }}
    />
  );
}
