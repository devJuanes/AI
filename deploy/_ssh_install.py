#!/usr/bin/env python3
import os
import sys
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)
cmds = [
    "cd /root/apps/matu-ai && git pull origin main",
    "cd /root/apps/matu-ai && bash deploy/install-local-models.sh",
    "cd /root/apps/matu-ai && bash deploy.sh --no-pull",
    "curl -s http://127.0.0.1:3001/health",
    "curl -s http://127.0.0.1:3001/v1/models -H 'Authorization: Bearer x' 2>/dev/null | head -c 800 || true",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd, timeout=900)
    sys.stdout.buffer.write(f"\n>>> {cmd}\n".encode())
    sys.stdout.buffer.write(o.read())
    sys.stdout.buffer.write(e.read())
c.close()
