import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WidgetCard({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-small font-semibold text-muted-foreground">
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function WidgetEmpty({ text }: { text: string }) {
  return <p className="text-small text-muted-foreground">{text}</p>;
}
