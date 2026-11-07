import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import FulfilmentClient from "@/components/group-order/FulfilmentClient";

export default async function GroupOrderFulfilmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/my-orders/group/${id}/fulfilment`)}`);
  return <FulfilmentClient id={id} userId={user.id} />;
}
