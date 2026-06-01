import os
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("83.171.248.29", username="root", password=os.environ["SSH_PASSWORD"], timeout=30)

cmd = r"""
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/limits.conf << 'EOF'
[Service]
Environment="OLLAMA_NUM_PARALLEL=2"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_KEEP_ALIVE=5m"
Environment="OLLAMA_MAX_QUEUE=4"
EOF
systemctl daemon-reload
systemctl restart ollama
sleep 3
ollama list
ps aux | grep 'ollama runner' | grep -v grep | wc -l
"""

_, o, e = c.exec_command(cmd, timeout=120)
print(o.read().decode(errors="replace").encode("ascii", "replace").decode())
print(e.read().decode(errors="replace").encode("ascii", "replace").decode())
c.close()
