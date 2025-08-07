const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require('csv-writer').createObjectCsvWriter;
const path = require('path');

// Configuracion del archivo CSV
const csvWriter = csv({
  path: 'resultados_cedulas.csv',
  header: [
    { id: 'cedula', title: 'CEDULA' },
    { id: 'nombre', title: 'NOMBRE' },
    { id: 'fechaNacimiento', title: 'FECHA_NACIMIENTO' },
    { id: 'edad', title: 'EDAD' },
    { id: 'sexo', title: 'SEXO' },
    { id: 'provincia', title: 'PROVINCIA' },
    { id: 'distrito', title: 'DISTRITO' },
    { id: 'corregimiento', title: 'CORREGIMIENTO' },
    { id: 'centroVotacion', title: 'CENTRO_VOTACION' },
    { id: 'mesa', title: 'MESA' }
  ],
  append: false
});

// Funcion para convertir el formato de fecha
function formatearFecha(fecha) {
  const meses = {
    '01': 'ENE', '02': 'FEB', '03': 'MAR', '04': 'ABR',
    '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AGO',
    '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DIC'
  };
  
  if (!fecha) return '';
  
  const partes = fecha.split('/');
  if (partes.length !== 3) return fecha;
  
  const dia = partes[0];
  const mes = meses[partes[1]] || partes[1];
  const anio = partes[2];
  
  return `${dia}-${mes}-${anio}`;
}

// Funcion para lanzar browser con configuracion robusta
async function lanzarBrowser() {
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-web-security'
  ];

  const configs = [
    { executablePath: '/usr/bin/chromium-browser', args: baseArgs },
    { executablePath: '/usr/bin/google-chrome', args: baseArgs },
    { executablePath: '/usr/bin/chrome', args: baseArgs },
    { args: baseArgs },
    { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  ];

  for (const config of configs) {
    try {
      console.log('Intentando lanzar browser...');
      return await puppeteer.launch({
        headless: "new",
        defaultViewport: null,
        ...config
      });
    } catch (error) {
      console.log(`Fallo configuracion: ${error.message}`);
    }
  }
  
  throw new Error('No se pudo lanzar el navegador con ninguna configuracion');
}

