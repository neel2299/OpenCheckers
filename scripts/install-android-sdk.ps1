$ErrorActionPreference = 'Continue'
$taskRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$javaRoot = Get-ChildItem -LiteralPath '.cache\toolchain\java' -Directory | Select-Object -First 1
$env:JAVA_HOME = $javaRoot.FullName
$env:ANDROID_HOME = Join-Path $taskRoot '.cache\android-sdk'
$env:ANDROID_USER_HOME = Join-Path $taskRoot '.cache\android-user'
$sdkManager = Join-Path $env:ANDROID_HOME 'cmdline-tools\latest\bin\sdkmanager.bat'
1..30 | ForEach-Object { 'y' } | & $sdkManager "--sdk_root=$env:ANDROID_HOME" '--licenses' *> '.cache\toolchain\sdk-licenses.log'
if ($LASTEXITCODE -ne 0) { Get-Content -LiteralPath '.cache\toolchain\sdk-licenses.log' -Tail 20; throw 'SDK license setup failed.' }
& $sdkManager "--sdk_root=$env:ANDROID_HOME" 'platform-tools' 'platforms;android-37.0' 'build-tools;37.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1' *> '.cache\toolchain\sdk-install.log'
if ($LASTEXITCODE -ne 0) { Get-Content -LiteralPath '.cache\toolchain\sdk-install.log' -Tail 25; throw 'SDK installation failed.' }
Write-Output 'Android SDK, platform tools, build tools, NDK, and CMake installed.'
