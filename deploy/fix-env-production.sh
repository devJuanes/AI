#!/usr/bin/env bash
# Limpia .env de claves duplicadas y fija valores de producción
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
cp .env ".env.bak.$(date +%s)"

python3 <<'PY'
from pathlib import Path
p = Path(".env")
lines = p.read_text().splitlines()
# last value wins for duplicates
vals: dict[str, str] = {}
comments_and_other: list[str] = []
for line in lines:
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        comments_and_other.append(line)
        continue
    k, _, v = s.partition("=")
    vals[k] = v

fixes = {
    "CORS_ORIGIN": "https://chat.matubyte.com",
    "VITE_API_URL": "https://ai.matubyte.com",
    "PAYMATUBYTE_URL": "https://pay.matubyte.com",
    "PAYMATUBYTE_APP_ID": "matu-ai",
    "BILLING_MOCK_CHECKOUT": "false",
    "DEFAULT_CHAT_MODEL": vals.get("DEFAULT_CHAT_MODEL", "qwen3.5:cloud"),
    "OLLAMA_BASE_URL": "http://127.0.0.1:11434",
    "OLLAMA_TIMEOUT_MS": "300000",
    "API_PORT": "3001",
    "API_HOST": "0.0.0.0",
    "APP_TIMEZONE": "America/Bogota",
}
vals.update(fixes)

order = [
    "# Matu AI — producción",
    "MATUDB_URL", "MATUDB_PROJECT_ID", "MATUDB_API_KEY", "MATUDB_SERVICE_KEY",
    "JWT_SECRET",
    "OLLAMA_BASE_URL", "OLLAMA_TIMEOUT_MS", "DEFAULT_CHAT_MODEL", "APP_TIMEZONE",
    "API_PORT", "API_HOST", "CORS_ORIGIN", "VITE_API_URL",
    "BILLING_MIN_RECHARGE_USD", "BILLING_TOKENS_PER_USD", "BILLING_USD_COP_RATE", "BILLING_MOCK_CHECKOUT",
    "PAYMATUBYTE_URL", "PAYMATUBYTE_API_KEY", "PAYMATUBYTE_APP_ID",
]
out = ["# Matu AI — producción (generado por fix-env-production.sh)"]
for k in order:
    if k.startswith("#"):
        out.append(k)
        continue
    if k in vals:
        out.append(f"{k}={vals[k]}")
for k, v in vals.items():
    if k not in order and k not in ("MATUDB_API_KEY",):
        out.append(f"{k}={v}")
p.write_text("\n".join(out) + "\n")
print("OK .env limpio")
PY

grep -E '^(DEFAULT_CHAT_MODEL|CORS_ORIGIN|VITE_API_URL|OLLAMA_)' .env
