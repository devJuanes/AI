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
    print((out + err).encode("ascii", errors="replace").decode()[:6000])
    print(f"[exit {code}]\n")
    return out, code


def main():
    if not PWD:
        return 1
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)

    run(c, "ollama signin 2>&1 | head -5")
    run(c, "cat ~/.ollama/id_ed25519.pub 2>/dev/null || echo no_key")
    run(c, "grep -E 'OLLAMA|DEFAULT' /root/apps/matu-ai/.env | sed 's/=.*/=***/'")
    run(c, "systemctl show ollama -p Environment 2>/dev/null | tr ' ' '\\n' | grep OLLAMA")

    for model in ["qwen3.5:cloud", "llama3.2:1b"]:
        payload = json.dumps(
            {
                "model": model,
                "messages": [{"role": "user", "content": "di hola"}],
                "stream": False,
                "options": {"num_predict": 8},
            }
        )
        sftp = c.open_sftp()
        with sftp.file("/tmp/test-model.json", "w") as f:
            f.write(payload)
        sftp.close()
        run(c, f"curl -s -m 120 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d @/tmp/test-model.json | head -c 600")

    run(c, "pm2 logs matu-ai-api --lines 25 --nostream 2>&1 | grep -E '503|chat/completions|unauthorized' | tail -15")
    run(c, "free -h; nproc; ollama ps 2>/dev/null || true")
    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
