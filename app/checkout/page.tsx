"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
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
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const [orderOpen, setOrderOpen] = useState(true);
  const [selectedCard, setSelectedCard] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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
  const grandTotal = subtotal + deliveryFee;
  const perPerson = cartItems.length > 0 ? Math.round(grandTotal / cartItems.reduce((sum, item) => sum + item.quantity, 0)) : 0;

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const submitOrder = async () => {
    setIsPlacingOrder(true);
    let submittedToPayfast = false;

    try {
      const response = await fetch("/api/payfast/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          delivery_address: form.address,
          delivery_fee: deliveryFee,
          items: cartItems.map((item) => ({
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
          })),
          notes: "",
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setShowAuthPrompt(true);
          setAuthError("Your session expired. Please sign in again to continue.");
          return;
        }
        const data = await response.json();
        throw new Error(data.error || "Failed to process checkout");
      }

      const result = await response.json();
      const { url, fields } = result;

      const payfastForm = document.createElement("form");
      payfastForm.method = "POST";
      payfastForm.action = url;

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value as string;
        payfastForm.appendChild(input);
      });

      document.body.appendChild(payfastForm);
      submittedToPayfast = true;
      payfastForm.submit();
    } catch (error) {
      console.error("Checkout failed:", error);
      setCheckoutError("Failed to process checkout. Please try again.");
    } finally {
      if (!submittedToPayfast) setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setCheckoutError("");

    if (!form.name.trim() || !form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || form.phone.replace(/\D/g, "").length !== 10 || !form.address.trim()) {
      setCheckoutError("Please complete your name, valid email, phone number and delivery address.");
      return;
    }

    if (!selectedCard || form.cardNumber.replace(/\D/g, "").length !== 16 || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry) || !/^\d{3,4}$/.test(form.cvv)) {
      setCheckoutError("Select PayFast and enter a valid card number, expiry date and CVV.");
      return;
    }

    if (!user) {
      setAuthEmail((current) => current || form.email);
      setAuthName((current) => current || form.name);
      setAuthError("");
      setAuthNotice("");
      setAuthMode("signin");
      setShowAuthPrompt(true);
      return;
    }

    await submitOrder();
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");
    setIsAuthenticating(true);

    try {
      const result = authMode === "signin"
        ? await signIn(authEmail, authPassword)
        : await signUp(authEmail, authPassword, authName);

      if (result.error) {
        setAuthError(result.error);
        return;
      }

      if (!result.data?.session) {
        setAuthMode("signin");
        setAuthNotice("Check your email to verify your account, then sign in here to continue your order.");
        return;
      }

      setShowAuthPrompt(false);
      await submitOrder();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to authenticate. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-eskort-dark-bg flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
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
                  <span>Meat & Proteins</span>
                  <span className="text-white font-medium">
                    R{meatAndProteins.toFixed(2)}
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
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      const formatted = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(" ");
                      update("phone", formatted);
                    }}
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
                  { id: "payfast", label: "PayFast - Credit", color: "#2c3e50" },
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
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                      update("cardNumber", digits.match(/.{1,4}/g)?.join(" ") ?? "");
                    }}
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
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                        update("expiry", digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                      }}
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
                      onChange={(e) => update("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
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
                <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
                  Testing only: Card Number 4000 0000 0000 0002, Expiry 12/30, CVV 123.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── PLACE ORDER ── */}
        <div className="mt-8">
          {checkoutError && <p role="alert" className="mb-3 rounded-md border border-red-700 bg-red-900/20 px-4 py-3 text-sm text-red-300">{checkoutError}</p>}
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder}
            className="w-full btn-primary py-5 text-base font-bold tracking-widest"
          >
            {isPlacingOrder ? "Processing Order..." : `🔒 Place Order — R${grandTotal.toFixed(2)}`}
          </button>
          <p className="text-center text-gray-600 text-xs mt-3">
            By placing this order you agree to our{" "}
            <span className="text-eskort-yellow underline cursor-pointer">
              Terms & Conditions
            </span>
          </p>
        </div>
      </div>

      {showAuthPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6" onClick={() => setShowAuthPrompt(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-auth-title"
            className="w-full max-w-md rounded-lg border border-gray-700 bg-eskort-dark-card p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="order-auth-title" className="font-display text-3xl text-white">{authMode === "signin" ? "SIGN IN TO PLACE YOUR ORDER" : "CREATE AN ACCOUNT"}</h2>
              <button type="button" onClick={() => setShowAuthPrompt(false)} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-300">Please sign in or create an account to place an order.</p>
            {authError && <p role="alert" className="mt-4 rounded-md border border-red-700 bg-red-900/20 p-3 text-sm text-red-300">{authError}</p>}
            {authNotice && <p role="status" className="mt-4 rounded-md border border-eskort-yellow/40 bg-eskort-yellow/10 p-3 text-sm text-eskort-yellow">{authNotice}</p>}
            <form onSubmit={handleAuthSubmit} className="mt-5 space-y-3">
              {authMode === "signup" && (
                <input
                  type="text"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="Full name"
                  aria-label="Full name"
                  autoComplete="name"
                  required
                  disabled={isAuthenticating}
                  className="w-full rounded-md border border-gray-700 bg-eskort-dark-card-2 px-3 py-2.5 text-sm text-white focus:border-eskort-yellow focus:outline-none"
                />
              )}
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                autoComplete="email"
                required
                disabled={isAuthenticating}
                className="w-full rounded-md border border-gray-700 bg-eskort-dark-card-2 px-3 py-2.5 text-sm text-white focus:border-eskort-yellow focus:outline-none"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Password"
                aria-label="Password"
                autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                required
                disabled={isAuthenticating}
                className="w-full rounded-md border border-gray-700 bg-eskort-dark-card-2 px-3 py-2.5 text-sm text-white focus:border-eskort-yellow focus:outline-none"
              />
              <button type="submit" disabled={isAuthenticating} className="w-full btn-primary py-3 text-sm font-bold disabled:opacity-60">
                {isAuthenticating ? "Please wait..." : authMode === "signin" ? "Sign In and Place Order" : "Create Account and Place Order"}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-400">
              {authMode === "signin" ? "New to Eskort?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin");
                  setAuthError("");
                  setAuthNotice("");
                }}
                className="font-semibold text-eskort-yellow hover:underline"
              >
                {authMode === "signin" ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </section>
        </div>
      )}
    </div>
  );
}