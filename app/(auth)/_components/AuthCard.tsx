import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_EYEBROW = "دفعة النجاح";
const DEFAULT_HEADLINE = "معانا في كل خطوة";
const DEFAULT_SUBTEXT = "Goglish جنبك من أول يوم لحد الثانوية العامة.";

/** Shared shell for every /(auth) page. The branded panel (desktop only) is
 * a fixed brand moment - always the navy/gold pair regardless of the site's
 * light/dark theme, same idea as an exam cover sheet staying consistent no
 * matter who's holding it. Individual pages only override the copy. */
export function AuthCard({
  title,
  children,
  eyebrow = DEFAULT_EYEBROW,
  headline = DEFAULT_HEADLINE,
  subtext = DEFAULT_SUBTEXT,
}: {
  title: string;
  children: React.ReactNode;
  eyebrow?: string;
  headline?: string;
  subtext?: string;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden bg-secondary p-10 lg:flex xl:p-14">
        <div className="auth-ruled-lines pointer-events-none absolute inset-0" />

        <Link href="/" className="relative z-10 text-h3 font-extrabold text-white">
          Goglish
        </Link>

        <div className="relative z-10 flex flex-col items-start gap-8">
          <div className="auth-stamp select-none" style={{ transform: "rotate(-6deg)" }}>
            <div className="flex size-32 items-center justify-center rounded-full border-2 border-dashed border-primary/70 xl:size-36">
              <div className="flex size-[86%] flex-col items-center justify-center gap-1 rounded-full border border-primary text-primary">
                <BadgeCheck className="size-7" strokeWidth={1.75} />
                <span className="text-lg font-black leading-none">امتياز</span>
                <span className="text-[0.65rem] font-semibold tracking-[0.2em] text-primary/80">GOGLISH</span>
              </div>
            </div>
          </div>

          <div className="flex max-w-xs flex-col gap-3">
            <span className="text-caption font-semibold tracking-[0.2em] text-primary/90">{eyebrow}</span>
            <h1 className="text-4xl leading-tight font-extrabold text-white xl:text-5xl">{headline}</h1>
            <p className="text-body text-white/70">{subtext}</p>
          </div>
        </div>

        <p className="relative z-10 text-caption text-white/40">© {new Date().getFullYear()} Goglish</p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[#FBF8F0] px-4 py-12 sm:px-6 lg:px-10 dark:bg-background">
        <div className="flex w-full max-w-md flex-col gap-6">
          <Link href="/" className="text-center text-h3 text-secondary lg:hidden dark:text-white">
            Goglish
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-h3 text-secondary dark:text-white">{title}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
