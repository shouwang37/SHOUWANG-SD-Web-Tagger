@echo off
chcp 65001 >nul
title 守望影神图集案器 v0.1 启动器

echo.
echo ========================================
echo    🎨 守望影神图集案器 v0.1 启动器
echo ========================================
echo.
echo 正在启动服务器...
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未检测到Python，请确保已安装Python
    echo 请访问 https://www.python.org/ 下载安装Python
    pause
    exit /b 1
)

REM 检查demo.py文件是否存在
if not exist "demo.py" (
    echo ❌ 错误：未找到demo.py文件
    echo 请确保在正确的目录运行此脚本
    pause
    exit /b 1
)

REM 检查Flask是否安装
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo 📦 正在安装Flask依赖...
    pip install flask pillow
    if errorlevel 1 (
        echo ❌ 依赖安装失败，请手动运行: pip install flask pillow
        pause
        exit /b 1
    )
)

echo ✅ 环境检查通过
echo.
echo 🚀 启动Flask服务器...
echo.

REM 启动Flask服务器并在3秒后打开浏览器
start /b python demo.py

REM 等待服务器启动
echo ⏳ 等待服务器启动...
timeout /t 3 /nobreak >nul

REM 打开浏览器
echo 🌐 正在打开浏览器...
start http://127.0.0.1:5000

echo.
echo ✅ 应用已启动！
echo 🌐 访问地址: http://127.0.0.1:5000
echo.
echo 💡 提示：
echo    - 关闭此窗口将停止服务器
echo    - 如需重启，请重新运行此脚本
echo.
echo ========================================
echo 按任意键退出启动器（服务器将继续运行）
pause >nul

REM 脚本结束，但Python服务器继续在后台运行