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
  const token = req.query.token || req.headers['x-panel-token'] || req.body?.token
  if (token !== obtenerToken()) {
    return res.status(401).json({ error: 'Token inválido' })
  }
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
            --bg-dark: #050508;
            --card-bg: rgba(15, 15, 25, 0.95);
        }
        body {
            background-color: var(--bg-dark);
            color: #e0e0e6;
            font-family: 'Rajdhani', sans-serif;
            margin: 0;
            min-height: 100vh;
        }
        .orbitron { font-family: 'Orbitron', sans-serif; }
        .glass {
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .neon-text-pink { color: var(--neon-pink); text-shadow: 0 0 10px var(--neon-pink); }
        .neon-text-blue { color: var(--neon-blue); text-shadow: 0 0 10px var(--neon-blue); }
        .nav-btn {
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            color: #888;
            white-space: nowrap;
            cursor: pointer;
        }
        .nav-btn.active {
            background: rgba(0, 212, 255, 0.15);
            border-color: var(--neon-blue);
            color: white;
        }
        .term {
            background: #000;
            font-family: monospace;
            padding: 15px;
            border-radius: 10px;
            height: 250px;
            overflow-y: auto;
            font-size: 0.75rem;
            border: 1px solid #222;
            color: #0f0;
        }
        .hidden { display: none !important; }
        input, select, textarea {
            background: #000 !important;
            border: 1px solid #333 !important;
            color: white !important;
            border-radius: 8px !important;
            padding: 10px !important;
            outline: none !important;
            width: 100%;
        }
        .btn-main {
            background: var(--neon-pink);
            color: white;
            font-weight: bold;
            padding: 12px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            text-transform: uppercase;
        }
    </style>
</head>
<body class="p-4">

    <div id="login-screen" class="max-w-xs mx-auto mt-20 text-center glass p-8 rounded-2xl border border-pink-500/30">
        <h1 class="orbitron text-3xl font-black neon-text-pink mb-2">${config.nombreBot}</h1>
        <p class="text-gray-500 text-[10px] mb-8 uppercase tracking-widest">Neural Gate V7</p>
        <input type="password" id="tk-in" placeholder="TOKEN DE ACCESO" class="mb-4">
        <button id="auth-btn" class="btn-main w-full">Autenticar</button>
    </div>

    <div id="panel-ui" class="hidden max-w-5xl mx-auto">
        <header class="flex justify-between items-center mb-6 glass p-4 rounded-xl border-l-4 border-blue-500">
            <div>
                <h1 class="orbitron text-xl font-black neon-text-blue">${config.nombreBot}</h1>
                <p class="text-[10px] text-gray-500 uppercase">Control Center</p>
            </div>
            <button onclick="rsBot()" class="text-[10px] bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1 rounded-lg font-bold">REINICIAR</button>
        </header>

        <nav class="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
            <button onclick="swTab('d')" id="n-d" class="nav-btn active">Inicio</button>
            <button onclick="swTab('u')" id="n-u">Usuarios</button>
            <button onclick="swTab('c')" id="n-c">Config</button>
            <button onclick="swTab('m')" id="n-m">Comandos</button>
            <button onclick="swTab('s')" id="n-s">SubBots</button>
            <button onclick="swTab('b')" id="n-b">Anuncio</button>
            <button onclick="swTab('t')" id="n-t">Terminal</button>
        </nav>

        <div id="v-d" class="tab-content">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div class="glass p-4 rounded-xl border-l-2 border-pink-500"><p class="text-[10px] text-gray-500 uppercase">Uptime</p><b id="st-up" class="text-lg">-</b></div>
                <div class="glass p-4 rounded-xl border-l-2 border-blue-500"><p class="text-[10px] text-gray-500 uppercase">RAM</p><b id="st-rm" class="text-lg">-</b></div>
                <div class="glass p-4 rounded-xl border-l-2 border-pink-500"><p class="text-[10px] text-gray-500 uppercase">Users</p><b id="st-us" class="text-lg">-</b></div>
                <div class="glass p-4 rounded-xl border-l-2 border-blue-500"><p class="text-[10px] text-gray-500 uppercase">Subs</p><b id="st-sb" class="text-lg">-</b></div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="glass p-5 rounded-xl"><h3 class="text-xs font-bold text-pink-500 mb-3 uppercase">Consola</h3><div id="log-box" class="term"></div></div>
                <div class="glass p-5 rounded-xl"><h3 class="text-xs font-bold text-blue-500 mb-3 uppercase">RAM Monitor</h3><canvas id="ram-chart" height="150"></canvas></div>
            </div>
        </div>

        <div id="v-u" class="tab-content hidden glass p-5 rounded-xl">
            <h3 class="text-sm font-bold mb-4 uppercase">Gestión de Usuarios</h3>
            <div class="overflow-x-auto"><table class="w-full text-left text-xs"><thead><tr class="text-gray-500 border-b border-white/5"><th>ID</th><th>Diamantes</th><th>Acción</th></tr></thead><tbody id="u-tb"></tbody></table></div>
        </div>

        <div id="v-c" class="tab-content hidden glass p-5 rounded-xl max-w-md mx-auto">
            <h3 class="text-sm font-bold mb-4 uppercase">Configuración</h3>
            <div class="space-y-3">
                <div><label class="text-[10px] text-gray-500">Nombre</label><input id="cfg-n" type="text"></div>
                <div><label class="text-[10px] text-gray-500">Prefijo</label><input id="cfg-p" type="text"></div>
                <div><label class="text-[10px] text-gray-500">Owner</label><input id="cfg-o" type="text"></div>
                <button onclick="svCfg()" class="btn-main w-full mt-2">Guardar</button>
            </div>
        </div>

        <div id="v-m" class="tab-content hidden glass p-5 rounded-xl">
            <div class="flex justify-between items-center mb-4"><h3 class="text-sm font-bold uppercase">Comandos</h3><input oninput="fltM(this.value)" placeholder="Buscar..." class="text-[10px] !w-32"></div>
            <div class="overflow-x-auto h-80"><table class="w-full text-left text-xs"><thead><tr class="text-gray-500 border-b border-white/5"><th>Nombre</th><th>Estado</th></tr></thead><tbody id="m-tb"></tbody></table></div>
        </div>

        <div id="v-s" class="tab-content hidden glass p-5 rounded-xl"><h3 class="text-sm font-bold mb-4 uppercase">Sub-Bots</h3><div id="s-ls" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div></div>

        <div id="v-b" class="tab-content hidden glass p-5 rounded-xl max-w-md mx-auto">
            <h3 class="text-sm font-bold mb-4 uppercase">Broadcast</h3>
            <textarea id="bc-msg" placeholder="Mensaje..." class="h-32 mb-3"></textarea>
            <button onclick="doBC()" class="btn-main w-full">Enviar Anuncio</button>
        </div>

        <div id="v-t" class="tab-content hidden glass p-5 rounded-xl">
            <h3 class="text-sm font-bold mb-4 uppercase">Terminal</h3>
            <div class="flex gap-2 mb-3"><select id="tr-s" class="text-xs"><option value="uptime">Uptime</option><option value="free -h">RAM</option><option value="node -v">Node</option></select><button onclick="doT()" class="btn-main !py-2 px-4 text-xs">EJECUTAR</button></div>
            <pre id="tr-out" class="term h-32 text-blue-400"></pre>
        </div>
    </div>

    <script>
        var tk = localStorage.getItem('yui_token') || '';
        var bAuth = document.getElementById('auth-btn');
        var iAuth = document.getElementById('tk-in');
        var chart;

        async function auth() {
            var v = iAuth.value || tk;
            if(!v) return alert('TOKEN REQUERIDO');
            bAuth.innerText = 'CONECTANDO...';
            try {
                var r = await fetch('/api/status?token=' + v);
                if(r.ok) {
                    tk = v;
                    localStorage.setItem('yui_token', v);
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('panel-ui').style.display = 'block';
                    init();
                } else {
                    alert('TOKEN INVÁLIDO');
                    bAuth.innerText = 'Autenticar';
                    localStorage.removeItem('yui_token');
                }
            } catch(e) { alert('ERROR DE CONEXIÓN'); bAuth.innerText = 'Reintentar'; }
        }

        bAuth.onclick = auth;

        function init() {
            if(typeof lucide !== 'undefined') lucide.createIcons();
            var ctx = document.getElementById('ram-chart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'RAM', data: [], borderColor: '#00d4ff', tension: 0.4 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: '#222' } } } }
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
                if(chart.data.labels.length > 15) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
                chart.update();

                var lr = await fetch('/api/logs?token=' + tk);
                var lgs = await lr.json();
                var box = document.getElementById('log-box');
                box.innerHTML = lgs.map(function(x){ return '<div><span class="text-pink-500">['+x.time+']</span> '+x.msg+'</div>'; }).join('');
                box.scrollTop = box.scrollHeight;
            } catch(e) {}
        }

        window.swTab = function(id) {
            var tabs = document.getElementsByClassName('tab-content');
            for(var i=0; i<tabs.length; i++) tabs[i].classList.add('hidden');
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
            var h = '';
            Object.keys(u).forEach(function(k){
                h += '<tr class="border-b border-white/5"><td class="py-2">'+k.split('@')[0]+'</td><td>'+(u[k].diamantes||0)+'</td><td><button onclick="doBan(\''+k+'\','+!u[k].banned+')" class="text-xs '+(u[k].banned?'text-green-500':'text-red-500')+'">'+(u[k].banned?'UNBAN':'BAN')+'</button></td></tr>';
            });
            document.getElementById('u-tb').innerHTML = h;
        }

        window.doBan = async function(j, b) {
            await fetch('/api/usuarios/ban?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({jid:j, banned:b}) });
            loadU();
        };

        async function loadC() {
            var r = await fetch('/api/config?token=' + tk);
            var c = await r.json();
            document.getElementById('cfg-n').value = c.nombreBot;
            document.getElementById('cfg-p').value = c.prefijo;
            document.getElementById('cfg-o').value = c.owner[0];
        }

        window.svCfg = async function() {
            var b = { nombreBot: document.getElementById('cfg-n').value, prefijo: document.getElementById('cfg-p').value, owner: [document.getElementById('cfg-o').value] };
            await fetch('/api/config?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(b) });
            alert('GUARDADO');
        };

        var allM = [];
        async function loadM() {
            var r = await fetch('/api/comandos?token=' + tk);
            allM = await r.json();
            rdM(allM);
        }

        function rdM(a) {
            var h = '';
            a.forEach(function(c){
                h += '<tr class="border-b border-white/5"><td class="py-2">'+c.nombre+'</td><td><button onclick="tgM(\''+c.nombre+'\','+!c.activo+')" class="text-[10px] '+(c.activo?'text-green-500':'text-red-500')+'">'+(c.activo?'ON':'OFF')+'</button></td></tr>';
            });
            document.getElementById('m-tb').innerHTML = h;
        }

        window.fltM = function(v) { rdM(allM.filter(function(c){ return c.nombre.includes(v.toLowerCase()); })); };

        window.tgM = async function(n, a) {
            await fetch('/api/comandos/toggle?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ nombre: n, activo: a }) });
            loadM();
        };

        async function loadS() {
            var r = await fetch('/api/subbots?token=' + tk);
            var b = await r.json();
            document.getElementById('s-ls').innerHTML = b.map(function(x){
                return '<div class="glass p-3 rounded-lg border-l-2 border-blue-500"><p class="text-[10px] font-bold text-blue-400">'+(x.jid||'BOT')+'</p><button onclick="stS(\''+x.jid+'\')" class="mt-2 text-[8px] text-red-500 font-bold uppercase">Parar</button></div>';
            }).join('');
        }

        window.stS = async function(j) {
            await fetch('/api/subbots/desconectar?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jid: j }) });
            loadS();
        };

        window.doBC = async function() {
            var m = document.getElementById('bc-msg').value;
            if(!m) return alert('Escribe algo');
            await fetch('/api/broadcast?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ mensaje: m }) });
            alert('ENVIADO');
        };

        window.doT = async function() {
            var c = document.getElementById('tr-s').value;
            var r = await fetch('/api/terminal?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cmd: c }) });
            var d = await r.json();
            document.getElementById('tr-out').innerText = d.output || d.error;
        };

        window.rsBot = async function() { if(confirm('¿Reiniciar?')) { await fetch('/api/restart?token=' + tk, { method: 'POST' }); location.reload(); } };

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
    console.log('🌐 YUI CORE PANEL V7: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
