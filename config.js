export default {
  nombreBot: 'FamilyBot-MD',
  prefijo: '.',
  idiomaPorDefecto: 'es',
  owner: ['51910227479', '263505471119372'],
  staff: [
    { nombre: 'Benja', numero: '5493875132593' }
  ],
  numeroBot: '',
  prioridad: 0,
  sessionFolder: './session',
  dbFile: './database.json',
  groupCacheTTL: 60 * 1000,
  rateLimitPause: 90 * 1000,
  maxReconnectAttempts: 8,
  maxReconnectDelay: 5 * 60 * 1000,
  maxSubbots: 5,
  subbotsPorUsuario: 1,
  panelActivo: true,
  panelPort: 3000,
  panelToken: 'auto',
  comandosDesactivados: [],
  bienvenida: {
    activa: true,
    mensajeEntrada: '👋 ¡Bienvenido/a {mention} a *{grupo}*!\nLee las reglas y disfruta tu estadía 🎉',
    mensajeSalida: '😢 {mention} salió de *{grupo}*. ¡Hasta pronto!',
  },
}
