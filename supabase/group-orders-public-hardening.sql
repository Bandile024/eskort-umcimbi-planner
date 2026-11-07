-- Apply after the original group-orders.sql migration.
BEGIN;

REVOKE ALL ON TABLE public.group_orders, public.group_order_items, public.group_contributions,
  public.group_payment_transactions, public.group_order_notifications FROM PUBLIC, anon;

ALTER TABLE public.group_contributions
  DROP CONSTRAINT IF EXISTS group_contributions_amount_check;
ALTER TABLE public.group_contributions
  ADD CONSTRAINT group_contributions_amount_check CHECK (amount > 0);
ALTER TABLE public.group_payment_transactions
  DROP CONSTRAINT IF EXISTS group_payment_transactions_amount_cents_check;
ALTER TABLE public.group_payment_transactions
  ADD CONSTRAINT group_payment_transactions_amount_cents_check CHECK (amount_cents > 0);

CREATE INDEX IF NOT EXISTS idx_group_contributions_order_status_expiry
  ON public.group_contributions (group_order_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_group_payment_transactions_order_status
  ON public.group_payment_transactions (group_order_id, payfast_payment_status);

CREATE OR REPLACE FUNCTION public.expire_group_order_by_token(p_group_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
BEGIN
  UPDATE public.group_orders
  SET status = 'expired', updated_at = NOW()
  WHERE token = p_group_token
    AND status = 'upcoming'
    AND deadline < CURRENT_DATE
  RETURNING id, organizer_id, name INTO v_order;

  IF FOUND THEN
    INSERT INTO public.group_order_notifications (user_id, group_order_id, type, title, body)
    VALUES (v_order.organizer_id, v_order.id, 'order_expired', 'Group order expired',
            v_order.name || ' has passed its payment deadline.');
  END IF;
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
  v_order_id UUID;
  v_reserved NUMERIC(12, 2);
BEGIN
  IF length(trim(coalesce(p_name, ''))) = 0 OR length(trim(coalesce(p_surname, ''))) = 0 THEN
    RAISE EXCEPTION 'Enter your name and surname.';
  END IF;
  IF p_amount IS NULL OR p_amount <> round(p_amount, 2) OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Enter a contribution amount.';
  END IF;

  SELECT id INTO v_order_id
  FROM public.group_orders
  WHERE token = p_group_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'This group order could not be found.'; END IF;

  UPDATE public.group_payment_transactions t
  SET payfast_payment_status = 'FAILED'
  WHERE t.group_order_id = v_order_id
    AND t.payfast_payment_status = 'PENDING'
    AND EXISTS (
      SELECT 1
      FROM public.group_contributions c
      WHERE c.id = t.contribution_id
        AND c.status = 'pending'
        AND c.expires_at <= NOW()
    );
  UPDATE public.group_contributions
  SET status = 'failed'
  WHERE group_order_id = v_order_id AND status = 'pending' AND expires_at <= NOW();

  SELECT * INTO v_order
  FROM public.group_orders
  WHERE id = v_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This group order could not be found.'; END IF;
  IF v_order.status <> 'upcoming' OR v_order.deadline < CURRENT_DATE THEN
    RAISE EXCEPTION 'Contributions are closed for this group order.';
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

REVOKE ALL ON FUNCTION public.expire_group_order_by_token(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_group_contribution_payment(TEXT, UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_group_order_by_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_group_contribution_payment(TEXT, UUID, TEXT, TEXT, NUMERIC) TO service_role;

COMMIT;
