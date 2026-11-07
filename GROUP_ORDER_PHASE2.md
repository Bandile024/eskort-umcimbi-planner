# Group-order backend setup

Group orders use dedicated Supabase tables and do not write to the existing `orders` or `order_items` tables. For a fresh install, run `supabase/group-orders.sql` in the Supabase SQL Editor. If the original group-order schema is already installed, run `supabase/group-orders-public-hardening.sql` to apply the public-access restrictions and targeted expiry functions. The scripts expect the existing `public.profiles` table to have `id` and `role` columns. The API uses the authenticated user's Supabase session for organizer/admin authorization and `SUPABASE_SERVICE_ROLE_KEY` for server-side database operations; never expose that key to the browser.

Configure the existing Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and PayFast variables (`PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, optional `PAYFAST_PASSPHRASE`). Group-order checkout is sandbox-only and rejects `PAYFAST_MODE=live`; unset it or set `PAYFAST_MODE=sandbox`. Set `NEXT_PUBLIC_SITE_URL` to the signed-in app's public HTTPS origin and `NEXT_PUBLIC_GROUP_ORDER_SITE_URL` to a separate HTTPS origin, such as `https://groups.example.com`, mapped to this same deployment. Group-order creation and contributions fail closed in production if these separate origins are missing or equal. Keep Supabase auth cookies host-only; do not set a parent-domain `Domain` attribute. Do not use real card details with sandbox.

## Data access and database mapping

Components call `lib/groupOrders.ts`, which requests `/api/group-orders`. Server-side authorization, row mapping, database queries, and RPC calls are in `app/api/group-orders/route.ts`.

| Data-access function | Backend mapping |
| --- | --- |
| `createGroupOrderFromCart` | Authenticated API action calls `create_group_order`; inserts `group_orders` and `group_order_items` atomically, recording the authenticated organizer. |
| `getGroupOrderByToken` | Public token lookup returns an allowlisted projection (display name, organizer display name, item display fields, totals, deadline, status, and fulfilment method); it omits order ID, token, organizer ID, delivery address, and refund metadata. |
| `getGroupOrderById` | Authenticated organizer/admin lookup in `group_orders`, joined with `group_order_items`. |
| `listContributions` | Organizer/admin query of `group_contributions`, newest first. Contributor email is not stored. |
| `listPublicContributions` | Public query selects only names, amount, and date for paid contributions; no IDs, email, or other payment data is returned. |
| `startContributionPayment` | Public API action calls `create_group_contribution_payment`, which locks the order, reserves a pending contribution, and inserts `group_payment_transactions`; returns signed PayFast Sandbox fields. Minimum is R50 except for an exact remaining balance below R50. |
| `getPublicContributionPayment` | Token-scoped read of `group_contributions` for the PayFast return screen; a browser return alone never confirms payment. |
| `updateDeadline` | Authenticated API action calls `update_group_order_deadline`; only upcoming orders with unpassed deadlines can be edited. |
| `setFulfilment` | Authenticated API action calls `set_group_order_fulfilment`; a fully paid confirmed order becomes `awaiting_fulfilment` with pickup or validated delivery details. |
| `listMyGroupOrders` | Authenticated query of `group_orders` by `organizer_id`, including item rows; refreshes elapsed deadlines first. |
| `listNotifications` | Authenticated query of `group_order_notifications` by `user_id`. |
| `markNotificationsRead` | Updates unread `group_order_notifications` for the authenticated user. |
| `adminListGroupOrders` | Admin-only query of all `group_orders` and their items; refreshes elapsed deadlines first. |
| `adminUpdateStatus` | Admin-only API action calls `admin_update_group_order_status`; allows only `awaiting_fulfilment → ready` and `ready → completed`. |
| `adminMarkRefundsProcessed` | Admin-only API action calls `admin_mark_group_refunds_processed` for expired orders. This records completion after the refunds are handled; it does not initiate a PayFast refund. |
| `adminSetFulfilmentMethod` | Admin-only conditional update of fulfilment method for an order awaiting fulfilment. |

Tables are `group_orders`, `group_order_items`, `group_contributions`, `group_payment_transactions`, and `group_order_notifications`. Contributions are reserved for 30 minutes while checkout is pending. The database only counts verified paid contributions and confirms an order when their sum equals the order total exactly; late or excess payments become `refund_pending`. Pending reservations and elapsed upcoming deadlines are cleaned up by `expire_group_orders`, invoked during relevant reads and new contribution attempts.

Public `/group/{token}` pages are redirected to the separate group-order origin before auth middleware runs; they do not mount the authenticated app provider or account navigation. The public API returns only the fields needed by contributors and uses `Cache-Control: private, no-store`; public group pages are marked no-index and no-referrer. Direct anonymous Supabase table access is blocked both by explicit table privilege revocation and RLS (there are no anonymous read policies); public reads go through the server API projection. Public deadline checks operate only on the token's order, not a global expiry sweep.

## PayFast ITN and notifications

`lib/payfast.ts` builds the group contribution Sandbox checkout with `/group/{token}/success`, `/group/{token}/cancelled`, and `/api/payfast/itn` URLs. The existing ITN route verifies PayFast's notification before calling `process_group_contribution_itn`; that RPC checks the stored payment amount and atomically updates the transaction, contribution, order total/status, and organizer notifications. The regular checkout ITN flow and `orders` tables remain separate. Never treat a return/cancel URL as payment confirmation.

`process_group_contribution_itn` creates contribution-received and exact-total confirmation/fulfilment notifications. `expire_group_orders` emits expiry notifications. The organizer's dashboard marks notifications read through the authenticated API. Refunds for late/overpaid/expired contributions require operational handling in PayFast; the admin action only records that refunds have been processed.

## End-to-end verification

After applying the SQL and configuring Sandbox credentials plus a publicly reachable HTTPS origin, test organizer creation, public contribution checkout, PayFast Sandbox ITN delivery, exact-total confirmation, fulfilment selection, admin status progression, expiry, and refund bookkeeping. The local TypeScript build does not verify Supabase SQL execution or PayFast's external ITN delivery.
