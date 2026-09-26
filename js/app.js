// ============================================================
// APP PRINCIPAL — CONVALIDACIÓN 2
// ============================================================

let archivoSeleccionado = null;
let materiasSeleccionadas = new Set();
let ultimoResultado = null;
let electivasElegidas = {};
let timeoutProcesar = null;

// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    btn.classList.add('tab-active');
    document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
    const tab = document.getElementById(`tab-${btn.dataset.tab}`);
    if (tab) tab.classList.remove('hidden');
    if (btn.dataset.tab === 'convalidadas' && ultimoResultado) {
      renderConvalidadas();
    }
  });
});
document.querySelector('[data-tab="estudiante"]')?.classList.add('tab-active');

// ============================================================
// MÉTODOS DE INGRESO
// ============================================================
const metodoArchivo = document.getElementById('metodo-archivo');
const metodoManual = document.getElementById('metodo-manual');
const zonaArchivo = document.getElementById('zona-archivo');

metodoArchivo?.addEventListener('click', () => {
  metodoArchivo.classList.add('border-indigo-500', 'bg-indigo-50');
  metodoManual?.classList.remove('border-indigo-500', 'bg-indigo-50');
  zonaArchivo?.classList.remove('hidden');
});

metodoManual?.addEventListener('click', () => {
  metodoManual.classList.add('border-indigo-500', 'bg-indigo-50');
  metodoArchivo?.classList.remove('border-indigo-500', 'bg-indigo-50');
  zonaArchivo?.classList.add('hidden');
});
metodoManual?.click();

// ============================================================
// INICIALIZAR
// ============================================================
async function init() {
  await cargarDatos();

  const menciones98 = getMenciones1998();
  const menciones23 = getMenciones2023();

  const sel98 = document.getElementById('mencion-1998');
  sel98.innerHTML = '<option value="">-- Selecciona --</option>';
  menciones98.forEach(m => sel98.innerHTML += `<option value="${m}">${m}</option>`);
  if (menciones98.length) sel98.value = menciones98[0];

  const sel23 = document.getElementById('mencion-2023');
  sel23.innerHTML = '<option value="">-- Selecciona --</option>';
  menciones23.forEach(m => sel23.innerHTML += `<option value="${m}">${m}</option>`);
  if (menciones23.length) sel23.value = menciones23[0];

  sel98.addEventListener('change', () => {
    materiasSeleccionadas.clear();
    ultimoResultado = null;
    electivasElegidas = {};
    renderListaMaterias();
    ocultarBotones();
    actualizarContadores();
  });

  sel23.addEventListener('change', () => {
    materiasSeleccionadas.clear();
    ultimoResultado = null;
    electivasElegidas = {};
    renderListaMaterias();
    ocultarBotones();
    actualizarContadores();
  });

  renderListaMaterias();
}

// ============================================================
// RENDER LISTA MATERIAS
// ============================================================
function renderListaMaterias() {
  const cont = document.getElementById('lista-materias');
  const mencion98 = document.getElementById('mencion-1998').value;
  if (!mencion98) {
    cont.innerHTML = '<div class="p-6 text-center text-slate-500">Selecciona una mención 1998</div>';
    return;
  }

  const materias = getMaterias1998(mencion98);
  const filtro = (document.getElementById('buscador').value || '').toUpperCase();

  cont.innerHTML = '';
  let visibles = 0;

  materias.forEach(m => {
    if (filtro && !m.codigo.includes(filtro) && !m.nombre.toUpperCase().includes(filtro)) return;
    visibles++;

    const sel = materiasSeleccionadas.has(m.codigo);
    let col2023 = '<div class="text-slate-400 text-sm">—</div>';
    let col2025 = '<div class="text-slate-400 text-sm">—</div>';

    if (ultimoResultado) {
      const det = ultimoResultado.detalle.find(d => d.cod_1998 === m.codigo);
      if (det) {
        if (det.cod_2023 && det.cod_2023 !== 'ELECTIVA') {
          col2023 = `<span class="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-semibold">${det.cod_2023}</span><div class="text-sm mt-1">${det.nombre_2023 || ''}</div>`;
        } else if (det.cod_2023 === 'ELECTIVA') {
          col2023 = '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">ELECTIVA</span>';
        } else {
          col2023 = '<div class="text-red-700 text-sm">❌ No convalida</div>';
        }

        if (det.estado === 'convalidada') {
          col2025 = `<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">✅ Convalidada</span><div class="text-xs mt-1 font-mono">${det.cod_2023}</div><div class="text-sm">${det.nombre_2023 || ''}</div>`;
        } else if (det.estado === 'electiva_pendiente') {
          col2025 = '<div class="bg-yellow-50 border border-yellow-300 rounded-lg p-2 text-xs text-yellow-800">⚠️ Elige en el panel de electivas</div>';
        } else if (det.estado === 'no_convalida' || det.estado === 'no_encontrada') {
          col2025 = '<div class="text-red-700 text-sm">❌ No convalida</div>';
        }
      }
    } else if (sel) {
      col2023 = '<div class="text-slate-400 text-sm">...</div>';
      col2025 = '<div class="text-slate-400 text-sm">...</div>';
    }

          cont.innerHTML += `
            <div class="row-materia grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700 ${sel ? 'selected' : ''}">
             <div class="p-3 flex items-start gap-2">
             <input type="checkbox" class="mt-1 w-5 h-5 checkbox-materia" data-codigo="${m.codigo}" ${sel ? 'checked' : ''}>
            <div>
            <div class="inline-block bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded mb-1">${m.codigo}</div>
            <div class="font-semibold text-sm">${m.nombre}</div>
          </div>
        </div>
        <div class="p-3">${col2023}</div>
        <div class="p-3">${col2025}</div>
      </div>
    `;
  });

  if (visibles === 0) {
    cont.innerHTML = '<div class="p-6 text-center text-slate-500">No se encontraron materias.</div>';
  }

  document.querySelectorAll('.checkbox-materia').forEach(cb => {
    cb.addEventListener('change', e => {
      const cod = e.target.dataset.codigo;
      if (e.target.checked) materiasSeleccionadas.add(cod);
      else materiasSeleccionadas.delete(cod);
      actualizarContadores();
      clearTimeout(timeoutProcesar);
      timeoutProcesar = setTimeout(procesar, 300);
    });
  });

  actualizarContadores();
}

