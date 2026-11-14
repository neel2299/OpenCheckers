param([string]$Architectures = 'arm64-v8a,armeabi-v7a,x86_64', [string]$BuildRoot = '', [switch]$SkipPrebuild)
$ErrorActionPreference = 'Stop'
$taskRoot = if ($BuildRoot) { [System.IO.Path]::GetFullPath($BuildRoot) } else { [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')) }
Set-Location -LiteralPath $taskRoot
$javaRoot = Get-ChildItem -LiteralPath (Join-Path $taskRoot '.cache\toolchain\java') -Directory | Select-Object -First 1
if (-not $javaRoot) { throw 'Extract the verified JDK under .cache/toolchain/java first.' }
$env:JAVA_HOME = $javaRoot.FullName
$env:ANDROID_HOME = Join-Path $taskRoot '.cache\android-sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:ANDROID_USER_HOME = Join-Path $taskRoot '.cache\android-user'
$env:GRADLE_USER_HOME = Join-Path $taskRoot '.cache\gradle'
$env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $taskRoot '.cache\expo'
$env:EXPO_NO_TELEMETRY = '1'
$env:npm_config_cache = Join-Path $taskRoot '.cache\npm'
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
$ninjaPath = Join-Path $env:ANDROID_HOME 'cmake\3.22.1\bin\ninja.exe'
if ((Test-Path -LiteralPath $ninjaPath) -and ([version](& $ninjaPath --version) -lt [version]'1.12.0')) {
  & node (Join-Path $taskRoot 'scripts\update-ninja.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Ninja download failed.' }
  Expand-Archive -LiteralPath (Join-Path $taskRoot '.cache\toolchain\ninja.zip') -DestinationPath (Join-Path $taskRoot '.cache\toolchain\ninja') -Force
  Copy-Item -LiteralPath (Join-Path $taskRoot '.cache\toolchain\ninja\ninja.exe') -Destination $ninjaPath -Force
}
$keyFolder = Join-Path $taskRoot '.keys'
New-Item -ItemType Directory -Path $keyFolder -Force | Out-Null
$secretFile = Join-Path $keyFolder 'android-signing.json'
if (-not (Test-Path -LiteralPath $secretFile)) {
  $secretBytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($secretBytes)
  $rng.Dispose()
  $password = [Convert]::ToBase64String($secretBytes)
  @{ password = $password } | ConvertTo-Json | Set-Content -LiteralPath $secretFile -Encoding utf8
}
$secret = Get-Content -LiteralPath $secretFile -Encoding utf8 -Raw | ConvertFrom-Json
$env:DRAUGHTS_KEYSTORE_PATH = Join-Path $keyFolder 'draughts-club.p12'
$env:DRAUGHTS_KEYSTORE_PASSWORD = $secret.password
if (-not (Test-Path -LiteralPath $env:DRAUGHTS_KEYSTORE_PATH)) {
  & (Join-Path $env:JAVA_HOME 'bin\keytool.exe') -genkeypair -storetype PKCS12 -keystore $env:DRAUGHTS_KEYSTORE_PATH -storepass:env DRAUGHTS_KEYSTORE_PASSWORD -keypass:env DRAUGHTS_KEYSTORE_PASSWORD -alias draughts-club -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Draughts Club'
  if ($LASTEXITCODE -ne 0) { throw 'Release key generation failed.' }
}
if (-not $SkipPrebuild) {
  & npx.cmd expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw 'Expo native generation failed.' }
} elseif (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'android/gradlew.bat'))) {
  throw 'Generate the Android project before using -SkipPrebuild.'
}
Push-Location (Join-Path $taskRoot 'android')
try {
  & .\gradlew.bat ':app:assembleRelease' ':app:bundleRelease' '--no-daemon' '--max-workers=2' '-I' (Join-Path $taskRoot 'scripts\windows-native.init.gradle') "-PreactNativeArchitectures=$Architectures" '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=768m'
  if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }
} finally { Pop-Location }
$outputFolder = Join-Path $taskRoot 'releases'
New-Item -ItemType Directory -Path $outputFolder -Force | Out-Null
$appConfig = (Get-Content -LiteralPath (Join-Path $taskRoot 'app.json') -Encoding utf8 -Raw | ConvertFrom-Json).expo
$output = Join-Path $outputFolder "OpenCheckers-$($appConfig.version).apk"
$aabOutput = Join-Path $outputFolder "OpenCheckers-$($appConfig.version).aab"
Copy-Item -LiteralPath (Join-Path $taskRoot 'android\app\build\outputs\apk\release\app-release.apk') -Destination $output -Force
Copy-Item -LiteralPath (Join-Path $taskRoot 'android\app\build\outputs\bundle\release\app-release.aab') -Destination $aabOutput -Force
$aabHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $aabOutput).Hash.ToLowerInvariant()
"$aabHash  $([System.IO.Path]::GetFileName($aabOutput))" | Set-Content -LiteralPath "$aabOutput.sha256" -Encoding ascii
& (Join-Path $PSScriptRoot 'verify-apk.ps1') -ApkPath $output
