@echo off
rem Starts the Rail Intelligence app and opens it in the default browser.
cd /d "%~dp0backend"

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3.11 or newer from https://www.python.org/downloads/ and run this file again.
  pause
  exit /b 1
)

echo Checking Python packages (first run takes a few minutes)...
python -m pip install --quiet --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
  echo Package installation failed. See the messages above.
  pause
  exit /b 1
)

echo.
echo The app is starting. Your browser opens in a few seconds: http://127.0.0.1:8000
echo Keep this window open while you use the app. Close it to stop the app.
echo.
start "" /min cmd /c "ping -n 11 127.0.0.1 >nul & start http://127.0.0.1:8000"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
