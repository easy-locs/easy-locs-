#!/usr/bin/env bash
PORT=5000
PID=$(lsof -ti :"$PORT" 2>/dev/null)
if [ -n "$PID" ]; then
  echo "Killing process(es) on port $PORT: $PID"
  kill -9 $PID 2>/dev/null || true
  sleep 0.5
fi
exit 0
