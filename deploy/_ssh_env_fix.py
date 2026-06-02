#!/usr/bin/env python3
import os, paramiko
HOST, APP = "83.171.248.29", "/root/apps/matu-ai"
PWD = os.environ["SSH_PASSWORD"]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username="root", password=PWD, timeout=30)
sftp = c.open_sftp()
sftp.put(os.path.join(os.path.dirname(__file__), "fix-env-production.sh"), f"{APP}/deploy/fix-env-production.sh")
sftp.close()

def run(cmd, t=120):
    print("\n>>>", cmd, "\n")
    _, o, e = c.exec_command("bash -lc " + repr(cmd), timeout=t)
    out, err = o.read().decode(errors="replace"), e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out.encode("ascii", errors="replace").decode())
    if err.strip():
        print("ERR:", err.encode("ascii", errors="replace").decode())
    print("[exit", code, "]")

run(f"chmod +x {APP}/deploy/fix-env-production.sh && cd {APP} && bash deploy/fix-env-production.sh")
run(f"cd {APP} && git add deploy/fix-env-production.sh 2>/dev/null; true")
run("pm2 restart matu-ai-api --update-env")
run("curl -s http://127.0.0.1:3001/health")
run(f"cd {APP} && ollama run qwen3.5:cloud 'Di hola en 3 palabras' 2>&1 | head -20")
c.close()
