import paramiko
import os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

cmds = [
    "grep VITE_API_URL /root/apps/matu-ai/.env; grep CORS_ORIGIN /root/apps/matu-ai/.env",
    "head -c 400 /var/www/matu-ai/chat/dist/assets/api-*.js",
    "dig +short api.matubyte.com A",
    "curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3001/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"x\",\"password\":\"x\"}'",
    "curl -s -o /dev/null -w '%{http_code}' -X POST https://chat.matubyte.com/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"x\",\"password\":\"x\"}'",
]
for cmd in cmds:
    print("===", cmd)
    _, o, _ = c.exec_command(f"bash -lc {repr(cmd)}", timeout=30)
    print(o.read().decode(errors="replace"))
c.close()
