import { supabase } from "@/integrations/supabase/client";

type DbFn = {
  (table: string): ReturnType<typeof supabase.from>;
  from: (table: string) => ReturnType<typeof supabase.from>;
  rpc: typeof supabase.rpc;
  storage: typeof supabase.storage;
  functions: typeof supabase.functions;
  auth: typeof supabase.auth;
};

const _from = (table: string) =>
  (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

export const db: DbFn = Object.assign(
  _from,
  {
    from: _from,
    rpc: (supabase as unknown as { rpc: typeof supabase.rpc }).rpc.bind(supabase),
    storage: supabase.storage,
    functions: supabase.functions,
    auth: supabase.auth,
  },
);
