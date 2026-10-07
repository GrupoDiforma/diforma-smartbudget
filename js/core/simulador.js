// ==========================================
// ESTADO LOCAL DE LA APLICACIÓN
// ==========================================
let itemsPresupuesto = [];
const CATEGORIAS = ["Materias Primas", "Procesos Externos", "Procesos Internos", "Mano de Obra", "Empaque y Fletes", "Comercialización"];

document.addEventListener('DOMContentLoaded', () => {
    // Renderizar la tabla vacía al inicio
    renderizarTablaItems();
    
    // Conectar el botón "Fila Manual" de la interfaz
    const btnManual = document.querySelector('button i.bi-plus-lg').parentElement;
    if(btnManual) {
        btnManual.onclick = agregarItemTemporal;
    }
});

// ==========================================
// RENDERIZADO DE LA TABLA
// ==========================================
function renderizarTablaItems() {
    const thead = document.getElementById('theadItems');
    const tbody = document.getElementById('tbodyItems');
    
    if(!thead || !tbody) return;

    // Cabeceras de la tabla
    let theadHtml = `
        <tr>
          <th style="width:40px;" class="text-center">#</th>
          <th style="width:100px;">Fuente</th>
          <th>Descripción del Material / Proceso</th>
          <th style="width:160px;">Categoría</th>
          <th style="width:90px;" class="text-center">Cant.</th>
          <th style="width:90px;" class="text-center">U.M.</th>
          <th style="width:130px;" class="text-end">$ Unitario</th>
          <th style="width:130px;" class="text-end">$ Subtotal</th>
          <th style="width:50px;" class="text-center"><i class="bi bi-gear"></i></th>
        </tr>
    `;
    thead.innerHTML = theadHtml;

    // Estado vacío
    if (itemsPresupuesto.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5"><i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>Matriz vacía. Haz clic en "Fila Manual" para comenzar a presupuestar.</td></tr>`;
        return;
    }

    // Renderizar filas dinámicas
    let tbodyHtml = "";
    itemsPresupuesto.forEach((item, idx) => {
        let catOptions = CATEGORIAS.map(c => `<option value="${c}" ${item.categoria === c ? 'selected' : ''}>${c}</option>`).join('');
        let valUnit = item.costoUnitario || 0;
        let valTot = valUnit * item.cantidad;

        tbodyHtml += `
          <tr>
            <td class="text-center align-middle fw-bold text-muted">${idx + 1}</td>
            <td class="align-middle"><span class="badge bg-secondary w-100">${item.fuente}</span></td>
            <td><input type="text" class="form-control form-control-sm" value="${item.nombre}" onchange="actualizarCampo(${item.id}, 'nombre', this.value)"></td>
            <td><select class="form-select form-select-sm" onchange="actualizarCampo(${item.id}, 'categoria', this.value)">${catOptions}</select></td>
            <td><input type="number" class="form-control form-control-sm text-center" value="${item.cantidad}" step="any" onchange="actualizarCampo(${item.id}, 'cantidad', this.value)"></td>
            <td>
                <select class="form-select form-select-sm text-center" onchange="actualizarCampo(${item.id}, 'um', this.value)">
                    <option ${item.um === 'UND' ? 'selected' : ''}>UND</option>
                    <option ${item.um === 'MT' ? 'selected' : ''}>MT</option>
                    <option ${item.um === 'KG' ? 'selected' : ''}>KG</option>
                </select>
            </td>
            <td><input type="number" class="form-control form-control-sm text-end fw-bold" style="color: var(--diforma-red);" value="${valUnit}" onchange="actualizarCampo(${item.id}, 'costoUnitario', this.value)"></td>
            <td class="text-end align-middle fw-bold" style="background-color: var(--w11-bg);">$${valTot.toLocaleString('es-CO')}</td>
            <td class="text-center align-middle">
                <button class="btn btn-sm btn-outline-danger border-0 py-0 px-1" onclick="eliminarItem(${item.id})" title="Eliminar fila"><i class="bi bi-trash fs-6"></i></button>
            </td>
          </tr>
        `;
    });
    tbody.innerHTML = tbodyHtml;
}

// ==========================================
// FUNCIONES CRUD DE LA MATRIZ
// ==========================================
function agregarItemTemporal() { 
    let nItem = { 
        id: Date.now(), 
        fuente: "[Manual]", 
        nombre: "", 
        categoria: "Materias Primas", 
        cantidad: 1, 
        um: "UND", 
        costoUnitario: 0 
    }; 
    itemsPresupuesto.push(nItem); 
    renderizarTablaItems(); 
}

function actualizarCampo(id, campo, valor) { 
    const item = itemsPresupuesto.find(i => i.id === id); 
    if(item) { 
        item[campo] = (campo === 'cantidad' || campo === 'costoUnitario') ? parseFloat(valor) || 0 : valor; 
        renderizarTablaItems(); 
    } 
}

function eliminarItem(id) { 
    itemsPresupuesto = itemsPresupuesto.filter(i => i.id !== id); 
    renderizarTablaItems(); 
}
