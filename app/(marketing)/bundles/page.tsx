"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { BundleCard } from "@/components/marketing/BundleCard";
import { useBundles } from "@/lib/api/queries/bundles";

export default function BundlesPage() {
  const { data: bundles, isLoading, isError } = useBundles();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-h2 text-secondary dark:text-white">الباقات</h1>
      <p className="mt-1 text-small text-muted-foreground">مجموعات كورسات بسعر واحد موفّر.</p>

      {isError && <p className="mt-8 text-small text-muted-foreground">تعذر تحميل الباقات.</p>}

      {isLoading && (
        <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && !bundles?.length && (
        <p className="mt-8 text-small text-muted-foreground">مفيش باقات متاحة دلوقتي.</p>
      )}

      {!isLoading && !!bundles?.length && (
        <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} />
          ))}
        </div>
      )}
    </div>
  );
}
