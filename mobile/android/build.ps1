param(
  [string]$SdkRoot = $env:ANDROID_HOME,
  [string]$SigningDirectory = (Join-Path $env:USERPROFILE '.codex/secrets/papershapers-android'),
  [switch]$InitializeSigningKey
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if (-not $SdkRoot) { $SdkRoot = $env:ANDROID_SDK_ROOT }
$tools = Join-Path $SdkRoot 'build-tools/36.0.0'
$platform = Join-Path $SdkRoot 'platforms/android-36/android.jar'
foreach ($required in @($platform, (Join-Path $tools 'aapt2.exe'), (Join-Path $tools 'd8.bat'), (Join-Path $tools 'apksigner.bat'))) {
  if (-not (Test-Path -LiteralPath $required)) { throw 'Install Android SDK platform 36 and build-tools 36.0.0, then set ANDROID_HOME.' }
}
foreach ($command in @('java','javac','jar','keytool')) { if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "JDK 17 or newer is required ($command missing)." } }

# Release keys live outside the checkout. Never regenerate a published app's key.
$signingRoot = [IO.Path]::GetFullPath($SigningDirectory)
if ($signingRoot.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or $signingRoot.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Signing material must be stored outside the repository.' }
$key = Join-Path $signingRoot 'release.jks'
$passwordFile = Join-Path $signingRoot 'store-password.txt'
if (-not (Test-Path -LiteralPath $key)) {
  if (-not $InitializeSigningKey) { throw 'No release key found. For the first build only, use -InitializeSigningKey. Back up the resulting private directory.' }
  New-Item -ItemType Directory -Path $signingRoot -Force | Out-Null
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls.exe $signingRoot /inheritance:r /grant:r "${identity}:(OI)(CI)F" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not restrict signing directory permissions.' }
  $random = New-Object byte[] 32
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  $generator.GetBytes($random)
  $generator.Dispose()
  [Convert]::ToBase64String($random) | Set-Content -LiteralPath $passwordFile -Encoding ascii
  $env:PS_ANDROID_STORE_PASSWORD = (Get-Content -LiteralPath $passwordFile -Raw).Trim()
  & keytool -genkeypair -keystore $key -alias papershapers-release -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Paper Shapers Study' -storepass:env PS_ANDROID_STORE_PASSWORD -keypass:env PS_ANDROID_STORE_PASSWORD
  if ($LASTEXITCODE -ne 0) { throw 'Signing key generation failed.' }
}
if (-not (Test-Path -LiteralPath $passwordFile)) { throw 'Restore the matching signing password securely before building.' }
$env:PS_ANDROID_STORE_PASSWORD = (Get-Content -LiteralPath $passwordFile -Raw).Trim()
try {
  $buildRoot = Join-Path $PSScriptRoot ('.build/' + [Guid]::NewGuid().ToString('N'))
  $classes = Join-Path $buildRoot 'classes'
  $dex = Join-Path $buildRoot 'dex'
  $res = Join-Path $buildRoot 'res'
  foreach ($dir in @($classes,$dex,(Join-Path $res 'drawable'),(Join-Path $res 'values'))) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Copy-Item -LiteralPath (Join-Path $repoRoot 'public/app-icon-512.png') -Destination (Join-Path $res 'drawable/app_icon.png')
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'res/values/strings.xml') -Destination (Join-Path $res 'values/strings.xml')
  $compiled = Join-Path $buildRoot 'resources.zip'
  & (Join-Path $tools 'aapt2.exe') compile --dir $res -o $compiled
  if ($LASTEXITCODE -ne 0) { throw 'Resource compilation failed.' }
  $unsigned = Join-Path $buildRoot 'unsigned.apk'
  & (Join-Path $tools 'aapt2.exe') link -o $unsigned -I $platform --manifest (Join-Path $PSScriptRoot 'AndroidManifest.xml') --min-sdk-version 26 --target-sdk-version 36 $compiled
  if ($LASTEXITCODE -ne 0) { throw 'Resource linking failed.' }
  $sources = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'src') -Recurse -Filter '*.java' | ForEach-Object FullName)
  & javac -encoding UTF-8 -source 8 -target 8 -bootclasspath $platform -d $classes @sources
  if ($LASTEXITCODE -ne 0) { throw 'Java compilation failed.' }
  $classJar = Join-Path $buildRoot 'classes.jar'
  & jar cf $classJar -C $classes .
  if ($LASTEXITCODE -ne 0) { throw 'Class packaging failed.' }
  & (Join-Path $tools 'd8.bat') --release --min-api 26 --lib $platform --output $dex $classJar
  if ($LASTEXITCODE -ne 0) { throw 'DEX compilation failed.' }
  # APK is a ZIP archive; append only DEX to the packaged Android resources.
  & jar uf $unsigned -C $dex classes.dex
  if ($LASTEXITCODE -ne 0) { throw 'DEX packaging failed.' }
  $aligned = Join-Path $buildRoot 'aligned.apk'
  & (Join-Path $tools 'zipalign.exe') -f -p 4 $unsigned $aligned
  if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed.' }
  [xml]$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'AndroidManifest.xml') -Raw
  $androidNamespace = 'http://schemas.android.com/apk/res/android'
  $version = $manifest.manifest.GetAttribute('versionName', $androidNamespace)
  $versionCode = [int]$manifest.manifest.GetAttribute('versionCode', $androidNamespace)
  if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Use a numeric semantic version in the manifest.' }
  $downloads = Join-Path $repoRoot 'public/downloads'
  New-Item -ItemType Directory -Path $downloads -Force | Out-Null
  $filename = "papershapers-study-$version.apk"
  $artifact = Join-Path $downloads $filename
  if (Test-Path -LiteralPath $artifact) { throw 'Published version already exists. Increment versionCode/versionName before making another release.' }
  & (Join-Path $tools 'apksigner.bat') sign --ks $key --ks-key-alias papershapers-release --ks-pass env:PS_ANDROID_STORE_PASSWORD --key-pass env:PS_ANDROID_STORE_PASSWORD --out $artifact $aligned
  if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
  $verification = & (Join-Path $tools 'apksigner.bat') verify --verbose --print-certs $artifact
  if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
  $verification | Write-Output
  $certificateLine = $verification | Where-Object { $_ -match '^Signer #1 certificate SHA-256 digest: ' } | Select-Object -First 1
  if (-not $certificateLine) { throw 'Missing APK signing certificate digest.' }
  $signerHash = ($certificateLine -replace '^Signer #1 certificate SHA-256 digest: ', '').Trim()
  & (Join-Path $tools 'zipalign.exe') -c -p 4 $artifact
  if ($LASTEXITCODE -ne 0) { throw 'Signed APK alignment check failed.' }
  $hash = (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash.ToLowerInvariant()
  $metadata = [ordered]@{ version=$version; versionCode=$versionCode; package='in.papershapers.study'; minimumAndroid='8.0'; filename=$filename; bytes=(Get-Item -LiteralPath $artifact).Length; sha256=$hash; signerSha256=$signerHash; builtAt=[DateTime]::UtcNow.ToString('o'); architecture='browser-custom-tab'; website='https://papershapers.in/papershapers/dashboard' }
  [IO.File]::WriteAllText((Join-Path $downloads 'android-release.json'), ($metadata | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
  Write-Output "Built and verified: $artifact"
  Write-Output "SHA-256: $hash"
  Write-Output "Signing key location (private; back up securely): $signingRoot"
} finally { Remove-Item Env:PS_ANDROID_STORE_PASSWORD -ErrorAction SilentlyContinue }
