import paramiko
import os
import re

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

_, o, _ = c.exec_command("cat /var/www/matu-ai/chat/dist/assets/index-rvmyYUtm.js", timeout=60)
js = o.read().decode(errors="replace")
# find API base URL pattern
for m in re.finditer(r'https?://[^"\']+|/api/auth', js):
    s = m.group(0)
    if 'matubyte' in s or 'localhost' in s or s.startswith('/api'):
        print(s)
        break
else:
    # show snippet around api/auth
    idx = js.find('/api/auth/login')
    if idx >= 0:
        print("context:", js[max(0,idx-80):idx+40])
    else:
        print("no /api/auth found, len", len(js))
c.close()
