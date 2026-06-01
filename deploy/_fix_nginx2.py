import paramiko
import os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

def run(cmd, timeout=60):
    print(">>>", cmd[:120])
    _, o, e = c.exec_command(f"bash -lc {repr(cmd)}", timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    code = o.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print("STDERR:", err)
    print("exit", code, "\n")
    return out, code

run("cat /etc/nginx/sites-available/chat.matubyte.com.conf")
run("nginx -t 2>&1")
run("grep -r matu_ai_api /etc/nginx/sites-enabled/ /etc/nginx/sites-available/ 2>/dev/null || true")
c.close()
