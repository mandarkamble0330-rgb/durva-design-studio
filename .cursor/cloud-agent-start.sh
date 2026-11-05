#!/usr/bin/env bash
set -euo pipefail

export SUPABASE_TELEMETRY_DISABLED=1
export SUPABASE_EXPERIMENTAL_STACK=1

supabase start --runtime native --eager -x realtime,functions,studio,mail,analytics,pooler

python3 - << 'PY'
import json
import subprocess
import time
import urllib.request

raw = subprocess.check_output(["supabase", "status", "--output-format", "json"], text=True)
env = json.loads(raw)["env"]
url = env["API_URL"]
anon = env["ANON_KEY"]
with open(".env.local", "w", encoding="utf-8") as fh:
    fh.write(
        f"NEXT_PUBLIC_SUPABASE_URL={url}\n"
        f"NEXT_PUBLIC_SUPABASE_ANON_KEY={anon}\n"
        f"NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000\n"
    )

deadline = time.time() + 60
while True:
    try:
        req = urllib.request.Request(url + "/auth/v1/health", headers={"apikey": anon})
        with urllib.request.urlopen(req, timeout=5) as res:
            if res.status == 200:
                break
    except Exception:
        if time.time() > deadline:
            raise SystemExit("Supabase auth did not become ready")
        time.sleep(1)
PY

exec npm run dev -- --hostname 0.0.0.0 --port 3000
