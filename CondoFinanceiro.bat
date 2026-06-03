@echo off
cd /d "%~dp0"
title CondoFinanceiro

echo Iniciando CondoFinanceiro...

REM Encerra qualquer processo antigo na porta 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Inicia o servidor em segundo plano sem abrir o navegador
set BROWSER=none
start /min "CondoFinanceiro - Servidor" cmd /k "npm start"

REM Aguarda o servidor React subir
echo Aguardando servidor...
timeout /t 12 /nobreak > nul

REM Tenta abrir no Edge (modo app = sem barra do navegador)
set EDGE="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set EDGE64="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set CHROME="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set CHROME86="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

set FLAGS=--app=http://localhost:3000 --window-size=1400,900 --disable-application-cache --disable-cache --disable-features=ServiceWorker --user-data-dir="%TEMP%\CondoFinanceiro"

if exist %EDGE64% (
    start "" %EDGE64% %FLAGS%
) else if exist %EDGE% (
    start "" %EDGE% %FLAGS%
) else if exist %CHROME% (
    start "" %CHROME% %FLAGS%
) else if exist %CHROME86% (
    start "" %CHROME86% %FLAGS%
) else (
    REM Fallback: abre no navegador padrão
    start http://localhost:3000
)
