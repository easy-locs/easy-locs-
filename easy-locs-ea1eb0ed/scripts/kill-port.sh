#!/usr/bin/env bash
# Kill any process holding the dev server port. Resilient across environments
# where lsof / fuser may be missing (e.g. minimal Nix shells).
PORT="${PORT:-5000}"
HEX_PORT=$(printf '%04X' "$PORT")

kill_pids() {
  local pids="$1"
  [ -z "$pids" ] && return 0
  echo "Killing process(es) on port $PORT: $pids"
  # Try graceful shutdown first, then force.
  kill $pids 2>/dev/null || true
  sleep 0.3
  kill -9 $pids 2>/dev/null || true
}

# 1. lsof — fast path when available.
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null | sort -u)
  kill_pids "$PIDS"
fi

# 2. fuser — alternate fast path.
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  fuser -k "${PORT}/tcp6" 2>/dev/null || true
fi

# 3. ss — covers IPv6 and gives PIDs directly.
if command -v ss >/dev/null 2>&1; then
  PIDS=$(ss -lptn "sport = :$PORT" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)
  kill_pids "$PIDS"
fi

# 4. pgrep — kill any vite that may have been orphaned by the previous workflow.
if command -v pgrep >/dev/null 2>&1; then
  # Scope to vite processes whose cmdline references THIS project dir, so we
  # don't terminate unrelated vite instances in multi-project environments.
  PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  PIDS=$(pgrep -f "node .*${PROJECT_DIR}/node_modules/.*vite" 2>/dev/null | sort -u)
  kill_pids "$PIDS"
fi

# 5. /proc fallback — find sockets listening on $PORT (state 0A) over IPv4 + IPv6,
#    walk /proc to map socket inode -> pid.
INODES=$(awk -v port=":${HEX_PORT}" '$2 ~ port"$" && $4 == "0A" {print $10}' \
  /proc/net/tcp /proc/net/tcp6 2>/dev/null | sort -u)
if [ -n "$INODES" ]; then
  for INODE in $INODES; do
    for FD_DIR in /proc/[0-9]*/fd; do
      PID_NUM=$(basename "$(dirname "$FD_DIR")")
      if ls -l "$FD_DIR" 2>/dev/null | grep -q "socket:\[$INODE\]"; then
        echo "Killing PID $PID_NUM on port $PORT (inode $INODE)"
        kill -9 "$PID_NUM" 2>/dev/null || true
      fi
    done
  done
fi

# Give the kernel a moment to release the socket before vite re-binds.
sleep 0.6
exit 0
