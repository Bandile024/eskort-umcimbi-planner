import Link from "next/link";
import type { GroupOrder, GroupOrderItem, GroupOrderStatus, PublicContribution } from "@/types/groupOrder";
import { deadlineLabel, formatDateZA, formatZAR, remainingBalance } from "@/lib/groupOrderUtils";

type SummaryOrder = {
  items: Array<Pick<GroupOrderItem, "name" | "imageUrl" | "quantity" | "unitPrice" | "lineTotal">>;
  total: number;
};

type ProgressOrder = Pick<GroupOrder, "amountPaid" | "total">;

export function GroupOrderSummary({ order }: { order: SummaryOrder }) {
  return (
    <section className="rounded-xl border border-gray-700 bg-eskort-dark-card p-4 sm:p-6">
      <h2 className="font-display text-2xl text-white sm:text-3xl">ORDER SUMMARY</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-gray-700 text-xs uppercase text-gray-400">
              <th className="py-3 pr-4">Product</th>
              <th className="py-3 pr-4">Qty</th>
              <th className="py-3 pr-4">Unit</th>
              <th className="py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.name}-${index}`} className="border-b border-gray-800 text-sm">
                <td className="py-3 pr-4 text-white">
                  <span className="mr-2" aria-hidden="true">
                    {item.imageUrl.startsWith("http") ? "🥩" : item.imageUrl}
                  </span>
                  {item.name}
                </td>
                <td className="py-3 pr-4 text-gray-300">{item.quantity}</td>
                <td className="py-3 pr-4 text-gray-300">{formatZAR(item.unitPrice)}</td>
                <td className="py-3 text-right font-semibold text-white">{formatZAR(item.lineTotal)}</td>
              </tr>
            ))}
            <tr className="text-white">
              <th colSpan={3} className="py-4 text-left">Order total</th>
              <td className="py-4 text-right font-display text-2xl sm:text-3xl">{formatZAR(order.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ContributionProgress({ order }: { order: ProgressOrder }) {
  const balance = remainingBalance(order);
  const percent = order.total > 0 ? Math.min(100, (order.amountPaid / order.total) * 100) : 0;
  return (
    <section className="rounded-xl border border-gray-700 bg-eskort-dark-card p-4 sm:p-6" aria-label="Contribution progress">
      <h2 className="font-display text-2xl text-white">CONTRIBUTION TRACKER</h2>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-700" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${Math.round(percent)} percent funded`}>
        <div className="h-full rounded-full bg-gradient-to-r from-eskort-red to-eskort-yellow" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-gray-300">
        <span><strong className="text-white">{formatZAR(order.amountPaid)}</strong> raised of {formatZAR(order.total)}</span>
        <span>{formatZAR(balance)} to go</span>
      </div>
    </section>
  );
}

export function ContributorsList({ contributions }: { contributions: PublicContribution[] }) {
  return (
    <section className="rounded-xl border border-gray-700 bg-eskort-dark-card p-4 sm:p-6">
      <h2 className="font-display text-2xl text-white sm:text-3xl">WHO HAS CONTRIBUTED</h2>
      {contributions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-600 p-6 text-center text-gray-300">
          No contributions yet. Be the first.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-700">
          {contributions.map((contribution, index) => (
            <li key={`${contribution.createdAt}-${index}`} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-white">{contribution.name} {contribution.surname}</p>
                <p className="mt-1 text-sm text-gray-400">{formatDateZA(contribution.createdAt)}</p>
              </div>
              <strong className="whitespace-nowrap text-white">{formatZAR(contribution.amount)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function GroupOrderStatusBadge({ status }: { status: GroupOrderStatus }) {
  const labels: Record<GroupOrderStatus, string> = {
    upcoming: "Upcoming",
    confirmed: "Confirmed",
    awaiting_fulfilment: "Awaiting fulfilment",
    ready: "Ready",
    completed: "Completed",
    expired: "Expired",
  };
  const colors: Record<GroupOrderStatus, string> = {
    upcoming: "bg-eskort-yellow/20 text-eskort-yellow",
    confirmed: "bg-green-900/40 text-green-300",
    awaiting_fulfilment: "bg-blue-900/40 text-blue-300",
    ready: "bg-purple-900/40 text-purple-300",
    completed: "bg-gray-700 text-gray-200",
    expired: "bg-red-900/40 text-red-300",
  };
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold uppercase ${colors[status]}`}>{labels[status]}</span>;
}

export function DeadlineNotice({ order }: { order: Pick<GroupOrder, "deadline"> }) {
  return (
    <p className="rounded-xl bg-blue-100 px-4 py-4 text-blue-900" role="status">
      ⏳ Deadline {new Date(order.deadline).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} · <strong>{deadlineLabel(order.deadline)}</strong>
    </p>
  );
}

export function GroupOrderSkeleton() {
  return <div className="mx-auto max-w-4xl animate-pulse space-y-4 px-4 py-8" aria-label="Loading group order">
    <div className="h-10 rounded bg-gray-800" />
    <div className="h-16 rounded bg-gray-800" />
    <div className="h-72 rounded-xl bg-gray-800" />
  </div>;
}

export function GroupOrderProblem({ message, retry, backHref }: { message: string; retry?: () => void; backHref?: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="rounded-xl border border-gray-700 bg-eskort-dark-card p-7">
        <h1 className="font-display text-4xl text-white">{message === "Link not valid" ? "LINK NOT VALID" : "SOMETHING WENT WRONG"}</h1>
        <p className="mt-3 text-gray-300">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {retry && <button type="button" onClick={retry} className="min-h-11 rounded-lg bg-eskort-red px-5 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eskort-yellow">Retry</button>}
          {backHref && <Link href={backHref} className="inline-flex min-h-11 items-center rounded-lg border border-gray-600 px-5 font-bold text-white">Back</Link>}
        </div>
      </div>
    </div>
  );
}
