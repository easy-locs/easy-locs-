
-- =============================================
-- DEAL ROOM: Conversation-integrated negotiation system
-- =============================================

-- Deal lifecycle status
DO $$ BEGIN
  CREATE TYPE public.deal_status AS ENUM (
    'inquiry', 'negotiation', 'offer_sent', 'counter_offer',
    'accepted', 'payment_pending', 'confirmed', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Deal rooms table
CREATE TABLE IF NOT EXISTS public.deal_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.conversation_threads(id) ON DELETE SET NULL,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  buyer_id uuid,  -- authenticated user or null for guest
  seller_id uuid, -- org owner
  context_type text NOT NULL DEFAULT 'listing',  -- listing, booking, service
  context_id text,  -- listing_id, booking_id, etc.
  context_title text,
  status deal_status NOT NULL DEFAULT 'inquiry',
  current_offer_amount numeric,
  current_offer_currency text DEFAULT 'EUR',
  counter_offer_amount numeric,
  accepted_amount numeric,
  booking_id uuid,
  notes text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_rooms ENABLE ROW LEVEL SECURITY;

-- Participants can view their deals
CREATE POLICY "Participants can view deals"
  ON public.deal_rooms FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR is_org_member(auth.uid(), org_id)
  );

-- Buyers can create deals
CREATE POLICY "Authenticated users can create deals"
  ON public.deal_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Participants can update deals
CREATE POLICY "Participants can update deals"
  ON public.deal_rooms FOR UPDATE
  USING (
    auth.uid() = buyer_id
    OR is_org_member(auth.uid(), org_id)
  );

-- Deal events table (timeline of everything that happens)
CREATE TABLE IF NOT EXISTS public.deal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deal_rooms(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'offer', 'counter_offer', 'message', 'document', 'payment', 'status_change', 'visit_scheduled', 'call'
  actor_id uuid,
  actor_role text DEFAULT 'buyer', -- 'buyer' or 'seller'
  data_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can view events"
  ON public.deal_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deal_rooms dr
      WHERE dr.id = deal_id
      AND (dr.buyer_id = auth.uid() OR is_org_member(auth.uid(), dr.org_id))
    )
  );

CREATE POLICY "Deal participants can insert events"
  ON public.deal_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deal_rooms dr
      WHERE dr.id = deal_id
      AND (dr.buyer_id = auth.uid() OR is_org_member(auth.uid(), dr.org_id))
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_rooms_thread ON public.deal_rooms(thread_id);
CREATE INDEX IF NOT EXISTS idx_deal_rooms_context ON public.deal_rooms(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_deal_rooms_buyer ON public.deal_rooms(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deal_rooms_org ON public.deal_rooms(org_id);
CREATE INDEX IF NOT EXISTS idx_deal_events_deal ON public.deal_events(deal_id);

-- Auto-update timestamp
CREATE TRIGGER update_deal_rooms_updated_at
  BEFORE UPDATE ON public.deal_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit deal status changes
CREATE OR REPLACE FUNCTION public.audit_deal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Record event in deal_events
    INSERT INTO public.deal_events (deal_id, event_type, actor_id, data_json)
    VALUES (NEW.id, 'status_change', auth.uid(),
      jsonb_build_object('old_status', OLD.status::text, 'new_status', NEW.status::text)
    );

    -- Audit log
    INSERT INTO public.audit_logs (user_id, org_id, action, metadata_json)
    VALUES (auth.uid(), NEW.org_id, 'deal_status_' || NEW.status::text,
      jsonb_build_object('deal_id', NEW.id, 'old_status', OLD.status::text, 'new_status', NEW.status::text, 'context_type', NEW.context_type, 'context_id', NEW.context_id)
    );

    -- Notify counterpart
    IF NEW.status IN ('offer_sent', 'counter_offer', 'accepted', 'confirmed', 'cancelled') THEN
      DECLARE
        _notify_user uuid;
        _title text;
        _message text;
      BEGIN
        -- Determine who to notify
        IF auth.uid() = NEW.buyer_id THEN
          SELECT owner_user_id INTO _notify_user FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
        ELSE
          _notify_user := NEW.buyer_id;
        END IF;

        IF _notify_user IS NOT NULL THEN
          CASE NEW.status::text
            WHEN 'offer_sent' THEN _title := '💰 New offer received'; _message := 'An offer of ' || COALESCE(NEW.current_offer_amount::text, '?') || ' ' || COALESCE(NEW.current_offer_currency, 'EUR') || ' for "' || COALESCE(NEW.context_title, 'item') || '"';
            WHEN 'counter_offer' THEN _title := '🔄 Counter-offer received'; _message := 'Counter-offer of ' || COALESCE(NEW.counter_offer_amount::text, '?') || ' ' || COALESCE(NEW.current_offer_currency, 'EUR') || ' for "' || COALESCE(NEW.context_title, 'item') || '"';
            WHEN 'accepted' THEN _title := '✅ Offer accepted'; _message := 'The offer for "' || COALESCE(NEW.context_title, 'item') || '" has been accepted!';
            WHEN 'confirmed' THEN _title := '🎉 Deal confirmed'; _message := 'Deal for "' || COALESCE(NEW.context_title, 'item') || '" is confirmed.';
            WHEN 'cancelled' THEN _title := '❌ Deal cancelled'; _message := 'The deal for "' || COALESCE(NEW.context_title, 'item') || '" was cancelled.';
            ELSE _title := '📋 Deal updated'; _message := 'Status updated for "' || COALESCE(NEW.context_title, 'item') || '"';
          END CASE;

          INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
          VALUES (_notify_user, NEW.org_id, 'info', _title, _message,
            '/dashboard/communication?deal=' || NEW.id,
            jsonb_build_object('target_type', 'deal', 'target_id', NEW.id::text, 'deal_status', NEW.status::text, 'target_url', '/dashboard/communication?deal=' || NEW.id::text)
          );
        END IF;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_deal_status
  AFTER UPDATE ON public.deal_rooms
  FOR EACH ROW EXECUTE FUNCTION public.audit_deal_status_change();

-- Enable realtime for deal rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_events;
