import os
import stat
import paramiko

HOST = "83.171.248.29"
USER = "root"
PASSWORD = os.environ["SSH_PASSWORD"]
APP = "/root/apps/matu-ai"

LOCAL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UPLOAD_PATHS = [
    "api/src/config.ts",
    "api/src/index.ts",
    "api/src/openai/routes/chat.ts",
    "api/src/openai/utils/streaming.ts",
    "api/src/openai/utils/thinking.ts",
    "dashboard/src/composables/useSpeechRecognition.ts",
    "dashboard/src/lib/chat.ts",
    "dashboard/src/views/ChatView.vue",
    "deploy/tune-ollama.sh",
    "deploy/publish-chat.sh",
    ".env.example",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
sftp = c.open_sftp()


def run(cmd, timeout=600):
    print(">>>", cmd[:140])
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out[-2500:])
    if err.strip() and code != 0:
        print("STDERR:", err[-1000:])
    print("exit", code, "\n")
    return code

print(">> Subiendo archivos...")
for rel in UPLOAD_PATHS:
    local = os.path.join(LOCAL_ROOT, rel.replace("/", os.sep))
    remote = f"{APP}/{rel}"
    remote_dir = os.path.dirname(remote)
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        parts = remote_dir.split("/")
        cur = ""
        for p in parts:
            if not p:
                continue
            cur += "/" + p
            try:
                sftp.stat(cur)
            except FileNotFoundError:
                sftp.mkdir(cur)
    sftp.put(local, remote)
    print("  ", rel)

sftp.close()

run(f"chmod +x {APP}/deploy/tune-ollama.sh")
run(f"grep -q '^DEFAULT_CHAT_MODEL=' {APP}/.env || echo 'DEFAULT_CHAT_MODEL=qwen3:4b' >> {APP}/.env")
run(f"sed -i 's/^DEFAULT_CHAT_MODEL=.*/DEFAULT_CHAT_MODEL=qwen3:4b/' {APP}/.env")
run(f"cd {APP} && npm run build --workspace=api")
run("pm2 restart matu-ai-api")
run(f"bash {APP}/deploy/tune-ollama.sh", timeout=900)
run(f"bash {APP}/deploy/publish-chat.sh", timeout=300)
run("curl -s http://127.0.0.1:3001/health")
c.close()
