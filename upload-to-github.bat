@echo off
echo ==========================================
echo    GetMySHP - Upload to GitHub Script
echo ==========================================
echo.

REM Step 1: Delete old git history (start completely fresh)
echo [1/6] Cleaning up old git data...
rmdir /s /q .git 2>nul
echo.

REM Step 2: Initialize fresh Git repo
echo [2/6] Initializing fresh Git repository...
git init
echo.

REM Step 3: Configure Git identity
echo [3/6] Configuring Git identity...
git config user.email "pranavpatil954@gmail.com"
git config user.name "pranavpatil954"
echo.

REM Step 4: Add all files (respecting .gitignore)
echo [4/6] Adding files (may take a few minutes)...
git add .
echo.

REM Step 5: Commit
echo [5/6] Creating commit...
git commit -m "Initial commit: GetMySHP GIS Portal"
echo.

REM Step 6: Connect and push to GitHub
echo [6/6] Pushing to GitHub...
git branch -M main
git remote add origin https://github.com/pranavpatil954/GetMyShp.git
git push -u origin main --force
echo.

echo ==========================================
echo    DONE! Your code is now on GitHub!
echo    Visit: https://github.com/pranavpatil954/GetMyShp
echo ==========================================
pause
