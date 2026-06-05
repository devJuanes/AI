#!/usr/bin/env python3
import os
import paramiko

HOST = "83.171.248.29"
APP = "/root/apps/matu-ai"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PWD = os.environ.get("SSH_PASSWORD", "")

FILES = [
    "dashboard/src/lib/chat.ts",
    "dashboard/src/lib/model-display.ts",
    "dashboard/src/views/ChatView.vue",
]


def run(c, cmd, timeout=600):
    print(f">>> {cmd}\n")
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    print((out + err).encode("ascii", errors="replace").decode()[:4000])
    print(f"[exit {code}]\n")
    return code


def main():
    if not PWD:
        return 1
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)
    sftp = c.open_sftp()
    for rel in FILES:
        sftp.put(os.path.join(ROOT, rel.replace("/", os.sep)), f"{APP}/{rel}")
        print(f"uploaded {rel}")
    sftp.close()
    run(
        c,
        f"cd {APP} && export PATH=$PATH:{APP}/node_modules/.bin && "
        f"(cd dashboard && vite build) && bash deploy/publish-chat.sh",
    )
    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
