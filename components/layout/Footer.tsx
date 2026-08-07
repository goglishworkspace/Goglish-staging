import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full bg-muted/30">
      <div className="w-full border-t border-border px-4 pt-12 pb-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              سياسة الخصوصية
            </Link>
            <Link href="/" className="hover:text-foreground">
              الشروط والأحكام
            </Link>
            <Link href="#faq" className="hover:text-foreground">
              الأسئلة الشائعة
            </Link>
          </div>

          <div className="flex items-center justify-center gap-4">
            {SOCIAL_LINKS.map(({ name, Icon }) => (
              <span key={name} aria-label={name} className="text-muted-foreground hover:text-foreground">
                <Icon className="size-[18px]" />
              </span>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Goglish. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5V8.5l6.4 3.5-6.4 3.5Z" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2ZM8 19H5v-9h3Zm-1.5-10.25A1.75 1.75 0 1 1 8.25 7 1.75 1.75 0 0 1 6.5 8.75ZM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66Z" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.42 2H21l-6.55 7.49L22.24 22h-6.62l-5.18-6.78L4.5 22H1.9l7.03-8.03L1 2h6.78l4.68 6.2Zm-1.16 18h1.83L6.86 3.9H4.9Z" />
    </svg>
  );
}

function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82c-.72-.79-1.12-1.82-1.12-2.82h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 2 .2 2.4.4a4.9 4.9 0 0 1 1.8 1.2 4.9 4.9 0 0 1 1.2 1.8c.2.4.3 1.2.4 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 2-.4 2.4a4.9 4.9 0 0 1-1.2 1.8 4.9 4.9 0 0 1-1.8 1.2c-.4.2-1.2.3-2.4.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-2-.2-2.4-.4a4.9 4.9 0 0 1-1.8-1.2 4.9 4.9 0 0 1-1.2-1.8c-.2-.4-.3-1.2-.4-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-2 .4-2.4a4.9 4.9 0 0 1 1.2-1.8A4.9 4.9 0 0 1 5.7 2.7c.4-.2 1.2-.3 2.4-.4C9.4 2.2 9.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.1-1 .05-1.6.2-1.9.3a3 3 0 0 0-1.1.7 3 3 0 0 0-.7 1.1c-.1.3-.3.9-.3 1.9-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.05 1 .2 1.6.3 1.9a3 3 0 0 0 .7 1.1 3 3 0 0 0 1.1.7c.3.1.9.3 1.9.3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1-.05 1.6-.2 1.9-.3a3 3 0 0 0 1.1-.7 3 3 0 0 0 .7-1.1c.1-.3.3-.9.3-1.9.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.05-1-.2-1.6-.3-1.9a3 3 0 0 0-.7-1.1 3 3 0 0 0-1.1-.7c-.3-.1-.9-.3-1.9-.3-1.2-.1-1.6-.1-4.7-.1Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm5.3-2a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { name: "يوتيوب", Icon: YoutubeIcon },
  { name: "لينكدإن", Icon: LinkedinIcon },
  { name: "تويتر", Icon: XIcon },
  { name: "تيك توك", Icon: TiktokIcon },
  { name: "فيسبوك", Icon: FacebookIcon },
  { name: "انستجرام", Icon: InstagramIcon },
];
