# Supabase Runtime Guard Report

Generated: 2026-04-22T03:01:50.600Z

## Purpose

Detects eager module-init access to Supabase sub-clients (storage, auth, functions, channel bindings).
Eager access can cause failures in test environments where the Supabase client is mocked.

## Results

✅ **No violations found.** All Supabase sub-client access is lazy or deferred.

## Rules

- `supabase.storage`, `supabase.functions`, `supabase.auth` must be accessed via lazy getters
- `supabase.channel.bind()`, `supabase.rpc.bind()` etc. must be replaced with arrow-fn wrappers
- All eager assignments at module top-level are forbidden
