const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { eventLogger, metricas } = require('./bigdata/eventLogger');

const app = express();
const PORT = process.env.PORT || 3000;
const CSV = path.join(__dirname, 'data', 'clientes.csv');

app.use(express.json());
app.use(eventLogger);

// Servir la interfaz del Frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

function leerClientes() {
  const lineas = fs.readFileSync(CSV, 'utf8').trim().split(/\r?\n/);
  return lineas.slice(1).filter(Boolean).map(linea => {
    const [id, nombre, correo] = linea.split(',');
    return { id: Number(id), nombre, correo };
  });
}

function guardarClientes(clientes) {
  const lineas = clientes.map(c => `${c.id},${c.nombre},${c.correo}`);
  fs.writeFileSync(CSV, ['id,nombre,correo', ...lineas].join('\n') + '\n');
}

// Rutas de la API CRUD
app.get('/api/clientes', (req, res) => {
  res.json(leerClientes());
});

app.post('/api/clientes', (req, res) => {
  const { nombre, correo } = req.body;
  if (!nombre || !correo) return res.status(400).json({ error: 'Datos inválidos' });
  
  const clientes = leerClientes();
  const nuevo = { id: Math.max(0, ...clientes.map(c => c.id)) + 1, nombre, correo };
  clientes.push(nuevo);
  guardarClientes(clientes);
  res.status(201).json(nuevo);
});

app.delete('/api/clientes/:id', (req, res) => {
  const id = Number(req.params.id);
  let clientes = leerClientes();
  const existe = clientes.some(c => c.id === id);
  if (!existe) return res.status(404).json({ error: 'Cliente no encontrado' });
  
  clientes = clientes.filter(c => c.id !== id);
  guardarClientes(clientes);
  res.json({ mensaje: 'Cliente eliminado' });
});

// Rutas auxiliares
app.all('/api/laboratorio/evento', (req, res) => {
  res.json({ recibido: true, metodo: req.method });
});

app.get('/api/bigdata/metricas', (req, res) => {
  res.json({ ...metricas, ahora: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});