# PDF Extractor - Frontend

Interfaz web para el extractor de PDFs societarios de InfoGroup.

## Requisitos

- Node.js 18+
- npm o yarn

## Instalación

```bash
cd C:\Users\FRANKLIN\Documents\infogroup2\pdf_frontend
npm install
```

## Ejecución

**Importante**: Primero debe estar corriendo el backend Python.

### 1. Iniciar Backend Python (en otra terminal)

```bash
cd C:\Users\FRANKLIN\Documents\infogroup2\pdf_extractor
pip install flask flask-cors
python api.py
```

### 2. Iniciar Frontend React

```bash
cd C:\Users\FRANKLIN\Documents\infogroup2\pdf_frontend
npm run dev
```

### 3. Abrir en el navegador

```
http://localhost:3000
```

## Funcionalidades

1. **Subir PDF**: Arrastra o selecciona un PDF societario
2. **Ver datos extraídos**: Muestra todos los campos organizados por categorías
3. **Editar antes de guardar**: Modifica cualquier campo incorrecto
4. **Guardar en PostgreSQL**: Almacena los datos validados
5. **Ver registros**: Lista todas las empresas guardadas

## Estructura

```
pdf_frontend/
├── src/
│   ├── components/
│   │   ├── PDFUploader.jsx    # Carga de archivos
│   │   ├── DataEditor.jsx     # Editor de datos
│   │   └── EmpresasList.jsx   # Lista de registros
│   ├── App.jsx                # Componente principal
│   ├── main.jsx               # Entrada
│   └── index.css              # Estilos Tailwind
├── package.json
├── vite.config.js
└── tailwind.config.js
```
