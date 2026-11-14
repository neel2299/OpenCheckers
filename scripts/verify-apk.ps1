param([string]$ApkPath = '')
$ErrorActionPreference = 'Stop'
$taskRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$appConfig = (Get-Content -LiteralPath (Join-Path $taskRoot 'app.json') -Encoding utf8 -Raw | ConvertFrom-Json).expo
if (-not $ApkPath) { $ApkPath = Join-Path $taskRoot "releases\OpenCheckers-$($appConfig.version).apk" }
$ApkPath = (Resolve-Path -LiteralPath $ApkPath).Path
$javaRoot = Get-ChildItem -LiteralPath (Join-Path $taskRoot '.cache\toolchain\java') -Directory | Select-Object -First 1
if (-not $javaRoot) { throw 'The local JDK is missing.' }
$env:JAVA_HOME = $javaRoot.FullName
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
$buildTools = Join-Path $taskRoot '.cache\android-sdk\build-tools\37.0.0'

# Read-only verification; the signed archive is never modified.
# https://developer.android.com/tools/apksigner
# https://developer.android.com/tools/zipalign
$signature = & (Join-Path $buildTools 'apksigner.bat') verify --verbose --print-certs $ApkPath
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
if (-not ($signature -match 'certificate DN: CN=Draughts Club$')) { throw 'Unexpected release certificate.' }
$certificateDigest = $signature | ForEach-Object { if ($_ -match 'certificate SHA-256 digest:\s*([a-fA-F0-9]+)') { $Matches[1].ToLowerInvariant() } } | Select-Object -First 1
if (-not $certificateDigest) { throw 'Cannot read the release certificate fingerprint.' }
$alignment = & (Join-Path $buildTools 'zipalign.exe') -c -P 16 -v 4 $ApkPath
if ($LASTEXITCODE -ne 0) { throw 'APK 16 KiB alignment verification failed.' }
$badging = & (Join-Path $buildTools 'aapt.exe') dump badging $ApkPath
if ($LASTEXITCODE -ne 0) { throw 'Cannot read APK metadata.' }
$metadata = $badging -join "`n"
$expectedPackage = [regex]::Escape($appConfig.android.package)
$expectedVersion = [regex]::Escape($appConfig.version)
$expectedCode = $appConfig.android.versionCode
if ($metadata -notmatch "package: name='$expectedPackage'.*versionCode='$expectedCode'.*versionName='$expectedVersion'") { throw 'Unexpected package/version.' }
if ($metadata -match 'application-debuggable') { throw 'Release APK must not be debuggable.' }
foreach ($abi in @('arm64-v8a', 'armeabi-v7a')) {
  if ($metadata -notmatch [regex]::Escape("'$abi'")) { throw "Missing Android architecture: $abi" }
}
foreach ($permission in @('RECORD_AUDIO', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'SYSTEM_ALERT_WINDOW', 'FOREGROUND_SERVICE')) {
  if ($metadata -match [regex]::Escape("android.permission.$permission")) { throw "Unexpected permission: $permission" }
}

