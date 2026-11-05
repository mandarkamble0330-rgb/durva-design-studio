#!/usr/bin/env bash
set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1
export SUPABASE_EXPERIMENTAL_STACK=1
export DEBIAN_FRONTEND=noninteractive

if ! command -v supabase >/dev/null 2>&1 || ! supabase --version | grep -qx '3.0.0'; then
  tmp="$(mktemp)"
  curl -fsSL -o "$tmp" "https://github.com/supabase/cli/releases/download/v3.0.0/supabase_linux_amd64.tar.gz"
  sudo tar -xzf "$tmp" -C /usr/local/bin
  sudo chmod 755 /usr/local/bin/supabase
  rm -f "$tmp"
fi

npm ci

if [[ ! -f supabase/config.toml ]]; then
  supabase init
fi

mkdir -p supabase/migrations
if [[ -d lib/supabase/migrations ]]; then
  cp -f lib/supabase/migrations/*.sql supabase/migrations/
fi

python3 - << 'PY'
from pathlib import Path
p = Path("supabase/config.toml")
text = p.read_text()
text = text.replace(
    'additional_redirect_urls = ["https://127.0.0.1:3000"]',
    'additional_redirect_urls = ["http://127.0.0.1:3000", "http://localhost:3000"]',
)
text = text.replace(
    "[db.seed]\n# If enabled, seeds the database after migrations during a db reset.\nenabled = true",
    "[db.seed]\n# If enabled, seeds the database after migrations during a db reset.\nenabled = false",
)
if "stack = true" not in text:
    text = text.replace("[experimental]\n", "[experimental]\nstack = true\n", 1)
p.write_text(text)
PY

supabase stack install --runtime native
