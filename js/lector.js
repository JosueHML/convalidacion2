// ============================================================
// LECTOR DE ARCHIVOS + OCR (100% navegador)
// VERSIÓN CORREGIDA: análisis por contexto de código individual
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
    // ⚠️ CAMBIO CLAVE: unir items respetando los saltos de línea
    // Cada item tiene coordenada Y (transform[5]). Si cambia mucho,
    // es una línea nueva.
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
  if (texto.trim().length < 100) {
    console.log('PDF escaneado → OCR');
    texto = await ocrPDF(pdf, onProgress);
  }
  return corregirOCR(texto);
}

async function ocrPDF(pdf, onProgress) {
  let texto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
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
    texto += text + '\n';
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


// ============================================================
// CORRECCIÓN DE OCR
// ============================================================
function corregirOCR(texto) {
  const reemplazos = [
    [/\bNF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\b1NF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bTNF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bLAB[\s\.\-]?(\d{3})/g, 'LAB-$1'],
    [/\bMAT[\s\.\-]?(\d{3})/g, 'MAT-$1'],
    [/\bFIS[\s\.\-]?(\d{3})/g, 'FIS-$1'],
    [/\bEST[\s\.\-]?(\d{3})/g, 'EST-$1'],
    [/\bLIN[\s\.\-]?(\d{3})/g, 'LIN-$1'],
    [/\bTRA[\s\.\-]?(\d{3})/g, 'TRA-$1'],
    [/\bINF[\s\.\-]?(\d{3})/g, 'INF-$1'],
    [/\bll\b/g, 'II'],
    [/\blll\b/g, 'III'],
    [/\s+/g, ' '],
  ];
  for (const [regex, rep] of reemplazos) texto = texto.replace(regex, rep);
  return texto;
}


// ============================================================
// DETECCIÓN DE ESTADO POR CONTEXTO
// ============================================================
function estadoEnContexto(contexto) {
  const up = contexto.toUpperCase();
  const unida = up.replace(/\s+/g, ' ').trim();

  // 1. Buscar palabras de RECHAZO
  for (const palabra of PALABRAS_RECHAZO) {
    if (unida.includes(palabra)) return 'rechazado';
  }

  // 2. Buscar palabras de APROBACIÓN
  for (const palabra of PALABRAS_APROBACION) {
    if (unida.includes(palabra)) return 'aprobado';
  }

  // 3. Analizar notas numéricas (0-100), excluyendo códigos
  //    Buscamos todos los números de 1-3 dígitos
  const nums = (unida.match(/\b\d{1,3}\b/g) || [])
    .map(n => parseInt(n, 10))
    .filter(n => n >= 0 && n <= 100);

  if (nums.length > 0) {
    const maxNota = Math.max(...nums);
    if (maxNota >= NOTA_MINIMA_APROBACION) return 'aprobado';
    return 'rechazado';
  }

  // 4. Si no hay info → desconocido (conservador: no convalidar)
  return 'desconocido';
}


// ============================================================
// EXTRACCIÓN DE CÓDIGOS — ANÁLISIS POR CONTEXTO
// ============================================================
function extraerCodigos(texto) {
  const prefijosValidos = [
    'INF', 'LAB', 'MAT', 'FIS', 'EST', 'LIN', 'TRA', 'COM', 'SIS', 'IID',
    'TIC', 'TVD', 'TAW', 'TIE', 'TAM', 'DAT', 'SEG', 'TSI', 'TCS', 'TCP',
    'TSS', 'TAR', 'TRC', 'TAT', 'CPA', 'ECO', 'TIOT'
  ];
  const patronCodigo = new RegExp(
    `\\b(${prefijosValidos.join('|')})[\\s\\.\\-]?(\\d{3,4})\\b`,
    'g'
  );

  // Normalizar el texto: solo espacios simples
  const textoNorm = texto.toUpperCase().replace(/\s+/g, ' ');

  // Encontrar TODAS las posiciones de códigos
  const matches = [];
  let m;
  const regex = new RegExp(patronCodigo.source, 'g');
  while ((m = regex.exec(textoNorm)) !== null) {
    matches.push({
      codigo: `${m[1]}-${m[2]}`,
      inicio: m.index,
      fin: m.index + m[0].length
    });
  }

  console.log(`🔍 Códigos encontrados en bruto: ${matches.length}`);

  // Analizar cada código por separado, con ventana de contexto
  const aprobados = new Map();   // codigo → conteo de aprobaciones
  const rechazados = new Map();  // codigo → conteo de rechazos

  matches.forEach((match, idx) => {
    // Ventana de contexto: desde el código ANTERIOR hasta el SIGUIENTE
    // Si no hay anterior/siguiente, usar ±200 caracteres
    const inicioContexto = idx > 0
      ? matches[idx - 1].fin
      : Math.max(0, match.inicio - 200);
    const finContexto = idx < matches.length - 1
      ? matches[idx + 1].inicio
      : Math.min(textoNorm.length, match.fin + 200);

    const contexto = textoNorm.substring(inicioContexto, finContexto);
    const estado = estadoEnContexto(contexto);

    if (estado === 'aprobado') {
      aprobados.set(match.codigo, (aprobados.get(match.codigo) || 0) + 1);
    } else if (estado === 'rechazado') {
      rechazados.set(match.codigo, (rechazados.get(match.codigo) || 0) + 1);
    }
    // 'desconocido' → no cuenta ni a favor ni en contra
  });

  // Decidir el estado final por código:
  // Si tiene AL MENOS UNA aprobación y ninguna posterior rechazada → APROBADO
  // (en historial UMSA, si aprobó una vez, ya la tiene)
  const aprobadosFinal = new Set();
  const rechazadosFinal = new Set();

  for (const [codigo, numAprob] of aprobados.entries()) {
    const numRech = rechazados.get(codigo) || 0;
    if (numAprob > 0) {
      aprobadosFinal.add(codigo);
    }
  }

  for (const [codigo, numRech] of rechazados.entries()) {
    if (!aprobadosFinal.has(codigo)) {
      rechazadosFinal.add(codigo);
    }
  }

  console.log('✅ APROBADOS:', Array.from(aprobadosFinal).sort());
  console.log('❌ RECHAZADOS:', Array.from(rechazadosFinal).sort());

  return Array.from(aprobadosFinal).sort();
}


// ============================================================
// EXTRACCIÓN DE CÉDULA Y NOMBRE
// ============================================================
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