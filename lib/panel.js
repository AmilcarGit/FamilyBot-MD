import express from 'express'
import fs from 'fs'
import path from 'path'
import { getDB } from './db.js'
import { listarSubbots, detenerSubbot } from '../subbots/manager.js'
import { obtenerComandosPanel } from '../handler.js'
import config from '../config.js'
import { randomBytes } from 'crypto'
import { exec } from 'child_process'

let sockActivo = null
let tokenUnico = null
const logsBuffer = []
const MAX_LOGS = 100
const COMANDOS_TERMINAL_SEGUROS = new Set(['node -v', 'npm -v', 'npm list --depth=0', 'uptime', 'free -h', 'df -h'])

const originalLog = console.log
console.log = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')
  logsBuffer.push({ time: new Date().toLocaleTimeString(), msg })
  if (logsBuffer.length > MAX_LOGS) logsBuffer.shift()
  originalLog.apply(console, args)
}

export function establecerSockActivo(sock) {
  sockActivo = sock
}

function obtenerToken() {
  if (tokenUnico) return tokenUnico
  const rutaToken = path.join(process.cwd(), '.panel_token')
  if (fs.existsSync(rutaToken)) {
    tokenUnico = fs.readFileSync(rutaToken, 'utf-8').trim()
  } else {
    tokenUnico = 'yui-' + randomBytes(4).toString('hex')
    fs.writeFileSync(rutaToken, tokenUnico)
  }
  return tokenUnico
}

function verificarToken(req, res, next) {
  const token = req.query.token || req.headers['x-panel-token']
  if (token !== obtenerToken()) return res.status(401).json({ error: 'Token inválido' })
  next()
}

function guardarConfig(nuevoConfig) {
  const rutaConfig = path.join(process.cwd(), 'config.js')
  const contenido = `export default ${JSON.stringify(nuevoConfig, null, 2)}\n`
  fs.writeFileSync(rutaConfig, contenido)
  Object.assign(config, nuevoConfig)
}

function paginaHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${config.nombreBot} | Core Control</title>
    <style>
        :root {
            --neon-pink: #ff007f;
            --neon-blue: #00d4ff;
            --bg-dark: #030305;
            --card-bg: rgba(12, 12, 22, 0.95);
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body {
            background-color: var(--bg-dark);
            color: #e0e0e6;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .login-container {
            max-width: 400px;
            width: 90%;
            margin: auto;
            padding: 40px 20px;
            background: var(--card-bg);
            border-radius: 20px;
            border: 1px solid rgba(255, 0, 127, 0.3);
            box-shadow: 0 0 30px rgba(255, 0, 127, 0.1);
            text-align: center;
        }
        h1 { font-size: 2.5rem; color: var(--neon-pink); text-shadow: 0 0 10px var(--neon-pink); margin-bottom: 10px; }
        .subtitle { color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 0.8rem; margin-bottom: 30px; }
        input {
            width: 100%;
            padding: 15px;
            background: #000;
            border: 1px solid #333;
            border-radius: 10px;
            color: #fff;
            font-size: 1rem;
            margin-bottom: 20px;
            outline: none;
            transition: border-color 0.3s;
        }
        input:focus { border-color: var(--neon-pink); }
        .btn-main {
            width: 100%;
            padding: 15px;
            background: linear-gradient(45deg, var(--neon-pink), #b000ff);
            border: none;
            border-radius: 10px;
            color: #fff;
            font-weight: bold;
            font-size: 1rem;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: 0.3s;
        }
        .btn-main:active { transform: scale(0.98); opacity: 0.9; }
        .btn-main:disabled { background: #444; cursor: not-allowed; }
        #panel { display: none; padding: 20px; width: 100%; max-width: 1200px; margin: 0 auto; }
        .hidden { display: none !important; }
        
        .header { display: flex; justify-between: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 20px; }
        .nav { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 30px; scrollbar-width: none; }
        .nav::-webkit-scrollbar { display: none; }
        .nav-btn {
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #aaa;
            cursor: pointer;
            white-space: nowrap;
            font-weight: 600;
        }
        .nav-btn.active { background: rgba(0, 212, 255, 0.2); border-color: var(--neon-blue); color: #fff; }
        
        .card { background: var(--card-bg); border-radius: 15px; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 15px; border-left: 4px solid var(--neon-pink); }
        .stat-val { font-size: 1.5rem; font-weight: bold; color: #fff; }
        .stat-label { font-size: 0.7rem; color: #888; text-transform: uppercase; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { text-align: left; padding: 12px; color: #888; font-size: 0.7rem; text-transform: uppercase; border-bottom: 1px solid #222; }
        td { padding: 12px; border-bottom: 1px solid #111; font-size: 0.9rem; }
        .terminal { background: #000; padding: 15px; border-radius: 10px; font-family: monospace; height: 300px; overflow-y: auto; font-size: 0.8rem; line-height: 1.4; }
        .log-time { color: var(--neon-pink); margin-right: 10px; }
        
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 0.8rem; color: #888; margin-bottom: 8px; text-transform: uppercase; }
    </style>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div id="login-view" class="login-container">
        <h1>${config.nombreBot}</h1>
        <p class="subtitle">Neural Security Gate</p>
        <input type="password" id="token-input" placeholder="TOKEN DE ACCESO">
        <button id="login-btn" onclick="ejecutarLogin()" class="btn-main">Autenticar Sistema</button>
    </div>

    <div id="panel" class="animate-in">
        <div class="header">
            <div>
                <h2 style="margin:0; color:var(--neon-blue);">${config.nombreBot} <span style="font-size:0.6rem; background:rgba(255,0,127,0.2); padding:2px 6px; border-radius:4px; color:var(--neon-pink);">ULTRA PRO</span></h2>
                <div style="font-size:0.7rem; color:#666;">CENTRO DE CONTROL NEURAL</div>
            </div>
            <button onclick="reiniciarBot()" style="background:rgba(255,0,0,0.1); border:1px solid rgba(255,0,0,0.3); color:#ff4444; padding:8px 15px; border-radius:8px; font-weight:bold; cursor:pointer;">REINICIAR</button>
        </div>

        <div class="nav">
            <button onclick="showTab('dashboard')" class="nav-btn active" id="btn-dashboard">Dashboard</button>
            <button onclick="showTab('usuarios')" class="nav-btn" id="btn-usuarios">Usuarios</button>
            <button onclick="showTab('config')" class="nav-btn" id="btn-config">Config</button>
            <button onclick="showTab('comandos')" class="nav-btn" id="btn-comandos">Comandos</button>
            <button onclick="showTab('broadcast')" class="nav-btn" id="btn-broadcast">Broadcast</button>
            <button onclick="showTab('subbots')" class="nav-btn" id="btn-subbots">Sub-Bots</button>
            <button onclick="showTab('terminal')" class="nav-btn" id="btn-terminal">Terminal</button>
        </div>

        <div id="tab-dashboard" class="tab-content">
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-label">Uptime</div><div id="stat-uptime" class="stat-val">-</div></div>
                <div class="stat-card" style="border-color:var(--neon-blue);"><div class="stat-label">RAM</div><div id="stat-ram" class="stat-val">-</div></div>
                <div class="stat-card"><div class="stat-label">Usuarios</div><div id="stat-users" class="stat-val">-</div></div>
                <div class="stat-card" style="border-color:var(--neon-blue);"><div class="stat-label">Sub-Bots</div><div id="stat-subbots" class="stat-val">-</div></div>
            </div>
            <div class="card">
                <h3 style="margin-top:0; font-size:1rem; color:var(--neon-pink);">CONSOLA EN VIVO</h3>
                <div id="live-logs" class="terminal"></div>
            </div>
            <div class="card">
                <h3 style="margin-top:0; font-size:1rem; color:var(--neon-blue);">USO DE RAM</h3>
                <canvas id="ram-chart" height="100"></canvas>
            </div>
        </div>

        <div id="tab-usuarios" class="tab-content hidden">
            <div class="card">
                <h3 style="margin-top:0;">GESTIÓN DE USUARIOS</h3>
                <div style="overflow-x:auto;">
                    <table>
                        <thead><tr><th>Usuario</th><th>Diamantes</th><th>Exp</th><th>Acción</th></tr></thead>
                        <tbody id="users-table"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="tab-config" class="tab-content hidden">
            <div class="card" style="max-width:600px; margin:0 auto;">
                <h3 style="margin-top:0;">CONFIGURACIÓN DEL BOT</h3>
                <form onsubmit="saveConfig(event)">
                    <div class="form-group"><label>Nombre del Bot</label><input id="cfg-name" type="text"></div>
                    <div class="form-group"><label>Prefijo</label><input id="cfg-prefix" type="text"></div>
                    <div class="form-group"><label>Owner Number</label><input id="cfg-owner" type="text"></div>
                    <button type="submit" class="btn-main">Guardar Cambios</button>
                </form>
            </div>
        </div>

        <div id="tab-comandos" class="tab-content hidden">
            <div class="card">
                <h3 style="margin-top:0;">GESTOR DE COMANDOS</h3>
                <input type="text" id="cmd-search" oninput="filterCmds()" placeholder="Buscar comando...">
                <div style="overflow-x:auto;">
                    <table>
                        <thead><tr><th>Comando</th><th>Cat</th><th>Estado</th></tr></thead>
                        <tbody id="cmds-table"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="tab-broadcast" class="tab-content hidden">
            <div class="card" style="max-width:600px; margin:0 auto;">
                <h3 style="margin-top:0;">ENVIAR ANUNCIO</h3>
                <textarea id="bc-msg" style="width:100%; height:150px; background:#000; border:1px solid #333; border-radius:10px; color:#fff; padding:15px; margin-bottom:20px; outline:none;"></textarea>
                <button onclick="sendBC()" class="btn-main">Enviar a Todos</button>
            </div>
        </div>

        <div id="tab-subbots" class="tab-content hidden">
            <div class="card"><h3 style="margin-top:0;">SUB-BOTS ACTIVOS</h3><div id="subbots-list" class="stats-grid"></div></div>
        </div>

        <div id="tab-terminal" class="tab-content hidden">
            <div class="card">
                <h3 style="margin-top:0;">TERMINAL SEGURA</h3>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <select id="term-select" style="flex:1; background:#000; color:#fff; border:1px solid #333; padding:10px; border-radius:8px;">
                        <option value="uptime">Uptime</option>
                        <option value="free -h">RAM Free</option>
                        <option value="node -v">Node Version</option>
                        <option value="df -h">Disk Space</option>
                    </select>
                    <button onclick="runTerm()" class="btn-main" style="width:auto; padding:0 20px;">Ejecutar</button>
                </div>
                <div id="term-res" class="terminal" style="height:200px; color:#0f0;">Esperando...</div>
            </div>
        </div>
    </div>

    <script>
        let token = localStorage.getItem('yui_token') || '';
        let ramHistory = [];
        let labels = [];
        let chart;

        async function ejecutarLogin() {
            const input = document.getElementById('token-input');
            const btn = document.getElementById('login-btn');
            const val = input.value || token;
            
            if (!val) return alert('INGRESA EL TOKEN');
            
            btn.innerText = 'CONECTANDO...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/status', { headers: { 'x-panel-token': val } });
                if (res.ok) {
                    token = val;
                    localStorage.setItem('yui_token', val);
                    document.getElementById('login-view').style.display = 'none';
                    document.getElementById('panel').style.display = 'block';
                    initApp();
                } else {
                    alert('TOKEN INCORRECTO');
                    btn.innerText = 'Autenticar Sistema';
                    btn.disabled = false;
                    localStorage.removeItem('yui_token');
                }
            } catch (e) {
                alert('ERROR DE CONEXIÓN');
                btn.innerText = 'Reintentar';
                btn.disabled = false;
            }
        }

        function initApp() {
            initChart();
            setInterval(updateData, 4000);
            updateData();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        async function updateData() {
            try {
                const res = await fetch('/api/status', { headers: { 'x-panel-token': token } });
                const d = await res.json();
                
                document.getElementById('stat-uptime').innerText = d.uptime;
                document.getElementById('stat-ram').innerText = d.ram;
                document.getElementById('stat-users').innerText = d.usuarios;
                document.getElementById('stat-subbots').innerText = d.subbots;
                
                const ramVal = parseFloat(d.ram);
                ramHistory.push(ramVal);
                labels.push(new Date().toLocaleTimeString());
                if (ramHistory.length > 20) { ramHistory.shift(); labels.shift(); }
                if (chart) chart.update();

                const logRes = await fetch('/api/logs', { headers: { 'x-panel-token': token } });
                const logs = await logRes.json();
                const logDiv = document.getElementById('live-logs');
                logDiv.innerHTML = logs.map(l => '<div><span class="log-time">[' + l.time + ']</span><span>' + l.msg + '</span></div>').join('');
                logDiv.scrollTop = logDiv.scrollHeight;
            } catch (e) {}
        }

        function initChart() {
            const ctx = document.getElementById('ram-chart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'RAM (MB)',
                        data: ramHistory,
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: false, grid: { color: '#222' } }, x: { grid: { display: false } } },
                    plugins: { legend: { display: false } }
                }
            });
        }

        function showTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
            document.getElementById('tab-' + tabId).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-' + tabId).classList.add('active');
            
            if (tabId === 'usuarios') loadUsers();
            if (tabId === 'config') loadConfig();
            if (tabId === 'comandos') loadCmds();
            if (tabId === 'subbots') loadSubbots();
        }

        async function loadUsers() {
            const res = await fetch('/api/usuarios', { headers: { 'x-panel-token': token } });
            const users = await res.json();
            const tbody = document.getElementById('users-table');
            tbody.innerHTML = Object.entries(users).map(([jid, u]) => '<tr>' +
                '<td>' + jid.split('@')[0] + '</td>' +
                '<td>' + (u.diamantes || 0) + '</td>' +
                '<td>' + (u.exp || 0) + '</td>' +
                '<td><button onclick="banUser(\'' + jid + '\', ' + !u.banned + ')" style="color:' + (u.banned ? '#0f0' : '#f00') + '">' + (u.banned ? 'UNBAN' : 'BAN') + '</button></td>' +
                '</tr>').join('');
        }

        async function loadConfig() {
            const res = await fetch('/api/config', { headers: { 'x-panel-token': token } });
            const cfg = await res.json();
            document.getElementById('cfg-name').value = cfg.nombreBot || '';
            document.getElementById('cfg-prefix').value = cfg.prefijo || '';
            document.getElementById('cfg-owner').value = cfg.owner ? cfg.owner[0] : '';
        }

        async function saveConfig(e) {
            e.preventDefault();
            const body = {
                nombreBot: document.getElementById('cfg-name').value,
                prefijo: document.getElementById('cfg-prefix').value,
                owner: [document.getElementById('cfg-owner').value]
            };
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': token },
                body: JSON.stringify(body)
            });
            if (res.ok) alert('Guardado');
        }

        let allCmds = [];
        async function loadCmds() {
            const res = await fetch('/api/comandos', { headers: { 'x-panel-token': token } });
            allCmds = await res.json();
            renderCmds(allCmds);
        }

        function renderCmds(cmds) {
            const tbody = document.getElementById('cmds-table');
            tbody.innerHTML = cmds.map(c => '<tr>' +
                '<td>' + c.nombre + '</td>' +
                '<td>' + c.categoria + '</td>' +
                '<td><button onclick="toggleCmd(\'' + c.nombre + '\', ' + !c.activo + ')" style="color:' + (c.activo ? '#0f0' : '#f00') + '">' + (c.activo ? 'ON' : 'OFF') + '</button></td>' +
                '</tr>').join('');
        }

        function filterCmds() {
            const q = document.getElementById('cmd-search').value.toLowerCase();
            renderCmds(allCmds.filter(c => c.nombre.includes(q)));
        }

        async function toggleCmd(n, a) {
            await fetch('/api/comandos/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': token },
                body: JSON.stringify({ nombre: n, activo: a })
            });
            loadCmds();
        }

        async function sendBC() {
            const msg = document.getElementById('bc-msg').value;
            if (!msg || !confirm('¿Enviar?')) return;
            await fetch('/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': token },
                body: JSON.stringify({ mensaje: msg })
            });
            alert('Enviado');
        }

        async function loadSubbots() {
            const res = await fetch('/api/subbots', { headers: { 'x-panel-token': token } });
            const bots = await res.json();
            const div = document.getElementById('subbots-list');
            div.innerHTML = bots.map(b => '<div class="stat-card">' +
                '<div class="stat-val" style="font-size:0.8rem;">' + (b.jid || 'SubBot') + '</div>' +
                '<button onclick="stopSub(\'' + b.jid + '\')" style="color:#f00; font-size:0.7rem; margin-top:10px; cursor:pointer;">DETENER</button>' +
                '</div>').join('');
        }

        async function stopSub(j) {
            await fetch('/api/subbots/desconectar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': token },
                body: JSON.stringify({ jid: j })
            });
            loadSubbots();
        }

        async function runTerm() {
            const cmd = document.getElementById('term-select').value;
            const res = await fetch('/api/terminal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-panel-token': token },
                body: JSON.stringify({ cmd })
            });
            const d = await res.json();
            document.getElementById('term-res').innerText = d.output || d.error;
        }

        async function reiniciarBot() {
            if (!confirm('¿Reiniciar?')) return;
            await fetch('/api/restart', { method: 'POST', headers: { 'x-panel-token': token } });
            location.reload();
        }

        if (token) ejecutarLogin();
    </script>
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  app.use(express.json())
  
  app.get('/', (req, res) => res.send(paginaHtml()))
  
  app.get('/api/status', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      res.json({
        uptime: process.uptime().toFixed(0) + 's',
        ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
        usuarios: Object.keys(db.data.users || {}).length,
        subbots: listarSubbots ? listarSubbots().filter(s => s.conectado).length : 0,
        stats: db.data.stats || {}
      })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/logs', verificarToken, (req, res) => {
    res.json(logsBuffer)
  })

  app.get('/api/usuarios', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      res.json(db.data.users || {})
    } catch (e) { res.status(500).json({}) }
  })

  app.post('/api/usuarios/ban', verificarToken, async (req, res) => {
    try {
      const { jid, banned } = req.body
      const db = await getDB()
      if (db.data.users && db.data.users[jid]) {
        db.data.users[jid].banned = banned
        await db.write()
      }
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/config', verificarToken, (req, res) => {
    res.json(config)
  })

  app.post('/api/config', verificarToken, (req, res) => {
    try {
      const cambios = {}
      if (typeof req.body.nombreBot === 'string' && req.body.nombreBot.trim()) cambios.nombreBot = req.body.nombreBot.trim().slice(0, 40)
      if (typeof req.body.prefijo === 'string' && req.body.prefijo.trim()) cambios.prefijo = req.body.prefijo.trim().slice(0, 3)
      if (Array.isArray(req.body.owner)) cambios.owner = req.body.owner.map(String).map(n => n.replace(/\D/g, '')).filter(Boolean).slice(0, 5)
      if (Array.isArray(req.body.staff)) cambios.staff = req.body.staff.slice(0, 20)
      guardarConfig({ ...config, ...cambios })
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/comandos', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      const usos = db.data.stats?.comandosPorNombre || {}
      res.json(obtenerComandosPanel().map(c => ({ ...c, uso: usos[c.nombre] || 0 })))
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.post('/api/comandos/toggle', verificarToken, (req, res) => {
    try {
      const nombre = String(req.body.nombre || '').trim().toLowerCase()
      const activo = Boolean(req.body.activo)
      const existe = obtenerComandosPanel().some(c => c.nombre === nombre)
      if (!existe) return res.status(404).json({ error: 'Comando no encontrado' })
      const desactivados = new Set(config.comandosDesactivados || [])
      if (activo) desactivados.delete(nombre)
      else desactivados.add(nombre)
      const comandosDesactivados = [...desactivados]
      guardarConfig({ ...config, comandosDesactivados })
      res.json({ status: 'ok', comandosDesactivados })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/subbots', verificarToken, (req, res) => {
    try {
      res.json(listarSubbots ? listarSubbots() : [])
    } catch (e) { res.json([]) }
  })

  app.post('/api/subbots/desconectar', verificarToken, async (req, res) => {
    try {
      if (detenerSubbot && (req.body.numero || req.body.jid)) await detenerSubbot(req.body.numero || req.body.jid)
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.post('/api/broadcast', verificarToken, async (req, res) => {
    try {
      const { mensaje } = req.body
      if (sockActivo) {
        const db = await getDB()
        const chats = Object.keys(db.data.chats || {})
        for (const chatId of chats) {
          await sockActivo.sendMessage(chatId, { text: `📢 *ANUNCIO OFICIAL*\n\n${mensaje}` })
        }
      }
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.post('/api/terminal', verificarToken, (req, res) => {
    const cmd = String(req.body.cmd || '').trim()
    if (!COMANDOS_TERMINAL_SEGUROS.has(cmd)) return res.status(403).json({ error: 'Comando no permitido. Usa una opción de la lista segura.' })
    exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
      res.json({ output: stdout || stderr || (error ? error.message : 'Ejecutado con éxito') })
    })
  })

  app.post('/api/restart', verificarToken, (req, res) => {
    res.json({ status: 'ok' })
    setTimeout(() => process.exit(0), 1000)
  })

  app.listen(config.panelPort, '0.0.0.0', () => {
    const token = obtenerToken()
    console.log('\n' + '═'.repeat(50))
    console.log('🌐 ULTRA DASHBOARD: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
