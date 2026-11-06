@echo off
echo Stopping SunoNa background server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo SunoNa has been stopped successfully.
pause

