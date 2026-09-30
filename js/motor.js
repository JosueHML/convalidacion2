// ============================================================
// MOTOR DE CONVALIDACIÓN (JavaScript)
// ============================================================

let DATA = { equivalencias: [], plan1998: [], malla2023: [], equivalencias64h: [] };

// ------------------------------------------------------------
// NORMALIZACIÓN
// ------------------------------------------------------------
function normMencion(s) {
  return String(s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normCodigo(c) {
  const limpio = String(c || '').toUpperCase().replace(/[\s\.\-_]/g, '');
  const m = limpio.match(/^([A-Z]+)(\d+)$/);
  return m ? `${m[1]}-${m[2]}` : limpio;
}

// ------------------------------------------------------------
// CARGA DE DATOS
// ------------------------------------------------------------
async function cargarDatos() {
  try {
    const cb = '?v=' + Date.now();
    const [eq, p98, m23, eq64] = await Promise.all([
      fetch('./data/equivalencias.json' + cb).then(r => r.json()),
      fetch('./data/plan_1998.json' + cb).then(r => r.json()),
      fetch('./data/malla_2023.json' + cb).then(r => r.json()),
      fetch('./data/equivalencias_64h.json' + cb).then(r => r.json()).catch(() => [])
    ]);
    DATA.equivalencias = eq;
    DATA.plan1998 = p98;
    DATA.malla2023 = m23;
    DATA.equivalencias64h = eq64;
    console.log(`✅ Datos: ${eq.length} eq, ${p98.length} plan98, ${m23.length} malla23, ${eq64.length} eq64h`);
  } catch (e) {
    console.error('❌ Error cargando datos:', e);
    alert('Error al cargar los datos. Revisa la consola (F12).');
  }
}

// ------------------------------------------------------------
// OBTENER MENCIONES
// ------------------------------------------------------------
function getMenciones1998() {
  const set = new Set(DATA.plan1998.map(p => p.mencion).filter(Boolean));
  return [...set].sort();
}

function getMenciones2023() {
  const set = new Set(DATA.malla2023.map(m => m.mencion).filter(Boolean));
  return [...set].sort();
}

function getMaterias1998(mencion) {
  const n = normMencion(mencion);
  return DATA.plan1998
    .filter(p => normMencion(p.mencion) === n)
    .map(p => ({
      codigo: p.codigo,
      nombre: p.nombre,
      semestre: p.semestre
    }))
    .sort((a, b) => (a.semestre || 99) - (b.semestre || 99) || a.codigo.localeCompare(b.codigo));
}

// ------------------------------------------------------------
// MOTOR PRINCIPAL
// ------------------------------------------------------------
function convalidar(cedula, nombre, mencion1998, mencion2023, codigosAprobados, electivasElegidas = {}, materiasConEstado = {}) {
  const m1998Norm = normMencion(mencion1998);
  const m2023Norm = normMencion(mencion2023);

  console.log('🎯 Comparando menciones:');
  console.log('   1998:', mencion1998, '→', m1998Norm);
  console.log('   2023:', mencion2023, '→', m2023Norm);

  const esDelPlan1998 = m1998Norm && m1998Norm !== 'NINGUNA' && m1998Norm !== 'NINGUNO';
  console.log('👤 ¿Es del plan 1998?', esDelPlan1998);

  const eqsMencion = DATA.equivalencias.filter(e => normMencion(e.mencion) === m2023Norm);
  console.log(`   Equivalencias encontradas: ${eqsMencion.length}`);

  const mapaEq = {};
  eqsMencion.forEach(e => { mapaEq[normCodigo(e.cod_1998)] = e; });

  const semestres1998 = {};
  DATA.plan1998
    .filter(p => normMencion(p.mencion) === m1998Norm)
    .forEach(p => { semestres1998[normCodigo(p.codigo)] = p.semestre; });

  const mallaMencion = DATA.malla2023.filter(m => normMencion(m.mencion) === m2023Norm);
  console.log(`   Materias malla 2023: ${mallaMencion.length}`);

  const mapaMalla = {};
  mallaMencion.forEach(m => { mapaMalla[normCodigo(m.codigo)] = m; });

  const eq64Mencion = DATA.equivalencias64h.find(e => normMencion(e.mencion) === m2023Norm);
  const mapa64h = eq64Mencion ? eq64Mencion.equivalencias : {};

  const detalle = [];
  const convalidadas = new Set();
  const aprobadas = new Set();

  codigosAprobados.forEach(codRaw => {
    const cod = normCodigo(codRaw);
    const sem1998 = semestres1998[cod] || 0;

    // Regla 64h
    const esMateria64h = ['INF-111', 'INF-121', 'INF-131'].includes(cod);
    const infoMateria = materiasConEstado[cod] || {};
    const añoAprob = infoMateria.año;

    if (!esDelPlan1998 && esMateria64h) {
      if (añoAprob === 2023 || añoAprob === 2024) {
        const eq64 = mapa64h[cod];
        if (eq64) {
          const destino = normCodigo(eq64.codigo);
          const info = mapaMalla[destino];
          const semestre = info ? info.semestre : 99;
          const nombre2023 = info ? info.nombre : eq64.nombre;

          if (convalidadas.has(destino)) {
            for (const d of detalle) {
              if (d.cod_2023aj === destino && d.estado === 'convalidada') {
                d.origenes_adicionales.push({ cod_1998: cod, nombre_1998: `(64h ${añoAprob}) ${cod}`, semestre_1998: sem1998 });
                break;
              }
            }
          } else {
            convalidadas.add(destino);
            aprobadas.add(destino);
            detalle.push({
              cod_1998: cod, nombre_1998: `(2023 puro ${añoAprob}) ${cod}`,
              cod_2023: destino, nombre_2023: nombre2023,
              cod_2023aj: destino, nombre_2023aj: nombre2023,
              semestre, semestre_1998: sem1998,
              estado: 'convalidada', observacion: `Regla 64h (aprobó ${añoAprob})`,
              origenes_adicionales: []
            });
          }
          return;
        }
      } else if (añoAprob && añoAprob >= 2025) {
        detalle.push({
          cod_1998: cod, nombre_1998: `(2023 puro ${añoAprob}) ${cod}`,
          cod_2023: null, nombre_2023: null,
          cod_2023aj: null, nombre_2023aj: null,
          semestre: 99, semestre_1998: sem1998,
          estado: 'no_convalida',
          observacion: `No convalida (aprobó ${añoAprob})`,
          origenes_adicionales: []
        });
        return;
      }
    }

    const eq = mapaEq[cod];

    if (!eq) {
      detalle.push({
        cod_1998: cod, nombre_1998: '(no encontrada)',
        cod_2023: null, nombre_2023: null,
        cod_2023aj: null, nombre_2023aj: null,
        semestre: 99, semestre_1998: sem1998,
        estado: 'no_encontrada', observacion: 'Sin equivalencia',
        origenes_adicionales: []
      });
      return;
    }

    if (eq.tipo === 'no_convalida') {
      detalle.push({
        cod_1998: cod, nombre_1998: eq.nombre_1998,
        cod_2023: null, nombre_2023: null,
        cod_2023aj: null, nombre_2023aj: null,
        semestre: 99, semestre_1998: sem1998,
        estado: 'no_convalida', observacion: 'No convalida',
        origenes_adicionales: []
      });
      return;
    }

    if (eq.tipo === 'electiva') {
      const elegida = electivasElegidas[cod];
      if (elegida) {
        const info = mapaMalla[normCodigo(elegida)];
        if (info) {
          aprobadas.add(info.codigo);
          convalidadas.add(info.codigo);
          detalle.push({
            cod_1998: cod, nombre_1998: eq.nombre_1998,
            cod_2023: info.codigo, nombre_2023: info.nombre,
            cod_2023aj: info.codigo, nombre_2023aj: info.nombre,
            semestre: info.semestre, semestre_1998: sem1998,
            estado: 'convalidada', observacion: 'Electiva elegida',
            origenes_adicionales: []
          });
          return;
        }
      }
      detalle.push({
        cod_1998: cod, nombre_1998: eq.nombre_1998,
        cod_2023: 'ELECTIVA', nombre_2023: 'ELECTIVA',
        cod_2023aj: null, nombre_2023aj: null,
        semestre: 99, semestre_1998: sem1998,
        estado: 'electiva_pendiente',
        observacion: 'El estudiante debe elegir',
        origenes_adicionales: []
      });
      return;
    }

    // Directa
    const destino = normCodigo(eq.cod_2023aj);
    const info = mapaMalla[destino];
    const semestre = info ? info.semestre : 99;
    const nombre2023 = info ? info.nombre : eq.nombre_2023aj;
    aprobadas.add(destino);

    if (convalidadas.has(destino)) {
      for (const d of detalle) {
        if (d.cod_2023aj === destino && d.estado === 'convalidada') {
          d.origenes_adicionales.push({
            cod_1998: cod,
            nombre_1998: eq.nombre_1998,
            semestre_1998: sem1998
          });
          break;
        }
      }
    } else {
      convalidadas.add(destino);
      detalle.push({
        cod_1998: cod, nombre_1998: eq.nombre_1998,
        cod_2023: destino, nombre_2023: nombre2023,
        cod_2023aj: destino, nombre_2023aj: nombre2023,
        semestre, semestre_1998: sem1998,
        estado: 'convalidada', observacion: '',
        origenes_adicionales: []
      });
    }
  });

  const mallaCompleta = mallaMencion.map(m => ({
    codigo: m.codigo,
    nombre: m.nombre,
    semestre: m.semestre,
    estado: convalidadas.has(m.codigo) ? 'convalidada'
          : aprobadas.has(m.codigo) ? 'aprobada'
          : 'faltante'
  })).sort((a, b) => (a.semestre || 99) - (b.semestre || 99) || a.codigo.localeCompare(b.codigo));

  const convalidadasArr = detalle.filter(d => d.estado === 'convalidada');
  const electivasArr = detalle.filter(d => d.estado === 'electiva_pendiente');
  const noConvalidanArr = detalle.filter(d => d.estado === 'no_convalida' || d.estado === 'no_encontrada');
  const totalDuplicadas = convalidadasArr.reduce((s, d) => s + d.origenes_adicionales.length, 0);

  console.log(`📊 Motor: ${convalidadasArr.length} convalidadas, ${electivasArr.length} electivas, ${totalDuplicadas} duplicadas, ${noConvalidanArr.length} no convalidan`);

  return {
    detalle,
    malla_completa: mallaCompleta,
    resumen: {
      convalidadas: convalidadasArr.length,
      electivas: electivasArr.length,
      duplicadas: totalDuplicadas,
      no_convalidan: noConvalidanArr.length,
      total_aprobadas: detalle.length
    }
  };
}

// ------------------------------------------------------------
// AUXILIARES
// ------------------------------------------------------------
function getElectivasDisponibles(mencion2023) {
  const n = normMencion(mencion2023);
  return DATA.malla2023
    .filter(m => normMencion(m.mencion) === n)
    .map(m => ({ codigo: m.codigo, nombre: m.nombre, semestre: m.semestre }))
    .sort((a, b) => (a.semestre || 99) - (b.semestre || 99) || a.codigo.localeCompare(b.codigo));
}

window.normMencion = normMencion;
window.normCodigo = normCodigo;
window.getMenciones1998 = getMenciones1998;
window.getMenciones2023 = getMenciones2023;
window.getMaterias1998 = getMaterias1998;
window.getElectivasDisponibles = getElectivasDisponibles;
window.convalidar = convalidar;
window.cargarDatos = cargarDatos;
window.DATA = DATA;