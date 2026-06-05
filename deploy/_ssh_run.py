#!/usr/bin/env python3
import os
import sys
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)
for cmd in sys.argv[1:]:
    _, o, e = c.exec_command(cmd, timeout=600)
    sys.stdout.buffer.write(o.read())
    sys.stdout.buffer.write(e.read())
    sys.stdout.buffer.write(f"\n--- exit {o.channel.recv_exit_status()} ---\n".encode())
c.close()
