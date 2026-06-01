import paramiko
import os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

def run(cmd, timeout=180):
    print(">>>", cmd[:120])
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out[-2000:] if len(out) > 2000 else out)
    if err.strip():
        print("STDERR:", err[-1000:])
    print("exit", code, "\n")
    return out, code

run("grep -o 'VITE_API_URL[^\"]*' /var/www/matu-ai/chat/dist/assets/*.js | head -3 || grep -E 'chat\\.matubyte|api\\.matubyte|localhost:3001' /var/www/matu-ai/chat/dist/assets/*.js | head -3")
run("ls -la /var/www/matu-ai/chat/dist/favicon* 2>/dev/null; head -20 /var/www/matu-ai/chat/dist/index.html")
c.close()
