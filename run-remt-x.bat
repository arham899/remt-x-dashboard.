@echo off
echo [REMT-X] Starting Telemetry System...

:: Start Telemetry Hub
start "REMT-X Hub" cmd /c "cd telemetry-hub && npm run dev"

:: Wait for Hub to stabilize
timeout /t 3

:: Start Admin Dashboard
start "REMT-X Dashboard" cmd /c "cd admin-dashboard && npm run dev"

echo [REMT-X] All systems launched.
echo [REMT-X] Hub: http://localhost:3001
echo [REMT-X] Dashboard: http://localhost:5173
echo [REMT-X] You can now use the extension on KoboToolbox/SurveyCTO.
pause
