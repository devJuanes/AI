#!/usr/bin/env python3
import os
import paramiko

HOST = "83.171.248.29"
APP = "/root/apps/matu-ai"
PWD = os.environ.get("SSH_PASSWORD", "")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(c, cmd, timeout=60):
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    print((out + err).encode("ascii", errors="replace").decode()[:2000])
    return code


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)
    sftp = c.open_sftp()
    for rel in [
        "dashboard/src/lib/chat.ts",
        "dashboard/src/views/ChatView.vue",
        "deploy/deploy.sh",
    ]:
        sftp.put(os.path.join(ROOT, rel.replace("/", os.sep)), f"{APP}/{rel}")
        print(f"synced {rel}")
    sftp.close()
    run(c, f"grep -A2 'filterChatModels' {APP}/dashboard/src/lib/chat.ts | head -5")
    run(c, "grep DEFAULT_CHAT_MODEL /root/apps/matu-ai/.env | tail -1")
    c.close()


if __name__ == "__main__":
    raise SystemExit(main() if PWD else 1)
