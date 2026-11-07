import type {
  Contribution,
  DeliveryAddress,
  FulfilmentMethod,
  GroupOrder,
  GroupOrderItem,
  GroupOrderStatus,
  Notification,
  PublicContribution,
  PublicGroupOrder,
} from "@/types/groupOrder";

export interface PayFastGroupCheckout {
  contributionId: string;
  url: string;
  fields: Record<string, string>;
}

export interface PublicContributionPayment {
  name: string;
  amount: number;
  status: Contribution["status"];
  createdAt: string;
}

async function request<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/group-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const result = await response.json() as { data?: T; error?: string };
  if (!response.ok) throw new Error(result.error || "Group-order request failed.");
  if (!Object.prototype.hasOwnProperty.call(result, "data")) {
    throw new Error("Group-order server returned an invalid response.");
  }
  return result.data as T;
}

export function createGroupOrderFromCart(input: {
  name: string;
  deadline: string;
  items: GroupOrderItem[];
  organizerId?: string;
  organizerName?: string;
}): Promise<GroupOrder> {
  return request("create", input);
}

export function getGroupOrderByToken(token: string): Promise<PublicGroupOrder | null> {
  return request("getByToken", { token });
}

export function getGroupOrderById(id: string): Promise<GroupOrder | null> {
  return request("getById", { id });
}

export function listContributions(groupOrderId: string): Promise<Contribution[]> {
  return request("listContributions", { groupOrderId });
}

export function listPublicContributions(token: string): Promise<PublicContribution[]> {
  return request("listPublicContributions", { token });
}

export function getPublicContributionPayment(
  token: string,
  contributionId: string,
): Promise<PublicContributionPayment> {
  return request("contributionStatus", { token, contributionId });
}

export function startContributionPayment(input: {
  token: string;
  name: string;
  surname: string;
  amount: number;
}): Promise<PayFastGroupCheckout> {
  return request("startContribution", input);
}

export function updateDeadline(id: string, deadline: string): Promise<GroupOrder> {
  return request("updateDeadline", { id, deadline });
}

export function setFulfilment(
  id: string,
  method: FulfilmentMethod,
  address?: DeliveryAddress,
): Promise<GroupOrder> {
  return request("setFulfilment", { id, method, address });
}

export function listMyGroupOrders(_organizerId?: string): Promise<GroupOrder[]> {
  return request("listMyGroupOrders");
}

export function listNotifications(_userId?: string): Promise<Notification[]> {
  return request("listNotifications");
}

export function markNotificationsRead(_userId?: string): Promise<void> {
  return request("markNotificationsRead");
}

export function adminListGroupOrders(): Promise<GroupOrder[]> {
  return request("adminListGroupOrders");
}

export function adminUpdateStatus(id: string, status: GroupOrderStatus): Promise<GroupOrder> {
  return request("adminUpdateStatus", { id, status });
}

export function adminMarkRefundsProcessed(id: string): Promise<GroupOrder> {
  return request("adminMarkRefundsProcessed", { id });
}

export function adminSetFulfilmentMethod(
  id: string,
  method: FulfilmentMethod,
): Promise<GroupOrder> {
  return request("adminSetFulfilmentMethod", { id, method });
}