// ============================================================
// PROCESAR CONVALIDACIÓN
// ============================================================
function procesar() {
  const cedula = document.getElementById('cedula-estudiante').value || 'SIN-CEDULA';
  const nombre = document.getElementById('nombre-estudiante').value || 'SIN-NOMBRE';
  const mencion98 = document.getElementById('mencion-1998').value;
  const mencion23 = document.getElementById('mencion-2023').value;

  if (!mencion98 || !mencion23 || materiasSeleccionadas.size === 0) return;

  ultimoResultado = convalidar(
    cedula, nombre, mencion98, mencion23,
    Array.from(materiasSeleccionadas),
    electivasElegidas
  );

  renderListaMaterias();
  renderPanelElectivas();
  renderConvalidadas();
  actualizarContadores();
  mostrarBotones();
}

// ============================================================
// PANEL DE ELECTIVAS
// ============================================================
function renderPanelElectivas() {
  const panel = document.getElementById('panel-electivas');
  const cont = document.getElementById('lista-electivas');
  if (!panel || !cont) return;

  if (!ultimoResultado) { panel.classList.add('hidden'); return; }

  const pendientes = ultimoResultado.detalle.filter(d => d.estado === 'electiva_pendiente');
  if (pendientes.length === 0) { panel.classList.add('hidden'); return; }

  panel.classList.remove('hidden');

  const mencion23 = document.getElementById('mencion-2023').value;
  const mallaMencion = getElectivasDisponibles(mencion23);
  console.log(`🎯 Electivas disponibles para "${mencion23}": ${mallaMencion.length}`);

  cont.innerHTML = '';
  pendientes.forEach((det, i) => {
    const elegida = electivasElegidas[det.cod_1998] || '';
    const opciones = mallaMencion.map(m =>
      `<option value="${m.codigo}" ${m.codigo === elegida ? 'selected' : ''}>${m.codigo} · ${m.nombre} (Sem ${m.semestre})</option>`
    ).join('');

    cont.innerHTML += `
      <div class="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4">
        <div class="flex items-start gap-3 mb-2">
          <div class="w-8 h-8 bg-yellow-400 text-white rounded-full flex items-center justify-center font-bold">${i + 1}</div>
          <div class="flex-1">
            <div class="font-mono text-xs">${det.cod_1998}</div>
            <div class="font-bold">${det.nombre_1998}</div>
            <div class="text-xs text-yellow-700 mt-1">⚠️ Elige una electiva del 2023</div>
          </div>
        </div>
        <select class="select-electiva w-full border-2 border-yellow-400 rounded-lg p-3 font-medium" data-cod1998="${det.cod_1998}">
          <option value="">-- Selecciona (${mallaMencion.length} disponibles) --</option>
          ${opciones}
        </select>
      </div>
    `;
  });

  document.querySelectorAll('.select-electiva').forEach(sel => {
    sel.addEventListener('change', e => {
      const cod98 = e.target.dataset.cod1998;
      const codEl = e.target.value;
      if (!codEl) return;
      electivasElegidas[cod98] = codEl;
      procesar();
    });
  });
}

