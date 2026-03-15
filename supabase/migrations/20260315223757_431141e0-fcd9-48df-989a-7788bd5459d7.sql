
-- Phase 9b: Add offer expiration and negotiation round tracking

ALTER TABLE public.deal_rooms
  ADD COLUMN IF NOT EXISTS offer_expires_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS negotiation_round integer DEFAULT 0;

ALTER TABLE public.deal_events
  ADD COLUMN IF NOT EXISTS round_number integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.auto_expire_deal_offers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.offer_expires_at IS NOT NULL AND NEW.status IN ('offer_sent', 'counter_offer') THEN
    IF NEW.offer_expires_at < now() THEN
      NEW.status := 'negotiation';
      NEW.offer_expires_at := NULL;
      INSERT INTO public.deal_events (deal_id, event_type, actor_id, data_json)
      VALUES (NEW.id, 'status_change', NULL,
        jsonb_build_object('new_status', 'negotiation', 'old_status', OLD.status::text, 'reason', 'offer_expired')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_expire_deal_offers ON public.deal_rooms;
CREATE TRIGGER trg_auto_expire_deal_offers
  BEFORE UPDATE ON public.deal_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_expire_deal_offers();
