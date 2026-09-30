// ============================================================
// APP PRINCIPAL — CONVALIDACIÓN 2
// ============================================================

let archivoSeleccionado = null;
let materiasSeleccionadas = new Set();
let ultimoResultado = null;
let electivasElegidas = {};
let timeoutProcesar = null;
let materiasConEstado = {};
let codigosDetectados = [];

// TABS
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    btn.classList.add('tab-active');
    document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
    const tab = document.getElementById(`tab-${btn.dataset.tab}`);
    if (tab) tab.classList.remove('hidden');
    if (btn.dataset.tab === 'convalidadas' && ultimoResultado) renderConvalidadas();
  });
});
document.querySelector('[data-tab="estudiante"]')?.classList.add('tab-active');

// MÉTODOS
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

// INIT
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
    codigosDetectados = [];
    ultimoResultado = null;
    electivasElegidas = {};
    materiasConEstado = {};
    renderListaMaterias();
    renderCodigosDetectados();
    ocultarBotones();
    actualizarContadores();
  });
  sel23.addEventListener('change', () => {
    materiasSeleccionadas.clear();
    ultimoResultado = null;
    electivasElegidas = {};
    renderListaMaterias();
    renderCodigosDetectados();
    ocultarBotones();
    actualizarContadores();
  });
  renderListaMaterias();
}

