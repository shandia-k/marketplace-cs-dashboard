@echo off
title CS Marketplace Dashboard
color 0A

echo.
echo  ================================================
echo   CS Marketplace Dashboard
echo   Kelola semua akun marketplace dalam 1 jendela
echo  ================================================
echo.

:: Pindah ke folder script ini berada
cd /d "%~dp0"

:: Cek dulu apakah ada versi .exe yang sudah di-build (tidak butuh Node.js)
if exist "dist\CS Marketplace Dashboard-win32-x64\CS Marketplace Dashboard.exe" (
    echo  [*] Membuka versi aplikasi standalone...
    echo.
    start "" "dist\CS Marketplace Dashboard-win32-x64\CS Marketplace Dashboard.exe"
    exit /b 0
)

:: Fallback: jalankan via Node.js + npm
echo  [*] Versi standalone belum ada, menjalankan via Node.js...
echo.

:: Cek apakah node_modules sudah ada
if not exist "node_modules" (
    echo  [!] Dependensi belum terinstall. Menginstall sekarang...
    echo.
    npm install
    echo.
)

npm start

:: Jika ada error, jangan langsung tutup
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] Aplikasi gagal dijalankan. Error code: %ERRORLEVEL%
    echo  Pastikan Node.js sudah terinstall di PC kamu.
    echo  Download: https://nodejs.org
    echo.
    pause
)
