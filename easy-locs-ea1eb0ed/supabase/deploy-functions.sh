#!/usr/bin/env bash
set -euo pipefail

DEPLOYED_FUNCTIONS=(
  admin-router
  ai-router
  ai-proxy
  booking-router
  commerce-router
  food-router
  gdpr-router
  identity-router
  infra-router
  logistics-router
  marketplace-router
  media-router
  notification-router
  orbit-router
  public-api
  rent-router
  search-router
  stripe-router
  system-router
  voice-router
  wallet-router
  webauthn-router

  stripe-webhook
  ses-webhook
  plaid-webhook
  crypto-webhook
  mobile-money-webhook
  esign-webhook
  dispatch-webhook
  command-approval-webhook
  command-email-intake
  command-github-webhook
  inngest-handler

  autonomous-cron-dispatcher
  prayer-push-cron
)

echo "Deploying ${#DEPLOYED_FUNCTIONS[@]} edge functions (routers + webhooks + crons)..."

for fn in "${DEPLOYED_FUNCTIONS[@]}"; do
  echo "  -> $fn"
  supabase functions deploy "$fn" --no-verify-jwt 2>&1 || {
    echo "  !! Failed to deploy $fn"
    exit 1
  }
done

echo ""
echo "Deployed ${#DEPLOYED_FUNCTIONS[@]} functions successfully."
echo "All other functions are internal-only (accessed via router proxy)."
