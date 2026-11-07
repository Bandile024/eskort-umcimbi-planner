import PublicGroupClient from "@/components/group-order/PublicGroupClient";

export default async function GroupOrderSuccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicGroupClient token={token} mode="success" />;
}
