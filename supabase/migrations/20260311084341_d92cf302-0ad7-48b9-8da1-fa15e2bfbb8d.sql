
-- Update the notify_review_request function to also invoke the review email via pg_net
CREATE OR REPLACE FUNCTION public.notify_review_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _booker_user_id uuid;
  _service_title text;
  _provider_name text;
  _booker_email text;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Set completed_at if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;

    _booker_email := NEW.booker_email;

    -- Try to find the booker's user_id from profiles
    SELECT id INTO _booker_user_id FROM public.profiles WHERE email = _booker_email LIMIT 1;

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

    -- Send review request email via SendGrid (using pg_net)
    IF _booker_email IS NOT NULL AND _booker_email <> '' THEN
      IF NOT EXISTS (SELECT 1 FROM public.marketplace_reviews WHERE booking_id = NEW.id) THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
          ),
          body := jsonb_build_object(
            'to', _booker_email,
            'subject', '⭐ How was your experience with ' || COALESCE(_provider_name, 'our service') || '?',
            'html', '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">'
              || '<div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">'
              || '<h1 style="color:#ffffff;font-size:20px;margin:0;">⭐ Share Your Experience</h1>'
              || '</div>'
              || '<div style="padding:24px;">'
              || '<p style="color:#334155;font-size:15px;">Your booking for <strong>' || COALESCE(_service_title, 'service') || '</strong> with <strong>' || COALESCE(_provider_name, 'provider') || '</strong> is complete.</p>'
              || '<p style="color:#334155;font-size:15px;">We''d love to hear your feedback! Your review helps other customers make informed decisions.</p>'
              || '<div style="text-align:center;margin:24px 0;">'
              || '<a href="https://easy-locs.lovable.app/client/bookings" style="display:inline-block;background:linear-gradient(135deg,#d4a853,#c49a42);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Leave a Review</a>'
              || '</div>'
              || '<p style="color:#94a3b8;font-size:12px;text-align:center;">You have 30 days to submit your review.</p>'
              || '</div>'
              || '<div style="background:#f8fafc;padding:16px 24px;border-radius:0 0 12px 12px;text-align:center;">'
              || '<p style="color:#94a3b8;font-size:11px;margin:0;">EASY-LOCS® — Smart property management</p>'
              || '</div></div>'
          )
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
