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
    <title>TheYui-MD | Control</title>
    <style>
        body { background: #030305; color: #eee; font-family: sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; min-height: 100vh; }
        .login-view { max-width: 320px; margin: 80px auto; padding: 25px; background: #0c0c16; border-radius: 12px; border: 1px solid #ff007f; text-align: center; }
        input { width: 100%; padding: 12px; margin: 15px 0; background: #000; border: 1px solid #444; color: #fff; border-radius: 6px; }
        .btn-p { width: 100%; padding: 12px; background: #ff007f; border: none; color: #fff; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 1rem; }
        #dashboard-view { display: none; padding: 15px; }
        .nav { display: flex; gap: 5px; overflow-x: auto; margin-bottom: 15px; padding: 5px 0; }
        .nav button { padding: 8px 12px; background: #1a1a2e; border: 1px solid #333; color: #aaa; border-radius: 4px; white-space: nowrap; font-size: 0.8rem; }
        .nav button.active { background: #00d4ff; color: #000; }
        .card { background: #0c0c16; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #222; }
        .stat-g { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; }
        .stat-c { background: #111; padding: 10px; border-radius: 6px; border-left: 3px solid #ff007f; }
        .stat-l { font-size: 0.6rem; color: #666; text-transform: uppercase; }
        .stat-v { font-size: 1.1rem; font-weight: bold; }
        .term { background: #000; padding: 10px; border-radius: 4px; font-family: monospace; height: 200px; overflow-y: auto; font-size: 0.7rem; color: #0f0; }
        .hidden { display: none !important; }
        table { width: 100%; font-size: 0.75rem; border-collapse: collapse; }
        th { text-align: left; color: #555; padding: 6px; border-bottom: 1px solid #333; }
        td { padding: 6px; border-bottom: 1px solid #111; }
    </style>
</head>
<body>
    <div id="login-view" class="login-view">
        <h2 style="color:#ff007f; margin:0;">TheYui-MD</h2>
        <p style="font-size: 10px; color: #444;">V4 - ULTRA COMPATIBLE</p>
        <input type="password" id="t-in" placeholder="Token de acceso">
        <button id="l-btn" class="btn-p">AUTENTICAR</button>
    </div>

    <div id="dashboard-view">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <b style="color:#00d4ff;">YUI CORE</b>
            <button onclick="rs()" style="color:red; font-size: 10px; background:none; border:1px solid red; padding:3px 6px; border-radius:3px;">REINICIAR</button>
        </div>

        <div class="nav">
            <button onclick="sw('d')" id="n-d" class="active">Inicio</button>
            <button onclick="sw('u')" id="n-u">Users</button>
            <button onclick="sw('c')" id="n-c">Config</button>
            <button onclick="sw('m')" id="n-m">Comandos</button>
            <button onclick="sw('s')" id="n-s">SubBots</button>
            <button onclick="sw('b')" id="n-b">Anuncio</button>
            <button onclick="sw('t')" id="n-t">Terminal</button>
        </div>

        <div id="v-d" class="tab-x">
            <div class="stat-g">
                <div class="stat-c"><div class="stat-l">Uptime</div><div id="st-up" class="stat-v">-</div></div>
                <div class="stat-c"><div class="stat-l">RAM</div><div id="st-rm" class="stat-v">-</div></div>
                <div class="stat-c"><div class="stat-l">Users</div><div id="st-us" class="stat-v">-</div></div>
                <div class="stat-c"><div class="stat-l">SubBots</div><div id="st-sb" class="stat-v">-</div></div>
            </div>
            <div class="card"><div id="lg-box" class="term"></div></div>
        </div>

        <div id="v-u" class="tab-x hidden"><div class="card"><h3>Usuarios</h3><table id="u-tb"></table></div></div>
        <div id="v-c" class="tab-x hidden">
            <div class="card">
                <h3>Config</h3>
                <input id="cn-n" placeholder="Nombre"><input id="cn-p" placeholder="Prefijo"><input id="cn-o" placeholder="Owner">
                <button onclick="svC()" class="btn-p">Guardar</button>
            </div>
        </div>
        <div id="v-m" class="tab-x hidden"><div class="card"><h3>Comandos</h3><input oninput="fCm(this.value)" placeholder="Buscar..."><table id="m-tb"></table></div></div>
        <div id="v-s" class="tab-x hidden"><div class="card"><h3>SubBots</h3><div id="s-ls"></div></div></div>
        <div id="v-b" class="tab-x hidden"><div class="card"><h3>Anuncio</h3><textarea id="bc-tx" style="width:100%; height:80px; background:#000; color:#fff;"></textarea><button onclick="doB()" class="btn-p" style="margin-top:10px;">Enviar</button></div></div>
        <div id="v-t" class="tab-x hidden"><div class="card"><h3>Terminal</h3><select id="tr-s" style="width:100%; padding:10px; background:#000; color:#fff;"><option value="uptime">Uptime</option><option value="free -h">RAM</option></select><button onclick="doT()" class="btn-p" style="margin-top:10px;">Ejecutar</button><pre id="tr-r" class="term" style="height:100px; margin-top:10px;"></pre></div></div>
    </div>

    <script>
        var tk = localStorage.getItem('yui_token') || '';
        var btn = document.getElementById('l-btn');
        var inp = document.getElementById('t-in');

        function start() {
            if (tk) { inp.value = tk; login(); }
        }

        async function login() {
            var val = inp.value;
            if (!val) { alert('Ingresa el token'); return; }
            btn.innerText = 'PROCESANDO...';
            try {
                var r = await fetch('/api/status?token=' + val);
                if (r.ok) {
                    tk = val;
                    localStorage.setItem('yui_token', val);
                    document.getElementById('login-view').style.display = 'none';
                    document.getElementById('dashboard-view').style.display = 'block';
                    init();
                } else {
                    alert('TOKEN INCORRECTO');
                    btn.innerText = 'AUTENTICAR';
                    localStorage.removeItem('yui_token');
                }
            } catch (e) {
                alert('ERROR DE CONEXIÓN');
                btn.innerText = 'REINTENTAR';
            }
        }

        btn.onclick = login;
        btn.ontouchstart = function(e) { e.preventDefault(); login(); };

        function init() {
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

                var lr = await fetch('/api/logs?token=' + tk);
                var lgs = await lr.json();
                var box = document.getElementById('lg-box');
                box.innerHTML = lgs.map(function(l){ return '<div><span style="color:#ff007f">['+l.time+']</span> '+l.msg+'</div>'; }).join('');
                box.scrollTop = box.scrollHeight;
            } catch(e) {}
        }

        window.sw = function(id) {
            var tabs = document.getElementsByClassName('tab-x');
            for(var i=0; i<tabs.length; i++) tabs[i].classList.add('hidden');
            document.getElementById('v-' + id).classList.remove('hidden');
            var btns = document.querySelectorAll('.nav button');
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
            var h = '<tr><th>User</th><th>Acción</th></tr>';
            Object.keys(u).forEach(function(k){
                h += '<tr><td>'+k.split('@')[0]+'</td><td><button onclick="bn(\''+k+'\','+!u[k].banned+')">'+(u[k].banned?'Si':'No')+'</button></td></tr>';
            });
            document.getElementById('u-tb').innerHTML = h;
        }

        async function loadC() {
            var r = await fetch('/api/config?token=' + tk);
            var c = await r.json();
            document.getElementById('cn-n').value = c.nombreBot;
            document.getElementById('cn-p').value = c.prefijo;
            document.getElementById('cn-o').value = c.owner[0];
        }

        window.svC = async function() {
            var b = { nombreBot: document.getElementById('cn-n').value, prefijo: document.getElementById('cn-p').value, owner: [document.getElementById('cn-o').value] };
            await fetch('/api/config?token=' + tk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
            alert('OK');
        };

        var allM = [];
        async function loadM() {
            var r = await fetch('/api/comandos?token=' + tk);
            allM = await r.json();
            rdM(allM);
        }

        function rdM(a) {
            var h = '<tr><th>Cmd</th><th>On</th></tr>';
            a.forEach(function(c){
                h += '<tr><td>'+c.nombre+'</td><td><button onclick="tg(\''+c.nombre+'\','+!c.activo+')">'+(c.activo?'Si':'No')+'</button></td></tr>';
            });
            document.getElementById('m-tb').innerHTML = h;
        }

        window.fCm = function(v) { rdM(allM.filter(function(c){ return c.nombre.includes(v.toLowerCase()); })); };

        window.tg = async function(n, a) {
            await fetch('/api/comandos/toggle?token=' + tk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: n, activo: a }) });
            loadM();
        };

        async function loadS() {
            var r = await fetch('/api/subbots?token=' + tk);
            var b = await r.json();
            document.getElementById('s-ls').innerHTML = b.map(function(x){ return '<div class="stat-c">'+(x.jid||'Bot')+' <button onclick="spS(\''+x.jid+'\')">X</button></div>'; }).join('');
        }

        window.spS = async function(j) {
            await fetch('/api/subbots/desconectar?token=' + tk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jid: j }) });
            loadS();
        };

        window.doB = async function() {
            var m = document.getElementById('bc-tx').value;
            if(!m) return;
            await fetch('/api/broadcast?token=' + tk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje: m }) });
            alert('OK');
        };

        window.doT = async function() {
            var c = document.getElementById('tr-s').value;
            var r = await fetch('/api/terminal?token=' + tk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: c }) });
            var d = await r.json();
            document.getElementById('tr-r').innerText = d.output || d.error;
        };

        window.rs = async function() { if(confirm('¿Reiniciar?')) { await fetch('/api/restart?token=' + tk, { method: 'POST' }); location.reload(); } };

        start();
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
