# SmartBudget — preview local http://127.0.0.1:8765/
# Idempotente: si ya escucha, no abre otro proceso.
$ErrorActionPreference = "Stop"
$port = 8765
$bind = "127.0.0.1"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-PuertoEscucha {
    try {
        $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            Where-Object { $_.LocalAddress -eq $bind -or $_.LocalAddress -eq "0.0.0.0" }
        return [bool]$c
    } catch {
        return $false
    }
}

if (Test-PuertoEscucha) {
    Write-Host "Preview ya activo: http://${bind}:${port}/"
    exit 0
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $fallback = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
    if (Test-Path $fallback) { $pythonPath = $fallback }
    else {
        Write-Host "ERROR: no se encontro Python. Instala Python 3.12 y reabre Cursor."
        exit 1
    }
} else {
    $pythonPath = $python.Source
}

Start-Process -FilePath $pythonPath `
    -ArgumentList @("-m", "http.server", "$port", "--bind", $bind) `
    -WorkingDirectory $root `
    -WindowStyle Hidden

$ok = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 250
    if (Test-PuertoEscucha) { $ok = $true; break }
}

if ($ok) {
    Write-Host "Preview iniciado: http://${bind}:${port}/"
    exit 0
}

Write-Host "ERROR: no arranco el preview en el puerto $port."
exit 1
