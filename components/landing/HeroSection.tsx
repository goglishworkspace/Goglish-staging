import Link from "next/link";
import { GraduationCap, BookOpenCheck, Timer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURE_BADGES = [
  { icon: BookOpenCheck, label: "شرح واضح لكل درس" },
  { icon: Timer, label: "امتحانات" },
  { icon: Trophy, label: "منافسة مع زملائك" },
];

export function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="w-full px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-start">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-small font-medium text-secondary dark:text-primary">
            <GraduationCap className="size-4" />
            منصة Goglish التعليمية
          </span>

          <h1 className="max-w-xl text-h1 text-secondary dark:text-white">Goglish</h1>
          <p className="max-w-xl text-h3 text-secondary dark:text-white">
            ذاكر صح...وادخل الامتحان وانت واثق 🎓
          </p>
          <p className="max-w-md text-body text-muted-foreground">
            شرح واضح، تدريبات ضخمة، امتحانات - ومنافسة حقيقية مع زملائك في كل مصر.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isLoggedIn ? (
              <Button size="lg" nativeButton={false} render={<Link href="/profile" />}>
                اذهب لحسابك
              </Button>
            ) : (
              <>
                <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
                  ابدأ الآن
                </Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
                  تسجيل الدخول
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
            {FEATURE_BADGES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-small text-foreground"
              >
                <Icon className="size-3.5 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 440"
      className="w-64 sm:w-80 lg:w-full lg:max-w-md"
      role="img"
      aria-label="رسم توضيحي لطالب بيذاكر ويدخل امتحان بثقة"
    >
      <circle cx="240" cy="220" r="200" className="fill-muted" />

      {/* main exam-paper card, slightly tilted */}
      <g transform="rotate(-6 240 220)">
        <rect x="120" y="90" width="220" height="270" rx="18" className="fill-card stroke-border" strokeWidth="2" />
        <rect x="150" y="130" width="140" height="12" rx="6" className="fill-secondary dark:fill-white" />
        <rect x="150" y="160" width="160" height="8" rx="4" className="fill-muted-foreground/40" />
        <rect x="150" y="180" width="120" height="8" rx="4" className="fill-muted-foreground/40" />
        <rect x="150" y="210" width="150" height="8" rx="4" className="fill-muted-foreground/40" />
        <rect x="150" y="230" width="100" height="8" rx="4" className="fill-muted-foreground/40" />

        {/* answer bubbles */}
        <circle cx="160" cy="270" r="8" className="fill-primary" />
        <rect x="176" y="264" width="120" height="10" rx="5" className="fill-muted-foreground/30" />
        <circle cx="160" cy="298" r="8" className="fill-none stroke-border" strokeWidth="2" />
        <rect x="176" y="292" width="90" height="10" rx="5" className="fill-muted-foreground/30" />
        <circle cx="160" cy="326" r="8" className="fill-none stroke-border" strokeWidth="2" />
        <rect x="176" y="320" width="105" height="10" rx="5" className="fill-muted-foreground/30" />
      </g>

      {/* big check-mark stamp badge */}
      <circle cx="345" cy="120" r="46" className="fill-primary" />
      <path
        d="M325 120 L340 135 L368 103"
        className="fill-none stroke-secondary"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* timer badge, top-left */}
      <g transform="translate(60 60)">
        <circle cx="30" cy="30" r="34" className="fill-secondary" />
        <circle cx="30" cy="32" r="16" className="fill-none stroke-brand-accent" strokeWidth="3.5" />
        <path d="M30 32 L30 22" className="stroke-brand-accent" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M30 32 L38 36" className="stroke-brand-accent" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="24" y="10" width="12" height="6" rx="3" className="fill-brand-accent" />
      </g>

      {/* trophy badge, bottom-right */}
      <g transform="translate(330 320)">
        <circle cx="34" cy="34" r="40" className="fill-primary" />
        <path
          d="M22 22h24v14a12 12 0 0 1-24 0V22Z"
          className="fill-none stroke-secondary"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M22 24h-6a6 6 0 0 0 6 10 M46 24h6a6 6 0 0 1-6 10"
          className="fill-none stroke-secondary"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="30" y="46" width="8" height="8" className="fill-secondary" />
        <rect x="24" y="54" width="20" height="5" rx="2.5" className="fill-secondary" />
      </g>

      {/* decorative dots */}
      <circle cx="95" cy="360" r="6" className="fill-primary" />
      <circle cx="410" cy="230" r="5" className="fill-secondary dark:fill-white" />
      <circle cx="430" cy="90" r="4" className="fill-primary" />
    </svg>
  );
}
