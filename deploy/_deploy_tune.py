import os
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)
sftp = c.open_sftp()
sftp.put(
    os.path.join(os.path.dirname(__file__), "tune-ollama.sh"),
    "/root/apps/matu-ai/deploy/tune-ollama.sh",
)
sftp.close()

def run(cmd, timeout=600):
    print("CMD:", cmd[:100])
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace").encode("ascii", "replace").decode()
    err = e.read().decode(errors="replace").encode("ascii", "replace").decode()
    code = o.channel.recv_exit_status()
    print(out or err or "(ok)")
    print("exit", code, "\n")

APP = "/root/apps/matu-ai"
run("chmod +x /root/apps/matu-ai/deploy/tune-ollama.sh")
run("bash /root/apps/matu-ai/deploy/tune-ollama.sh", timeout=120)
run(f"cd {APP} && export VITE_API_URL=https://chat.matubyte.com && npm run build --workspace=dashboard", timeout=300)
run(f"rsync -a --delete {APP}/dashboard/dist/ /var/www/matu-ai/chat/dist/")
run("chown -R www-data:www-data /var/www/matu-ai/chat")
c.close()
