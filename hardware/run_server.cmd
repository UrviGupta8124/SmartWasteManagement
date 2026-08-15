@echo off
TITLE Ecotect Hardware Server
echo =========================================
echo    Ecotect Python Hardware Server
echo =========================================
echo.

echo Activating Python Virtual Environment...
call venv\Scripts\activate.bat

echo Installing dependencies (if any are missing)...
pip install opencv-python numpy tensorflow requests paho-mqtt -q

echo.
echo Starting server.py...
python server.py

echo.
pause
