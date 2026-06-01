import paramiko
import os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)
_, o, _ = c.exec_command("cat /etc/nginx/sites-enabled/chat.matubyte.com.conf", timeout=30)
print(o.read().decode(errors="replace"))
c.close()
