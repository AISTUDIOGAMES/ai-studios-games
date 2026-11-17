[CmdletBinding()]
param(
    [ValidateSet('Preview', 'Production')]
    [string]$Target = 'Preview'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Stop-OnNativeError {
    param([string]$Step)
    if ($LASTEXITCODE -ne 0) {
        throw "$Step falhou com codigo $LASTEXITCODE. O deploy foi interrompido."
    }
}

Write-Host ''
Write-Host '=============================================' -ForegroundColor DarkYellow
Write-Host '       AI STUDIO OWL - VERCEL DEPLOY' -ForegroundColor Yellow
Write-Host '                 Version 0.3.0' -ForegroundColor Yellow
Write-Host '=============================================' -ForegroundColor DarkYellow
Write-Host "Destino: $Target"
Write-Host "Pasta:   $ProjectRoot"
Write-Host ''

if ($Target -eq 'Production') {
    Write-Host 'ATENCAO: voce solicitou uma publicacao em PRODUCAO.' -ForegroundColor Yellow
    Write-Host 'O dominio de producao podera receber esta versao imediatamente.' -ForegroundColor Yellow
    $confirmation = Read-Host 'Digite DEPLOY para confirmar'
    if ($confirmation -cne 'DEPLOY') {
        Write-Host 'Publicacao cancelada. Nenhuma versao foi enviada.' -ForegroundColor Red
        exit 1
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js nao encontrado. Instale Node.js 18 ou superior e abra um novo PowerShell.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm nao encontrado. Reinstale o Node.js (npm acompanha a instalacao padrao).'
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw 'npx nao encontrado. Reinstale o Node.js para disponibilizar npm e npx.'
}

$nodeMajorText = (& node -p "process.versions.node.split('.')[0]").Trim()
$nodeMajor = [int]$nodeMajorText
if ($nodeMajor -lt 18) {
    throw "Node.js $nodeMajorText detectado. Este projeto requer Node.js 18 ou superior."
}

if (-not (Test-Path (Join-Path $ProjectRoot 'package-lock.json'))) {
    throw 'package-lock.json nao encontrado. Execute o script na raiz do projeto AI STUDIO OWL.'
}
if (-not (Test-Path (Join-Path $ProjectRoot 'vercel.json'))) {
    throw 'vercel.json nao encontrado. O pacote parece incompleto.'
}

$package = Get-Content (Join-Path $ProjectRoot 'package.json') -Raw | ConvertFrom-Json
Write-Host "Projeto: $($package.name) | versao $($package.version)" -ForegroundColor Cyan

Write-Host ''
Write-Host '[1/4] Instalando dependencias com npm ci...' -ForegroundColor Cyan
& npm ci --no-audit --no-fund
Stop-OnNativeError 'npm ci'

Write-Host ''
Write-Host '[2/4] Executando TypeScript e build Vite...' -ForegroundColor Cyan
& npm run build
Stop-OnNativeError 'npm run build'

if (-not (Test-Path (Join-Path $ProjectRoot 'dist/index.html'))) {
    throw 'Build terminou sem gerar dist/index.html. Deploy cancelado.'
}
Write-Host 'Build local validado: dist/index.html encontrado.' -ForegroundColor Green

Write-Host ''
Write-Host '[3/4] Conferindo vinculacao do projeto Vercel...' -ForegroundColor Cyan
$vercelProjectFile = Join-Path $ProjectRoot '.vercel/project.json'
if (-not (Test-Path $vercelProjectFile)) {
    Write-Host 'Este diretorio ainda nao esta vinculado a um projeto Vercel.' -ForegroundColor Yellow
    Write-Host 'Na etapa interativa, selecione o projeto existente que deve servir a URL aistudiosowl.vercel.app.' -ForegroundColor Yellow
    & npx --yes vercel@latest link
    Stop-OnNativeError 'vercel link'
}
if (-not (Test-Path $vercelProjectFile)) {
    throw 'A vinculacao Vercel nao foi concluida. Execute vercel link e tente novamente.'
}

Write-Host ''
Write-Host '[4/4] Enviando projeto para Vercel...' -ForegroundColor Cyan
if ($Target -eq 'Production') {
    & npx --yes vercel@latest deploy --prod
} else {
    & npx --yes vercel@latest deploy
}
Stop-OnNativeError 'vercel deploy'

Write-Host ''
Write-Host 'Comando Vercel concluido. Confira a URL exibida acima e teste o site.' -ForegroundColor Green
if ($Target -eq 'Preview') {
    Write-Host 'Depois de validar o Preview, publique com: .\DEPLOY-VERCEL.ps1 -Target Production' -ForegroundColor Yellow
}
