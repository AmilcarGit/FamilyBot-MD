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
  const realToken = obtenerToken()
  if (token !== realToken) {
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
  const v = Date.now()
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>YUI V5 FIX</title>
    <style>
        body { background: #000; color: #fff; font-family: sans-serif; text-align: center; padding: 20px; }
        .box { max-width: 300px; margin: 50px auto; padding: 20px; border: 2px solid #ff007f; border-radius: 10px; background: #111; }
        input { width: 90%; padding: 10px; margin: 10px 0; background: #222; color: #fff; border: 1px solid #444; }
        button { width: 90%; padding: 12px; background: #ff007f; color: #fff; border: none; font-weight: bold; cursor: pointer; border-radius: 5px; }
        #dash { display: none; text-align: left; }
        .nav { display: flex; gap: 5px; overflow-x: auto; margin-bottom: 20px; }
        .nav button { width: auto; background: #333; font-size: 12px; }
        .card { background: #111; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #333; }
        .term { background: #000; color: #0f0; padding: 10px; font-family: monospace; height: 200px; overflow: auto; font-size: 11px; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div id="login">
        <h2 style="color:#ff007f">THE YUI V5</h2>
        <p style="font-size:10px; color:#888">VERSIÓN DE ARREGLO FINAL</p>
        <input type="password" id="pass" placeholder="TOKEN">
        <button id="go">ENTRAR AHORA</button>
    </div>

    <div id="dash">
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <b style="color:#00d4ff">YUI CORE</b>
            <button onclick="restart()" style="width:auto; background:red; padding:5px">REINICIAR</button>
        </div>

        <div class="nav">
            <button onclick="sh('d')">Inicio</button>
            <button onclick="sh('u')">Users</button>
            <button onclick="sh('c')">Config</button>
            <button onclick="sh('m')">Cmds</button>
            <button onclick="sh('b')">Broadcast</button>
            <button onclick="sh('t')">Term</button>
        </div>

        <div id="p-d">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <div class="card"><small>UPTIME</small><br><b id="up">-</b></div>
                <div class="card"><small>RAM</small><br><b id="rm">-</b></div>
            </div>
            <div class="card"><div id="log" class="term"></div></div>
        </div>

        <div id="p-u" class="hidden"><div class="card"><h3>Usuarios</h3><div id="u-ls"></div></div></div>
        <div id="p-c" class="hidden"><div class="card"><h3>Config</h3><input id="i-n"><input id="i-p"><button onclick="sv()">Guardar</button></div></div>
        <div id="p-m" class="hidden"><div class="card"><h3>Comandos</h3><div id="m-ls"></div></div></div>
        <div id="p-b" class="hidden"><div class="card"><h3>Broadcast</h3><textarea id="b-tx" style="width:100%"></textarea><button onclick="bc()">Enviar</button></div></div>
        <div id="p-t" class="hidden"><div class="card"><h3>Terminal</h3><select id="t-se"><option value="uptime">Uptime</option><option value="free -h">RAM</option></select><button onclick="tm()">Ejecutar</button><pre id="t-re" class="term"></pre></div></div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        var token = localStorage.getItem('yui_token') || '';
        var b = document.getElementById('go');
        var i = document.getElementById('pass');

        async function login() {
            var v = i.value || token;
            if(!v) return alert('Pon el token');
            b.innerText = 'CARGANDO...';
            try {
                var r = await fetch('/api/status?token=' + v + '&v=${v}');
                if(r.ok) {
                    token = v;
                    localStorage.setItem('yui_token', v);
                    document.getElementById('login').style.display = 'none';
                    document.getElementById('dash').style.display = 'block';
                    loop();
                } else {
                    alert('TOKEN MALO');
                    b.innerText = 'ENTRAR AHORA';
                }
            } catch(e) {
                alert('ERROR RED');
                b.innerText = 'REINTENTAR';
            }
        }

        b.onclick = login;

        function loop() { setInterval(sync, 4000); sync(); }

        async function sync() {
            try {
                var r = await fetch('/api/status?token=' + token);
                var d = await r.json();
                document.getElementById('up').innerText = d.uptime;
                document.getElementById('rm').innerText = d.ram;
                var lr = await fetch('/api/logs?token=' + token);
                var lgs = await lr.json();
                var box = document.getElementById('log');
                box.innerHTML = lgs.map(function(x){ return '<div>'+x.msg+'</div>'; }).join('');
                box.scrollTop = box.scrollHeight;
            } catch(e) {}
        }

        window.sh = function(id) {
            var ps = ['d','u','c','m','b','t'];
            ps.forEach(function(x){ document.getElementById('p-'+x).classList.add('hidden'); });
            document.getElementById('p-'+id).classList.remove('hidden');
            if(id==='u') loadU();
            if(id==='c') loadC();
            if(id==='m') loadM();
        };

        async function loadU() {
            var r = await fetch('/api/usuarios?token=' + token);
            var u = await r.json();
            document.getElementById('u-ls').innerHTML = Object.keys(u).map(function(k){ return '<div>'+k.split('@')[0]+'</div>'; }).join('');
        }

        async function loadC() {
            var r = await fetch('/api/config?token=' + token);
            var c = await r.json();
            document.getElementById('i-n').value = c.nombreBot;
            document.getElementById('i-p').value = c.prefijo;
        }

        window.sv = async function() {
            var d = { nombreBot: document.getElementById('i-n').value, prefijo: document.getElementById('i-p').value };
            await fetch('/api/config?token=' + token, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(d) });
            alert('OK');
        };

        async function loadM() {
            var r = await fetch('/api/comandos?token=' + token);
            var m = await r.json();
            document.getElementById('m-ls').innerHTML = m.map(function(x){ return '<div>'+x.nombre+'</div>'; }).join('');
        }

        window.bc = async function() {
            var t = document.getElementById('b-tx').value;
            await fetch('/api/broadcast?token=' + token, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({mensaje:t}) });
            alert('OK');
        };

        window.tm = async function() {
            var s = document.getElementById('t-se').value;
            var r = await fetch('/api/terminal?token=' + token, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({cmd:s}) });
            var d = await r.json();
            document.getElementById('t-re').innerText = d.output;
        };

        window.restart = async function() { await fetch('/api/restart?token=' + token, {method:'POST'}); location.reload(); };

        if(token) login();
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
    console.log('🌐 YUI DASHBOARD V5: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
