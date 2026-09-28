@echo off
setlocal
cd /d "%~dp0"
if not defined HOOPCUT_DONNEES set "HOOPCUT_DONNEES=%USERPROFILE%\hoopcut-donnees"
set "PY=%HOOPCUT_DONNEES%\venv\Scripts\python.exe"
if not exist "%PY%" goto :pas_installe

rem Avec des arguments (ou une video glissee sur ce fichier) : on les passe tels quels
if not "%~1"=="" goto :direct

echo.
echo === hoopcut : un short basket de 60 a 80 secondes ===
echo.
set "LIEN="
set /p "LIEN=Colle le lien YouTube (ou glisse une video ici), puis appuie sur Entree : "
if not defined LIEN exit /b 0
set "LIEN=%LIEN:"=%"
"%PY%" -m hoopcut "%LIEN%"
echo.
if exist "sorties" start "" "%~dp0sorties"
pause
exit /b 0

:direct
"%PY%" -m hoopcut %*
exit /b %errorlevel%

:pas_installe
echo hoopcut n'est pas encore installe : double-clique d'abord sur installer.bat
pause
exit /b 1
