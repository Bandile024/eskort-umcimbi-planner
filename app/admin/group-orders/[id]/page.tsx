import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import AdminGroupOrdersClient from "@/components/group-order/AdminGroupOrdersClient";

export default async function AdminGroupOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?redirect=/admin/group-orders");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  const { id } = await params;
  return <AdminGroupOrdersClient orderId={id} />;
}