// Funcion para extraer datos de una cedula
async function consultarCedula(page, cedula) {
  try {
    console.log(`\nConsultando cedula: ${cedula}`);
    
    // Navegar a la pagina principal
    await page.goto('https://verificate.votopanama.net/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Esperar a que el formulario este presente
    await page.waitForSelector('#cedula', { timeout: 10000 });
    
    // Limpiar el campo y escribir la cedula
    await page.click('#cedula');
    await page.evaluate(() => document.querySelector('#cedula').value = '');
    await page.type('#cedula', cedula);
    
    // Hacer click en el boton buscar
    await page.click('button[type="submit"]');
    
    // Esperar a que aparezcan los resultados
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Extraer los datos
    const datos = await page.evaluate(() => {
      const resultado = {
        nombre: '',
        cedula: '',
        fechaNacimiento: '',
        edad: '',
        sexo: '',
        provincia: '',
        distrito: '',
        corregimiento: '',
        centroVotacion: '',
        mesa: ''
      };
      
      // Buscar todas las tarjetas
      const cards = document.querySelectorAll('.card');
      
      cards.forEach(card => {
        const header = card.querySelector('.card-header')?.textContent || '';
        const body = card.querySelector('.card-body');
        
        if (!body) return;
        
        const paragraphs = body.querySelectorAll('p');
        
        if (header.includes('Datos Generales')) {
          paragraphs.forEach(p => {
            const texto = p.textContent;
            if (texto.includes('Nombre:')) {
              resultado.nombre = texto.replace('Nombre:', '').trim();
            } else if (texto.includes('Cedula:')) {
              resultado.cedula = texto.replace('Cedula:', '').trim();
            } else if (texto.includes('F. Nacimiento:')) {
              resultado.fechaNacimiento = texto.replace('F. Nacimiento:', '').trim();
            } else if (texto.includes('Edad:')) {
              resultado.edad = texto.replace('Edad:', '').trim();
            } else if (texto.includes('Sexo:')) {
              resultado.sexo = texto.replace('Sexo:', '').trim();
            }
          });
        } else if (header.includes('Residencia Electoral')) {
          paragraphs.forEach(p => {
            const texto = p.textContent;
            if (texto.includes('Provincia:')) {
              resultado.provincia = texto.replace('Provincia:', '').trim();
            } else if (texto.includes('Distrito:')) {
              resultado.distrito = texto.replace('Distrito:', '').trim();
            } else if (texto.includes('Corregimiento:')) {
              resultado.corregimiento = texto.replace('Corregimiento:', '').trim();
            }
          });
        } else if (header.includes('Centro de Votacion')) {
          paragraphs.forEach(p => {
            const texto = p.textContent;
            if (texto.includes('Centro de Votacion:')) {
              resultado.centroVotacion = texto.replace('Centro de Votacion:', '').trim();
            } else if (texto.includes('Mesa #:')) {
              resultado.mesa = texto.replace('Mesa #:', '').trim();
            }
          });
        }
      });
      
      return resultado;
    });
    
    // Procesar los datos
    const datosFormateados = {
      cedula: datos.cedula || cedula,
      nombre: datos.nombre.toUpperCase(),
      fechaNacimiento: formatearFecha(datos.fechaNacimiento),
      edad: datos.edad,
      sexo: datos.sexo,
      provincia: datos.provincia,
      distrito: datos.distrito,
      corregimiento: datos.corregimiento,
      centroVotacion: datos.centroVotacion,
      mesa: datos.mesa
    };
    
    console.log(`Datos extraidos para ${datosFormateados.nombre}`);
    console.log(`   Fecha de Nacimiento: ${datosFormateados.fechaNacimiento}`);
    console.log(`   Provincia: ${datosFormateados.provincia}`);
    
    return datosFormateados;
    
  } catch (error) {
    console.error(`Error consultando cedula ${cedula}:`, error.message);
    return null;
  }
}

// Funcion principal
async function procesarCedulas(listaCedulas) {
  const browser = await lanzarBrowser();
  
  const page = await browser.newPage();
  const resultados = [];
  let exitosos = 0;
  let fallidos = 0;
  
  console.log('Iniciando proceso de consulta...');
  console.log(`Total de cedulas a procesar: ${listaCedulas.length}`);
  
  for (let i = 0; i < listaCedulas.length; i++) {
    const cedula = listaCedulas[i].trim();
    
    if (!cedula) continue;
    
    console.log(`\n[${i + 1}/${listaCedulas.length}] Procesando...`);
    
    const datos = await consultarCedula(page, cedula);
    
    if (datos) {
      resultados.push(datos);
      exitosos++;
      
      // Guardar en el CSV despues de cada consulta exitosa
      await csvWriter.writeRecords([datos]);
      console.log(`Guardado en CSV`);
    } else {
      fallidos++;
      // Agregar registro vacio para cedulas fallidas
      const registroFallido = {
        cedula: cedula,
        nombre: 'ERROR - NO ENCONTRADO',
        fechaNacimiento: '',
        edad: '',
        sexo: '',
        provincia: '',
        distrito: '',
        corregimiento: '',
        centroVotacion: '',
        mesa: ''
      };
      resultados.push(registroFallido);
      await csvWriter.writeRecords([registroFallido]);
    }
    
    // Pequena pausa entre consultas para no sobrecargar el servidor
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await browser.close();
  
  console.log('\n' + '='.repeat(50));
  console.log('RESUMEN FINAL:');
  console.log(`Consultas exitosas: ${exitosos}`);
  console.log(`Consultas fallidas: ${fallidos}`);
  console.log(`Archivo CSV guardado: resultados_cedulas.csv`);
  console.log('='.repeat(50));
  
  return resultados;
}

// Funcion para leer cedulas desde un archivo
function leerCedulasDesdeArchivo(rutaArchivo) {
  try {
    const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
    return contenido.split('\n').map(linea => linea.trim()).filter(linea => linea);
  } catch (error) {
    console.error('Error leyendo archivo de cedulas:', error);
    return [];
  }
}

// CONFIGURACION Y EJECUCION

// Opcion 1: Lista de cedulas directamente en el codigo
const listaCedulasManual = [
  '8-930-2006',
  '8-625-6587'
];

// Opcion 2: Leer cedulas desde un archivo de texto (una por linea)
const listaCedulasDesdeArchivo = leerCedulasDesdeArchivo('cedulas.txt');

// Ejecutar el proceso
(async () => {
  try {
    // Usar la lista desde archivo si existe, sino la manual
    const cedulas = listaCedulasDesdeArchivo.length > 0 ? listaCedulasDesdeArchivo : listaCedulasManual;
    
    if (cedulas.length === 0) {
      console.log('No hay cedulas para procesar');
      return;
    }
    
    console.log(`Usando cedulas: ${cedulas.join(', ')}`);
    await procesarCedulas(cedulas);
    
  } catch (error) {
    console.error('Error en el proceso principal:', error);
  }
})();