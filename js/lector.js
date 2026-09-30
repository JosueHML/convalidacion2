// ============================================================
// LECTOR DE ARCHIVOS + OCR — VERSIÓN FINAL
// ============================================================

const PALABRAS_RECHAZO = [
  'REPROBADO', 'REPROBÓ', 'REPROBO', 'DESAPROBADO', 'DESAPROBÓ',
  'ABANDONO', 'ABANDONÓ', 'RETIRADO', 'RETIRO',
  'NO APROBADO', 'NO APROBÓ', 'NO APROBO',
  'PERDIDO', 'PERDIÓ', 'PERDIO',
  'INCOMPLETO', 'INCOMPLETA',
  'SIN CALIFICACION', 'SIN CALIFICACIÓN',
  'RECHAZADO', 'ANULADO', 'REPROBADA'
];

const PALABRAS_APROBACION = [
  'APROBADO', 'APROBÓ', 'APROBO', 'APROBADA',
  'PROMOVIDO', 'PROMOVIDA', 'HABILITADO', 'HABILITADA',
  'CONVALIDADA', 'CONVALIDADO', 'CONV. PROV', 'CONV.OPTATIVA',
  'CNV.PROV', 'CONV.PROV', 'APROB.'
];

const PREFIJOS_VALIDOS = [
  'INF', 'LAB', 'MAT', 'FIS', 'EST', 'LIN', 'TRA', 'COM', 'SIS', 'IID',
  'TIC', 'TVD', 'TAW', 'TIE', 'TAM', 'DAT', 'SEG', 'TSI', 'TCS', 'TCP',
  'TSS', 'TAR', 'TRC', 'TAT', 'CPA', 'ECO', 'TIOT'
];

// Códigos del plan 2023 puro (no se convalidan desde 1998)
const CODIGOS_2023_PURO = new Set([
  'INF-114', 'INF-115', 'INF-116', 'INF-117',
  'INF-122', 'INF-123', 'INF-124', 'INF-125', 'INF-126',
  'INF-132', 'INF-133', 'INF-134', 'INF-135',
  'INF-241', 'INF-242', 'INF-243', 'INF-244', 'INF-245', 'INF-246', 'INF-247',
  'INF-251', 'INF-252', 'INF-253', 'INF-254',
  'INF-261', 'INF-262', 'INF-263', 'INF-264', 'INF-265', 'INF-266',
  'INF-311', 'INF-312', 'INF-313', 'INF-314', 'INF-315', 'INF-316', 'INF-317', 'INF-318', 'INF-319',
  'INF-320', 'INF-321', 'INF-322', 'INF-323', 'INF-324', 'INF-325', 'INF-326', 'INF-327', 'INF-328', 'INF-329',
  'INF-330', 'INF-331', 'INF-332', 'INF-333', 'INF-334', 'INF-335', 'INF-336', 'INF-337',
  'COM-244', 'COM-245', 'COM-252', 'COM-253', 'COM-254', 'COM-261', 'COM-262', 'COM-263',
  'COM-311', 'COM-312', 'COM-313', 'COM-316', 'COM-317', 'COM-320', 'COM-321', 'COM-322', 'COM-323',
  'COM-371', 'COM-372', 'COM-381', 'COM-382',
  'DAT-135', 'DAT-241', 'DAT-242', 'DAT-245', 'DAT-246', 'DAT-251', 'DAT-252', 'DAT-253', 'DAT-254', 'DAT-255',
  'DAT-261', 'DAT-262', 'DAT-263', 'DAT-264',
  'DAT-311', 'DAT-312', 'DAT-313', 'DAT-318', 'DAT-319', 'DAT-321',
  'SIS-245', 'SIS-246', 'SIS-251', 'SIS-252', 'SIS-253', 'SIS-254', 'SIS-255',
  'SIS-261', 'SIS-262', 'SIS-263', 'SIS-264',
  'SIS-313', 'SIS-315', 'SIS-318', 'SIS-320', 'SIS-324', 'SIS-325', 'SIS-328',
  'SIS-371', 'SIS-372', 'SIS-373', 'SIS-381', 'SIS-382',
  'TIC-135', 'TIC-241', 'TIC-242', 'TIC-243', 'TIC-244', 'TIC-245', 'TIC-246', 'TIC-247',
  'TIC-251', 'TIC-252', 'TIC-253', 'TIC-254', 'TIC-255',
  'TIC-261', 'TIC-262', 'TIC-263', 'TIC-264',
  'TIC-311', 'TIC-312', 'TIC-313', 'TIC-314', 'TIC-315', 'TIC-316', 'TIC-317', 'TIC-318', 'TIC-319',
  'TIC-320', 'TIC-321', 'TIC-322', 'TIC-323', 'TIC-324',
  'TIC-371', 'TIC-372', 'TIC-373', 'TIC-381', 'TIC-382', 'TIC-383',
  'IID-135', 'IID-241', 'IID-242', 'IID-243', 'IID-244', 'IID-245', 'IID-246', 'IID-247',
  'IID-251', 'IID-252', 'IID-253', 'IID-254',
  'IID-261', 'IID-262', 'IID-263', 'IID-264', 'IID-265',
  'IID-311', 'IID-312', 'IID-313', 'IID-316', 'IID-317', 'IID-319', 'IID-320',
  'IID-371', 'IID-372', 'IID-381', 'IID-382',
  'SEG-241', 'SEG-242', 'SEG-243', 'SEG-244', 'SEG-245', 'SEG-246',
  'SEG-251', 'SEG-252', 'SEG-253', 'SEG-254',
  'SEG-261', 'SEG-262', 'SEG-263', 'SEG-264',
  'SEG-311', 'SEG-312', 'SEG-313', 'SEG-316', 'SEG-317', 'SEG-318',
  'SEG-371', 'SEG-372', 'SEG-373', 'SEG-381', 'SEG-382', 'SEG-383',
  'TRA-374', 'TRA-136',
  'TRC-251', 'TRC-261', 'TRC-262',
  'TVD-251', 'TVD-261', 'TVD-262',
  'TAW-251', 'TAW-261', 'TAW-262',
  'TIE-251', 'TIE-261', 'TIE-262',
  'TAM-251', 'TAM-261', 'TAM-262',
  'TAR-251', 'TAR-261', 'TAR-262',
  'TSS-251', 'TSS-261', 'TSS-262',
  'TCP-251', 'TCP-261', 'TCP-262',
  'TSI-251', 'TSI-261', 'TSI-262',
  'TCS-251', 'TCS-261', 'TCS-262',
  'TAT-251', 'TAT-261', 'TAT-262',
  'TIOT-251', 'TIOT-261', 'TIOT-262'
]);

