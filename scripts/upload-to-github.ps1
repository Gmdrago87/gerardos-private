param (
    [string]$pat,
    [string]$username = "GerardMaestre",
    [string]$repo = "gerardos-private"
)

$ErrorActionPreference = 'Stop'

# Liberación segura de memoria para token PAT
if (-not $pat) {
    $securePat = Read-Host "Introduce tu Token de Acceso Personal (PAT) de GitHub (no se mostrará en pantalla)" -AsSecureString
    if (-not $securePat) {
        Write-Host "Error: Se requiere el token." -ForegroundColor Red
        exit 1
    }
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePat)
    try {
        $pat = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

$headers = @{
    "Authorization" = "token $pat"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "PowerShell-Uploader-UltraFast"
}

# 1. Verificar/Crear Repositorio
Write-Host "Verificando el repositorio '$username/$repo'..." -ForegroundColor Cyan
try {
    $null = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repo" -Headers $headers -Method Get
    Write-Host "El repositorio ya existe." -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "El repositorio no existe. Creándolo como privado..." -ForegroundColor Yellow
        try {
            $body = @{
                name = $repo
                private = $true
                description = "GerardOS Private Dashboard"
            } | ConvertTo-Json
            $null = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $body -ContentType "application/json"
            Write-Host "Repositorio privado creado con éxito." -ForegroundColor Green
        } catch {
            Write-Host "Error al crear el repositorio: $_" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Error al conectar con GitHub: $_" -ForegroundColor Red
        exit 1
    }
}

# 2. Precargar SHAs existentes en 1 sola llamada (Map O(1) en lugar de N peticiones HTTP)
$existingShas = @{}
try {
    $treeRes = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repo/git/trees/main?recursive=1" -Headers $headers -Method Get
    if ($treeRes.tree) {
        foreach ($item in $treeRes.tree) {
            if ($item.type -eq "blob") {
                $existingShas[$item.path] = $item.sha
            }
        }
    }
} catch {
    # Si la rama main aún no existe, continuamos vacíos
}

# 3. Escaneo FS optimizado omitiendo directorios pesados (.git, node_modules, .wrangler)
$excludeDirs = @('node_modules', '.git', '.wrangler', '.vscode', 'Project_Repositorios_Github-main')
$excludeFiles = @('.env', 'repo.zip', 'database.json')

$rootPath = (Get-Item ".").FullName
$files = Get-ChildItem -Path "." -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($rootPath.Length + 1).Replace("\", "/")
    
    # Omitir si alguna carpeta excluida está en la ruta
    foreach ($dir in $excludeDirs) {
        if ($rel.StartsWith("$dir/") -or $rel.Contains("/$dir/")) { return $false }
    }
    # Omitir archivos excluidos
    foreach ($file in $excludeFiles) {
        if ($rel -eq $file) { return $false }
    }
    return $true
}

Write-Host "Se encontraron $($files.Count) archivos elegibles para sincronización." -ForegroundColor Green

# 4. Subida directa utilizando el mapa de SHAs O(1)
foreach ($file in $files) {
    $relPath = $file.FullName.Substring($rootPath.Length + 1).Replace("\", "/")
    Write-Host "Subiendo: $relPath ... " -NoNewline -ForegroundColor Gray
    
    try {
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $base64Content = [System.Convert]::ToBase64String($bytes)
        
        $body = @{
            message = "Update $relPath"
            content = $base64Content
        }
        
        # Inyectar SHA si ya existía el archivo sin hacer petición HTTP previa
        if ($existingShas.ContainsKey($relPath)) {
            $body.sha = $existingShas[$relPath]
        }
        
        $bodyJson = $body | ConvertTo-Json
        $uploadUrl = "https://api.github.com/repos/$username/$repo/contents/$relPath"
        
        $null = Invoke-RestMethod -Uri $uploadUrl -Headers $headers -Method Put -Body $bodyJson -ContentType "application/json"
        Write-Host "OK" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}

Write-Host "`n¡Proceso finalizado! Repositorio accesible en: https://github.com/$username/$repo" -ForegroundColor Green

