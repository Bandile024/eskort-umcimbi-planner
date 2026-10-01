import { Metadata } from "next"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import AccountClient from "./account-client"

export const metadata: Metadata = {
  title: "My Account - Eskort",
  description: "Manage your Eskort account and orders",
}

export default async function AccountPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect=/account")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single()

  return <AccountClient user={user} profile={profile} />
}