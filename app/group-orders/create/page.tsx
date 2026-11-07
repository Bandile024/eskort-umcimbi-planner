import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import GroupOrderSetupClient from "@/components/group-order/GroupOrderSetupClient";

export default async function CreateGroupOrderPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/group-orders/create")}`);
  }
  return (
    <GroupOrderSetupClient
      userId={user.id}
      organizerName={user.user_metadata?.full_name || user.email?.split("@")[0] || "Organizer"}
    />
  );
}
