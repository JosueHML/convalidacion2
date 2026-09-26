// ============================================================
// LECTOR DE ARCHIVOS + OCR (100% navegador)
// ============================================================

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
    texto += content.items.map(it => it.str).join(' ') + '\n';
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
  ];
  for (const [regex, rep] of reemplazos) texto = texto.replace(regex, rep);
  return texto.replace(/[_\[\]\|]+/g, ' ').replace(/\s+/g, ' ');
}

function extraerCodigos(texto) {
  const prefijosValidos = [
    'INF','LAB','MAT','FIS','EST','LIN','TRA','COM','SIS','IID','TIC',
    'TVD','TAW','TIE','TAM','DAT','SEG','TSI','TCS','TCP','TSS','TAR',
    'TRC','TAT','CPA','ECO','TIOT','TRC'
  ];
  const patron = new RegExp(
    `\\b(${prefijosValidos.join('|')})[\\s\\.\\-]?(\\d{3,4})\\b`,
    'g'
  );
  const encontrados = new Set();
  let m;
  const textoUp = texto.toUpperCase();
  while ((m = patron.exec(textoUp)) !== null) {
    encontrados.add(`${m[1]}-${m[2]}`);
  }
  return Array.from(encontrados).sort();
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