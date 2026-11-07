import { NextResponse } from "next/server";
import { createPayFastGroupContributionCheckout } from "@/lib/payfast";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getGroupOrderPublicOrigin } from "@/lib/groupOrderUtils";
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

type Payload = Record<string, unknown>;

class RequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function isPayload(value: unknown): value is Payload {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(payload: Payload, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) throw new RequestError(`Missing ${key}.`);
  return value.trim();
}

function publicTokenValue(payload: Payload): string {
  const token = stringValue(payload, "token");
  if (!/^[a-f0-9]{32}$/i.test(token)) throw new RequestError("Link not valid.", 404);
  return token;
}

function numberValue(payload: Payload, key: string): number {
  const value = payload[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RequestError(`Invalid ${key}.`);
  return value;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isFulfilmentMethod(value: unknown): value is FulfilmentMethod {
  return value === "pickup" || value === "delivery";
}

function isStatus(value: unknown): value is GroupOrderStatus {
  return ["upcoming", "confirmed", "awaiting_fulfilment", "ready", "completed", "expired"].includes(String(value));
}

function mapOrder(row: Record<string, unknown>): GroupOrder {
  const dbItems = Array.isArray(row.group_order_items) ? row.group_order_items as Record<string, unknown>[] : [];
  const items: GroupOrderItem[] = dbItems
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .map((item) => ({
      id: String(item.id),
      productId: String(item.product_id),
      name: String(item.product_name),
      imageUrl: String(item.image_url || "🥩"),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    }));
  const deadline = String(row.deadline);
  return {
    id: String(row.id),
    token: String(row.token),
    name: String(row.name),
    organizerId: String(row.organizer_id),
    organizerName: String(row.organizer_name),
    items,
    total: Number(row.total),
    amountPaid: Number(row.amount_paid),
    deadline: validDate(deadline) ? new Date(`${deadline}T00:00:00.000Z`).toISOString() : deadline,
    status: row.status as GroupOrderStatus,
    fulfilmentMethod: row.fulfilment_method as FulfilmentMethod | null,
    deliveryAddress: row.delivery_address
      ? row.delivery_address as DeliveryAddress
      : undefined,
    refundsProcessed: Boolean(row.refunds_processed),
    createdAt: String(row.created_at),
  };
}

function mapPublicOrder(row: Record<string, unknown>): PublicGroupOrder {
  const dbItems = Array.isArray(row.group_order_items) ? row.group_order_items as Record<string, unknown>[] : [];
  const items = dbItems
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .map((item) => ({
      name: String(item.product_name),
      imageUrl: String(item.image_url || "🥩"),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    }));
  const deadline = String(row.deadline);
  return {
    name: String(row.name),
    organizerName: String(row.organizer_name),
    items,
    total: Number(row.total),
    amountPaid: Number(row.amount_paid),
    deadline: validDate(deadline) ? new Date(`${deadline}T00:00:00.000Z`).toISOString() : deadline,
    status: row.status as GroupOrderStatus,
    fulfilmentMethod: row.fulfilment_method as FulfilmentMethod | null,
  };
}

function mapContribution(row: Record<string, unknown>): Contribution {
  return {
    id: String(row.id),
    groupOrderId: String(row.group_order_id),
    name: String(row.name),
    surname: String(row.surname),
    amount: Number(row.amount),
    status: row.status as Contribution["status"],
    createdAt: String(row.created_at),
  };
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as Notification["type"],
    title: String(row.title),
    body: String(row.body),
    groupOrderId: String(row.group_order_id),
    read: Boolean(row.read),
    createdAt: String(row.created_at),
  };
}

async function requireUser() {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new RequestError("Sign in is required for this action.", 401);
  return user;
}

async function isAdmin(userId: string): Promise<boolean> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) throw new RequestError("Could not verify administrator access.", 500);
  return data?.role === "admin";
}

async function requireAdmin(userId: string) {
  if (!(await isAdmin(userId))) throw new RequestError("Administrator access is required.", 403);
}

