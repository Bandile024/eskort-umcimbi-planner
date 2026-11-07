"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { getGroupOrderById, listContributions, updateDeadline } from "@/lib/groupOrders";
import {
  deadlineLabel,
  formatDateZA,
  formatZAR,
  getGroupOrderPublicUrl,
  remainingBalance,
} from "@/lib/groupOrderUtils";
import type { Contribution, GroupOrder } from "@/types/groupOrder";
import {
  ContributionProgress,
  GroupOrderProblem,
  GroupOrderSkeleton,
  GroupOrderStatusBadge,
  GroupOrderSummary,
} from "@/components/group-order/GroupOrderUI";

export default function OrganizerGroupClient({ id, userId }: { id: string; userId: string }) {
  const [order, setOrder] = useState<GroupOrder | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deadlineValue, setDeadlineValue] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await getGroupOrderById(id);
      if (!current || current.organizerId !== userId) {
        setOrder(null);
        setError("Link not valid");
        return;
      }
      setOrder(current);
      setDeadlineValue(current.deadline.slice(0, 10));
      setContributions(await listContributions(current.id));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load this group order.");
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => { void load(); }, [load]);

  let link = "";
  let publicLinkError = "";
  if (typeof window !== "undefined" && order) {
    try {
      link = getGroupOrderPublicUrl(order.token, window.location.origin);
    } catch (issue) {
      publicLinkError = issue instanceof Error ? issue.message : "The public group-order domain is not configured.";
    }
  }
  const deadlineEditable = order?.status === "upcoming" && deadlineLabel(order.deadline) !== "Deadline passed";

  const copyLink = async () => {
    if (!link) {
      setMessage(publicLinkError || "The public group-order link is unavailable.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Group link copied.");
    } catch {
      setMessage("Could not copy the link. Copy it from the address below.");
    }
  };

  const copyProgressUpdate = async () => {
    if (!order || !link) {
      setMessage(publicLinkError || "The public group-order link is unavailable.");
      return;
    }
    const text = `We're ${formatZAR(remainingBalance(order))} away from paying for ${order.name}! Chip in: ${link}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Progress update copied. Paste it into a message to your group.");
    } catch {
      setMessage(`Copy this progress update: ${text}`);
    }
  };

  const saveDeadline = async () => {
    if (!order) return;
    setBusy(true);
    setMessage("");
    try {
      setOrder(await updateDeadline(order.id, deadlineValue));
      setMessage("Payment deadline updated.");
    } catch (issue) {
      setMessage(issue instanceof Error ? issue.message : "Could not update the deadline.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <GroupOrderSkeleton />;
  if (error) return <GroupOrderProblem message={error} retry={() => void load()} backHref="/account/orders" />;
  if (!order) return <GroupOrderProblem message="Link not valid" />;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-eskort-yellow">MY GROUP ORDER</p>
          <h1 className="font-display text-4xl text-white sm:text-5xl">{order.name}</h1>
          <p className="mt-1 text-gray-400">Payment deadline: {formatDateZA(order.deadline)} · {deadlineLabel(order.deadline)}</p>
        </div>
        <GroupOrderStatusBadge status={order.status} />
      </header>
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-700 bg-eskort-dark-card p-4">
        <button type="button" onClick={() => void copyLink()} disabled={!link} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-600 px-4 font-semibold text-white hover:border-eskort-yellow disabled:opacity-50"><Copy size={16} />Copy link</button>
        <button type="button" onClick={() => void copyProgressUpdate()} disabled={!link} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-eskort-red px-4 font-semibold text-white disabled:opacity-50"><Copy size={16} />Copy progress update</button>
        {link && <a href={link} rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-gray-600 px-4 font-semibold text-white">Public page</a>}
      </div>
      {message && <p role="status" aria-live="polite" className="rounded-lg bg-blue-900/30 p-3 text-blue-100">{message}</p>}
      {link && <p className="break-all text-sm text-gray-400">{link}</p>}
      {publicLinkError && <p role="alert" className="rounded-lg bg-red-900/30 p-3 text-sm text-red-200">{publicLinkError}</p>}
      {(order.status === "confirmed" || (order.status === "awaiting_fulfilment" && !order.fulfilmentMethod)) && <Link href={`/my-orders/group/${order.id}/fulfilment`} className="flex min-h-12 items-center justify-center rounded-lg bg-eskort-yellow px-5 font-bold text-black">Confirm pickup or delivery</Link>}
      <ContributionProgress order={order} />
      <GroupOrderSummary order={order} />
      <section className="rounded-xl border border-gray-700 bg-eskort-dark-card p-4 sm:p-6">
        <h2 className="font-display text-2xl text-white">PAYMENT DEADLINE</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="edit-group-deadline" className="mb-1 block text-sm text-gray-300">New deadline</label>
            <input id="edit-group-deadline" type="date" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)} value={deadlineValue} onChange={(event) => setDeadlineValue(event.target.value)} disabled={!deadlineEditable} className="min-h-11 rounded-lg border border-gray-600 bg-eskort-dark-bg px-3 text-white disabled:opacity-50" />
          </div>
          <button type="button" onClick={() => void saveDeadline()} disabled={!deadlineEditable || busy || !deadlineValue} className="min-h-11 rounded-lg bg-eskort-red px-5 font-bold text-white disabled:opacity-50">{busy ? "Saving..." : "Edit deadline"}</button>
        </div>
        {!deadlineEditable && <p className="mt-2 text-sm text-gray-400">Deadline editing is available only before the deadline on upcoming orders.</p>}
      </section>
      <section className="rounded-xl border border-gray-700 bg-eskort-dark-card p-4 sm:p-6">
        <h2 className="font-display text-2xl text-white">CONTRIBUTIONS</h2>
        {contributions.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-gray-600 p-5 text-center text-gray-300">No contributions yet. Be the first.</p> : (
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
    </main>
  );
}
