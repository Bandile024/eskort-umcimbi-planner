"use client";

import { useCallback, useEffect, useState } from "react";
import { getGroupOrderById, setFulfilment } from "@/lib/groupOrders";
import type { DeliveryAddress, FulfilmentMethod, GroupOrder } from "@/types/groupOrder";
import { GroupOrderProblem, GroupOrderSkeleton } from "@/components/group-order/GroupOrderUI";

const initialAddress: DeliveryAddress = { street: "", suburb: "", city: "", postalCode: "", contactNumber: "" };

export default function FulfilmentClient({ id, userId }: { id: string; userId: string }) {
  const [order, setOrder] = useState<GroupOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<FulfilmentMethod>("pickup");
  const [address, setAddress] = useState(initialAddress);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = await getGroupOrderById(id);
      if (!current || current.organizerId !== userId) {
        setError("Link not valid");
        setOrder(null);
        return;
      }
      setOrder(current);
      if (current.fulfilmentMethod) setMethod(current.fulfilmentMethod);
      if (current.status === "awaiting_fulfilment" && current.fulfilmentMethod) setConfirmed(true);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load this group order.");
    } finally {
      setLoading(false);
    }
  }, [id, userId]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!order) return;
    if (method === "delivery") {
      const missing = Object.values(address).some((value) => !value.trim());
      if (missing || !/^[0-9+()\-\s]{7,20}$/.test(address.contactNumber)) {
        setValidation("Complete every delivery field and enter a valid contact number.");
        return;
      }
    }
    setSaving(true);
    setValidation("");
    try {
      setOrder(await setFulfilment(order.id, method, method === "delivery" ? address : undefined));
      setConfirmed(true);
    } catch (issue) {
      setValidation(issue instanceof Error ? issue.message : "Could not save your fulfilment choice.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <GroupOrderSkeleton />;
  if (error) return <GroupOrderProblem message={error} retry={() => void load()} backHref="/account/orders" />;
  if (!order) return <GroupOrderProblem message="Link not valid" />;
  if (order.status !== "confirmed" && order.status !== "awaiting_fulfilment") {
    return <GroupOrderProblem message="This group order is not awaiting fulfilment selection." backHref={`/my-orders/group/${order.id}`} />;
  }

  const addressFields: Array<[keyof DeliveryAddress, string, string]> = [
    ["street", "Street address", "address-line1"],
    ["suburb", "Suburb", "address-level3"],
    ["city", "City", "address-level2"],
    ["postalCode", "Postal code", "postal-code"],
    ["contactNumber", "Contact number", "tel"],
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border border-gray-700 bg-eskort-dark-card p-5 sm:p-7">
        {confirmed ? (
          <div role="status" className="py-5 text-center">
            <p className="text-4xl" aria-hidden="true">🎉</p>
            <h1 className="mt-2 font-display text-4xl text-white">FULFILMENT CONFIRMED</h1>
            <p className="mt-3 text-gray-300">Your order will be {method === "pickup" ? "available for pickup at Eskort Store, Menlyn" : `delivered to ${order.deliveryAddress?.street ?? address.street}, ${order.deliveryAddress?.suburb ?? address.suburb}`}.</p>
            <a href={`/my-orders/group/${order.id}`} className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-eskort-red px-5 font-bold text-white">Back to group order</a>
          </div>
        ) : (
          <>
            <p className="rounded-lg bg-blue-100 px-4 py-3 text-blue-900" role="status">🎉 Fully paid! One last step — how would you like to receive your order?</p>
            <h1 className="mt-5 font-display text-4xl text-white">FULFILMENT</h1>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <fieldset>
                <legend className="sr-only">Choose fulfilment method</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(["pickup", "delivery"] as const).map((value) => (
                    <button type="button" key={value} aria-pressed={method === value} onClick={() => setMethod(value)} className={`min-h-12 rounded-full border px-3 font-semibold capitalize ${method === value ? "border-eskort-red bg-eskort-red text-white" : "border-gray-600 text-gray-200"}`}>
                      {value === "pickup" ? "🏬 Pickup" : "🚚 Delivery"}
                    </button>
                  ))}
                </div>
              </fieldset>
              {method === "pickup" ? (
                <div className="rounded-lg bg-eskort-dark-bg p-4 text-sm text-gray-200">
                  <strong className="text-white">Eskort Store, Menlyn</strong><br />
                  Shop 12, Menlyn Retail Park, Pretoria<br />
                  Mon–Sat 8:00–18:00 · Bring your order number
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {addressFields.map(([key, label, autocomplete]) => (
                    <div key={key} className={key === "street" ? "sm:col-span-2" : ""}>
                      <label htmlFor={`delivery-${key}`} className="mb-1 block text-sm font-semibold text-white">{label}</label>
                      <input id={`delivery-${key}`} autoComplete={autocomplete} type={key === "contactNumber" ? "tel" : "text"} value={address[key]} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} required className="min-h-11 w-full rounded-lg border border-gray-600 bg-eskort-dark-bg px-3 text-white focus:border-eskort-yellow focus:outline-none focus:ring-2 focus:ring-eskort-yellow/40" />
                    </div>
                  ))}
                </div>
              )}
              {validation && <p role="alert" aria-live="polite" className="rounded-lg bg-red-900/30 p-3 text-sm text-red-200">{validation}</p>}
              <button type="submit" disabled={saving} className="min-h-12 w-full rounded-lg bg-eskort-red px-4 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : `Confirm ${method}`}</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
