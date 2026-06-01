import paramiko
import os

APP = "/root/apps/matu-ai"

def run(c, cmd, t=300):
    print(">>>", cmd[:100])
    _, o, _ = c.exec_command(f"bash -lc {repr(cmd)}", get_pty=True, timeout=t)
    out = o.read().decode(errors="replace").encode("ascii", "replace").decode()
    code = o.channel.recv_exit_status()
    print(out[-3000:] if len(out) > 3000 else out)
    print("[exit", code, "]\n")
    return code

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

run(c, f"cd {APP} && git pull")

run(c, f"sed -i 's|^VITE_API_URL=.*|VITE_API_URL=https://chat.matubyte.com|' {APP}/.env")

run(c, f"cd {APP} && bash deploy/publish-chat.sh")

run(c, f"cp {APP}/deploy/nginx/chat.matubyte.com.conf /etc/nginx/sites-available/chat.matubyte.com.conf")
run(c, "ln -sf /etc/nginx/sites-available/chat.matubyte.com.conf /etc/nginx/sites-enabled/")
run(c, "nginx -t && systemctl reload nginx")

run(c, "grep -o 'chat.matubyte.com' /var/www/matu-ai/chat/dist/assets/api-*.js | head -3")
run(c, """curl -s -o /dev/null -w '%{http_code}' -X POST https://chat.matubyte.com/api/auth/login -H 'Content-Type: application/json' -d '{"email":"demo@matubyte.com","password":"wrong"}'""")
print(" (401=OK proxy works, 405=broken)")

c.close()
