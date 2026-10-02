-- Run after all migrations in a disposable PostgreSQL database as the schema owner.
-- Fixtures and the injected failure trigger are rolled back on completion.
BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Assertion failed: %', message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.reject_test_inventory_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.item_id = '00000000-0000-0000-0000-000000000302'::uuid THEN
    RAISE EXCEPTION 'INJECTED_INVENTORY_FAILURE';
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO cities (id, name)
VALUES ('00000000-0000-0000-0000-000000000100', 'Atomic confirmation test city');
INSERT INTO stores (id, city_id, name) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000100', 'Atomic test store 1'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000100', 'Atomic test store 2');
INSERT INTO catalog_items (id, name, category) VALUES
  ('00000000-0000-0000-0000-000000000301', 'Atomic item 1', 'test'),
  ('00000000-0000-0000-0000-000000000302', 'Atomic item 2', 'test');
INSERT INTO store_items (store_id, item_id, last_confirmed_at)
SELECT s.id, i.id, CASE WHEN i.id = '00000000-0000-0000-0000-000000000301'::uuid THEN now() - interval '24 hours' ELSE NULL END
FROM stores s CROSS JOIN catalog_items i
WHERE s.id IN ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202')
  AND i.id IN ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000302');

CREATE TRIGGER reject_test_inventory_update BEFORE UPDATE ON store_items
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_inventory_update();

DO $$
DECLARE
  snapshot jsonb;
BEGIN
  SELECT jsonb_agg(to_jsonb(si) ORDER BY store_id, item_id) INTO snapshot FROM store_items si;
  BEGIN
    PERFORM confirm_stock_batch('00000000-0000-0000-0000-000000000201',
      '[{"itemId":"00000000-0000-0000-0000-000000000301","inStock":false},{"itemId":"00000000-0000-0000-0000-000000000302","inStock":false}]', 'retry-key');
    RAISE EXCEPTION 'Expected injected failure';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'INJECTED_INVENTORY_FAILURE' THEN RAISE; END IF;
  END;
  PERFORM pg_temp.assert_true(snapshot = (SELECT jsonb_agg(to_jsonb(si) ORDER BY store_id, item_id) FROM store_items si), 'failed batch rolls back every inventory update');
  PERFORM pg_temp.assert_true(NOT EXISTS (SELECT 1 FROM stock_confirmations WHERE store_id = '00000000-0000-0000-0000-000000000201'), 'failed batch rolls back audit rows');
  PERFORM pg_temp.assert_true(NOT EXISTS (SELECT 1 FROM stock_confirmation_requests WHERE store_id = '00000000-0000-0000-0000-000000000201'), 'failed batch does not consume request key');
END;
$$;
DROP TRIGGER reject_test_inventory_update ON store_items;

DO $$
DECLARE
  first_result jsonb;
  replay_result jsonb;
  isolated_result jsonb;
  payload jsonb := '[{"itemId":"00000000-0000-0000-0000-000000000301","inStock":false},{"itemId":"00000000-0000-0000-0000-000000000302","inStock":false}]';
