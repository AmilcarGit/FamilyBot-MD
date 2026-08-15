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
    <title>${config.nombreBot} | Core</title>
    <style>
        body { background: #050508; color: #eee; font-family: sans-serif; margin: 0; padding: 0; }
        .gate { max-width: 320px; margin: 100px auto; padding: 30px; background: #0c0c16; border-radius: 15px; border: 1px solid #ff007f; text-align: center; box-shadow: 0 0 20px rgba(255,0,127,0.2); }
        h1 { color: #ff007f; margin: 0 0 10px 0; font-size: 2rem; }
        .sub { color: #555; font-size: 10px; letter-spacing: 2px; margin-bottom: 25px; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; background: #000; border: 1px solid #333; color: #fff; border-radius: 8px; outline: none; }
        input:focus { border-color: #ff007f; }
        .btn { width: 100%; padding: 12px; background: #ff007f; border: none; color: #fff; font-weight: bold; border-radius: 8px; cursor: pointer; text-transform: uppercase; }
        #main-ui { display: none; padding: 15px; max-width: 1000px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom: 10px; }
        .nav { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 20px; padding-bottom: 5px; }
        .nav button { padding: 8px 15px; background: #111; border: 1px solid #333; color: #888; border-radius: 5px; white-space: nowrap; font-size: 0.8rem; cursor: pointer; }
        .nav button.active { background: #00d4ff; color: #000; border-color: #00d4ff; font-weight: bold; }
        .card { background: #0c0c16; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #222; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .stat { background: #111; padding: 12px; border-radius: 8px; border-left: 4px solid #ff007f; }
        .stat-l { font-size: 0.6rem; color: #666; text-transform: uppercase; }
        .stat-v { font-size: 1.2rem; font-weight: bold; }
        .term { background: #000; padding: 12px; border-radius: 8px; font-family: monospace; height: 250px; overflow-y: auto; font-size: 0.75rem; color: #0f0; border: 1px solid #222; }
        .hidden { display: none !important; }
        table { width: 100%; font-size: 0.8rem; border-collapse: collapse; }
        th { text-align: left; color: #555; padding: 8px; border-bottom: 1px solid #333; }
        td { padding: 8px; border-bottom: 1px solid #111; }
        .btn-s { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; border: none; cursor: pointer; font-weight: bold; }
    </style>
</head>
<body>
    <div id="login-gate" class="gate">
        <h1>THE YUI</h1>
        <div class="sub">CORE COMMAND CENTER</div>
        <input type="password" id="tk" placeholder="TOKEN DE ACCESO">
        <button id="auth-btn" class="btn">Autenticar</button>
    </div>

    <div id="main-ui">
        <div class="header">
            <h2 style="margin:0; color:#00d4ff;">YUI <span style="color:#ff007f; font-size:0.7rem;">ULTRA PRO</span></h2>
            <button onclick="rs()" class="btn-s" style="background:rgba(255,0,0,0.1); color:red; border:1px solid red;">REINICIAR</button>
        </div>

        <div class="nav">
            <button onclick="sw('d')" id="n-d" class="active">Inicio</button>
            <button onclick="sw('u')" id="n-u">Usuarios</button>
            <button onclick="sw('c')" id="n-c">Config</button>
            <button onclick="sw('m')" id="n-m">Comandos</button>
            <button onclick="sw('s')" id="n-s">SubBots</button>
            <button onclick="sw('b')" id="n-b">Anuncio</button>
            <button onclick="sw('t')" id="n-t">Terminal</button>
        </div>

        <div id="v-d" class="tab-v">
            <div class="grid">
                <div class="stat"><div class="stat-l">Uptime</div><div id="s-up" class="stat-v">-</div></div>
                <div class="stat" style="border-color:#00d4ff;"><div class="stat-l">RAM</div><div id="s-rm" class="stat-v">-</div></div>
                <div class="stat"><div class="stat-l">Usuarios</div><div id="s-us" class="stat-v">-</div></div>
                <div class="stat" style="border-color:#00d4ff;"><div class="stat-l">Sub-Bots</div><div id="s-sb" class="stat-v">-</div></div>
            </div>
            <div class="card">
                <div style="font-size:0.7rem; font-weight:bold; color:#ff007f; margin-bottom:10px; display:flex; align-items:center; gap:5px;">
                    <span style="width:6px; height:6px; background:#ff007f; border-radius:50%;"></span> CONSOLA EN VIVO
                </div>
                <div id="l-box" class="term"></div>
            </div>
            <div class="card">
                <canvas id="r-chart" height="120"></canvas>
            </div>
        </div>

        <div id="v-u" class="tab-v hidden">
            <div class="card">
                <h3>Usuarios</h3>
                <div style="overflow-x:auto;"><table id="u-tb"></table></div>
            </div>
        </div>

        <div id="v-c" class="tab-v hidden">
            <div class="card" style="max-width:500px; margin:0 auto;">
                <h3>Configuración</h3>
                <label style="font-size:0.7rem; color:#666;">Nombre del Bot</label><input id="c-n" type="text">
                <label style="font-size:0.7rem; color:#666;">Prefijo</label><input id="c-p" type="text">
                <label style="font-size:0.7rem; color:#666;">Owner</label><input id="c-o" type="text">
                <button onclick="svC()" class="btn">Guardar Cambios</button>
            </div>
        </div>

        <div id="v-m" class="tab-v hidden">
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3>Comandos</h3>
                    <input id="m-q" oninput="fM(this.value)" placeholder="Buscar..." style="width:150px; margin:0; padding:5px;">
                </div>
                <div style="overflow-x:auto; height:350px;"><table id="m-tb"></table></div>
            </div>
        </div>

        <div id="v-s" class="tab-v hidden"><div class="card"><h3>Sub-Bots</h3><div id="s-ls" class="grid"></div></div></div>
        
        <div id="v-b" class="tab-v hidden">
            <div class="card" style="max-width:500px; margin:0 auto;">
                <h3>Enviar Anuncio</h3>
                <textarea id="bc-m" style="width:100%; height:100px; background:#000; color:#fff; border:1px solid #333; padding:10px; border-radius:8px; outline:none;"></textarea>
                <button onclick="doBC()" class="btn" style="margin-top:15px;">Enviar a Todos</button>
            </div>
        </div>

        <div id="v-t" class="tab-v hidden">
            <div class="card">
                <h3>Terminal</h3>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <select id="t-s" style="flex:1; background:#000; color:#fff; border:1px solid #333; padding:10px; border-radius:8px;">
                        <option value="uptime">Uptime</option>
                        <option value="free -h">RAM</option>
                        <option value="node -v">Node</option>
                    </select>
                    <button onclick="doT()" class="btn" style="width:auto; padding:0 20px;">EJECUTAR</button>
                </div>
                <pre id="t-r" class="term" style="height:120px; color:#00d4ff;"></pre>
            </div>
        </div>
    </div>

    <script>
        var tk = localStorage.getItem('yui_token') || '';
        var b = document.getElementById('auth-btn');
        var i = document.getElementById('tk');
        var chart;

        async function login() {
            var v = i.value || tk;
            if (!v) { alert('INGRESA EL TOKEN'); return; }
            b.innerText = 'CONECTANDO...';
            b.disabled = true;
            try {
                var r = await fetch('/api/status?token=' + v);
                if (r.ok) {
                    tk = v;
                    localStorage.setItem('yui_token', v);
                    document.getElementById('login-gate').style.display = 'none';
                    document.getElementById('main-ui').style.display = 'block';
                    loadScripts();
                } else {
                    alert('TOKEN INVÁLIDO');
                    b.innerText = 'Autenticar';
                    b.disabled = false;
                    localStorage.removeItem('yui_token');
                }
            } catch (e) {
                alert('ERROR DE RED');
                b.innerText = 'Reintentar';
                b.disabled = false;
            }
        }

        b.onclick = login;
        b.ontouchstart = function(e) { e.preventDefault(); login(); };

        function loadScripts() {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            s.onload = function() {
                var ctx = document.getElementById('r-chart').getContext('2d');
                chart = new Chart(ctx, {
                    type: 'line',
                    data: { labels: [], datasets: [{ label: 'RAM', data: [], borderColor: '#00d4ff', tension: 0.4 }] },
                    options: { responsive: true, plugins: { legend: { display: false } } }
                });
                setInterval(sync, 4000);
                sync();
            };
            document.head.appendChild(s);
        }

        async function sync() {
            try {
                var r = await fetch('/api/status?token=' + tk);
                var d = await r.json();
                document.getElementById('s-up').innerText = d.uptime;
                document.getElementById('s-rm').innerText = d.ram;
                document.getElementById('s-us').innerText = d.usuarios;
                document.getElementById('s-sb').innerText = d.subbots;
                
                if (chart) {
                    chart.data.labels.push('');
                    chart.data.datasets[0].data.push(parseFloat(d.ram));
                    if (chart.data.labels.length > 20) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
                    chart.update();
                }

                var lr = await fetch('/api/logs?token=' + tk);
                var lgs = await lr.json();
                var box = document.getElementById('l-box');
                box.innerHTML = lgs.map(function(x){ return '<div><span style="color:#ff007f">['+x.time+']</span> '+x.msg+'</div>'; }).join('');
                box.scrollTop = box.scrollHeight;
            } catch(e) {}
        }

        window.sw = function(id) {
            var vs = document.getElementsByClassName('tab-v');
            for(var j=0; j<vs.length; j++) vs[j].classList.add('hidden');
            document.getElementById('v-' + id).classList.remove('hidden');
            var bs = document.querySelectorAll('.nav button');
            for(var j=0; j<bs.length; j++) bs[j].classList.remove('active');
            document.getElementById('n-' + id).classList.add('active');
            if(id==='u') loadU();
            if(id==='c') loadC();
            if(id==='m') loadM();
            if(id==='s') loadS();
        };

        async function loadU() {
            var r = await fetch('/api/usuarios?token=' + tk);
            var u = await r.json();
            var h = '<tr><th>User</th><th>Acción</th></tr>';
            Object.keys(u).forEach(function(k){
                h += '<tr><td>'+k.split('@')[0]+'</td><td><button onclick="bn(\''+k+'\','+!u[k].banned+')" class="btn-s" style="background:'+(u[k].banned?'#0f0':'#f00')+'">'+(u[k].banned?'UNBAN':'BAN')+'</button></td></tr>';
            });
            document.getElementById('u-tb').innerHTML = h;
        }

        window.bn = async function(j, b) {
            await fetch('/api/usuarios/ban?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({jid:j, banned:b}) });
            loadU();
        };

        async function loadC() {
            var r = await fetch('/api/config?token=' + tk);
            var c = await r.json();
            document.getElementById('c-n').value = c.nombreBot;
            document.getElementById('c-p').value = c.prefijo;
            document.getElementById('c-o').value = c.owner[0];
        }

        window.svC = async function() {
            var b = { nombreBot: document.getElementById('c-n').value, prefijo: document.getElementById('c-p').value, owner: [document.getElementById('c-o').value] };
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
            var h = '<tr><th>Comando</th><th>On/Off</th></tr>';
            a.forEach(function(c){
                h += '<tr><td>'+c.nombre+'</td><td><button onclick="tg(\''+c.nombre+'\','+!c.activo+')" class="btn-s" style="background:'+(c.activo?'#0f0':'#f00')+'">'+(c.activo?'ON':'OFF')+'</button></td></tr>';
            });
            document.getElementById('m-tb').innerHTML = h;
        }

        window.fM = function(v) { rdM(allM.filter(function(c){ return c.nombre.includes(v.toLowerCase()); })); };

        window.tg = async function(n, a) {
            await fetch('/api/comandos/toggle?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ nombre: n, activo: a }) });
            loadM();
        };

        async function loadS() {
            var r = await fetch('/api/subbots?token=' + tk);
            var b = await r.json();
            document.getElementById('s-ls').innerHTML = b.map(function(x){
                return '<div class="stat"><div class="stat-l">'+(x.jid||'SUB')+'</div><button onclick="spS(\''+x.jid+'\')" class="btn-s" style="background:red; margin-top:5px;">STOP</button></div>';
            }).join('');
        }

        window.spS = async function(j) {
            await fetch('/api/subbots/desconectar?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jid: j }) });
            loadS();
        };

        window.doBC = async function() {
            var m = document.getElementById('bc-m').value;
            if(!m) return;
            await fetch('/api/broadcast?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ mensaje: m }) });
            alert('ENVIADO');
        };

        window.doT = async function() {
            var c = document.getElementById('t-s').value;
            var r = await fetch('/api/terminal?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cmd: c }) });
            var d = await r.json();
            document.getElementById('t-r').innerText = d.output || d.error;
        };

        window.rs = async function() { if(confirm('¿Reiniciar?')) { await fetch('/api/restart?token=' + tk, { method: 'POST' }); location.reload(); } };

        if (tk) login();
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
    console.log('🌐 YUI CORE PANEL: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
