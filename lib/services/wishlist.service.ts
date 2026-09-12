import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WishlistCourse, WishlistTeacher } from "@/lib/api/queries/wishlist";

export async function getWishlistCourses(
  supabase: SupabaseClient,
  userId: string,
): Promise<WishlistCourse[]> {
  const { data, error } = await supabase
    .from("course_wishlist")
    .select("course_id, created_at, courses(id, title, slug, cover_image_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as WishlistCourse[];
}

export async function getWishlistTeachers(
  supabase: SupabaseClient,
  userId: string,
): Promise<WishlistTeacher[]> {
  const { data, error } = await supabase
    .from("favorite_teachers")
    .select("teacher_id, created_at, teachers(id, teacher_profiles(display_name, photo_url))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as WishlistTeacher[];
}
