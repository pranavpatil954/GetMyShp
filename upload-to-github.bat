@echo off
echo ==========================================
echo    Pushing updates to GitHub...
echo ==========================================
echo.

git add .
git commit -m "Add Render deployment config: serve frontend from backend in production"
git push

echo.
echo ==========================================
echo    DONE! Changes pushed to GitHub.
echo ==========================================
pause
