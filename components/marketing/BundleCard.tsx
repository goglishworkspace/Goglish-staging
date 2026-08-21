import Link from "next/link";
import { Package, PlayCircle, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bundleCourseList, type Bundle } from "@/lib/api/queries/bundles";

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const courses = bundleCourseList(bundle);

  return (
    <Link href={`/bundles/${bundle.id}`}>
      <Card className="w-full overflow-hidden transition-shadow hover:shadow-md">
        {bundle.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bundle.cover_image_url} alt={bundle.title} className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted text-h3 text-muted-foreground">
            {bundle.title.charAt(0)}
          </div>
        )}
        <CardContent className="flex flex-col gap-2 p-4">
          <Badge className="w-fit gap-1">
            <Package className="size-3" />
            باقة
          </Badge>
          <h3 className="line-clamp-1 font-semibold text-foreground">{bundle.title}</h3>
          {bundle.description && <p className="line-clamp-2 text-small text-muted-foreground">{bundle.description}</p>}
          <p className="text-caption text-muted-foreground">
            تشمل: {courses.map((c) => c.title).join("، ") || "-"}
          </p>
          <p className="mt-1 text-small font-semibold text-secondary dark:text-white">
            {bundle.price_cents === 0
              ? "مجاني"
              : `${(bundle.price_cents / 100).toLocaleString("ar-EG")} ${bundle.currency}`}
          </p>
          <span className={cn(buttonVariants({ variant: bundle.has_access ? "default" : "outline" }), "mt-1 w-full justify-center")}>
            {bundle.has_access ? (
              <>
                <PlayCircle />
                إكمال التعلم
              </>
            ) : (
              <>
                <ShoppingCart />
                اشتراك
              </>
            )}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