# A valid signature and bundle cannot catch R8 stripping reflection-only Java
# constructors. Inspect the actual DEX so the known instant-close crash cannot
# pass release verification again.
$startupJson = & node (Join-Path $taskRoot 'scripts/verify-android-startup.mjs') $ApkPath
if ($LASTEXITCODE -ne 0) { throw 'Android startup constructor verification failed.' }
$startup = $startupJson | ConvertFrom-Json

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($ApkPath)
try {
  $bundle = $archive.GetEntry('assets/index.android.bundle')
  if (-not $bundle -or $bundle.Length -lt 100000) { throw 'The embedded app bundle is missing.' }
  $audio = @($archive.Entries | Where-Object { $_.FullName -match '\.wav$' })
  if ($audio.Count -lt 7) { throw 'Bundled sound effects are missing.' }
  # Release resource optimization renames WAV files. Match the bell by its
  # contents rather than depending on the original asset filename.
  $expectedBellHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $taskRoot 'assets/sounds/victory.wav')).Hash
  $audioHasher = [System.Security.Cryptography.SHA256]::Create()
  try {
    $victoryAsset = @($audio | Where-Object {
      $audioStream = $_.Open()
      try { [BitConverter]::ToString($audioHasher.ComputeHash($audioStream)).Replace('-', '') -eq $expectedBellHash }
      finally { $audioStream.Dispose() }
    })
  } finally { $audioHasher.Dispose() }
  if (-not $victoryAsset.Count) { throw 'The victory bell is missing from the APK.' }
  $fonts = @($archive.Entries | Where-Object { $_.FullName -match '\.(ttf|otf)$' })
  if ($fonts.Count -lt 1) { throw 'Bundled fonts are missing.' }
  $expectedQrHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $taskRoot 'assets/donation-upi.jpg')).Hash
  $qrHasher = [System.Security.Cryptography.SHA256]::Create()
  try {
    $donationQr = @($archive.Entries | Where-Object {
      if ($_.FullName -notmatch '\.jpe?g$') { return $false }
      $imageStream = $_.Open()
      try { [BitConverter]::ToString($qrHasher.ComputeHash($imageStream)).Replace('-', '') -eq $expectedQrHash }
      finally { $imageStream.Dispose() }
    })
  } finally { $qrHasher.Dispose() }
  if (-not $donationQr.Count) { throw 'The current donation QR is missing from the APK.' }
  $donationSettings = Get-Content -LiteralPath (Join-Path $taskRoot 'src/support/donations.ts') -Encoding utf8 -Raw
  $expectedUpiUri = [regex]::Match($donationSettings, "UPI_DONATION_URI = '([^']+)'").Groups[1].Value
  if (-not $expectedUpiUri) { throw 'Cannot read the current UPI destination.' }
  $bundleMemory = New-Object System.IO.MemoryStream
  $bundleStream = $bundle.Open()
  try { $bundleStream.CopyTo($bundleMemory); $bundleText = [System.Text.Encoding]::UTF8.GetString($bundleMemory.ToArray()) }
  finally { $bundleStream.Dispose(); $bundleMemory.Dispose() }
  if (-not $bundleText.Contains($expectedUpiUri)) { throw 'The APK has a stale UPI destination.' }
  if ($bundleText -match '\b[0-9]{10}@[a-zA-Z0-9.-]+') { throw 'A phone-based UPI alias remains in the APK.' }
  $stream = $bundle.Open()
  try {
    $header = New-Object byte[] 8
    if ($stream.Read($header, 0, 8) -ne 8) { throw 'Cannot read the app bundle header.' }
    $magic = [BitConverter]::ToString($header).Replace('-', '').ToLowerInvariant()
    if ($magic -ne 'c61fbc03c103191f') { throw 'Expected a release Hermes bytecode bundle.' }
  } finally { $stream.Dispose() }
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ApkPath).Hash.ToLowerInvariant()
  $report = [ordered]@{
    file = [System.IO.Path]::GetFileName($ApkPath)
    bytes = (Get-Item -LiteralPath $ApkPath).Length
    sha256 = $hash
    package = $appConfig.android.package
    version = $appConfig.version
    versionCode = $appConfig.android.versionCode
    releaseSignatureVerified = $true
    certificateSha256 = $certificateDigest
    aligned16KiB = $true
    debuggable = $false
    architectures = @([regex]::Matches(($badging | Where-Object { $_ -match '^native-code:' }), "'([^']+)'") | ForEach-Object { $_.Groups[1].Value })
    embeddedHermesBundleBytes = $bundle.Length
    bundledSounds = $audio.Count
    victoryBellVerified = $true
    bundledFonts = $fonts.Count
    deviceTested = $false
    startupConstructorsVerified = $startup.startupConstructorsVerified
    workManagerBundled = $startup.workManagerBundled
    donationQrVerified = $true
    donationQrSha256 = $expectedQrHash.ToLowerInvariant()
    upiDestinationVerified = $true
    phoneBasedUpiAliasAbsent = $true
  }
} finally { $archive.Dispose() }
$outputFolder = Split-Path -Parent $ApkPath
$report | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $outputFolder 'apk-verification.json') -Encoding utf8
"$hash  $([System.IO.Path]::GetFileName($ApkPath))" | Set-Content -LiteralPath "$ApkPath.sha256" -Encoding ascii
$signature
$badging | Where-Object { $_ -match '^(package:|sdkVersion:|targetSdkVersion:|native-code:)' }
$report | ConvertTo-Json -Depth 3
