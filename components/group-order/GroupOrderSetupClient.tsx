"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, Eye } from "lucide-react";
import { createGroupOrderFromCart } from "@/lib/groupOrders";
import { formatZAR } from "@/lib/groupOrderUtils";
import type { GroupOrder, GroupOrderItem } from "@/types/groupOrder";
import { GroupOrderSummary } from "@/components/group-order/GroupOrderUI";

interface CartProduct {
  id: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
}

function isCartProduct(value: unknown): value is CartProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<CartProduct>;
  return typeof product.id === "string"
    && typeof product.name === "string"
    && typeof product.price === "number"
    && typeof product.quantity === "number"
    && product.quantity > 0;
}

export default function GroupOrderSetupClient({
  userId,
  organizerName,
}: {
  userId: string;
  organizerName: string;
}) {
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [order, setOrder] = useState<GroupOrder | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("eskort-checkout-cart");
      const parsed = saved ? JSON.parse(saved) as { products?: unknown } : null;
      const products = Array.isArray(parsed?.products) ? parsed.products.filter(isCartProduct) : [];
      setCartItems(products);
    } catch (issue) {
      setError(issue instanceof Error ? "Could not read your cart. Return to your braai and try again." : "Could not read your cart.");
    } finally {
      setCartLoading(false);
    }
  }, []);

  const copyLink = async () => {
    if (!order) return;
    const url = `${window.location.origin}/group/${order.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatusMessage("Group order link copied. You can paste it into a message to your group.");
    } catch {
      setStatusMessage(`Copy this group order link: ${url}`);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatusMessage("");
    if (cartItems.length === 0) {
      setError("Your cart is empty. Add items before creating a group order.");
      return;
    }
    setSaving(true);
    try {
      const items: GroupOrderItem[] = cartItems.map((item, index) => ({
        id: `${item.id}-${index}`,
        productId: item.id,
        name: item.name,
        imageUrl: item.image ?? "🥩",
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: Math.round(item.price * item.quantity * 100) / 100,
      }));
      const createdOrder = await createGroupOrderFromCart({
        name: groupName,
        deadline,
        organizerId: userId,
        organizerName,
        items,
      });
      setOrder(createdOrder);
      setCartItems([]);
      try {
        localStorage.removeItem("eskort-checkout-cart");
        window.dispatchEvent(new Event("eskort-cart-updated"));
      } catch {
        setError("Group order created, but the checkout cart could not be cleared. Please clear it manually.");
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create the group order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-8">
      <Link href="/build-my-braai" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-eskort-yellow">← Back to your braai</Link>
      <section className="rounded-2xl border border-gray-700 bg-eskort-dark-card p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-eskort-yellow">Group order · Step 1</p>
        <h1 className="mt-1 font-display text-4xl text-white sm:text-5xl">SET UP YOUR GROUP ORDER</h1>
        <p className="mt-3 text-gray-300">Name your event and set the payment deadline before sharing the order link.</p>

        {cartLoading ? (
          <div className="mt-6 space-y-3" aria-label="Loading cart">
            <div className="h-14 animate-pulse rounded-lg bg-gray-800" />
            <div className="h-14 animate-pulse rounded-lg bg-gray-800" />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-gray-600 p-6 text-center">
            <p className="font-semibold text-white">Your cart is empty.</p>
            <p className="mt-1 text-sm text-gray-400">Add products to your braai before setting up a group order.</p>
            <Link href="/build-my-braai" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-eskort-red px-5 font-bold text-white">Build your braai</Link>
          </div>
        ) : order ? (
          <div className="mt-6 space-y-4">
            <p role="status" className="rounded-lg bg-green-900/30 p-4 font-semibold text-green-200">Group order created.</p>
            <p className="text-sm text-gray-300">These products are saved to the group order. The checkout cart is now clear.</p>
            {error && <p role="alert" aria-live="polite" className="rounded-lg bg-red-900/30 p-3 text-sm text-red-200">{error}</p>}
            <GroupOrderSummary order={order} />
            <div className="break-all rounded-lg border border-gray-700 bg-eskort-dark-bg p-4 text-sm text-eskort-yellow">{`${window.location.origin}/group/${order.token}`}</div>
            {statusMessage && <p role="status" aria-live="polite" className="text-sm text-gray-300">{statusMessage}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => void copyLink()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-gray-600 px-4 font-bold text-white hover:border-eskort-yellow"><Copy size={17} />Copy group link</button>
              <Link href={`/group/${order.token}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-eskort-red px-4 font-bold text-white"><Eye size={17} />Preview group order</Link>
            </div>
            <Link href={`/my-orders/group/${order.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-eskort-yellow hover:underline">Open organizer dashboard</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="rounded-lg border border-gray-700 bg-eskort-dark-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white">Your order</h2>
                <span className="text-sm text-gray-300">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} items</span>
              </div>
              <ul className="mt-3 space-y-2">
                {cartItems.map((item) => <li key={item.id} className="flex justify-between gap-3 text-sm text-gray-300">
                  <span className="min-w-0 break-words">{item.name} × {item.quantity}</span><span className="whitespace-nowrap">{formatZAR(item.price * item.quantity)}</span>
                </li>)}
              </ul>
              <p className="mt-3 border-t border-gray-700 pt-3 text-right font-bold text-white">Total: {formatZAR(total)}</p>
            </div>
            <div>
              <label htmlFor="group-order-name" className="mb-1 block text-sm font-semibold text-white">Group order name / event name</label>
              <input id="group-order-name" value={groupName} onChange={(event) => setGroupName(event.target.value)} required maxLength={80} className="min-h-12 w-full rounded-lg border border-gray-600 bg-eskort-dark-bg px-3 text-white focus:border-eskort-yellow focus:outline-none focus:ring-2 focus:ring-eskort-yellow/40" />
            </div>
            <div>
              <label htmlFor="group-order-deadline" className="mb-1 block text-sm font-semibold text-white">Payment deadline</label>
              <input id="group-order-deadline" type="date" min={minDate} value={deadline} onChange={(event) => setDeadline(event.target.value)} required className="min-h-12 w-full rounded-lg border border-gray-600 bg-eskort-dark-bg px-3 text-white focus:border-eskort-yellow focus:outline-none focus:ring-2 focus:ring-eskort-yellow/40" />
              <p className="mt-2 text-sm text-gray-400">Set the deadline a few days before your event.</p>
            </div>
            {error && <p role="alert" aria-live="polite" className="rounded-lg bg-red-900/30 p-3 text-sm text-red-200">{error}</p>}
            <button type="submit" disabled={saving || cartItems.length === 0} className="min-h-12 w-full rounded-lg bg-eskort-red px-5 font-bold uppercase text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Creating group order..." : "Create group order"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
