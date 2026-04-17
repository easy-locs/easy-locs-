-- captured_at: 2026-04-16T23:46:15Z
-- http: 201
-- query:
SELECT to_regtype('public.app_role')::text AS app_role_enum, to_regprocedure('public.has_role(uuid,public.app_role)')::text AS has_role_rpc;
