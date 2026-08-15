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
    <title>YUI SHIELD V8</title>
    <style>
        * { box-sizing: border-box; }
        body { background: #050508; color: #e0e0e6; font-family: sans-serif; margin: 0; padding: 0; min-height: 100vh; }
        .neon-pink { color: #ff007f; text-shadow: 0 0 10px #ff007f; }
        .neon-blue { color: #00d4ff; text-shadow: 0 0 10px #00d4ff; }
        .glass { background: #0c0c16; border: 1px solid #222; border-radius: 12px; }
        .btn-main { background: #ff007f; color: white; font-weight: bold; padding: 12px; border-radius: 8px; border: none; cursor: pointer; text-transform: uppercase; width: 100%; }
        #login-view { max-width: 320px; margin: 100px auto; padding: 30px; text-align: center; border: 1px solid #ff007f; }
        #panel-view { display: none; padding: 15px; max-width: 1000px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; border-left: 4px solid #00d4ff; background: #0c0c16; border-radius: 8px; }
        .nav { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 20px; padding-bottom: 8px; }
        .nav button { padding: 10px 15px; background: #111; border: 1px solid #333; color: #888; border-radius: 8px; white-space: nowrap; cursor: pointer; font-size: 12px; }
        .nav button.active { background: #00d4ff; color: #000; font-weight: bold; border-color: #00d4ff; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .stat-card { padding: 12px; background: #111; border-radius: 8px; border-left: 3px solid #ff007f; }
        .stat-l { font-size: 9px; color: #555; text-transform: uppercase; }
        .stat-v { font-size: 16px; font-weight: bold; }
        .term { background: #000; color: #0f0; padding: 12px; border-radius: 10px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 11px; border: 1px solid #222; }
        .hidden { display: none !important; }
        input, select, textarea { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: #fff; border-radius: 8px; margin-bottom: 12px; outline: none; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; color: #444; padding: 8px; border-bottom: 1px solid #222; }
        td { padding: 8px; border-bottom: 1px solid #111; }
        .btn-act { padding: 5px 10px; border-radius: 4px; font-size: 10px; border: none; cursor: pointer; font-weight: bold; }
    </style>
</head>
<body>

    <div id="login-view" class="glass">
        <h1 class="neon-pink">THE YUI</h1>
        <p style="color:#444; font-size:9px; letter-spacing:2px;">SHIELD SYSTEM V8</p>
        <input type="password" id="t-input" placeholder="TOKEN">
        <button id="l-btn" class="btn-main">Autenticar</button>
    </div>

    <div id="panel-view">
        <div class="header">
            <div>
                <h2 style="margin:0; font-size:18px;" class="neon-blue">YUI CORE</h2>
                <div style="font-size:9px; color:#444;">DASHBOARD PROFESIONAL</div>
            </div>
            <button onclick="window.rsBot()" class="btn-act" style="background:red; color:white;">Reiniciar</button>
        </div>

        <div class="nav">
            <button onclick="window.sw('d')" id="n-d" class="active">Inicio</button>
            <button onclick="window.sw('u')" id="n-u">Usuarios</button>
            <button onclick="window.sw('c')" id="n-c">Config</button>
            <button onclick="window.sw('m')" id="n-m">Comandos</button>
            <button onclick="window.sw('s')" id="n-s">SubBots</button>
            <button onclick="window.sw('b')" id="n-b">Anuncio</button>
            <button onclick="window.sw('t')" id="n-t">Terminal</button>
        </div>

        <div id="v-d" class="tab-v">
            <div class="grid">
                <div class="stat-card"><div class="stat-l">Uptime</div><div id="st-up" class="stat-v">-</div></div>
                <div class="stat-card" style="border-color:#00d4ff;"><div class="stat-l">RAM</div><div id="st-rm" class="stat-v">-</div></div>
                <div class="stat-card"><div class="stat-l">Usuarios</div><div id="st-us" class="stat-v">-</div></div>
                <div class="stat-card" style="border-color:#00d4ff;"><div class="stat-l">SubBots</div><div id="st-sb" class="stat-v">-</div></div>
            </div>
            <div class="glass" style="padding:15px;">
                <h3 style="font-size:11px; color:#ff007f; margin:0 0 10px 0;">CONSOLA EN VIVO</h3>
                <div id="log-box" class="term"></div>
            </div>
        </div>

        <div id="v-u" class="tab-v hidden glass" style="padding:15px;">
            <h3>Usuarios</h3>
            <div style="overflow-x:auto;"><table><thead><tr><th>User</th><th>Acción</th></tr></thead><tbody id="u-body"></tbody></table></div>
        </div>

        <div id="v-c" class="tab-v hidden glass" style="padding:15px; max-width:400px; margin:0 auto;">
            <h3>Configuración</h3>
            <input id="c-name" type="text" placeholder="Nombre Bot">
            <input id="c-pref" type="text" placeholder="Prefijo">
            <input id="c-own" type="text" placeholder="Owner">
            <button onclick="window.svC()" class="btn-main">Guardar</button>
        </div>

        <div id="v-m" class="tab-v hidden glass" style="padding:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3>Comandos</h3>
                <input oninput="window.fM(this.value)" placeholder="Buscar..." style="width:120px; margin:0; padding:5px; font-size:11px;">
            </div>
            <div style="overflow-x:auto; height:300px;"><table><thead><tr><th>Comando</th><th>Estado</th></tr></thead><tbody id="m-body"></tbody></table></div>
        </div>

        <div id="v-s" class="tab-v hidden glass" style="padding:15px;">
            <h3>Sub-Bots</h3>
            <div id="s-list" class="grid"></div>
        </div>

        <div id="v-b" class="tab-v hidden glass" style="padding:15px; max-width:400px; margin:0 auto;">
            <h3>Anuncio</h3>
            <textarea id="bc-text" style="height:100px;" placeholder="Mensaje..."></textarea>
            <button onclick="window.doBC()" class="btn-main">Enviar</button>
        </div>

        <div id="v-t" class="tab-v hidden glass" style="padding:15px;">
            <h3>Terminal</h3>
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <select id="t-sel" style="margin:0;"><option value="uptime">Uptime</option><option value="free -h">RAM</option></select>
                <button onclick="window.doT()" class="btn-main" style="width:auto; padding:0 15px; margin:0;">Run</button>
            </div>
            <pre id="t-out" class="term" style="height:100px; color:#00d4ff;"></pre>
        </div>
    </div>

    <script>
        (function() {
            var tk = localStorage.getItem('yui_token') || '';
            var b = document.getElementById('l-btn');
            var i = document.getElementById('t-input');

            window.auth = async function() {
                var v = i.value || tk;
                if (!v) return alert('TOKEN REQUERIDO');
                b.innerText = 'CARGANDO...';
                try {
                    var r = await fetch('/api/status?token=' + v);
                    if (r.ok) {
                        tk = v;
                        localStorage.setItem('yui_token', v);
                        document.getElementById('login-view').style.display = 'none';
                        document.getElementById('panel-view').style.display = 'block';
                        setInterval(sync, 4000);
                        sync();
                    } else {
                        alert('TOKEN INCORRECTO');
                        b.innerText = 'Autenticar';
                        localStorage.removeItem('yui_token');
                    }
                } catch (e) { alert('ERROR DE RED'); b.innerText = 'Reintentar'; }
            };

            b.onclick = window.auth;

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
                    var box = document.getElementById('log-box');
                    box.innerHTML = lgs.map(function(x){ return '<div>['+x.time+'] '+x.msg+'</div>'; }).join('');
                    box.scrollTop = box.scrollHeight;
                } catch(e) {}
            }

            window.sw = function(id) {
                var ts = document.getElementsByClassName('tab-v');
                for(var j=0; j<ts.length; j++) ts[j].classList.add('hidden');
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
                try {
                    var r = await fetch('/api/usuarios?token=' + tk);
                    var u = await r.json();
                    var h = '';
                    Object.keys(u).forEach(function(k){
                        h += '<tr><td>'+k.split('@')[0]+'</td><td><button onclick="window.bn(\''+k+'\','+!u[k].banned+')" class="btn-act" style="background:'+(u[k].banned?'#0f0':'#f00')+'">'+(u[k].banned?'UNBAN':'BAN')+'</button></td></tr>';
                    });
                    document.getElementById('u-body').innerHTML = h;
                } catch(e) {}
            }

            window.bn = async function(j, b) { await fetch('/api/usuarios/ban?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({jid:j, banned:b}) }); loadU(); };

            async function loadC() {
                try {
                    var r = await fetch('/api/config?token=' + tk);
                    var c = await r.json();
                    document.getElementById('c-name').value = c.nombreBot;
                    document.getElementById('c-pref').value = c.prefijo;
                    document.getElementById('c-own').value = c.owner[0];
                } catch(e) {}
            }

            window.svC = async function() {
                var b = { nombreBot: document.getElementById('c-name').value, prefijo: document.getElementById('c-pref').value, owner: [document.getElementById('c-own').value] };
                await fetch('/api/config?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(b) });
                alert('GUARDADO');
            };

            var allM = [];
            async function loadM() {
                try {
                    var r = await fetch('/api/comandos?token=' + tk);
                    allM = await r.json();
                    rdM(allM);
                } catch(e) {}
            }

            function rdM(a) {
                var h = '';
                a.forEach(function(c){
                    h += '<tr><td>'+c.nombre+'</td><td><button onclick="window.tg(\''+c.nombre+'\','+!c.activo+')" class="btn-act" style="background:'+(c.activo?'#0f0':'#f00')+'">'+(c.activo?'ON':'OFF')+'</button></td></tr>';
                });
                document.getElementById('m-body').innerHTML = h;
            }

            window.fM = function(v) { rdM(allM.filter(function(c){ return c.nombre.includes(v.toLowerCase()); })); };

            window.tg = async function(n, a) { await fetch('/api/comandos/toggle?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ nombre: n, activo: a }) }); loadM(); };

            async function loadS() {
                try {
                    var r = await fetch('/api/subbots?token=' + tk);
                    var b = await r.json();
                    document.getElementById('s-list').innerHTML = b.map(function(x){
                        return '<div class="stat-card glass"><div class="stat-l">'+(x.jid||'SUB')+'</div><button onclick="window.spS(\''+x.jid+'\')" class="btn-act" style="background:red; color:white; margin-top:5px;">STOP</button></div>';
                    }).join('');
                } catch(e) {}
            }

            window.spS = async function(j) { await fetch('/api/subbots/desconectar?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ jid: j }) }); loadS(); };

            window.doBC = async function() {
                var m = document.getElementById('bc-text').value;
                if(!m) return alert('ESCRIBE ALGO');
                await fetch('/api/broadcast?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ mensaje: m }) });
                alert('ENVIADO');
            };

            window.doT = async function() {
                var c = document.getElementById('t-sel').value;
                var r = await fetch('/api/terminal?token=' + tk, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cmd: c }) });
                var d = await r.json();
                document.getElementById('t-out').innerText = d.output || 'OK';
            };

            window.rsBot = async function() { if(confirm('¿REINICIAR?')) { await fetch('/api/restart?token=' + tk, { method: 'POST' }); location.reload(); } };

            if (tk) window.auth();
        })();
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
    console.log('🌐 YUI SHIELD V8: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
