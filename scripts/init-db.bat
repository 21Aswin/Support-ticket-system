@echo off
echo Initializing HelpDesk Database...
node "%~dp0..\database\init-db.js"
pause
