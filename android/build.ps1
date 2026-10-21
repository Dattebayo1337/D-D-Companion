param([string]$SdkRoot=$env:ANDROID_HOME, [string]$JavaHome=$env:JAVA_HOME)
$ErrorActionPreference='Stop'
if (!$SdkRoot -or !(Test-Path -LiteralPath (Join-Path $SdkRoot 'platforms/android-35/android.jar'))) { throw 'Укажите -SdkRoot с установленным Android SDK Platform 35.' }
if (!$JavaHome -or !(Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))) { throw 'Укажите -JavaHome с JDK 17.' }
$env:JAVA_HOME=(Resolve-Path -LiteralPath $JavaHome).Path
$env:ANDROID_HOME=(Resolve-Path -LiteralPath $SdkRoot).Path
if (!$env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME=Join-Path $PSScriptRoot '.gradle/user-home' }
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'local.properties') -Value ('sdk.dir='+$env:ANDROID_HOME.Replace('\','/'))
Push-Location $PSScriptRoot
try {
  & ./gradlew.bat --no-daemon testDebugUnitTest lintDebug assembleDebug
  if ($LASTEXITCODE -ne 0) { throw 'Android-сборка завершилась ошибкой. Смотрите журнал выше.' }
  Write-Output (Join-Path $PSScriptRoot 'app/build/outputs/apk/debug/app-debug.apk')
} finally { Pop-Location }
