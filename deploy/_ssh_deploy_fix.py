#!/usr/bin/env python3
"""Deploy filterChatModels fix + recover from 503 on VPS."""
import os
import paramiko

HOST = "83.171.248.29"
APP = "/root/apps/matu-ai"
PWD = os.environ.get("SSH_PASSWORD", "")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(c, cmd, timeout=300):
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
    return code


def main():
    if not PWD:
        print("Set SSH_PASSWORD")
        return 1

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)

    sftp = c.open_sftp()
    files = [
        ("dashboard/src/lib/chat.ts", f"{APP}/dashboard/src/lib/chat.ts"),
        ("dashboard/src/views/ChatView.vue", f"{APP}/dashboard/src/views/ChatView.vue"),
        ("deploy/deploy.sh", f"{APP}/deploy/deploy.sh"),
    ]
    for local, remote in files:
        sftp.put(os.path.join(ROOT, local.replace("/", os.sep)), remote)
        print(f"uploaded {local}")
    sftp.close()

    steps = [
        f"cd {APP} && rm -f deploy/fix-env-production.sh deploy/_fix_env_remote.py",
        f"cd {APP} && git checkout -- deploy/fix-env-production.sh 2>/dev/null; git pull || true",
        f"cd {APP} && bash deploy/fix-env-model.sh llama3.2:1b",
        f"cd {APP} && npm run build --workspace=dashboard",
        "pm2 restart matu-ai-api --update-env",
        f"cd {APP} && bash deploy/publish-chat.sh",
        "curl -s http://127.0.0.1:3001/health",
        f"cd {APP} && printf '%s' '{{\"model\":\"llama3.2:1b\",\"messages\":[{{\"role\":\"user\",\"content\":\"hola\"}}],\"stream\":false}}' > /tmp/ollama-test.json",
        "curl -s -m 30 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d @/tmp/ollama-test.json | head -c 400",
    ]
    for cmd in steps:
        run(c, cmd)

    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
