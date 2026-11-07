export type GroupOrderStatus =
  | "upcoming"
  | "confirmed"
  | "awaiting_fulfilment"
  | "ready"
  | "completed"
  | "expired";

export type FulfilmentMethod = "pickup" | "delivery";

export interface GroupOrderItem {
  id: string;
  productId: string;
  name: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface DeliveryAddress {
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
  contactNumber: string;
}

export interface GroupOrder {
  id: string;
  token: string;
  name: string;
  organizerId: string;
  organizerName: string;
  items: GroupOrderItem[];
  total: number;
  amountPaid: number;
  deadline: string;
  status: GroupOrderStatus;
  fulfilmentMethod: FulfilmentMethod | null;
  deliveryAddress?: DeliveryAddress;
  refundsProcessed: boolean;
  createdAt: string;
}

export interface Contribution {
  id: string;
  groupOrderId: string;
  name: string;
  surname: string;
  email?: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refund_pending" | "refunded";
  createdAt: string;
}

export type PublicContribution = Pick<
  Contribution,
  "id" | "name" | "surname" | "amount" | "status" | "createdAt"
>;

export interface Notification {
  id: string;
  userId: string;
  type:
    | "contribution_received"
    | "order_confirmed"
    | "confirm_fulfilment"
    | "order_expired";
  title: string;
  body: string;
  groupOrderId: string;
  read: boolean;
  createdAt: string;
}
