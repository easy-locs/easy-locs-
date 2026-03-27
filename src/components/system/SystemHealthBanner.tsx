type Props = {
  db: boolean;
  auth: boolean;
  realtime: boolean;
  checked?: boolean;
};

export function SystemHealthBanner({ db, auth, realtime, checked }: Props) {
  // Don't show banner until first health check completes
  if (!checked) return null;
  const ok = db && auth && realtime;
  if (ok) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-destructive/90 px-4 py-2 text-center text-xs text-destructive-foreground backdrop-blur-sm">
      <span className="font-medium">System degraded</span>
      <span className="ml-2 opacity-80">
        DB: {db ? "ok" : "down"} · Auth: {auth ? "ok" : "down"} · RT: {realtime ? "ok" : "down"}
      </span>
    </div>
  );
}
