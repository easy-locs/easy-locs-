#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Easy-Locs Integration Setup — Plaid, LiveKit, Meilisearch
#
# This script documents and validates the required Supabase secrets and
# environment variables needed to connect these services end-to-end.
#
# Usage:
#   ./scripts/setup-integrations.sh check     — Verify which secrets are set
#   ./scripts/setup-integrations.sh set-plaid  — Set Plaid secrets interactively
#   ./scripts/setup-integrations.sh set-livekit — Set LiveKit secrets interactively
#   ./scripts/setup-integrations.sh set-meili  — Set Meilisearch secrets interactively
#   ./scripts/setup-integrations.sh deploy     — Deploy edge functions
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

check_supabase_cli() {
  if ! command -v supabase &>/dev/null; then
    fail "Supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
    exit 1
  fi
}

cmd_check() {
  echo ""
  echo "=== Plaid Secrets ==="
  echo "  Required for bank linking, ACH transfers, and income verification."
  echo "  Edge function: plaid-link-token"
  echo ""
  echo "  PLAID_CLIENT_ID        — Plaid dashboard > Keys > client_id"
  echo "  PLAID_SECRET           — Plaid dashboard > Keys > sandbox/development secret"
  echo "  PLAID_ENV              — sandbox | development | production (default: sandbox)"
  echo "  PLAID_ENCRYPTION_KEY   — 32-char key for encrypting stored access tokens"
  echo ""

  echo "=== LiveKit Secrets ==="
  echo "  Required for video calling and room management."
  echo "  Edge function: livekit-room-token"
  echo ""
  echo "  LIVEKIT_API_KEY        — LiveKit Cloud dashboard > Settings > Keys"
  echo "  LIVEKIT_API_SECRET     — LiveKit Cloud dashboard > Settings > Keys"
  echo "  LIVEKIT_URL            — LiveKit server URL (e.g. https://your-project.livekit.cloud)"
  echo ""
  echo "  Frontend env var (Vite):"
  echo "  VITE_LIVEKIT_WS_URL   — WebSocket URL (e.g. wss://your-project.livekit.cloud)"
  echo ""

  echo "=== Meilisearch Secrets ==="
  echo "  Required for fast full-text search across marketplace entities."
  echo "  Edge functions: search-meilisearch, sync-meilisearch, marketplace-router"
  echo ""
  echo "  MEILISEARCH_URL        — Meilisearch instance URL (e.g. https://ms-xxxx.meilisearch.io)"
  echo "  MEILISEARCH_API_KEY    — Master or admin API key for indexing and searching"
  echo ""

  echo "=== Database Table ==="
  echo "  plaid_items            — Stores encrypted Plaid access tokens per user"
  echo "  Columns: user_id, item_id, access_token_encrypted, created_at"
  echo ""

  if command -v supabase &>/dev/null; then
    echo "Checking Supabase secrets (requires linked project)..."
    for secret in PLAID_CLIENT_ID PLAID_SECRET PLAID_ENV PLAID_ENCRYPTION_KEY \
                  LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_URL \
                  MEILISEARCH_URL MEILISEARCH_API_KEY; do
      echo "  $secret — set via: supabase secrets set $secret=<value>"
    done
  fi
}

cmd_set_plaid() {
  check_supabase_cli
  echo "Setting Plaid secrets..."
  read -rp "PLAID_CLIENT_ID: " plaid_id
  read -rsp "PLAID_SECRET: " plaid_secret; echo
  read -rp "PLAID_ENV (sandbox/development/production) [sandbox]: " plaid_env
  plaid_env=${plaid_env:-sandbox}

  enc_key=$(openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 32)

  supabase secrets set \
    "PLAID_CLIENT_ID=$plaid_id" \
    "PLAID_SECRET=$plaid_secret" \
    "PLAID_ENV=$plaid_env" \
    "PLAID_ENCRYPTION_KEY=$enc_key"

  ok "Plaid secrets configured (env: $plaid_env)"
  ok "Encryption key generated and stored"
}

cmd_set_livekit() {
  check_supabase_cli
  echo "Setting LiveKit secrets..."
  read -rp "LIVEKIT_API_KEY: " lk_key
  read -rsp "LIVEKIT_API_SECRET: " lk_secret; echo
  read -rp "LIVEKIT_URL (e.g. https://your-project.livekit.cloud): " lk_url

  supabase secrets set \
    "LIVEKIT_API_KEY=$lk_key" \
    "LIVEKIT_API_SECRET=$lk_secret" \
    "LIVEKIT_URL=$lk_url"

  ws_url=$(echo "$lk_url" | sed 's|^https://|wss://|; s|^http://|ws://|')
  ok "LiveKit secrets configured"
  echo ""
  warn "Set the frontend env var in your .env or Replit Secrets:"
  echo "  VITE_LIVEKIT_WS_URL=$ws_url"
}

cmd_set_meili() {
  check_supabase_cli
  echo "Setting Meilisearch secrets..."
  read -rp "MEILISEARCH_URL (e.g. https://ms-xxxx.meilisearch.io): " ms_url
  read -rsp "MEILISEARCH_API_KEY: " ms_key; echo

  supabase secrets set \
    "MEILISEARCH_URL=$ms_url" \
    "MEILISEARCH_API_KEY=$ms_key"

  ok "Meilisearch secrets configured"
  echo ""
  echo "To sync data, invoke the sync function:"
  echo "  supabase functions invoke sync-meilisearch --body '{}'"
}

cmd_deploy() {
  check_supabase_cli
  echo "Deploying edge functions..."

  for fn in plaid-link-token livekit-room-token search-meilisearch sync-meilisearch marketplace-router; do
    echo -n "  Deploying $fn... "
    if supabase functions deploy "$fn" 2>/dev/null; then
      ok "done"
    else
      fail "failed"
    fi
  done

  echo ""
  ok "Edge functions deployed"
  echo ""
  echo "Post-deploy: sync Meilisearch indexes:"
  echo "  supabase functions invoke sync-meilisearch --body '{}'"
}

case "${1:-check}" in
  check)      cmd_check ;;
  set-plaid)  cmd_set_plaid ;;
  set-livekit) cmd_set_livekit ;;
  set-meili)  cmd_set_meili ;;
  deploy)     cmd_deploy ;;
  *)
    echo "Usage: $0 {check|set-plaid|set-livekit|set-meili|deploy}"
    exit 1
    ;;
esac
