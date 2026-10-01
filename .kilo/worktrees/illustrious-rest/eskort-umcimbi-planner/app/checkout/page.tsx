"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Lock, ChevronDown, ChevronUp, Plus } from "lucide-react";
import StepProgressBar from "@/components/StepProgressBar";
import { useAuth } from "@/lib/auth-context";

type CartItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

type CartPayload = {
  products: CartItem[];
  subtotal: number;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orderOpen, setOrderOpen] = useState(true);
  const [selectedCard, setSelectedCard] = useState("visa");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    saveCard: false,
  });

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("eskort-checkout-cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CartPayload;
        setCartItems(parsed.products || []);
        setSubtotal(parsed.subtotal || 0);
      } catch {
        setCartItems([]);
        setSubtotal(0);
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user, authLoading]);

  const deliveryFee = 60;
  const meatAndProteins = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const essentials = 0;
  const grandTotal = subtotal + deliveryFee;
  const perPerson = cartItems.length > 0 ? Math.round(grandTotal / cartItems.reduce((sum, item) => sum + item.quantity, 0)) : 0;

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    
    if (!form.name || !form.email || !form.phone || !form.address) {
      alert("Please fill in all delivery details");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          delivery_address: form.address,
          items: cartItems.map((item) => ({
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
          })),
          delivery_fee: deliveryFee,
          notes: "",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to place order");
      }

      const result = await response.json();
      localStorage.removeItem("eskort-checkout-cart");
      router.push("/account/orders");
    } catch (error) {
      console.error("Order failed:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push("/login?redirect=/checkout");
    return null;
  }

  return (
    <div className="min-h-screen bg-eskort-dark-bg">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back */}
        <Link
          href="/build-my-braai"
          className="inline-flex items-center gap-1 text-eskort-yellow text-sm font-semibold mb-4 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        {/* Step progress */}
        <StepProgressBar currentStep={3} totalSteps={3} />

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Lock size={18} className="text-gray-400" />
          <div>
            <h1 className="font-display text-5xl md:text-6xl text-white tracking-wide leading-none">
              CHECKOUT
            </h1>
            <p className="text-gray-500 text-xs mt-1">256-BIT SSL SECURED PAYMENT</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT: ORDER SUMMARY ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Order summary accordion */}
            <div className="checkout-section">
              <button
                onClick={() => setOrderOpen(!orderOpen)}
                className="w-full flex items-center justify-between text-white font-semibold text-sm"
              >
                <span>Order Summary ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} Items)</span>
                {orderOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {orderOpen && (
                <div className="mt-4 space-y-3">
                  {cartItems.length === 0 ? (
                    <div className="text-gray-400 text-sm">No items added yet.</div>
                  ) : (
                    cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.name}</p>
                          <p className="text-gray-500 text-xs">Qty: {item.quantity} × R{item.price.toFixed(2)}</p>
                        </div>
                        <p className="text-white font-semibold">R{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))
                  )}
                  <div className="border-t border-gray-700 pt-3 flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white font-medium">R{subtotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Budget breakdown */}
            <div className="checkout-section border border-eskort-yellow/30">
              <h3 className="text-eskort-yellow font-bold text-sm uppercase tracking-wide mb-3">
                Budget Breakdown
              </h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Meat &amp; Proteins</span>
                  <span className="text-white font-medium">
                    R{meatAndProteins.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Essentials</span>
                  <span className="text-white font-medium">
                    R{essentials.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="text-white font-medium">
                    R{deliveryFee}
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-base">Grand Total</span>
                    <span className="font-display text-3xl text-eskort-red">
R{grandTotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    Per-person contribution{" "}
                    <span className="text-white font-semibold">R{perPerson}</span>
                    <br />
                    each guest contributes approx.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── MIDDLE: DELIVERY DETAILS ── */}
          <div className="lg:col-span-1">
            <div className="checkout-section h-full">
              <h3 className="text-eskort-red font-bold text-sm uppercase tracking-wide mb-5">
                Delivery Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wide block mb-1">
                    Full Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wide block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wide block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
                    placeholder="082 123 4567"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wide block mb-1">
                    Delivery Address
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow transition-colors"
                    placeholder="Street, City"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: PAYMENT ── */}
          <div className="lg:col-span-1">
            <div className="checkout-section h-full">
              <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-5">
                Payment
              </h3>

              {/* Saved cards */}
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-medium">
                Saved Cards
              </p>
              <div className="space-y-2 mb-5">
                {[
                  { id: "visa", label: "Visa **** 4882", color: "#1a3a6a" },
                  { id: "mastercard", label: "Mastercard **** 3310", color: "#2a1a0a" },
                ].map((card) => (
                  <label
                    key={card.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedCard === card.id
                        ? "border-eskort-yellow bg-eskort-yellow/5"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="card"
                      value={card.id}
                      checked={selectedCard === card.id}
                      onChange={() => setSelectedCard(card.id)}
                      className="accent-eskort-yellow"
                    />
                    <div
                      className="w-8 h-5 rounded"
                      style={{ background: card.color }}
                    />
                    <span className="text-white text-xs font-medium flex-1">
                      {card.label}
                    </span>
                    {selectedCard === card.id && (
                      <span className="text-eskort-yellow text-xs font-bold">USE THIS</span>
                    )}
                  </label>
                ))}
                <button className="flex items-center gap-2 text-eskort-yellow text-xs font-medium hover:opacity-80 mt-1">
                  <Plus size={14} />
                  Add New Card
                </button>
              </div>

              {/* New card form */}
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">
                    Name on Card
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow"
                    placeholder="Cardholder Name"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">
                    Card Number
                  </label>
                  <input
                    value={form.cardNumber}
                    onChange={(e) => update("cardNumber", e.target.value)}
                    className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow"
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">
                      Expiry
                    </label>
                    <input
                      value={form.expiry}
                      onChange={(e) => update("expiry", e.target.value)}
                      className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">
                      CVV
                    </label>
                    <input
                      value={form.cvv}
                      onChange={(e) => update("cvv", e.target.value)}
                      className="w-full bg-eskort-dark-card-2 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-eskort-yellow"
                      placeholder="***"
                      maxLength={4}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={form.saveCard}
                    onChange={(e) => update("saveCard", e.target.checked)}
                    className="accent-eskort-yellow"
                  />
                  <span className="text-gray-400 text-xs">
                    Remember this card for future purchases
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── PLACE ORDER ── */}
        <div className="mt-8">
          <button
            onClick={handlePlaceOrder}
            className="w-full btn-primary py-5 text-base font-bold tracking-widest"
          >
            🔒 Place Order — R{grandTotal.toFixed(2)}
          </button>
          <p className="text-center text-gray-600 text-xs mt-3">
            By placing this order you agree to our{" "}
            <span className="text-eskort-yellow underline cursor-pointer">
              Terms &amp; Conditions
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
