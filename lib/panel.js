import express from 'express'
import fs from 'fs'
import path from 'path'
import { getDB } from './db.js'
import { listarSubbots } from '../subbots/manager.js'
import config from '../config.js'
import { randomBytes } from 'crypto'

let sockActivo = null
let tokenUnico = null
const logsBuffer = []
const MAX_LOGS = 50

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

function paginaHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.nombreBot} | Core Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --neon-pink: #ff007f;
            --neon-blue: #00d4ff;
            --neon-purple: #b000ff;
            --bg-dark: #050508;
            --card-bg: rgba(15, 15, 26, 0.8);
        }
        body {
            background-color: var(--bg-dark);
            color: #e0e0e6;
            font-family: 'Rajdhani', sans-serif;
            background-image: 
                radial-gradient(circle at 20% 30%, rgba(255, 0, 127, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(0, 212, 255, 0.05) 0%, transparent 50%);
            overflow-x: hidden;
        }
        .orbitron { font-family: 'Orbitron', sans-serif; }
        .glass {
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
        }
        .neon-border-pink { border-left: 4px solid var(--neon-pink); }
        .neon-border-blue { border-left: 4px solid var(--neon-blue); }
        .neon-text-pink { color: var(--neon-pink); text-shadow: 0 0 10px var(--neon-pink); }
        .neon-text-blue { color: var(--neon-blue); text-shadow: 0 0 10px var(--neon-blue); }
        .btn-cyber {
            background: linear-gradient(45deg, var(--neon-pink), var(--neon-purple));
            clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
            transition: 0.3s;
        }
        .btn-cyber:hover {
            transform: scale(1.05);
            box-shadow: 0 0 20px var(--neon-pink);
        }
        .terminal {
            background: #000;
            font-family: 'Courier New', monospace;
            height: 300px;
            overflow-y: auto;
            border: 1px solid #1f1f2e;
        }
        .terminal::-webkit-scrollbar { width: 5px; }
        .terminal::-webkit-scrollbar-thumb { background: var(--neon-pink); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .grid-bg {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
            background-size: 50px 50px;
            z-index: -1;
        }
    </style>
</head>
<body class="p-4 md:p-8">
    <div class="grid-bg"></div>
    
    <div id="login" class="max-w-md mx-auto mt-32 animate__animated animate__fadeIn">
        <div class="glass p-8 rounded-2xl text-center border-t-4 border-pink-600">
            <h1 class="orbitron text-3xl font-bold neon-text-pink mb-2">${config.nombreBot}</h1>
            <p class="text-gray-400 tracking-widest text-sm mb-8 uppercase">Acceso Restringido</p>
            <div class="relative mb-6">
                <i data-lucide="shield-check" class="absolute left-3 top-3.5 text-gray-500 w-5 h-5"></i>
                <input id="token" type="password" placeholder="CLAVE DE ACCESO" class="w-full bg-black border border-gray-800 rounded-lg py-3 px-10 text-white focus:border-pink-500 outline-none transition-all">
            </div>
            <button onclick="entrar()" class="btn-cyber w-full py-3 text-white font-bold tracking-widest">AUTENTICAR</button>
        </div>
    </div>

    <div id="panel" class="hidden animate__animated animate__fadeIn">
        <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 class="orbitron text-4xl font-black neon-text-blue">${config.nombreBot} <span class="text-sm font-light text-gray-500">v1.5.0</span></h1>
                <p class="text-gray-400 flex items-center gap-2"><i data-lucide="cpu" class="w-4 h-4"></i> SISTEMA OPERATIVO CENTRAL</p>
            </div>
            <div class="flex gap-4">
                <div class="glass px-6 py-2 rounded-full flex items-center gap-3">
                    <span class="w-3 h-3 bg-green-500 rounded-full pulse shadow-[0_0_10px_#22c55e]"></span>
                    <span class="font-bold tracking-tighter">SISTEMA ONLINE</span>
                </div>
                <button onclick="reiniciar()" class="glass px-6 py-2 rounded-full hover:bg-red-900/20 text-red-500 transition-all flex items-center gap-2">
                    <i data-lucide="refresh-cw" class="w-4 h-4"></i> REINICIAR
                </button>
            </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="glass p-6 rounded-xl neon-border-pink">
                <div class="flex justify-between items-start mb-2">
                    <p class="text-gray-400 text-xs font-bold uppercase">Tiempo Activo</p>
                    <i data-lucide="clock" class="w-4 h-4 text-pink-500"></i>
                </div>
                <h2 id="uptime" class="orbitron text-2xl font-bold">-</h2>
            </div>
            <div class="glass p-6 rounded-xl neon-border-blue">
                <div class="flex justify-between items-start mb-2">
                    <p class="text-gray-400 text-xs font-bold uppercase">Memoria RAM</p>
                    <i data-lucide="zap" class="w-4 h-4 text-blue-500"></i>
                </div>
                <h2 id="ram" class="orbitron text-2xl font-bold">-</h2>
            </div>
            <div class="glass p-6 rounded-xl neon-border-pink">
                <div class="flex justify-between items-start mb-2">
                    <p class="text-gray-400 text-xs font-bold uppercase">Usuarios</p>
                    <i data-lucide="users" class="w-4 h-4 text-pink-500"></i>
                </div>
                <h2 id="usuarios" class="orbitron text-2xl font-bold">-</h2>
            </div>
            <div class="glass p-6 rounded-xl neon-border-blue">
                <div class="flex justify-between items-start mb-2">
                    <p class="text-gray-400 text-xs font-bold uppercase">Sub-Bots</p>
                    <i data-lucide="layers" class="w-4 h-4 text-blue-500"></i>
                </div>
                <h2 id="subbots" class="orbitron text-2xl font-bold">-</h2>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="glass p-6 rounded-2xl">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="orbitron text-lg flex items-center gap-2"><i data-lucide="terminal" class="text-pink-500"></i> CONSOLA EN VIVO</h3>
                        <span class="text-[10px] bg-pink-500/20 text-pink-500 px-2 py-1 rounded">STREAMING</span>
                    </div>
                    <div id="logs" class="terminal p-4 rounded-lg text-xs space-y-1">
                        <div class="text-gray-500">[SISTEMA] Iniciando consola...</div>
                    </div>
                </div>
                
                <div class="glass p-6 rounded-2xl">
                    <h3 class="orbitron text-lg mb-6 flex items-center gap-2"><i data-lucide="activity" class="text-blue-500"></i> RENDIMIENTO DE MEMORIA</h3>
                    <canvas id="ramChart" height="100"></canvas>
                </div>
            </div>

            <div class="space-y-8">
                <div class="glass p-6 rounded-2xl">
                    <h3 class="orbitron text-lg mb-6">STAFF DE CONTROL</h3>
                    <div class="space-y-4">
                        <div class="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
                            <div class="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center font-bold">A</div>
                            <div>
                                <p class="font-bold">AmilcarGit</p>
                                <p class="text-xs text-pink-500">OWNER / DEVELOPER</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
                            <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">B</div>
                            <div>
                                <p class="font-bold">Benja</p>
                                <p class="text-xs text-blue-500">STAFF / MODERADOR</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="glass p-6 rounded-2xl border-t-4 border-blue-500">
                    <h3 class="orbitron text-lg mb-4">NOTIFICACIÓN</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        El sistema está operando bajo protocolos de seguridad AES-256. Todas las acciones realizadas desde este panel son registradas en el servidor principal.
                    </p>
                </div>
            </div>
        </div>

        <footer class="mt-12 text-center text-gray-600 text-sm tracking-widest">
            THE YUI-MD &copy; 2026 | PROTOCOLO DE INTERFAZ NEURAL
        </footer>
    </div>

    <script>
        lucide.createIcons();
        let currentToken = localStorage.getItem('yui_token') || '';
        let ramHistory = [];
        let labels = [];
        let chart;

        function initChart() {
            const ctx = document.getElementById('ramChart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'RAM (MB)',
                        data: ramHistory,
                        borderColor: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { display: false }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        async function entrar() {
            const val = document.getElementById('token').value || currentToken;
            try {
                const res = await fetch('/api/status', { headers: { 'x-panel-token': val } });
                if (res.ok) {
                    localStorage.setItem('yui_token', val);
                    currentToken = val;
                    document.getElementById('login').classList.add('hidden');
                    document.getElementById('panel').classList.remove('hidden');
                    initChart();
                    setInterval(actualizar, 3000);
                    actualizar();
                } else {
                    alert('ACCESO DENEGADO: TOKEN INVÁLIDO');
                    localStorage.removeItem('yui_token');
                }
            } catch(e) { alert('ERROR DE CONEXIÓN'); }
        }

        async function actualizar() {
            try {
                const res = await fetch('/api/status', { headers: { 'x-panel-token': currentToken } });
                const d = await res.json();
                
                document.getElementById('uptime').innerText = d.uptime;
                document.getElementById('ram').innerText = d.ram;
                document.getElementById('usuarios').innerText = d.usuarios;
                document.getElementById('subbots').innerText = d.subbots;

                const ramVal = parseFloat(d.ram);
                ramHistory.push(ramVal);
                labels.push(new Date().toLocaleTimeString());
                if(ramHistory.length > 20) { ramHistory.shift(); labels.shift(); }
                chart.update();

                const logRes = await fetch('/api/logs', { headers: { 'x-panel-token': currentToken } });
                const logs = await logRes.json();
                const logDiv = document.getElementById('logs');
                logDiv.innerHTML = logs.map(l => \`<div><span class="text-pink-500">[\${l.time}]</span> <span class="text-gray-300">\${l.msg}</span></div>\`).join('');
                logDiv.scrollTop = logDiv.scrollHeight;

            } catch(e) {}
        }

        async function reiniciar() {
            if(!confirm('¿Estás seguro de reiniciar el bot?')) return;
            await fetch('/api/restart', { method: 'POST', headers: { 'x-panel-token': currentToken } });
            alert('Reiniciando...');
            location.reload();
        }

        if (currentToken) entrar();
    </script>
</body>
</html>`
}

export function iniciarPanel() {
  if (!config.panelActivo) return
  const app = express()
  
  app.get('/', (req, res) => res.send(paginaHtml()))
  
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
    res.json({ status: 'ok' })
    setTimeout(() => process.exit(0), 1000)
  })

  app.listen(config.panelPort, '0.0.0.0', () => {
    const token = obtenerToken()
    console.log('\n' + '═'.repeat(50))
    console.log('🌐 CORE DASHBOARD: http://localhost:' + config.panelPort)
    console.log('🔑 TOKEN ÚNICO: ' + token)
    console.log('═'.repeat(50) + '\n')
  })
}
