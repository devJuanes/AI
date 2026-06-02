#!/usr/bin/env python3
import json
import os
import paramiko

HOST = "83.171.248.29"
PWD = os.environ.get("SSH_PASSWORD", "")


def run(c, cmd, timeout=120):
    print(f"\n>>> {cmd}\n")
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    text = (out + err).encode("ascii", errors="replace").decode()
    print(text[:3000])
    print(f"[exit {code}]")
    return out, code


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)

    payload = json.dumps(
        {
            "model": "llama3.2:1b",
            "messages": [{"role": "user", "content": "di hola"}],
            "stream": False,
        }
    )
    sftp = c.open_sftp()
    with sftp.file("/tmp/ollama-test.json", "w") as f:
        f.write(payload)
    sftp.close()

    run(c, "curl -s -m 90 http://127.0.0.1:11434/api/chat -H 'Content-Type: application/json' -d @/tmp/ollama-test.json | head -c 600")
    run(c, "curl -s https://ai.matubyte.com/health")
    run(c, "curl -sI https://chat.matubyte.com/ | head -5")

    c.close()


if __name__ == "__main__":
    raise SystemExit(main() if PWD else 1)
