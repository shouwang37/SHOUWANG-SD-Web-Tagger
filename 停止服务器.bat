@echo off
chcp 65001 >nul
title 停止守望影神图集案器

echo.
echo ========================================
echo      🛑 停止守望影神图集案器服务器
echo ========================================
echo.

REM 查找并终止Python进程中包含demo.py的进程
echo 🔍 正在查找服务器进程...

for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo csv ^| findstr /i "demo.py"') do (
    echo 📴 正在停止进程 %%i...
    taskkill /pid %%i /f >nul 2>&1
)

REM 更通用的方法：终止占用5000端口的进程
echo 🔍 检查5000端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo 📴 正在停止占用5000端口的进程 %%a...
    taskkill /pid %%a /f >nul 2>&1
)

echo.
echo ✅ 服务器已停止
echo.
pause