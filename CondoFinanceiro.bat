@echo off
cd /d "%~dp0"
title CondoFinanceiro

echo Iniciando CondoFinanceiro...

REM Inicia o servidor em segundo plano sem abrir o navegador
set BROWSER=none
start /min "CondoFinanceiro - Servidor" cmd /k "npm start"

REM Aguarda o servidor React subir
echo Aguardando servidor...
timeout /t 10 /nobreak > nul

REM Tenta abrir no Edge (modo app = sem barra do navegador)
set EDGE="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set EDGE64="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set CHROME="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set CHROME86="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if exist %EDGE64% (
    start "" %EDGE64% --app=http://localhost:3000 --window-size=1400,900
) else if exist %EDGE% (
    start "" %EDGE% --app=http://localhost:3000 --window-size=1400,900
) else if exist %CHROME% (
    start "" %CHROME% --app=http://localhost:3000 --window-size=1400,900
) else if exist %CHROME86% (
    start "" %CHROME86% --app=http://localhost:3000 --window-size=1400,900
) else (
    REM Fallback: abre no navegador padrão
    start http://localhost:3000
)
