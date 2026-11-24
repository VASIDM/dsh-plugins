# 一键装回全部 DSH 插件（新机器）
#
# 用法：关掉 DSH，双击 bootstrap.cmd（或在本目录运行
#   powershell -ExecutionPolicy Bypass -File bootstrap.ps1
# ），装完重新打开 DSH 即可。
#
# 它做四件事：
#   1. 匿名下载仓库 zip（不需要 git、不需要 token）
#   2. 解压出 packages/ 到 F:\DSH-Plugins
#   3. 按 manifest.json 里记录的源 profile，写好依赖与启用列表
#   4. 用 DSH 自带的 pnpm 安装依赖

$ErrorActionPreference = 'Stop'
$Owner = 'VASIDM'
$Repo = 'dsh-plugins'
$Branch = 'main'
# Overridable so the script can be rehearsed into a scratch directory.
$Root = if ($env:DSH_PLUGIN_ROOT) { $env:DSH_PLUGIN_ROOT } else { 'F:\DSH-Plugins' }

function Say($message) { Write-Host "  $message" }

Write-Host "== DSH 插件一键装回 =="

$home_ = $env:DSH_HOME
if (-not $home_) { $home_ = Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $home_ 'profiles\desktop'
$profileFile = Join-Path $profileDir 'package.json'
$runtime = Join-Path $home_ 'dsh-runtimes\dsh-primary-runtime\dependencies'
$node = Join-Path $runtime 'node\bin\node.exe'
$pnpm = Join-Path $runtime 'pnpm\bin\pnpm.mjs'

Say "DSH home: $home_"

$tmpRoot = Join-Path $env:TEMP ('dsh-plugins-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force $tmpRoot | Out-Null
$zip = Join-Path $tmpRoot 'repo.zip'

Say "下载仓库 $Owner/$Repo ..."
$url = "https://codeload.github.com/$Owner/$Repo/zip/refs/heads/$Branch"
try {
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 120
} catch {
  throw "下载失败：$($_.Exception.Message)。若仓库是私有的，请先用 Token 手动下载。"
}
Say ("已下载 {0:N1} MB" -f ((Get-Item $zip).Length / 1MB))

Say '解压 ...'
Expand-Archive -LiteralPath $zip -DestinationPath $tmpRoot -Force
$src = Get-ChildItem $tmpRoot -Directory | Where-Object { $_.Name -like "$Repo-*" } | Select-Object -First 1
if (-not $src) { throw '压缩包结构不正确，找不到仓库目录。' }

$manifestPath = Join-Path $src.FullName 'manifest.json'
if (-not (Test-Path $manifestPath)) { throw '仓库缺少 manifest.json。' }
$manifest = Get-Content $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json

New-Item -ItemType Directory -Force $Root | Out-Null
Say "写入插件到 $Root ..."
Copy-Item (Join-Path $src.FullName 'packages\*') $Root -Recurse -Force
Say ("共 {0} 个包" -f $manifest.packages.Count)

if (-not (Test-Path $profileFile)) { throw "找不到 profile：$profileFile。请先启动一次 DSH 生成默认 profile。" }
$profile = Get-Content $profileFile -Raw -Encoding utf8 | ConvertFrom-Json
if (-not $profile.dsh) { $profile | Add-Member -NotePropertyName dsh -NotePropertyValue ([pscustomobject]@{}) }
if (-not $profile.dsh.profile) { $profile.dsh | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{}) }
if (-not $profile.dependencies) { $profile | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{}) }

$wantedBundles = @()
if ($manifest.profile -and $manifest.profile.bundles) { $wantedBundles = @($manifest.profile.bundles) }
else { $wantedBundles = @($manifest.packages | Where-Object { $_.hasBundle } | ForEach-Object { $_.name }) }

$savedDeps = $null
if ($manifest.profile -and $manifest.profile.dependencies) { $savedDeps = $manifest.profile.dependencies }

foreach ($pkg in $manifest.packages) {
  if (-not $pkg.name -or -not $pkg.dir) { continue }
  $spec = $null
  if ($savedDeps -and $savedDeps.PSObject.Properties.Name -contains $pkg.name) { $spec = $savedDeps.($pkg.name) }
  if (-not $spec) { $spec = "link:$($Root.Replace('\','/'))/$($pkg.dir)" }
  $profile.dependencies | Add-Member -NotePropertyName $pkg.name -NotePropertyValue $spec -Force
}
$profile.dsh.profile | Add-Member -NotePropertyName bundles -NotePropertyValue $wantedBundles -Force
# BOM-less UTF-8 is mandatory: the DSH loader parses package.json with JSON.parse,
# which rejects a byte-order mark and would fail to boot the profile.
$json = $profile | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($profileFile, $json, (New-Object System.Text.UTF8Encoding($false)))
Say ("profile 已写入：{0} 个 bundle / {1} 个依赖" -f $wantedBundles.Count, $manifest.packages.Count)

if ((Test-Path $node) -and (Test-Path $pnpm)) {
  Say '安装依赖（pnpm）...'
  Push-Location $profileDir
  try {
    & $node $pnpm install --no-frozen-lockfile --reporter=append-only
    if ($LASTEXITCODE -ne 0) { Write-Warning "pnpm 返回 $LASTEXITCODE；重启 DSH 时它通常会补装。" }
  } finally {
    Pop-Location
  }
} else {
  Write-Warning "没找到随附的 Node/pnpm（$runtime）。重启 DSH 时它会自行准备依赖。"
}

Remove-Item $tmpRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Host ''
Write-Host '完成。现在重新打开 DeepSeek Harness，右侧栏会出现「插件管家」，全部插件已就位。' -ForegroundColor Green
