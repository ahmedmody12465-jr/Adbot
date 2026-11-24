@echo off
cd /d "%~dp0"
echo Starting AdBot Server...
start "" http://localhost:3001
node server.js
pause
