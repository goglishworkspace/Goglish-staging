"use client";

import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/api/queries/profile";
import { GradeChangeSection } from "@/components/dashboard/GradeChangeSection";

export default function ChooseGradePage() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <PartyPopper className="size-8 text-primary" />
          <h1 className="text-h2 text-secondary dark:text-white">أهلاً بيك في Goglish!</h1>
          <p className="text-small text-muted-foreground">
            أكّد صفك الدراسي عشان نجهزلك الكورسات والمحتوى المناسب ليك.
          </p>
        </CardContent>
      </Card>

      {isLoading || !profile ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <GradeChangeSection profile={profile} />
      )}

      <Button className="w-full" disabled={!profile?.grade} onClick={() => router.push("/student/dashboard")}>
        متابعة للوحة التحكم
      </Button>
    </div>
  );
}
