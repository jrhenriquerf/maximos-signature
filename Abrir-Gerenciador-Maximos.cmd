@echo off
chcp 65001 >nul
title Maximos Signature - Gerenciador local
color 0F

set "MAXIMOS_URL=http://127.0.0.1:8080/admin.html"

where wsl.exe >nul 2>nul
if errorlevel 1 (
  echo.
  echo O WSL nao foi encontrado neste computador.
  echo Instale ou habilite o WSL antes de abrir o gerenciador.
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================================
echo        MAXIMOS SIGNATURE - GERENCIADOR LOCAL
echo ========================================================
echo.
echo Iniciando o servidor e abrindo o navegador...
echo Para encerrar, volte a esta janela e pressione Ctrl+C.
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "$url='%MAXIMOS_URL%'; for ($i=0; $i -lt 40; $i++) { try { $response=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1; if ($response.StatusCode -eq 200) { Start-Process $url; exit } } catch {}; Start-Sleep -Milliseconds 500 }; Start-Process $url"

wsl.exe -d Ubuntu -- bash -lc "cd /home/jarangel/workspace/maximos-signature && exec python3 scripts/local_admin_server.py"

echo.
echo O servidor foi encerrado.
pause
