#!/usr/bin/env python3
import os
import re
import paramiko

HOST = "83.171.248.29"
PWD = os.environ.get("SSH_PASSWORD", "")


def main():
    if not PWD:
        print("Set SSH_PASSWORD")
        return 1
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PWD, timeout=30)
    _, o, e = c.exec_command("ollama signin 2>&1", timeout=30)
    text = (o.read() + e.read()).decode(errors="replace")
    c.close()
    m = re.search(r"https://ollama\.com/connect\?[^\s]+", text)
    if m:
        print(m.group(0))
    else:
        print(text.encode("ascii", errors="replace").decode())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