// ═══════════════════════════════════════════════════════════
// RENDER LISTA MATERIAS — con agrupación de duplicadas
// ═══════════════════════════════════════════════════════════
function renderListaMaterias() {
  const cont = document.getElementById('lista-materias');
  const mencion98 = document.getElementById('mencion-1998').value;
  if (!mencion98) {
    cont.innerHTML = '<div class="p-6 text-center text-slate-500">Selecciona una mención 1998</div>';
    return;
  }

  const materias = getMaterias1998(mencion98);
  const filtroRaw = (document.getElementById('buscador').value || '');
  const filtro = filtroRaw.toUpperCase().replace(/[\s\-\.]/g, '');

  // Mapa de destinos → grupos de códigos
  const mapaDestinos = {};
  if (ultimoResultado) {
    ultimoResultado.detalle.forEach(d => {
      const destino = d.cod_2023aj || d.cod_2023;
      if (!destino || destino === 'ELECTIVA') return;

      if (!mapaDestinos[destino]) mapaDestinos[destino] = [];

      mapaDestinos[destino].push({
        cod_1998: d.cod_1998,
        nombre_1998: d.nombre_1998,
        estado: d.estado,
        observacion: d.observacion,
        es_principal: true
      });

      if (d.origenes_adicionales) {
        d.origenes_adicionales.forEach(extra => {
          mapaDestinos[destino].push({
            cod_1998: extra.cod_1998,
            nombre_1998: extra.nombre_1998,
            estado: 'duplicada',
            es_principal: false
          });
        });
      }
    });
  }

  // Reverse lookup
  const codigosAgrupados = {};
  Object.keys(mapaDestinos).forEach(destino => {
    mapaDestinos[destino].forEach(o => {
      codigosAgrupados[o.cod_1998] = { destino, grupo: mapaDestinos[destino], es_principal: o.es_principal };
    });
  });

  cont.innerHTML = '';
  let visibles = 0;
  const yaRenderizados = new Set();

  materias.forEach(m => {
    const codNorm = (m.codigo || '').toUpperCase().replace(/[\s\-\.]/g, '');
    const nomNorm = (m.nombre || '').toUpperCase();
    if (filtro && !codNorm.includes(filtro) && !nomNorm.includes(filtro)) return;

    if (yaRenderizados.has(m.codigo)) return;
    visibles++;

    const grupoInfo = codigosAgrupados[m.codigo];

    // ═══ FILA AGRUPADA (duplicadas al mismo destino) ═══
    if (grupoInfo && grupoInfo.grupo.length > 1 && grupoInfo.es_principal) {
      const grupo = grupoInfo.grupo;
      const destino = grupoInfo.destino;
      const principal = grupo.find(o => o.es_principal) || grupo[0];

      let col1998HTML = '';
      grupo.forEach((o, idx) => {
        const esDup = !o.es_principal;
        const bgColor = esDup ? '#fef3c7' : '#d1fae5';
        const textColor = esDup ? '#92400e' : '#065f46';
        col1998HTML += `
          <div class="p-3" style="background: ${bgColor}; ${idx > 0 ? 'border-top: 2px solid #047857;' : ''}">
            <div class="badge ${esDup ? 'badge-warn' : 'badge-success'} mb-1.5" style="background: rgba(255,255,255,0.7); color: ${textColor};">
              ${o.cod_1998}
            </div>
            <div class="text-xs font-semibold" style="color: ${textColor};">${o.nombre_1998}</div>
          </div>
        `;
        yaRenderizados.add(o.cod_1998);
      });

      const infoMalla = DATA.malla2023.find(x => normCodigo(x.codigo) === normCodigo(destino));
      const nombreDestino = infoMalla ? infoMalla.nombre : (principal.nombre_2023 || '');
      const totalCodigos = grupo.length;

      cont.innerHTML += `
        <div class="row-materia border-t border-slate-100 dark:border-slate-700 py-2">
          <div class="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700"
               style="border: 3px solid #047857; border-radius: 12px; overflow: hidden;">
            <div class="flex flex-col">${col1998HTML}</div>
            <div class="p-3 flex flex-col justify-center" style="background: #a7f3d0;">
              <div class="text-xs uppercase opacity-80 font-bold mb-1" style="color: #065f46;">→ Destino</div>
              <div class="text-lg font-black" style="color: #065f46;">${destino}</div>
              <div class="text-sm font-semibold mt-1" style="color: #065f46;">${nombreDestino}</div>
            </div>
            <div class="p-3 h-full flex flex-col justify-center" style="background: #d1fae5;">
              <span class="badge badge-success">✅ Convalidada</span>
              <div class="text-xs mt-2 font-mono font-bold text-green-700">${destino}</div>
              <div class="text-sm font-semibold text-green-900">${nombreDestino}</div>
            </div>
          </div>
          <div class="text-[10px] mt-1 mb-1 ml-2 text-emerald-700 font-bold">
            ⚡ ${totalCodigos} códigos del plan 1998 convalidan a este destino
          </div>
        </div>
      `;
      return;
    }

    // ═══ FILA SIMPLE ═══
    const sel = materiasSeleccionadas.has(m.codigo);
    let col2023 = '<div class="text-slate-400 text-sm">—</div>';
    let col2025 = '<div class="text-slate-400 text-sm">—</div>';
    let det = null;

    if (ultimoResultado) {
      const codBuscar = normCodigo(m.codigo);
      det = ultimoResultado.detalle.find(d => normCodigo(d.cod_1998) === codBuscar);
      if (!det) {
        for (const d of ultimoResultado.detalle) {
          const extra = d.origenes_adicionales.find(o => normCodigo(o.cod_1998) === codBuscar);
          if (extra) {
            det = {
              cod_1998: extra.cod_1998,
              nombre_1998: extra.nombre_1998,
              cod_2023: d.cod_2023,
              nombre_2023: d.nombre_2023,
              cod_2023aj: d.cod_2023aj,
              nombre_2023aj: d.nombre_2023aj,
              estado: 'duplicada'
            };
            break;
          }
        }
      }

      if (det) {
        if (det.cod_2023 && det.cod_2023 !== 'ELECTIVA') {
          col2023 = `<span class="badge badge-info">${det.cod_2023}</span><div class="text-sm mt-1">${det.nombre_2023 || ''}</div>`;
        } else if (det.cod_2023 === 'ELECTIVA') {
          col2023 = '<span class="badge badge-warn">ELECTIVA</span>';
        } else {
          col2023 = '<div class="text-red-700 text-sm">❌ No convalida</div>';
        }

        if (det.estado === 'convalidada') {
          col2025 = `<span class="badge badge-success">✅ Convalidada</span><div class="text-xs mt-1 font-mono">${det.cod_2023}</div><div class="text-sm">${det.nombre_2023 || ''}</div>`;
        } else if (det.estado === 'duplicada') {
          col2025 = `<div class="text-xs mt-1 font-mono text-amber-700">${det.cod_2023}</div><div class="text-sm text-amber-800">${det.nombre_2023 || ''}</div>`;
        } else if (det.estado === 'electiva_pendiente') {
          col2025 = '<div class="bg-yellow-50 border border-yellow-300 rounded-lg p-2 text-xs text-yellow-800">⚠️ Elige en el panel de electivas</div>';
        } else if (det.estado === 'no_convalida' || det.estado === 'no_encontrada') {
          col2025 = `<div class="text-red-700 text-sm">❌ ${det.observacion || 'No convalida'}</div>`;
        }
      }
    } else if (sel) {
      col2023 = '<div class="text-slate-400 text-sm">...</div>';
      col2025 = '<div class="text-slate-400 text-sm">...</div>';
    }

    let rowStyle = '';
    if (det) {
      if (det.estado === 'convalidada') rowStyle = 'background: linear-gradient(90deg, #d1fae5 0%, #a7f3d0 100%);';
      else if (det.estado === 'duplicada') rowStyle = 'background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%);';
      else if (det.estado === 'electiva_pendiente') rowStyle = 'background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%);';
      else if (det.estado === 'no_convalida' || det.estado === 'no_encontrada') rowStyle = 'background: linear-gradient(90deg, #fee2e2 0%, #fecaca 100%);';
    } else if (sel) {
      rowStyle = 'background: linear-gradient(90deg, #eef2ff 0%, #e0e7ff 100%);';
    }

    cont.innerHTML += `
      <div class="row-materia grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700" style="${rowStyle}">
        <div class="p-3 flex items-start gap-2">
          <input type="checkbox" class="mt-1 checkbox-materia" data-codigo="${m.codigo}" ${sel ? 'checked' : ''}>
          <div>
            <div class="badge badge-info mb-1.5">${m.codigo}</div>
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
      if (e.target.checked) {
        materiasSeleccionadas.add(cod);
        if (!codigosDetectados.includes(cod)) codigosDetectados.push(cod);
      } else {
        materiasSeleccionadas.delete(cod);
        codigosDetectados = codigosDetectados.filter(c => c !== cod);
      }
      renderCodigosDetectados();
      actualizarContadores();
      clearTimeout(timeoutProcesar);
      timeoutProcesar = setTimeout(procesar, 300);
    });
  });

  actualizarContadores();
}

// PROCESAR
function procesar() {
  const cedula = document.getElementById('cedula-estudiante').value || 'SIN-CEDULA';
  const nombre = document.getElementById('nombre-estudiante').value || 'SIN-NOMBRE';
  const mencion98 = document.getElementById('mencion-1998').value;
  const mencion23 = document.getElementById('mencion-2023').value;
  if (!mencion98 || !mencion23 || materiasSeleccionadas.size === 0) return;

  ultimoResultado = convalidar(
    cedula, nombre, mencion98, mencion23,
    Array.from(materiasSeleccionadas),
    electivasElegidas,
    materiasConEstado
  );

  renderListaMaterias();
  renderPanelElectivas();
  renderConvalidadas();
  actualizarContadores();
  mostrarBotones();
}

// ═══════════════════════════════════════════════════════════
// PANEL DE CÓDIGOS DETECTADOS (chips editables)
// ═══════════════════════════════════════════════════════════
function renderCodigosDetectados() {
  const panel = document.getElementById('panel-codigos');
  const lista = document.getElementById('panel-codigos-lista');
  if (!panel || !lista) return;

  if (codigosDetectados.length === 0) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');

  const ordenados = [...codigosDetectados].sort();
  lista.innerHTML = ordenados.map(cod => `
    <span class="chip-codigo anim-pop">
      ${cod}
      <button class="quitar-codigo" data-codigo="${cod}" title="Quitar">×</button>
    </span>
  `).join('');

  document.querySelectorAll('.quitar-codigo').forEach(btn => {
    btn.addEventListener('click', e => {
      const cod = e.target.dataset.codigo;
      codigosDetectados = codigosDetectados.filter(c => c !== cod);
      materiasSeleccionadas.delete(cod);
      for (const m of Array.from(materiasSeleccionadas)) {
        if (normCodigo(m) === normCodigo(cod)) {
          materiasSeleccionadas.delete(m);
        }
      }
      renderCodigosDetectados();
      renderListaMaterias();
      procesar();
    });
  });
}

// Agregar código manualmente
function agregarCodigoManual() {
  const input = document.getElementById('input-nuevo-codigo');
  const val = (input.value || '').trim().toUpperCase();
  if (!val) return;

  const codNorm = normCodigo(val);
  if (!codNorm || !/^[A-Z]+-\d+$/.test(codNorm)) {
    alert('Formato inválido. Usa algo como INF-111, MAT-114, etc.');
    return;
  }

  if (!codigosDetectados.includes(codNorm)) {
    codigosDetectados.push(codNorm);
    materiasSeleccionadas.add(codNorm);
  }

  input.value = '';
  renderCodigosDetectados();
  renderListaMaterias();
  procesar();
}

document.getElementById('btn-agregar-codigo')?.addEventListener('click', agregarCodigoManual);
document.getElementById('input-nuevo-codigo')?.addEventListener('keypress', e => {
  if (e.key === 'Enter') agregarCodigoManual();
});

document.getElementById('btn-reprocesar')?.addEventListener('click', () => {
  procesar();
});

document.getElementById('btn-limpiar-codigos')?.addEventListener('click', () => {
  if (!confirm('¿Quitar todos los códigos detectados?')) return;
  codigosDetectados = [];
  materiasSeleccionadas.clear();
  ultimoResultado = null;
  renderCodigosDetectados();
  renderListaMaterias();
  ocultarBotones();
  actualizarContadores();
});

// ═══════════════════════════════════════════════════════════
// PANEL DE ELECTIVAS
// ═══════════════════════════════════════════════════════════
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

// RENDER CONVALIDADAS
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
      html += `<tr class="bg-green-50"><td class="px-3 py-2 border font-mono text-xs font-bold">${d.cod_1998}</td><td class="px-3 py-2 border">${d.nombre_1998}</td><td class="px-3 py-2 border font-mono text-xs font-bold text-green-700">${d.cod_2023}</td><td class="px-3 py-2 border">${d.nombre_2023}</td><td class="px-3 py-2 border text-center"><span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">✅</span></td></tr>`;
      d.origenes_adicionales.forEach(extra => {
        html += `<tr class="bg-amber-50"><td class="px-3 py-2 border font-mono text-xs font-bold text-amber-700">${extra.cod_1998}</td><td class="px-3 py-2 border text-amber-800">${extra.nombre_1998}</td><td class="px-3 py-2 border font-mono text-xs text-amber-700">${d.cod_2023}</td><td class="px-3 py-2 border text-amber-800">${d.nombre_2023}</td><td class="px-3 py-2 border text-center"><span class="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">⚠️ Dup</span></td></tr>`;
      });
    });
    html += `</tbody></table></div>`;
  });

  document.getElementById('tabla-convalidadas').innerHTML = html || '<div class="text-center text-slate-500 py-8">Sin convalidadas</div>';
  document.getElementById('vista-convalidadas').classList.remove('hidden');
}

