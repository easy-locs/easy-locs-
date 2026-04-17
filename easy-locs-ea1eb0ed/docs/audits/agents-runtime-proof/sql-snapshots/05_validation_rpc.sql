-- captured_at: 2026-04-16T23:46:15Z
-- http: 201
-- query:
SELECT to_regprocedure('system.validate_execution_task(uuid)')::text AS validate_rpc, to_regprocedure('system.try_acquire_execution_lock(text,text,int)')::text AS lock_rpc, to_regprocedure('system.release_execution_lock(text,text)')::text AS release_rpc, to_regprocedure('system.cleanup_expired_locks()')::text AS cleanup_rpc, to_regprocedure('system.claim_idempotency_key(text,uuid)')::text AS claim_rpc;
