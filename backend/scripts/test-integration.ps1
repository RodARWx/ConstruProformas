# Script de pruebas de integracion - Construproformas API
# Uso: .\scripts\test-integration.ps1
# Requisito: servidor corriendo en http://localhost:3000 (npm run start:dev)

$ErrorActionPreference = "Continue"

$base = "http://localhost:3000/api"
$headers = @{ "X-API-KEY" = "construproformas-dev-key" }
$script:testProformaId = $null

function Test-Endpoint {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host ""
    Write-Host "--- $Name ---" -ForegroundColor Cyan
    try {
        & $Action
        Write-Host "OK" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "FALLO: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
        }
        return $false
    }
}

Write-Host "Construproformas - Pruebas de integracion" -ForegroundColor White
Write-Host "Base URL: $base"

Test-Endpoint "Health (sin API Key)" {
    $r = Invoke-RestMethod -Uri "$base/health" -Method Get
    if ($r.status -ne "ok") { throw "Health check fallo" }
    $r | ConvertTo-Json
}

Test-Endpoint "Auth - sin X-API-KEY (esperado 401)" {
    try {
        Invoke-RestMethod -Uri "$base/profiles" -Method Get
        throw "Deberia haber retornado 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) {
            throw "Se esperaba 401, obtuvo: $($_.Exception.Response.StatusCode)"
        }
        Write-Host "401 Unauthorized (correcto)"
    }
}

Test-Endpoint "GET /profiles" {
    $r = Invoke-RestMethod -Uri "$base/profiles" -Headers $headers
    $r | ConvertTo-Json -Depth 3
}

Test-Endpoint "GET /customers" {
    $r = Invoke-RestMethod -Uri "$base/customers" -Headers $headers
    $r | ConvertTo-Json -Depth 3
}

Test-Endpoint "POST /catalog" {
    $body = @{
        codigoSugerido = "R-TEST-$(Get-Date -Format 'HHmmss')"
        descripcion    = "Excavacion manual test"
        unidad         = "m3"
        costoUnitario  = 25.5
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/catalog" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    $r | ConvertTo-Json -Depth 3
}

Test-Endpoint "GET /catalog/search?q=excav" {
    # El ampersand (&) debe ir dentro de comillas simples para PowerShell
    $searchUri = $base + '/catalog/search?q=excav&limit=5'
    $r = Invoke-RestMethod -Uri $searchUri -Headers $headers
    $r | ConvertTo-Json -Depth 3
}

Test-Endpoint "GET /proformas/next-id" {
    $r = Invoke-RestMethod -Uri "$base/proformas/next-id" -Headers $headers
    $r | ConvertTo-Json
}

Test-Endpoint "POST /proformas (crear con next-id)" {
    $nextId = (Invoke-RestMethod -Uri "$base/proformas/next-id" -Headers $headers).suggestedId
    $script:testProformaId = $nextId
    Write-Host "Usando ID sugerido: $nextId"
    $body = @{
        idProforma     = $nextId
        nombreProyecto = "Proyecto Integracion"
        fecha          = (Get-Date -Format "yyyy-MM-dd")
        profileId      = 1
        customerId     = 1
        detalles       = @(
            @{
                descripcion     = "Excavacion manual"
                unidad          = "m3"
                cantidad        = 10
                costoUnitario   = 25.5
                diasLaborables  = 1
                ivaPercentage   = 15
            }
        )
    } | ConvertTo-Json -Depth 5
    $r = Invoke-RestMethod -Uri "$base/proformas" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Proforma creada: $($r.idProforma)"
    $r | ConvertTo-Json -Depth 5
}

if ($script:testProformaId) {
    Test-Endpoint "POST /proformas/:id/clone" {
        $cloneUri = "$base/proformas/$($script:testProformaId)/clone"
        $r = Invoke-RestMethod -Uri $cloneUri -Method Post -Headers $headers
        Write-Host "Clon creado: $($r.idProforma)"
        $r | ConvertTo-Json -Depth 3
    }
}

Write-Host ""
Write-Host "=== Pruebas de integracion finalizadas ===" -ForegroundColor White
