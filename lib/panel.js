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
    <title>${config.nombreBot} | Panel</title>
    <style>
        :root { --p: #ff007f; --b: #00d4ff; --bg: #030305; }
        * { box-sizing: border-box; font-family: sans-serif; }
        body { background: var(--bg); color: #eee; margin: 0; padding: 0; }
        .login-box { max-width: 350px; margin: 100px auto; padding: 30px; background: #0c0c16; border-radius: 15px; border: 1px solid #333; text-align: center; }
        h1 { color: var(--p); margin: 0 0 20px 0; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; background: #000; border: 1px solid #444; color: #fff; border-radius: 8px; }
        .btn { width: 100%; padding: 12px; background: var(--p); border: none; color: #fff; font-weight: bold; border-radius: 8px; cursor: pointer; }
        .btn:active { opacity: 0.8; }
        #panel { display: none; padding: 15px; }
        .card { background: #0c0c16; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #222; }
        .nav { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 20px; padding-bottom: 5px; }
        .nav button { padding: 8px 15px; background: #1a1a2e; border: 1px solid #333; color: #aaa; border-radius: 5px; white-space: nowrap; }
        .nav button.active { background: var(--b); color: #000; font-weight: bold; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .stat { background: #111; padding: 10px; border-radius: 8px; border-left: 3px solid var(--p); }
        .stat-v { font-size: 1.2rem; font-weight: bold; }
        .stat-l { font-size: 0.6rem; color: #777; text-transform: uppercase; }
        .term { background: #000; padding: 10px; border-radius: 5px; font-family: monospace; height: 250px; overflow-y: auto; font-size: 0.75rem; color: #0f0; }
        .hidden { display: none !important; }
        table { width: 100%; font-size: 0.8rem; border-collapse: collapse; }
        th { text-align: left; color: #666; padding: 8px; border-bottom: 1px solid #333; }
        td { padding: 8px; border-bottom: 1px solid #111; }
        #debug-log { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(255,0,0,0.8); color: #fff; font-size: 10px; max-height: 60px; overflow: auto; display: none; z-index: 9999; }
    </style>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div id="debug-log"></div>

    <div id="login-screen" class="login-box">
        <h1>${config.nombreBot}</h1>
        <p style="font-size: 10px; color: #555; margin-bottom: 20px;">V3 - COMPATIBILIDAD MÓVIL</p>
        <input type="password" id="tk" placeholder="Token de acceso">
        <button id="lg-btn" onclick="intentarEntrar()" class="btn">ENTRAR AL SISTEMA</button>
        <p id="lg-msg" style="font-size: 12px; margin-top: 12px; min-height: 16px;"></p>
    </div>

    <div id="panel">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 style="margin:0; color:var(--b); font-size: 1.2rem;">${config.nombreBot} PRO</h2>
            <button onclick="reiniciar()" style="color:red; font-size: 0.7rem; border:1px solid red; padding:4px 8px; border-radius:5px;">REINICIAR</button>
        </div>

        <div class="nav">
            <button onclick="tab('dash')" id="b-dash" class="active">Inicio</button>
            <button onclick="tab('users')" id="b-users">Usuarios</button>
            <button onclick="tab('conf')" id="b-conf">Config</button>
            <button onclick="tab('cmds')" id="b-cmds">Comandos</button>
            <button onclick="tab('sub')" id="b-sub">SubBots</button>
            <button onclick="tab('bc')" id="b-bc">Broadcast</button>
            <button onclick="tab('term')" id="b-term">Terminal</button>
        </div>

        <div id="t-dash" class="tab-c">
            <div class="grid" style="margin-bottom:15px;">
                <div class="stat"><div class="stat-l">Uptime</div><div id="s-up" class="stat-v">-</div></div>
                <div class="stat"><div class="stat-l">RAM</div><div id="s-ram" class="stat-v">-</div></div>
                <div class="stat"><div class="stat-l">Users</div><div id="s-u" class="stat-v">-</div></div>
                <div class="stat"><div class="stat-l">SubBots</div><div id="s-s" class="stat-v">-</div></div>
            </div>
            <div class="card">
                <p style="margin:0 0 10px 0; font-size: 0.7rem; font-weight: bold; color: var(--p);">CONSOLA</p>
                <div id="lgs" class="term"></div>
            </div>
            <div class="card">
                <canvas id="ram-c" height="120"></canvas>
            </div>
        </div>

        <div id="t-users" class="tab-c hidden">
            <div class="card">
                <h3>Usuarios</h3>
                <div style="overflow-x:auto;">
                    <table>
                        <thead><tr><th>User</th><th>Diam</th><th>Acción</th></tr></thead>
                        <tbody id="u-body"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="t-conf" class="tab-c hidden">
            <div class="card">
                <h3>Configuración</h3>
                <form onsubmit="saveC(event)">
                    <label>Nombre</label><input id="c-n" type="text">
                    <label>Prefijo</label><input id="c-p" type="text">
                    <label>Owner</label><input id="c-o" type="text">
                    <button type="submit" class="btn">Guardar</button>
                </form>
            </div>
        </div>

        <div id="t-cmds" class="tab-c hidden">
            <div class="card">
                <h3>Comandos</h3>
                <input type="text" id="cmd-q" oninput="fCmd()" placeholder="Buscar...">
                <div style="overflow-x:auto;">
                    <table>
                        <thead><tr><th>Nombre</th><th>Estado</th></tr></thead>
                        <tbody id="c-body"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="t-sub" class="tab-c hidden">
            <div class="card"><h3>Sub-Bots</h3><div id="sub-l"></div></div>
        </div>

        <div id="t-bc" class="tab-c hidden">
            <div class="card">
                <h3>Broadcast</h3>
                <textarea id="bc-m" style="width:100%; height:100px; background:#000; color:#fff; border:1px solid #333; padding:10px; border-radius:8px;"></textarea>
                <button onclick="doBC()" class="btn" style="margin-top:10px;">Enviar Anuncio</button>
            </div>
        </div>

        <div id="t-term" class="tab-c hidden">
            <div class="card">
                <h3>Terminal</h3>
                <select id="tm-s" style="width:100%; padding:10px; background:#000; color:#fff; margin-bottom:10px;">
                    <option value="uptime">Uptime</option>
                    <option value="free -h">RAM</option>
                    <option value="node -v">Node</option>
                </select>
                <button onclick="runT()" class="btn">Ejecutar</button>
                <div id="tm-r" class="term" style="margin-top:10px; height:100px;"></div>
            </div>
        </div>
    </div>

    <script>
        function dbg(m) {
            const d = document.getElementById('debug-log');
            d.style.display = 'block';
            d.innerHTML += '<div>' + m + '</div>';
        }

        window.onerror = function(m, u, l) { dbg("Err: " + m + " en " + l); };

        function aviso(texto, esError) {
            const cajaLogin = document.getElementById('lg-msg');
            if (cajaLogin) {
                cajaLogin.textContent = texto;
                cajaLogin.style.color = esError ? '#ff4444' : '#00ff88';
            }
            let caja = document.getElementById('toast-aviso');
            if (!caja) {
                caja = document.createElement('div');
                caja.id = 'toast-aviso';
                caja.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;padding:12px 16px;border-radius:8px;font-size:13px;z-index:9999;text-align:center;display:none;';
                document.body.appendChild(caja);
            }
            caja.style.background = esError ? '#ff4444' : '#00ff88';
            caja.style.color = '#000';
            caja.textContent = texto;
            caja.style.display = 'block';
            clearTimeout(window._toastTimer);
            window._toastTimer = setTimeout(() => { caja.style.display = 'none'; }, 3500);
        }

        let token = localStorage.getItem('yui_token') || '';
        let ramH = [];
        let lbls = [];
        let chart;

        window.intentarEntrar = async function() {
            const input = document.getElementById('tk');
            const btn = document.getElementById('lg-btn');
            const val = input.value || token;

            if (!val) { aviso('Ingresa el token', true); return; }

            btn.innerText = 'Verificando...';
            btn.disabled = true;

            try {
                const r = await fetch('/api/status?token=' + val);
                if (r.ok) {
                    token = val;
                    localStorage.setItem('yui_token', val);
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('panel').style.display = 'block';
                    iniciarTodo();
                } else {
                    aviso('Token inválido (revisa la consola de Termux)', true);
                    btn.innerText = 'ENTRAR AL SISTEMA';
                    btn.disabled = false;
                }
            } catch (e) {
                dbg("Fetch error: " + e.message);
                aviso('Error de conexión: ' + e.message, true);
                btn.innerText = 'Reintentar';
                btn.disabled = false;
            }
        };

        function iniciarTodo() {
            const ctx = document.getElementById('ram-c').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: { labels: lbls, datasets: [{ label: 'RAM', data: ramH, borderColor: '#00d4ff', tension: 0.3 }] },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
            setInterval(sync, 4000);
            sync();
        }

        async function sync() {
            try {
                const r = await fetch('/api/status?token=' + token);
                const d = await r.json();
                document.getElementById('s-up').innerText = d.uptime;
                document.getElementById('s-ram').innerText = d.ram;
                document.getElementById('s-u').innerText = d.usuarios;
                document.getElementById('s-s').innerText = d.subbots;
                
                ramH.push(parseFloat(d.ram));
                lbls.push(new Date().toLocaleTimeString());
                if(ramH.length > 15) { ramH.shift(); lbls.shift(); }
                chart.update();

                const lr = await fetch('/api/logs?token=' + token);
                const lgs = await lr.json();
                const lDiv = document.getElementById('lgs');
                lDiv.innerHTML = lgs.map(l => '<div><span style="color:#ff007f">['+l.time+']</span> '+l.msg+'</div>').join('');
                lDiv.scrollTop = lDiv.scrollHeight;
            } catch(e) {}
        }

        window.tab = function(id) {
            document.querySelectorAll('.tab-c').forEach(x => x.classList.add('hidden'));
            document.getElementById('t-' + id).classList.remove('hidden');
            document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
            document.getElementById('b-' + id).classList.add('active');
            if(id === 'users') loadU();
            if(id === 'conf') loadC();
            if(id === 'cmds') loadCm();
            if(id === 'sub') loadS();
        };

        async function loadU() {
            const r = await fetch('/api/usuarios?token=' + token);
            const u = await r.json();
            document.getElementById('u-body').innerHTML = Object.entries(u).map(([j, x]) => '<tr><td>'+j.split('@')[0]+'</td><td>'+(x.diamantes||0)+'</td><td><button onclick="ban(\''+j+'\','+!x.banned+')" style="color:'+(x.banned?'green':'red')+'">'+(x.banned?'Si':'No')+'</button></td></tr>').join('');
        }

        async function loadC() {
            const r = await fetch('/api/config?token=' + token);
            const c = await r.json();
            document.getElementById('c-n').value = c.nombreBot || '';
            document.getElementById('c-p').value = c.prefijo || '';
            document.getElementById('c-o').value = (c.owner && c.owner[0]) || '';
        }

        window.saveC = async function(e) {
            e.preventDefault();
            const b = { nombreBot: document.getElementById('c-n').value, prefijo: document.getElementById('c-p').value, owner: [document.getElementById('c-o').value] };
            await fetch('/api/config?token=' + token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
            aviso('Configuración guardada', false);
        };

        let allC = [];
        async function loadCm() {
            const r = await fetch('/api/comandos?token=' + token);
            allC = await r.json();
            renderCm(allC);
        }

        function renderCm(arr) {
            document.getElementById('c-body').innerHTML = arr.map(c => '<tr><td>'+c.nombre+'</td><td><button onclick="tgl(\''+c.nombre+'\','+!c.activo+')" style="color:'+(c.activo?'green':'red')+'">'+(c.activo?'ON':'OFF')+'</button></td></tr>').join('');
        }

        window.fCmd = function() {
            const q = document.getElementById('cmd-q').value.toLowerCase();
            renderCm(allC.filter(c => c.nombre.includes(q)));
        };

        window.tgl = async function(n, a) {
            await fetch('/api/comandos/toggle?token=' + token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: n, activo: a }) });
            loadCm();
        };

        async function loadS() {
            const r = await fetch('/api/subbots?token=' + token);
            const b = await r.json();
            document.getElementById('sub-l').innerHTML = b.map(x => '<div class="stat"><div class="stat-l">'+(x.jid||'Bot')+'</div><button onclick="stopS(\''+x.jid+'\')" style="color:red;font-size:10px;">PARAR</button></div>').join('');
        }

        window.stopS = async function(j) {
            await fetch('/api/subbots/desconectar?token=' + token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jid: j }) });
            loadS();
        };

        window.doBC = async function() {
            const m = document.getElementById('bc-m').value;
            if(!m) { aviso('Escribe un mensaje primero', true); return; }
            aviso('Enviando anuncio...', false);
            try {
                await fetch('/api/broadcast?token=' + token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje: m }) });
                aviso('Anuncio enviado', false);
                document.getElementById('bc-m').value = '';
            } catch (e) {
                aviso('No se pudo enviar el anuncio', true);
            }
        };

        window.runT = async function() {
            const c = document.getElementById('tm-s').value;
            const r = await fetch('/api/terminal?token=' + token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: c }) });
            const d = await r.json();
            document.getElementById('tm-r').innerText = d.output || d.error;
        };

        window.reiniciar = async function() {
            const btn = event.target;
            if (btn.dataset.armado !== 'si') {
                btn.dataset.armado = 'si';
                btn.innerText = '¿SEGURO? TOCA DE NUEVO';
                setTimeout(() => { btn.dataset.armado = 'no'; btn.innerText = 'REINICIAR'; }, 3000);
                return;
            }
            btn.innerText = 'Reiniciando...';
            await fetch('/api/restart?token=' + token, { method: 'POST' });
            aviso('Reiniciando, espera unos segundos...', false);
            setTimeout(() => location.reload(), 4000);
        };

        if (token) intentarEntrar();
    </script>
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  app.use(express.json())
  
  app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.send(paginaHtml())
  })
  
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