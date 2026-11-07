@echo off
rem VTN HUB - instala este computador como servidor (principal ou reserva).
rem Baixa o programa do GitHub para Area de Trabalho\VTN_Gestao e roda o instalador.
title VTN Hub - instalar servidor
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; $d=Join-Path ([Environment]::GetFolderPath('Desktop')) 'VTN_Gestao'; $n='vtn_'+[guid]::NewGuid().ToString('N'); $z=Join-Path $env:TEMP ($n+'.zip'); $x=Join-Path $env:TEMP $n; Write-Host 'Baixando o VTN Hub do GitHub...'; Invoke-WebRequest -UseBasicParsing 'https://github.com/Victor-Bertoni/vtn-hub/archive/refs/heads/main.zip' -OutFile $z; Expand-Archive $z $x; New-Item -ItemType Directory -Force $d | Out-Null; Copy-Item -Recurse -Force (Join-Path (Get-ChildItem $x -Directory)[0].FullName '*') $d; & (Join-Path $d 'rotinas\instalar_rotinas.ps1')"
pause
