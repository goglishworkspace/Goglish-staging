import { cookies, headers } from "next/headers";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserActiveDevices } from "@/lib/services/device.service";
import { getNotificationPreferencesForUser } from "@/lib/services/notification.service";
import { DEVICE_COOKIE_NAME, computeDeviceFingerprint } from "@/lib/services/device-fingerprint";
import { ProfileContent } from "@/components/profile/ProfileContent";

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const deviceCookie = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  const userAgent = headerStore.get("user-agent");
  const currentFingerprint = deviceCookie ? await computeDeviceFingerprint(deviceCookie, userAgent) : null;

  const queryClient = new QueryClient();

  const [devices, preferences] = await Promise.all([
    getUserActiveDevices(supabase, user.id, currentFingerprint),
    getNotificationPreferencesForUser(supabase, user.id),
  ]);

  queryClient.setQueryData(["devices"], devices);
  queryClient.setQueryData(["notification-preferences"], preferences);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileContent showGrade />
    </HydrationBoundary>
  );
}