async function getOrderById(db: ReturnType<typeof createSupabaseAdminClient>, id: string): Promise<GroupOrder | null> {
  const { data, error } = await db
    .from("group_orders")
    .select("*, group_order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new RequestError("Could not load the group order.", 500);
  return data ? mapOrder(data as Record<string, unknown>) : null;
}

async function getOrderIdByToken(db: ReturnType<typeof createSupabaseAdminClient>, token: string): Promise<string | null> {
  const { data, error } = await db
    .from("group_orders")
    .select("id")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new RequestError("Could not load the group order.", 500);
  return data ? String(data.id) : null;
}

async function getPublicOrderByToken(
  db: ReturnType<typeof createSupabaseAdminClient>,
  token: string,
): Promise<PublicGroupOrder | null> {
  const { error: expiryError } = await db.rpc("expire_group_order_by_token", { p_group_token: token });
  if (expiryError) throw new RequestError("Could not update expired group orders.", 500);
  const { data, error } = await db
    .from("group_orders")
    .select("name, organizer_name, total, amount_paid, deadline, status, fulfilment_method, group_order_items(product_name, image_url, quantity, unit_price, line_total, position)")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new RequestError("Could not load the group order.", 500);
  return data ? mapPublicOrder(data as Record<string, unknown>) : null;
}

async function requireOrganizerOrAdmin(db: ReturnType<typeof createSupabaseAdminClient>, orderId: string, userId: string) {
  const { data, error } = await db.from("group_orders").select("organizer_id").eq("id", orderId).maybeSingle();
  if (error) throw new RequestError("Could not verify group-order access.", 500);
  if (!data) throw new RequestError("Group order not found.", 404);
  if (data.organizer_id !== userId && !(await isAdmin(userId))) {
    throw new RequestError("You do not have access to this group order.", 403);
  }
}

function validateItems(value: unknown): GroupOrderItem[] {
  if (!Array.isArray(value) || value.length === 0) throw new RequestError("Add at least one product to the group order.");
  return value.map((item, index) => {
    if (!isPayload(item)
      || typeof item.productId !== "string" || !item.productId.trim()
      || typeof item.name !== "string" || !item.name.trim()
      || typeof item.imageUrl !== "string"
      || typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity <= 0
      || typeof item.unitPrice !== "number" || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
      throw new RequestError(`Invalid group-order item at position ${index + 1}.`);
    }
    return {
      id: "",
      productId: item.productId.trim(),
      name: item.name.trim(),
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: Math.round(item.unitPrice * 100) / 100,
      lineTotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
    };
  });
}

async function handleAction(action: string, payload: Payload, request: Request): Promise<unknown> {
  const db = createSupabaseAdminClient();

  switch (action) {
    case "create": {
      const user = await requireUser();
      try {
        getGroupOrderPublicOrigin(new URL(request.url).origin);
      } catch (issue) {
        throw new RequestError(issue instanceof Error ? issue.message : "Group-order public domain is not configured.", 503);
      }
      const name = stringValue(payload, "name");
      const deadline = stringValue(payload, "deadline");
      if (!validDate(deadline)) throw new RequestError("Choose a valid payment deadline.");
      const items = validateItems(payload.items);
      const { data: orderId, error } = await db.rpc("create_group_order", {
        p_name: name,
        p_deadline: deadline,
        p_organizer_id: user.id,
        p_organizer_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Organizer",
        p_items: items.map(({ productId, name: itemName, imageUrl, quantity, unitPrice }) => ({
          productId,
          name: itemName,
          imageUrl,
          quantity,
          unitPrice,
        })),
      });
      if (error || typeof orderId !== "string") {
        console.error("Group-order creation failed:", error?.message);
        throw new RequestError(error?.message || "Could not create the group order.", 400);
      }
      const created = await getOrderById(db, orderId);
      if (!created) throw new RequestError("The group order was created but could not be loaded.", 500);
      return created;
    }
    case "getByToken":
      return getPublicOrderByToken(db, publicTokenValue(payload));
    case "getById": {
      const user = await requireUser();
      const id = stringValue(payload, "id");
      await requireOrganizerOrAdmin(db, id, user.id);
      return getOrderById(db, id);
    }
    case "listContributions": {
      const user = await requireUser();
      const groupOrderId = stringValue(payload, "groupOrderId");
      await requireOrganizerOrAdmin(db, groupOrderId, user.id);
      const { data, error } = await db
        .from("group_contributions")
        .select("id, group_order_id, name, surname, amount, status, created_at")
        .eq("group_order_id", groupOrderId)
        .order("created_at", { ascending: false });
      if (error) throw new RequestError("Could not load contributions.", 500);
      return (data ?? []).map((row) => mapContribution(row as Record<string, unknown>));
    }
    case "listPublicContributions": {
      const orderId = await getOrderIdByToken(db, publicTokenValue(payload));
      if (!orderId) throw new RequestError("Link not valid.", 404);
      const { data, error } = await db
        .from("group_contributions")
        .select("name, surname, amount, created_at")
        .eq("group_order_id", orderId)
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      if (error) throw new RequestError("Could not load contributors.", 500);
      return (data ?? []).map((row) => ({
        name: String(row.name),
        surname: String(row.surname),
        amount: Number(row.amount),
        createdAt: String(row.created_at),
      }));
    }
    case "startContribution": {
      const token = publicTokenValue(payload);
      const name = stringValue(payload, "name");
      const surname = stringValue(payload, "surname");
      const amount = numberValue(payload, "amount");
      const contributionId = crypto.randomUUID();
      const { error: expiryError } = await db.rpc("expire_group_order_by_token", { p_group_token: token });
      if (expiryError) throw new RequestError("Could not check the group-order deadline.", 500);
      const { error } = await db.rpc("create_group_contribution_payment", {
        p_group_token: token,
        p_contribution_id: contributionId,
        p_name: name,
        p_surname: surname,
        p_amount: Math.round(amount * 100) / 100,
      });
      if (error) throw new RequestError(error.message, 400);

      try {
        return {
          contributionId,
          ...createPayFastGroupContributionCheckout({
            contributionId,
            token,
            amount,
            customer: { name_first: name, name_last: surname },
            request,
          }),
        };
      } catch (issue) {
        const message = issue instanceof Error ? issue.message : "Could not prepare PayFast checkout.";
        await db.from("group_payment_transactions")
          .update({ payfast_payment_status: "FAILED" })
          .eq("payfast_m_payment_id", contributionId);
        await db.from("group_contributions")
          .update({ status: "failed" })
          .eq("id", contributionId)
          .eq("status", "pending");
        throw new RequestError(message, 500);
      }
    }
    case "contributionStatus": {
      const token = publicTokenValue(payload);
      const id = stringValue(payload, "contributionId");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw new RequestError("Contribution not found.", 404);
      }
      const orderId = await getOrderIdByToken(db, token);
      if (!orderId) throw new RequestError("Link not valid.", 404);
      const { data, error } = await db
        .from("group_contributions")
        .select("name, amount, status, created_at")
        .eq("id", id)
        .eq("group_order_id", orderId)
        .maybeSingle();
      if (error) throw new RequestError("Could not check payment status.", 500);
      if (!data) throw new RequestError("Contribution not found.", 404);
      return {
        name: String(data.name),
        amount: Number(data.amount),
        status: data.status as Contribution["status"],
        createdAt: String(data.created_at),
      };
    }
    case "updateDeadline": {
      const user = await requireUser();
      const id = stringValue(payload, "id");
      await requireOrganizerOrAdmin(db, id, user.id);
      const deadline = stringValue(payload, "deadline");
      if (!validDate(deadline)) throw new RequestError("Choose a valid payment deadline.");
      const { error } = await db.rpc("update_group_order_deadline", { p_order_id: id, p_deadline: deadline });
      if (error) throw new RequestError(error.message, 400);
      return getOrderById(db, id);
    }
    case "setFulfilment": {
      const user = await requireUser();
      const id = stringValue(payload, "id");
      await requireOrganizerOrAdmin(db, id, user.id);
      if (!isFulfilmentMethod(payload.method)) throw new RequestError("Choose pickup or delivery.");
      const address = payload.address === undefined ? null : payload.address;
      if (address !== null && !isPayload(address)) throw new RequestError("Invalid delivery address.");
      const { error } = await db.rpc("set_group_order_fulfilment", {
        p_order_id: id,
        p_method: payload.method,
        p_address: address,
      });
      if (error) throw new RequestError(error.message, 400);
      return getOrderById(db, id);
    }
    case "listMyGroupOrders": {
      const user = await requireUser();
      const { error: expiryError } = await db.rpc("expire_group_orders");
      if (expiryError) throw new RequestError("Could not refresh group-order deadlines.", 500);
      const { data, error } = await db
        .from("group_orders")
        .select("*, group_order_items(*)")
        .eq("organizer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw new RequestError("Could not load group orders.", 500);
      return (data ?? []).map((row) => mapOrder(row as Record<string, unknown>));
    }
    case "listNotifications": {
      const user = await requireUser();
      const { data, error } = await db
        .from("group_order_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw new RequestError("Could not load notifications.", 500);
      return (data ?? []).map((row) => mapNotification(row as Record<string, unknown>));
    }
    case "markNotificationsRead": {
      const user = await requireUser();
      const { error } = await db
        .from("group_order_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw new RequestError("Could not update notifications.", 500);
      return null;
    }
    case "adminListGroupOrders": {
      const user = await requireUser();
      await requireAdmin(user.id);
      const { error: expiryError } = await db.rpc("expire_group_orders");
      if (expiryError) throw new RequestError("Could not refresh group-order deadlines.", 500);
      const { data, error } = await db
        .from("group_orders")
        .select("*, group_order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw new RequestError("Could not load group orders.", 500);
      return (data ?? []).map((row) => mapOrder(row as Record<string, unknown>));
    }
    case "adminUpdateStatus": {
      const user = await requireUser();
      await requireAdmin(user.id);
      const id = stringValue(payload, "id");
      if (!isStatus(payload.status)) throw new RequestError("Unknown group-order status.");
      const { error } = await db.rpc("admin_update_group_order_status", { p_order_id: id, p_status: payload.status });
      if (error) throw new RequestError(error.message, 400);
      return getOrderById(db, id);
    }
    case "adminMarkRefundsProcessed": {
      const user = await requireUser();
      await requireAdmin(user.id);
      const id = stringValue(payload, "id");
      const { error } = await db.rpc("admin_mark_group_refunds_processed", { p_order_id: id });
      if (error) throw new RequestError(error.message, 400);
      return getOrderById(db, id);
    }
    case "adminSetFulfilmentMethod": {
      const user = await requireUser();
      await requireAdmin(user.id);
      const id = stringValue(payload, "id");
      if (!isFulfilmentMethod(payload.method)) throw new RequestError("Choose pickup or delivery.");
      const { data: updated, error } = await db
        .from("group_orders")
        .update({ fulfilment_method: payload.method })
        .eq("id", id)
        .eq("status", "awaiting_fulfilment")
        .select("id")
        .maybeSingle();
      if (error) throw new RequestError("Could not update fulfilment method.", 500);
      if (!updated) throw new RequestError("This order is not awaiting fulfilment.", 400);
      return getOrderById(db, id);
    }
    default:
      throw new RequestError("Unknown group-order action.");
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isPayload(body) || typeof body.action !== "string" || !isPayload(body.payload ?? {})) {
      throw new RequestError("Invalid group-order request.");
    }
    const data = await handleAction(body.action, body.payload as Payload, request);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 500;
    if (status >= 500) console.error("Group-order API error:", error);
    const message = status === 503 && error instanceof RequestError
      ? error.message
      : status >= 500
      ? "Group-order request failed. Please try again."
      : error instanceof Error ? error.message : "Group-order request failed.";
    return NextResponse.json({ error: message }, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
