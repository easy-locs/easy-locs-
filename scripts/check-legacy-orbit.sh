#!/usr/bin/env bash
set -e
echo "=== LEGACY ORBIT WRITE CHECK ==="
grep -rn 'from("messages")' src --include="*.ts" --include="*.tsx" || true
grep -rn "from('messages')" src --include="*.ts" --include="*.tsx" || true
grep -rn 'from("conversation_threads")' src --include="*.ts" --include="*.tsx" || true
grep -rn "from('conversation_threads')" src --include="*.ts" --include="*.tsx" || true
echo "=== DONE ==="
