import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

export function CtaSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <Reveal>
      <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-b from-[#181832] via-[#101024] to-[#0a0a18] px-6 py-14 text-center sm:px-10">
        <div className="hero-ruled-lines pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute top-0 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col items-center gap-4">
          <h2 className="text-h2 text-white">{isLoggedIn ? "كمّل رحلتك" : "جاهز تفتح أول صفحة؟"}</h2>
          <p className="max-w-sm text-small text-white/70">
            {isLoggedIn
              ? "شوف كورساتك وتقدمك من حسابك دلوقتي."
              : "كل اللي محتاجه للثانوية العامة في مكان واحد - سجّل دلوقتي وابدأ تذاكر صح."}
          </p>
          <Button size="lg" nativeButton={false} render={<Link href={isLoggedIn ? "/profile" : "/register"} />}>
            {isLoggedIn ? "اذهب لحسابك" : "إنشاء حساب مجاني"}
          </Button>
        </div>
      </div>
    </Reveal>
  );
}
