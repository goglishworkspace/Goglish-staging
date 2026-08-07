import { TEACHER_NAV_ITEMS } from "./teacher-nav";
import { ADMIN_NAV_ITEMS } from "./admin-nav";
import { PARENT_NAV_ITEMS } from "./parent-nav";

/** Client-side lookup so ShellSidebar/ShellTopbar can be handed a plain
 * string (navKey) instead of the nav items array itself - see the comment
 * on ShellSidebar for why that distinction matters. */
export const NAV_BY_KEY = {
  teacher: TEACHER_NAV_ITEMS,
  admin: ADMIN_NAV_ITEMS,
  parent: PARENT_NAV_ITEMS,
};

export type ShellNavKey = keyof typeof NAV_BY_KEY;