// ============================================================
// RENDER CONVALIDADAS
// ============================================================
function renderConvalidadas() {
  if (!ultimoResultado) return;
  const det = ultimoResultado.detalle;
  const r = ultimoResultado.resumen;

  const nombre = document.getElementById('nombre-estudiante').value || 'SIN NOMBRE';
  const cedula = document.getElementById('cedula-estudiante').value || 'SIN CÉDULA';
  const mencion = document.getElementById('mencion-2023').value;

  document.getElementById('info-estudiante-convalidadas').innerHTML = `
    <div class="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white rounded-xl p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><div class="text-xs uppercase opacity-70">Estudiante</div><div class="text-xl font-bold">${nombre}</div></div>
        <div><div class="text-xs uppercase opacity-70">Cédula</div><div class="text-xl font-bold">${cedula}</div></div>
        <div><div class="text-xs uppercase opacity-70">Mención</div><div class="text-sm font-semibold">${mencion}</div></div>
      </div>
    </div>
  `;

  const resumenDiv = document.getElementById('resumen-convalidadas');
  resumenDiv.classList.remove('hidden');
  resumenDiv.innerHTML = `
    <div class="border rounded-xl p-4 bg-green-50"><div class="text-xs uppercase">Convalidadas</div><div class="text-3xl font-bold text-green-800">${r.convalidadas}</div></div>
    <div class="border rounded-xl p-4 bg-blue-50"><div class="text-xs uppercase">Electivas</div><div class="text-3xl font-bold text-blue-800">${r.electivas}</div></div>
    <div class="border rounded-xl p-4 bg-yellow-50"><div class="text-xs uppercase">Duplicadas</div><div class="text-3xl font-bold text-yellow-800">${r.duplicadas}</div></div>
    <div class="border rounded-xl p-4 bg-red-50"><div class="text-xs uppercase">No convalidan</div><div class="text-3xl font-bold text-red-800">${r.no_convalidan}</div></div>
  `;

  const convalidadas = det.filter(d => d.estado === 'convalidada');
  const porSem = {};
  convalidadas.forEach(d => {
    const s = d.semestre || 99;
    if (!porSem[s]) porSem[s] = [];
    porSem[s].push(d);
  });

  let html = '';
  Object.keys(porSem).map(Number).sort((a, b) => a - b).forEach(sem => {
    const arr = porSem[sem];
    const totalFilas = arr.reduce((s, d) => s + 1 + d.origenes_adicionales.length, 0);
    html += `<div class="mb-6"><div class="bg-green-100 border-l-4 border-green-600 px-4 py-2 rounded mb-3"><h4 class="font-bold text-green-800">📚 Semestre ${sem === 99 ? 'Sin asignar' : sem} — ${totalFilas} convalidadas</h4></div>`;
    html += `<table class="w-full text-sm border-collapse"><thead><tr class="bg-slate-100"><th class="px-3 py-2 border text-left">Cód 1998</th><th class="px-3 py-2 border text-left">Materia 1998</th><th class="px-3 py-2 border text-left">Cód 2023</th><th class="px-3 py-2 border text-left">Materia 2023</th><th class="px-3 py-2 border text-center">Estado</th></tr></thead><tbody>`;
    arr.forEach(d => {
      html += `<tr><td class="px-3 py-2 border font-mono text-xs font-bold">${d.cod_1998}</td><td class="px-3 py-2 border">${d.nombre_1998}</td><td class="px-3 py-2 border font-mono text-xs font-bold text-green-700">${d.cod_2023}</td><td class="px-3 py-2 border">${d.nombre_2023}</td><td class="px-3 py-2 border text-center"><span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">✅</span></td></tr>`;
      d.origenes_adicionales.forEach(extra => {
        html += `<tr class="bg-yellow-50"><td class="px-3 py-2 border font-mono text-xs font-bold text-yellow-700">${extra.cod_1998}</td><td class="px-3 py-2 border text-yellow-800">${extra.nombre_1998}</td><td class="px-3 py-2 border font-mono text-xs text-yellow-700">${d.cod_2023}</td><td class="px-3 py-2 border text-yellow-800">${d.nombre_2023}</td><td class="px-3 py-2 border text-center"><span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">⚠️ Dup</span></td></tr>`;
      });
    });
    html += `</tbody></table></div>`;
  });

  document.getElementById('tabla-convalidadas').innerHTML = html || '<div class="text-center text-slate-500 py-8">Sin convalidadas</div>';
  document.getElementById('vista-convalidadas').classList.remove('hidden');
}

