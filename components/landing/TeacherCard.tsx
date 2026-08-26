import Link from "next/link";
import { getTeacherProfile, type Teacher } from "@/lib/api/queries/teachers";
import { AvatarImage } from "@/components/shared/AvatarImage";
import { Card, CardContent } from "@/components/ui/card";

export function TeacherCard({ teacher }: { teacher: Teacher }) {
  const profile = getTeacherProfile(teacher);
  if (!profile || !profile.display_name) return null;

  return (
    <Link href={`/teachers/${teacher.id}`} className="block w-36 shrink-0 sm:w-40">
      <Card className="items-center py-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary p-[3px] shadow-[0_0_20px_-6px_rgba(245,197,24,0.7)]">
            <AvatarImage
              src={profile.photo_url}
              initials={profile.display_name.charAt(0)}
              alt={profile.display_name}
              size={74}
              className="size-full border-2 border-background"
            />
          </span>
          <span className="line-clamp-2 text-small font-semibold text-foreground">{profile.display_name}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
