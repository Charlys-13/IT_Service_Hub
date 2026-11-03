@echo off
cd /d "%~dp0"
start "" msedge.exe "%~dp0index.html"
if errorlevel 1 start "" "%~dp0index.html"
