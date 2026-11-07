-- Group-order backend: run once in the Supabase SQL Editor.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.group_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organizer_name TEXT NOT NULL,
  total NUMERIC(12, 2) NOT NULL CHECK (total > 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0 AND amount_paid <= total),
  deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'confirmed', 'awaiting_fulfilment', 'ready', 'completed', 'expired')),
  fulfilment_method TEXT CHECK (fulfilment_method IN ('pickup', 'delivery')),
  delivery_address JSONB,
  refunds_processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    status NOT IN ('confirmed', 'awaiting_fulfilment', 'ready', 'completed')
    OR amount_paid = total
  )
);

CREATE TABLE IF NOT EXISTS public.group_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '🥩',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
  line_total NUMERIC(12, 2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  surname TEXT NOT NULL CHECK (length(trim(surname)) > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refund_pending', 'refunded')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL UNIQUE REFERENCES public.group_contributions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'payfast' CHECK (provider = 'payfast'),
  payfast_m_payment_id TEXT NOT NULL UNIQUE,
  payfast_pf_payment_id TEXT,
  payfast_payment_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (payfast_payment_status IN ('PENDING', 'COMPLETE', 'FAILED', 'CANCELLED', 'REFUNDED')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_order_id UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('contribution_received', 'order_confirmed', 'confirm_fulfilment', 'order_expired')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_orders_organizer_created
  ON public.group_orders (organizer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_orders_deadline_status
  ON public.group_orders (deadline, status);
CREATE INDEX IF NOT EXISTS idx_group_order_items_order_position
  ON public.group_order_items (group_order_id, position);
CREATE INDEX IF NOT EXISTS idx_group_contributions_order_created
  ON public.group_contributions (group_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_notifications_user_created
  ON public.group_order_notifications (user_id, created_at DESC);

ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers and admins can read group orders" ON public.group_orders;
CREATE POLICY "Organizers and admins can read group orders"
  ON public.group_orders FOR SELECT TO authenticated
  USING (
    organizer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Organizers and admins can read group order items" ON public.group_order_items;
CREATE POLICY "Organizers and admins can read group order items"
  ON public.group_order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_orders g
      WHERE g.id = group_order_id
        AND (g.organizer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "Organizers and admins can read group contributions" ON public.group_contributions;
CREATE POLICY "Organizers and admins can read group contributions"
  ON public.group_contributions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_orders g
      WHERE g.id = group_order_id
        AND (g.organizer_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "Admins can read group payment transactions" ON public.group_payment_transactions;
CREATE POLICY "Admins can read group payment transactions"
  ON public.group_payment_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Users can read their group notifications" ON public.group_order_notifications;
CREATE POLICY "Users can read their group notifications"
  ON public.group_order_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark their group notifications read" ON public.group_order_notifications;
CREATE POLICY "Users can mark their group notifications read"
  ON public.group_order_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_group_order_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_group_orders_updated_at ON public.group_orders;
CREATE TRIGGER touch_group_orders_updated_at
  BEFORE UPDATE ON public.group_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_group_order_updated_at();

DROP TRIGGER IF EXISTS touch_group_contributions_updated_at ON public.group_contributions;
CREATE TRIGGER touch_group_contributions_updated_at
  BEFORE UPDATE ON public.group_contributions
  FOR EACH ROW EXECUTE FUNCTION public.touch_group_order_updated_at();

DROP TRIGGER IF EXISTS touch_group_payment_transactions_updated_at ON public.group_payment_transactions;
CREATE TRIGGER touch_group_payment_transactions_updated_at
  BEFORE UPDATE ON public.group_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_group_order_updated_at();

CREATE OR REPLACE FUNCTION public.create_group_order(
  p_name TEXT,
  p_deadline DATE,
  p_organizer_id UUID,
  p_organizer_name TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID := gen_random_uuid();
  v_item JSONB;
  v_position INTEGER := 0;
  v_quantity INTEGER;
  v_unit_price NUMERIC(12, 2);
  v_total NUMERIC(12, 2) := 0;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Enter a group order name.';
  END IF;
  IF p_deadline < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a payment deadline that is today or later.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one product to the group order.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF coalesce(v_item->>'productId', '') = '' OR coalesce(v_item->>'name', '') = '' THEN
      RAISE EXCEPTION 'A group-order product is missing its name or ID.';
    END IF;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := round((v_item->>'unitPrice')::NUMERIC, 2);
    IF v_quantity <= 0 OR v_unit_price <= 0 THEN
      RAISE EXCEPTION 'Group-order products need a positive quantity and price.';
    END IF;
    v_total := v_total + round(v_quantity * v_unit_price, 2);
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'The group order total must be greater than zero.';
  END IF;

  INSERT INTO public.group_orders (id, token, name, organizer_id, organizer_name, total, deadline)
  VALUES (v_order_id, replace(gen_random_uuid()::TEXT, '-', ''), trim(p_name), p_organizer_id,
          coalesce(nullif(trim(p_organizer_name), ''), 'Organizer'), v_total, p_deadline);

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.group_order_items (
      group_order_id, product_id, product_name, image_url, quantity, unit_price, position
    ) VALUES (
      v_order_id,
      v_item->>'productId',
      trim(v_item->>'name'),
      coalesce(nullif(v_item->>'imageUrl', ''), '🥩'),
      (v_item->>'quantity')::INTEGER,
      round((v_item->>'unitPrice')::NUMERIC, 2),
      v_position
    );
    v_position := v_position + 1;
  END LOOP;

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_contribution_payment(
  p_group_token TEXT,
  p_contribution_id UUID,
  p_name TEXT,
  p_surname TEXT,
  p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.group_orders%ROWTYPE;
  v_reserved NUMERIC(12, 2);
BEGIN
  PERFORM public.expire_group_orders();

  SELECT * INTO v_order
  FROM public.group_orders
  WHERE token = p_group_token
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This group order could not be found.'; END IF;
  IF v_order.status <> 'upcoming' OR v_order.deadline < CURRENT_DATE THEN
    RAISE EXCEPTION 'Contributions are closed for this group order.';
  END IF;
  IF length(trim(coalesce(p_name, ''))) = 0 OR length(trim(coalesce(p_surname, ''))) = 0 THEN
    RAISE EXCEPTION 'Enter your name and surname.';
  END IF;
  IF p_amount IS NULL OR p_amount <> round(p_amount, 2) OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Enter a contribution amount.';
  END IF;

  SELECT coalesce(sum(amount), 0) INTO v_reserved
  FROM public.group_contributions
  WHERE group_order_id = v_order.id
    AND (status = 'paid' OR (status = 'pending' AND expires_at > NOW()));
  IF p_amount > round(v_order.total - v_reserved, 2) THEN
    RAISE EXCEPTION 'Contribution amount exceeds the remaining balance.';
  END IF;
  IF p_amount < 50 AND p_amount <> round(v_order.total - v_reserved, 2) THEN
    RAISE EXCEPTION 'The minimum contribution is R50.00 unless paying the exact remaining balance.';
  END IF;

  INSERT INTO public.group_contributions (id, group_order_id, name, surname, amount)
  VALUES (p_contribution_id, v_order.id, trim(p_name), trim(p_surname), p_amount);

  INSERT INTO public.group_payment_transactions (
    group_order_id, contribution_id, payfast_m_payment_id, amount_cents
  ) VALUES (
    v_order.id, p_contribution_id, p_contribution_id::TEXT, round(p_amount * 100)::BIGINT
  );

  RETURN p_contribution_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_group_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_count INTEGER := 0;
BEGIN
  UPDATE public.group_payment_transactions t
  SET payfast_payment_status = 'FAILED'
  WHERE t.payfast_payment_status = 'PENDING'
    AND EXISTS (
      SELECT 1
      FROM public.group_contributions c
      WHERE c.id = t.contribution_id
        AND c.status = 'pending'
        AND c.expires_at <= NOW()
    );
  UPDATE public.group_contributions
  SET status = 'failed'
  WHERE status = 'pending' AND expires_at <= NOW();

  FOR v_order IN
    UPDATE public.group_orders
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'upcoming' AND deadline < CURRENT_DATE
    RETURNING id, organizer_id, name
  LOOP
    v_count := v_count + 1;
    INSERT INTO public.group_order_notifications (user_id, group_order_id, type, title, body)
    VALUES (v_order.organizer_id, v_order.id, 'order_expired', 'Group order expired',
            v_order.name || ' has passed its payment deadline.');
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_group_contribution_itn(
  p_m_payment_id TEXT,
  p_pf_payment_id TEXT,
  p_payment_status TEXT,
  p_amount_cents BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transaction public.group_payment_transactions%ROWTYPE;
  v_contribution public.group_contributions%ROWTYPE;
  v_order public.group_orders%ROWTYPE;
  v_paid_total NUMERIC(12, 2);
  v_next_contribution_status TEXT;
BEGIN
  IF p_payment_status NOT IN ('COMPLETE', 'PENDING', 'FAILED', 'CANCELLED', 'REFUNDED') THEN
    RAISE EXCEPTION 'Invalid PayFast payment status.';
  END IF;

  SELECT * INTO v_transaction
  FROM public.group_payment_transactions
  WHERE payfast_m_payment_id = p_m_payment_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group payment transaction not found.'; END IF;
  IF v_transaction.amount_cents <> p_amount_cents THEN
    RAISE EXCEPTION 'PayFast payment amount mismatch.';
  END IF;
  IF v_transaction.payfast_payment_status = 'COMPLETE' AND p_payment_status <> 'COMPLETE' THEN
    RETURN;
  END IF;
  UPDATE public.group_payment_transactions
  SET payfast_pf_payment_id = p_pf_payment_id,
      payfast_payment_status = p_payment_status
  WHERE id = v_transaction.id;

  IF p_payment_status = 'PENDING' THEN RETURN; END IF;

  SELECT * INTO v_contribution
  FROM public.group_contributions
  WHERE id = v_transaction.contribution_id
  FOR UPDATE;
  SELECT * INTO v_order
  FROM public.group_orders
  WHERE id = v_transaction.group_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group order not found for payment.'; END IF;

  IF p_payment_status = 'COMPLETE' THEN
    IF v_contribution.status = 'paid' THEN RETURN; END IF;
    IF v_contribution.status = 'refunded' THEN RETURN; END IF;

    SELECT coalesce(sum(amount), 0) INTO v_paid_total
    FROM public.group_contributions
    WHERE group_order_id = v_order.id AND status = 'paid';
    v_paid_total := v_paid_total + v_contribution.amount;

    IF v_order.status = 'expired' OR v_order.deadline < CURRENT_DATE OR v_paid_total > v_order.total THEN
      v_next_contribution_status := 'refund_pending';
      IF v_order.status = 'upcoming' AND v_order.deadline < CURRENT_DATE THEN
        UPDATE public.group_orders SET status = 'expired' WHERE id = v_order.id;
        INSERT INTO public.group_order_notifications (user_id, group_order_id, type, title, body)
        VALUES (v_order.organizer_id, v_order.id, 'order_expired', 'Group order expired',
                v_order.name || ' has passed its payment deadline.');
      END IF;
    ELSE
      v_next_contribution_status := 'paid';
    END IF;

    UPDATE public.group_contributions
    SET status = v_next_contribution_status
    WHERE id = v_contribution.id;

    SELECT coalesce(sum(amount), 0) INTO v_paid_total
    FROM public.group_contributions
    WHERE group_order_id = v_order.id AND status = 'paid';

    UPDATE public.group_orders
    SET amount_paid = v_paid_total,
        refunds_processed = CASE
          WHEN v_next_contribution_status = 'refund_pending' THEN FALSE
          ELSE refunds_processed
        END,
        status = CASE
          WHEN status = 'upcoming' AND v_paid_total = total THEN 'confirmed'
          ELSE status
        END
    WHERE id = v_order.id;

    INSERT INTO public.group_order_notifications (user_id, group_order_id, type, title, body)
    VALUES (
      v_order.organizer_id,
      v_order.id,
      'contribution_received',
      CASE WHEN v_next_contribution_status = 'paid' THEN 'Contribution received' ELSE 'Contribution refund required' END,
      v_contribution.name || ' ' || v_contribution.surname || ' contributed R' ||
        to_char(v_contribution.amount, 'FM999999990.00') ||
        CASE WHEN v_next_contribution_status = 'paid' THEN '.' ELSE '; payment requires a refund review.' END
    );

    IF v_next_contribution_status = 'paid' AND v_order.status = 'upcoming' AND v_paid_total = v_order.total THEN
      INSERT INTO public.group_order_notifications (user_id, group_order_id, type, title, body)
      VALUES
        (v_order.organizer_id, v_order.id, 'order_confirmed', 'Order fully paid and confirmed',
         v_order.name || ' has reached its target.'),
        (v_order.organizer_id, v_order.id, 'confirm_fulfilment', 'Confirm pickup or delivery',
         v_order.name || ' is ready for fulfilment selection.');
    END IF;
  ELSIF p_payment_status IN ('FAILED', 'CANCELLED') THEN
    UPDATE public.group_contributions
    SET status = 'failed'
    WHERE id = v_contribution.id AND status = 'pending';
  ELSIF p_payment_status = 'REFUNDED' THEN
    UPDATE public.group_contributions
    SET status = 'refunded'
    WHERE id = v_contribution.id AND status IN ('paid', 'refund_pending');

    SELECT coalesce(sum(amount), 0) INTO v_paid_total
    FROM public.group_contributions
    WHERE group_order_id = v_order.id AND status = 'paid';
    UPDATE public.group_orders
    SET amount_paid = v_paid_total,
        status = CASE
          WHEN status IN ('confirmed', 'awaiting_fulfilment', 'ready', 'completed')
            AND v_paid_total <> total THEN 'expired'
          ELSE status
        END,
        fulfilment_method = CASE WHEN v_paid_total <> total THEN NULL ELSE fulfilment_method END,
        delivery_address = CASE WHEN v_paid_total <> total THEN NULL ELSE delivery_address END
    WHERE id = v_order.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_group_order_deadline(p_order_id UUID, p_deadline DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.group_orders
  SET deadline = p_deadline
  WHERE id = p_order_id AND status = 'upcoming' AND deadline >= CURRENT_DATE
    AND p_deadline >= CURRENT_DATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The deadline can no longer be changed.'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_group_order_fulfilment(
  p_order_id UUID,
  p_method TEXT,
  p_address JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_method NOT IN ('pickup', 'delivery') THEN RAISE EXCEPTION 'Choose pickup or delivery.'; END IF;
  IF p_method = 'delivery' AND (
    coalesce(p_address->>'street', '') = '' OR coalesce(p_address->>'suburb', '') = ''
    OR coalesce(p_address->>'city', '') = '' OR coalesce(p_address->>'postalCode', '') = ''
    OR coalesce(p_address->>'contactNumber', '') = ''
  ) THEN
    RAISE EXCEPTION 'Complete every delivery address field.';
  END IF;
  UPDATE public.group_orders
  SET status = 'awaiting_fulfilment',
      fulfilment_method = p_method,
      delivery_address = CASE WHEN p_method = 'delivery' THEN p_address ELSE NULL END
  WHERE id = p_order_id AND status = 'confirmed' AND fulfilment_method IS NULL AND amount_paid = total;
  IF NOT FOUND THEN RAISE EXCEPTION 'This order is not awaiting fulfilment selection.'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_group_order_status(p_order_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status
  FROM public.group_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group order not found.'; END IF;
  IF NOT (
    (v_current_status = 'awaiting_fulfilment' AND p_status = 'ready')
    OR (v_current_status = 'ready' AND p_status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Cannot change % to %.', v_current_status, p_status;
  END IF;
  UPDATE public.group_orders SET status = p_status WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_group_refunds_processed(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.group_orders
    WHERE id = p_order_id AND status = 'expired'
  ) THEN
    RAISE EXCEPTION 'Refunds can only be marked for expired group orders.';
  END IF;
  UPDATE public.group_contributions
  SET status = 'refunded'
  WHERE group_order_id = p_order_id AND status IN ('paid', 'refund_pending');
  UPDATE public.group_orders
  SET refunds_processed = TRUE, amount_paid = 0
  WHERE id = p_order_id AND status = 'expired';
  IF NOT FOUND THEN RAISE EXCEPTION 'Refunds can only be marked for expired group orders.'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_order(TEXT, DATE, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_group_contribution_payment(TEXT, UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_group_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_group_contribution_itn(TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_group_order_deadline(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_group_order_fulfilment(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_group_order_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mark_group_refunds_processed(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_group_order(TEXT, DATE, UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_group_contribution_payment(TEXT, UUID, TEXT, TEXT, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_group_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_group_contribution_itn(TEXT, TEXT, TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_group_order_deadline(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_group_order_fulfilment(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_group_order_status(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_group_refunds_processed(UUID) TO service_role;
