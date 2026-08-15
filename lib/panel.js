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

function formatearUptime(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  return `${h}h ${m}m`
}

function paginaHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${config.nombreBot} — Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --bg: #050508; --card: #0f0f1a; --border: #1f1f2e; --primary: #ff007f; --accent: #00d4ff; --text: #e0e0e6; --success: #00ff88; }
  body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 0; overflow-x: hidden; }
  .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
  .card { background: var(--card); border-radius: 16px; padding: 25px; border: 1px solid var(--border); margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
  .card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--primary); }
  h1 { background: linear-gradient(to right, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 30px; }
  .login-box { max-width: 400px; margin: 150px auto; text-align: center; }
  input { padding: 15px; border-radius: 10px; border: 1px solid var(--border); background: #000; color: #fff; width: 100%; margin-bottom: 20px; box-sizing: border-box; font-size: 16px; outline: none; }
  input:focus { border-color: var(--primary); box-shadow: 0 0 10px var(--primary); }
  button { padding: 15px; border-radius: 10px; border: none; background: linear-gradient(45deg, var(--primary), #b000ff); color: #fff; font-weight: bold; cursor: pointer; width: 100%; font-size: 16px; text-transform: uppercase; transition: 0.3s; }
  button:hover { transform: scale(1.02); box-shadow: 0 0 20px var(--primary); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
  .stat { text-align: left; padding: 20px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid var(--border); transition: 0.3s; }
  .stat:hover { border-color: var(--accent); background: rgba(0, 212, 255, 0.05); }
  .stat div { font-size: 24px; font-weight: 800; color: var(--accent); margin-bottom: 5px; }
  .stat small { color: #888; text-transform: uppercase; font-size: 12px; font-weight: 600; }
  .status-dot { width: 10px; height: 10px; background: var(--success); border-radius: 50%; display: inline-block; margin-right: 10px; box-shadow: 0 0 10px var(--success); }
  #panel { display: none; }
  .footer { text-align: center; color: #555; font-size: 12px; margin-top: 50px; }
</style>
</head>
<body>
  <div id="login" class="container login-box">
    <div class="card">
      <h1>THE YUI-MD</h1>
      <p style="color: #888; margin-bottom: 25px;">SISTEMA DE CONTROL PRIVADO</p>
      <input id="token" type="password" placeholder="Ingresa tu Token Único">
      <button onclick="entrar()">AUTENTICAR</button>
    </div>
  </div>
  <div id="panel" class="container">
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h1 style="margin: 0;">CONTROL PANEL</h1>
        <div><span class="status-dot"></span> ONLINE</div>
      </div>
      <div class="grid">
        <div class="stat"><div id="uptime">-</div><small>Tiempo Activo</small></div>
        <div class="stat"><div id="ram">-</div><small>Uso de Memoria</small></div>
        <div class="stat"><div id="usuarios">-</div><small>Usuarios Registrados</small></div>
        <div class="stat"><div id="subbots">-</div><small>Sub-Bots Activos</small></div>
      </div>
    </div>
    <div class="card" style="border-left: 4px solid var(--accent);">
      <h2 style="font-size: 18px; color: var(--accent); margin-top: 0;">ESTADÍSTICAS DEL SISTEMA</h2>
      <p>Bienvenido al centro de mando de <strong>${config.nombreBot}</strong>. Desde aquí puedes monitorear el rendimiento en tiempo real.</p>
    </div>
    <div class="footer">THE YUI-MD v1.0.0 &copy; 2026 - Powered by Manus AI</div>
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
        alert('TOKEN INCORRECTO');
        localStorage.removeItem('yui_token');
        document.getElementById('login').style.display = 'block';
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

  app.listen(config.panelPort, '0.0.0.0', () => {
    console.log('\n' + '═'.repeat(50))
    console.log('🌐 DASHBOARD: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
