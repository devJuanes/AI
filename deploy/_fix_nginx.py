import paramiko
import os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

def run(cmd):
    print(">>>", cmd)
    _, o, _ = c.exec_command(f"bash -lc {repr(cmd)}", timeout=60)
    out = o.read().decode(errors="replace").encode("ascii", "replace").decode()
    code = o.channel.recv_exit_status()
    print(out)
    print("exit", code, "\n")
    return code

APP = "/root/apps/matu-ai"
run(f"cp {APP}/deploy/nginx/chat.matubyte.com.conf /etc/nginx/sites-available/chat.matubyte.com.conf")
# fix duplicate upstream on server file manually
run("python3 -c \""
      "p=open('/etc/nginx/sites-available/chat.matubyte.com.conf').read();"
      "p=p.replace('proxy_pass http://matu_ai_api','proxy_pass http://127.0.0.1:3001');"
      "import re; p=re.sub(r'upstream matu_ai_api \\{[^}]+\\}\\n\\n','',p);"
      "open('/etc/nginx/sites-available/chat.matubyte.com.conf','w').write(p)\"")
run("nginx -t && systemctl reload nginx")
run("""curl -s -o /dev/null -w 'HTTP:%{http_code}\\n' -X POST 'https://chat.matubyte.com/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"demo@matubyte.com\",\"password\":\"wrong\"}'""")
c.close()
