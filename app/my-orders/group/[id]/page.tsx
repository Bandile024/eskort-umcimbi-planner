import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import OrganizerGroupClient from "@/components/group-order/OrganizerGroupClient";

export default async function OrganizerGroupOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/my-orders/group/${id}`)}`);
  return <OrganizerGroupClient id={id} userId={user.id} />;
}
