@echo off
title Quick Wit - Speaking Trainer
cd /d "%~dp0"

REM Node first. serve.js opens the browser itself once the server is listening,
REM so the page can never load before there is something to answer it.
where node >nul 2>nul
if not errorlevel 1 (
  node serve.js
  echo.
  pause
  exit /b 0
)

REM Fall back to Python. Note: `where python` is NOT a reliable check on Windows
REM -- the Microsoft Store ships a placeholder python.exe that exists on PATH but
REM only opens the Store. Actually running it is the only honest test.
python --version >nul 2>nul
if not errorlevel 1 (
  echo Starting Quick Wit at http://localhost:8422 ...
  echo (Keep this window open while playing. Close it to stop the game.)
  start "" /min cmd /c "timeout /t 2 >nul & start "" http://localhost:8422"
  python -m http.server 8422
  exit /b 0
)

echo.
echo Neither Node.js nor Python was found, so the game has no way to serve itself.
echo Install Node.js from https://nodejs.org (take the LTS build), then run this again.
echo.
pause
exit /b 1
