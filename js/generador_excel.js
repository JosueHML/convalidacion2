// ============================================================
// GENERADOR DE EXCEL (SheetJS) — MEJORADO
// ============================================================

function generarExcelCompleto(estudiante, resultado) {
  const wb = XLSX.utils.book_new();
  const r = resultado.resumen;
  const fecha = new Date().toLocaleDateString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // ══════════════════════════════════════════════════════════
  // HOJA 1: PORTADA
  // ══════════════════════════════════════════════════════════
  const portada = [
    [''],
    ['UNIVERSIDAD MAYOR DE SAN ANDRÉS'],
    ['Facultad de Ciencias Puras y Naturales'],
    ['Carrera de Informática'],
    [''],
    ['REPORTE DE CONVALIDACIÓN DE MATERIAS'],
    [''],
    ['DATOS DEL ESTUDIANTE'],
    [''],
    ['Nombre:', estudiante.nombre || 'SIN NOMBRE'],
    ['Cédula:', estudiante.cedula || 'SIN CÉDULA'],
    ['Mención 2023 Ajustado:', estudiante.mencion || '—'],
    ['Plan de origen:', 'Plan de Estudios 1998'],
    ['Fecha de emisión:', fecha],
    [''],
    ['RESUMEN'],
    [''],
    ['Convalidadas', r.convalidadas],
    ['Electivas', r.electivas],
    ['Duplicadas', r.duplicadas],
    ['No convalidan', r.no_convalidan],
    ['TOTAL materias aprobadas', r.total_aprobadas],
    [''],
    [''],
    ['Este documento es un reporte informativo generado automáticamente.'],
    ['La convalidación oficial debe ser aprobada por la Carrera de Informática.']
  ];
  const wsPortada = XLSX.utils.aoa_to_sheet(portada);
  wsPortada['!cols'] = [{ wch: 30 }, { wch: 40 }];
  wsPortada['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsPortada, '📋 Portada');

  // ══════════════════════════════════════════════════════════
  // HOJA 2: CONVALIDACIÓN DETALLE
  // ══════════════════════════════════════════════════════════
  const datos = [
    ['DETALLE DE CONVALIDACIÓN'],
    [`Estudiante: ${estudiante.nombre || 'S/N'} | Cédula: ${estudiante.cedula || 'S/C'} | Mención: ${estudiante.mencion || '—'}`],
    [],
    ['Sem.', 'Cód 1998', 'Materia 1998', 'Cód 2023', 'Materia 2023 Ajustado', 'Estado', 'Observación']
  ];

  resultado.detalle.forEach(d => {
    datos.push([
      d.semestre === 99 ? 'S/A' : d.semestre,
      d.cod_1998,
      d.nombre_1998,
      d.cod_2023aj || d.cod_2023 || '',
      d.nombre_2023aj || d.nombre_2023 || '',
      etiquetaEstado(d.estado),
      d.observacion || ''
    ]);
    d.origenes_adicionales.forEach(extra => {
      datos.push([
        d.semestre === 99 ? 'S/A' : d.semestre,
        extra.cod_1998,
        extra.nombre_1998,
        d.cod_2023aj || d.cod_2023 || '',
        d.nombre_2023aj || d.nombre_2023 || '',
        '⚠️ Duplicada',
        'Ya convalidado por otro origen'
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(datos);
  ws['!cols'] = [
    { wch: 6 }, { wch: 11 }, { wch: 42 }, { wch: 11 }, { wch: 42 }, { wch: 14 }, { wch: 28 }
  ];
  ws['!rows'] = [{ hpt: 22 }, { hpt: 18 }, {}, { hpt: 20 }];

  // Aplicar estilo al encabezado (colores)
  const headerRow = 3;
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
    const cell = ws[col + (headerRow + 1)];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4338CA' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, '📊 Convalidación');

  // ══════════════════════════════════════════════════════════
  // HOJA 3: RESUMEN POR SEMESTRE
  // ══════════════════════════════════════════════════════════
  const convalidadas = resultado.detalle.filter(d => d.estado === 'convalidada');
  const porSemestre = {};
  convalidadas.forEach(d => {
    const s = d.semestre || 99;
    porSemestre[s] = (porSemestre[s] || 0) + 1 + d.origenes_adicionales.length;
  });

  const resumenSem = [
    ['RESUMEN POR SEMESTRE'],
    [],
    ['Semestre', 'Convalidadas']
  ];
  Object.keys(porSemestre).map(Number).sort((a, b) => a - b).forEach(sem => {
    resumenSem.push([
      sem === 99 ? 'Sin asignar' : `${sem}º Semestre`,
      porSemestre[sem]
    ]);
  });
  resumenSem.push([]);
  resumenSem.push(['TOTAL', convalidadas.reduce((s, d) => s + 1 + d.origenes_adicionales.length, 0)]);

  const wsSem = XLSX.utils.aoa_to_sheet(resumenSem);
  wsSem['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSem, '📅 Por Semestre');

  // ══════════════════════════════════════════════════════════
  // HOJA 4: MALLA COMPLETA 2023
  // ══════════════════════════════════════════════════════════
  const mallaDatos = [
    ['MALLA COMPLETA 2023 AJUSTADO'],
    [`Mención: ${estudiante.mencion || '—'}`],
    [],
    ['Sem.', 'Código', 'Materia', 'Estado']
  ];

  resultado.malla_completa.forEach(m => {
    mallaDatos.push([
      m.semestre,
      m.codigo,
      m.nombre,
      m.estado === 'convalidada' ? '✅ Convalidada'
        : m.estado === 'aprobada' ? '🟦 Aprobada'
        : '❌ Falta'
    ]);
  });

  const wsMalla = XLSX.utils.aoa_to_sheet(mallaDatos);
  wsMalla['!cols'] = [{ wch: 6 }, { wch: 11 }, { wch: 50 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsMalla, '🎓 Malla 2023');

  // Guardar
  const filename = `Convalidacion_${(estudiante.cedula || 'SIN-CEDULA').replace(/[^\w]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}


function generarExcelConvalidadas(estudiante, resultado) {
  const wb = XLSX.utils.book_new();
  const convalidadas = resultado.detalle.filter(d => d.estado === 'convalidada');
  const fecha = new Date().toLocaleDateString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // HOJA 1: Convalidadas
  const datos = [
    ['MATERIAS CONVALIDADAS'],
    [`Estudiante: ${estudiante.nombre || 'S/N'} | Cédula: ${estudiante.cedula || 'S/C'}`],
    [`Mención: ${estudiante.mencion || '—'} | Fecha: ${fecha}`],
    [],
    ['Sem.', 'Cód 1998', 'Materia 1998', 'Cód 2023', 'Materia 2023 Ajustado', 'Estado']
  ];

  convalidadas.forEach(d => {
    datos.push([
      d.semestre === 99 ? 'S/A' : d.semestre,
      d.cod_1998,
      d.nombre_1998,
      d.cod_2023aj || d.cod_2023,
      d.nombre_2023aj || d.nombre_2023,
      '✅ Convalidada'
    ]);
    d.origenes_adicionales.forEach(extra => {
      datos.push([
        d.semestre === 99 ? 'S/A' : d.semestre,
        extra.cod_1998,
        extra.nombre_1998,
        d.cod_2023aj || d.cod_2023,
        d.nombre_2023aj || d.nombre_2023,
        '⚠️ Duplicada'
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(datos);
  ws['!cols'] = [
    { wch: 6 }, { wch: 11 }, { wch: 42 }, { wch: 11 }, { wch: 42 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, '✅ Convalidadas');

  // HOJA 2: Resumen
  const resumen = [
    ['RESUMEN'],
    [],
    ['Total convalidadas', convalidadas.length],
    ['Total duplicadas', convalidadas.reduce((s, d) => s + d.origenes_adicionales.length, 0)],
    ['TOTAL filas', convalidadas.reduce((s, d) => s + 1 + d.origenes_adicionales.length, 0)]
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, '📊 Resumen');

  const filename = `Convalidadas_${(estudiante.cedula || 'SIN-CEDULA').replace(/[^\w]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}


// ────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────
function etiquetaEstado(estado) {
  switch (estado) {
    case 'convalidada': return '✅ Convalidada';
    case 'electiva_pendiente': return '⏳ Electiva pendiente';
    case 'no_convalida': return '❌ No convalida';
    case 'no_encontrada': return '❓ No encontrada';
    default: return estado;
  }
}