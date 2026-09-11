"use client";

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export function WhatsAppFloatingButton({
  phoneNumber = "201041966384",
  defaultMessage = "مرحباً، أود الاستفسار عن منصة Goglish",
}: WhatsAppFloatingButtonProps) {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <aside
      aria-label="محادثة واتساب"
      className="fixed bottom-6 left-6 z-50 flex items-center group pointer-events-auto"
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل معنا عبر واتساب"
        className="relative flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:scale-105 hover:bg-[#20bd5a] hover:shadow-xl hover:shadow-[#25D366]/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#25D366]/50 active:scale-95"
      >

        {/* Official WhatsApp SVG icon */}
        <WhatsAppIcon className="size-6 shrink-0" />

        {/* Text label: visible on desktop and mobile */}
        <span className="text-sm font-semibold tracking-wide">
          تواصل معنا
        </span>
      </a>
    </aside>
  );
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.42 0-2.82-.37-4.06-1.08l-.29-.17-3.12.82.83-3.04-.19-.3a8.19 8.19 0 0 1-1.26-4.46c0-4.54 3.7-8.24 8.24-8.24m4.8 11.66c-.26-.13-1.56-.77-1.8-.86-.24-.09-.42-.13-.6.13-.17.26-.69.86-.85 1.04-.15.17-.31.2-.57.07-.26-.13-1.11-.41-2.11-1.3-.78-.7-1.31-1.56-1.46-1.82-.16-.26-.02-.4.11-.53.12-.11.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.33-.02-.46-.07-.13-.6-1.44-.82-1.97-.22-.52-.44-.45-.6-.46-.16-.01-.34-.01-.52-.01-.17 0-.46.07-.7.33-.24.26-.93.91-.93 2.22s.95 2.58 1.08 2.76c.13.17 1.87 2.86 4.54 4.01.63.28 1.13.44 1.52.56.64.21 1.22.18 1.68.11.51-.08 1.56-.64 1.78-1.25.22-.61.22-1.13.15-1.25-.06-.11-.23-.18-.49-.31" />
    </svg>
  );
}
