@echo off
setlocal
cd /d "%~dp0"
title hoopcut - laisse cette fenetre ouverte
if not defined HOOPCUT_DONNEES set "HOOPCUT_DONNEES=%USERPROFILE%\hoopcut-donnees"
set "PY=%HOOPCUT_DONNEES%\venv\Scripts\python.exe"
if not exist "%PY%" goto :pas_installe

rem Double-clic, ou seulement des options (--focus-joueur...) : l'apercu s'ouvre dans le navigateur.
rem Avec un lien ou une video (glissee sur ce fichier) : tout d'un coup, sans apercu.
if "%~1"=="" goto :interface
if "%~1"=="--help" goto :direct
set "PREMIER=%~1"
if "%PREMIER:~0,2%"=="--" goto :interface
goto :direct

:interface
"%PY%" -m hoopcut.interface %*
if errorlevel 1 pause
exit /b 0

:direct
"%PY%" -m hoopcut %*
exit /b %errorlevel%

:pas_installe
echo hoopcut n'est pas encore installe : double-clique d'abord sur installer.bat
pause
exit /b 1
