#!/usr/bin/env bash
PORT=5000
HEX_PORT=$(printf '%04X' "$PORT")

if command -v lsof &>/dev/null; then
  PID=$(lsof -ti :"$PORT" 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "Killing process(es) on port $PORT: $PID"
    kill -9 $PID 2>/dev/null || true
    sleep 0.5
  fi
elif command -v fuser &>/dev/null; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sleep 0.5
else
  PIDS=$(awk -v port=":${HEX_PORT}" '$2 ~ port && $4 == "0A" {print $10}' /proc/net/tcp /proc/net/tcp6 2>/dev/null | sort -u)
  for INODE in $PIDS; do
    for FD_DIR in /proc/[0-9]*/fd; do
      PID_DIR=$(dirname "$FD_DIR")
      PID_NUM=$(basename "$PID_DIR")
      if ls -l "$FD_DIR" 2>/dev/null | grep -q "socket:\[$INODE\]"; then
        echo "Killing PID $PID_NUM on port $PORT (inode $INODE)"
        kill -9 "$PID_NUM" 2>/dev/null || true
      fi
    done
  done
  sleep 0.5
fi
exit 0
