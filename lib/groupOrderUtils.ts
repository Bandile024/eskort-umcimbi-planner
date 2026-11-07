import type { Contribution, GroupOrder } from "@/types/groupOrder";

export function formatZAR(amount: number): string {
  return `R${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function getGroupOrderPublicOrigin(fallbackOrigin?: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_GROUP_ORDER_SITE_URL?.trim();
  if (!configuredOrigin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Group orders require a dedicated public group-order domain.");
    }
    if (!fallbackOrigin) throw new Error("Could not determine the public group-order domain.");
    return new URL(fallbackOrigin).origin;
  }

  const url = new URL(configuredOrigin);
  if (
    (url.protocol !== "https:" && url.protocol !== "http:")
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error("NEXT_PUBLIC_GROUP_ORDER_SITE_URL must be an origin such as https://groups.example.com.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("The public group-order domain must use HTTPS in production.");
  }

  const appOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!appOrigin) throw new Error("NEXT_PUBLIC_SITE_URL must identify the signed-in app domain.");
    if (new URL(appOrigin).origin === url.origin) {
      throw new Error("The public group-order domain must be separate from the signed-in app domain.");
    }
  }
  return url.origin;
}

export function getGroupOrderPublicUrl(token: string, fallbackOrigin?: string): string {
  return `${getGroupOrderPublicOrigin(fallbackOrigin)}/group/${encodeURIComponent(token)}`;
}

export function daysLeft(deadline: string, now = new Date()): number {
  const end = new Date(deadline);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.ceil((deadlineDay.getTime() - today.getTime()) / 86400000);
}

export function deadlineLabel(deadline: string, now = new Date()): string {
  const days = daysLeft(deadline, now);
  if (days < 0) return "Deadline passed";
  if (days === 0) return "Ends today";
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

export function remainingBalance(order: Pick<GroupOrder, "total" | "amountPaid">): number {
  return Math.max(0, Math.round((order.total - order.amountPaid) * 100) / 100);
}

export interface ContributionDetails {
  name: string;
  surname: string;
  amount: number;
}

export function validateContribution(
  details: ContributionDetails,
  balance: number,
): Record<keyof ContributionDetails, string> {
  const errors: Record<keyof ContributionDetails, string> = {
    name: "",
    surname: "",
    amount: "",
  };
  if (!details.name.trim()) errors.name = "Enter your name.";
  if (!details.surname.trim()) errors.surname = "Enter your surname.";
  if (!Number.isFinite(details.amount) || details.amount <= 0) {
    errors.amount = "Enter a contribution amount.";
  } else if (
    details.amount < 50
    && Math.round(details.amount * 100) !== Math.round(balance * 100)
  ) {
    errors.amount = "The minimum contribution is R50.00.";
  } else if (details.amount > balance) {
    errors.amount = `The maximum contribution is ${formatZAR(balance)}.`;
  }
  return errors;
}

export function formatDateZA(date: string): string {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function totalPaid(contributions: Contribution[]): number {
  return contributions
    .filter((contribution) => contribution.status === "paid")
    .reduce((sum, contribution) => sum + contribution.amount, 0);
}
