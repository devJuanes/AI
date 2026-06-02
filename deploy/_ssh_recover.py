#!/usr/bin/env python3
"""Diagnose 503 + fix deploy conflict on VPS."""
import os
import paramiko

HOST = "83.171.248.29"
APP = "/root/apps/matu-ai"
PWD = os.environ.get("SSH_PASSWORD", "")


def run(c, cmd: str, timeout: int = 120) -> tuple[str, str, int]:
    print(f"\n>>> {cmd}\n")
    _, o, e = c.exec_command(f"bash -lc {repr(cmd)}", timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out.encode("ascii", errors="replace").decode())
    if err.strip():
        print("ERR:", err.encode("ascii", errors="replace").decode())
    print(f"[exit {code}]")
    return out, err, code


def main() -> int:
    if not PWD:
        print("Set SSH_PASSWORD")
        return 1

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)

    run(c, "systemctl is-active ollama; pm2 list")
    run(c, "pm2 logs matu-ai-api --lines 40 --nostream")
    run(c, f"grep DEFAULT_CHAT_MODEL {APP}/.env; curl -s http://127.0.0.1:3001/health")
    run(c, "curl -s http://127.0.0.1:11434/api/tags | head -c 400")

    # Test ollama chat with cloud model
    run(
        c,
        """curl -s -m 25 http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen3.5:cloud","messages":[{"role":"user","content":"hola"}],"stream":false}'""",
        35,
    )

    # Test local fallback
    run(
        c,
        """curl -s -m 25 http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama3.2:1b","messages":[{"role":"user","content":"hola"}],"stream":false}'""",
        35,
    )

    # Fix git + deploy: discard local fix-env-production.sh change, pull, deploy
    steps = [
        f"cd {APP} && git checkout -- deploy/fix-env-production.sh 2>/dev/null || rm -f deploy/fix-env-production.sh",
        f"cd {APP} && git pull",
        f"cd {APP} && bash deploy/fix-env-model.sh llama3.2:1b",
        f"cd {APP} && bash deploy/tune-ollama.sh",
        f"cd {APP} && npm run build --workspace=api",
        "pm2 restart matu-ai-api --update-env",
        f"cd {APP} && bash deploy/publish-chat.sh",
        "curl -s http://127.0.0.1:3001/health",
        """curl -s -m 20 http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama3.2:1b","messages":[{"role":"user","content":"hola"}],"stream":false}' | head -c 300""",
    ]
    for cmd in steps:
        run(c, cmd, 300)

    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
