# Supabase Runtime Guard Report

> Generated: 2026-04-24T01:54:44.555Z
> Verdict: **PASS**
> Blockers: 0 | Info: 7

## Why This Matters

When Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are
absent, the exported `supabase` client is a Proxy stub that **throws on any property access**.
If a module accesses `supabase.auth`, `supabase.rpc`, etc. at import/module-eval time,
the synchronous throw prevents React from ever mounting → permanent stuck splash.

## Forbidden Eager Properties

- `supabase.rpc`
- `supabase.auth`
- `supabase.storage`
- `supabase.functions`
- `supabase.channel`
- `supabase.removeChannel`
- `supabase.getChannels`
- `supabase.removeAllChannels`

## Correct Patterns

```ts
// ✅ Arrow function wrapper (rpc, channel, etc.)
export const db = Object.assign(_from, {
  rpc: ((...args) => supabase.rpc(...args)) as typeof supabase.rpc,
  channel: (...args) => supabase.channel(...args),
});

// ✅ Object.defineProperty getter (auth, storage, functions)
Object.defineProperties(db, {
  auth:     { get: () => supabase.auth,     enumerable: true, configurable: true },
  storage:  { get: () => supabase.storage,  enumerable: true, configurable: true },
  functions:{ get: () => supabase.functions, enumerable: true, configurable: true },
});
```

## ℹ️ Info (confirm lazy)

| File | Line | Property | Code |
|---|---|---|---|
| `src/lib/realtime.ts` | 40 | `channel` | `let channel = supabase.channel(channelName, pending.opts);` |
| `src/lib/storage/assets.ts` | 106 | `storage` | `const { data: publicUrlData } = supabase.storage.from(params.bucket).getPublicUrl(params.path);` |
| `src/lib/storage/uploadFile.ts` | 122 | `storage` | `const { data } = supabase.storage.from(bucket).getPublicUrl(path);` |
| `src/repositories/mfa.repository.ts` | 12 | `auth` | `return supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });` |
| `src/repositories/mfa.repository.ts` | 16 | `auth` | `return supabase.auth.mfa.challenge({ factorId });` |
| `src/repositories/mfa.repository.ts` | 20 | `auth` | `return supabase.auth.mfa.verify({ factorId, challengeId, code });` |
| `src/repositories/mfa.repository.ts` | 24 | `auth` | `return supabase.auth.mfa.unenroll({ factorId });` |

