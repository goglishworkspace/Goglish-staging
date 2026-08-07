import { ErrorPage } from "@/components/ErrorPage";

export default function TooManyRequests() {
  return (
    <ErrorPage
      code={429}
      heading="طلبات كتير أوي"
      message="استنى شوية وحاول تاني."
      action={{ label: "الرجوع للرئيسية", href: "/" }}
    />
  );
}
