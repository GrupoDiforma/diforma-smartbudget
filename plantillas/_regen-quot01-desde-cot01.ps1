# Regenera QUOT01 A-V1 como copia de COT01 A-V1 (estilos/formulas intactos) + etiquetas EN.
$ErrorActionPreference = "Stop"
$file = "C:\Users\Edwin_Laverde\Proyectos\diforma-smartbudget\plantillas\presupuesto-cotizacion-universal-REVISION.xlsx"
if (-not (Test-Path $file)) { throw "No existe $file" }

Get-Process Excel -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false

try {
    $wb = $excel.Workbooks.Open($file)

    function Get-Sheet([string]$name) {
        foreach ($s in @($wb.Worksheets)) {
            if ($s.Name -eq $name) { return $s }
        }
        $null
    }

    $cot = Get-Sheet "COT01 A-V1"
    if (-not $cot) { throw "Falta COT01 A-V1" }

    $oldQuot = Get-Sheet "QUOT01 A-V1"
    if ($oldQuot) {
        $oldQuot.Delete()
    }

    # Copia COT01; la copia se inserta antes de COT01
    [void]$cot.Copy($cot)

    $quot = $null
    foreach ($s in @($wb.Worksheets)) {
        if ($s.Name -ne "COT01 A-V1" -and $s.Name -like "COT01 A-V1*") {
            $quot = $s
            break
        }
    }
    if (-not $quot) { throw "No se pudo duplicar COT01" }
    $quot.Name = "QUOT01 A-V1"

    # Mover QUOT01 justo despues de COT01 (o antes, segun preferencia: Shipping, COT, QUOT...)
    # Dejar QUOT01 inmediatamente despues de COT01
    [void]$quot.Move($cot)

    # Traduccion ES -> EN (solo textos; formulas intactas)
    $map = @{}
    $map["TITULO SI APLICA"] = "HEADER IF APPLICABLE"
    $map["Imagen"] = "Project image"
    $map["Codigo de proyecto"] = "Project Code"
    $map["Descripcion"] = "Description"
    $map["Cantidad"] = "Quantity"
    $map["Precio unitario"] = "Unit Price"
    $map["Precio subtotal"] = "Extended Price"
    $map["Prorrateo"] = "Prorating"
    $map["% Comision"] = "% Commission"
    $map["Precio base"] = "Base price"
    $map["Total comision"] = "Total commission"
    $map["TOTAL PRODUCTOS / EXWORKS (USD)"] = "TOTAL PRODUCTS / EXWORKS (USD)"
    $map["COSTOS EN ORIGEN"] = "COSTS AT ORIGIN"
    $map["DETALLE LOGISTICO"] = "SHIPPING DETAILS"
    $map["FLETE AEREO"] = "AIR FREIGHT"
    $map["F. TERRESTRE"] = "LAND FREIGHT"
    $map["FLETE MARITIMO"] = "OCEAN FREIGHT"
    $map["SEGURO"] = "INSURANCE"
    $map["COSTOS EN DESTINO"] = "COSTS AT DESTINATION"
    $map["ARANCELES"] = "DUTIES"
    $map["IMPUESTOS"] = "TAXES"
    $map["ENVIO NACIONAL"] = "DOMESTIC SHIPPING"
    $map["MONTAJE E INSTALACION"] = "INSTALLATION"
    $map["BODEGAJE"] = "WAREHOUSING"
    $map["OTRO (NACIONAL)"] = "OTHER (DOMESTIC)"
    $map["TOTAL COSTO LOGISTICO"] = "TOTAL LOGISTICS COST"
    $map["CIF + PRECIO DESTINO (USD)"] = "CIF + DESTINATION PRICE (USD)"
    $map["VALOR CON IVA:"] = "TOTAL PRICE WITH VAT:"
    $map["VALOR ANTICIPO:"] = "ADVANCE PAYMENT:"
    $map["VALOR SALDO:"] = "BALANCE DUE:"
    $map["DIFERENCIA DE VALIDACION"] = "VALIDATION DIFFERENCE"
    $map["MEJOR COSTO LOGISTICO:"] = "BEST SHIPPING COST:"
    $map["GRAN TOTAL (USD)"] = "GRAND TOTAL (USD)"
    $map["INCOTERM: "] = "INCOTERM: "
    $map["INCOTERM:"] = "INCOTERM:"

    $used = $quot.UsedRange
    if ($null -ne $used) {
        $nRows = $used.Rows.Count
        $nCols = [Math]::Min([int]$used.Columns.Count, 9)
        for ($r = 1; $r -le $nRows; $r++) {
            for ($c = 1; $c -le $nCols; $c++) {
                $cell = $quot.Cells.Item($r, $c)
                # No tocar si tiene formula
                $f = $null
                try { $f = $cell.Formula } catch {}
                if ($f -and ($f -is [string]) -and $f.StartsWith("=")) { continue }

                $v = $cell.Value2
                if ($v -is [string]) {
                    $trim = $v.Trim()
                    $key = ($trim -replace "(`r`n|`n)", " ").Trim()
                    if ($map.ContainsKey($trim)) {
                        $cell.Value2 = $map[$trim]
                    } elseif ($map.ContainsKey($key)) {
                        $cell.Value2 = $map[$key]
                    } elseif ($trim.StartsWith("Nota: El IVA mostrado")) {
                        $cell.Value2 = "Note: VAT shown above only applies when enabled in the quote. Final invoice may vary by delivery address."
                    }
                }
            }
        }
    }

    # Comentarios EN en celdas de decision
    function Set-Comment($cell, $text) {
        try { [void]$cell.ClearComments() } catch {}
        [void]$cell.AddComment($text)
    }
    Set-Comment $quot.Cells.Item(2, 9) "INPUT: commercial commission %"
    # G21 / G22 IVA y anticipo (arriba); G31 BEST SHIPPING; G33/G34 abajo
    Set-Comment $quot.Cells.Item(21, 7) "INPUT: VAT %"
    Set-Comment $quot.Cells.Item(22, 7) "INPUT: advance payment %"
    Set-Comment $quot.Cells.Item(31, 7) "INPUT: % of GRAND TOTAL for logistics line. Rest stays in product lines."
    Set-Comment $quot.Cells.Item(33, 7) "INPUT: VAT %"
    Set-Comment $quot.Cells.Item(34, 7) "INPUT: advance payment %"

    # Actualizar README si existe
    $readme = Get-Sheet "README revision"
    if ($readme) {
        $readme.Cells.Item(1, 1).Value2 = "SmartBudget - plantilla cotizacion universal (COT01 master / QUOT01 = EN)"
        $readme.Cells.Item(2, 1).Value2 = "COT01 A-V1 es la base (modificaciones del usuario). QUOT01 A-V1 se regenero como copia EN con las mismas formulas y estilos."
        $readme.Cells.Item(3, 1).Value2 = "Listo para cargar en Ajustes > Conexiones > Plantilla Excel (Analizar y publicar)."
    }

    $wb.Save()
    $wb.Close($true)
    Write-Output "OK -> $file"
}
finally {
    $excel.Quit() | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
