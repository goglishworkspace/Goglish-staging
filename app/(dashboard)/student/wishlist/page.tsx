import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWishlistCourses, getWishlistTeachers } from "@/lib/services/wishlist.service";
import { WishlistView } from "./WishlistView";

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const queryClient = new QueryClient();

  const [courses, teachers] = await Promise.all([
    getWishlistCourses(supabase, user.id),
    getWishlistTeachers(supabase, user.id),
  ]);

  queryClient.setQueryData(["wishlist-courses"], courses);
  queryClient.setQueryData(["wishlist-teachers"], teachers);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WishlistView />
    </HydrationBoundary>
  );
}
