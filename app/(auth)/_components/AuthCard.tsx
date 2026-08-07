import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="text-center text-h3 text-secondary dark:text-white">
          Goglish
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-h3 text-secondary dark:text-white">{title}</CardTitle>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
