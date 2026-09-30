// ============================================================
// LECTOR DE ARCHIVOS + OCR — VERSIÓN CON ANÁLISIS POR CONTEXTO
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

const NOTA_MINIMA_APROBACION = 51;
const PREFIJOS_VALIDOS = [
  'INF', 'LAB', 'MAT', 'FIS', 'EST', 'LIN', 'TRA', 'COM', 'SIS', 'IID',
  'TIC', 'TVD', 'TAW', 'TIE', 'TAM', 'DAT', 'SEG', 'TSI', 'TCS', 'TCP',
  'TSS', 'TAR', 'TRC', 'TAT', 'CPA', 'ECO', 'TIOT'
];

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
    [/\bNF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\b1NF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bTNF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bJNF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bIMF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bANF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bWF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bIF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bMF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bll\b/g, 'II'],
    [/\blll\b/g, 'III'],
  ];
  for (const [regex, rep] of reemplazos) texto = texto.replace(regex, rep);
  return texto;
}

// ═══════════════════════════════════════════════════════════
// ANÁLISIS PRINCIPAL
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
    const inicioCtx = idx > 0 ? ocurrencias[idx - 1].fin : Math.max(0, ocurrencia.inicio - 150);
    const finCtx = idx < ocurrencias.length - 1 ? ocurrencias[idx + 1].inicio : Math.min(textoNorm.length, ocurrencia.fin + 150);
    const contexto = textoNorm.substring(inicioCtx, finCtx);

    let rechazado = false;
    for (const p of PALABRAS_RECHAZO) { if (contexto.includes(p)) { rechazado = true; break; } }

    let aprobado = false;
    for (const p of PALABRAS_APROBACION) { if (contexto.includes(p)) { aprobado = true; break; } }

    const nums = (contexto.match(/\b\d{1,3}\b/g) || [])
      .map(n => parseInt(n, 10))
      .filter(n => n >= 0 && n <= 100);
    const nota = nums.length > 0 ? Math.max(...nums) : null;

    const añoMatch = contexto.match(/\b(19|20)\d{2}\b/);
    const año = añoMatch ? parseInt(añoMatch[0], 10) : null;

    if (rechazado && !aprobado) {
      reprobados.set(ocurrencia.codigo, (reprobados.get(ocurrencia.codigo) || 0) + 1);
    } else if (aprobado || (nota !== null && nota >= NOTA_MINIMA_APROBACION)) {
      aprobados.set(ocurrencia.codigo, (aprobados.get(ocurrencia.codigo) || 0) + 1);
      if (!detalles[ocurrencia.codigo]) {
        detalles[ocurrencia.codigo] = { nota, año };
      }
    }
  });

  const aprobadosFinal = new Set();
  const reprobadosFinal = new Set();

  for (const [codigo, veces] of aprobados) aprobadosFinal.add(codigo);
  for (const [codigo, veces] of reprobados) {
    if (!aprobadosFinal.has(codigo)) reprobadosFinal.add(codigo);
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
// ============================================================
// EXPONER FUNCIONES GLOBALMENTE (para que app.js las use)
// ============================================================
window.extraerTexto = extraerTexto;
window.leerPDF = leerPDF;
window.leerDOCX = leerDOCX;
window.leerExcel = leerExcel;
window.leerImagen = leerImagen;
window.corregirOCR = corregirOCR;
window.analizarTexto = analizarTexto;
window.extraerCodigos = extraerCodigos;
window.extraerMateriasConEstado = extraerMateriasConEstado;
window.extraerCedula = extraerCedula;
window.extraerNombre = extraerNombre;