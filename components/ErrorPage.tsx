import Link from "next/link";
import { Button } from "@/components/ui/button";

type Action = { label: string; href: string } | { label: string; onClick: () => void };

export function ErrorPage({
  code,
  heading,
  message,
  action,
}: {
  code: string | number;
  heading: string;
  message: string;
  action?: Action;
}) {
  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="text-6xl font-bold text-primary">{code}</p>
      <h1 className="text-h2 text-secondary dark:text-white">{heading}</h1>
      <p className="max-w-md text-body text-muted-foreground">{message}</p>
      {action && "href" in action && (
        <Button nativeButton={false} render={<Link href={action.href} />}>
          {action.label}
        </Button>
      )}
      {action && "onClick" in action && <Button onClick={action.onClick}>{action.label}</Button>}
    </main>
  );
}
