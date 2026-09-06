#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if [[ -x /opt/homebrew/bin/python3 ]]; then
  exec /opt/homebrew/bin/python3 server.py
elif command -v python3 >/dev/null; then
  exec python3 server.py
else
  print '未找到 Python 3。请安装后重新打开。'
  read '?按回车关闭'
fi
