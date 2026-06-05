#!/usr/bin/env python3
import os
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)
for cmd in [
    "ls -la ~/.ollama/ 2>&1",
    "ollama signin 2>&1 | head -3",
    "curl -s http://127.0.0.1:3001/health",
]:
    _, o, e = c.exec_command(cmd, timeout=30)
    print(cmd)
    print(o.read().decode("ascii", errors="replace"))
    print()
c.close()
