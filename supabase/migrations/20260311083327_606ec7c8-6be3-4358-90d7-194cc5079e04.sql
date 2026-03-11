
-- Add review window: completed_at tracking + 30-day window validation
-- We'll use completed_at from marketplace_bookings to calculate the window

-- Create trigger function to send review request notification when booking is completed
CREATE OR REPLACE FUNCTION public.notify_review_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booker_user_id uuid;
  _service_title text;
  _provider_name text;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Set completed_at if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;

    -- Try to find the booker's user_id from profiles
    SELECT id INTO _booker_user_id FROM public.profiles WHERE email = NEW.booker_email LIMIT 1;

    -- Get service title
    SELECT title INTO _service_title FROM public.marketplace_services WHERE id = NEW.service_id LIMIT 1;

    -- Get provider name
    SELECT display_name INTO _provider_name FROM public.marketplace_providers WHERE id = NEW.provider_id LIMIT 1;

    -- Only send notification if user exists
    IF _booker_user_id IS NOT NULL THEN
      -- Check if review already exists for this booking
      IF NOT EXISTS (SELECT 1 FROM public.marketplace_reviews WHERE booking_id = NEW.id) THEN
        INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
        VALUES (
          _booker_user_id,
          NEW.org_id,
          'info',
          '⭐ How was your experience?',
          'Your booking for ' || COALESCE(_service_title, 'service') || ' with ' || COALESCE(_provider_name, 'provider') || ' is complete. Share your review!',
          '/client/bookings',
          jsonb_build_object(
            'target_type', 'review_request',
            'target_id', NEW.id::text,
            'booking_id', NEW.id::text,
            'service_title', COALESCE(_service_title, ''),
            'provider_name', COALESCE(_provider_name, ''),
            'target_url', '/client/bookings'
          )
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_notify_review_request ON public.marketplace_bookings;
CREATE TRIGGER trg_notify_review_request
  BEFORE UPDATE ON public.marketplace_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_review_request();
