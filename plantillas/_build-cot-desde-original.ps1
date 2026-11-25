# Ajusta QUOT01/COT01 conservando el diseno original (Excel COM).
$ErrorActionPreference = "Stop"
$src = "G:\Unidades compartidas\GD-Compras y Presupuestos\Formatos\Formatos de presupuestos\presupuesto No.10000-A.xlsx"
$outDir = "C:\Users\Edwin_Laverde\Proyectos\diforma-smartbudget\plantillas"
$out = Join-Path $outDir "presupuesto-cotizacion-universal-REVISION.xlsx"

if (-not (Test-Path $src)) { throw "No se encuentra la plantilla fuente" }
Copy-Item -LiteralPath $src -Destination $out -Force

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.ScreenUpdating = $false

try {
    $wb = $excel.Workbooks.Open($out)

    function Get-Sheet([string]$name) {
        foreach ($s in @($wb.Worksheets)) {
            if ($s.Name -eq $name) { return $s }
        }
        $null
    }

    function Copy-RowStyle($ws, $fromRow, $toRow) {
        [void]$ws.Rows.Item($fromRow).Copy()
        [void]$ws.Rows.Item($toRow).PasteSpecial(-4122) # xlPasteFormats
    }

    function Set-Yellow($cell) {
        $cell.Interior.Color = 65535
    }

    # ===== QUOT01 =====
    $q = Get-Sheet "QUOT01 A-V1"
    if (-not $q) { throw "Falta QUOT01 A-V1" }

    $insertAt = 15
    $endIns = $insertAt + 4
    $rangeIns = "${insertAt}:${endIns}"
    [void]$q.Rows.Item($rangeIns).Insert(-4121) # xlDown

    $styleFrom = 9
    $newLabels = @(
        "DOMESTIC SHIPPING",
        "INSTALLATION",
        "WAREHOUSING",
        "OTHER (DOMESTIC)",
        "INLAND FREIGHT"
    )
    for ($i = 0; $i -lt 5; $i++) {
        $r = $insertAt + $i
        Copy-RowStyle $q $styleFrom $r
        try { [void]$q.Range($q.Cells.Item($r, 1), $q.Cells.Item($r, 5)).UnMerge() } catch {}
        [void]$q.Range($q.Cells.Item($r, 1), $q.Cells.Item($r, 5)).Merge()
        $q.Cells.Item($r, 1).Value2 = $newLabels[$i]
        $q.Cells.Item($r, 6).Value2 = 0
    }

    $incotermRow = 20
    $shipTotalRow = 25
    $bestRow = 33
    $ddpRow = 34

    $q.Cells.Item($incotermRow, 6).Formula = "=SUM(F6:F19)"
    $q.Cells.Item($shipTotalRow, 6).Formula = "=SUM(F7:F19)"

    for ($r = $insertAt; $r -le $endIns; $r++) {
        $q.Cells.Item($r, 7).Formula = "=F$r/`$F`$$incotermRow"
    }

    # Pago: IVA / Anticipo / Saldo despues de TOTAL DDP
    $payAt = $ddpRow + 1
    $payEnd = $payAt + 2
    $rangePay = "${payAt}:${payEnd}"
    [void]$q.Rows.Item($rangePay).Insert(-4121)

    $payStyle = 21
    $payLabels = @(
        "TOTAL PRICE WITH VAT:",
        "ADVANCE PAYMENT:",
        "BALANCE DUE:"
    )
    $ivaRow = $payAt
    $antRow = $payAt + 1
    $salRow = $payAt + 2

    for ($i = 0; $i -lt 3; $i++) {
        $r = $payAt + $i
        Copy-RowStyle $q $payStyle $r
        try { [void]$q.Range($q.Cells.Item($r, 1), $q.Cells.Item($r, 4)).UnMerge() } catch {}
        [void]$q.Range($q.Cells.Item($r, 1), $q.Cells.Item($r, 4)).Merge()
        $q.Cells.Item($r, 1).Value2 = $payLabels[$i]
    }

    $q.Cells.Item($ivaRow, 5).Value2 = 0.19
    Set-Yellow $q.Cells.Item($ivaRow, 5)
    $q.Cells.Item($ivaRow, 5).NumberFormat = "0%"
    $q.Cells.Item($ivaRow, 6).Formula = "=F$ddpRow*(1+E$ivaRow)"
    $q.Cells.Item($ivaRow, 6).NumberFormat = "`"$`"#,##0.00"

    $q.Cells.Item($antRow, 5).Value2 = 0.5
    Set-Yellow $q.Cells.Item($antRow, 5)
    $q.Cells.Item($antRow, 5).NumberFormat = "0%"
    $q.Cells.Item($antRow, 6).Formula = "=F$ivaRow*E$antRow"
    $q.Cells.Item($antRow, 6).NumberFormat = "`"$`"#,##0.00"

    $q.Cells.Item($salRow, 5).Value2 = ""
    $q.Cells.Item($salRow, 6).Formula = "=F$ivaRow-F$antRow"
    $q.Cells.Item($salRow, 6).NumberFormat = "`"$`"#,##0.00"

    try { [void]$q.Cells.Item($bestRow, 7).ClearComments() } catch {}
    [void]$q.Cells.Item($bestRow, 7).AddComment("INPUT: % of GRAND TOTAL for logistics line. Rest stays in product lines.")
    Set-Yellow $q.Cells.Item($bestRow, 7)

    try { [void]$q.Cells.Item(2, 9).ClearComments() } catch {}
    [void]$q.Cells.Item(2, 9).AddComment("INPUT: commercial commission %")

    foreach ($addr in @("H3", "H4", "H5")) {
        if ($q.Range($addr).Value2 -eq "Pecio Base") { $q.Range($addr).Value2 = "Precio Base" }
    }

    # ===== COT01 = copia de QUOT01 + textos ES =====
    $oldCot = Get-Sheet "COT01 A-V1"
    if ($oldCot) {
        $refName = "COT01 original (ref)"
        $taken = $false
        foreach ($s in @($wb.Worksheets)) { if ($s.Name -eq $refName) { $taken = $true } }
        if ($taken) { $oldCot.Name = "COT01 original (ref) 2" } else { $oldCot.Name = $refName }
    }

    [void]$q.Copy($q)
    $cot = $null
    foreach ($s in @($wb.Worksheets)) {
        if ($s.Name -ne "QUOT01 A-V1" -and $s.Name -like "QUOT01 A-V1*") { $cot = $s; break }
    }
    if (-not $cot) { throw "No se pudo duplicar QUOT01" }
    $cot.Name = "COT01 A-V1"

    $map = @{}
    $map["HEADER IF APPLICABLE"] = "TITULO SI APLICA"
    $map["Project image"] = "Imagen"
    $map["Project Code"] = "Codigo de proyecto"
    $map["Description"] = "Descripcion"
    $map["Quantity"] = "Cantidad"
    $map["Unit Price"] = "Precio unitario"
    $map["Extended Price"] = "Precio subtotal"
    $map["Prorrating"] = "Prorrateo"
    $map["% Comision"] = "% Comision"
    $map["Precio Base"] = "Precio base"
    $map["Pecio Base"] = "Precio base"
    $map["Total Comision"] = "Total comision"
    $map["TOTAL EXWORKS PRICE (USD)"] = "TOTAL PRODUCTOS / EXWORKS (USD)"
    $map["SHIPPING DETAILS"] = "DETALLE LOGISTICO"
    $map["AIR / LAND"] = "AEREO / TERRESTRE"
    $map["SEA"] = "MARITIMO"
    $map["DOMESTIC SHIPPING"] = "ENVIO NACIONAL"
    $map["INSTALLATION"] = "MONTAJE E INSTALACION"
    $map["WAREHOUSING"] = "BODEGAJE"
    $map["OTHER (DOMESTIC)"] = "OTRO (NACIONAL)"
    $map["INLAND FREIGHT"] = "FLETE TERRESTRE"
    $map["INSURANCE"] = "SEGURO"
    $map["DUTY"] = "DUTIES / ARANCELES"
    $map["TAXES"] = "TAXES"
    $map["COSTS AT ORIGIN"] = "COSTOS EN ORIGEN"
    $map["COSTS AT DESTINATION"] = "COSTOS EN DESTINO"
    $map["CONSOLIDATED EXPORT COST"] = "COSTO LOGISTICO CONSOLIDADO"
    $map["CIF + DESTINATION PRICE (USD)"] = "CIF + PRECIO DESTINO (USD)"
    $map["PAY UP TO DATE / PAY IN ADVANCE:"] = "PAGO DE CONTADO / ANTICIPADO:"
    $map["PAYMENT IN 30 DAYS:"] = "PAGO A 30 DIAS:"
    $map["PAYMENT IN 60 DAYS:"] = "PAGO A 60 DIAS:"
    $map["TOTAL SHIPPING COST (USD)"] = "TOTAL COSTO LOGISTICO (USD)"
    $map["DIFERENCIA DE VALIDACION"] = "DIFERENCIA DE VALIDACION"
    $map["BEST SHIPPING COST:"] = "MEJOR COSTO LOGISTICO:"
    $map["TOTAL DDP PRICE (USD)"] = "GRAN TOTAL (USD)"
    $map["TOTAL PRICE WITH VAT:"] = "VALOR CON IVA:"
    $map["ADVANCE PAYMENT:"] = "VALOR ANTICIPO:"
    $map["BALANCE DUE:"] = "VALOR SALDO:"

    $used = $cot.UsedRange
    if ($null -ne $used) {
        $nRows = $used.Rows.Count
        $nCols = [Math]::Min($used.Columns.Count, 9)
        for ($r = 1; $r -le $nRows; $r++) {
            for ($c = 1; $c -le $nCols; $c++) {
                $cell = $cot.Cells.Item($r, $c)
                $v = $cell.Value2
                if ($v -is [string]) {
                    $trim = $v.Trim()
                    $key = ($trim -replace "(`r`n|`n)", " ").Trim()
                    if ($map.ContainsKey($trim)) {
                        $cell.Value2 = $map[$trim]
                    } elseif ($map.ContainsKey($key)) {
                        $cell.Value2 = $map[$key]
                    } elseif ($trim.StartsWith("Note: Applicable taxes")) {
                        $cell.Value2 = "Nota: El IVA mostrado solo aplica si esta activo en la cotizacion. La factura final puede variar segun la direccion de entrega."
                    }
                }
            }
        }
    }

    try { [void]$cot.Cells.Item(2, 9).ClearComments() } catch {}
    [void]$cot.Cells.Item(2, 9).AddComment("ENTRADA: % comision comercial")
    try { [void]$cot.Cells.Item($bestRow, 7).ClearComments() } catch {}
    [void]$cot.Cells.Item($bestRow, 7).AddComment("ENTRADA: % del GRAN TOTAL de la linea logistica visible. El resto queda en productos.")
    try { [void]$cot.Cells.Item($ivaRow, 5).ClearComments() } catch {}
    [void]$cot.Cells.Item($ivaRow, 5).AddComment("ENTRADA: % IVA")
    try { [void]$cot.Cells.Item($antRow, 5).ClearComments() } catch {}
    [void]$cot.Cells.Item($antRow, 5).AddComment("ENTRADA: % anticipo")

    # ===== README =====
    $readme = Get-Sheet "README revision"
    if (-not $readme) {
        $readme = $wb.Worksheets.Add()
        $readme.Name = "README revision"
    }
    $readme.Cells.Item(1, 1).Value2 = "SmartBudget - revision plantilla cotizacion (diseno original conservado)"
    $readme.Cells.Item(1, 1).Font.Bold = $true
    $txt = @(
        "",
        "Enfoque: partimos del QUOT01 original. Solo se insertaron filas y se ampliaron SUM; estilos/fuentes/tamanos se mantienen.",
        "",
        "QUOT01 A-V1 (EN, universal nacional+exportacion):",
        "  - Filas nuevas: DOMESTIC SHIPPING, INSTALLATION, WAREHOUSING, OTHER (DOMESTIC), INLAND FREIGHT",
        "  - SUM destino y TOTAL SHIPPING incluyen esas filas",
        "  - Tras TOTAL DDP: TOTAL PRICE WITH VAT, ADVANCE PAYMENT, BALANCE DUE (% amarillos + formulas)",
        "  - G BEST SHIPPING = % del gran total (diseno original)",
        "  - I2 % comision (original)",
        "",
        "COT01 A-V1: copia del QUOT01 ajustado con etiquetas en espanol (mismas formulas y estilos).",
        "COT01 original (ref): hoja nacional vieja, solo referencia.",
        "QUOT02 / COT02: sin cambios.",
        "EXP / NAL / ADMIN / materiales: sin cambios.",
        "",
        "La app al exportar solo escribe valores; Excel calcula con las formulas del formato.",
        "Si hay mas items/costos que filas modelo, la app insertara filas clonando el estilo (como en presupuestos)."
    )
    for ($i = 0; $i -lt $txt.Count; $i++) {
        $readme.Cells.Item($i + 2, 1).Value2 = $txt[$i]
    }
    $readme.Columns.Item(1).ColumnWidth = 110
    [void]$readme.Move([System.Reflection.Missing]::Value, $wb.Worksheets.Item($wb.Worksheets.Count))

    $wb.Save()
    $wb.Close($true)
    Write-Output "OK -> $out"
    Write-Output "incotermRow=$incotermRow shipTotalRow=$shipTotalRow bestRow=$bestRow ddpRow=$ddpRow ivaRow=$ivaRow antRow=$antRow salRow=$salRow"
}
finally {
    $excel.Quit() | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
