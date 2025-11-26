@echo off
chcp 65001 >nul
echo ========================================
echo   BerryDone - 任务管理应用
echo ========================================
echo.
echo 正在启动开发服务器...
echo.
cd /d "%~dp0"
call pnpm dev
pause