async function extraerTexto(file, onProgress) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'pdf') return await leerPDF(file, onProgress);
  if (ext === 'docx') return await leerDOCX(file);
  if (ext === 'xlsx' || ext === 'xls') return await leerExcel(file);
  if (['png', 'jpg', 'jpeg'].includes(ext)) return await leerImagen(file, onProgress);
  throw new Error('Formato no soportado: ' + ext);
}

async function leerPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let texto = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let ultimaY = null;
    let lineaActual = '';
    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      if (ultimaY === null || Math.abs(y - ultimaY) < 3) {
        lineaActual += item.str + ' ';
      } else {
        texto += lineaActual.trim() + '\n';
        lineaActual = item.str + ' ';
      }
      ultimaY = y;
    }
    if (lineaActual.trim()) texto += lineaActual.trim() + '\n';
    texto += '\n';
  }

  if (texto.trim().length < 500) {
    texto = await ocrPDF(pdf, onProgress);
  }
  return corregirOCR(texto);
}

async function ocrPDF(pdf, onProgress) {
  let texto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 3 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const { data: { text } } = await Tesseract.recognize(canvas, 'spa', {
      logger: m => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(`OCR página ${i}/${pdf.numPages}: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    texto += text + '\n\n';
  }
  return texto;
}

async function leerDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function leerExcel(file) {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  let texto = '';
  wb.SheetNames.forEach(sheet => {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 });
    data.forEach(row => { texto += row.filter(c => c).join(' | ') + '\n'; });
  });
  return texto;
}

async function leerImagen(file, onProgress) {
  const { data: { text } } = await Tesseract.recognize(file, 'spa', {
    logger: m => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(`OCR: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  return corregirOCR(text);
}

function corregirOCR(texto) {
  const reemplazos = [
    // ─── INF ───
    [/\bNF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\b1NF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bTNF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bJNF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bIMF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bANF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bWF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bIF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bMF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bIN[-F\s]+(\d{3})/g, 'INF-$1'],

    // ─── LAB (del texto "LABORATORIO DE INF-XXX") ───
    [/\bLABORATORIO\s+DE\s+INF[\s\.\-]?(\d{3})/gi, 'LAB-$1'],
    [/\bABORATORIO\s+DE\s+INF[\s\.\-]?(\d{3})/gi, 'LAB-$1'],
    [/\bLABORATORIO\s+INF[\s\.\-]?(\d{3})/gi, 'LAB-$1'],
    [/\bLABORATORIO\s+DE\s+FIS[\s\.\-]?(\d{3})/gi, 'LAB-$1'],
    [/\bABORATORIO\s+DE\s+FIS[\s\.\-]?(\d{3})/gi, 'LAB-$1'],
    [/\bLAB[\s\.\-]?(\d{3})/g, 'LAB-$1'],
    [/\bL4B[\s\.\-]?(\d{3})/g, 'LAB-$1'],
    [/\bLA8[\s\.\-]?(\d{3})/g, 'LAB-$1'],
    [/\b1AB[\s\.\-]?(\d{3})/g, 'LAB-$1'],

    // ─── Romanos ───
    [/\bll\b/g, 'II'],
    [/\blll\b/g, 'III']
  ];
  for (const [regex, rep] of reemplazos) texto = texto.replace(regex, rep);
  return texto;
}

// ═══════════════════════════════════════════════════════════
// ANÁLISIS POR CONTEXTO
// ═══════════════════════════════════════════════════════════
function analizarTexto(texto) {
  const patronCodigo = new RegExp(
    `\\b(${PREFIJOS_VALIDOS.join('|')})[\\s\\.\\-]?(\\d{3,4})\\b`,
    'g'
  );

  const textoNorm = texto.toUpperCase().replace(/\s+/g, ' ');
  const ocurrencias = [];
  let m;
  const regex = new RegExp(patronCodigo.source, 'g');
  while ((m = regex.exec(textoNorm)) !== null) {
    ocurrencias.push({
      codigo: `${m[1]}-${m[2]}`,
      inicio: m.index,
      fin: m.index + m[0].length
    });
  }

  const aprobados = new Map();
  const reprobados = new Map();
  const detalles = {};

  ocurrencias.forEach((ocurrencia, idx) => {
    const inicioCtx = ocurrencia.inicio;
    const finCtx = idx < ocurrencias.length - 1
      ? ocurrencias[idx + 1].inicio
      : Math.min(textoNorm.length, ocurrencia.fin + 100);
    const contexto = textoNorm.substring(inicioCtx, finCtx);

    let rechazado = false;
    for (const p of PALABRAS_RECHAZO) {
      if (contexto.includes(p)) { rechazado = true; break; }
    }

    let aprobado = false;
    for (const p of PALABRAS_APROBACION) {
      if (contexto.includes(p)) { aprobado = true; break; }
    }

    let nota = null;
    const numMatches = contexto.match(/\b(\d{1,3})\b/g) || [];
    for (const numStr of numMatches) {
      const n = parseInt(numStr, 10);
      if (n >= 1990 && n <= 2030) continue;
      if (n >= 0 && n <= 100) {
        if (nota === null || n > nota) nota = n;
      }
    }

    let año = null;
    const añoMatches = contexto.match(/\b(19[9]\d|20[0-2]\d)\b/g) || [];
    for (const a of añoMatches) {
      const num = parseInt(a, 10);
      if (num >= 1990 && num <= 2022) { año = num; break; }
    }

    if (aprobado) {
      aprobados.set(ocurrencia.codigo, (aprobados.get(ocurrencia.codigo) || 0) + 1);
      if (!detalles[ocurrencia.codigo]) {
        detalles[ocurrencia.codigo] = { nota, año };
      }
    } else if (rechazado) {
      reprobados.set(ocurrencia.codigo, (reprobados.get(ocurrencia.codigo) || 0) + 1);
    }
  });

  const aprobadosFinal = new Set();
  const reprobadosFinal = new Set();

  for (const [codigo] of aprobados) {
    if (!CODIGOS_2023_PURO.has(codigo)) {
      aprobadosFinal.add(codigo);
    }
  }
  for (const [codigo] of reprobados) {
    if (!aprobadosFinal.has(codigo) && !CODIGOS_2023_PURO.has(codigo)) {
      reprobadosFinal.add(codigo);
    }
  }

  return {
    aprobados: Array.from(aprobadosFinal).sort(),
    reprobados: Array.from(reprobadosFinal).sort(),
    detalles
  };
}

function extraerCodigos(texto) {
  return analizarTexto(texto).aprobados;
}

function extraerMateriasConEstado(texto) {
  const result = analizarTexto(texto);
  const out = {};
  result.aprobados.forEach(cod => {
    out[cod] = {
      estado: 'aprobado',
      nota: result.detalles[cod]?.nota || null,
      año: result.detalles[cod]?.año || null
    };
  });
  return out;
}

function extraerCedula(texto) {
  const m = texto.match(/(?:C\.?I\.?|CEDULA|CÉDULA|CI)[\s:.\-]*(\d{6,10})/i);
  return m ? m[1] : null;
}

function extraerNombre(texto) {
  const m = texto.match(/Nombre\(s\)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\. ]{5,80})/i)
    || texto.match(/(?:NOMBRE[S]?|ESTUDIANTE)\s*[:\-]\s*([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\. ]{5,80})/i);
  if (m) {
    let n = m[1].split(/FECHA|REG|PAZ|BOLIVIA|C\.I\./i)[0].trim();
    if (n.length > 5) return n;
  }
  return null;
}