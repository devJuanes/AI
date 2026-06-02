#!/usr/bin/env python3
"""Fix CRLF in deploy scripts on VPS."""
import os
import paramiko

HOST = "83.171.248.29"
APP = "/root/apps/matu-ai"
PWD = os.environ.get("SSH_PASSWORD", "")


def run(c, cmd, timeout=120):
    print(f">>> {cmd}")
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    print((out + err).encode("ascii", errors="replace").decode()[:1500])
    print(f"[exit {code}]\n")
    return code


def main():
    if not PWD:
        print("Set SSH_PASSWORD")
        return 1
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)
    run(
        c,
        f"find {APP} -maxdepth 2 -name '*.sh' -exec sed -i 's/\\r$//' {{}} +",
    )
    run(c, f"bash {APP}/deploy.sh --help")
    c.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
