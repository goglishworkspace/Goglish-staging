import Image from "next/image";
import { cn } from "@/lib/utils";

/** Renders a user's avatar if they have one, else initials in a circle.
 * The onContextMenu/draggable guards are a deterrent only (same spirit as
 * VideoDeterrents.tsx) - the actual protection is the private storage
 * bucket + short-lived signed URL (see avatar.service.ts), which means
 * there's never a permanent/public link to hotlink or bookmark. */
export function AvatarImage({
  src,
  initials,
  alt,
  size = 32,
  className,
}: {
  src: string | null;
  initials: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-secondary text-small text-brand-accent",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {initials}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className={cn("shrink-0 select-none rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
