"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { formatZAR } from "@/lib/groupOrderUtils";

interface ContributionPaymentModalProps {
  amount: number;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ContributionPaymentModal({
  amount,
  busy,
  error,
  onClose,
  onConfirm,
}: ContributionPaymentModalProps) {
  const [selectedCard, setSelectedCard] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [rememberCard, setRememberCard] = useState(false);
  const [touched, setTouched] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cardNumberInputRef = useRef<HTMLInputElement>(null);

  const errors = {
    card: selectedCard ? "" : "Select PayFast - Credit.",
    cardholderName: cardholderName.trim() ? "" : "Enter the name on your card.",
    cardNumber: cardNumber.replace(/\D/g, "").length === 16 ? "" : "Enter a valid 16-digit card number.",
    expiry: /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) ? "" : "Enter expiry as MM/YY.",
    cvv: /^\d{3,4}$/.test(cvv) ? "" : "Enter a valid 3 or 4-digit CVV.",
  };
  const isValid = Object.values(errors).every((message) => message.length === 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const focusable = () => dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable()?.[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const showError = (key: keyof typeof errors) => touched && Boolean(errors[key]);
  const updateCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    setCardNumber(digits.match(/.{1,4}/g)?.join(" ") ?? "");
  };
  const updateExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/75 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contribution-payment-title"
        className="my-auto w-full max-w-lg rounded-xl border border-gray-700 bg-eskort-dark-card p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-eskort-yellow">PayFast - Credit</p>
            <h2 id="contribution-payment-title" className="mt-1 font-display text-3xl text-white">CARD PAYMENT</h2>
            <p className="mt-1 text-sm text-gray-300">Contribution amount: <strong className="text-white">{formatZAR(amount)}</strong></p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close card payment" className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300 hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (isValid && !busy) onConfirm();
          }}
        >
          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-400">Saved Cards</legend>
            <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${selectedCard === "payfast" ? "border-eskort-yellow bg-eskort-yellow/5" : "border-gray-700 hover:border-gray-600"}`}>
              <input
                type="radio"
                name="contribution-card"
                value="payfast"
                checked={selectedCard === "payfast"}
                onChange={() => setSelectedCard("payfast")}
                onBlur={() => setTouched(true)}
                className="accent-eskort-yellow"
              />
              <span className="h-5 w-8 rounded" style={{ background: "#2c3e50" }} aria-hidden="true" />
              <span className="flex-1 text-xs font-medium text-white">PayFast - Credit</span>
              {selectedCard === "payfast" && <span className="text-xs font-bold text-eskort-yellow">USE THIS</span>}
            </label>
            <button type="button" onClick={() => { setSelectedCard("payfast"); cardNumberInputRef.current?.focus(); }} className="mt-2 flex min-h-11 items-center gap-2 text-xs font-medium text-eskort-yellow hover:opacity-80">
              <Plus size={14} />
              Add New Card
            </button>
            {showError("card") && <p className="mt-1 text-sm text-red-300" aria-live="polite">{errors.card}</p>}
          </fieldset>

          <div>
            <label htmlFor="contribution-cardholder" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">Name on Card</label>
            <input id="contribution-cardholder" autoComplete="cc-name" value={cardholderName} onChange={(event) => setCardholderName(event.target.value)} onBlur={() => setTouched(true)} required className="min-h-11 w-full rounded-lg border border-gray-700 bg-eskort-dark-card-2 px-3 text-sm text-white focus:border-eskort-yellow focus:outline-none" placeholder="Cardholder Name" />
            {showError("cardholderName") && <p className="mt-1 text-sm text-red-300" aria-live="polite">{errors.cardholderName}</p>}
          </div>
          <div>
            <label htmlFor="contribution-card-number" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">Card Number</label>
            <input ref={cardNumberInputRef} id="contribution-card-number" autoComplete="cc-number" inputMode="numeric" value={cardNumber} onChange={(event) => updateCardNumber(event.target.value)} onBlur={() => setTouched(true)} required maxLength={19} className="min-h-11 w-full rounded-lg border border-gray-700 bg-eskort-dark-card-2 px-3 text-sm text-white focus:border-eskort-yellow focus:outline-none" placeholder="0000 0000 0000 0000" />
            {showError("cardNumber") && <p className="mt-1 text-sm text-red-300" aria-live="polite">{errors.cardNumber}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="contribution-card-expiry" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">Expiry</label>
              <input id="contribution-card-expiry" autoComplete="cc-exp" inputMode="numeric" value={expiry} onChange={(event) => updateExpiry(event.target.value)} onBlur={() => setTouched(true)} required maxLength={5} className="min-h-11 w-full rounded-lg border border-gray-700 bg-eskort-dark-card-2 px-3 text-sm text-white focus:border-eskort-yellow focus:outline-none" placeholder="MM/YY" />
              {showError("expiry") && <p className="mt-1 text-sm text-red-300" aria-live="polite">{errors.expiry}</p>}
            </div>
            <div>
              <label htmlFor="contribution-card-cvv" className="mb-1 block text-xs uppercase tracking-wide text-gray-400">CVV</label>
              <input id="contribution-card-cvv" autoComplete="cc-csc" inputMode="numeric" value={cvv} onChange={(event) => setCvv(event.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={() => setTouched(true)} required maxLength={4} className="min-h-11 w-full rounded-lg border border-gray-700 bg-eskort-dark-card-2 px-3 text-sm text-white focus:border-eskort-yellow focus:outline-none" placeholder="***" />
              {showError("cvv") && <p className="mt-1 text-sm text-red-300" aria-live="polite">{errors.cvv}</p>}
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2">
            <input type="checkbox" checked={rememberCard} onChange={(event) => setRememberCard(event.target.checked)} className="accent-eskort-yellow" />
            <span className="text-xs text-gray-400">Remember this card for future purchases</span>
          </label>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
            <strong className="block">Test Card:</strong>
            Card Number: 4000 0000 0000 0002<br />
            Expiry: 12/30<br />
            CVV: 123
          </p>
          <p className="text-xs text-gray-400">Card details entered here are not sent to or stored by this site. Complete the payment on PayFast&apos;s hosted Sandbox page.</p>
          {error && <p role="alert" aria-live="polite" className="rounded-md border border-red-700 bg-red-900/20 px-4 py-3 text-sm text-red-300">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} disabled={busy} className="min-h-12 rounded-lg border border-gray-600 px-4 font-bold text-white disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!isValid || busy} className="min-h-12 rounded-lg bg-eskort-red px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Processing..." : `Pay ${formatZAR(amount)} with PayFast`}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
