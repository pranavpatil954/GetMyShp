@echo off
title Upload to GitHub - GetMySHP
echo ===================================================
echo             GetMySHP GitHub Uploader
echo ===================================================
echo.

cd /d "%~dp0"

echo Checking git status...
git status
echo.

set /p commit_msg="Enter commit message (Press Enter for default: Update GetMySHP website): "
if "%commit_msg%"=="" set commit_msg=Update GetMySHP website

echo.
echo Adding files to git...
git add .

echo Committing changes...
git commit -m "%commit_msg%"

echo Pushing to GitHub repository (https://github.com/pranavpatil954/GetMyShp)...
git push origin main

echo.
echo ===================================================
echo    DONE! Your changes are updated on GitHub.
echo ===================================================
echo.
pause
