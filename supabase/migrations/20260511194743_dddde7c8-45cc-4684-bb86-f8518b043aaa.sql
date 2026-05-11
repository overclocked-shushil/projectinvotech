
-- Per-distributor stock ledger
CREATE TABLE public.distributor_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  item_name text NOT NULL,
  unit text NOT NULL,
  assigned_qty numeric NOT NULL DEFAULT 0 CHECK (assigned_qty >= 0),
  distributed_qty numeric NOT NULL DEFAULT 0 CHECK (distributed_qty >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (distributor_id, item_name)
);

ALTER TABLE public.distributor_stocks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_distributor_stocks_distributor ON public.distributor_stocks(distributor_id);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.distributor_stocks;
ALTER TABLE public.distributor_stocks REPLICA IDENTITY FULL;

-- Atomic stock deduction. Locks rows FOR UPDATE so concurrent distributions
-- can't oversell. Raises with a friendly message on insufficient stock.
CREATE OR REPLACE FUNCTION public.deduct_distributor_stock(
  _distributor_id uuid,
  _items jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it jsonb;
  cur public.distributor_stocks%ROWTYPE;
  qty numeric;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    qty := (it->>'quantity')::numeric;
    IF qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero for %', it->>'name';
    END IF;

    SELECT * INTO cur
      FROM public.distributor_stocks
     WHERE distributor_id = _distributor_id
       AND item_name = (it->>'name')
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No stock allocated for % for this distributor. Please contact Admin.', it->>'name';
    END IF;

    IF (cur.assigned_qty - cur.distributed_qty) < qty THEN
      RAISE EXCEPTION 'Insufficient stock for %. Only % % remaining.',
        it->>'name', (cur.assigned_qty - cur.distributed_qty), cur.unit;
    END IF;

    UPDATE public.distributor_stocks
       SET distributed_qty = distributed_qty + qty,
           updated_at = now()
     WHERE id = cur.id;
  END LOOP;
END;
$$;
