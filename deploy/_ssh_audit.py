#!/usr/bin/env python3
import os
import sys
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)
cmds = [
    "nproc; free -h; df -h /; lscpu | grep -E 'Model name|CPU\\(s\\)|Thread'",
    "ollama list",
    "ollama ps",
    "cat /etc/systemd/system/ollama.service.d/limits.conf 2>/dev/null || echo no limits",
    "curl -s http://127.0.0.1:11434/api/tags | python3 -c \"import sys,json; d=json.load(sys.stdin); print(len(d.get('models',[])),'models')\"",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd, timeout=120)
    sys.stdout.buffer.write(f"\n>>> {cmd}\n".encode())
    sys.stdout.buffer.write(o.read())
    sys.stdout.buffer.write(e.read())
c.close()
