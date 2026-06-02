#!/usr/bin/env python3
import os
import paramiko

HOST = "83.171.248.29"
APP = "/root/apps/matu-ai"
PWD = os.environ["SSH_PASSWORD"]

ENV_SCRIPT = r"""
from pathlib import Path
p = Path("/root/apps/matu-ai/.env")
p.rename("/root/apps/matu-ai/.env.bak-auto")
lines = Path("/root/apps/matu-ai/.env.bak-auto").read_text().splitlines()
vals = {}
for line in lines:
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        continue
    k, _, v = s.partition("=")
    vals[k] = v
fixes = {
    "CORS_ORIGIN": "https://chat.matubyte.com",
    "VITE_API_URL": "https://ai.matubyte.com",
    "DEFAULT_CHAT_MODEL": "qwen3.5:cloud",
    "OLLAMA_BASE_URL": "http://127.0.0.1:11434",
    "OLLAMA_TIMEOUT_MS": "300000",
    "API_PORT": "3001",
    "API_HOST": "0.0.0.0",
    "APP_TIMEZONE": "America/Bogota",
    "BILLING_MIN_RECHARGE_USD": "5",
    "BILLING_TOKENS_PER_USD": "200000",
    "BILLING_USD_COP_RATE": "4200",
    "BILLING_MOCK_CHECKOUT": "true",
}
vals.update(fixes)
order = [
    "MATUDB_URL", "MATUDB_PROJECT_ID", "MATUDB_API_KEY", "MATUDB_SERVICE_KEY",
    "JWT_SECRET", "OLLAMA_BASE_URL", "OLLAMA_TIMEOUT_MS", "DEFAULT_CHAT_MODEL",
    "APP_TIMEZONE", "API_PORT", "API_HOST", "CORS_ORIGIN", "VITE_API_URL",
    "BILLING_MIN_RECHARGE_USD", "BILLING_TOKENS_PER_USD", "BILLING_USD_COP_RATE",
    "BILLING_MOCK_CHECKOUT",
]
out = ["# Matu AI — producción"]
for k in order:
    if k in vals:
        out.append(f"{k}={vals[k]}")
p.write_text("\n".join(out) + "\n")
print("OK .env limpio")
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)

    sftp = c.open_sftp()
    with sftp.file(f"{APP}/deploy/_fix_env_remote.py", "w") as f:
        f.write(ENV_SCRIPT)
    sftp.close()

    for cmd in [
        f"python3 {APP}/deploy/_fix_env_remote.py",
        f"grep -E '^(DEFAULT_CHAT_MODEL|CORS_ORIGIN|VITE_API_URL|OLLAMA_)' {APP}/.env",
        "pm2 restart matu-ai-api --update-env",
        "sleep 2 && curl -s http://127.0.0.1:3001/health",
    ]:
        print("\n>>>", cmd, "\n")
        _, o, e = c.exec_command(f"bash -lc {repr(cmd)}", timeout=60)
        out = o.read().decode(errors="replace")
        err = e.read().decode(errors="replace")
        if out.strip():
            print(out.encode("ascii", errors="replace").decode())
        if err.strip():
            print("ERR:", err.encode("ascii", errors="replace").decode())

    c.close()


if __name__ == "__main__":
    main()
