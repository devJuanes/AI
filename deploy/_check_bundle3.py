import paramiko
import os

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

_, o, _ = c.exec_command("grep -o 'matubyte[^\"]*' /var/www/matu-ai/chat/dist/assets/index-rvmyYUtm.js | head -5", timeout=60)
print(o.read().decode() or "(no matubyte in bundle)")

_, o, _ = c.exec_command("grep -oE '.{0,30}auth/login.{0,30}' /var/www/matu-ai/chat/dist/assets/index-rvmyYUtm.js | head -3", timeout=60)
print(o.read().decode() or "(no auth/login)")

_, o, _ = c.exec_command("grep -oE 'https://chat[^\"]+' /var/www/matu-ai/chat/dist/assets/index-rvmyYUtm.js", timeout=60)
print(o.read().decode() or "(no https://chat)")

c.close()
