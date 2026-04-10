
-- Auto-create a deal room when a marketplace inquiry message is inserted
-- This triggers when a message with message_type='inquiry' and context_type like 'listing'/'marketplace_service' is inserted
CREATE OR REPLACE FUNCTION public.auto_create_deal_room_on_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing_deal uuid;
  _new_deal_id uuid;
  _org_id uuid;
  _context_title text;
BEGIN
  -- Only fire for inquiry messages with marketplace context
  IF NEW.message_type IS DISTINCT FROM 'inquiry' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.context_type IS NULL OR NEW.context_type NOT IN ('listing', 'marketplace_service', 'concierge_service') THEN
    RETURN NEW;
  END IF;
  
  IF NEW.sender_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get org_id from the message
  _org_id := NEW.org_id;
  IF _org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if a deal room already exists for this context + buyer
  SELECT id INTO _existing_deal
  FROM public.deal_rooms
  WHERE context_type = NEW.context_type
    AND context_id = NEW.context_id
    AND buyer_id = NEW.sender_id
    AND status NOT IN ('cancelled', 'completed')
  LIMIT 1;

  IF _existing_deal IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get listing title for context
  SELECT title INTO _context_title
  FROM public.marketplace_services
  WHERE id::text = NEW.context_id
  LIMIT 1;

  -- Create deal room automatically
  INSERT INTO public.deal_rooms (org_id, buyer_id, context_type, context_id, context_title, thread_id, status)
  VALUES (_org_id, NEW.sender_id, NEW.context_type, NEW.context_id, COALESCE(_context_title, ''), NEW.thread_id, 'inquiry')
  RETURNING id INTO _new_deal_id;

  -- Record initial event
  INSERT INTO public.deal_events (deal_id, event_type, actor_id, actor_role, data_json)
  VALUES (_new_deal_id, 'status_change', NEW.sender_id, 'buyer',
    jsonb_build_object('new_status', 'inquiry', 'auto_created', true, 'source', 'inquiry_message')
  );

  RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS trg_auto_deal_room_on_inquiry ON public.messages;
CREATE TRIGGER trg_auto_deal_room_on_inquiry
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_deal_room_on_inquiry();

-- Also auto-create deal room when a marketplace booking is created
CREATE OR REPLACE FUNCTION public.auto_create_deal_room_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing_deal uuid;
  _new_deal_id uuid;
  _context_title text;
  _buyer_id uuid;
BEGIN
  -- Try to find the buyer's user_id from booker_email
  SELECT id INTO _buyer_id FROM public.profiles WHERE email = NEW.booker_email LIMIT 1;
  
  IF _buyer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if deal room already exists
  SELECT id INTO _existing_deal
  FROM public.deal_rooms
  WHERE context_type = 'marketplace_service'
    AND context_id = NEW.service_id::text
    AND buyer_id = _buyer_id
    AND status NOT IN ('cancelled', 'completed')
  LIMIT 1;

  IF _existing_deal IS NOT NULL THEN
    -- Link booking to existing deal
    UPDATE public.deal_rooms SET booking_id = NEW.id::text WHERE id = _existing_deal;
    RETURN NEW;
  END IF;

  -- Get service title
  SELECT title INTO _context_title FROM public.marketplace_services WHERE id = NEW.service_id LIMIT 1;

  -- Create deal room
  INSERT INTO public.deal_rooms (org_id, buyer_id, context_type, context_id, context_title, booking_id, status)
  VALUES (NEW.org_id, _buyer_id, 'marketplace_service', NEW.service_id::text, COALESCE(_context_title, ''), NEW.id::text, 'inquiry')
  RETURNING id INTO _new_deal_id;

  INSERT INTO public.deal_events (deal_id, event_type, actor_id, actor_role, data_json)
  VALUES (_new_deal_id, 'status_change', _buyer_id, 'buyer',
    jsonb_build_object('new_status', 'inquiry', 'auto_created', true, 'source', 'marketplace_booking', 'booking_id', NEW.id::text)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_deal_room_on_marketplace_booking ON public.marketplace_bookings;
CREATE TRIGGER trg_auto_deal_room_on_marketplace_booking
  AFTER INSERT ON public.marketplace_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_deal_room_on_booking();