// CONTADORES
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

// LISTENERS GENERALES
document.getElementById('buscador').addEventListener('input', renderListaMaterias);

document.getElementById('btn-limpiar').addEventListener('click', () => {
  materiasSeleccionadas.clear();
  codigosDetectados = [];
  ultimoResultado = null;
  electivasElegidas = {};
  materiasConEstado = {};
  renderListaMaterias();
  renderCodigosDetectados();
  ocultarBotones();
  actualizarContadores();
});

document.getElementById('btn-nueva-consulta').addEventListener('click', () => {
  if (!confirm('¿Limpiar todo?')) return;
  location.reload();
});

// DROP ZONE
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

// PROCESAR ARCHIVO
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
    const analisis = analizarTexto(texto);
    const codigos = analisis.aprobados;
    const ced = extraerCedula(texto);
    const nom = extraerNombre(texto);

    materiasConEstado = extraerMateriasConEstado(texto);

    if (ced) document.getElementById('cedula-estudiante').value = ced;
    if (nom) document.getElementById('nombre-estudiante').value = nom;

    codigosDetectados = [...codigos];
    materiasSeleccionadas.clear();
    codigos.forEach(c => materiasSeleccionadas.add(c));

    prog.textContent = `✅ Detectados ${codigos.length} códigos aprobados`;
    procesar();
    renderCodigosDetectados();
  } catch (e) {
    alert('Error: ' + e.message);
    prog.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
    document.getElementById('spinner-archivo').classList.add('hidden');
  }
});

// EXPORTAR
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

init();