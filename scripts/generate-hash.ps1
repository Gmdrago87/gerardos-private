param (
    [string]$password
)

if (-not $password) {
    Write-Host "Uso: .\generate-hash.ps1 -password 'tu_contraseña'" -ForegroundColor Red
    exit
}

# Configuración de PBKDF2
# IMPORTANTE: Cloudflare Workers limita las iteraciones a un máximo de 100,000
$iterations = 100000
$saltSize = 16
$hashSize = 32

# Generar sal aleatoria
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$saltBytes = [byte[]]::new($saltSize)
$rng.GetBytes($saltBytes)

# Derivar clave con SHA-256
$pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($password, $saltBytes, $iterations, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
$hashBytes = $pbkdf2.GetBytes($hashSize)

$saltHex = [System.BitConverter]::ToString($saltBytes).Replace("-", "").ToLower()
$hashHex = [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()

$finalHash = "pbkdf2:sha256:" + $iterations + ":" + $saltHex + ":" + $hashHex
Write-Host "`n==================================================" -ForegroundColor Gray
Write-Host "Tu hash (copia esto a PASSWORD_HASH en Cloudflare):" -ForegroundColor Green
Write-Host $finalHash -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Gray