// ============================================================
// CONTADORES Y BOTONES
// ============================================================
function actualizarContadores() {
  document.getElementById('contador-seleccionadas').textContent = materiasSeleccionadas.size;
  document.getElementById('contador-convalidadas').textContent = ultimoResultado ? ultimoResultado.resumen.convalidadas : 0;
  document.getElementById('stat-seleccionadas').textContent = materiasSeleccionadas.size;
  document.getElementById('stat-convalidadas').textContent = ultimoResultado ? ultimoResultado.resumen.convalidadas : 0;
  document.getElementById('stat-pendientes').textContent = ultimoResultado ? ultimoResultado.resumen.no_convalidan : 0;
}

function mostrarBotones() {
  ['btn-pdf-completo', 'btn-excel-completo', 'btn-pdf', 'btn-excel'].forEach(id => {
    document.getElementById(id)?.classList.remove('hidden');
  });
}

function ocultarBotones() {
  ['btn-pdf-completo', 'btn-excel-completo', 'btn-pdf', 'btn-excel'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });
  document.getElementById('vista-convalidadas')?.classList.add('hidden');
  document.getElementById('resumen-convalidadas')?.classList.add('hidden');
  document.getElementById('panel-electivas')?.classList.add('hidden');
}

// ============================================================
// LISTENERS GENERALES
// ============================================================
document.getElementById('buscador').addEventListener('input', renderListaMaterias);

document.getElementById('btn-limpiar').addEventListener('click', () => {
  materiasSeleccionadas.clear();
  ultimoResultado = null;
  electivasElegidas = {};
  renderListaMaterias();
  ocultarBotones();
  actualizarContadores();
});

document.getElementById('btn-nueva-consulta').addEventListener('click', () => {
  if (!confirm('¿Limpiar todo?')) return;
  location.reload();
});

// ============================================================
// DROP ZONE
// ============================================================
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) setArchivo(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files.length) setArchivo(e.target.files[0]); });

function setArchivo(f) {
  archivoSeleccionado = f;
  document.getElementById('file-name').textContent = `📎 ${f.name}`;
  document.getElementById('btn-procesar-archivo').disabled = false;
}

// ============================================================
// PROCESAR ARCHIVO
// ============================================================
document.getElementById('btn-procesar-archivo').addEventListener('click', async () => {
  if (!archivoSeleccionado) return;
  const btn = document.getElementById('btn-procesar-archivo');
  btn.disabled = true;
  document.getElementById('spinner-archivo').classList.remove('hidden');
  const prog = document.getElementById('progreso');
  prog.classList.remove('hidden');
  prog.textContent = '⏳ Procesando archivo...';

  try {
    const texto = await extraerTexto(archivoSeleccionado, msg => prog.textContent = msg);
    const codigos = extraerCodigos(texto);
    const ced = extraerCedula(texto);
    const nom = extraerNombre(texto);

    if (ced) document.getElementById('cedula-estudiante').value = ced;
    if (nom) document.getElementById('nombre-estudiante').value = nom;

    codigos.forEach(c => materiasSeleccionadas.add(c));
    prog.textContent = `✅ Detectados ${codigos.length} códigos`;
    procesar();
  } catch (e) {
    alert('Error: ' + e.message);
    prog.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
    document.getElementById('spinner-archivo').classList.add('hidden');
  }
});

// ============================================================
// EXPORTACIÓN PDF/EXCEL
// ============================================================
document.getElementById('btn-pdf-completo').addEventListener('click', () => {
  if (!ultimoResultado) return;
  generarPDFCompleto({
    cedula: document.getElementById('cedula-estudiante').value || 'SIN-CEDULA',
    nombre: document.getElementById('nombre-estudiante').value || 'SIN-NOMBRE',
    mencion: document.getElementById('mencion-2023').value
  }, ultimoResultado);
});

document.getElementById('btn-excel-completo').addEventListener('click', () => {
  if (!ultimoResultado) return;
  generarExcelCompleto({
    cedula: document.getElementById('cedula-estudiante').value || 'SIN-CEDULA',
    nombre: document.getElementById('nombre-estudiante').value || 'SIN-NOMBRE',
    mencion: document.getElementById('mencion-2023').value
  }, ultimoResultado);
});

document.getElementById('btn-pdf').addEventListener('click', () => {
  if (!ultimoResultado) return;
  generarPDFConvalidadas({
    cedula: document.getElementById('cedula-estudiante').value || 'SIN-CEDULA',
    nombre: document.getElementById('nombre-estudiante').value || 'SIN-NOMBRE',
    mencion: document.getElementById('mencion-2023').value
  }, ultimoResultado);
});

document.getElementById('btn-excel').addEventListener('click', () => {
  if (!ultimoResultado) return;
  generarExcelConvalidadas({
    cedula: document.getElementById('cedula-estudiante').value || 'SIN-CEDULA',
    nombre: document.getElementById('nombre-estudiante').value || 'SIN-NOMBRE',
    mencion: document.getElementById('mencion-2023').value
  }, ultimoResultado);
});

// ============================================================
// INICIAR APP
// ============================================================
init();