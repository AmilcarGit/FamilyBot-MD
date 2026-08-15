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
    <title>${config.nombreBot} | Core Center</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --neon-pink: #ff007f;
            --neon-blue: #00d4ff;
            --neon-purple: #b000ff;
            --bg-dark: #050508;
            --card-bg: rgba(15, 15, 25, 0.9);
        }
        body {
            background-color: var(--bg-dark);
            color: #e0e0e6;
            font-family: 'Rajdhani', sans-serif;
            background-image: 
                radial-gradient(circle at 5% 5%, rgba(255, 0, 127, 0.1) 0%, transparent 30%),
                radial-gradient(circle at 95% 95%, rgba(0, 212, 255, 0.1) 0%, transparent 30%);
            margin: 0;
            min-height: 100vh;
        }
        .orbitron { font-family: 'Orbitron', sans-serif; }
        .glass {
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        .neon-text-pink { color: var(--neon-pink); text-shadow: 0 0 10px var(--neon-pink); }
        .neon-text-blue { color: var(--neon-blue); text-shadow: 0 0 10px var(--neon-blue); }
        .btn-cyber {
            background: linear-gradient(45deg, var(--neon-pink), var(--neon-purple));
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: 0.3s;
            border: none;
            cursor: pointer;
        }
        .btn-cyber:active { transform: scale(0.95); }
        .nav-btn {
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            color: #888;
            transition: 0.3s;
            white-space: nowrap;
        }
        .nav-btn.active {
            background: rgba(0, 212, 255, 0.1);
            border-color: var(--neon-blue);
            color: white;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
        }
        .terminal {
            background: #000;
            font-family: monospace;
            padding: 15px;
            border-radius: 10px;
            height: 250px;
            overflow-y: auto;
            font-size: 0.8rem;
            border: 1px solid #222;
        }
        .stat-card {
            border-left: 4px solid var(--neon-pink);
            padding: 15px;
        }
        .hidden { display: none !important; }
        input, select, textarea {
            background: #000 !important;
            border: 1px solid #333 !important;
            color: white !important;
            border-radius: 8px !important;
            padding: 10px !important;
            outline: none !important;
        }
        input:focus { border-color: var(--neon-pink) !important; }
    </style>
</head>
<body class="p-4 md:p-8">

    <div id="login-screen" class="max-w-md mx-auto mt-20 text-center glass p-8 rounded-2xl animate__animated animate__fadeIn">
        <h1 class="orbitron text-4xl font-black neon-text-pink mb-2">${config.nombreBot}</h1>
        <p class="text-gray-500 tracking-[0.3em] text-[10px] mb-8 uppercase">Neural Security Gate V5</p>
        <input type="password" id="tk-input" placeholder="TOKEN DE ACCESO" class="w-full mb-6">
        <button id="btn-auth" class="btn-cyber w-full py-4 rounded-xl shadow-lg">Autenticar Sistema</button>
    </div>

    <div id="dashboard-ui" class="hidden max-w-6xl mx-auto animate__animated animate__fadeIn">
        <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 glass p-6 rounded-2xl">
            <div>
                <h1 class="orbitron text-2xl font-black neon-text-blue">${config.nombreBot} <span class="text-[10px] bg-pink-500/20 text-pink-500 px-2 py-1 rounded ml-2">CORE</span></h1>
                <p class="text-gray-500 text-xs mt-1 uppercase tracking-widest">Sistema de Control Centralizado</p>
            </div>
            <div class="flex gap-3">
                <div class="glass px-4 py-2 rounded-xl flex items-center gap-2">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                    <span class="text-xs font-bold">ACTIVO</span>
                </div>
                <button onclick="reiniciarBot()" class="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all">REINICIAR</button>
            </div>
        </header>

        <nav class="flex overflow-x-auto gap-2 mb-8 no-scrollbar pb-2">
            <button onclick="tab('d')" id="n-d" class="nav-btn active flex items-center gap-2"><i data-lucide="layout-dashboard" class="w-4 h-4"></i> Dashboard</button>
            <button onclick="tab('u')" id="n-u" class="nav-btn flex items-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> Usuarios</button>
            <button onclick="tab('c')" id="n-c" class="nav-btn flex items-center gap-2"><i data-lucide="settings" class="w-4 h-4"></i> Config</button>
            <button onclick="tab('m')" id="n-m" class="nav-btn flex items-center gap-2"><i data-lucide="command" class="w-4 h-4"></i> Comandos</button>
            <button onclick="tab('s')" id="n-s" class="nav-btn flex items-center gap-2"><i data-lucide="cpu" class="w-4 h-4"></i> Sub-Bots</button>
            <button onclick="tab('b')" id="n-b" class="nav-btn flex items-center gap-2"><i data-lucide="megaphone" class="w-4 h-4"></i> Broadcast</button>
            <button onclick="tab('t')" id="n-t" class="nav-btn flex items-center gap-2"><i data-lucide="terminal" class="w-4 h-4"></i> Terminal</button>
        </nav>

        <div id="v-d" class="tab-view space-y-6">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="glass stat-card"><p class="stat-l">Uptime</p><h2 id="st-up" class="stat-v">-</h2></div>
                <div class="glass stat-card" style="border-color:var(--neon-blue)"><p class="stat-l">RAM</p><h2 id="st-rm" class="stat-v">-</h2></div>
                <div class="glass stat-card"><p class="stat-l">Usuarios</p><h2 id="st-us" class="stat-v">-</h2></div>
                <div class="glass stat-card" style="border-color:var(--neon-blue)"><p class="stat-l">Sub-Bots</p><h2 id="st-sb" class="stat-v">-</h2></div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 glass p-6 rounded-2xl">
                    <h3 class="orbitron text-sm mb-4 flex items-center gap-2"><i data-lucide="terminal" class="text-pink-500 w-4 h-4"></i> CONSOLA DEL SISTEMA</h3>
                    <div id="log-box" class="terminal text-pink-500/80"></div>
                </div>
                <div class="glass p-6 rounded-2xl">
                    <h3 class="orbitron text-sm mb-4 flex items-center gap-2"><i data-lucide="activity" class="text-blue-500 w-4 h-4"></i> MONITOR RAM</h3>
                    <canvas id="ram-chart" height="200"></canvas>
                </div>
            </div>
        </div>

        <div id="v-u" class="tab-view hidden glass p-6 rounded-2xl">
            <h3 class="orbitron text-lg mb-6">GESTIÓN DE USUARIOS</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="text-gray-500 text-xs uppercase border-b border-white/5">
                        <tr><th class="p-3">ID Usuario</th><th class="p-3">Diamantes</th><th class="p-3">Estado</th><th class="p-3">Acción</th></tr>
                    </thead>
                    <tbody id="u-table-body" class="text-sm"></tbody>
                </table>
            </div>
        </div>

        <div id="v-c" class="tab-view hidden glass p-6 rounded-2xl max-w-xl mx-auto">
            <h3 class="orbitron text-lg mb-6">CONFIGURACIÓN GLOBAL</h3>
            <div class="space-y-4">
                <div><label class="text-xs text-gray-500">Nombre del Bot</label><input id="in-name" type="text" class="w-full mt-1"></div>
                <div><label class="text-xs text-gray-500">Prefijo</label><input id="in-prefix" type="text" class="w-full mt-1"></div>
                <div><label class="text-xs text-gray-500">Owner (Número)</label><input id="in-owner" type="text" class="w-full mt-1"></div>
                <button onclick="saveC()" class="btn-cyber w-full py-3 rounded-lg mt-4">Guardar Cambios</button>
            </div>
        </div>

        <div id="v-m" class="tab-view hidden glass p-6 rounded-2xl">
            <div class="flex justify-between items-center mb-6">
                <h3 class="orbitron text-lg">GESTOR DE COMANDOS</h3>
                <input oninput="filterM(this.value)" placeholder="Buscar comando..." class="text-xs w-40">
            </div>
            <div class="overflow-x-auto h-[400px] overflow-y-auto">
                <table class="w-full text-left">
                    <thead class="text-gray-500 text-xs uppercase border-b border-white/5">
                        <tr><th class="p-3">Comando</th><th class="p-3">Categoría</th><th class="p-3">Estado</th></tr>
                    </thead>
                    <tbody id="m-table-body" class="text-sm"></tbody>
                </table>
            </div>
        </div>

        <div id="v-s" class="tab-view hidden glass p-6 rounded-2xl">
            <h3 class="orbitron text-lg mb-6">SUB-BOTS ACTIVOS</h3>
            <div id="sb-list" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>
        </div>

        <div id="v-b" class="tab-view hidden glass p-6 rounded-2xl max-w-xl mx-auto">
            <h3 class="orbitron text-lg mb-6">BROADCAST (ANUNCIO)</h3>
            <textarea id="bc-msg" placeholder="Escribe el mensaje aquí..." class="w-full h-32 mb-4"></textarea>
            <button onclick="doBC()" class="btn-cyber w-full py-3 rounded-lg">Enviar a Todos</button>
        </div>

        <div id="v-t" class="tab-view hidden glass p-6 rounded-2xl">
            <h3 class="orbitron text-lg mb-6">TERMINAL DE DIAGNÓSTICO</h3>
            <div class="flex gap-2 mb-4">
                <select id="tr-cmd" class="flex-1">
                    <option value="uptime">Uptime del Servidor</option>
                    <option value="free -h">Estado de la RAM</option>
                    <option value="node -v">Versión de Node.js</option>
                    <option value="df -h">Espacio en Disco</option>
                </select>
                <button onclick="execT()" class="btn-cyber px-6 rounded-lg">EJECUTAR</button>
            </div>
            <pre id="tr-out" class="terminal text-green-400 h-40"></pre>
        </div>
    </div>

    <script>
        var tk = localStorage.getItem('yui_token') || '';
        var bAuth = document.getElementById('btn-auth');
        var iAuth = document.getElementById('tk-input');
        var chart;

        async function auth() {
            var val = iAuth.value || tk;
            if(!val) return alert('INGRESA EL TOKEN');
            bAuth.innerText = 'VERIFICANDO...';
            try {
                var r = await fetch('/api/status?token=' + val);
                if(r.ok) {
                    tk = val;
                    localStorage.setItem('yui_token', val);
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('dashboard-ui').style.display = 'block';
                    init();
                } else {
                    alert('TOKEN INVÁLIDO');
                    bAuth.innerText = 'Autenticar Sistema';
                    localStorage.removeItem('yui_token');
                }
            } catch(e) {
                alert('ERROR DE CONEXIÓN');
                bAuth.innerText = 'Reintentar';
            }
        }

        bAuth.onclick = auth;

        function init() {
            lucide.createIcons();
            var ctx = document.getElementById('ram-chart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'RAM (MB)', data: [], borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.1)', fill: true, tension: 0.4 }] },
                options: { responsive: true, scales: { y: { grid: { color: '#222' } }, x: { display: false } }, plugins: { legend: { display: false } } }
            });
            setInterval(sync, 4000);
            sync();
        }

        async function sync() {
            try {
                var r = await fetch('/api/status?token=' + tk);
                var d = await r.json();
                document.getElementById('st-up').innerText = d.uptime;
                document.getElementById('st-rm').innerText = d.ram;
                document.getElementById('st-us').innerText = d.usuarios;
                document.getElementById('st-sb').innerText = d.subbots;

                chart.data.labels.push('');
                chart.data.datasets[0].data.push(parseFloat(d.ram));
                if(chart.data.labels.length > 20) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
                chart.update();

                var lr = await fetch('/api/logs?token=' + tk);
                var lgs = await lr.json();
                var box = document.getElementById('log-box');
                box.innerHTML = lgs.map(function(l){ return '<div><span class="text-gray-600">['+l.time+']</span> '+l.msg+'</div>'; }).join('');
                box.scrollTop = box.scrollHeight;
            } catch(e) {}
        }

        window.tab = function(id) {
            var views = document.getElementsByClassName('tab-view');
            for(var i=0; i<views.length; i++) views[i].classList.add('hidden');
            document.getElementById('v-' + id).classList.remove('hidden');
            var btns = document.querySelectorAll('.nav-btn');
            for(var i=0; i<btns.length; i++) btns[i].classList.remove('active');
            document.getElementById('n-' + id).classList.add('active');
            if(id==='u') loadU();
            if(id==='c') loadC();
            if(id==='m') loadM();
            if(id==='s') loadS();
        };

        async function loadU() {
            var r = await fetch('/api/usuarios?token=' + tk);
            var u = await r.json();
            var html = '';
            Object.keys(u).forEach(function(k){
                html += '<tr class="border-b border-white/5"><td>'+k.split('@')[0]+'</td><td>'+(u[k].diamantes||0)+'</td><td>'+(u[k].banned?'<span class="text-red-500">Baneado</span>':'<span class="text-green-500">Activo</span>')+'</td><td><button onclick="ban(\''+k+'\','+!u[k].banned+')" class="text-xs '+(u[k].banned?'text-green-500':'text-red-500')+'">'+(u[k].banned?'UNBAN':'BAN')+'</button></td></tr>';
            });
            document.getElementById('u-table-body').innerHTML = html;
        }

        window.ban = async function(j, b) {
            await fetch('/api/usuarios/ban?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({jid:j, banned:b}) });
            loadU();
        };

        async function loadC() {
            var r = await fetch('/api/config?token=' + tk);
            var c = await r.json();
            document.getElementById('in-name').value = c.nombreBot;
            document.getElementById('in-prefix').value = c.prefijo;
            document.getElementById('in-owner').value = c.owner[0];
        }

        window.saveC = async function() {
            var b = { nombreBot: document.getElementById('in-name').value, prefijo: document.getElementById('in-prefix').value, owner: [document.getElementById('in-owner').value] };
            await fetch('/api/config?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(b) });
            alert('CONFIGURACIÓN ACTUALIZADA');
        };

        var allM = [];
        async function loadM() {
            var r = await fetch('/api/comandos?token=' + tk);
            allM = await r.json();
            renderM(allM);
        }

        function renderM(arr) {
            var html = '';
            arr.forEach(function(c){
                html += '<tr class="border-b border-white/5"><td>'+c.nombre+'</td><td>'+c.categoria+'</td><td><button onclick="tgM(\''+c.nombre+'\','+!c.activo+')" class="px-2 py-1 rounded text-[10px] '+(c.activo?'bg-green-500/20 text-green-500':'bg-red-500/20 text-red-500')+'">'+(c.activo?'ON':'OFF')+'</button></td></tr>';
            });
            document.getElementById('m-table-body').innerHTML = html;
        }

        window.filterM = function(v) { renderM(allM.filter(function(c){ return c.nombre.includes(v.toLowerCase()); })); };

        window.tgM = async function(n, a) {
            await fetch('/api/comandos/toggle?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ nombre: n, activo: a }) });
            loadM();
        };

        async function loadS() {
            var r = await fetch('/api/subbots?token=' + tk);
            var b = await r.json();
            document.getElementById('sb-list').innerHTML = b.map(function(x){
                return '<div class="glass p-4 rounded-xl border-l-4 border-blue-500"><p class="text-xs font-bold text-blue-400">'+(x.jid||'SUB-BOT')+'</p><button onclick="stopS(\''+x.jid+'\')" class="mt-2 text-[10px] text-red-500 uppercase font-bold">Detener</button></div>';
            }).join('');
        }

        window.stopS = async function(j) {
            await fetch('/api/subbots/desconectar?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jid: j }) });
            loadS();
        };

        window.doBC = async function() {
            var m = document.getElementById('bc-msg').value;
            if(!m) return alert('Escribe un mensaje');
            await fetch('/api/broadcast?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ mensaje: m }) });
            alert('ANUNCIO ENVIADO');
        };

        window.execT = async function() {
            var c = document.getElementById('tr-cmd').value;
            var r = await fetch('/api/terminal?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cmd: c }) });
            var d = await r.json();
            document.getElementById('tr-out').innerText = d.output;
        };

        window.reiniciarBot = async function() {
            if(confirm('¿Reiniciar el Bot?')) {
                await fetch('/api/restart?token=' + tk, { method: 'POST' });
                location.reload();
            }
        };

        if(tk) auth();
    </script>
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  app.use(express.json())
  
  app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.send(paginaHtml())
  })
  
  app.get('/api/status', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      res.json({
        uptime: process.uptime().toFixed(0) + 's',
        ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
        usuarios: Object.keys(db.data.users || {}).length,
        subbots: listarSubbots ? listarSubbots().filter(s => s.conectado).length : 0
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
      guardarConfig({ ...config, ...req.body })
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.get('/api/comandos', verificarToken, async (req, res) => {
    try {
      res.json(obtenerComandosPanel())
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
          await sockActivo.sendMessage(chatId, { text: mensaje })
        }
      }
      res.json({ status: 'ok' })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.post('/api/terminal', verificarToken, (req, res) => {
    const cmd = String(req.body.cmd || '').trim()
    if (!COMANDOS_TERMINAL_SEGUROS.has(cmd)) return res.status(403).json({ error: 'No permitido' })
    exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
      res.json({ output: stdout || stderr || 'OK' })
    })
  })

  app.post('/api/restart', verificarToken, (req, res) => {
    res.json({ status: 'ok' })
    setTimeout(() => process.exit(0), 1000)
  })

  app.listen(config.panelPort, '0.0.0.0', () => {
    const token = obtenerToken()
    console.log('\n' + '═'.repeat(50))
    console.log('🌐 YUI DASHBOARD PRO: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
