import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import AdminGroupOrdersClient from "@/components/group-order/AdminGroupOrdersClient";

export default async function AdminGroupOrdersPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?redirect=/admin/group-orders");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return <AdminGroupOrdersClient />;
}
