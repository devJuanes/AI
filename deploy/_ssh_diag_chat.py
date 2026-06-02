#!/usr/bin/env python3
import json
import os
import paramiko

HOST = "83.171.248.29"
APP = "/root/apps/matu-ai"
PWD = os.environ.get("SSH_PASSWORD", "")


def run(c, cmd, timeout=120):
    print(f">>> {cmd}\n")
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    print((out + err).encode("ascii", errors="replace").decode()[:5000])
    print(f"[exit {code}]\n")
    return out, code


def main():
    if not PWD:
        return 1
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)

    run(c, f"grep -E 'DEFAULT_CHAT_MODEL|JWT_SECRET|MATUDB|OLLAMA' {APP}/.env | sed 's/=.*/=***/'")
    run(c, "curl -s http://127.0.0.1:3001/health")
    run(c, "curl -s http://127.0.0.1:11434/api/tags | head -c 800")
    run(c, "pm2 logs matu-ai-api --lines 40 --nostream 2>&1 | tail -50")

    payload = json.dumps(
        {
            "model": "llama3.2:1b",
            "messages": [{"role": "user", "content": "hi"}],
            "stream": False,
        }
    )
    sftp = c.open_sftp()
    with sftp.file("/tmp/chat-test.json", "w") as f:
        f.write(payload)
    sftp.close()

    run(c, "curl -s -m 90 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d @/tmp/chat-test.json | head -c 400")
    run(
        c,
        "curl -s -m 90 -X POST http://127.0.0.1:3001/v1/chat/completions "
        "-H 'Content-Type: application/json' "
        "-H 'Authorization: Bearer invalid' "
        "-d @/tmp/chat-test.json | head -c 500",
    )
    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
