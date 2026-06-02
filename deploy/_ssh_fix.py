#!/usr/bin/env python3
"""Fix Matu AI production via SSH — one-shot."""
import os
import sys
import paramiko

HOST = "83.171.248.29"
USER = "root"
PASSWORD = os.environ.get("SSH_PASSWORD", "")
APP = "/root/apps/matu-ai"


def run(client, cmd: str, timeout: int = 300) -> int:
    print(f"\n>>> {cmd}\n")
    _, stdout, stderr = client.exec_command(f"bash -lc {repr(cmd)}", timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.encode("ascii", errors="replace").decode())
    if err.strip():
        print("ERR:", err.encode("ascii", errors="replace").decode())
    print(f"[exit {code}]")
    return code


def main() -> int:
    if not PASSWORD:
        print("Set SSH_PASSWORD")
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    steps = [
        "hostname; nproc; free -h | head -2",
        f"cd {APP} && git pull",
        f"cd {APP} && cat .env",
        # dedupe DEFAULT_CHAT_MODEL + ensure key vars from example
        f"""cd {APP} && python3 <<'PY'
from pathlib import Path
p = Path('.env')
lines = p.read_text().splitlines() if p.exists() else []
vals = {{}}
order = []
for line in lines:
    s = line.strip()
    if not s or s.startswith('#'):
        order.append(line)
        continue
    if '=' not in s:
        order.append(line)
        continue
    k, _, v = s.partition('=')
    if k in vals:
        continue  # skip duplicate keys, keep first
    vals[k] = v
    order.append(line)
# required defaults if missing
defaults = {{
    'API_PORT': '3001',
    'API_HOST': '0.0.0.0',
    'CORS_ORIGIN': 'https://chat.matubyte.com',
    'VITE_API_URL': 'https://ai.matubyte.com',
    'OLLAMA_BASE_URL': 'http://127.0.0.1:11434',
    'OLLAMA_TIMEOUT_MS': '300000',
    'DEFAULT_CHAT_MODEL': 'qwen3.5:cloud',
    'APP_TIMEZONE': 'America/Bogota',
    'BILLING_MIN_RECHARGE_USD': '5',
    'BILLING_TOKENS_PER_USD': '200000',
    'BILLING_USD_COP_RATE': '4200',
    'BILLING_MOCK_CHECKOUT': 'true',
}}
# rebuild: unique keys only, first wins, then append missing
seen = set()
out = []
for line in order:
    s = line.strip()
    if not s or s.startswith('#') or '=' not in s:
        out.append(line)
        continue
    k = s.split('=', 1)[0]
    if k in seen:
        continue
    seen.add(k)
    out.append(line)
for k, v in defaults.items():
    if k not in seen:
        out.append(f'{{k}}={{v}}')
        seen.add(k)
p.write_text('\\n'.join(out).rstrip() + '\\n')
print('OK .env deduped')
PY""",
        f"cd {APP} && grep -E '^(DEFAULT_CHAT_MODEL|CORS_ORIGIN|VITE_API_URL|JWT_SECRET|MATUDB_URL|OLLAMA_)' .env",
        "ollama signin 2>&1 | head -5 || true",
        f"cd {APP} && bash deploy/setup-cloud-models.sh",
        f"cd {APP} && npm run build --workspace=api",
        f"cd {APP} && npm run build --workspace=dashboard",
        "pm2 restart matu-ai-api --update-env",
        f"cd {APP} && bash deploy/publish-chat.sh",
        "sleep 2 && curl -s http://127.0.0.1:3001/health",
        f"cd {APP} && bash deploy/diagnose-server.sh",
        "pm2 list",
    ]

    for cmd in steps:
        code = run(client, cmd, timeout=600)
        if code != 0 and "setup-cloud-models" not in cmd and "ollama signin" not in cmd:
            print("STOPPED on failure")
            break

    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
