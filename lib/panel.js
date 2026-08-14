import express from 'express'
import fs from 'fs'
import path from 'path'
import { getDB } from './db.js'
import { listarSubbots } from '../subbots/manager.js'
import config from '../config.js'
import { info, error as logError } from './logger.js'

let sockActivo = null

export function establecerSockActivo(sock) {
  sockActivo = sock
}

function verificarToken(req, res, next) {
  const token = req.query.token || req.headers['x-panel-token']
  if (!config.panelToken || token !== config.panelToken) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  next()
}

function formatearUptime(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  return h + 'h ' + m + 'm'
}

function paginaHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${config.nombreBot} — Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #050508;
    --card: #0f0f1a;
    --border: #1f1f2e;
    --primary: #ff007f;
    --secondary: #7a00ff;
    --accent: #00d4ff;
    --text: #e0e0e6;
    --text-dim: #888899;
    --success: #00ff88;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { 
    font-family: 'Plus Jakarta Sans', sans-serif; 
    background: var(--bg); 
    color: var(--text); 
    margin: 0; 
    padding: 0; 
    min-height: 100vh;
    background-image: radial-gradient(circle at 50% 0%, #1a0b2e 0%, var(--bg) 70%);
  }
  .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
  header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 30px; 
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  h1 { 
    margin: 0; 
    font-size: 26px; 
    font-weight: 800; 
    background: linear-gradient(to right, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -1px;
  }
  .status-badge {
    background: rgba(0, 255, 136, 0.1);
    color: var(--success);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(0, 255, 136, 0.2);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .status-badge::before {
    content: '';
    width: 8px;
    height: 8px;
    background: var(--success);
    border-radius: 50%;
    box-shadow: 0 0 10px var(--success);
  }
  .card { 
    background: var(--card); 
    border-radius: 16px; 
    padding: 20px; 
    border: 1px solid var(--border);
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    transition: transform 0.2s;
  }
  .grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
    gap: 15px; 
    margin-bottom: 30px;
  }
  .stat-card {
    text-align: center;
    padding: 20px 10px;
  }
  .stat-value { 
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px; 
    font-weight: 700; 
    color: #fff;
    margin-bottom: 4px;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  }
  .stat-label { 
    font-size: 11px; 
    color: var(--text-dim); 
    text-transform: uppercase; 
    font-weight: 600;
    letter-spacing: 1px;
  }
  #login { 
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--bg);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
  }
  .login-box {
    background: var(--card);
    padding: 40px;
    border-radius: 24px;
    border: 1px solid var(--border);
    width: 90%;
    max-width: 400px;
    text-align: center;
  }
  input { 
    padding: 14px 20px; 
    border-radius: 12px; 
    border: 1px solid var(--border); 
    background: #000; 
    color: #fff; 
    width: 100%; 
    font-size: 16px; 
    margin-bottom: 15px;
    outline: none;
    transition: border-color 0.3s;
  }
  input:focus { border-color: var(--primary); }
  button { 
    padding: 14px 24px; 
    border-radius: 12px; 
    border: none; 
    background: linear-gradient(45deg, var(--primary), var(--secondary)); 
    color: #fff; 
    font-weight: 700; 
    cursor: pointer; 
    font-size: 15px; 
    width: 100%;
    transition: opacity 0.2s;
  }
  button:active { transform: scale(0.98); }
  button.secundario { background: var(--border); color: var(--text); width: auto; padding: 8px 16px; font-size: 12px; }
  .tabs { 
    display: flex; 
    gap: 8px; 
    margin-bottom: 25px; 
    overflow-x: auto;
    padding-bottom: 5px;
  }
  .tab { 
    padding: 10px 18px; 
    border-radius: 12px; 
    background: transparent; 
    border: 1px solid var(--border); 
    cursor: pointer; 
    font-size: 14px; 
    color: var(--text-dim); 
    white-space: nowrap;
    transition: all 0.3s;
  }
  .tab.activo { 
    background: rgba(255, 0, 127, 0.1); 
    color: var(--primary); 
    border-color: var(--primary); 
  }
  .seccion { display: none; animation: fadeIn 0.4s ease; }
  .seccion.activa { display: block; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  td, th { padding: 14px 10px; text-align: left; border-bottom: 1px solid var(--border); }
  th { color: var(--text-dim); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
  .dot.on { background: var(--success); box-shadow: 0 0 8px var(--success); }
  .dot.off { background: #555; }
  pre { 
    background: #050508; 
    padding: 20px; 
    border-radius: 12px; 
    overflow-x: auto; 
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px; 
    line-height: 1.6;
    color: #a0a0b0;
    border: 1px solid #111;
  }
  .footer { 
    text-align: center; 
    margin-top: 40px; 
    color: var(--text-dim); 
    font-size: 12px; 
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }
  @media (max-width: 600px) {
    .grid { grid-template-columns: 1fr 1fr; }
    h1 { font-size: 20px; }
  }
</style>
</head>
<body>
  <div id="login">
    <div class="login-box">
      <h1>THE YUI-MD</h1>
      <p style="color: var(--text-dim); margin-bottom: 25px;">Dashboard de Control</p>
      <input id="token" type="password" placeholder="Ingresa tu token de acceso">
      <button onclick="entrar()">ACCEDER AL PANEL</button>
    </div>
  </div>
  <div id="panel" class="container">
    <header>
      <div>
        <h1>THE YUI-MD</h1>
        <p style="margin: 0; font-size: 12px; color: var(--text-dim);">Centro de Operaciones</p>
      </div>
      <div class="status-badge">ONLINE</div>
    </header>
    <div class="tabs">
      <div class="tab activo" data-tab="resumen" onclick="cambiarTab('resumen')">📊 Resumen</div>
      <div class="tab" data-tab="subbots" onclick="cambiarTab('subbots')">🤖 Subbots</div>
      <div class="tab" data-tab="grupos" onclick="cambiarTab('grupos')">👥 Grupos</div>
      <div class="tab" data-tab="economia" onclick="cambiarTab('economia')">💰 Economía</div>
      <div class="tab" data-tab="logs" onclick="cambiarTab('logs')">📄 Terminal</div>
      <button class="tab" style="margin-left: auto; border-color: #ff4444; color: #ff4444;" onclick="salir()">CERRAR SESIÓN</button>
    </div>
    <div id="tab-resumen" class="seccion activa">
      <div class="grid">
        <div class="card stat-card"><div class="stat-value" id="uptime">-</div><div class="stat-label">Actividad</div></div>
        <div class="card stat-card"><div class="stat-value" id="ram">-</div><div class="stat-label">Uso RAM</div></div>
        <div class="card stat-card"><div class="stat-value" id="usuarios">-</div><div class="stat-label">Usuarios</div></div>
        <div class="card stat-card"><div class="stat-value" id="chats">-</div><div class="stat-label">Chats</div></div>
        <div class="card stat-card"><div class="stat-value" id="comandos">-</div><div class="stat-label">Ejecuciones</div></div>
        <div class="card stat-card"><div class="stat-value" id="subbotsActivos">-</div><div class="stat-label">Subbots</div></div>
      </div>
      <div class="card" style="border-style: dashed; opacity: 0.7;">
        <p style="margin: 0; text-align: center; font-size: 13px; color: var(--text-dim);">Actualización automática en tiempo real activa.</p>
      </div>
    </div>
    <div id="tab-subbots" class="seccion">
      <div class="card">
        <h3 style="margin-top: 0;">Lista de Subbots</h3>
        <table id="tablaSubbots"><thead><tr><th>Número</th><th>Estado</th><th>Creador</th></tr></thead><tbody></tbody></table>
      </div>
    </div>
    <div id="tab-grupos" class="seccion">
      <div class="card">
        <h3 style="margin-top: 0;">Top Grupos Activos</h3>
        <table id="tablaGrupos"><thead><tr><th>Nombre del Grupo</th><th>Miembros</th></tr></thead><tbody></tbody></table>
      </div>
    </div>
    <div id="tab-economia" class="seccion">
      <div class="card">
        <h3 style="margin-top: 0;">Top 10 Usuarios Más Ricos</h3>
        <table id="tablaEconomia"><thead><tr><th>Pos</th><th>Usuario</th><th>Saldo Total</th></tr></thead><tbody></tbody></table>
      </div>
    </div>
    <div id="tab-logs" class="seccion">
      <div class="card">
        <h3 style="margin-top: 0;">Salida de la Terminal</h3>
        <pre id="cajaLogs">Cargando registros...</pre>
      </div>
    </div>
    <div class="footer">
      <p>TheYui-MD &copy; 2026 — Desarrollado con ❤️ por AmilcarGit</p>
    </div>
  </div>
<script>
  var tokenGuardado = localStorage.getItem('panelToken') || '';
  function cabecera() {
    return { 'x-panel-token': tokenGuardado };
  }
  async function entrar() {
    var valor = document.getElementById('token').value;
    if (valor) tokenGuardado = valor;
    try {
      var res = await fetch('/api/status', { headers: cabecera() });
      if (!res.ok) throw new Error();
      localStorage.setItem('panelToken', tokenGuardado);
      document.getElementById('login').style.display = 'none';
      document.getElementById('panel').style.display = 'block';
      actualizarResumen();
      setInterval(actualizarResumen, 5000);
    } catch (e) {
      alert('Token de acceso incorrecto');
    }
  }
  function salir() {
    localStorage.removeItem('panelToken');
    location.reload();
  }
  function cambiarTab(nombre) {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.toggle('activo', t.dataset.tab === nombre); });
    document.querySelectorAll('.seccion').forEach(function(s) { s.classList.toggle('activa', s.id === 'tab-' + nombre); });
    if (nombre === 'subbots') cargarSubbots();
    if (nombre === 'grupos') cargarGrupos();
    if (nombre === 'economia') cargarEconomia();
    if (nombre === 'logs') cargarLogs();
  }
  async function actualizarResumen() {
    try {
      var res = await fetch('/api/status', { headers: cabecera() });
      if (!res.ok) return;
      var d = await res.json();
      document.getElementById('uptime').textContent = d.uptime;
      document.getElementById('ram').textContent = d.ram;
      document.getElementById('usuarios').textContent = d.usuarios;
      document.getElementById('chats').textContent = d.chats;
      document.getElementById('comandos').textContent = d.comandosEjecutados;
      document.getElementById('subbotsActivos').textContent = d.subbots;
    } catch (e) {}
  }
  async function cargarSubbots() {
    var res = await fetch('/api/subbots', { headers: cabecera() });
    var data = await res.json();
    var cuerpo = document.querySelector('#tablaSubbots tbody');
    if (data.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="3" class="vacio">No hay subbots activos</td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < data.length; i++) {
      var s = data[i];
      var estado = s.conectado ? 'on' : 'off';
      var textoEstado = s.conectado ? 'Conectado' : 'Desconectado';
      var creador = s.creadorJid ? s.creadorJid.split('@')[0] : '-';
      html += '<tr><td>' + s.numero + '</td><td><span class="dot ' + estado + '"></span>' + textoEstado + '</td><td>' + creador + '</td></tr>';
    }
    cuerpo.innerHTML = html;
  }
  async function cargarGrupos() {
    var res = await fetch('/api/grupos', { headers: cabecera() });
    var data = await res.json();
    var cuerpo = document.querySelector('#tablaGrupos tbody');
    if (data.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="2" class="vacio">Sin información de grupos</td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < data.length; i++) {
      var g = data[i];
      html += '<tr><td>' + g.nombre + '</td><td>' + g.miembros + '</td></tr>';
    }
    cuerpo.innerHTML = html;
  }
  async function cargarEconomia() {
    var res = await fetch('/api/economia-top', { headers: cabecera() });
    var data = await res.json();
    var cuerpo = document.querySelector('#tablaEconomia tbody');
    if (data.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="3" class="vacio">Sin datos económicos</td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < data.length; i++) {
      var u = data[i];
      html += '<tr><td>' + (i + 1) + '</td><td>' + u.numero + '</td><td>' + u.total.toLocaleString() + ' 💰</td></tr>';
    }
    cuerpo.innerHTML = html;
  }
  async function cargarLogs() {
    var res = await fetch('/api/logs', { headers: cabecera() });
    var data = await res.json();
    var caja = document.getElementById('cajaLogs');
    caja.textContent = data.texto || 'Sin registros.';
    caja.scrollTop = caja.scrollHeight;
  }
  if (tokenGuardado) {
    fetch('/api/status', { headers: cabecera() }).then(function(res) {
      if (res.ok) {
        document.getElementById('login').style.display = 'none';
        document.getElementById('panel').style.display = 'block';
        actualizarResumen();
        setInterval(actualizarResumen, 5000);
      }
    });
  }
</script>
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  if (!config.panelToken || config.panelToken === 'cambia-este-token') {
    logError('⚠️ Panel web desactivado: cambia config.panelToken por uno único antes de activarlo.')
    return
  }
  const app = express()
  app.get('/', (req, res) => {
    res.send(paginaHtml())
  })
  app.get('/api/status', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      const memoria = process.memoryUsage()
      res.json({
        uptime: formatearUptime(process.uptime()),
        ram: (memoria.rss / 1024 / 1024).toFixed(1) + ' MB',
        usuarios: Object.keys(db.data.users || {}).length,
        chats: Object.keys(db.data.chats || {}).length,
        comandosEjecutados: db.data.stats?.comandosEjecutados || 0,
        subbots: listarSubbots().filter((s) => s.conectado).length,
      })
    } catch (err) {
      res.status(500).json({ error: 'Error interno' })
    }
  })
  app.get('/api/subbots', verificarToken, (req, res) => {
    res.json(listarSubbots())
  })
  app.get('/api/grupos', verificarToken, async (req, res) => {
    try {
      if (!sockActivo) return res.json([])
      const grupos = await sockActivo.groupFetchAllParticipating()
      const lista = Object.values(grupos)
        .map((g) => ({ nombre: g.subject, miembros: g.participants.length }))
        .sort((a, b) => b.miembros - a.miembros)
        .slice(0, 20)
      res.json(lista)
    } catch (err) {
      res.json([])
    }
  })
  app.get('/api/economia-top', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      const lista = Object.entries(db.data.users || {})
        .filter(([, u]) => u.economia)
        .map(([jid, u]) => ({
          numero: jid.split('@')[0],
          total: (u.economia.saldo || 0) + (u.economia.banco || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
      res.json(lista)
    } catch (err) {
      res.json([])
    }
  })
  app.get('/api/logs', verificarToken, (req, res) => {
    try {
      const rutaLog = path.join(process.cwd(), 'logs', 'bot.log')
      if (!fs.existsSync(rutaLog)) {
        return res.json({ texto: '' })
      }
      const contenido = fs.readFileSync(rutaLog, 'utf-8')
      const lineas = contenido.trim().split('\n').slice(-50)
      res.json({ texto: lineas.join('\n') })
    } catch (err) {
      res.json({ texto: '' })
    }
  })
  app.listen(config.panelPort, () => {
    info('🌐 Panel web disponible en puerto ' + config.panelPort)
  })
}
