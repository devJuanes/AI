import paramiko
import os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

def run(cmd, timeout=120):
    print(">>>", cmd[:150])
    _, o, e = c.exec_command(f"bash -lc {repr(cmd)}", timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out)
    if err.strip():
        print("STDERR:", err)
    print("exit", code, "\n")
    return out, code

APP = "/root/apps/matu-ai"
run(f"cd {APP} && git pull origin main")
run(f"cp {APP}/deploy/nginx/chat.matubyte.com.conf /etc/nginx/sites-available/chat.matubyte.com.conf")
run("nginx -t 2>&1 && systemctl reload nginx")
run("""curl -s -w '\\nHTTP:%{http_code}\\n' -X POST 'https://chat.matubyte.com/api/auth/login' -H 'Content-Type: application/json' -d '{"email":"demo@matubyte.com","password":"wrong"}'""")
run(f"grep -o 'VITE_API_URL[^,]*' {APP}/.env || true")
run("grep -o 'https://[^\"]*' /var/www/matu-ai/chat/dist/assets/*.js 2>/dev/null | head -5 || strings /var/www/matu-ai/chat/dist/assets/*.js | grep -E 'matubyte|localhost:3001' | head -5")
c.close()
