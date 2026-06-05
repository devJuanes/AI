#!/usr/bin/env python3
import os
import paramiko

APP = "/root/apps/matu-ai"
PWD = os.environ.get("SSH_PASSWORD", "")


def run(c, cmd, timeout=600):
    print(f">>> {cmd}\n")
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = (o.read() + e.read()).decode("ascii", errors="replace")
    print(out[:5000])
    print(f"[exit {o.channel.recv_exit_status()}]\n")


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect("83.171.248.29", username="root", password=PWD, timeout=30)
    run(c, f"cd {APP} && git pull origin main")
    run(c, "ollama pull gpt-oss:20b-cloud")
    run(c, f"bash {APP}/deploy/check-cloud-signin.sh")
    run(c, f"cd {APP} && bash deploy.sh --no-pull", timeout=600)
    run(c, "curl -s http://127.0.0.1:3001/health")
    c.close()


if __name__ == "__main__":
    raise SystemExit(main() if PWD else 1)
