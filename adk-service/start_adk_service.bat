@echo off
echo ========================================
echo    Google ADK Service Startup Script
echo ========================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Python is installed.
echo.

echo Checking Google ADK installation...
python -c "import google.adk; print('Google ADK is installed')" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Google ADK...
    pip install google-adk uvicorn fastapi python-dotenv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Google ADK
        pause
        exit /b 1
    )
) else (
    echo Google ADK is already installed.
)

echo.
echo Available ADK Services:
echo 1. Real ADK Service (Port 8001)
echo 2. Multi-Agent ADK Service (Port 8002)
echo 3. Sample Agents Demo
echo 4. Exit
echo.

set /p choice=Choose an option (1-4): 

if "%choice%"=="1" (
    echo Starting Real ADK Service on port 8001...
    python real_adk_service.py
) else if "%choice%"=="2" (
    echo Starting Multi-Agent ADK Service on port 8002...
    python multi_agent_adk.py
) else if "%choice%"=="3" (
    echo Running Sample Agents Demo...
    python sample_agents.py
) else if "%choice%"=="4" (
    echo Goodbye!
    exit /b 0
) else (
    echo Invalid choice. Please try again.
    pause
    goto :EOF
)

pause 