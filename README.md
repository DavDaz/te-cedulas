# Web Scraper - Verificación Electoral de Panamá

Automatiza la consulta de información de votantes desde https://verificate.votopanama.net/

## 🚀 Instalación Rápida (WSL Ubuntu)

### 1. Instalar dependencias del sistema
```bash
sudo apt-get update
sudo apt-get install libnspr4 libnss3 libasound2t64
```

### 2. Instalar dependencias de Node.js
```bash
npm install
npx puppeteer browsers install chrome
```

## 📝 Configuración

Agrega las cédulas a consultar en `cedulas.txt` (una por línea):
```
8-930-2006
8-625-6587
1-234-5678
```

## ▶️ Ejecutar

```bash
npm start
```

## 📊 Resultado

Se genera `resultados_cedulas.csv` con:
- CEDULA, NOMBRE, FECHA_NACIMIENTO, EDAD, SEXO
- PROVINCIA, DISTRITO, CORREGIMIENTO
- CENTRO_VOTACION, MESA

## ⚠️ Solución de Problemas

Si aparece error de dependencias:
```bash
sudo apt-get install chromium-browser
```

Si falla el browser:
```bash
sudo npx playwright install-deps
```