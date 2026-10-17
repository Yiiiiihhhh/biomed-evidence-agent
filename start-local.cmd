@echo off
setlocal
cd /d "%~dp0"
set "BIOMED_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "BIOMED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "dist\server.mjs" (
  echo Please build first: npm run build
  pause
  exit /b 1
)
echo Open http://localhost:7860 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
"%BIOMED_NODE%" dist\server.mjs
pause
