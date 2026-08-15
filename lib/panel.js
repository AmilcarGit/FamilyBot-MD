import express from 'express'
import fs from 'fs'
import path from 'path'
import { getDB } from './db.js'
import { listarSubbots } from '../subbots/manager.js'
import config from '../config.js'
import { info, error as logError } from './logger.js'
import { randomBytes } from 'crypto'

let sockActivo = null
let tokenUnico = null

export function establecerSockActivo(sock) {
  sockActivo = sock
}

function obtenerToken() {
  if (tokenUnico) return tokenUnico
  if (config.panelToken && config.panelToken !== 'AUTO_GENERATE') {
    tokenUnico = config.panelToken
    return tokenUnico
  }
  
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
  const tokenValido = obtenerToken()
  if (token !== tokenValido) {
    return res.status(401).json({ error: 'Token inválido' })
  }
  next()
}

function formatearUptime(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  return `${h}h ${m}m`
}

function paginaHtml() {
  const token = obtenerToken()
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${config.nombreBot} — Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --bg: #050508; --card: #0f0f1a; --border: #1f1f2e; --primary: #ff007f; --accent: #00d4ff; --text: #e0e0e6; --success: #00ff88; }
  body { font-family: sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
  .card { background: var(--card); border-radius: 16px; padding: 20px; border: 1px solid var(--border); margin-bottom: 20px; }
  h1 { background: linear-gradient(to right, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 24px; text-align: center; }
  .login-box { max-width: 400px; margin: 100px auto; text-align: center; }
  input { padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: #000; color: #fff; width: 100%; margin-bottom: 15px; box-sizing: border-box; }
  button { padding: 12px; border-radius: 8px; border: none; background: var(--primary); color: #fff; font-weight: bold; cursor: pointer; width: 100%; transition: 0.3s; }
  button:hover { opacity: 0.8; transform: scale(1.02); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; }
  .stat { text-align: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--border); }
  .stat div { font-size: 20px; font-weight: bold; color: var(--accent); }
  .stat small { color: #888; text-transform: uppercase; font-size: 10px; }
  #panel { display: none; }
</style>
</head>
<body>
  <div id="login" class="card login-box">
    <h1>THE YUI-MD</h1>
    <p style="color: #888;">Introduce tu Token de Acceso</p>
    <input id="token" type="password" placeholder="Token Secreto">
    <button onclick="entrar()">ACCEDER AL PANEL</button>
  </div>
  <div id="panel">
    <div class="card">
      <h1>DASHBOARD CONTROL</h1>
      <div class="grid">
        <div class="stat"><div id="uptime">-</div><small>Uptime</small></div>
        <div class="stat"><div id="ram">-</div><small>RAM Uso</small></div>
        <div class="stat"><div id="usuarios">-</div><small>Usuarios</small></div>
        <div class="stat"><div id="subbots">-</div><small>Subbots</small></div>
      </div>
    </div>
  </div>
  <script>
    let currentToken = localStorage.getItem('yui_token') || '';
    async function entrar() {
      const val = document.getElementById('token').value || currentToken;
      const res = await fetch('/api/status', { headers: { 'x-panel-token': val } });
      if (res.ok) {
        localStorage.setItem('yui_token', val);
        currentToken = val;
        document.getElementById('login').style.display = 'none';
        document.getElementById('panel').style.display = 'block';
        setInterval(actualizar, 5000);
        actualizar();
      } else { 
        alert('Token Incorrecto');
        localStorage.removeItem('yui_token');
      }
    }
    async function actualizar() {
      try {
        const res = await fetch('/api/status', { headers: { 'x-panel-token': currentToken } });
        const d = await res.json();
        document.getElementById('uptime').innerText = d.uptime;
        document.getElementById('ram').innerText = d.ram;
        document.getElementById('usuarios').innerText = d.usuarios;
        document.getElementById('subbots').innerText = d.subbots;
      } catch(e) {}
    }
    if (currentToken) entrar();
  </script>
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  const puerto = config.panelPort
  const token = obtenerToken()
  
  app.get('/', (req, res) => res.send(paginaHtml()))
  
  app.get('/api/status', verificarToken, async (req, res) => {
    try {
      const db = await getDB()
      res.json({
        uptime: formatearUptime(process.uptime()),
        ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB',
        usuarios: Object.keys(db.data.users || {}).length,
        subbots: listarSubbots().filter(s => s.conectado).length
      })
    } catch (e) { res.status(500).json({ error: 'Error' }) }
  })

  app.listen(puerto, '0.0.0.0', () => {
    console.log('\n' + '═'.repeat(40))
    console.log('🌐 PANEL WEB: http://localhost:' + puerto)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(40) + '\n')
  })
}
