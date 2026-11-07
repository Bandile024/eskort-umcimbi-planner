"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  adminListGroupOrders,
  adminMarkRefundsProcessed,
  adminUpdateStatus,
  listContributions,
} from "@/lib/groupOrders";
import { formatDateZA, formatZAR } from "@/lib/groupOrderUtils";
import type { Contribution, GroupOrder, GroupOrderStatus } from "@/types/groupOrder";
import { GroupOrderProblem, GroupOrderSkeleton, GroupOrderStatusBadge, GroupOrderSummary } from "@/components/group-order/GroupOrderUI";

export default function AdminGroupOrdersClient({ orderId }: { orderId?: string }) {
  const [orders, setOrders] = useState<GroupOrder[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await adminListGroupOrders();
      setOrders(all);
      if (orderId) {
        const order = all.find((candidate) => candidate.id === orderId);
        if (!order) throw new Error("Link not valid");
        setContributions(await listContributions(order.id));
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load group orders.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);

  const current = orders.find((order) => order.id === orderId);
  const updateStatus = async (id: string, status: GroupOrderStatus, label: string) => {
    setBusy(true);
    setActionMessage("");
    try {
      await adminUpdateStatus(id, status);
      setActionMessage(`${label} completed.`);
      await load();
    } catch (issue) {
      setActionMessage(issue instanceof Error ? issue.message : `Could not ${label.toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  };
  const processRefunds = async (id: string) => {
    setBusy(true);
    setActionMessage("");
    try {
      await adminMarkRefundsProcessed(id);
      setActionMessage("Refunds marked as processed.");
      await load();
    } catch (issue) {
      setActionMessage(issue instanceof Error ? issue.message : "Could not update refunds.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <GroupOrderSkeleton />;
  if (error) return <GroupOrderProblem message={error} retry={() => void load()} backHref="/admin/dashboard" />;

  if (orderId) {
    if (!current) return <GroupOrderProblem message="Link not valid" backHref="/admin/group-orders" />;
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <Link href="/admin/group-orders" className="inline-flex min-h-11 items-center text-sm font-semibold text-eskort-yellow">← Group Orders</Link>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm text-eskort-yellow">ADMIN · GROUP ORDER</p><h1 className="font-display text-4xl text-white sm:text-5xl">{current.name}</h1></div>
          <GroupOrderStatusBadge status={current.status} />
        </header>
        <div className="rounded-xl border border-gray-700 bg-eskort-dark-card p-4 text-sm text-gray-300">
          <p>Organizer: <strong className="text-white">{current.organizerName}</strong></p>
          <p className="mt-1">Deadline: {formatDateZA(current.deadline)} · Fulfilment: {current.fulfilmentMethod ?? "Not selected"}</p>
          <p className="mt-1">Refunds: {current.refundsProcessed ? "Processed" : current.status === "expired" ? "Pending" : "Not applicable"}</p>
        </div>
        <GroupOrderSummary order={current} />
        <section className="rounded-xl border border-gray-700 bg-eskort-dark-card p-4 sm:p-6">
          <h2 className="font-display text-2xl text-white">CONTRIBUTIONS</h2>
          {contributions.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-gray-600 p-6 text-center text-gray-300">No contributions yet. Be the first.</p> : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase text-gray-400"><tr className="border-b border-gray-700"><th className="py-3">Name</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{contributions.map((contribution) => <tr key={contribution.id} className="border-b border-gray-800 text-gray-200">
                  <td className="py-3">{contribution.name} {contribution.surname}</td><td>{formatDateZA(contribution.createdAt)}</td><td>{formatZAR(contribution.amount)}</td><td className="capitalize">{contribution.status}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
        {actionMessage && <p role="status" aria-live="polite" className="rounded-lg bg-blue-900/30 p-3 text-blue-100">{actionMessage}</p>}
        <div className="flex flex-wrap gap-3">
          {current.status === "awaiting_fulfilment" && current.fulfilmentMethod === "pickup" && <button type="button" disabled={busy} onClick={() => void updateStatus(current.id, "ready", "Mark Ready")} className="min-h-11 rounded-lg bg-eskort-yellow px-5 font-bold text-black disabled:opacity-50">Mark Ready</button>}
          {current.status === "awaiting_fulfilment" && current.fulfilmentMethod === "delivery" && <button type="button" disabled={busy} onClick={() => void updateStatus(current.id, "ready", "Mark Out for Delivery")} className="min-h-11 rounded-lg bg-eskort-yellow px-5 font-bold text-black disabled:opacity-50">Mark Out for Delivery</button>}
          {current.status === "ready" && <button type="button" disabled={busy} onClick={() => void updateStatus(current.id, "completed", "Mark Completed")} className="min-h-11 rounded-lg bg-eskort-red px-5 font-bold text-white disabled:opacity-50">Mark Completed</button>}
          {current.status === "expired" && !current.refundsProcessed && <button type="button" disabled={busy} onClick={() => void processRefunds(current.id)} className="min-h-11 rounded-lg bg-eskort-yellow px-5 font-bold text-black disabled:opacity-50">Mark refunds processed</button>}
          {current.status === "expired" && current.refundsProcessed && <p className="self-center text-sm text-green-300">Refunds processed.</p>}
        </div>
      </main>
    );
  }

  const ongoing = orders.filter((order) => ["upcoming", "confirmed", "awaiting_fulfilment", "ready"].includes(order.status));
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/admin/dashboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-eskort-yellow">← Admin Dashboard</Link>
      <h1 className="mt-3 font-display text-5xl text-white">GROUP ORDERS</h1>
      <p className="mt-1 text-gray-400">Orders in Progress · {ongoing.length}</p>
      {orders.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-gray-600 p-8 text-center text-gray-300">No group orders yet.</p> : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-700 bg-eskort-dark-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-gray-400"><tr className="border-b border-gray-700"><th className="p-4">Group name</th><th>Organizer</th><th>Total</th><th>Amount paid</th><th>Deadline</th><th>Status</th><th>Fulfilment</th></tr></thead>
            <tbody>{orders.map((order) => <tr key={order.id} className="border-b border-gray-800 text-gray-200 hover:bg-white/5">
              <td className="p-4"><Link href={`/admin/group-orders/${order.id}`} className="font-semibold text-eskort-yellow hover:underline">{order.name}</Link></td>
              <td>{order.organizerName}</td><td>{formatZAR(order.total)}</td><td>{formatZAR(order.amountPaid)}</td><td>{formatDateZA(order.deadline)}</td>
              <td><GroupOrderStatusBadge status={order.status} /></td><td className="capitalize">{order.fulfilmentMethod ?? "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
