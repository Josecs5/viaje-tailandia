// Bot de Telegram de la hora Taz (Cloudflare Worker).
//
// Un cron lo despierta cada minuto. Si en ese minuto se abre una hora Taz,
// manda un aviso al grupo con el botón para abrir la ruleta. No dice a quién
// le toca: eso se descubre girando la ruleta en la app.
//
// Las horas salen de bot/taz-horario.json (generado desde app.js). Lo lee de
// GitHub para estar siempre al día y, si GitHub falla, usa la copia que se
// empaquetó al desplegar.
//
// Secretos (npx wrangler secret put …):
//   TELEGRAM_TOKEN  token del bot (@BotFather)
//   TELEGRAM_CHAT   id del grupo (número negativo)
//   CLAVE_PRUEBA    opcional: activa /prueba?clave=… para mandar un mensaje de prueba
import respaldo from './taz-horario.json';

const HORARIO_URL = 'https://raw.githubusercontent.com/Josecs5/viaje-tailandia/main/bot/taz-horario.json';
const APP_URL = 'https://josecs5.github.io/viaje-tailandia/#taz';
const FOTO_URL = 'https://josecs5.github.io/viaje-tailandia/icons/taz.png?v=2';

async function cargarHorario() {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const r = await fetch(HORARIO_URL, { cf: { cacheTtl: 60 } });
      if (r.ok) {
        const h = await r.json();
        if (Array.isArray(h.turnos)) return h;
      }
    } catch (e) { /* reintenta y, si no, tira de la copia */ }
  }
  return respaldo;
}

// Turnos que se abren justo en el minuto programado del cron.
export function turnosDelMinuto(horario, ms) {
  const minuto = Math.floor(ms / 60e3) * 60e3;
  return horario.turnos.filter(t => Date.parse(t.utc) === minuto);
}

export function textoAviso(t) {
  if (t.turno === 'noche') {
    return '🌙 ¡Hora Taz de noche!\n\n' +
      'La ruleta de discoteca ya está abierta. ¿A quién le toca esta noche?' +
      (t.ultima ? '\n\nEs la última hora Taz del viaje. 🌪️' : '');
  }
  let txt = t.primera
    ? '🌪️ ¡Bienvenidos a Tailandia! Llega la primera hora Taz.\n\n'
    : '🌪️ ¡Ha llegado la hora Taz!\n\n';
  txt += 'La ruleta ya está abierta: abrid la app y a ver a quién le toca hoy.';
  if (t.doble) txt += '\n\nY esta noche hay otra, de discoteca. 🌙';
  if (t.ultima) txt += '\n\nEs la última hora Taz del viaje.';
  return txt;
}

async function telegram(env, metodo, cuerpo) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo)
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${metodo}: ${r.status} ${j.description || ''}`);
  return j;
}

async function avisar(env, texto) {
  const boton = { inline_keyboard: [[{ text: '🎡 Abrir la ruleta', url: APP_URL }]] };
  try {
    await telegram(env, 'sendPhoto', { chat_id: env.TELEGRAM_CHAT, photo: FOTO_URL, caption: texto, reply_markup: boton });
  } catch (e) {
    // Si la foto falla, al menos el texto.
    console.error(e.message);
    await telegram(env, 'sendMessage', { chat_id: env.TELEGRAM_CHAT, text: texto + '\n\n' + APP_URL, reply_markup: boton });
  }
}

export default {
  async scheduled(evento, env, ctx) {
    const horario = await cargarHorario();
    for (const t of turnosDelMinuto(horario, evento.scheduledTime)) {
      await avisar(env, textoAviso(t));
      console.log(`Aviso enviado: ${t.fecha} ${t.turno}`);
    }
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/prueba') {
      if (!env.CLAVE_PRUEBA || url.searchParams.get('clave') !== env.CLAVE_PRUEBA) {
        return new Response('No', { status: 403 });
      }
      await avisar(env, '🧪 Prueba del bot de la hora Taz: si veis esto, los avisos llegarán a este grupo.');
      return new Response('Mensaje de prueba enviado');
    }
    return new Response('Bot de la hora Taz funcionando 🌪️');
  }
};
