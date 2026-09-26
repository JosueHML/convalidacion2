// ============================================================
// GENERADOR DE PDF (jsPDF)
// ============================================================

function generarPDFCompleto(estudiante, resultado) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('UNIVERSIDAD MAYOR DE SAN ANDRÉS', ancho / 2, 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Facultad de Ciencias Puras y Naturales — Carrera de Informática', ancho / 2, 21, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text('REPORTE DE CONVALIDACIÓN DE MATERIAS', ancho / 2, 30, { align: 'center' });

  // Datos estudiante
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Estudiante: ${estudiante.nombre}`, 15, 40);
  doc.text(`Cédula: ${estudiante.cedula}`, 150, 40);
  doc.text(`Mención: ${estudiante.mencion}`, 15, 46);
  doc.text(`Plan de origen: 1998`, 150, 46);

  // Resumen
  const r = resultado.resumen;
  doc.setFillColor(30, 58, 138);
  doc.rect(15, 52, ancho - 30, 8, 'F');
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.text('Convalidadas', 40, 58, { align: 'center' });
  doc.text('Electivas', 90, 58, { align: 'center' });
  doc.text('Duplicadas', 140, 58, { align: 'center' });
  doc.text('No convalidan', 190, 58, { align: 'center' });
  doc.text('Total', 240, 58, { align: 'center' });
  doc.setTextColor(0);
  doc.text(String(r.convalidadas), 40, 66, { align: 'center' });
  doc.text(String(r.electivas), 90, 66, { align: 'center' });
  doc.text(String(r.duplicadas), 140, 66, { align: 'center' });
  doc.text(String(r.no_convalidan), 190, 66, { align: 'center' });
  doc.text(String(r.total_aprobadas), 240, 66, { align: 'center' });

  // Tabla
  const mapaDet = {};
  resultado.detalle.forEach(d => {
    if (d.cod_2023aj) {
      if (!mapaDet[d.cod_2023aj]) mapaDet[d.cod_2023aj] = [];
      mapaDet[d.cod_2023aj].push(d);
    }
  });

  const body = [];
  const semestres = [...new Set(resultado.malla_completa.map(m => m.semestre))].sort((a, b) => a - b);
  semestres.forEach(sem => {
    body.push([{ content: `${sem}º SEMESTRE`, colSpan: 5, styles: { fillColor: [226, 232, 240], fontStyle: 'bold' } }]);
    const materiasSem = resultado.malla_completa.filter(m => m.semestre === sem);
    materiasSem.forEach(m => {
      const origenes = mapaDet[m.codigo] || [];
      let col98 = '—';
      if (origenes.length > 0) {
        const o = origenes[0];
        col98 = `${o.cod_1998}\n${o.nombre_1998}`;
        o.origenes_adicionales.forEach(extra => {
          col98 += `\n+ ${extra.cod_1998}`;
        });
      }
      const estado = m.estado === 'convalidada' ? '✅ Convalidada'
                   : m.estado === 'aprobada' ? '■ Aprobada'
                   : '❌ FALTA';
      body.push([col98, `${m.codigo}\n${m.nombre}`, `${m.codigo}`, m.nombre, estado]);
    });
  });

  doc.autoTable({
    startY: 72,
    head: [['PÉNSUM 1998', 'PÉNSUM 2023', 'CÓD 2023', 'MATERIA 2023 AJUSTADO', 'ESTADO']],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(`convalidacion_${estudiante.cedula}.pdf`);
}

function generarPDFConvalidadas(estudiante, resultado) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setTextColor(22, 101, 52);
  doc.text('UNIVERSIDAD MAYOR DE SAN ANDRÉS', ancho / 2, 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Facultad de Ciencias Puras y Naturales — Carrera de Informática', ancho / 2, 21, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(22, 101, 52);
  doc.text('REPORTE DE MATERIAS CONVALIDADAS', ancho / 2, 30, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Estudiante: ${estudiante.nombre}`, 15, 42);
  doc.text(`Cédula: ${estudiante.cedula}`, 15, 48);
  doc.text(`Mención: ${estudiante.mencion}`, 15, 54);

  const convalidadas = resultado.detalle.filter(d => d.estado === 'convalidada');
  const body = [];

  convalidadas.forEach(d => {
    body.push([
      String(d.semestre || '-'),
      d.cod_1998,
      d.nombre_1998,
      d.cod_2023aj || d.cod_2023,
      d.nombre_2023aj || d.nombre_2023,
      '✅'
    ]);
    d.origenes_adicionales.forEach(extra => {
      body.push([
        String(d.semestre || '-'),
        extra.cod_1998,
        extra.nombre_1998,
        d.cod_2023aj || d.cod_2023,
        d.nombre_2023aj || d.nombre_2023,
        '⚠️ Dup'
      ]);
    });
  });

  doc.autoTable({
    startY: 62,
    head: [['Sem', 'Cód 1998', 'Materia 1998', 'Cód 2023', 'Materia 2023', 'Estado']],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 101, 52], textColor: 255 }
  });

  doc.save(`convalidadas_${estudiante.cedula}.pdf`);
}