BEGIN
  first_result := confirm_stock_batch('00000000-0000-0000-0000-000000000201', payload, 'retry-key', NULL, '{"unavailRate":0.1,"rejectRate":0.2}');
  PERFORM pg_temp.assert_true(first_result->'score_context' = '{"unavailRate":0.1,"rejectRate":0.2}'::jsonb, 'original score context is stored in result');
  PERFORM pg_temp.assert_true((first_result->>'before_hours')::numeric = 48, 'unknown timestamps contribute 72 hours to the average');
  PERFORM pg_temp.assert_true((first_result->>'after_hours')::numeric = 0, 'successful batch refreshes its items');
  PERFORM pg_temp.assert_true((SELECT count(*) = 2 FROM store_items WHERE store_id = '00000000-0000-0000-0000-000000000201' AND NOT in_stock), 'same-key retry after rollback writes out-of-stock state');
  replay_result := confirm_stock_batch('00000000-0000-0000-0000-000000000201',
    jsonb_build_array(payload->1, payload->0), 'retry-key');
  PERFORM pg_temp.assert_true(replay_result = first_result, 'reordered identical replay returns original result');
  replay_result := confirm_stock_batch('00000000-0000-0000-0000-000000000201', payload, 'retry-key', NULL, '{"unavailRate":0.9,"rejectRate":0.8}');
  PERFORM pg_temp.assert_true(replay_result = first_result, 'changed score context replays original response without a conflict');
  DELETE FROM store_items WHERE store_id = '00000000-0000-0000-0000-000000000201'
    AND item_id = '00000000-0000-0000-0000-000000000302';
  replay_result := confirm_stock_batch('00000000-0000-0000-0000-000000000201', payload, 'retry-key');
  PERFORM pg_temp.assert_true(replay_result = first_result, 'replay survives removal of a previously confirmed inventory item');
  PERFORM pg_temp.assert_true(NOT EXISTS (SELECT 1 FROM store_items WHERE store_id = '00000000-0000-0000-0000-000000000201' AND item_id = '00000000-0000-0000-0000-000000000302'), 'replay does not recreate removed inventory');
  PERFORM pg_temp.assert_true((SELECT count(*) = 2 FROM stock_confirmations WHERE store_id = '00000000-0000-0000-0000-000000000201'), 'replay does not duplicate audit rows');
  BEGIN
    PERFORM confirm_stock_batch('00000000-0000-0000-0000-000000000201',
      jsonb_set(payload, '{0,inStock}', 'true'), 'retry-key');
    RAISE EXCEPTION 'Expected payload conflict';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'IDEMPOTENCY_CONFLICT' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM confirm_stock_batch('00000000-0000-0000-0000-000000000201', payload, 'retry-key', '00000000-0000-0000-0000-000000000999');
    RAISE EXCEPTION 'Expected actor conflict';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'IDEMPOTENCY_CONFLICT' THEN RAISE; END IF;
  END;
  isolated_result := confirm_stock_batch('00000000-0000-0000-0000-000000000202', jsonb_build_array(payload->0), 'retry-key');
  PERFORM pg_temp.assert_true(isolated_result <> first_result, 'same key is isolated between stores');
  PERFORM pg_temp.assert_true((isolated_result->>'after_hours')::numeric = 36, 'partial confirmation retains unknown item staleness');
  PERFORM pg_temp.assert_true((SELECT last_confirmed_at IS NULL AND in_stock FROM store_items WHERE store_id = '00000000-0000-0000-0000-000000000202' AND item_id = '00000000-0000-0000-0000-000000000302'), 'partial confirmation leaves other items unchanged');
  -- A future timestamp contributes zero, never a negative age.
  UPDATE store_items SET last_confirmed_at = now() + interval '1 day'
  WHERE store_id = '00000000-0000-0000-0000-000000000202' AND item_id = '00000000-0000-0000-0000-000000000301';
  PERFORM pg_temp.assert_true((SELECT avg_hours_since_confirmed = 36 FROM v_store_freshness WHERE store_id = '00000000-0000-0000-0000-000000000202'), 'future timestamps clamp to zero');
END;
$$;

DO $$
DECLARE
  invalid_payload jsonb;
BEGIN
  FOREACH invalid_payload IN ARRAY ARRAY[
    'null'::jsonb, '{}'::jsonb, '[]'::jsonb,
    '[{"itemId":"00000000-0000-0000-0000-000000000301","inStock":"false"}]'::jsonb,
    '[{"itemId":"00000000-0000-0000-0000-000000000301","inStock":false},{"itemId":"00000000-0000-0000-0000-000000000301","inStock":true}]'::jsonb
  ] LOOP
    BEGIN
      PERFORM confirm_stock_batch('00000000-0000-0000-0000-000000000201', invalid_payload, 'invalid-key');
      RAISE EXCEPTION 'Expected invalid batch rejection';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'INVALID_CONFIRMATION_BATCH' THEN RAISE; END IF;
    END;
  END LOOP;
  BEGIN
    PERFORM confirm_stock_batch('00000000-0000-0000-0000-000000000201',
      '[{"itemId":"00000000-0000-0000-0000-000000000301","inStock":true},{"itemId":"00000000-0000-0000-0000-000000000999","inStock":true}]', 'invalid-key');
    RAISE EXCEPTION 'Expected invalid item rejection';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'INVALID_CONFIRMATION_ITEM' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM confirm_stock_batch('00000000-0000-0000-0000-000000000201',
      '[{"itemId":"missing-item","inStock":true}]', 'invalid-key');
    RAISE EXCEPTION 'Expected malformed UUID rejection';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'INVALID_CONFIRMATION_ITEM' THEN RAISE; END IF;
  END;
  PERFORM pg_temp.assert_true(NOT EXISTS (SELECT 1 FROM stock_confirmation_requests WHERE idempotency_key = 'invalid-key'), 'invalid batches do not consume request keys');
  PERFORM pg_temp.assert_true((SELECT count(*) = 2 FROM stock_confirmations WHERE store_id = '00000000-0000-0000-0000-000000000201'), 'invalid batches do not append audit rows');
END;
$$;

DO $$
BEGIN
  PERFORM pg_temp.assert_true(NOT has_function_privilege('anon', 'confirm_stock_batch(uuid,jsonb,text,uuid,jsonb)', 'EXECUTE'), 'anonymous users cannot execute batch writes');
  PERFORM pg_temp.assert_true(NOT has_function_privilege('authenticated', 'confirm_stock_batch(uuid,jsonb,text,uuid,jsonb)', 'EXECUTE'), 'authenticated users cannot execute batch writes');
  PERFORM pg_temp.assert_true(has_function_privilege('service_role', 'confirm_stock_batch(uuid,jsonb,text,uuid,jsonb)', 'EXECUTE'), 'service role can execute batch writes');
  PERFORM pg_temp.assert_true((SELECT relrowsecurity FROM pg_class WHERE oid = 'stock_confirmation_requests'::regclass), 'replay records have RLS enabled');
END;
$$;
ROLLBACK;
