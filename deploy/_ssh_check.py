#!/usr/bin/env python3
import os
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)
for cmd in [
    "curl -s http://127.0.0.1:3001/health",
    "ollama ps",
    "pm2 describe matu-ai-api | grep -E 'status|uptime'",
]:
    _, o, e = c.exec_command(cmd, timeout=60)
    print(cmd, ":", o.read().decode("ascii", errors="replace"))
c.close()
