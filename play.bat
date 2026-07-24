@echo off
title Quick Wit - Speaking Trainer
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install it from https://python.org and run this again.
  pause
  exit /b 1
)

echo Starting Quick Wit at http://localhost:8422 ...
echo (Keep this window open while playing. Close it to stop the game.)
start "" "http://localhost:8422"
python -m http.server 8422
