import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-secondary px-6 py-10 text-center">
      <h2 className="text-h3 text-brand-accent">جاهز تبدأ رحلتك؟ 🚀</h2>
      <p className="max-w-sm text-small text-brand-accent/80">
        {isLoggedIn
          ? "كمّل رحلتك التعليمية وشوف كورساتك وتقدمك من حسابك."
          : "كل اللي محتاجه للثانوية العامة في مكان واحد - سجّل دلوقتي وابدأ تذاكر صح."}
      </p>
      <Button nativeButton={false} render={<Link href={isLoggedIn ? "/profile" : "/register"} />}>
        {isLoggedIn ? "اذهب لحسابك" : "إنشاء حساب مجاني"}
      </Button>
    </div>
  );
}
