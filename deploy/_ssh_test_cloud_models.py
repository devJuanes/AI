#!/usr/bin/env python3
import json
import os
import paramiko

HOST = "83.171.248.29"
PWD = os.environ.get("SSH_PASSWORD", "")

MODELS = [
    "gpt-oss:20b-cloud",
    "nemotron-3-nano:30b-cloud",
    "gemma4:31b-cloud",
    "qwen3.5:cloud",
    "llama3.2:1b",
]


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)
    sftp = c.open_sftp()
    for m in MODELS:
        payload = json.dumps(
            {
                "model": m,
                "messages": [{"role": "user", "content": "di ok"}],
                "stream": False,
                "options": {"num_predict": 4},
            }
        )
        with sftp.file("/tmp/cloud-test.json", "w") as f:
            f.write(payload)
        _, o, e = c.exec_command(
            "curl -s -m 90 http://127.0.0.1:11434/api/chat "
            "-H 'Content-Type: application/json' -d @/tmp/cloud-test.json",
            timeout=100,
        )
        out = (o.read() + e.read()).decode("ascii", errors="replace")[:280]
        print(f"{m}: {out}\n")
    sftp.close()
    c.close()


if __name__ == "__main__":
    raise SystemExit(main() if PWD else 1)
