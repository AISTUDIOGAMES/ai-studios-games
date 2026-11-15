<#
  OWL GRIDBREAKERS - servidor local
  Uso (PowerShell, dentro da pasta do jogo):
      .\Iniciar-Jogo.ps1                 # abre http://localhost:8080/
      .\Iniciar-Jogo.ps1 -Port 9000      # porta inicial diferente
      .\Iniciar-Jogo.ps1 -DebugMode      # abre com ?debug (1.000.000 de soul para testes)
      .\Iniciar-Jogo.ps1 -NoBrowser      # nao abre o navegador
  Para parar: Ctrl+C
  Se o PowerShell bloquear scripts:  powershell -ExecutionPolicy Bypass -File .\Iniciar-Jogo.ps1
#>
param(
    [int]$Port = 8080,
    [switch]$DebugMode,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path)).TrimEnd('\')
Set-Location $root

# ---------- 1) Three.js local (baixa uma vez; o jogo tem fallback para a CDN) ----------
$three = Join-Path $root 'vendor\three.min.js'
if (-not (Test-Path $three) -or (Get-Item $three).Length -lt 100000) {
    Write-Host 'Baixando three.min.js (r128) para vendor\ ...' -ForegroundColor Cyan
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js' -OutFile $three -UseBasicParsing
        Write-Host 'OK.' -ForegroundColor Green
    } catch {
        Write-Host 'Nao foi possivel baixar agora. O jogo tentara usar a CDN (precisa de internet).' -ForegroundColor Yellow
        if (Test-Path $three) { Remove-Item $three -Force }
    }
}

# ---------- 2) Servidor HTTP ----------
$mime = @{
    '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'
    '.css'='text/css; charset=utf-8';   '.json'='application/json; charset=utf-8'
    '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.webp'='image/webp'
    '.gif'='image/gif'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'
    '.mp3'='audio/mpeg'; '.wav'='audio/wav'; '.ogg'='audio/ogg'
    '.woff'='font/woff'; '.woff2'='font/woff2'; '.txt'='text/plain; charset=utf-8'
}

$listener = $null
$usedPort = 0
foreach ($p in $Port..($Port + 19)) {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    try { $l.Start(); $listener = $l; $usedPort = $p; break }
    catch { $l.Close() }
}
if ($null -eq $listener) {
    Write-Host "Nenhuma porta livre entre $Port e $($Port + 19)." -ForegroundColor Red
    exit 1
}

$url = "http://localhost:$usedPort/"
if ($DebugMode) { $url += '?debug' }
Write-Host ''
Write-Host '  OWL GRIDBREAKERS · RPG UI v1.4.5' -ForegroundColor Magenta
Write-Host '  Build: v1.4.5 (áudio consolidado nas Configurações)' -ForegroundColor Cyan
Write-Host "  Servindo: $root"
Write-Host "  Endereco: $url" -ForegroundColor Green
Write-Host '  Ctrl+C para encerrar.'
Write-Host ''
if (-not $NoBrowser) { Start-Process $url }

function Send-Status($res, [int]$code, [string]$msg) {
    $res.StatusCode = $code
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
    $res.ContentType = 'text/plain; charset=utf-8'
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Send-File($ctx) {
    $req = $ctx.Request
    $res = $ctx.Response
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/').Replace('/', '\')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }

    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    $inside = $full.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)
    if (-not $inside -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
        Send-Status $res 404 'Not found'
        return
    }

    $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
    if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
    $res.Headers.Add('Accept-Ranges', 'bytes')
    $res.Headers.Add('Cache-Control', 'no-cache')

    $fs = [IO.File]::Open($full, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try {
        $len = $fs.Length
        $start = 0L
        $end = $len - 1
        $rangeHeader = $req.Headers['Range']
        if ($rangeHeader -and $rangeHeader -match '^bytes=(\d*)-(\d*)$') {
            $a = $Matches[1]; $b = $Matches[2]
            if ($a -ne '') {
                $start = [long]$a
                if ($b -ne '') { $end = [Math]::Min([long]$b, $len - 1) }
            } elseif ($b -ne '') {
                $start = [Math]::Max(0L, $len - [long]$b)
            }
            if ($start -gt $end -or $start -ge $len) {
                $res.StatusCode = 416
                $res.Headers.Add('Content-Range', "bytes */$len")
                return
            }
            $res.StatusCode = 206
            $res.Headers.Add('Content-Range', "bytes $start-$end/$len")
        }
        $count = $end - $start + 1
        $res.ContentLength64 = $count
        [void]$fs.Seek($start, [IO.SeekOrigin]::Begin)
        $buf = New-Object byte[] 65536
        $left = $count
        while ($left -gt 0) {
            $n = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $left))
            if ($n -le 0) { break }
            $res.OutputStream.Write($buf, 0, $n)
            $left -= $n
        }
    } finally {
        $fs.Close()
    }
}

try {
    while ($listener.IsListening) {
        $task = $listener.GetContextAsync()
        while (-not $task.AsyncWaitHandle.WaitOne(250)) { }   # permite Ctrl+C
        $ctx = $task.GetAwaiter().GetResult()
        try {
            Send-File $ctx
        } catch {
            # navegador cancelou a conexao (comum em audio) - ignorar
        } finally {
            try { $ctx.Response.OutputStream.Close() } catch { }
            try { $ctx.Response.Close() } catch { }
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host 'Servidor encerrado.' -ForegroundColor Yellow
}
