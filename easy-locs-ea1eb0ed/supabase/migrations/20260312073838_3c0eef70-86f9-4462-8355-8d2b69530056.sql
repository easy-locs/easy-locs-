-- Fix audit trigger to handle tables without user_id column
CREATE OR REPLACE FUNCTION public.audit_table_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _action text;
  _record_id text;
  _user_id uuid;
  _org_id uuid;
  _meta jsonb;
BEGIN
  _action := TG_ARGV[0] || '_' || LOWER(TG_OP);
  
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id::text;
    BEGIN _org_id := OLD.org_id; EXCEPTION WHEN undefined_column THEN _org_id := NULL; END;
    BEGIN _user_id := COALESCE(auth.uid(), OLD.user_id); EXCEPTION WHEN undefined_column THEN _user_id := auth.uid(); END;
  ELSE
    _record_id := NEW.id::text;
    BEGIN _org_id := NEW.org_id; EXCEPTION WHEN undefined_column THEN _org_id := NULL; END;
    BEGIN _user_id := COALESCE(auth.uid(), NEW.user_id); EXCEPTION WHEN undefined_column THEN _user_id := auth.uid(); END;
  END IF;

  IF _user_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  _meta := jsonb_build_object(
    'record_id', _record_id,
    'table', TG_TABLE_NAME,
    'operation', TG_OP
  );

  IF TG_OP != 'DELETE' THEN
    BEGIN
      _meta := _meta || jsonb_build_object('label', NEW.label);
    EXCEPTION WHEN undefined_column THEN
      BEGIN
        _meta := _meta || jsonb_build_object('name', NEW.name);
      EXCEPTION WHEN undefined_column THEN
        BEGIN
          _meta := _meta || jsonb_build_object('title', NEW.title);
        EXCEPTION WHEN undefined_column THEN
          NULL;
        END;
      END;
    END;
  END IF;

  BEGIN
    INSERT INTO public.audit_logs (user_id, org_id, action, metadata_json)
    VALUES (_user_id, _org_id, _action, _meta);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$function$;