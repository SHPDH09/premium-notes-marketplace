#!/usr/bin/env bash
# Sync environment variables from a local file to Vercel (never commit the env file).
# Usage:
#   export VERCEL_TOKEN=...
#   cp .env.example .env.vercel.local   # fill real values
#   ./scripts/sync-vercel-env.sh [production|preview|development|all]

set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.vercel.local}"
TARGET="${1:-production}"

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "ERROR: Set VERCEL_TOKEN first."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: Create $ENV_FILE with your secrets (do not commit)."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .vercel ]]; then
  echo "Linking Vercel project (run once)..."
  npx vercel@latest link --yes --token "$VERCEL_TOKEN"
fi

add_env() {
  local key="$1"
  local value="$2"
  local env_name="$3"
  if [[ -z "$value" ]]; then
    echo "Skip empty: $key"
    return
  fi
  printf '%s' "$value" | npx vercel@latest env add "$key" "$env_name" --force --token "$VERCEL_TOKEN"
  echo "Set $key ($env_name)"
}

# shellcheck disable=SC1090
source "$ENV_FILE"

KEYS=(
  DATABASE_URL
  AUTH_SECRET
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_BRAND_NAME
  NEXT_PUBLIC_BRAND_LOGO_TEXT
  NEXT_PUBLIC_SUPPORT_EMAIL
  ADMIN_EMAIL
  ADMIN_PASSWORD
  ADMIN_NAME
  STORAGE_URL
  STORAGE_KEY
  STORAGE_SECRET
  STORAGE_BUCKET
  STORAGE_REGION
  STORAGE_PUBLIC_URL
  PAYMENT_API_KEY
  PAYMENT_SECRET
  CASHFREE_ENV
  NEXT_PUBLIC_CASHFREE_ENV
  ALLOW_DEV_PAYMENT
)

apply_target() {
  local t="$1"
  for key in "${KEYS[@]}"; do
    val="${!key-}"
    add_env "$key" "$val" "$t"
  done
}

case "$TARGET" in
  production) apply_target production ;;
  preview) apply_target preview ;;
  development) apply_target development ;;
  all)
    apply_target production
    apply_target preview
    apply_target development
    ;;
  *)
    echo "Unknown target: $TARGET"
    exit 1
    ;;
esac

echo "Done. Redeploy on Vercel for changes to apply."
