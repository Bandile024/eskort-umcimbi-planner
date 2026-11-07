"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getGroupOrderByToken,
  getPublicContributionPayment,
  listPublicContributions,
  startContributionPayment,
} from "@/lib/groupOrders";
import { deadlineLabel, formatZAR, remainingBalance, validateContribution } from "@/lib/groupOrderUtils";
import type { Contribution, PublicContribution, PublicGroupOrder } from "@/types/groupOrder";
import ContributionPaymentModal from "@/components/group-order/ContributionPaymentModal";
import {
  ContributionProgress,
  ContributorsList,
  DeadlineNotice,
  GroupOrderProblem,
  GroupOrderSkeleton,
  GroupOrderStatusBadge,
  GroupOrderSummary,
} from "@/components/group-order/GroupOrderUI";

type PublicMode = "landing" | "contribute" | "tracker" | "success" | "cancelled";
type FormFields = { name: string; surname: string; amount: string };
const emptyFields: FormFields = { name: "", surname: "", amount: "" };

export default function PublicGroupClient({ token, mode }: { token: string; mode: PublicMode }) {
  const searchParams = useSearchParams();
  const contributionId = searchParams.get("contribution_id");
  const [order, setOrder] = useState<PublicGroupOrder | null>(null);
  const [contributions, setContributions] = useState<PublicContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [details, setDetails] = useState<FormFields>(emptyFields);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [thanks, setThanks] = useState<{ name: string; amount: number } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"checking" | Contribution["status"] | "error" | null>(null);
  const [statusRetry, setStatusRetry] = useState(0);
  const closePayment = useCallback(() => setPaymentOpen(false), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const currentOrder = await getGroupOrderByToken(token);
      setOrder(currentOrder);
      if (currentOrder && (mode === "tracker" || mode === "success")) {
        setContributions(await listPublicContributions(token));
      } else {
        setContributions([]);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load this group order.");
    } finally {
      setLoading(false);
    }
  }, [token, mode]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (mode !== "success" || !contributionId) return;
    let active = true;
    let timer: number | undefined;
    setPaymentStatus("checking");
    const check = async (attempt: number) => {
      try {
        const payment = await getPublicContributionPayment(token, contributionId);
        if (!active) return;
        setPaymentStatus(payment.status);
        if (payment.status === "paid") {
          setThanks({ name: payment.name, amount: payment.amount });
          void load();
          return;
        }
        if (payment.status === "pending" && attempt < 12) {
          timer = window.setTimeout(() => { void check(attempt + 1); }, 2500);
        }
      } catch {
        if (active) setPaymentStatus("error");
      }
    };
    void check(0);
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [contributionId, load, mode, statusRetry, token]);

  const fieldErrors = validateContribution(
    { ...details, amount: Number(details.amount) },
    order ? remainingBalance(order) : 0,
  );
  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
  const formIsValid = Boolean(details.name.trim() && details.surname.trim() && details.amount && !hasFieldErrors);

  const startPayFastContribution = async () => {
    if (!order || !formIsValid || saving) return;
    setSaving(true);
    setFormError("");
    let submittedToPayFast = false;
    try {
      const amount = Number(details.amount);
      const checkout = await startContributionPayment({
        token,
        name: details.name.trim(),
        surname: details.surname.trim(),
        amount,
      });
      const paymentForm = document.createElement("form");
      paymentForm.method = "POST";
      paymentForm.action = checkout.url;
      for (const [key, value] of Object.entries(checkout.fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        paymentForm.appendChild(input);
      }
      document.body.appendChild(paymentForm);
      submittedToPayFast = true;
      paymentForm.submit();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not start PayFast checkout.");
    } finally {
      if (!submittedToPayFast) setSaving(false);
    }
  };

  if (loading) return <GroupOrderSkeleton />;
  if (loadError) return <GroupOrderProblem message={loadError} retry={() => void load()} />;
  if (!order) return <GroupOrderProblem message="Link not valid" />;

  if (mode === "cancelled") {
    return (
      <main className="min-h-[65vh] px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-700 bg-eskort-dark-card p-6 text-center sm:p-10">
          <h1 className="font-display text-4xl text-white sm:text-5xl">PAYMENT CANCELLED</h1>
          <p className="mt-3 text-gray-300">PayFast did not confirm a contribution. You can try again whenever you&apos;re ready.</p>
          <Link href={`/group/${token}/contribute`} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-eskort-red px-6 font-bold text-white">Try again</Link>
        </div>
      </main>
    );
  }

  if (mode === "contribute") {
    const balance = remainingBalance(order);
    const locked = order.status !== "upcoming" || deadlineLabel(order.deadline) === "Deadline passed";
    const amount = Number(details.amount) || 0;
    const setAmount = (value: number) => setDetails((current) => ({ ...current, amount: String(value) }));
    return (
      <main className="mx-auto min-h-[65vh] max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-gray-700 bg-eskort-dark-card p-5 sm:p-7">
          <h1 className="font-display text-4xl text-white sm:text-5xl">CONTRIBUTE</h1>
          <p className="mt-3 text-gray-300">{order.name} · {formatZAR(balance)} remaining</p>
          {locked ? (
            <div className="mt-6 rounded-lg bg-yellow-900/30 p-4 text-yellow-100" role="status">
              {order.status === "expired" || deadlineLabel(order.deadline) === "Deadline passed"
                ? "Deadline passed. Contributions will be refunded."
                : "This group order is fully paid. Contributions are closed."}
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); if (formIsValid) setPaymentOpen(true); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["name", "surname"] as const).map((field) => (
                  <div key={field}>
                    <label htmlFor={`contribution-${field}`} className="mb-1 block font-semibold text-white">{field === "name" ? "Name" : "Surname"}</label>
                    <input id={`contribution-${field}`} autoComplete={field === "name" ? "given-name" : "family-name"} value={details[field]} onChange={(event) => setDetails({ ...details, [field]: event.target.value })} onBlur={() => setSubmitted(true)} aria-invalid={submitted && Boolean(fieldErrors[field])} required className="min-h-12 w-full rounded-lg border border-gray-600 bg-eskort-dark-bg px-3 text-white focus:border-eskort-yellow focus:outline-none focus:ring-2 focus:ring-eskort-yellow/40" />
                    {submitted && fieldErrors[field] && <p className="mt-1 text-sm text-red-300" aria-live="polite">{fieldErrors[field]}</p>}
                  </div>
                ))}
              </div>
              <div>
                <label htmlFor="contribution-amount" className="mb-1 block font-semibold text-white">Amount (R)</label>
                <input id="contribution-amount" type="number" inputMode="decimal" min={Math.min(balance, 50)} max={balance} step="0.01" value={details.amount} onChange={(event) => setDetails({ ...details, amount: event.target.value })} onBlur={() => setSubmitted(true)} aria-invalid={submitted && Boolean(fieldErrors.amount)} required className="min-h-12 w-full rounded-lg border border-gray-600 bg-eskort-dark-bg px-3 text-white focus:border-eskort-yellow focus:outline-none focus:ring-2 focus:ring-eskort-yellow/40" />
                {submitted && fieldErrors.amount && <p className="mt-1 text-sm text-red-300" aria-live="polite">{fieldErrors.amount}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200, 500].filter((value) => value <= balance).map((value) => (
                  <button type="button" key={value} onClick={() => setAmount(value)} className="min-h-11 rounded-full border border-gray-600 px-4 text-sm font-semibold text-white hover:border-eskort-yellow focus-visible:outline focus-visible:outline-2 focus-visible:outline-eskort-yellow">{formatZAR(value).replace(".00", "")}</button>
                ))}
                {balance > 0 && <button type="button" onClick={() => setAmount(balance)} className="min-h-11 rounded-full border border-gray-600 px-4 text-sm font-semibold text-white hover:border-eskort-yellow focus-visible:outline focus-visible:outline-2 focus-visible:outline-eskort-yellow">Pay remaining {formatZAR(balance)}</button>}
              </div>
              <p className="rounded-lg bg-eskort-yellow/10 px-4 py-3 text-sm text-eskort-yellow" aria-live="polite">
                You are contributing {formatZAR(amount)} towards {order.name}
              </p>
              {formError && <p role="alert" aria-live="polite" className="rounded-lg bg-red-900/30 p-3 text-sm text-red-200">{formError}</p>}
              <p className="text-sm text-gray-400">Your contribution is counted only after PayFast confirms payment.</p>
              <button type="submit" disabled={!formIsValid || saving} className="min-h-12 w-full rounded-lg bg-eskort-red px-5 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                Pay with PayFast
              </button>
            </form>
          )}
          <Link href={`/group/${token}`} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-eskort-yellow hover:underline">Back to group order</Link>
        </div>
        {paymentOpen && (
          <ContributionPaymentModal
            amount={amount}
            busy={saving}
            error={formError}
            onClose={closePayment}
            onConfirm={() => { void startPayFastContribution(); }}
          />
        )}
      </main>
    );
  }

  if (mode === "tracker" || mode === "success") {
    return (
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-7">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl leading-none text-white sm:text-5xl">{order.name}</h1>
            <p className="mt-2 text-sm text-gray-300">Organized by <strong>{order.organizerName}</strong></p>
          </div>
          <GroupOrderStatusBadge status={order.status} />
        </header>
        <DeadlineNotice order={order} />
        {mode === "success" && thanks && (
          <div className="rounded-xl border border-green-700 bg-green-900/30 p-5 text-center" role="status">
            <p className="text-3xl" aria-hidden="true">🎉</p>
            <h2 className="mt-2 font-display text-3xl text-white">THANK YOU, {thanks.name.toUpperCase()}!</h2>
            <p className="mt-2 text-gray-200">Your contribution of <strong>{formatZAR(thanks.amount)}</strong> was received.</p>
          </div>
        )}
        {mode === "success" && !thanks && paymentStatus === "checking" && (
          <p role="status" className="rounded-lg bg-blue-900/30 p-4 text-blue-100">Checking your PayFast payment with the secure payment notification…</p>
        )}
        {mode === "success" && !thanks && (paymentStatus === "pending" || paymentStatus === "error") && (
          <div className="rounded-lg bg-yellow-900/30 p-4 text-yellow-100" role="status">
            <p>{paymentStatus === "pending" ? "PayFast has not confirmed this payment yet." : "We could not verify this payment yet."}</p>
            <button type="button" onClick={() => setStatusRetry((current) => current + 1)} className="mt-3 min-h-11 rounded-lg border border-yellow-200 px-4 font-semibold">Check again</button>
          </div>
        )}
        {mode === "success" && !thanks && paymentStatus === null && (
          <div className="rounded-lg bg-yellow-900/30 p-4 text-yellow-100" role="status">
            <p>This payment return has no reference to verify. Start a contribution to receive a verified payment status.</p>
            <Link href={`/group/${token}/contribute`} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-yellow-200 px-4 font-semibold">Return to contribute</Link>
          </div>
        )}
        {mode === "success" && paymentStatus === "failed" && (
          <div className="rounded-lg bg-red-900/30 p-4 text-red-100" role="status">
            <p>PayFast did not complete this payment. No contribution was added.</p>
            <Link href={`/group/${token}/contribute`} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-red-200 px-4 font-semibold">Try again</Link>
          </div>
        )}
        {mode === "success" && paymentStatus === "refund_pending" && (
          <p role="status" className="rounded-lg bg-yellow-900/30 p-4 text-yellow-100">PayFast confirmed the payment, but this group order is closed or already fully paid. The organizer will review the refund.</p>
        )}
        {mode === "success" && paymentStatus === "refunded" && (
          <p role="status" className="rounded-lg bg-blue-900/30 p-4 text-blue-100">This contribution was refunded.</p>
        )}
        <ContributionProgress order={order} />
        <GroupOrderSummary order={order} />
        <ContributorsList contributions={contributions} />
        <Link href={`/group/${token}`} className="flex min-h-12 items-center justify-center rounded-lg bg-eskort-red px-5 font-bold text-white">Back to group order</Link>
      </main>
    );
  }

  const expired = order.status === "expired" || deadlineLabel(order.deadline) === "Deadline passed";
  const closed = order.status !== "upcoming" || expired;
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl leading-none text-white sm:text-6xl">{order.name}</h1>
          <p className="mt-2 text-gray-300">Organized by <strong className="text-white">{order.organizerName}</strong></p>
        </div>
        <GroupOrderStatusBadge status={order.status} />
      </header>
      <DeadlineNotice order={order} />
      <ContributionProgress order={order} />
      {expired && <p className="rounded-lg bg-red-900/30 p-4 text-red-100" role="status">Deadline passed. Contributions will be refunded.</p>}
      {order.status === "confirmed" && <p className="rounded-lg bg-green-900/30 p-4 text-green-100" role="status">Fully paid! The organizer will confirm pickup or delivery.</p>}
      {order.status === "awaiting_fulfilment" && <p className="rounded-lg bg-green-900/30 p-4 text-green-100" role="status">Fully paid! Fulfilment: {order.fulfilmentMethod === "pickup" ? "Pickup" : "Delivery"}.</p>}
      {order.status === "ready" && <p className="rounded-lg bg-green-900/30 p-4 text-green-100" role="status">Fully paid! Your order is ready.</p>}
      {order.status === "completed" && <p className="rounded-lg bg-green-900/30 p-4 text-green-100" role="status">This group order has been completed.</p>}
      <GroupOrderSummary order={order} />
      {!closed ? (
        <Link href={`/group/${token}/contribute`} className="flex min-h-14 items-center justify-center rounded-xl bg-eskort-red px-5 text-lg font-bold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eskort-yellow">
          Contribute
        </Link>
      ) : (
        <p className="rounded-lg border border-gray-700 bg-eskort-dark-card p-4 text-center text-gray-200" role="status">
          {expired ? "Contributions are closed for this group order." : "This group order is fully paid. Contributions are closed."}
        </p>
      )}
    </main>
  );
}
