#!/usr/bin/env python3
import os
import paramiko

HOST = "83.171.248.29"
APP = "/root/apps/matu-ai"
PWD = os.environ.get("SSH_PASSWORD", "")


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
    run(c, f"cd {APP} && git reset --hard HEAD && git pull origin main")
    run(c, f"cd {APP} && bash deploy.sh --no-pull", timeout=600)
    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
