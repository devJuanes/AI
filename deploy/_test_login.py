import paramiko
import os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

def run(cmd, timeout=60):
    print(">>>", cmd)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out)
    if err.strip():
        print("STDERR:", err)
    print("exit", code, "\n")
    return out, code

run('curl -s -w "\\nHTTP:%{http_code}\\n" -X POST https://chat.matubyte.com/api/auth/login -H "Content-Type: application/json" -d \'{"email":"demo@matubyte.com","password":"wrong"}\'')
run("grep VITE_API_URL /root/apps/matu-ai/.env")
run("curl -s https://chat.matubyte.com/health")
c.close()
