"use client";

import { ErrorPage } from "@/components/ErrorPage";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorPage
      code={500}
      heading="حصل خطأ غير متوقع"
      message="حاول تاني بعد شوية، أو ارجع للصفحة الرئيسية."
      action={{ label: "حاول تاني", onClick: reset }}
    />
  );
}
