@echo off
setlocal
cd /d "%~dp0"
if not defined HOOPCUT_DONNEES set "HOOPCUT_DONNEES=%USERPROFILE%\hoopcut-donnees"
set "PY=%HOOPCUT_DONNEES%\venv\Scripts\python.exe"

echo === Installation de hoopcut ===
echo Les gros fichiers (IA, moteurs, videos) vont dans : %HOOPCUT_DONNEES%
echo.

where py >nul 2>nul
if errorlevel 1 goto :sans_python
where ffmpeg >nul 2>nul
if errorlevel 1 goto :sans_ffmpeg

if exist "%PY%" goto :modules
echo [1/3] Creation de l'environnement Python...
py -3 -m venv "%HOOPCUT_DONNEES%\venv" || goto :erreur

:modules
echo [2/3] Installation des modules Python...
"%PY%" -m pip install --disable-pip-version-check -q -e . || goto :erreur
rem YouTube change souvent : on prend toujours la derniere version de l'outil de telechargement
"%PY%" -m pip install --disable-pip-version-check -q -U "yt-dlp[default,deno]" || goto :erreur

echo [3/3] Moteurs et modele d'IA : environ 4,5 Go a telecharger la premiere fois...
"%PY%" -m hoopcut.engines || goto :erreur

echo.
echo Installation terminee. Double-clique sur hoopcut.bat pour creer un short.
pause
exit /b 0

:sans_python
echo Python est introuvable. Installe-le depuis https://www.python.org/downloads/ puis relance ce fichier.
pause
exit /b 1

:sans_ffmpeg
echo FFmpeg est introuvable. Ouvre un terminal, tape : winget install Gyan.FFmpeg
echo puis ferme le terminal et relance ce fichier.
pause
exit /b 1

:erreur
echo.
echo L'installation a echoue : lis le message ci-dessus.
pause
exit /b 1
