-- A request record and all item writes commit together. Retries survive restarts.
CREATE TABLE stock_confirmation_requests (
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, idempotency_key)
);
ALTER TABLE stock_confirmation_requests ENABLE ROW LEVEL SECURITY;

-- Unknown timestamps contribute maximum staleness instead of disappearing from AVG.
CREATE OR REPLACE VIEW v_store_freshness AS
SELECT si.store_id, s.name AS store_name, ci.name AS city_name, s.category,
  AVG(GREATEST(COALESCE(EXTRACT(EPOCH FROM (now() - si.last_confirmed_at)) / 3600, 72), 0)) AS avg_hours_since_confirmed,
  MIN(si.last_confirmed_at) AS oldest_confirmation,
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE si.in_stock = true) AS in_stock_count
FROM store_items si
JOIN stores s ON s.id = si.store_id
JOIN cities ci ON ci.id = s.city_id
GROUP BY si.store_id, s.name, ci.name, s.category;

CREATE OR REPLACE FUNCTION confirm_stock_batch(
  p_store_id uuid, p_items jsonb, p_idempotency_key text, p_confirmed_by uuid DEFAULT NULL,
  p_score_context jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_payload jsonb;
  v_previous stock_confirmation_requests%ROWTYPE;
  v_item jsonb;
  v_row stock_confirmations%ROWTYPE;
  v_rows jsonb := '[]'::jsonb;
  v_before numeric;
  v_after numeric;
  v_result jsonb;
  v_now timestamptz := now();
BEGIN
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) = 0
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_CONFIRMATION_BATCH';
  END IF;
  IF jsonb_array_length(p_items) = 0 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) i
    WHERE jsonb_typeof(i->'itemId') IS DISTINCT FROM 'string'
       OR jsonb_typeof(i->'inStock') IS DISTINCT FROM 'boolean'
  ) THEN
    RAISE EXCEPTION 'INVALID_CONFIRMATION_BATCH';
  END IF;
  SELECT jsonb_agg(jsonb_build_object('itemId', i->>'itemId', 'inStock', i->'inStock') ORDER BY i->>'itemId')
    INTO v_items FROM jsonb_array_elements(p_items) i;
  IF (SELECT count(DISTINCT i->>'itemId') FROM jsonb_array_elements(v_items) i) <> jsonb_array_length(v_items) THEN
    RAISE EXCEPTION 'INVALID_CONFIRMATION_BATCH';
  END IF;
  v_payload := jsonb_build_object('items', v_items, 'confirmedBy', p_confirmed_by);

  -- Serialize batches for one store, including simultaneous retries on different workers.
  PERFORM 1 FROM stores WHERE id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_CONFIRMATION_STORE'; END IF;
  SELECT * INTO v_previous FROM stock_confirmation_requests
    WHERE store_id = p_store_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_previous.payload <> v_payload THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    RETURN v_previous.result;
  END IF;

  -- Lock inventory before validating; a missing item fails the entire transaction.
  PERFORM 1 FROM store_items WHERE store_id = p_store_id ORDER BY item_id FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_items) i
    WHERE NOT EXISTS (SELECT 1 FROM store_items si
      WHERE si.store_id = p_store_id AND si.item_id = (i->>'itemId')::uuid)
  ) THEN RAISE EXCEPTION 'INVALID_CONFIRMATION_ITEM'; END IF;
  SELECT avg_hours_since_confirmed INTO v_before FROM v_store_freshness WHERE store_id = p_store_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    INSERT INTO stock_confirmations (store_id, item_id, in_stock, idempotency_key, confirmed_by, created_at)
    VALUES (p_store_id, (v_item->>'itemId')::uuid, (v_item->>'inStock')::boolean,
      jsonb_build_array(p_store_id, p_idempotency_key, v_item->>'itemId')::text, p_confirmed_by, v_now)
    RETURNING * INTO v_row;
    UPDATE store_items SET in_stock = v_row.in_stock, last_confirmed_at = v_now, updated_at = v_now
      WHERE store_id = p_store_id AND item_id = v_row.item_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_CONFIRMATION_ITEM'; END IF;
    v_rows := v_rows || jsonb_build_array(to_jsonb(v_row));
  END LOOP;
  SELECT avg_hours_since_confirmed INTO v_after FROM v_store_freshness WHERE store_id = p_store_id;
  v_result := jsonb_build_object('confirmations', v_rows, 'before_hours', v_before, 'after_hours', v_after, 'score_context', p_score_context);
  INSERT INTO stock_confirmation_requests (store_id, idempotency_key, payload, result)
    VALUES (p_store_id, p_idempotency_key, v_payload, v_result);
  RETURN v_result;
EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION 'INVALID_CONFIRMATION_ITEM';
END;
$$;

-- Only the server service role may use this write operation and its replay records.
REVOKE ALL ON FUNCTION confirm_stock_batch(uuid, jsonb, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_stock_batch(uuid, jsonb, text, uuid, jsonb) TO service_role;
GRANT SELECT, INSERT ON stock_confirmation_requests TO service_role;
