import { LayoutDashboard, BarChart3, MessageCircle, Bell, User } from "lucide-react";

export const TEACHER_NAV_ITEMS = [
  { href: "/teacher/dashboard", label: "المحتوى", icon: LayoutDashboard },
  { href: "/teacher/analytics", label: "التقارير والتحليلات", icon: BarChart3 },
  { href: "/teacher/notifications", label: "الإشعارات", icon: Bell },
  { href: "/teacher/comments", label: "تعليقاتي", icon: MessageCircle },
  { href: "/teacher/profile", label: "الملف الشخصي", icon: User },
];
