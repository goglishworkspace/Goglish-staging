import { LayoutDashboard, BookOpen, TrendingUp, Trophy, Heart, Search, Bell, User } from "lucide-react";

export const DASHBOARD_NAV_ITEMS = [
  { href: "/student/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/student/subjects", label: "المواد الدراسية", icon: BookOpen },
  { href: "/student/progress", label: "التقدم", icon: TrendingUp },
  { href: "/student/honor-board", label: "لوحة الشرف", icon: Trophy },
  { href: "/student/wishlist", label: "المفضلة", icon: Heart },
  { href: "/student/search", label: "البحث", icon: Search },
  { href: "/student/notifications", label: "الإشعارات", icon: Bell },
  { href: "/student/profile", label: "الملف الشخصي", icon: User },
];
