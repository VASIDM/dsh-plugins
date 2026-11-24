@echo off
chcp 65001 >nul
title DSH plugin restore
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap.ps1"
echo.
pause
