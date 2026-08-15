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
    return res.status(401).send('<h1>ERROR: TOKEN INVÁLIDO</h1><a href="/">Volver a intentar</a>')
  }
  next()
}

function guardarConfig(nuevoConfig) {
  const rutaConfig = path.join(process.cwd(), 'config.js')
  const contenido = `export default ${JSON.stringify(nuevoConfig, null, 2)}\n`
  fs.writeFileSync(rutaConfig, contenido)
  Object.assign(config, nuevoConfig)
}

function paginaHtml(tokenValido = null) {
  const isAuth = !!tokenValido
  const currentToken = tokenValido || ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TheYui-MD | Control</title>
    <style>
        body { background: #050508; color: #eee; font-family: sans-serif; margin: 0; padding: 20px; }
        .box { max-width: 350px; margin: 80px auto; padding: 30px; background: #0c0c16; border-radius: 15px; border: 2px solid #ff007f; text-align: center; }
        h1 { color: #ff007f; margin-top: 0; }
        input, button, textarea, select { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: 1px solid #333; box-sizing: border-box; }
        input, textarea, select { background: #000; color: #fff; }
        button { background: #ff007f; color: #fff; font-weight: bold; border: none; cursor: pointer; text-transform: uppercase; }
        .nav { display: flex; gap: 5px; overflow-x: auto; margin-bottom: 20px; padding-bottom: 10px; }
        .nav a { padding: 8px 15px; background: #111; color: #888; text-decoration: none; border-radius: 5px; font-size: 12px; border: 1px solid #333; white-space: nowrap; }
        .nav a.active { background: #00d4ff; color: #000; font-weight: bold; }
        .card { background: #0c0c16; padding: 15px; border-radius: 10px; border: 1px solid #222; margin-bottom: 15px; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .stat { background: #111; padding: 10px; border-radius: 8px; border-left: 4px solid #ff007f; }
        .term { background: #000; color: #0f0; padding: 10px; font-family: monospace; height: 200px; overflow: auto; font-size: 11px; border: 1px solid #222; }
        .hidden { display: none; }
    </style>
</head>
<body>
    ${!isAuth ? `
    <div class="box">
        <h1>THE YUI</h1>
        <p style="color:#555; font-size:10px;">BULLETPROOF LOGIN V6</p>
        <form action="/login" method="POST">
            <input type="password" name="token" placeholder="INGRESA EL TOKEN" required>
            <button type="submit">ENTRAR AL SISTEMA</button>
        </form>
    </div>
    ` : `
    <div id="ui">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 style="margin:0; color:#00d4ff;">YUI CORE PANEL</h2>
            <form action="/api/restart" method="POST" style="width:auto; margin:0;">
                <input type="hidden" name="token" value="${currentToken}">
                <button type="submit" style="width:auto; padding:5px 10px; background:red; font-size:10px;">REINICIAR</button>
            </form>
        </div>

        <div class="nav">
            <a href="?token=${currentToken}&tab=dash" class="${!isAuth || (isAuth && !tokenValido) ? '' : 'active'}">Inicio</a>
            <a href="?token=${currentToken}&tab=config">Configuración</a>
            <a href="?token=${currentToken}&tab=broadcast">Broadcast</a>
        </div>

        <div class="card">
            <div class="stat-grid">
                <div class="stat"><small style="color:#666">UPTIME</small><br><b id="up">-</b></div>
                <div class="stat"><small style="color:#666">RAM</small><br><b id="rm">-</b></div>
            </div>
        </div>

        <div class="card">
            <h3 style="color:#ff007f; font-size:14px; margin-top:0;">CONSOLA EN VIVO</h3>
            <div id="l-box" class="term"></div>
        </div>

        <script>
            var tk = "${currentToken}";
            async function sync() {
                try {
                    var r = await fetch('/api/status?token=' + tk);
                    var d = await r.json();
                    document.getElementById('up').innerText = d.uptime;
                    document.getElementById('rm').innerText = d.ram;
                    
                    var lr = await fetch('/api/logs?token=' + tk);
                    var lgs = await lr.json();
                    var box = document.getElementById('l-box');
                    box.innerHTML = lgs.map(function(x){ return '<div>['+x.time+'] '+x.msg+'</div>'; }).join('');
                    box.scrollTop = box.scrollHeight;
                } catch(e) {}
            }
            setInterval(sync, 4000);
            sync();
        </script>
    </div>
    `}
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  app.get('/', (req, res) => {
    const token = req.query.token
    if (token && token === obtenerToken()) {
      return res.send(paginaHtml(token))
    }
    res.send(paginaHtml())
  })

  app.post('/login', (req, res) => {
    const token = req.body.token
    if (token === obtenerToken()) {
      console.log(`[PANEL] Acceso exitoso con token: ${token}`)
      return res.redirect(`/?token=${token}`)
    }
    console.log(`[PANEL] Intento de acceso fallido con token: ${token}`)
    res.status(401).send('<h1>TOKEN INCORRECTO</h1><a href="/">Volver</a>')
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

  app.post('/api/restart', verificarToken, (req, res) => {
    res.send('<h1>Reiniciando Bot...</h1><script>setTimeout(()=>location.href="/?token="+new URLSearchParams(location.search).get("token"), 3000)</script>')
    setTimeout(() => process.exit(0), 1000)
  })

  app.listen(config.panelPort, '0.0.0.0', () => {
    const token = obtenerToken()
    console.log('\n' + '═'.repeat(50))
    console.log('🌐 PANEL INDESTRUCTIBLE V6: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
