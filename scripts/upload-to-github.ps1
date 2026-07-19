param (
    [string]$pat,
    [string]$username = "GerardMaestre",
    [string]$repo = "gerardos-private"
)

if (-not $pat) {
    $securePat = Read-Host "Introduce tu Token de Acceso Personal (PAT) de GitHub (no se mostrara en pantalla)" -AsSecureString
    if (-not $securePat) {
        Write-Host "Error: Se requiere el token." -ForegroundColor Red
        exit
    }
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePat)
    $pat = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# 1. Crear el repositorio si no existe
$headers = @{
    "Authorization" = "token $pat"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "PowerShell-Uploader"
}

Write-Host "Verificando si el repositorio '$username/$repo' existe en GitHub..." -ForegroundColor Cyan
$repoExists = $false
try {
    $res = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repo" -Headers $headers -Method Get
    $repoExists = $true
    Write-Host "El repositorio ya existe." -ForegroundColor Green
} catch {
    # Si devuelve 404, significa que no existe
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "El repositorio no existe. Creándolo como privado..." -ForegroundColor Yellow
        try {
            $body = @{
                name = $repo
                private = $true
                description = "GerardOS Private Dashboard - Panel de control privado"
            } | ConvertTo-Json
            
            $res = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body -ContentType "application/json"
            $repoExists = $true
            Write-Host "Repositorio creado con éxito." -ForegroundColor Green
        } catch {
            Write-Host "Error al crear el repositorio: $_" -ForegroundColor Red
            exit
        }
    } else {
        Write-Host "Error al conectar con GitHub: $_" -ForegroundColor Red
        exit
    }
}

# 2. Obtener la lista de archivos a subir
# Filtramos carpetas especiales y archivos irrelevantes
$excludeList = @(
    "node_modules",
    ".git",
    ".env",
    "repo.zip",
    "Project_Repositorios_Github-main",
    ".github", # Excluir workflow viejo si existe
    "database.json" # Excluir base de datos vieja
)

Write-Host "`nEscaneando archivos locales para subir..." -ForegroundColor Cyan
$files = Get-ChildItem -Path "." -Recurse -File | Where-Object {
    $relativePath = $_.FullName.Substring((Get-Item ".").FullName.Length + 1)
    $exclude = $false
    foreach ($item in $excludeList) {
        if ($relativePath -like "$item*" -or $relativePath -like "*\$item*") {
            $exclude = $true
            break
        }
    }
    -not $exclude
}

Write-Host "Se encontraron $($files.Count) archivos para subir." -ForegroundColor Green

# 3. Subir cada archivo
foreach ($file in $files) {
    # Calcular la ruta relativa para GitHub (usando barras diagonales /)
    $relPath = $file.FullName.Substring((Get-Item ".").FullName.Length + 1).Replace("\", "/")
    
    Write-Host "Subiendo: $relPath ... " -NoNewline -ForegroundColor Gray
    
    try {
        # Leer archivo como bytes y convertir a Base64 (admite texto y binario sin romper)
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $base64Content = [System.Convert]::ToBase64String($bytes)
        
        # Verificar si el archivo ya existe en GitHub para obtener su SHA (por si se actualiza)
        $sha = $null
        try {
            $fileInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repo/contents/$relPath" -Headers $headers -Method Get
            $sha = $fileInfo.sha
        } catch {
            # Si no existe, ignoramos el error
        }
        
        $body = @{
            message = "Subir $relPath"
            content = $base64Content
        }
        if ($sha) {
            $body.sha = $sha
        }
        
        $bodyJson = $body | ConvertTo-Json
        $uploadUrl = "https://api.github.com/repos/$username/$repo/contents/$relPath"
        
        $res = Invoke-RestMethod -Uri $uploadUrl -Headers $headers -Method Put -Body $bodyJson -ContentType "application/json"
        Write-Host "OK" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}

Write-Host "`n¡Proceso finalizado! Tu proyecto privado está disponible en: https://github.com/$username/$repo" -ForegroundColor Green
