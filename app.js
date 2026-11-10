/* Viaje a Tailandia — Planificador
 * HTML + CSS + JS puro. Sin build. Datos en localStorage.
 * Motor de itinerario, formularios por schema y service worker propios.
 */
'use strict';
(function () {

  /* ==========================================================
     Utilidades
     ========================================================== */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on = (sel, ev, fn) => { const n = $(sel); if (n) n.addEventListener(ev, fn); };
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad2 = n => String(n).padStart(2, '0');
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  // Iconos de interfaz (SVG de trazo; heredan el color del texto)
  const svgIco = (d, size, sw) => `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const PLANE = '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.2.4c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>';
  const ICON = {
    edit:   svgIco('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
    trash:  svgIco('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    chev:   svgIco('<path d="M6 9l6 6 6-6"/>', 22, 2.6),
    plus:   svgIco('<path d="M12 5v14M5 12h14"/>', 18, 2.6),
    plane:  svgIco(PLANE, 16, 2.4),
    planeL: svgIco(PLANE, 34, 2.2),
    house:  svgIco('<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>', 17, 2.6),
    pin:    svgIco('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', 14, 2.4),
    coin:   svgIco('<circle cx="12" cy="12" r="9"/><path d="M14.6 9.3c-.6-.8-1.6-1.3-2.6-1.3-1.5 0-2.6.8-2.6 2 0 2.7 5.2 1.4 5.2 4.2 0 1.2-1.1 2-2.6 2-1.1 0-2.1-.5-2.7-1.4M12 6v2M12 16v2"/>', 14, 2.4),
    moon:   svgIco('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>', 19, 2.2),
    sun:    svgIco('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 19, 2.2),
    locate: svgIco('<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>', 15, 2.4)
  };

  const MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIA_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function parseDate(s) {
    if (!s) return null;
    const [y, m, d] = String(s).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const ymd = dt => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  const hoyYMD = () => ymd(new Date());

  function fmtFecha(s, long) {
    const dt = parseDate(s);
    if (!dt) return '';
    const mes = (long ? MES_L : MES_C)[dt.getMonth()];
    return `${dt.getDate()} ${mes}${long ? ' ' + dt.getFullYear() : ''}`;
  }
  const fmtDiaSemana = s => { const dt = parseDate(s); return dt ? DIA_L[dt.getDay()] : ''; };

  function dtParts(s) {
    if (!s) return { date: '', time: '' };
    const [d, t] = String(s).split('T');
    return { date: d || '', time: (t || '').slice(0, 5) };
  }
  const toMin = t => {
    const m = String(t || '').match(/(\d{1,2}):(\d{2})/);
    return m ? (+m[1]) * 60 + (+m[2]) : 0;
  };
  const firstTime = s => {
    const m = String(s || '').match(/(\d{1,2}):(\d{2})/);
    return m ? `${pad2(+m[1])}:${m[2]}` : '';
  };

  function eachDay(a, b) {
    const out = [];
    const start = parseDate(a), end = parseDate(b);
    if (!start || !end || end < start) return out;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(ymd(new Date(d)));
    return out;
  }

  function haversine(a, b) {
    const R = 6371, toR = x => x * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  // Tiempo de trayecto estimado entre dos puntos: distancia en línea recta ×
  // un factor de rodeo genérico ÷ velocidad media mixta (coche/taxi, ciudad y
  // carretera). No hay calibración por región (a diferencia del hermano de
  // Islandia, que sí la tenía para su Ruta 1) — es solo una referencia
  // aproximada para hacerse una idea del orden de magnitud entre paradas.
  const AVG_KMH = 45;
  const PARK_MIN = 4;
  const DETOUR_FACTOR = 1.3;

  // Umbrales de dayPlan (viabilidad del día)
  const SALIDA_FLOOR_MIN = 7 * 60 + 30;   // no se empieza a moverse antes de las 07:30
  const MARGEN_ATARDECER_MIN = 30;        // colchón antes del atardecer para "ok"
  const MARGEN_ANCLA_MIN = 10;            // holgura para llegar a una hora de encuentro
  const VOLANTE_LARGO_H = 4;
  const VOLANTE_MAX_H = 6;
  const COMIDA_MIN = 50;
  const EXCURSION_MIN = 120;              // duración por defecto si la excursión no la trae
  const LUGAR_MIN = 45;                   // tiempo de visita por defecto

  function driveByRoad(a, b) {
    const kmRecta = haversine(a, b);
    const kmRuta = kmRecta * DETOUR_FACTOR;
    const min = Math.round(kmRuta / AVG_KMH * 60) + PARK_MIN;
    return { km: kmRuta, min };
  }
  const MIN_LEG_KM = 1; // por debajo de esto no se muestra trayecto (mismo sitio / a pie)

  function fmtDur(min) {
    min = Math.round(min);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  // "2 h 30 min" / "2h30" / "90 min" -> minutos (o null)
  function parseDurLoose(s) {
    s = String(s || '');
    const hm = s.match(/(\d+)\s*h[^0-9]*(\d+)?/i);
    if (hm) return (+hm[1]) * 60 + (+(hm[2] || 0));
    const mm = s.match(/(\d+)\s*m/i);
    if (mm) return +mm[1];
    const n = s.match(/^\s*(\d+)\s*$/);
    return n ? +n[1] : null;
  }
  const minusMin = (hhmm, mins) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    if (isNaN(h)) return '';
    let t = h * 60 + m - mins;
    t = ((t % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };

  // Tailandia va siempre en ICT (UTC+7), sin horario de verano — igual de
  // simple que el UTC+0 fijo de Islandia. Se usa para anclar los cálculos de
  // sol/luna (sky()) y de viabilidad del día (dayPlan()) a la hora local real
  // del viaje, sea cual sea la zona horaria del dispositivo que consulta la app.
  const TH_TZ_OFFSET_H = 7;
  const TH_TZ_OFFSET_MS = TH_TZ_OFFSET_H * 3600000;

  /* ==========================================================
     Estado
     ========================================================== */
  const STORE_KEY = 'tailandia_trip_v1';

  const blankFx = () => ({ rate: 38, date: null, source: 'default', stamp: null });
  const blankMeteo = () => ({ clouds: {}, precip: {}, fetched: null });

  const blankState = () => ({
    meta: { titulo: 'Viaje a Tailandia', fechaInicio: '', fechaFin: '' },
    vuelos: [], coches: [], alojamientos: [], excursiones: [], comidas: [], lugares: [], recomendaciones: [],
    gastos: [], fx: blankFx(), meteo: blankMeteo(), equipaje: [], diario: {}, antesDeViajar: []
  });

  /* ==========================================================
     Dinero — Tipo de cambio THB↔€ y formato
     ========================================================== */
  const RATE  = () => (state.fx && state.fx.rate > 0 ? state.fx.rate : 38);
  const toEUR = (imp, mon) => (mon === 'EUR' ? +imp : +imp / RATE());
  const toTHB = (imp, mon) => (mon === 'THB' ? +imp : +imp * RATE());
  const fmtEUR = n => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const fmtTHB = n => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + ' THB';

  // Tipo del día del BCE (frankfurter.dev), cacheado en state.fx. Una vez al
  // día; si no hay conexión, no hace nada. Solo se silencian los fallos de
  // red / HTTP / parseo: si peta el re-render posterior, que se vea en consola.
  function refreshFx() {
    if (!navigator.onLine) return;
    if (state.fx && state.fx.stamp === hoyYMD()) return;
    fetch('https://api.frankfurter.dev/v1/latest?from=EUR&to=THB')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null)
      .then(j => {
        const thb = j && j.rates && j.rates.THB;
        if (typeof thb !== 'number' || !(thb > 0)) return;
        state.fx = { rate: thb, date: j.date || hoyYMD(), source: 'api', stamp: hoyYMD() };
        save();
        renderDatos();
      });
  }

  // Lista de equipaje curada para Tailandia: clima cálido y húmedo, templos,
  // playas/islas, temporada de monzón. Sin datos personales — es una
  // plantilla que el usuario ajusta a su viaje real desde Datos.
  const EQUIPAJE_SEED = [
    { id: 'seed-eq-1', texto: 'Ropa ligera y transpirable para varios días', cat: 'Ropa', packed: false },
    { id: 'seed-eq-2', texto: 'Ropa que cubra hombros y rodillas (para entrar a templos)', cat: 'Ropa', packed: false },
    { id: 'seed-eq-3', texto: 'Chubasquero ligero o poncho de lluvia (temporada de monzón)', cat: 'Ropa', packed: false },
    { id: 'seed-eq-4', texto: 'Bañador', cat: 'Ropa', packed: false },
    { id: 'seed-eq-5', texto: 'Pareo o toalla de secado rápido', cat: 'Ropa', packed: false },
    { id: 'seed-eq-6', texto: 'Jersey o chaqueta ligera (aire acondicionado fuerte en buses, malls y aviones)', cat: 'Ropa', packed: false },
    { id: 'seed-eq-7', texto: 'Chanclas o sandalias fáciles de quitar (templos y playa)', cat: 'Calzado', packed: false },
    { id: 'seed-eq-8', texto: 'Calzado cómodo para caminar', cat: 'Calzado', packed: false },
    { id: 'seed-eq-9', texto: 'Protector solar alto, idealmente reef-safe para islas y snorkel', cat: 'Sol y mosquitos', packed: false },
    { id: 'seed-eq-10', texto: 'Repelente de mosquitos con DEET o icaridina', cat: 'Sol y mosquitos', packed: false },
    { id: 'seed-eq-11', texto: 'Gafas de sol y gorra o sombrero', cat: 'Sol y mosquitos', packed: false },
    { id: 'seed-eq-12', texto: 'After-sun o gel de aloe vera', cat: 'Sol y mosquitos', packed: false },
    { id: 'seed-eq-13', texto: 'Pasaporte con al menos 6 meses de validez desde la entrada', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-14', texto: 'Visado o e-visa impreso o guardado, si aplica', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-15', texto: 'Seguro de viaje: documento y teléfono de asistencia', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-16', texto: 'Copia digital y en papel del pasaporte', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-17', texto: 'Tarjeta con chip y PIN, y algo de efectivo en THB', cat: 'Documentos y dinero', packed: false },
    { id: 'seed-eq-18', texto: 'Cargador y cable de móvil', cat: 'Electrónica', packed: false },
    { id: 'seed-eq-19', texto: 'Batería externa', cat: 'Electrónica', packed: false },
    { id: 'seed-eq-20', texto: 'Adaptador de enchufe universal (Tailandia: tomas tipo A/B/C/O, 220V)', cat: 'Electrónica', packed: false },
    { id: 'seed-eq-21', texto: 'Funda impermeable para el móvil (islas, barcos, monzón)', cat: 'Electrónica', packed: false },
    { id: 'seed-eq-22', texto: 'Analgésicos, antidiarreico y sales de rehidratación', cat: 'Botiquín y aseo', packed: false },
    { id: 'seed-eq-23', texto: 'Antihistamínico', cat: 'Botiquín y aseo', packed: false },
    { id: 'seed-eq-24', texto: 'Gel hidroalcohólico', cat: 'Botiquín y aseo', packed: false },
    { id: 'seed-eq-25', texto: 'Pastillas para el mareo (ferris y barcos rápidos)', cat: 'Botiquín y aseo', packed: false },
    { id: 'seed-eq-26', texto: 'Bolsa estanca (dry bag) pequeña', cat: 'Playa y barco', packed: false },
    { id: 'seed-eq-27', texto: 'Gafas y tubo de snorkel propios, si los tienes', cat: 'Playa y barco', packed: false },
    { id: 'seed-eq-28', texto: 'Candado pequeño para taquillas o mochila en hostales y trenes nocturnos', cat: 'Playa y barco', packed: false }
  ];

  // Checklist de tareas antes de salir (no objetos que llevar, eso es
  // EQUIPAJE_SEED). "anchor" liga una tarea a un vuelo real de state.vuelos
  // ('vuelo-ida'/'vuelo-vuelta') para calcular su fecha límite en cuanto el
  // usuario añada sus vuelos — ver anteDeadline()/anteFechaTxt(). Sin vuelos
  // añadidos todavía, esas dos tareas se muestran sin fecha, como el resto.
  const ANTES_SEED = [
    { id: 'seed-an-1', texto: 'Comprobar qué visado necesitas (exento, visa on arrival o e-visa) y tramitarlo con antelación si hace falta', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-2', texto: 'Comprobar que el pasaporte tiene al menos 6 meses de validez desde la fecha de entrada', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-3', texto: 'Consultar vacunas recomendadas en un centro de vacunación internacional', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-4', texto: 'Si vas a zonas rurales o fronterizas, preguntar por la profilaxis antipalúdica', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-5', texto: 'Confirmar que el seguro de viaje está contratado (que cubra moto o buceo, si aplica)', cat: 'Visado y salud', anchor: null, hecho: false },
    { id: 'seed-an-6', texto: 'Facturar el vuelo de ida', cat: 'Vuelos', anchor: 'vuelo-ida', hecho: false },
    { id: 'seed-an-7', texto: 'Facturar el vuelo de vuelta', cat: 'Vuelos', anchor: 'vuelo-vuelta', hecho: false },
    { id: 'seed-an-8', texto: 'Avisar al banco de que vas a usar la tarjeta en Tailandia', cat: 'General', anchor: null, hecho: false },
    { id: 'seed-an-9', texto: 'Activar roaming de datos o comprar una eSIM', cat: 'General', anchor: null, hecho: false },
    { id: 'seed-an-10', texto: 'Sacar fotocopia o foto digital del pasaporte y guardarla aparte', cat: 'General', anchor: null, hecho: false },
    { id: 'seed-an-11', texto: 'Probar la app sin conexión: abrir Mapas de cada día con wifi antes de salir', cat: 'General', anchor: null, hecho: false }
  ];

  // Viaje real precargado (24 nov - 9 dic 2026), introducido por el usuario.
  // Todo sigue siendo editable desde la app: esto es solo el punto de partida
  // para quien abre la web por primera vez. Sin nombres, teléfonos, emails ni
  // localizadores de reserva (la web es pública) — donde el usuario no dio un
  // dato concreto (p. ej. las horas de la escala en Doha) se ha dejado en
  // blanco en vez de inventarlo.
  const META_SEED = { titulo: 'Viaje a Tailandia', fechaInicio: '2026-11-24', fechaFin: '2026-12-09' };

  // Ida y vuelta con Qatar: horarios que Qatar vendía para estas fechas el
  // 10 nov 2026. Cambian respecto a la reserva (ida a las 22:05 en vez de
  // 22:25; el QR851 de la vuelta ya no se vende y lo sustituye el QR843), por
  // eso las notas piden confirmarlo en la reserva.
  // Equipaje incluido en los billetes de Qatar (ida y vuelta), por persona.
  const EQUIPAJE_QATAR = 'Incluido por persona (7 de cada en total):\n' +
    '· 1 accesorio personal: va debajo del asiento de delante.\n' +
    '· 1 equipaje de mano de 25 × 37 × 50 cm, máx. 7 kg.\n' +
    '· 1 maleta facturada de máx. 25 kg.';

  // Bangkok → Chiang Mai: el plan decía 08:10 → 09:25, pero AirAsia no
  // vende ningún vuelo a esa hora el 29 nov; el grupo eligió el FD3416.
  const NOTA_DMK_CNX = 'Directo. El plan decía 08:10 → 09:25; ese día AirAsia vende el FD3416 de 08:25 a 09:40. Confirmad en la reserva de AirAsia que es este vuelo.';

  const VUELOS_SEED = [
    {
      id: 'seed-vu-ida', tipo: 'Ida', reserva: '', antelacion: '3 h', equipaje: EQUIPAJE_QATAR,
      notas: 'Qatar Airways, clase turista. Escala en Doha (DOH) de 2 h 15 min; 15 h 20 min en total.\nOJO: Qatar ha adelantado la salida de Madrid a las 22:05 (en la reserva ponía 22:25). Confirmadlo en «Mis reservas» de qatarairways.com.',
      tramos: [{
        aerolinea: 'Qatar Airways', numero: 'QR152', clase: 'Turista', operadoPor: '',
        origen: 'MAD', origenNombre: 'Madrid-Barajas', origenTerminal: '',
        destino: 'DOH', destinoNombre: 'Doha Hamad', destinoTerminal: '',
        salida: '2026-11-24T22:05', llegada: '2026-11-25T06:40', duracion: '6 h 35 min'
      }, {
        aerolinea: 'Qatar Airways', numero: 'QR826', clase: 'Turista', operadoPor: '',
        origen: 'DOH', origenNombre: 'Doha Hamad', origenTerminal: '',
        destino: 'BKK', destinoNombre: 'Bangkok Suvarnabhumi', destinoTerminal: '',
        salida: '2026-11-25T08:55', llegada: '2026-11-25T19:25', duracion: '6 h 30 min'
      }]
    },
    {
      id: 'seed-vu-vuelta', tipo: 'Vuelta', reserva: '', antelacion: '2 h', equipaje: EQUIPAJE_QATAR,
      notas: 'Qatar Airways, clase turista. Escala en Doha (DOH) de 3 h 50 min; 18 h 25 min en total.\nOJO: en la reserva ponía QR851 a las 08:55 con llegada a Madrid a las 20:55, pero el QR851 ya no se vende y lleva días cancelándose. Qatar vende ahora el QR843 a las 08:20 y el QR151 llega a Madrid a las 20:45. Confirmad en «Mis reservas» de qatarairways.com a qué vuelo os han pasado.',
      tramos: [{
        aerolinea: 'Qatar Airways', numero: 'QR843', clase: 'Turista', operadoPor: '',
        origen: 'HKT', origenNombre: 'Phuket', origenTerminal: '',
        destino: 'DOH', destinoNombre: 'Doha Hamad', destinoTerminal: '',
        salida: '2026-12-09T08:20', llegada: '2026-12-09T11:25', duracion: '7 h 05 min'
      }, {
        aerolinea: 'Qatar Airways', numero: 'QR151', clase: 'Turista', operadoPor: '',
        origen: 'DOH', origenNombre: 'Doha Hamad', origenTerminal: '',
        destino: 'MAD', destinoNombre: 'Madrid-Barajas', destinoTerminal: '',
        salida: '2026-12-09T15:15', llegada: '2026-12-09T20:45', duracion: '7 h 30 min'
      }]
    },
    {
      id: 'seed-vu-dmk-cnx', tipo: 'Interno', reserva: '', antelacion: '', equipaje: 'Maleta facturada de 25 kg: 32 €.',
      notas: NOTA_DMK_CNX,
      tramos: [{
        aerolinea: 'Thai AirAsia', numero: 'FD3416', clase: '', operadoPor: '',
        origen: 'DMK', origenNombre: 'Bangkok Don Mueang', origenTerminal: '',
        destino: 'CNX', destinoNombre: 'Chiang Mai', destinoTerminal: '',
        salida: '2026-11-29T08:25', llegada: '2026-11-29T09:40', duracion: '1 h 15 min'
      }]
    },
    {
      id: 'seed-vu-cnx-kbv', tipo: 'Interno', reserva: '', antelacion: '', equipaje: 'Maleta extra: 35 €.',
      notas: 'Directo.',
      tramos: [{
        aerolinea: 'Thai AirAsia', numero: 'FD3072', clase: '', operadoPor: '',
        origen: 'CNX', origenNombre: 'Chiang Mai', origenTerminal: '',
        destino: 'KBV', destinoNombre: 'Krabi', destinoTerminal: '',
        salida: '2026-12-03T07:55', llegada: '2026-12-03T09:55', duracion: '2 h'
      }]
    }
  ];

  // Quien ya abrió la web antes tiene guardados los vuelos precargados antiguos
  // (un solo tramo, sin número de vuelo ni hora de salida de Madrid). Si siguen
  // tal cual, se sustituyen por los datos completos; si el usuario ya los
  // editó (puso un número de vuelo o añadió tramos) no se tocan.
  function upgradeSeedVuelo(v) {
    const seed = VUELOS_SEED.find(x => x.id === v.id);
    if (!seed || !Array.isArray(v.tramos) || v.tramos.length !== 1 || v.tramos[0].numero) return v;
    const nuevo = JSON.parse(JSON.stringify(seed));
    nuevo.reserva = v.reserva || '';
    nuevo.antelacion = v.antelacion || nuevo.antelacion;
    nuevo.equipaje = v.equipaje || '';
    return nuevo;
  }

  const ALOJ_SEED = [
    { id: 'seed-al-bkk', nombre: 'Prince Palace Bangkok',
      loc: { texto: '488/800 Bo Bae Tower, Damrongrak Road, Mahanak, Pomprab Sattrupai, Pom Prap Sattru Phai, 10100 Bangkok, Tailandia', lat: 13.7541973, lng: 100.5159364 },
      checkin: '2026-11-25', checkout: '2026-11-29', zona: 'Bangkok', reserva: '',
      link: 'https://maps.app.goo.gl/F2rpoZidDawh629j8',
      notas: '4 noches. 84 € (21 €/noche).' },
    { id: 'seed-al-cnx', nombre: 'Comfy Boutique House',
      loc: { texto: '10 Wiangbua Soi 6, Chang Phueak, 50300 Chiang Mai, Tailandia', lat: 18.8079134, lng: 98.9793114 },
      checkin: '2026-11-29', checkout: '2026-12-03', zona: 'Chiang Mai', reserva: '',
      link: 'https://maps.app.goo.gl/BFcokj1bJzJH9dw5A',
      notas: '4 noches. 130 € (33 €/noche). Check-in hecho sobre las 11:00.' },
    { id: 'seed-al-krabi', nombre: 'KG Private Pool Villas Soi 9', loc: { texto: '1003/2 Soi-9, Ao Nang, Mueang Krabi District, Krabi 81180, Tailandia', lat: 8.0376719, lng: 98.8380055 },
      checkin: '2026-12-03', checkout: '2026-12-05', zona: 'Krabi / Ao Nang', reserva: '',
      link: 'https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=/maps/place//data%3D!4m2!3m1!1s0x3051eb023f252ce1:0xb9002739da0a9f01%3Fsa%3DX%26ved%3D1t:8290%26ictx%3D111&ved=2ahUKEwiAv4WY6-SWAxUl3AIHHeALCT0Q4kB6BAgtEAM&usg=AOvVaw33Gpn54xYr-WA3JpsQsO-w',
      notas: '2 noches. 55 € (27,5 €/noche).' },
    { id: 'seed-al-phiphi', nombre: 'Phi Phi Maiyada Resort', loc: { texto: 'Koh Phi Phi', lat: 7.7392054, lng: 98.7661381 },
      checkin: '2026-12-05', checkout: '2026-12-07', zona: 'Koh Phi Phi', reserva: '',
      link: 'https://maps.app.goo.gl/piuyjui1VFbBoaESA',
      notas: '2 noches. 66 € (33 €/noche).' },
    { id: 'seed-al-phuket', nombre: 'Nariya Bayfront Phuket', loc: { texto: 'Bahía de Chalong, Phuket', lat: 7.817411, lng: 98.3432381 },
      checkin: '2026-12-07', checkout: '2026-12-09', zona: 'Phuket', reserva: '',
      link: 'https://maps.app.goo.gl/kdHjJBtdoEawLF4q8',
      notas: '2 noches, última etapa del viaje. 98 € (49 €/noche).' }
  ];

  // Fotos: URLs directas de Wikimedia Commons, un archivo real y verificado
  // por sitio. Si un lugar no tiene foto suya en Commons se usa una de su
  // calle, su zona o su plato típico, y la descripción lo deja claro.
  const FOTO = {
    granPalacio: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/0005574_-_Wat_Phra_Kaew_006.jpg/960px-0005574_-_Wat_Phra_Kaew_006.jpg',
    watPhraKaew: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Wat_Phra_Kaew_by_Ninara_TSP_edit_crop.jpg/960px-Wat_Phra_Kaew_by_Ninara_TSP_edit_crop.jpg',
    watPho: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B8%9E%E0%B8%B8%E0%B8%97%E0%B8%98%E0%B9%84%E0%B8%AA%E0%B8%A2%E0%B8%B2%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%8A%E0%B8%95%E0%B8%B8%E0%B8%9E%E0%B8%99.jpg/960px-%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B8%9E%E0%B8%B8%E0%B8%97%E0%B8%98%E0%B9%84%E0%B8%AA%E0%B8%A2%E0%B8%B2%E0%B8%AA%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%9E%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%8A%E0%B8%95%E0%B8%B8%E0%B8%9E%E0%B8%99.jpg',
    watArun: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg/960px-%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg',
    watYaiChaiMongkhon: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99_%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B9%83%E0%B8%AB%E0%B8%8D%E0%B9%88%E0%B8%8A%E0%B8%B1%E0%B8%A2%E0%B8%A1%E0%B8%87%E0%B8%84%E0%B8%A5.jpg/960px-%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99_%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B9%83%E0%B8%AB%E0%B8%8D%E0%B9%88%E0%B8%8A%E0%B8%B1%E0%B8%A2%E0%B8%A1%E0%B8%87%E0%B8%84%E0%B8%A5.jpg',
    watPhananChoeng: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Wat_Phanan_Choeng_2019-01-15.jpg/960px-Wat_Phanan_Choeng_2019-01-15.jpg',
    watRatchaburana: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Entrance_of_Wat_Ratchaburana_%28Ayutthaya%29.jpg/960px-Entrance_of_Wat_Ratchaburana_%28Ayutthaya%29.jpg',
    watMahathat: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Buddha_Head_in_Tree_Roots%2C_Wat_Mahathat%2C_Ayutthaya.jpg/960px-Buddha_Head_in_Tree_Roots%2C_Wat_Mahathat%2C_Ayutthaya.jpg',
    watPhraRam: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Templo_Phra_Ram%2C_Ayutthaya%2C_Tailandia%2C_2013-08-23%2C_DD_02.jpg/960px-Templo_Phra_Ram%2C_Ayutthaya%2C_Tailandia%2C_2013-08-23%2C_DD_02.jpg',
    watPhraSiSanphet: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Three_Chedi%28s%29_of_Wat_Phra_Si_Sanphet.jpg/960px-Three_Chedi%28s%29_of_Wat_Phra_Si_Sanphet.jpg',
    watLokayasutharam: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Wat_Lokaya_Suttha_in_Ayutthaya_Thailand_001.jpg',
    watChaiwatthanaram: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Wat_Chaiwatthanaram_by_drone.jpg/960px-Wat_Chaiwatthanaram_by_drone.jpg',
    chatuchak: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Bangkok_-_Jatujak_Market_02.JPG/960px-Bangkok_-_Jatujak_Market_02.JPG',
    talatNoi: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Rong_Kuak_Shrine_Talat_Noi_%E0%B8%A8%E0%B8%B2%E0%B8%A5%E0%B9%80%E0%B8%88%E0%B9%89%E0%B8%B2%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%80%E0%B8%81%E0%B8%B7%E0%B8%AD%E0%B8%81_%E0%B8%95%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%A2_2021_June.jpg/960px-Rong_Kuak_Shrine_Talat_Noi_%E0%B8%A8%E0%B8%B2%E0%B8%A5%E0%B9%80%E0%B8%88%E0%B9%89%E0%B8%B2%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%80%E0%B8%81%E0%B8%B7%E0%B8%AD%E0%B8%81_%E0%B8%95%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B8%99%E0%B9%89%E0%B8%AD%E0%B8%A2_2021_June.jpg',
    yaowarat: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/%282022%29_%E0%B8%95%E0%B8%B6%E0%B8%81%E0%B9%81%E0%B8%96%E0%B8%A7%E0%B8%A3%E0%B8%B4%E0%B8%A1%E0%B8%96%E0%B8%99%E0%B8%99%E0%B9%80%E0%B8%A2%E0%B8%B2%E0%B8%A7%E0%B8%A3%E0%B8%B2%E0%B8%8A_%E0%B9%80%E0%B8%82%E0%B8%95%E0%B8%AA%E0%B8%B1%E0%B8%A1%E0%B8%9E%E0%B8%B1%E0%B8%99%E0%B8%98%E0%B8%A7%E0%B8%87%E0%B8%A8%E0%B9%8C_%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3_%284%29.jpg/960px-%282022%29_%E0%B8%95%E0%B8%B6%E0%B8%81%E0%B9%81%E0%B8%96%E0%B8%A7%E0%B8%A3%E0%B8%B4%E0%B8%A1%E0%B8%96%E0%B8%99%E0%B8%99%E0%B9%80%E0%B8%A2%E0%B8%B2%E0%B8%A7%E0%B8%A3%E0%B8%B2%E0%B8%8A_%E0%B9%80%E0%B8%82%E0%B8%95%E0%B8%AA%E0%B8%B1%E0%B8%A1%E0%B8%9E%E0%B8%B1%E0%B8%99%E0%B8%98%E0%B8%A7%E0%B8%87%E0%B8%A8%E0%B9%8C_%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3_%284%29.jpg',
    watChiangMan: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Wat_Chiang_Man_%28I%29.jpg/960px-Wat_Chiang_Man_%28I%29.jpg',
    watPhraSingh: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Wat_Phra_Sing%2C_Chiang_Mai_%28I%29.jpg/960px-Wat_Phra_Sing%2C_Chiang_Mai_%28I%29.jpg',
    watPhanTao: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/%282022%29_%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%9E%E0%B8%B1%E0%B8%99%E0%B9%80%E0%B8%95%E0%B8%B2_%E0%B8%AD.%E0%B9%80%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%87_%E0%B8%88.%E0%B9%80%E0%B8%8A%E0%B8%B5%E0%B8%A2%E0%B8%87%E0%B9%83%E0%B8%AB%E0%B8%A1%E0%B9%88%2CWat_Pan_Tao_%281%29.jpg/960px-%282022%29_%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%9E%E0%B8%B1%E0%B8%99%E0%B9%80%E0%B8%95%E0%B8%B2_%E0%B8%AD.%E0%B9%80%E0%B8%A1%E0%B8%B7%E0%B8%AD%E0%B8%87_%E0%B8%88.%E0%B9%80%E0%B8%8A%E0%B8%B5%E0%B8%A2%E0%B8%87%E0%B9%83%E0%B8%AB%E0%B8%A1%E0%B9%88%2CWat_Pan_Tao_%281%29.jpg',
    watChediLuang: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%AB%E0%B8%A5%E0%B8%A7%E0%B8%87.jpg/960px-%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%AB%E0%B8%A5%E0%B8%A7%E0%B8%87.jpg',
    doiSuthep: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Wat_Phra_That_Doi_Suthep_-_Chiang_Mai.jpg/960px-Wat_Phra_That_Doi_Suthep_-_Chiang_Mai.jpg',
    watPhaLat: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Chiang_Mai_-_Wat_Pha_Lat_-_0001.jpg/960px-Chiang_Mai_-_Wat_Pha_Lat_-_0001.jpg',
    muayThai: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Muay_Thai_Fight_Us_Vs_Burma_%2880668065%29.jpeg/960px-Muay_Thai_Fight_Us_Vs_Burma_%2880668065%29.jpeg',
    rajadamnern: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Rajadamnern_Stadium.jpg/960px-Rajadamnern_Stadium.jpg',
    lumpinee: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Bangkok_Lumpinee_Boxing_Stadium_1.jpg/960px-Bangkok_Lumpinee_Boxing_Stadium_1.jpg',
    bangla: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Bangla_Boxing_Stadium_Patong_Thajsko_2018_2.jpg/960px-Bangla_Boxing_Stadium_Patong_Thajsko_2018_2.jpg',
    watRongKhun: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Wat_Rong_Khun_-_Chiang_Rai.jpg/960px-Wat_Rong_Khun_-_Chiang_Rai.jpg',
    watRongSueaTen: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/Chiang_Rai_Blue_Temple_%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%A3%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%AA%E0%B8%B7%E0%B8%AD%E0%B9%80%E0%B8%95%E0%B9%89%E0%B8%99.jpg/960px-Chiang_Rai_Blue_Temple_%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%A3%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%AA%E0%B8%B7%E0%B8%AD%E0%B9%80%E0%B8%95%E0%B9%89%E0%B8%99.jpg',
    baanDam: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Muzeum_Baan_Dam%2C_nazywane_%E2%80%9ECzarnym_Domem%E2%80%9D_w_Chiang_Rai%2C_Tajlandia.jpg/960px-Muzeum_Baan_Dam%2C_nazywane_%E2%80%9ECzarnym_Domem%E2%80%9D_w_Chiang_Rai%2C_Tajlandia.jpg',
    aoNang: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Ao_Nang_beach_panorama_1.jpg/960px-Ao_Nang_beach_panorama_1.jpg',
    railay: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Railay_Beach_5.jpg/960px-Railay_Beach_5.jpg',
    mayaBay: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Maya_Bay%2C_Thailand_by_Mike_Clegg_Photography.jpg/960px-Maya_Bay%2C_Thailand_by_Mike_Clegg_Photography.jpg',
    khaoPhingKan: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Isla_Tapu%2C_Phuket%2C_Tailandia%2C_2013-08-20%2C_DD_36.JPG/960px-Isla_Tapu%2C_Phuket%2C_Tailandia%2C_2013-08-20%2C_DD_36.JPG',
    bigBuddhaPhuket: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/The_Big_Buddha%2C_Phuket.jpg/960px-The_Big_Buddha%2C_Phuket.jpg',
    asiatique: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Asiatique_%28II%29.jpg/960px-Asiatique_%28II%29.jpg',
    iconsiam: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Magnolias_Waterfront_Residences_Iconsiam.jpg',
    elephantSanctuary: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Navann_was_born_at_the_park_Oct_2012.jpg/960px-Navann_was_born_at_the_park_Oct_2012.jpg',
    watHuayPlaKang: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Chiang_Rai_-_Wat_Huay_Pla_Kang_-_Great_Guan_Yin_Statue_%282026%29_-_img_01.jpg/960px-Chiang_Rai_-_Wat_Huay_Pla_Kang_-_Great_Guan_Yin_Statue_%282026%29_-_img_01.jpg',
    chiangRaiClockTower: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Chiang_Rai_Clock_Tower.JPG/960px-Chiang_Rai_Clock_Tower.JPG',
    phraNangCave: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Phra_Nang_cave_P1120058.JPG/960px-Phra_Nang_cave_P1120058.JPG',
    kohPhiPhiDon: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Isla_Ko_Phi_Phi_Don%2C_Tailandia%2C_2013-08-19%2C_DD_02.JPG/960px-Isla_Ko_Phi_Phi_Don%2C_Tailandia%2C_2013-08-19%2C_DD_02.JPG',
    sundayWalkingStreet: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Chiang_Mai_sunday_evening_walking_street.jpg/960px-Chiang_Mai_sunday_evening_walking_street.jpg',
    khaoSan: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/2016_Bangkok%2C_Dystrykt_Phra_Nakhon%2C_Ulica_Khaosan_%2808%29.jpg/960px-2016_Bangkok%2C_Dystrykt_Phra_Nakhon%2C_Ulica_Khaosan_%2808%29.jpg',
    platinum: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Platinum_Fashion_Mall_%28I%29.jpg/960px-Platinum_Fashion_Mall_%28I%29.jpg',
    jimThompson: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Main_House_of_Jim_Thompson_photo_Don_Ramey_Logan.jpg/960px-Main_House_of_Jim_Thompson_photo_Don_Ramey_Logan.jpg',
    bambooIsland: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Ko_Mai_Phai_%28Bamboo_Island%29.jpg/960px-Ko_Mai_Phai_%28Bamboo_Island%29.jpg',
    phangNgaBay: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Dramatic_karst_landscape_of_Phang_Nga_Bay%2C_Thailand.jpg/960px-Dramatic_karst_landscape_of_Phang_Nga_Bay%2C_Thailand.jpg',
    phuketOldTown: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Soi_Rommanee%2C_Phuket_Town.jpg/960px-Soi_Rommanee%2C_Phuket_Town.jpg',
    // Bares, restaurantes y actividades sin foto propia en Commons: foto de
    // la calle, la zona o el plato, y la explicación dice qué es el sitio.
    silom: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Silom_Saladaeng_Soi_1_night_view_Don_Ramey_Logan.jpg/960px-Silom_Saladaeng_Soi_1_night_view_Don_Ramey_Logan.jpg',
    sukhumvit11: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Sukhumvit_Soi_11_tuktuks.jpg/960px-Sukhumvit_Soi_11_tuktuks.jpg',
    fiestaBkk: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/DJ_Tiesto_in_808_Nightclub%2C_progressive_trance_music%2C_waves_of_euphoria%2C_Bangkok%2C_Thailand.jpg/960px-DJ_Tiesto_in_808_Nightclub%2C_progressive_trance_music%2C_waves_of_euphoria%2C_Bangkok%2C_Thailand.jpg',
    trenAyutthaya: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Ayutthaya_railway_station_1.jpg/960px-Ayutthaya_railway_station_1.jpg',
    furgoneta: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Toyota_Hiace_in_Thailand.jpg/960px-Toyota_Hiace_in_Thailand.jpg',
    somTam: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Som_Tam_green_papaya_salad%2C_Bangkok%2C_Thailand.jpg/960px-Som_Tam_green_papaya_salad%2C_Bangkok%2C_Thailand.jpg',
    padThai: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Phat_Thai_kung_Chang_Khien_street_stall.jpg/960px-Phat_Thai_kung_Chang_Khien_street_stall.jpg',
    chaoPhraya: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Chao_Phraya_River_03.jpg/960px-Chao_Phraya_River_03.jpg',
    thaTien: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Tha_Tien_Pier.jpg/960px-Tha_Tien_Pier.jpg',
    oneCityCentre: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/One_City_Centre_BKK_September_2022.jpg/960px-One_City_Centre_BKK_September_2022.jpg',
    skylineSukhumvit: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Bangkok_Skyline_from_Movenpick_Hotel%2C_Asok%2C_Bangkok_at_night.jpg/960px-Bangkok_Skyline_from_Movenpick_Hotel%2C_Asok%2C_Bangkok_at_night.jpg',
    octave: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Bangkok_City_as_viewed_from_Octave_Rooftop_Bar_and_Lounge.jpg/960px-Bangkok_City_as_viewed_from_Octave_Rooftop_Bar_and_Lounge.jpg',
    lannaComida: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Lanna_cuisine_starters.JPG/960px-Lanna_cuisine_starters.JPG',
    baresChiangMai: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Chiang_Mai_bars_at_night-KayEss-1.jpeg',
    oneNimman: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/One_Nimman.jpg/960px-One_Nimman.jpg',
    khaoSoi: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Khao_soi_Chiang_Mai.jpg/960px-Khao_soi_Chiang_Mai.jpg',
    plataChiangMai: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Silver_Reliefs_of_Wat_Sri_Suphan%2C_Chiang_Mai-ship_1.jpg/960px-Silver_Reliefs_of_Wat_Sri_Suphan%2C_Chiang_Mai-ship_1.jpg',
    puenting: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Bungee_Jump_is_freedom.jpg/960px-Bungee_Jump_is_freedom.jpg',
    mercadoAoNang: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Selection_of_fruits_at_Ao_Nang_street_market.jpg/960px-Selection_of_fruits_at_Ao_Nang_street_market.jpg',
    monosAoNang:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Monkeys_at_Ao_Nang_beach_%2812359615635%29.jpg/960px-Monkeys_at_Ao_Nang_beach_%2812359615635%29.jpg',
    pilehLagoon: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/A_Long-tail_Boat_in_Pileh_Lagoon%2C_Phi_Phi_Le.jpg/960px-A_Long-tail_Boat_in_Pileh_Lagoon%2C_Phi_Phi_Le.jpg',
    tonsaiBay: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Tonsai_Bay.jpg/960px-Tonsai_Bay.jpg',
    lohDalum: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Loh_Dalum_Beach.jpg/960px-Loh_Dalum_Beach.jpg',
    ferryPhuket: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/An_Island_Cruise_to_Phi_Phi_Islands%2C_Phuket%2C_Thailand_%283179176541%29.jpg/960px-An_Island_Cruise_to_Phi_Phi_Islands%2C_Phuket%2C_Thailand_%283179176541%29.jpg',
    amanecerPhangNga: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Sunrise%2C_Koh_Yao_Noi_%28island%29%2C_Phang_Nga_Bay%2C_Thailand.jpg/960px-Sunrise%2C_Koh_Yao_Noi_%28island%29%2C_Phang_Nga_Bay%2C_Thailand.jpg',
    chalongPier: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Chalong_Pier.jpg/960px-Chalong_Pier.jpg',
    rachaYai: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Racha_Yai_Island.jpg/960px-Racha_Yai_Island.jpg',
    khaiNok: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Isla_Khai_Nok%2C_Tailandia%2C_2013-08-19%2C_DD_05.JPG/960px-Isla_Khai_Nok%2C_Tailandia%2C_2013-08-19%2C_DD_05.JPG',
    similan: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Similan_Island_01_%28MK%29.jpg/960px-Similan_Island_01_%28MK%29.jpg',
    tirolina: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Zip-line_over_rainforest_canopy_4_January_2005%2C_Costa_Rica.jpg/960px-Zip-line_over_rainforest_canopy_4_January_2005%2C_Costa_Rica.jpg',
    masaje: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Thai_massage_%282362463368%29.jpg/960px-Thai_massage_%282362463368%29.jpg',
    naka: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Nene_Royal_performing_at_Naka_Market.jpg',
    watKaron: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Karon_Tempel_-_panoramio.jpg/960px-Karon_Tempel_-_panoramio.jpg',
    rawai: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Phuket_-_Rawai_Beach_11.jpg/960px-Phuket_-_Rawai_Beach_11.jpg',
    simonCabaret: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Photography_during_the_Simon_Cabaret_show_is_not_allowed_but_the_performers_line_up_afterwards.jpg/960px-Photography_during_the_Simon_Cabaret_show_is_not_allowed_but_the_performers_line_up_afterwards.jpg',
    fantasea: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Phuket_FantaSea_2023.jpg/960px-Phuket_FantaSea_2023.jpg'
  };

  // Gastos del plan (versión 2): lo ya pagado o previsto por persona, en €.
  // Se cargan como gastos normales para que salgan en el resumen de Gastos.
  const GASTOS_SEED = [
    { id: 'seed-ga-vuelo', fecha: '2026-11-24', concepto: 'Vuelo Madrid → Bangkok / Phuket → Madrid', categoria: 'Transporte', moneda: 'EUR', importe: 616, notas: '' },
    { id: 'seed-ga-bkk', fecha: '2026-11-25', concepto: 'Hotel Bangkok (25/11 → 29/11)', categoria: 'Alojamiento', moneda: 'EUR', importe: 84, notas: '21 €/noche' },
    { id: 'seed-ga-vuelo-cnx', fecha: '2026-11-29', concepto: 'Vuelo Bangkok → Chiang Mai', categoria: 'Transporte', moneda: 'EUR', importe: 70, notas: '' },
    { id: 'seed-ga-cnx', fecha: '2026-11-29', concepto: 'Villa Chiang Mai (29/11 → 03/12)', categoria: 'Alojamiento', moneda: 'EUR', importe: 130, notas: '33 €/noche' },
    { id: 'seed-ga-vuelo-kbv', fecha: '2026-12-03', concepto: 'Vuelo Chiang Mai → Krabi', categoria: 'Transporte', moneda: 'EUR', importe: 140, notas: '' },
    { id: 'seed-ga-aonang', fecha: '2026-12-03', concepto: 'Villa Ao Nang (03/12 → 05/12)', categoria: 'Alojamiento', moneda: 'EUR', importe: 55, notas: '27,5 €/noche' },
    { id: 'seed-ga-phiphi', fecha: '2026-12-05', concepto: 'Villa Phi Phi (05/12 → 07/12)', categoria: 'Alojamiento', moneda: 'EUR', importe: 66, notas: '33 €/noche' },
    { id: 'seed-ga-phuket', fecha: '2026-12-07', concepto: 'Villa Phuket (07/12 → 09/12)', categoria: 'Alojamiento', moneda: 'EUR', importe: 98, notas: '49 €/noche' }
  ];

  /* ----------------------------------------------------------
     PLAN DEL VIAJE (versión 2, 24 nov – 9 dic 2026)
     Fuente de verdad del Itinerario. Va fijo en el código (no en
     localStorage) para que los 7 veáis siempre la última versión.
     Textos del grupo tal cual. Enlaces copiados exactamente.
     Formato de cada entrada de una franja:
       'texto'                       párrafo (las URL se convierten en enlace)
       { h: 'Previa' }               subtítulo dentro de la franja
       { n, p, x, foto, desc, l }    sitio: nombre, precio, texto extra,
                                     foto + descripción, enlaces [[etiqueta, url]]
       { foto, desc, alt }           solo foto + descripción, para un sitio que
                                     sale nombrado en el párrafo de encima
     ---------------------------------------------------------- */
  const PLAN_RESUMEN = {
    personas: 7,
    reparto: [
      ['24 nov', 'Ida Madrid → Bangkok'],
      ['25–28 nov', 'Bangkok (el 27, excursión a Ayutthaya)'],
      ['29 nov–2 dic', 'Chiang Mai (el 30, excursión a Chiang Rai)'],
      ['3–4 dic', 'Krabi (Ao Nang y Railay)'],
      ['5–6 dic', 'Phi Phi'],
      ['7–8 dic', 'Phuket'],
      ['9 dic', 'Vuelta a casa desde Phuket']
    ]
  };

  const H_BKK = 'Prince Palace Bangkok';
  const H_CNX = 'Comfy Boutique House';
  const H_KBV = 'KG Private Pool Villas Soi 9';

  // Noche del 26, repetida el 27.
  const NOCHE_BKK = [
    { h: 'Previa' },
    { n: 'Revolución Cocktail BKK (latina)', l: [['Web', 'https://revolucion-bkk.com/']],
      foto: 'silom', desc: 'REVO: bar de cócteles con música latina y DJs en la calle Silom (dentro del Holiday Inn Silom), en Bang Rak; cada noche de la semana tiene un plan distinto.' },
    { n: 'Khao San Road, beber buckets', foto: 'khaoSan', desc: 'La calle mochilera de Bangkok, en el barrio de Banglamphu: bares, puestos de comida y música a todo volumen hasta tarde.' },
    { h: 'Fiesta' },
    { n: 'Havana Social BKK (latina)', l: [['Web', 'https://havanasocialbkk.com/']],
      foto: 'sukhumvit11', desc: 'Bar escondido de ambiente cubano de los años 40 en Sukhumvit Soi 11: se entra por una cabina de teléfono. Abre de 18:00 a 02:00 y piden ir arreglados (los chicos, sin pantalón corto, sin camiseta de tirantes y con zapato cerrado).' },
    { n: 'Beyond Project (latina; hacen fiestas, no es una discoteca en sí)', l: [['Web', 'https://beyondproject.co']],
      foto: 'fiestaBkk', desc: 'Organizan fiestas latinas con DJs internacionales en clubs y azoteas de Bangkok; el sitio cambia en cada fecha, así que hay que mirar en la web o en su Instagram dónde toca.' }
  ];

  const PLAN_DIAS = {
    '2026-11-24': { zona: 'Madrid → Bangkok', titulo: 'Ida', franjas: [] },

    '2026-11-25': {
      zona: 'Bangkok', titulo: 'Llegada a Bangkok (19:25) y Loy Krathong', hotel: H_BKK,
      franjas: [
        { f: 'Mañana', e: ['Beltrán acaba de terminar sus 47 km corriendo en el avión y los demás durmiendo o arrancándose la polla.'] },
        { f: 'Mediodía', e: ['Beltrán se ha hecho con el control del avión, estamos a punto de morir en Birmania.'] },
        { f: 'Tarde', e: [
          'Beltrán ha sido reducido a base de tranquilizantes, aterrizamos a las 19:25. Dejamos las cosas y vamos a hacer el Loy Krathong:',
          { n: 'Opción 1 (si estamos cansados): ICONSIAM', foto: 'iconsiam', desc: 'Centro comercial gigante a orillas del río Chao Phraya, frente al centro histórico.' },
          { n: 'Opción 2 (autenticidad, más tailandeses): Tha Maharaj / Wat Pho', foto: 'watPho', desc: 'Muelle de Tha Maharaj y templo de Wat Pho, en la orilla del río junto al Gran Palacio.' },
          { n: 'Opción 3 (más animada): Asiatique', foto: 'asiatique', desc: 'Antiguo muelle portuario reconvertido en mercado nocturno con noria, junto al río.' }
        ] },
        { f: 'Noche', e: ['Tras cenar y haber tirado el barquito de los cojones, toca decidir si matar el jet lag a base de alcohol o para casa los pussys.'] }
      ]
    },

    '2026-11-26': {
      zona: 'Bangkok', titulo: 'Bangkok monumental', hotel: H_BKK,
      franjas: [
        { f: 'Mañana', h: '08:30–14:00', e: [
          'IMPORTANTE: camiseta de manga corta (hombro tapado) + pantalón largo (rodilla tapada).',
          { n: 'Gran Palacio', p: '500 baht', foto: 'granPalacio', desc: 'Antigua residencia oficial de los reyes de Tailandia desde 1782, con pabellones y capillas cubiertos de oro.' },
          { n: 'Wat Phra Kaew (Buda Esmeralda)', p: 'gratis con el Gran Palacio', foto: 'watPhraKaew', desc: 'El templo más sagrado del país, dentro del Gran Palacio; guarda el Buda Esmeralda, tallado en jade.' },
          { n: 'Wat Pho (Buda Reclinado)', p: '200 baht', foto: 'watPho', desc: 'Templo famoso por su Buda reclinado dorado de 46 metros.' },
          '(ferry)',
          { n: 'Wat Arun', p: '200 baht', foto: 'watArun', desc: 'El «Templo del Amanecer», con una torre central decorada con porcelana china, en la otra orilla del Chao Phraya.' },
          'Ruta: https://maps.app.goo.gl/h9gyGeDbTPiyEA2z9'
        ] },
        { f: 'Comida', e: [
          'Supanniga Eating Room (Michelin, Tha Tien). Reserva confirmada a las 15:00.',
          { alt: 'Supanniga Eating Room', foto: 'thaTien', desc: 'Supanniga está en el muelle de Tha Tien, al lado de Wat Pho: cocina casera tailandesa de recetas de familia, con terraza que mira al río y a Wat Arun.' }
        ] },
        { f: 'Tarde', h: 'idea', e: [
          'Ir a Talat Noi (Chinatown antiguo) y luego a Chinatown moderno, picar algo e ir al hotel.',
          { n: 'Talat Noi (Chinatown antiguo)', foto: 'talatNoi', desc: 'Barrio histórico chino junto al río, con talleres antiguos, callejones estrechos y arte urbano.' },
          { n: 'Chinatown moderno', foto: 'yaowarat', desc: 'Yaowarat, la calle principal del barrio chino, con puestos de comida callejera y neones por la noche.' }
        ] },
        { f: 'Noche', e: ['IMPORTANTE: las discotecas normalmente van de 21:00 a 02:00.'].concat(NOCHE_BKK) }
      ]
    },

    '2026-11-27': {
      zona: 'Bangkok – Ayutthaya', titulo: 'Bangkok – Ayutthaya', hotel: H_BKK,
      franjas: [
        { f: 'Transporte a Ayutthaya', e: [
          { n: 'Tren', p: '20 baht', x: 'Tren lento.', l: [['Web oficial', 'https://dticket.railway.co.th/DTicketPublicWeb/home/Home']],
            foto: 'trenAyutthaya', desc: 'Tren de Bangkok a la estación de Ayutthaya, en 1,5–2 h. La estación queda al otro lado del río, frente a la isla de los templos: se cruza en una barca que sale justo enfrente.' },
          { n: 'Bus privado', p: '4.000 baht ida y vuelta, unos 100 € entre los 7', l: [['Web', 'https://bangkoktaxicab.com/bangkok-to-ayutthaya/']],
            foto: 'furgoneta', desc: 'Furgoneta con conductor para los 7, de puerta a puerta: algo más de 1 h por autopista hasta Ayutthaya, sin depender de horarios.' }
        ] },
        { f: 'Mañana', e: [
          'Alquilamos unas bicis o motos.',
          { n: 'Wat Yai Chai Mongkhon (enorme chedi)', p: '20 baht', foto: 'watYaiChaiMongkhon', desc: 'Templo con una gran chedi, construida para celebrar una victoria del rey Naresuan sobre Birmania.' },
          { n: 'Wat Phanan Choeng (buda de oro)', p: '20 baht', foto: 'watPhananChoeng', desc: 'Templo anterior a la fundación de Ayutthaya, con un gran Buda dorado sentado de 19 metros.' },
          { n: 'Wat Ratchaburana (prang de 1424)', p: '50 baht', foto: 'watRatchaburana', desc: 'Templo con una torre (prang) a la que se puede subir; sus criptas guardaban joyas reales.' },
          { n: 'Wat Mahathat (cabeza de Buda entre las raíces)', p: '50 baht', foto: 'watMahathat', desc: 'La imagen más famosa de Ayutthaya: una cabeza de Buda de piedra envuelta por las raíces de un árbol.' },
          { n: 'Wat Phra Ram (prang central)', p: '50 baht', foto: 'watPhraRam', desc: 'Ruinas de un templo real junto a un estanque, con su torre central todavía en pie.' },
          'Acabamos sobre las 12:30–13:00.'
        ] },
        { f: 'Comida', e: [
          { n: 'Sukunya Somtum', l: [['Ver', 'https://share.google/LueMnwCdCTSqJUWMt']],
            foto: 'somTam', desc: 'Local sencillo de som tam, la ensalada picante de papaya verde del noreste (Isan), que se machaca al momento en mortero con lima, chile y cacahuete.' },
          { n: 'Noodle Soup & Padthai', l: [['Ver', 'https://share.google/1rRIQpXA9rPqoP1KN']],
            foto: 'padThai', desc: 'Sitio de fideos: sopa de fideos y pad thai, el salteado de fideos de arroz con huevo, brotes de soja, cacahuete y lima.' },
          { n: 'Si queremos gozar fuerte: The Artisan', l: [['Web', 'https://theartisansayutthaya.com/en/index.php']],
            foto: 'chaoPhraya', desc: 'The Artisans, restaurante a orillas del río Chao Phraya, frente al templo Wat Tamle Thai: cocina tailandesa casera de recetas antiguas, hecha en fogón de leña y ollas de barro.' }
        ] },
        { f: 'Tarde', e: [
          { n: '6. Wat Phra Si Sanphet (antiguo templo real)', p: '50 baht', foto: 'watPhraSiSanphet', desc: 'El templo del antiguo palacio real, con tres grandes chedis que guardan las cenizas de tres reyes.' },
          { n: '7. Wat Lokayasutharam (Buda reclinado de 42 m)', p: 'gratis', foto: 'watLokayasutharam', desc: 'Un gran Buda reclinado al aire libre, sin techo, entre las ruinas del templo.' },
          { n: '8. Wat Chaiwatthanaram (puesta de sol obligatoria, pasadas las 17:00)', p: '50 baht', foto: 'watChaiwatthanaram', desc: 'Templo a orillas del río con una gran torre central rodeada de capillas menores.' },
          'Coste total de los monumentos: 290 THB/persona.',
          { n: 'Velada de Muay Thai (19:00)', l: [['Entradas', 'https://www.ticketmelon.com/raj/knockout-27nov26']],
            foto: 'rajadamnern', desc: 'La velada es en el estadio Rajadamnern, en Bangkok: el estadio de Muay Thai más antiguo del mundo (1945).' },
          'Ideas para cenar: Lao Dtom Lao (comida típica de Laos) / The Family.'
        ] },
        { f: 'Noche', e: [
          'A ver, habría que descansar, ¿no? Peeero... Previa y fiesta: las mismas opciones que el 26 (Revolución Cocktail BKK, Khao San Road, Havana Social BKK, Beyond Project).'
        ].concat(NOCHE_BKK) }
      ]
    },

    '2026-11-28': {
      zona: 'Bangkok', titulo: 'Último día en Bangkok', hotel: H_BKK,
      franjas: [
        { f: 'Mañana', e: [
          { n: 'Chatuchak Market (compras)', foto: 'chatuchak', desc: 'Uno de los mercados más grandes del mundo, con miles de puestos de ropa, artesanía y comida. Abre los fines de semana.' },
          { n: 'Platinum Fashion Mall + centralwOrld + MBK (centros comerciales)', foto: 'platinum', desc: 'Tres centros comerciales de la zona de Pratunam y Siam: ropa barata al por mayor en Platinum, grandes marcas en centralwOrld y un poco de todo en MBK.' },
          { n: 'Jim Thompson House (pasamos por ahí)', foto: 'jimThompson', desc: 'Casa-museo de madera de teca del empresario estadounidense que relanzó la seda tailandesa y desapareció en 1967.' },
          'Dejamos las compras en casa.'
        ] },
        { f: 'Comida', e: [] },
        { f: 'Tarde', e: [
          { n: 'Akara Sky (Hanuman Sky Bar)', l: [['Reservar', 'https://akaraskyhanuman.com/order']],
            foto: 'oneCityCentre', desc: 'Mirador, bar y mercado nocturno en las plantas 58 a 61 del rascacielos One City Centre, en Phloen Chit; el bar abre de 17:00 a 02:00.' },
          { n: 'Tichuca Rooftop Bar', l: [['Reservar', 'https://www.tichuca.co/res']],
            foto: 'skylineSukhumvit', desc: 'Azotea en el piso 46 del edificio T-One (Sukhumvit Soi 40), famosa por su árbol de luces que cambia de color, con vistas a los rascacielos de Sukhumvit.' },
          { n: 'Octave Rooftop Lounge & Bar', l: [['Ver', 'https://www.marriott.com/es/dining/restaurant-bar/bkkms-bangkok-marriott-hotel-sukhumvit/5428678-octave-rooftop-lounge-bar.mi']],
            foto: 'octave', desc: 'Azotea de tres pisos en lo alto del Bangkok Marriott Sukhumvit (Soi 57, Thong Lo), con vistas de 360° de la ciudad; la foto está hecha desde allí.' }
        ] },
        { f: 'Noche', e: ['Última noche en Bangkok :( Habrá que matarse como se merece.'] }
      ]
    },

    '2026-11-29': {
      zona: 'Chiang Mai', titulo: 'Vuelo a Chiang Mai y primera toma de contacto', hotel: H_CNX,
      franjas: [
        { f: 'Mañana', e: [
          'Vuelo DMK → CNX (FD3416) de 08:25 a 09:40 (+ maleta facturada de 25 kg, 32 €). Sobre las 11:00 estaremos disponibles con el check-in hecho.',
          { n: 'Wat Chiang Man (chedi de 1296)', p: 'gratis', foto: 'watChiangMan', desc: 'El templo más antiguo de Chiang Mai, fundado en 1296 por el rey Mengrai al construir la ciudad.' },
          { n: 'Wat Phra Singh (peazo buda)', p: 'gratis', foto: 'watPhraSingh', desc: 'Templo principal de Chiang Mai, con una de las imágenes de Buda más veneradas del norte.' },
          { n: 'Wat Phan Tao (madera de teca)', p: 'gratis', foto: 'watPhanTao', desc: 'Pequeño templo hecho entero de madera de teca, antiguo pabellón real.' },
          { n: 'Wat Chedi Luang (súper chedi)', p: '50 baht', foto: 'watChediLuang', desc: 'Templo con una gran chedi en ruinas del siglo XIV que fue el edificio más alto de Chiang Mai.' },
          'Ruta completa del día: https://maps.app.goo.gl/SxTY2nh6g4TQtYJR6'
        ] },
        { f: 'Comida', e: [
          'Reserva a las 14:00 en Baan Landai — https://www.baan-landai.com/en/old-town/menu/',
          { alt: 'Baan Landai', foto: 'lannaComida', desc: 'Baan Landai, en el casco antiguo: cocina tailandesa y del norte (Lanna). En la foto, entrantes típicos del norte: nam prik noom (salsa de chile verde asado), salchicha sai ua y corteza de cerdo.' }
        ] },
        { f: 'Tarde', e: ['Después de comer no hay nada programado; podemos descansar en la casa con unas birras o...'] },
        { f: 'Noche', e: [
          { n: '(Solo los domingos) Sunday Walking Street, a tope de 18:00 a 23:00', foto: 'sundayWalkingStreet', desc: 'Mercado peatonal que ocupa la calle principal del casco antiguo los domingos por la tarde.' },
          'Por la noche, fiesta en Zoe in Yellow.',
          { alt: 'Zoe in Yellow', foto: 'baresChiangMai', desc: 'Zoe in Yellow es un patio de bares al aire libre junto a la calle Ratvithi, en el casco antiguo: mochileros, música alta y ambiente hasta tarde.' }
        ] }
      ]
    },

    '2026-11-30': {
      zona: 'Chiang Rai', titulo: 'Excursión a Chiang Rai', hotel: H_CNX,
      franjas: [
        { f: 'Mañana', e: [
          'Chiang Mai (sobre las 06:00) → Chiang Rai (sobre las 09:30) con el goat: https://sunnychiangrai.com/',
          { n: 'Wat Rong Khun (Templo Blanco)', p: '200 baht', x: '1–1,5 h', foto: 'watRongKhun', desc: 'Templo contemporáneo blanco cubierto de espejos y esculturas simbólicas, obra del artista Chalermchai Kositpipat.' },
          { n: 'Wat Rong Suea Ten (Templo Azul)', p: 'gratis', x: '30 min–1 h', foto: 'watRongSueaTen', desc: 'Templo de un azul cobalto intenso con detalles dorados.' },
          { n: 'Wat Huay Pla Kang (conjunto de cosas)', p: 'gratis', x: '1 h', foto: 'watHuayPlaKang', desc: 'Conjunto con una enorme estatua blanca de la diosa Guanyin y una pagoda de nueve pisos.' }
        ] },
        { f: 'Mediodía', e: ['Como el Templo Azul está cerca de Chiang Rai ciudad, comemos por allí, que hemos madrugado.'] },
        { f: 'Tarde', e: [
          { n: 'Baan Dam (Casa Negra)', p: '80 baht', x: '1 h', foto: 'baanDam', desc: 'Museo al aire libre con casas oscuras llenas de cuernos y pieles, obra del artista Thawan Duchanee.' },
          { n: 'Si nos da tiempo y ganas, volver al centro: Wat Phra Kaew / Wat Phra Singh / Clock Tower', foto: 'chiangRaiClockTower', desc: 'La torre del reloj dorada del centro de Chiang Rai, del mismo artista que el Templo Blanco.' },
          '¿Cenar ahí o volver a Chiang Mai?'
        ] },
        { f: 'Noche', h: 'opciones', e: [
          { n: 'Relax con Muay Thai en el Loi Kroh Stadium', p: '500 THB', x: 'Mirarlo antes, porque algunos días no hay.', foto: 'muayThai', desc: 'Combates de boxeo tailandés en un estadio pequeño del centro de Chiang Mai.' },
          { n: 'Nimman Road', x: 'Bares con música en directo, cervezas y street food.',
            foto: 'oneNimman', desc: 'Nimmanhaemin, el barrio moderno de Chiang Mai junto a la universidad: cafés, bares y tiendas alrededor del centro One Nimman (en la foto).' },
          { n: 'Cena: Huen Muan Jai (Michelin, cerca de casa, comida típica nortailandesa)', l: [['Guía Michelin', 'https://guide.michelin.com/es/es/chiang-mai-region/chiang-mai/restaurante/huen-muan-jai']],
            foto: 'khaoSoi', desc: 'Casa de comida del norte en una casa de madera; buen sitio para probar el khao soi (en la foto), la sopa de fideos al curry con leche de coco típica de Chiang Mai.' }
        ] }
      ]
    },

    '2026-12-01': {
      zona: 'Chiang Mai', titulo: 'Naturaleza con FUCKING ELEFANTES.', hotel: H_CNX,
      franjas: [
        { f: 'Mañana', e: [
          { n: 'Elephant Jungle Sanctuary', p: '2.500–3.500 THB', x: 'Todo el día con los elefantes.', foto: 'elephantSanctuary', desc: 'Santuario en la jungla donde se pasa el día con elefantes: darles de comer, bañarlos y pasear con ellos.' },
          'Opción 1: https://booking.com/attr-lZQLYEDdXo (elefantes + bamboo rafting + Sticky) = 44,23 €'
        ] },
        { f: 'Comida', e: ['En el santuario de elefantes.'] },
        { f: 'Tarde', e: ['En teoría nos dejan a las 17:00 en la casa, así que podemos hacer...'] },
        { f: 'Noche', h: 'opciones', e: ['Las mismas que el 30 nov (Muay Thai en Loi Kroh, Nimman Road, cena en Huen Muan Jai).'] }
      ]
    },

    '2026-12-02': {
      zona: 'Chiang Mai', titulo: 'Chiang Mai clásico', hotel: H_CNX,
      franjas: [
        { f: 'Mañana', e: [
          'Mañana chill, dos templos en la jungla, cogemos Grab a todos lados: Doi Suthep y Wat Pha Lat. Volvemos a Chiang Mai.',
          { n: 'Doi Suthep', foto: 'doiSuthep', desc: 'Wat Phra That Doi Suthep, templo dorado en lo alto de la montaña, con vistas a todo Chiang Mai.' },
          { n: 'Wat Pha Lat', foto: 'watPhaLat', desc: 'Pequeño templo escondido en el bosque, junto a una cascada, en la ladera de Doi Suthep.' }
        ] },
        { f: 'Comida', e: ['(Pendiente: buscar sitio guapo para comer)'] },
        { f: 'Tarde', h: 'freestyle', e: [
          { n: 'Hacerse un anillo de plata personalizado', l: [['Instagram', 'https://www.instagram.com/jaigayastudio?utm_source=qr&igsh=MW53M3k4YW4yOGVkMw%3D%3D']],
            foto: 'plataChiangMai', desc: 'Taller para diseñar y hacerte tu propio anillo de plata. Chiang Mai es ciudad de plateros: en la foto, los relieves de plata del templo Wat Sri Suphan, en la calle de la plata (Wua Lai).' },
          { n: 'Chiang Mai X-Centre (actividades extremas)', l: [['Web', 'https://www.chiangmaixcentre.com/']],
            foto: 'puenting', desc: 'Parque de aventura a las afueras de Chiang Mai: puenting sobre un lago, buggies por el barro, paintball y zorbing.' },
          'Montaña rusa por la selva.',
          'Perdernos por Nimman.'
        ] },
        { f: 'Noche', e: ['Cena relajada y preparación para el salto al sur. Cena: Huen Muan Jai.'] }
      ]
    },

    '2026-12-03': {
      zona: 'Krabi (Ao Nang)', titulo: 'Vuelo al sur y llegada a Krabi', hotel: H_KBV,
      franjas: [
        { f: 'Mañana', e: ['Vuelo CNX → KBV de 07:55 a 09:55 (+ maleta extra, 35 €). Pendiente: buscar el transfer del aeropuerto a la casa.'] },
        { f: 'Mediodía', e: [
          'Playa de Ao Nang y comer por la zona. O hacer alguna actividad extrema o unas clases de cocina tailandesa. Meter la ruta de las 4 islas o algo así.',
          { n: 'Playa de Ao Nang', foto: 'aoNang', desc: 'La playa principal de Ao Nang, con los acantilados de piedra caliza de la costa de Krabi al fondo.' }
        ] },
        { f: 'Tarde', e: [
          'Ao Nang Beach → Monkey Trail (https://rubenwanderlust.com/ao-nang-beach-monkey-trail-pai-plong-beach/) → Pai Plong Beach → Pai Plong Pier.',
          { alt: 'Monkey Trail', foto: 'monosAoNang', desc: 'El Monkey Trail es una pasarela de madera pegada a la roca que une el final de la playa de Ao Nang con la cala de Pai Plong. Está llena de monos: nada de comida ni bolsas a la vista.' }
        ] },
        { f: 'Noche', e: [
          'A casa a apañarnos, cenar y pasear por el Ao Nang Landmark Night Market. Después de cenar, combates de Muay Thai y/o salir de fiesta.',
          { alt: 'Ao Nang Landmark Night Market', foto: 'mercadoAoNang', desc: 'El Ao Nang Landmark Night Market está en la avenida principal, cerca de la playa: puestos de comida callejera, batidos de fruta, ropa y recuerdos, con mesas para cenar allí mismo. En la foto, un puesto de fruta de un mercado de Ao Nang.' }
        ] },
        { f: 'Pendiente', e: ['Investigar si se puede hacer este día el tour de las 4 islas y que nos deje en Railay para hacerla por la tarde; así ganamos un día en Tailandia.'] }
      ]
    },

    '2026-12-04': {
      zona: 'Krabi (Railay)', titulo: 'Railay y Phra Nang', hotel: H_KBV,
      franjas: [
        { f: 'Mañana', e: [
          'IMPORTANTE: efectivo, llevar las crocs porque va a ser playita, y a lo mejor toalla.',
          'Ir al Ao Nang Longtail Boat Service Club para coger un bote hacia Railay West. Railay West → Railay Walking Street → Railay East → Phra Nang Beach → Princess Cave.',
          { n: 'Railay', foto: 'railay', desc: 'Península entre acantilados de piedra caliza a la que solo se llega en barca; Railay West es su playa principal.' },
          { n: 'Phra Nang Beach y Princess Cave', foto: 'phraNangCave', desc: 'Playa bajo los acantilados con una cueva dedicada a una princesa del mar, llena de ofrendas de los pescadores.' }
        ] },
        { f: 'Mediodía', e: [] },
        { f: 'Tarde', e: ['Después de comer poco se puede hacer: o escalar o rascarnos las bolas en la playa. Es obligatorio ver el atardecer en Railay West Beach. Vuelta no más tarde de las 18:30 para no liarla.'] },
        { f: 'Noche', e: ['Ya en Ao Nang: ducha, cena y lo mismo que ayer, Muay Thai o fiestecilla.'] }
      ]
    },

    '2026-12-09': {
      zona: 'Phuket', titulo: 'Último día y vuelo de vuelta',
      nota: 'A casa. Buena suerte, amigos...',
      franjas: []
    }
  };

  // Días SIN itinerario: solo logística fija + opciones que valen para
  // cualquiera de los días del destino (no se reparten por día ni franja).
  // Opción: { n, p (precio), pro, contra, x (texto extra), l: [[etiqueta, url]], foto, desc }
  const PLAN_GRUPOS = [
    {
      id: 'phiphi', dias: ['2026-12-05', '2026-12-06'],
      zona: 'Islas Phi Phi', hotel: 'Phi Phi Maiyada Resort (noches del 5 y del 6)',
      logistica: [
        'Sábado 5, mañana: levantarse prontito y coger el ferry/speedboat de Ao Nang a Phi Phi sobre las 08:00. Llegada a las 10:00, check-in y vuelta rápida por el centro para comer.',
        'Si vamos a Maya Bay, hay que madrugar MUCHO.'
      ],
      secciones: [
        { titulo: 'Opciones', opciones: [
          { n: 'Longtail privado a Phi Phi Leh', p: '2.500–3.500 THB por barca (hasta 6 personas) + 400 THB de parque por persona',
            pro: 'a vuestro ritmo, en Maya a las 7:00', contra: 'en Maya no se puede nadar',
            l: [['Reservar', 'https://www.travelocity.com/things-to-do/koh-phi-phi-maya-bay-private-longtail-boat-tour.a50292964.activity-details'], ['Fuente', 'https://www.visitthailandtoday.com/guides/things-to-do-in-koh-phi-phi']],
            foto: 'mayaBay', desc: 'Maya Bay, en Koh Phi Phi Leh: la bahía de la película «La Playa», cerrada por acantilados de piedra caliza.' },
          { n: 'Circuito compartido de medio día', p: 'desde 750 THB + parque',
            pro: 'barato', contra: 'horarios fijos y más gente',
            l: [['Reservar', 'https://www.expedia.co.th/things-to-do/a.a51767832.activity-details']],
            foto: 'pilehLagoon', desc: 'La laguna de Pi Leh, en Phi Phi Leh: agua turquesa encerrada entre paredes de roca, parada fija de los circuitos junto con Maya Bay y Viking Cave.' },
          { n: 'Atardecer + plancton en longtail', p: '800 THB', x: 'Salida a las 14:00 desde el muelle de Tonsai.',
            pro: 'atardecer y plancton, cerca de luna nueva', contra: 'pasas por Maya en hora punta',
            l: [['Reservar', 'https://www.expedia.co.th/things-to-do/phi-phi-islands-sunset-tour-from-phi-phi-by-longtail-boat.a665328.activity-details']],
            foto: 'tonsaiBay', desc: 'Salida en longtail desde la bahía de Tonsai: vuelta por las calas de las islas, atardecer en el mar y, ya de noche, baño entre plancton que brilla al moverte.' },
          { n: 'Mirador de Phi Phi (miradores 1 y 2)', p: '50 THB',
            pro: 'la foto icónica', contra: '30–45 min de subida, lleno al atardecer',
            l: [['Guía', 'https://www.thaiholidayguide.com/attraction/phi-phi-viewpoint/']],
            foto: 'kohPhiPhiDon', desc: 'Vista desde lo alto de Koh Phi Phi Don: las bahías de Tonsai y Loh Dalum unidas por una franja de arena.' },
          { n: 'Bamboo Island', p: '~800 THB',
            pro: 'playa blanca y snorkel', contra: 'se solapa con Phi Phi Leh; mejor contratarlo en Tonsai',
            x: 'Sin enlace fiable.',
            foto: 'bambooIsland', desc: 'Koh Mai Phai, islote plano de arena blanca al norte de Phi Phi Don, rodeado de arrecife.' },
          { n: 'Fiesta en Loh Dalum', p: 'gratis (pagas las bebidas)',
            pro: 'ambiente', contra: 'casos de bebidas adulteradas en los buckets',
            l: [['Guía de timos', 'https://tabiji.ai/scams/koh-phi-phi/']],
            foto: 'lohDalum', desc: 'La playa de Loh Dalum, al otro lado del istmo de Tonsai: de día, agua tranquila y poco profunda; de noche, bares en la arena con espectáculos de fuego y buckets.' }
        ] }
      ],
      ideas: [
        'Paseo: Tonsai Pier → Tonsai Village → Phi Phi Walking Street → Loh Dalum → interior de la isla.',
        'Long Beach.',
        'Ver el atardecer desde el mirador o en la playa de Loh Dalum.',
        'Paradas típicas del tour por la isla (buscar tour): Loh Samah Bay, Maya Bay, Pi Leh Lagoon, Viking Cave, Monkey Beach, Bamboo Island.',
        'Noches: cenita y fiesta.'
      ]
    },
    {
      id: 'phuket', dias: ['2026-12-07', '2026-12-08'],
      zona: 'Phuket', hotel: 'Nariya Bayfront Phuket (noches del 7 y del 8)',
      logistica: [
        { n: 'Lunes 7, traslado: ferry de Phi Phi a Phuket', p: '500–700 THB', x: 'Unas 2 h.',
          l: [['Horarios', 'https://www.visitthailandtoday.com/guides/phi-phi-to-phuket'], ['Reservar', 'https://www.directferries.ie/koh_phi_phi_phuket_ferry.htm']],
          foto: 'ferryPhuket', desc: 'Ferris grandes entre el muelle de Tonsai (Phi Phi) y el de Rassada (Phuket), con cubierta al aire libre y sala con aire acondicionado.' },
        'Idea inicial, sin cerrar: Phang Nga Bay + James Bond el 7 y la ruta por el sur de la isla el 8.'
      ],
      secciones: [
        { titulo: 'Opciones: barco desde Phuket', opciones: [
          { n: 'Phang Nga / James Bond en lancha', p: '1.400 THB + 300 THB de parque',
            pro: 'el clásico, con canoa', contra: 'James Bond Island está llena a media mañana',
            l: [['Reservar', 'https://www.expedia.com.au/things-to-do/james-bond-islands-trip.a1275680.activity-details'], ['Fuente', 'https://traveltriangle.com/thailand-tourism/phuket/places-to-visit/james-bond-island/entry-fees']],
            foto: 'khaoPhingKan', desc: 'Koh Tapu, el peñasco de piedra caliza de la bahía de Phang Nga que salió en «El hombre de la pistola de oro».' },
          { n: 'Phang Nga early bird', p: 'precio según operador',
            pro: 'llegas antes que la masa y tienes la tarde libre', contra: 'recogida en la bahía de Chalong a las 5:15–5:30',
            l: [['Reservar', 'https://mythailandtours.com/?p=120542']],
            foto: 'amanecerPhangNga', desc: 'Amanecer en la bahía de Phang Nga: saliendo tan pronto se llega a las islas y las cuevas antes que las lanchas de media mañana.' },
          { n: 'Catamarán desde el muelle de Chalong', p: 'precio en la web',
            pro: 'muelle al lado del hotel, comida a bordo y krathong', contra: 'vuelves de noche',
            l: [['Reservar', 'https://www.thaiholidayguide.com/tour/phuket-james-bond-island-phang-nga-bay-sunset-luxury-yacht/']],
            foto: 'chalongPier', desc: 'El muelle de Chalong, en la bahía del mismo nombre al sur de Phuket, de donde salen casi todas las excursiones en barco; queda al lado del hotel.' },
          { n: 'Hong by Starlight', p: 'desde 3.950 THB',
            pro: 'cuevas sin gente, krathong, plancton y cena', contra: 'caro; quizá no bajas en James Bond Island',
            l: [['Reservar', 'https://thaiholidayguide.com/tours/john-grays-hong-by-starlight-with-sea-cave-kayaking-loy-krathong-from-phuket'], ['En español', 'https://www.travelocity.com/es/things-to-do/tour-john-grays-hong-por-starlight-con-practica-de-kayak-en-el-mar-y-loy-krathong-flotantes.a446676.detalles-actividades'], ['Fuente', 'https://platform.magpie.travel/things-to-do/hong-by-starlight-sea-cave-kayaking-and-loy-krathong-floating/1553c6a8-6d0b-4903-ac2d-76a2f4f00f86']],
            foto: 'phangNgaBay', desc: 'Islas de piedra caliza de la bahía de Phang Nga, con lagunas interiores («hongs») a las que se entra en kayak por cuevas.' },
          { n: 'Racha + Coral Island', p: '1.300 THB por adulto',
            pro: 'sale de Chalong, al lado del hotel', contra: 'repetitivo si ya hicisteis snorkel en Phi Phi',
            l: [['Opciones', 'https://www.tisland.travel/en/phuket/excursions/racha-island'], ['Reservar', 'https://www.click2gothailand.com/tours/00244']],
            foto: 'rachaYai', desc: 'Koh Racha Yai, al sur de Phuket: bahías de arena blanca y agua muy clara para snorkel. Coral Island queda de camino, más cerca de la costa.' },
          { n: 'Islas Khai', p: 'medio día desde 800 THB',
            pro: 'barato y corto', contra: 'islas pequeñas y llenas',
            l: [['Guía', 'https://travelguidestip.com/best-day-trips-phuket/']],
            foto: 'khaiNok', desc: 'Koh Khai Nok, islote de roca con una playa pequeña entre Phuket y Phang Nga, a unos 20–30 min en lancha; hay peces de colores en la misma orilla.' },
          { n: 'Similan', p: 'unos 2.900–3.900 THB desde Phuket',
            pro: 'el mejor snorkel', contra: 'un día durísimo de 12 h desde Phuket, y los fines de semana de diciembre se agotan',
            l: [['Guía', 'https://asterofasia.com/blog/similan-islands-how-to-get-there-prices-2026'], ['Reservar', 'https://thailand-divers.com/similan-islands-snorkeling']],
            foto: 'similan', desc: 'Parque nacional de islas de granito en el mar de Andamán, a más de 60 km de la costa: rocas gigantes, arena blanca y el agua más transparente de la zona.' }
        ] },
        { titulo: 'Opciones: Phuket de día', opciones: [
          { n: 'Big Buddha, Wat Chalong, miradores, Promthep y playas', p: 'gratis',
            x: 'Ruta propuesta (horario orientativo): 08:30 Big Buddha → 10:00 Wat Chalong → 11:30 Karon Viewpoint → 12:00 Kata / Kata Noi → 13:30 comida → 15:00 Nai Harn → 16:00 Ya Nui → 16:30 Windmill Viewpoint → 17:30 Promthep Cape → 19:00 cena → 20:30 Patong / mercado / beach club',
            l: [['Big Buddha', 'https://windowonphuket.com/?p=7357'], ['Promthep', 'https://phuketexpatguide.com/blog/promthep-cape-phuket/']],
            foto: 'bigBuddhaPhuket', desc: 'El Big Buddha de Phuket, de mármol blanco y 45 m, en lo alto de una colina con vistas a la bahía de Chalong.' },
          { n: 'Tirolina en Hanuman World', p: '1.780 THB (10 plataformas)',
            pro: 'adrenalina en la selva', contra: 'lejos del sur',
            l: [['Reservar', 'https://www.travelocity.com/es/things-to-do/phuket-aventura-en-tirolina-por-el-mundo-de-hanuman.a44641592.detalles-actividades'], ['Fuente', 'https://www.expedia.co.th/things-to-do/a.a3629332.activity-details']],
            foto: 'tirolina', desc: 'Circuito de tirolinas, puentes colgantes y rapeles por encima de los árboles de la selva, en las colinas de Kathu, en el centro de la isla.' },
          { n: 'Masaje tailandés', p: '200–280 THB la hora en Rawai / Nai Harn',
            pro: 'barato y cerca del hotel', contra: 'en Bangla Road son caros y te presionan para añadir extras',
            l: [['Guía', 'https://phuketexpatguide.pages.dev/blog/phuket-thai-massage-guide/'], ['Guía', 'https://phuketexpatguide.pages.dev/blog/phuket-spas-massage-guide/']],
            foto: 'masaje', desc: 'Masaje tradicional tailandés: sin aceite y vestido, a base de presión y estiramientos. Una hora sienta de lujo después de un día de barco.' }
        ] },
        { titulo: 'Opciones: noches', opciones: [
          { n: 'Sunday Walking Street (Old Town)', p: 'gratis', x: 'Domingos de 16:00 a 22:00.',
            pro: 'el mejor mercado nocturno',
            l: [['Guía', 'https://www.visitthailandtoday.com/guides/phuket-night-markets']],
            foto: 'phuketOldTown', desc: 'El casco antiguo de Phuket, con casas chino-portuguesas de colores; los domingos su calle principal se llena de puestos.' },
          { n: 'Naka Weekend Market', p: 'gratis', x: 'Sábados y domingos de 16:00 a 22:00.',
            pro: 'el más grande de la isla',
            l: [['Guía', 'https://www.visitthailandtoday.com/guides/phuket-night-markets']],
            foto: 'naka', desc: 'El mercado de fin de semana de Phuket Town: ropa, comida callejera y un escenario con música en directo.' },
          { n: 'Karon Temple Market', p: 'gratis', x: 'Martes y viernes de 16:00 a 22:00.',
            pro: 'os encaja el día 8',
            l: [['Guía', 'https://www.visitthailandtoday.com/guides/phuket-night-markets'], ['Guía', 'https://klook.com/en-AU/blog/phuket-markets']],
            foto: 'watKaron', desc: 'Mercado montado en el recinto del templo de Karon (en la foto), a un paso de la playa: puestos de comida, ropa y recuerdos.' },
          { n: 'Rawai Seafood Market', p: 'el marisco más unos 100 baht por kilo por cocinarlo',
            x: 'Los locales cierran sobre las 21:00.',
            pro: 'cerca del hotel', contra: 'hay que regatear',
            l: [['Info', 'https://phuket-insider.com/en/places/rawai-seafood-market/']],
            foto: 'rawai', desc: 'En la playa de Rawai, junto a los barcos de pescadores: compras el marisco al peso en los puestos y uno de los restaurantes de enfrente te lo cocina.' },
          { n: 'Muay Thai (Bangla Boxing)', p: 'grada 1.500–1.600 THB, ringside VIP 1.900–2.000 THB',
            x: 'Primer combate a las 21:00.',
            pro: 'ambiente auténtico',
            l: [['Info', 'https://www.thaiholidayguide.com/attraction/bangla-boxing-stadium/'], ['Entradas', 'https://www.expedia.co.th/things-to-do/a.a46012818.activity-details']],
            foto: 'bangla', desc: 'Estadio de Muay Thai en Patong, junto a Bangla Road.' },
          { n: 'Simon Cabaret', p: '800 THB normal / 1.000 THB VIP',
            pro: 'muy vistoso', contra: 'algunas reseñas critican el playback',
            l: [['Entradas', 'https://www.expedia.co.th/things-to-do/a.a2270119.activity-details']],
            foto: 'simonCabaret', desc: 'Cabaret de ladyboys en Patong, con vestuario de plumas y números de baile. Dentro no se pueden hacer fotos; al acabar, las artistas posan en la puerta (se deja propina).' },
          { n: 'Phuket FantaSea', p: '1.800 THB, o 2.200 con cena', x: 'Abre martes, viernes y domingos.',
            contra: 'está en Kamala, lejos del hotel, y el espectáculo incluye elefantes',
            l: [['Info', 'https://phuket-insider.com/en/places/phuket-fantasea'], ['Entradas', 'https://www.headout.com/phuket-fantasea-tickets/tickets-to-phuket-fantasea-with-round-trip-shared-transfers-and-optional-dinner-e-21392']],
            foto: 'fantasea', desc: 'Parque temático nocturno en Kamala: un pueblo lleno de luces, tiendas y bufé, y un gran espectáculo sobre la cultura tailandesa.' }
        ] }
      ],
      ideas: []
    }
  ];
  const grupoDe = d => PLAN_GRUPOS.find(g => g.dias.includes(d)) || null;

  function seedState() {
    const s = blankState();
    s.meta = Object.assign({}, META_SEED);
    s.vuelos = JSON.parse(JSON.stringify(VUELOS_SEED));
    s.alojamientos = JSON.parse(JSON.stringify(ALOJ_SEED));
    s.gastos = JSON.parse(JSON.stringify(GASTOS_SEED));
    s.seedV = SEED_V;
    s.equipaje = JSON.parse(JSON.stringify(EQUIPAJE_SEED));
    s.antesDeViajar = JSON.parse(JSON.stringify(ANTES_SEED));
    return s;
  }

  // Compatibilidad: vuelos antiguos de un solo tramo -> estructura con tramos[].
  function migrateVuelo(v) {
    if (v && Array.isArray(v.tramos)) {
      if (v.equipaje == null) v.equipaje = '';
      if (v.antelacion == null) v.antelacion = '';
      return v;
    }
    v = v || {};
    return {
      id: v.id || uid(),
      tipo: v.tipo || 'Ida',
      reserva: v.reserva || '',
      antelacion: v.antelacion || '',
      equipaje: v.equipaje || '',
      notas: v.notas || '',
      tramos: [{
        aerolinea: v.aerolinea || '', numero: v.numero || '', clase: '', operadoPor: '',
        origen: v.origen || '', origenNombre: '', origenTerminal: '',
        destino: v.destino || '', destinoNombre: '', destinoTerminal: '',
        salida: v.salida || '', llegada: v.llegada || '', duracion: ''
      }]
    };
  }

  // Añade a una lista de equipaje ya guardada los ítems nuevos del seed que
  // falten (por id), sin tocar los existentes ni su estado 'packed'.
  function mergeEquipajeSeed(existing) {
    const list = Array.isArray(existing) ? existing.slice() : [];
    const ids = new Set(list.map(i => i.id));
    EQUIPAJE_SEED.forEach(item => {
      if (!ids.has(item.id)) list.push(JSON.parse(JSON.stringify(item)));
    });
    return list;
  }

  // Versión de los datos precargados. Al subirla, migrarSeeds aplica una
  // sola vez, en orden, los pasos que le falten a lo que cada móvil ya tenía
  // guardado.
  const SEED_V = 8;

  function migrarSeeds(s) {
    if (s.seedV >= SEED_V) return s;
    if (s.seedV < 2) aplicarPlanV2(s);
    if (s.seedV < 3) aplicarPinKrabi(s);
    if (s.seedV < 4) aplicarHorariosQatar(s);
    if (s.seedV < 5) aplicarAntelacionVuelta(s);
    if (s.seedV < 6) aplicarEquipajeQatar(s);
    if (s.seedV < 7) aplicarVuelosAirAsia(s);
    if (s.seedV < 8) aplicarFD3416(s);
    s.seedV = SEED_V;
    setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }, 0);
    return s;
  }

  // v2: el Itinerario sale de PLAN_DIAS/PLAN_GRUPOS, así que se quitan los
  // lugares, excursiones y comidas precargados antes (ids seed-lg/ex/cm), se
  // ponen los alojamientos del plan (conservando el localizador si alguien lo
  // apuntó) y se añaden los vuelos internos y los gastos del plan. Lo que
  // haya añadido cada uno y su diario no se tocan.
  function aplicarPlanV2(s) {
    const clon = x => JSON.parse(JSON.stringify(x));
    const viejo = x => /^seed-(lg|ex|cm)-/.test(x.id || '');
    s.lugares = s.lugares.filter(x => !viejo(x));
    s.excursiones = s.excursiones.filter(x => !viejo(x));
    s.comidas = s.comidas.filter(x => !viejo(x));
    ALOJ_SEED.forEach(n => {
      const i = s.alojamientos.findIndex(a => a.id === n.id);
      const nuevo = clon(n);
      if (i >= 0) { nuevo.reserva = s.alojamientos[i].reserva || ''; s.alojamientos[i] = nuevo; }
      else s.alojamientos.push(nuevo);
    });
    VUELOS_SEED.forEach(v => { if (!s.vuelos.some(x => x.id === v.id)) s.vuelos.push(clon(v)); });
    GASTOS_SEED.forEach(g => { if (!s.gastos.some(x => x.id === g.id)) s.gastos.push(clon(g)); });
  }

  // v3: pin exacto de la villa de Krabi (y su nota sin el aviso de «pin
  // aproximado»); el resto de lo que haya editado cada uno no se toca.
  function aplicarPinKrabi(s) {
    const n = ALOJ_SEED.find(a => a.id === 'seed-al-krabi');
    const a = s.alojamientos.find(x => x.id === 'seed-al-krabi');
    if (a && n) {
      a.loc = JSON.parse(JSON.stringify(n.loc));
      if (/pin del mapa es aproximado/.test(a.notas || '')) a.notas = n.notas;
    }
  }

  // v8: el Bangkok → Chiang Mai pasa a ser el FD3416 (08:25 → 09:40). Se
  // cambia si su tramo sigue sin número de vuelo (como venía precargado);
  // la nota se cambia si sigue siendo una de las precargadas.
  function aplicarFD3416(s) {
    const v = s.vuelos.find(x => x.id === 'seed-vu-dmk-cnx');
    if (!v || !v.tramos || !v.tramos[0] || v.tramos[0].numero) return;
    const n = VUELOS_SEED.find(x => x.id === 'seed-vu-dmk-cnx').tramos[0];
    Object.assign(v.tramos[0], { numero: n.numero, salida: n.salida, llegada: n.llegada, duracion: n.duracion });
    if (!v.notas || /^Directo\./.test(v.notas)) v.notas = NOTA_DMK_CNX;
  }

  // v7: número de vuelo del Chiang Mai → Krabi (FD3072) y aviso de que el
  // Bangkok → Chiang Mai de las 08:10 no aparece a la venta. Solo se tocan
  // si siguen como venían precargados.
  function aplicarVuelosAirAsia(s) {
    const kbv = s.vuelos.find(x => x.id === 'seed-vu-cnx-kbv');
    if (kbv && kbv.tramos && kbv.tramos[0] && !kbv.tramos[0].numero) kbv.tramos[0].numero = 'FD3072';
    const cnx = s.vuelos.find(x => x.id === 'seed-vu-dmk-cnx');
    if (cnx && (cnx.notas === 'Directo.' || !cnx.notas)) cnx.notas = NOTA_DMK_CNX;
  }

  // v6: equipaje incluido en la ida y la vuelta con Qatar. Si alguien ya
  // había apuntado algo en ese campo, se añade debajo sin borrarlo.
  function aplicarEquipajeQatar(s) {
    ['seed-vu-ida', 'seed-vu-vuelta'].forEach(id => {
      const v = s.vuelos.find(x => x.id === id);
      if (!v || (v.equipaje || '').includes('25 × 37 × 50')) return;
      v.equipaje = v.equipaje ? v.equipaje + '\n\n' + EQUIPAJE_QATAR : EQUIPAJE_QATAR;
    });
  }

  // v5: en la vuelta basta con estar 2 h antes en el aeropuerto de Phuket.
  // Solo se cambia si seguía con las 3 h precargadas.
  function aplicarAntelacionVuelta(s) {
    const v = s.vuelos.find(x => x.id === 'seed-vu-vuelta');
    if (v && (v.antelacion === '3 h' || !v.antelacion)) v.antelacion = '2 h';
  }

  // v4: ida y vuelta con los horarios actuales de Qatar y las horas de la
  // escala en Doha. Se cambian tramos y notas; localizador, equipaje y
  // antelación que haya apuntado cada uno se conservan.
  function aplicarHorariosQatar(s) {
    ['seed-vu-ida', 'seed-vu-vuelta'].forEach(id => {
      const n = VUELOS_SEED.find(v => v.id === id);
      const v = s.vuelos.find(x => x.id === id);
      if (!n || !v) return;
      v.tramos = JSON.parse(JSON.stringify(n.tramos));
      v.notas = n.notas;
    });
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return seedState();
      const p = JSON.parse(raw);
      const b = blankState();
      return migrarSeeds({
        seedV: p.seedV || 0,
        meta: Object.assign(b.meta, p.meta || {}),
        vuelos: (p.vuelos || []).map(migrateVuelo).map(upgradeSeedVuelo),
        coches: p.coches || [],
        alojamientos: p.alojamientos || [],
        excursiones: p.excursiones || [],
        comidas: p.comidas || [],
        lugares: p.lugares || [],
        recomendaciones: p.recomendaciones || [],
        gastos: p.gastos || [],
        fx: Object.assign(blankFx(), p.fx || {}),
        meteo: Object.assign(blankMeteo(), p.meteo || {}),
        equipaje: p.equipaje !== undefined ? mergeEquipajeSeed(p.equipaje) : JSON.parse(JSON.stringify(EQUIPAJE_SEED)),
        diario: p.diario || {},
        antesDeViajar: p.antesDeViajar !== undefined ? p.antesDeViajar : JSON.parse(JSON.stringify(ANTES_SEED))
      });
    } catch (e) {
      console.warn('Estado ilegible, se reinicia.', e);
      return blankState();
    }
  }

  let state = load();
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) {
        toast('No se pudo guardar (almacenamiento lleno).');
      }
    }, 150);
  }

  const COL_OF  = { vuelo: 'vuelos', coche: 'coches', alojamiento: 'alojamientos', excursion: 'excursiones', comida: 'comidas', lugar: 'lugares', recomendacion: 'recomendaciones', gasto: 'gastos' };
  const KIND_OF = { vuelos: 'vuelo', coches: 'coche', alojamientos: 'alojamiento', excursiones: 'excursion', comidas: 'comida', lugares: 'lugar', recomendaciones: 'recomendacion', gastos: 'gasto' };

  /* ==========================================================
     Lugares conocidos de Tailandia (autocompletado + coordenadas)
     ========================================================== */
  const GAZ = [
    { n: 'Aeropuerto Suvarnabhumi (BKK)', lat: 13.6900, lng: 100.7501, min: 0 },
    { n: 'Aeropuerto Don Mueang (DMK)', lat: 13.9126, lng: 100.6068, min: 0 },
    { n: 'Gran Palacio (Bangkok)', lat: 13.7500, lng: 100.4913, min: 90 },
    { n: 'Wat Pho (Buda reclinado)', lat: 13.7465, lng: 100.4930, min: 60 },
    { n: 'Wat Arun', lat: 13.7437, lng: 100.4888, min: 45 },
    { n: 'Mercado de Chatuchak', lat: 13.7999, lng: 100.5501, min: 150 },
    { n: 'Mercado flotante Damnoen Saduak', lat: 13.5170, lng: 99.9576, min: 90 },
    { n: 'Khao San Road', lat: 13.7590, lng: 100.4977, min: 60 },
    { n: 'Chinatown (Yaowarat)', lat: 13.7404, lng: 100.5090, min: 90 },
    { n: 'Ayutthaya, parque histórico', lat: 14.3532, lng: 100.5689, min: 150 },
    { n: 'Kanchanaburi, puente sobre el río Kwai', lat: 14.0392, lng: 99.5028, min: 90 },
    { n: 'Cascadas de Erawan', lat: 14.3639, lng: 99.1436, min: 180 },
    { n: 'Chiang Mai, centro histórico', lat: 18.7883, lng: 98.9853, min: 150 },
    { n: 'Doi Suthep', lat: 18.8047, lng: 98.9217, min: 90 },
    { n: 'Mercado nocturno de Chiang Mai', lat: 18.7870, lng: 98.9930, min: 90 },
    { n: 'Pai', lat: 19.3585, lng: 98.4400, min: 240 },
    { n: 'Chiang Rai, Templo Blanco (Wat Rong Khun)', lat: 19.8355, lng: 99.7897, min: 60 },
    { n: 'Chiang Rai, Templo Azul (Wat Rong Suea Ten)', lat: 19.9310, lng: 99.8171, min: 45 },
    { n: 'Sukhothai, parque histórico', lat: 17.0072, lng: 99.7048, min: 150 },
    { n: 'Parque nacional de Khao Sok', lat: 8.9130, lng: 98.5290, min: 240 },
    { n: 'Phuket, Patong', lat: 7.8965, lng: 98.2965, min: 120 },
    { n: 'Phuket, casco antiguo', lat: 7.8850, lng: 98.3900, min: 90 },
    { n: 'James Bond Island (Phang Nga)', lat: 8.2800, lng: 98.5010, min: 180 },
    { n: 'Krabi, Ao Nang', lat: 8.0313, lng: 98.8228, min: 120 },
    { n: 'Railay Beach', lat: 8.0113, lng: 98.8372, min: 180 },
    { n: 'Koh Phi Phi', lat: 7.7407, lng: 98.7784, min: 240 },
    { n: 'Koh Lanta', lat: 7.6180, lng: 99.0570, min: 180 },
    { n: 'Koh Samui, Chaweng', lat: 9.5400, lng: 100.0620, min: 120 },
    { n: 'Koh Phangan', lat: 9.7500, lng: 100.0350, min: 180 },
    { n: 'Koh Tao', lat: 10.0956, lng: 99.8402, min: 180 },
    { n: 'Hua Hin', lat: 12.5684, lng: 99.9577, min: 120 }
  ];
  const GAZ_BY_NAME = k => GAZ.find(g => g.n.toLowerCase() === String(k).trim().toLowerCase());

  /* ==========================================================
     Esquemas de formulario
     ========================================================== */
  const TIPOS_COMIDA = ['Puesto callejero', 'Cafetería', 'Desayuno', 'Brunch', 'Almuerzo', 'Cena', 'Café / postre', 'Alta cocina', 'Casual / rápido', 'Mercado nocturno'];

  const CATS = ['Comida/super', 'Restaurante', 'Transporte', 'Compras', 'Actividad', 'Alojamiento', 'Otros'];

  const SCHEMAS = {
    // Los vuelos usan un formulario propio (openFlightSheet) que admite escalas.
    vuelo: { sing: 'vuelo', icon: '✈️', fields: [] },
    // Los datos del viaje (título y fechas) usan un formulario propio y corto,
    // no son una colección — ver openMetaSheet/submitMeta.
    meta: {
      sing: 'datos del viaje', icon: '🧭',
      fields: [
        { k: 'titulo', l: 'Nombre del viaje', t: 'text', req: true, ph: 'Viaje a Tailandia' },
        { k: 'fechaInicio', l: 'Fecha de inicio', t: 'date' },
        { k: 'fechaFin', l: 'Fecha de fin', t: 'date' }
      ]
    },
    gasto: {
      sing: 'gasto', icon: '💶',
      fields: [
        { k: 'fecha', l: 'Fecha', t: 'date', req: true },
        { k: 'concepto', l: 'Concepto', t: 'text', req: true, ph: 'Pad thai en Yaowarat' },
        { k: 'categoria', l: 'Categoría', t: 'select', opts: CATS, def: 'Comida/super', req: true },
        { k: 'moneda', l: 'Moneda', t: 'select', opts: ['THB', 'EUR'], def: 'THB', req: true },
        { k: 'importe', l: 'Importe', t: 'number', req: true, min: 0 },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    recomendacion: {
      sing: 'recomendación', icon: '💡',
      fields: [
        { k: 'texto', l: 'Recomendación', t: 'textarea', req: true, ph: 'Ej.: Parar en el templo de camino a Ayutthaya' },
        { k: 'categoria', l: 'Categoría', t: 'select', opts: ['Ver', 'Hacer', 'Comer', 'Comprar', 'Consejo', 'Otro'], def: 'Hacer' },
        { k: 'link', l: 'Enlace (opcional)', t: 'text', ph: 'https://…' }
      ]
    },
    coche: {
      sing: 'vehículo de alquiler', icon: '🛵',
      fields: [
        { k: 'empresa', l: 'Empresa', t: 'text', req: true, ph: 'Empresa de alquiler de moto o coche' },
        { k: 'modelo', l: 'Modelo', t: 'text', ph: 'Honda Click 125i' },
        { k: 'reserva', l: 'Nº de reserva', t: 'text', mono: true },
        { k: 'recogidaLugar', l: 'Lugar de recogida', t: 'loc', req: true },
        { k: 'recogida', l: 'Recogida (fecha y hora)', t: 'datetime-local', req: true },
        { k: 'devolucionLugar', l: 'Lugar de devolución', t: 'loc' },
        { k: 'devolucion', l: 'Devolución (fecha y hora)', t: 'datetime-local' },
        { k: 'precio', l: 'Precio total', t: 'text', ph: 'p. ej. 250 THB/día' },
        { k: 'franquicia', l: 'Franquicia / depósito', t: 'text', ph: 'p. ej. 3.000 THB' },
        { k: 'telefono', l: 'Teléfono', t: 'text' },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    alojamiento: {
      sing: 'alojamiento', icon: '🛏️',
      fields: [
        { k: 'nombre', l: 'Nombre', t: 'text', req: true, ph: 'Hotel en Sukhumvit' },
        { k: 'loc', l: 'Dirección / ubicación', t: 'loc', req: true },
        { k: 'checkin', l: 'Entrada (check-in)', t: 'date', req: true },
        { k: 'checkout', l: 'Salida (check-out)', t: 'date', req: true },
        { k: 'zona', l: 'Zona', t: 'text', ph: 'Sukhumvit, Bangkok' },
        { k: 'reserva', l: 'Localizador / reserva', t: 'text', mono: true },
        { k: 'link', l: 'Enlace (opcional)', t: 'text', ph: 'https://…' },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    excursion: {
      sing: 'excursión', icon: '🥾',
      fields: [
        { k: 'nombre', l: 'Nombre', t: 'text', req: true, ph: 'Excursión en barco a Koh Phi Phi' },
        { k: 'fecha', l: 'Fecha', t: 'date', req: true },
        { k: 'hora', l: 'Hora', t: 'time' },
        { k: 'duracion', l: 'Duración (minutos)', t: 'number', ph: '180', min: 0 },
        { k: 'encuentro', l: 'Punto de encuentro', t: 'loc' },
        { k: 'proveedor', l: 'Proveedor / empresa', t: 'text' },
        { k: 'reserva', l: 'Localizador / reserva', t: 'text', mono: true },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    comida: {
      sing: 'sitio para comer', icon: '🍴',
      fields: [
        { k: 'nombre', l: 'Nombre', t: 'text', req: true, ph: 'Puesto de pad thai en Yaowarat' },
        { k: 'tipo', l: 'Tipo de comida', t: 'select', opts: TIPOS_COMIDA },
        { k: 'loc', l: 'Ubicación', t: 'loc' },
        { k: 'fecha', l: 'Día (opcional)', t: 'date' },
        { k: 'horario', l: 'Horario aproximado', t: 'text', ph: '12:00–14:00' },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    },
    lugar: {
      sing: 'lugar', icon: '📍',
      fields: [
        { k: 'nombre', l: 'Nombre', t: 'text', req: true, ph: 'Templo Blanco (Wat Rong Khun)', gaz: true },
        { k: 'loc', l: 'Ubicación', t: 'loc' },
        { k: 'fecha', l: 'Día (opcional)', t: 'date' },
        { k: 'hora', l: 'Hora aproximada (opcional)', t: 'time' },
        { k: 'visita', l: 'Tiempo estimado de visita (min)', t: 'number', ph: '60', min: 0 },
        { k: 'prioridad', l: 'Prioridad', t: 'select', opts: ['Alta', 'Media', 'Baja'], def: 'Media' },
        { k: 'notas', l: 'Notas', t: 'textarea' }
      ]
    }
  };

  /* ==========================================================
     Geocodificación (Nominatim / OpenStreetMap)
     ========================================================== */
  async function geocode(q) {
    const hit = GAZ_BY_NAME(q);
    if (hit) return { lat: hit.lat, lng: hit.lng, label: hit.n };
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=th&q=' + encodeURIComponent(q);
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('geocode ' + r.status);
    const j = await r.json();
    if (!j.length) return null;
    return {
      lat: +(+j[0].lat).toFixed(5),
      lng: +(+j[0].lon).toFixed(5),
      label: String(j[0].display_name || '').split(',')[0]
    };
  }

  /* ==========================================================
     Formulario dinámico
     ========================================================== */
  let editing = null; // { kind, id }

  function fieldRow(f, val) {
    // Los campos de ubicación llevan un <details>, que no debe ir dentro de
    // un <label> (el clic se redirigiría al primer input y no abriría el detalle).
    const wrap = el(f.t === 'loc' ? 'div' : 'label', 'field');
    const span = el('span');
    span.textContent = f.l + (f.req ? ' *' : '');
    wrap.appendChild(span);

    if (f.t === 'loc') {
      wrap.appendChild(locControl(f, val || {}));
      return wrap;
    }

    let input;
    if (f.t === 'textarea') {
      input = el('textarea');
    } else if (f.t === 'select') {
      input = el('select');
      if (!f.req) { const o = el('option'); o.value = ''; o.textContent = '—'; input.appendChild(o); }
      (f.opts || []).forEach(op => { const o = el('option'); o.value = op; o.textContent = op; input.appendChild(o); });
    } else {
      input = el('input');
      input.type = f.t;
      if (f.min != null) input.min = f.min;
    }
    input.name = f.k;
    if (f.ph) input.placeholder = f.ph;
    if (f.req) input.required = true;
    if (f.mono) input.classList.add('mono');
    if (f.gaz) input.setAttribute('list', 'gaz-list');

    if (val != null && val !== '') input.value = val;
    else if (f.def) input.value = f.def;

    wrap.appendChild(input);
    return wrap;
  }

  function locControl(f, val) {
    const box = el('div', 'loc');
    box.dataset.loc = f.k;

    const row = el('div', 'loc__row');
    const txt = el('input');
    txt.type = 'text';
    txt.className = 'loc__text';
    txt.placeholder = 'Nombre o dirección en Tailandia';
    txt.value = val.texto || '';
    txt.setAttribute('list', 'gaz-list');

    const btn = el('button', 'btn btn--ghost btn--sm loc__btn');
    btn.type = 'button';
    btn.textContent = 'Buscar';
    row.append(txt, btn);

    const status = el('p', 'loc__status');

    const adv = el('details', 'loc__adv');
    const sum = el('summary');
    sum.textContent = 'Coordenadas (avanzado)';
    const latI = el('input');
    latI.type = 'number'; latI.step = 'any'; latI.placeholder = 'Latitud'; latI.className = 'loc__lat';
    if (val.lat != null) latI.value = val.lat;
    const lngI = el('input');
    lngI.type = 'number'; lngI.step = 'any'; lngI.placeholder = 'Longitud'; lngI.className = 'loc__lng';
    if (val.lng != null) lngI.value = val.lng;
    adv.append(sum, latI, lngI);

    box.append(row, status, adv);

    const paint = () => {
      const la = parseFloat(latI.value), lo = parseFloat(lngI.value);
      if (isFinite(la) && isFinite(lo)) {
        status.textContent = `📍 ${la.toFixed(4)}, ${lo.toFixed(4)}`;
        status.classList.add('is-set');
      } else {
        status.textContent = 'Sin coordenadas: no aparecerá en el mapa ni en los cálculos de trayecto.';
        status.classList.remove('is-set');
      }
    };
    latI.addEventListener('input', paint);
    lngI.addEventListener('input', paint);

    txt.addEventListener('change', () => {
      const hit = GAZ_BY_NAME(txt.value);
      if (hit) { latI.value = hit.lat; lngI.value = hit.lng; paint(); }
    });

    btn.addEventListener('click', async () => {
      const q = txt.value.trim();
      if (!q) { txt.focus(); return; }
      btn.disabled = true;
      btn.textContent = 'Buscando…';
      try {
        const res = await geocode(q);
        if (res) {
          latI.value = res.lat;
          lngI.value = res.lng;
          if (res.label && !txt.value.trim()) txt.value = res.label;
          paint();
        } else {
          toast('No se encontró esa ubicación.');
        }
      } catch (e) {
        toast('Búsqueda no disponible ahora. Prueba con coordenadas.');
        adv.open = true;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Buscar';
      }
    });

    paint();
    return box;
  }

  function readLoc(box) {
    const o = { texto: box.querySelector('.loc__text').value.trim() };
    const la = parseFloat(box.querySelector('.loc__lat').value);
    const lo = parseFloat(box.querySelector('.loc__lng').value);
    if (isFinite(la) && isFinite(lo)) { o.lat = la; o.lng = lo; }
    return o;
  }

  /* ---------- Formulario de vuelos (con escalas) ---------- */
  function labeledField(labelText, control, req) {
    const w = el('label', 'field');
    const s = el('span');
    s.textContent = labelText + (req ? ' *' : '');
    w.append(s, control);
    return w;
  }
  function mkInput(name, type, value, opts) {
    opts = opts || {};
    const i = el('input');
    i.type = type;
    i.name = name;
    if (value != null && value !== '') i.value = value;
    if (opts.ph) i.placeholder = opts.ph;
    if (opts.mono) i.classList.add('mono');
    return i;
  }
  const textField = (name, label, value, opts) =>
    labeledField(label, mkInput(name, 'text', value, opts), opts && opts.req);
  function textareaField(name, label, value) {
    const t = el('textarea');
    t.name = name;
    if (value) t.value = value;
    return labeledField(label, t);
  }
  function selectField(name, label, options, value, req) {
    const sel = el('select');
    sel.name = name;
    options.forEach(o => { const op = el('option'); op.value = o; op.textContent = o; sel.appendChild(op); });
    if (value) sel.value = value;
    return labeledField(label, sel, req);
  }

  function tramoCard(n, t) {
    t = t || {};
    const c = el('div', 'tramo');

    const head = el('div', 'tramo__head');
    const title = el('span');
    title.textContent = 'Tramo ' + n;
    const rm = el('button', 'icon-btn icon-btn--danger');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Eliminar tramo');
    rm.innerHTML = ICON.trash;
    rm.addEventListener('click', () => {
      const wrap = c.parentElement;
      if (wrap.querySelectorAll('.tramo').length <= 1) { toast('Un vuelo necesita al menos un tramo.'); return; }
      c.remove();
      Array.from(wrap.querySelectorAll('.tramo')).forEach((card, i) => {
        card.querySelector('.tramo__head span').textContent = 'Tramo ' + (i + 1);
      });
    });
    head.append(title, rm);
    c.appendChild(head);

    c.appendChild(textField('aerolinea', 'Aerolínea', t.aerolinea, { ph: 'Thai Airways' }));
    const g1 = el('div', 'field-2');
    g1.append(
      textField('numero', 'Nº de vuelo', t.numero, { mono: true, ph: 'TG 920' }),
      textField('clase', 'Clase', t.clase, { ph: 'Turista' })
    );
    c.appendChild(g1);
    c.appendChild(textField('operadoPor', 'Operado por', t.operadoPor, { ph: 'Thai Smile' }));

    const g2 = el('div', 'field-2');
    g2.append(
      textField('origen', 'Origen (código)', t.origen, { ph: 'MAD', mono: true }),
      textField('origenTerminal', 'Terminal', t.origenTerminal, { ph: '2' })
    );
    c.appendChild(g2);
    c.appendChild(textField('origenNombre', 'Aeropuerto de origen', t.origenNombre, { ph: 'Madrid Adolfo Suárez Barajas' }));

    const g3 = el('div', 'field-2');
    g3.append(
      textField('destino', 'Destino (código)', t.destino, { ph: 'BKK', mono: true }),
      textField('destinoTerminal', 'Terminal', t.destinoTerminal, { ph: '1' })
    );
    c.appendChild(g3);
    c.appendChild(textField('destinoNombre', 'Aeropuerto de destino', t.destinoNombre, { ph: 'Bangkok Suvarnabhumi' }));

    c.appendChild(labeledField('Salida (fecha y hora)', mkInput('salida', 'datetime-local', t.salida), n === 1));
    c.appendChild(labeledField('Llegada (fecha y hora)', mkInput('llegada', 'datetime-local', t.llegada)));
    c.appendChild(textField('duracion', 'Duración del tramo', t.duracion, { ph: '11h 30m' }));
    return c;
  }

  function openFlightSheet(id) {
    const data = id ? state.vuelos.find(x => x.id === id) : null;
    editing = { kind: 'vuelo', id: id || null };
    $('#sheet-title').textContent = (id ? 'Editar ' : 'Añadir ') + 'vuelo';

    const form = $('#sheet-form');
    form.innerHTML = '';
    form.appendChild(selectField('tipo', 'Tipo', ['Ida', 'Vuelta', 'Interno'], data ? data.tipo : 'Ida', true));
    form.appendChild(textField('reserva', 'Localizador / reserva', data ? data.reserva : '', { mono: true }));
    form.appendChild(textField('antelacion', 'Estar en el aeropuerto con', data ? data.antelacion : '', { ph: '3 h' }));
    form.appendChild(textareaField('equipaje', 'Equipaje y restricciones', data ? data.equipaje : ''));

    const tramosWrap = el('div', 'tramos');
    form.appendChild(tramosWrap);

    const addBtn = el('button', 'btn btn--ghost btn--block');
    addBtn.type = 'button';
    addBtn.textContent = '+ Añadir escala / tramo';
    addBtn.addEventListener('click', () => {
      tramosWrap.appendChild(tramoCard(tramosWrap.querySelectorAll('.tramo').length + 1, {}));
    });
    form.appendChild(addBtn);

    form.appendChild(textareaField('notas', 'Notas', data ? data.notas : ''));

    const tramos = (data && data.tramos && data.tramos.length) ? data.tramos : [{}];
    tramos.forEach((t, i) => tramosWrap.appendChild(tramoCard(i + 1, t)));

    showSheet();
  }

  function submitFlight(id, form) {
    const val = n => { const x = form.querySelector(`[name="${n}"]`); return x ? x.value.trim() : ''; };
    const tramos = Array.from(form.querySelectorAll('.tramo')).map(card => {
      const g = n => { const x = card.querySelector(`[name="${n}"]`); return x ? x.value.trim() : ''; };
      return {
        aerolinea: g('aerolinea'), numero: g('numero'), clase: g('clase'), operadoPor: g('operadoPor'),
        origen: g('origen').toUpperCase(), origenNombre: g('origenNombre'), origenTerminal: g('origenTerminal'),
        destino: g('destino').toUpperCase(), destinoNombre: g('destinoNombre'), destinoTerminal: g('destinoTerminal'),
        salida: g('salida'), llegada: g('llegada'), duracion: g('duracion')
      };
    }).filter(t => t.aerolinea || t.numero || t.origen || t.destino || t.salida);

    if (!tramos.length) { toast('Añade al menos un tramo con datos.'); return; }
    if (!tramos[0].salida) { toast('El primer tramo necesita fecha y hora de salida.'); return; }

    const obj = {
      id: id || uid(),
      tipo: val('tipo') || 'Ida',
      reserva: val('reserva'),
      antelacion: val('antelacion'),
      equipaje: val('equipaje'),
      notas: val('notas'),
      tramos
    };
    if (id) {
      const i = state.vuelos.findIndex(x => x.id === id);
      state.vuelos[i] = obj;
    } else {
      state.vuelos.push(obj);
    }
    save();
    hideSheet();
    renderAll();
    toast(id ? 'Vuelo actualizado.' : 'Vuelo añadido.');
  }

  function openMetaSheet() {
    editing = { kind: 'meta', id: null };
    $('#sheet-title').textContent = 'Editar datos del viaje';
    const form = $('#sheet-form');
    form.innerHTML = '';
    SCHEMAS.meta.fields.forEach(f => form.appendChild(fieldRow(f, state.meta[f.k])));
    showSheet();
  }

  function submitMeta(form) {
    const titulo = form.querySelector('[name="titulo"]').value.trim();
    const fechaInicio = form.querySelector('[name="fechaInicio"]').value;
    const fechaFin = form.querySelector('[name="fechaFin"]').value;
    if (!titulo) { toast('Falta: Nombre del viaje'); return; }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      toast('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }
    state.meta = { titulo, fechaInicio, fechaFin };
    save();
    hideSheet();
    renderAll();
    toast('Datos del viaje actualizados.');
  }

  function openSheet(kind, id, preset) {
    if (kind === 'vuelo') return openFlightSheet(id);
    if (kind === 'meta') return openMetaSheet();
    const sch = SCHEMAS[kind];
    const col = state[COL_OF[kind]];
    const data = id ? col.find(x => x.id === id) : null;
    editing = { kind, id: id || null };

    $('#sheet-title').textContent = (id ? 'Editar ' : 'Añadir ') + sch.sing;
    const form = $('#sheet-form');
    form.innerHTML = '';
    sch.fields.forEach(f => {
      form.appendChild(fieldRow(f, data ? data[f.k] : (preset ? preset[f.k] : null)));
    });

    // Autocompletar coords + tiempo de visita desde la lista de lugares conocidos
    const gazF = sch.fields.find(f => f.gaz);
    if (gazF) {
      const nombre = form.querySelector(`[name="${gazF.k}"]`);
      nombre.addEventListener('change', () => {
        const hit = GAZ_BY_NAME(nombre.value);
        if (!hit) return;
        const lb = form.querySelector('[data-loc]');
        if (lb) {
          lb.querySelector('.loc__lat').value = hit.lat;
          lb.querySelector('.loc__lng').value = hit.lng;
          lb.querySelector('.loc__lat').dispatchEvent(new Event('input'));
          if (!lb.querySelector('.loc__text').value.trim()) lb.querySelector('.loc__text').value = hit.n;
        }
        const vis = form.querySelector('[name="visita"]');
        if (vis && !vis.value && hit.min) vis.value = hit.min;
      });
    }

    showSheet();
  }

  on('#sheet-form', 'submit', e => {
    e.preventDefault();
    if (!editing) return;
    const { kind, id } = editing;
    const form = e.currentTarget;

    if (kind === 'vuelo') { submitFlight(id, form); return; }
    if (kind === 'meta') { submitMeta(form); return; }

    const sch = SCHEMAS[kind];

    // Validación mínima
    for (const f of sch.fields) {
      if (!f.req) continue;
      if (f.t === 'loc') {
        const t = form.querySelector(`[data-loc="${f.k}"] .loc__text`).value.trim();
        if (!t) { toast(`Falta: ${f.l}`); return; }
      } else {
        const inp = form.querySelector(`[name="${f.k}"]`);
        if (inp && !inp.value.trim()) { toast(`Falta: ${f.l}`); inp.focus(); return; }
      }
    }

    const base = id ? state[COL_OF[kind]].find(x => x.id === id) : { id: uid() };
    const obj = Object.assign({}, base);
    sch.fields.forEach(f => {
      if (f.t === 'loc') {
        obj[f.k] = readLoc(form.querySelector(`[data-loc="${f.k}"]`));
      } else {
        const inp = form.querySelector(`[name="${f.k}"]`);
        obj[f.k] = inp ? inp.value.trim() : '';
      }
    });

    if (kind === 'alojamiento' && obj.checkin && obj.checkout && obj.checkout < obj.checkin) {
      toast('El check-out no puede ser anterior al check-in.');
      return;
    }

    const collection = state[COL_OF[kind]];
    if (id) {
      const i = collection.findIndex(x => x.id === id);
      collection[i] = obj;
    } else {
      collection.push(obj);
    }
    save();
    hideSheet();
    renderAll();
    toast(id ? 'Cambios guardados.' : cap(sch.sing) + ' añadido.');
  });

  async function removeItem(kind, id) {
    const ok = await confirmAsk('¿Eliminar este elemento? No se puede deshacer.');
    if (!ok) return;
    const col = state[COL_OF[kind]];
    const i = col.findIndex(x => x.id === id);
    if (i > -1) {
      col.splice(i, 1);
      save();
      renderAll();
      toast('Elemento eliminado.');
    }
  }

  /* ==========================================================
     Pantalla: DATOS
     ========================================================== */
  function datosChip(key, label) {
    const b = el('button', 'chip');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(selectedDatosTopic === key));
    b.addEventListener('click', () => {
      if (selectedDatosTopic === key) return;
      selectedDatosTopic = key;
      renderDatos();
    });
    return b;
  }

  function renderDatos() {
    const body = $('#datos-body');
    body.innerHTML = '';

    const groups = [
      ['vuelos', 'Vuelos', vueloSummary],
      ['coches', 'Transporte propio (moto/coche)', cocheSummary],
      ['alojamientos', 'Alojamientos', alojSummary],
      ['excursiones', 'Excursiones', excSummary],
      ['comidas', 'Dónde comer', comidaSummary],
      ['lugares', 'Qué ver', lugarSummary],
      ['gastos', 'Gastos', gastoSummary]
    ];

    const chips = el('div', 'chips chips--itin');
    chips.appendChild(datosChip('all', 'Todo'));
    groups.forEach(([col, label]) => chips.appendChild(datosChip(col, SCHEMAS[KIND_OF[col]].icon + ' ' + label)));
    chips.appendChild(datosChip('antes', '✅ Antes de viajar'));
    chips.appendChild(datosChip('equipaje', '🎒 Equipaje'));
    body.appendChild(chips);

    body.appendChild(metaCard());

    groups.forEach(([col, label, sum]) => {
      if (selectedDatosTopic === 'all' || selectedDatosTopic === col) body.appendChild(groupEl(col, label, sum));
    });
    if (selectedDatosTopic === 'all' || selectedDatosTopic === 'antes') body.appendChild(antesDeViajarBlock());
    if (selectedDatosTopic === 'all' || selectedDatosTopic === 'equipaje') body.appendChild(equipajeBlock());
  }

  // Fecha límite real de una tarea "antes de viajar" ligada a un vuelo (24 h
  // antes de la salida del primer tramo). null si no hay anchor o no se
  // encuentra el vuelo todavía — la tarea se pinta entonces sin fecha, como
  // texto plano igual que las que no tienen anchor.
  function anteDeadline(anchor) {
    const tipo = anchor === 'vuelo-ida' ? 'Ida' : anchor === 'vuelo-vuelta' ? 'Vuelta' : null;
    if (!tipo) return null;
    const v = state.vuelos.find(x => x.tipo === tipo);
    const salida = v && v.tramos && v.tramos[0] && v.tramos[0].salida;
    if (!salida) return null;
    const d = new Date(salida);
    if (isNaN(d)) return null;
    d.setHours(d.getHours() - 24);
    return d;
  }
  function anteFechaTxt(anchor) {
    const d = anteDeadline(anchor);
    if (!d) return '';
    return fmtFecha(ymd(d)) + ', ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  // Cabecera común de los bloques plegables de Datos: icono de color, título,
  // contador y chevrón; recuerda abierto/cerrado en localStorage.
  function groupShell(openKey, ico, label, countTxt, color) {
    const g = el('div', 'group');
    g.style.setProperty('--gc', color);
    const isOpen = localStorage.getItem(openKey) !== '0';

    const head = el('button', 'group__head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(isOpen));
    head.innerHTML =
      `<span class="group__label"><span class="group__ico" aria-hidden="true">${ico}</span>${esc(label)}</span>` +
      `<span class="group__right"><span class="count">${countTxt}</span><span class="chev" aria-hidden="true">${ICON.chev}</span></span>`;

    const body = el('div', 'group__body');
    body.hidden = !isOpen;

    head.addEventListener('click', () => {
      const willOpen = body.hidden;
      body.hidden = !willOpen;
      head.setAttribute('aria-expanded', String(willOpen));
      localStorage.setItem(openKey, willOpen ? '1' : '0');
    });

    g.append(head, body);
    return { g, body };
  }

  // Lista de comprobación (equipaje / tareas antes de viajar). No usa
  // SCHEMAS/openSheet: son ítems de tap-to-marcar y basta con renderDatos()
  // tras cada cambio, no afectan a las demás pestañas.
  function checklistBlock(cfg) {
    const items = state[cfg.col];
    const done = items.filter(x => x[cfg.doneKey]).length;
    const { g, body } = groupShell(cfg.openKey, cfg.ico, cfg.label, `${done}/${items.length}`, cfg.color);

    if (!items.length) {
      const e = el('div', 'empty');
      e.textContent = 'Sin elementos.';
      body.appendChild(e);
    } else {
      const cats = [];
      const byCat = {};
      items.forEach(it => {
        if (!byCat[it.cat]) { byCat[it.cat] = []; cats.push(it.cat); }
        byCat[it.cat].push(it);
      });
      cats.forEach(cat => {
        const catEl = el('p', 'equipaje-cat');
        catEl.textContent = cat;
        body.appendChild(catEl);
        const list = el('div', 'equipaje-list');
        byCat[cat].forEach(it => {
          const row = el('label', 'equipaje-row' + (it[cfg.doneKey] ? ' equipaje-row--done' : ''));
          row.innerHTML =
            `<input type="checkbox"${it[cfg.doneKey] ? ' checked' : ''}>` +
            `<span>${esc(it.texto)}${cfg.extra ? cfg.extra(it) : ''}</span>`;
          row.querySelector('input').addEventListener('change', () => {
            it[cfg.doneKey] = !it[cfg.doneKey];
            save();
            renderDatos();
          });
          const del = el('button', 'icon-btn icon-btn--danger equipaje-row__del');
          del.type = 'button';
          del.setAttribute('aria-label', 'Eliminar');
          del.innerHTML = ICON.trash;
          del.addEventListener('click', async ev => {
            ev.preventDefault();
            const ok = await confirmAsk('¿Eliminar «' + it.texto + '» de la lista?');
            if (!ok) return;
            const i = items.findIndex(x => x.id === it.id);
            if (i > -1) { items.splice(i, 1); save(); renderDatos(); }
          });
          row.appendChild(del);
          list.appendChild(row);
        });
        body.appendChild(list);
      });
    }

    const addRow = el('form', 'equipaje-add');
    addRow.innerHTML = `<input type="text" placeholder="Añadir a la lista…" maxlength="60"><button type="submit" class="btn btn--ghost">${ICON.plus} Añadir</button>`;
    addRow.addEventListener('submit', e => {
      e.preventDefault();
      const input = addRow.querySelector('input');
      const texto = input.value.trim();
      if (!texto) return;
      items.push(cfg.newItem(texto));
      save();
      renderDatos();
    });
    body.appendChild(addRow);

    return g;
  }

  function equipajeBlock() {
    return checklistBlock({
      col: 'equipaje', openKey: 'open_equipaje', ico: '🎒', label: 'Equipaje', color: 'var(--pink)',
      doneKey: 'packed',
      newItem: texto => ({ id: uid(), texto, cat: 'Otros', packed: false })
    });
  }

  // La única diferencia con equipaje es la fecha límite calculada para las
  // tareas con anchor (ver anteFechaTxt).
  function antesDeViajarBlock() {
    return checklistBlock({
      col: 'antesDeViajar', openKey: 'open_antes', ico: '✅', label: 'Antes de viajar', color: 'var(--lime)',
      doneKey: 'hecho',
      extra: it => {
        const f = it.anchor ? anteFechaTxt(it.anchor) : '';
        return f ? '<br><span class="ante-fecha">Disponible desde: ' + esc(f) + '</span>' : '';
      },
      newItem: texto => ({ id: uid(), texto, cat: 'General', anchor: null, hecho: false })
    });
  }

  // El viaje real (vuelos, alojamientos, excursiones, lugares, comidas y las
  // fechas) es de solo lectura: ya está reservado/planificado y no debe
  // poder borrarse o editarse por error desde el móvil. Solo quedan
  // editables las cosas pensadas para usar durante el viaje o para anotar
  // tus propios descubrimientos: coche/moto (no reservado), recomendaciones
  // propias y el registro de gastos.
  const EDITABLE_COLS = ['coches', 'recomendaciones', 'gastos'];

  function metaCard() {
    const m = state.meta;
    const c = el('section', 'trip-hero');
    const rango = (m.fechaInicio && m.fechaFin)
      ? `${fmtFecha(m.fechaInicio, true)} \u2013 ${fmtFecha(m.fechaFin, true)}`
      : 'Sin fechas';
    const dias = (m.fechaInicio && m.fechaFin) ? eachDay(m.fechaInicio, m.fechaFin).length : 0;
    const stat = (n, txt) => `<span class="stat"><b>${n}</b> ${txt}</span>`;
    c.innerHTML =
      `<h3 class="trip-hero__title">${esc(m.titulo || 'Viaje a Tailandia')}</h3>` +
      `<p class="trip-hero__dates">${esc(rango)}</p>` +
      `<div class="trip-hero__stats">` +
      (dias ? stat(dias, dias === 1 ? 'd\u00eda' : 'd\u00edas') : '') +
      stat(state.vuelos.length, state.vuelos.length === 1 ? 'vuelo' : 'vuelos') +
      stat(state.alojamientos.length, state.alojamientos.length === 1 ? 'alojamiento' : 'alojamientos') +
      `</div>`;
    return c;
  }

  const GROUP_COLOR = {
    vuelos: 'var(--blue)', coches: 'var(--orange)', alojamientos: 'var(--pink)', excursiones: 'var(--lime)',
    comidas: 'var(--orange)', lugares: 'var(--lime)', gastos: 'var(--blue)'
  };

  function groupEl(col, label, summarize) {
    const items = state[col];
    const kind = KIND_OF[col];
    const { g, body } = groupShell('open_' + col, SCHEMAS[kind].icon, label, items.length, GROUP_COLOR[col]);

    if (col === 'gastos') body.appendChild(gastoResumen());

    const editable = EDITABLE_COLS.includes(col);

    const list = el('div', 'list');
    if (!items.length) {
      const e = el('div', 'empty');
      e.textContent = 'A\u00fan no has a\u00f1adido nada aqu\u00ed.';
      list.appendChild(e);
    } else {
      items.slice().sort(itemSorter(col)).forEach(it => list.appendChild(itemCard(kind, it, summarize(it), editable)));
    }
    body.appendChild(list);

    if (editable) {
      const add = el('button', 'btn btn--ghost btn--block');
      add.type = 'button';
      add.innerHTML = ICON.plus + ' A\u00f1adir ' + esc(SCHEMAS[kind].sing);
      add.addEventListener('click', () => openSheet(kind));
      body.appendChild(add);
    }

    return g;
  }

  function itemCard(kind, it, summaryHtml, editable) {
    const c = el('div', 'card item' + (kind === 'vuelo' ? ' card--pass' : ''));
    const main = el('div', 'item__main');
    main.innerHTML = summaryHtml;
    c.appendChild(main);

    if (editable) {
      const acts = el('div', 'item__acts');
      const edit = el('button', 'icon-btn');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Editar');
      edit.innerHTML = ICON.edit;
      edit.addEventListener('click', () => openSheet(kind, it.id));

      const del = el('button', 'icon-btn icon-btn--danger');
      del.type = 'button';
      del.setAttribute('aria-label', 'Eliminar');
      del.innerHTML = ICON.trash;
      del.addEventListener('click', () => removeItem(kind, it.id));

      acts.append(edit, del);
      c.appendChild(acts);
    }
    return c;
  }

  // Minutos de escala entre dos horas locales del mismo aeropuerto (sin desfase horario).
  function layoverMin(llegada, salida) {
    if (!llegada || !salida) return null;
    const a = new Date(llegada), b = new Date(salida);
    if (isNaN(a) || isNaN(b)) return null;
    const m = Math.round((b - a) / 60000);
    return m > 0 ? m : null;
  }

  function itemSorter(col) {
    if (col === 'gastos') return (a, b) => (b.fecha || '').localeCompare(a.fecha || '');
    const key = {
      vuelos: x => (x.tramos && x.tramos[0] && x.tramos[0].salida) || '',
      coches: x => x.recogida || '',
      alojamientos: x => x.checkin || '',
      excursiones: x => (x.fecha || '') + ' ' + (x.hora || ''),
      comidas: x => (x.fecha || '~') + (x.nombre || ''),
      lugares: x => (x.fecha || '~') + (x.hora || '') + (x.nombre || '')
    }[col];
    return (a, b) => {
      const ka = key(a), kb = key(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    };
  }

  function locLine(loc) {
    if (!loc) return '';
    const bits = [];
    if (loc.texto) bits.push(esc(loc.texto));
    if (loc.lat != null) bits.push('<span class="pin">📍</span>');
    return bits.join(' ');
  }
  function vueloEscalas(tr) {
    // [{cod, min}] para cada escala intermedia
    return tr.slice(0, -1).map((t, i) => ({ cod: t.destino || '', min: layoverMin(t.llegada, tr[i + 1].salida) }));
  }
  const escLines = s => esc(s).split('\n').join('<br>');

  // Horas en el aire (suma de la duración de cada tramo) y total de puerta a
  // puerta con las escalas. null si a algún tramo le falta la duración.
  function vueloHoras(tr) {
    const legs = tr.map(t => parseDurLoose(t.duracion));
    if (!legs.length || legs.some(m => m == null)) return null;
    const vuelo = legs.reduce((a, b) => a + b, 0);
    const esc = vueloEscalas(tr).map(x => x.min);
    const total = esc.some(m => m == null) ? null : vuelo + esc.reduce((a, b) => a + b, 0);
    return { vuelo, total: tr.length > 1 ? total : null };
  }
  function vueloHorasTxt(tr) {
    const h = vueloHoras(tr);
    if (!h) return '';
    return fmtDur(h.vuelo) + ' de vuelo' + (h.total ? ' · ' + fmtDur(h.total) + ' en total' : '');
  }

  function vueloSummary(v) {
    const tr = v.tramos || [];
    const a = tr[0] || {}, z = tr[tr.length - 1] || {};
    const s = dtParts(a.salida), e = dtParts(z.llegada);

    let html =
      `<div class="pass"><div class="pass__top"><span class="pass__route"><span class="mono">${esc(a.origen || '')}</span>${ICON.planeL}<span class="mono">${esc(z.destino || '')}</span></span><span class="pass__tipo">${esc(v.tipo || 'Vuelo')}</span></div>` +
      `<div class="pass__tear"></div><div class="pass__body">` +
      `<div class="fly-summary">${s.date ? fmtFecha(s.date, true) : '—'} · sale <b>${s.time || '—'}</b> · llega <b>${e.time || '—'}</b>${e.date && e.date !== s.date ? ' (' + fmtFecha(e.date) + ')' : ''}${tr.length > 1 ? ' · ' + tr.length + ' tramos' : ''}</div>`;
    const horas = vueloHoras(tr);
    if (horas) {
      html += `<div class="fly-summary">✈️ <b>${fmtDur(horas.vuelo)}</b> de vuelo` +
        (horas.total ? ` · ${fmtDur(horas.total)} en total con la escala` : '') + `</div>`;
    }

    html += '<div class="fly-legs">';
    tr.forEach((t, i) => {
      const ts = dtParts(t.salida), ta = dtParts(t.llegada);
      html += `<div class="fly-leg">` +
        `<div class="fly-leg__head">${[
          t.numero ? `<span class="mono">${esc(t.numero)}</span>` : '',
          esc(t.aerolinea || ''),
          t.operadoPor ? 'op. ' + esc(t.operadoPor) : '',
          esc(t.clase || '')
        ].filter(Boolean).join(' · ')}</div>` +
        `<div class="fly-leg__route"><span>${esc(t.origen || '')}${t.origenTerminal ? ' <em>T' + esc(t.origenTerminal) + '</em>' : ''} ${ts.time || ''}</span><span class="fly-leg__arrow">→</span><span>${esc(t.destino || '')}${t.destinoTerminal ? ' <em>T' + esc(t.destinoTerminal) + '</em>' : ''} ${ta.time || ''}</span></div>` +
        (t.duracion ? `<div class="fly-leg__dur">${esc(t.duracion)}</div>` : '') +
        `</div>`;
      if (i < tr.length - 1) {
        const lay = layoverMin(t.llegada, tr[i + 1].salida);
        html += `<div class="fly-lay">↕ escala en ${esc(t.destino || '')}${lay ? ' · ' + fmtDur(lay) : ''}</div>`;
      }
    });
    html += '</div>';

    if (v.antelacion) {
      const mins = parseDurLoose(v.antelacion);
      const antesDe = (mins != null && s.time) ? `<br>Llega al aeropuerto sobre las <b>${minusMin(s.time, mins)}</b>.` : '';
      html += `<div class="fly-alert">Estar en el aeropuerto con <b>${esc(v.antelacion)}</b> de antelación.${antesDe}</div>`;
    }
    if (v.notas) html += `<div class="item__meta">${escLines(v.notas)}</div>`;
    if (v.reserva) html += `<div class="item__meta">Reserva: ${esc(v.reserva)}</div>`;
    if (v.equipaje) html += `<details class="fly-bags" open><summary>Equipaje y restricciones</summary><p>${esc(v.equipaje)}</p></details>`;
    return html + '</div></div>';
  }

  function alojSummary(a) {
    const noches = Math.max(0, eachDay(a.checkin, a.checkout).length - 1);
    return `<div class="item__title">${esc(a.nombre || 'Alojamiento')}</div>
      <div class="item__meta">${a.checkin ? fmtFecha(a.checkin, true) : '—'} → ${a.checkout ? fmtFecha(a.checkout, true) : '—'}${noches ? ' · ' + noches + ' noche' + (noches !== 1 ? 's' : '') : ''}</div>
      <div class="item__meta">${locLine(a.loc)}${a.zona ? ' · ' + esc(a.zona) : ''}</div>
      ${a.notas ? `<div class="item__meta">${escLines(a.notas)}</div>` : ''}
      ${a.reserva ? `<div class="item__meta">Reserva: ${esc(a.reserva)}</div>` : ''}
      ${a.link ? `<a class="btn btn--accent btn--sm aloj-link" href="${esc(a.link)}" target="_blank" rel="noopener">Ver alojamiento ›</a>` : ''}`;
  }

  function cocheSummary(v) {
    const r = dtParts(v.recogida), d = dtParts(v.devolucion);
    const dias = (v.recogida && v.devolucion)
      ? Math.max(1, Math.round((new Date(v.devolucion) - new Date(v.recogida)) / 86400000))
      : 0;

    const when = (mod, lbl, dp, loc) =>
      `<div class="coche-when ${mod}">` +
      `<div class="coche-when__lbl">${lbl}</div>` +
      `<div class="coche-when__val">${dp.date ? fmtFecha(dp.date, true) : '—'}${dp.time ? ' · ' + dp.time : ''}</div>` +
      `${loc && loc.texto ? `<div class="coche-when__loc">${esc(loc.texto)}</div>` : ''}` +
      `</div>`;

    let html = `<div class="item__title">${esc(v.empresa || 'Vehículo')}${v.modelo ? ' · ' + esc(v.modelo) : ''}${dias ? ` <span class="prio prio--media">${dias} día${dias !== 1 ? 's' : ''}</span>` : ''}</div>`;
    html += '<div class="coche-whens">' +
      when('is-in', 'Recogida', r, v.recogidaLugar) +
      when('is-out', 'Devolución', d, v.devolucionLugar) +
      '</div>';

    const metas = [];
    if (v.reserva) metas.push('Reserva: ' + esc(v.reserva));
    if (v.precio) metas.push(esc(v.precio));
    if (v.franquicia) metas.push('Franquicia: ' + esc(v.franquicia));
    if (v.telefono) metas.push('Tel.: ' + esc(v.telefono));
    if (metas.length) html += `<div class="item__meta">${metas.join(' · ')}</div>`;

    if (v.notas) html += `<details class="fly-bags" open><summary>ℹ️ Detalles y condiciones</summary><p>${esc(v.notas)}</p></details>`;
    return html;
  }
  function excSummary(e) {
    return `<div class="item__title">${esc(e.nombre || 'Excursión')}</div>
      <div class="item__meta">${e.fecha ? fmtFecha(e.fecha) : '—'} ${e.hora || ''} ${e.duracion ? '· ' + fmtDur(+e.duracion) : ''}</div>
      <div class="item__meta">${e.encuentro && e.encuentro.texto ? 'Encuentro: ' + locLine(e.encuentro) : ''}</div>
      ${e.notas ? `<div class="item__meta">${escLines(e.notas)}</div>` : ''}
      ${fotoBlock(e.foto, e.nombre, e.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption')}
      ${opcionesHtml(e.opciones)}`;
  }
  function comidaSummary(c) {
    return `<div class="item__title">${esc(c.nombre || '')}</div>
      <div class="item__meta">${esc(c.tipo || '')} ${c.horario ? '· ' + esc(c.horario) : ''}</div>
      <div class="item__meta">${locLine(c.loc)} ${c.fecha ? '· ' + fmtFecha(c.fecha) : ''}</div>
      ${c.notas ? `<div class="item__meta">${escLines(c.notas)}</div>` : ''}
      ${fotoBlock(c.foto, c.nombre, c.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption')}
      ${opcionesHtml(c.opciones)}`;
  }
  function lugarSummary(l) {
    const p = (l.prioridad || 'Media');
    return `<div class="item__title">${esc(l.nombre || '')} <span class="prio prio--${p.toLowerCase()}">${esc(p)}</span></div>
      <div class="item__meta">${locLine(l.loc)}</div>
      <div class="item__meta">${l.visita ? fmtDur(+l.visita) + ' de visita' : ''} ${l.fecha ? '· ' + fmtFecha(l.fecha) : ''}${l.hora ? ' · ' + esc(l.hora) : ''}</div>
      ${l.notas ? `<div class="item__meta">${escLines(l.notas)}</div>` : ''}
      ${fotoBlock(l.foto, l.nombre, l.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption')}
      ${opcionesHtml(l.opciones)}`;
  }
  function gastoResumen() {
    const box = el('div', 'gasto-resumen');

    // Totales y desglose por categoría (todo en € para poder sumar monedas mixtas)
    let totEUR = 0, totTHB = 0;
    const porCat = {};
    state.gastos.forEach(g => {
      const imp = +g.importe || 0;
      totEUR += toEUR(imp, g.moneda);
      totTHB += toTHB(imp, g.moneda);
      const k = g.categoria || 'Otros';
      porCat[k] = (porCat[k] || 0) + toEUR(imp, g.moneda);
    });

    const tot = el('p', 'gasto-resumen__tot');
    tot.innerHTML = `Total ≈ <b>${fmtEUR(totEUR)}</b> · ${fmtTHB(totTHB)}`;
    box.appendChild(tot);

    Object.keys(porCat)
      .filter(k => Math.abs(porCat[k]) > 0.005)   // incluye netos negativos (reembolsos) para que cuadre con el total
      .sort((a, b) => porCat[b] - porCat[a])
      .forEach(k => {
        const row = el('p', 'gasto-cat');
        row.innerHTML = `<span>${esc(k)}</span><span>${fmtEUR(porCat[k])}</span>`;
        box.appendChild(row);
      });

    // Línea de tipo de cambio (editable a mano)
    const fx = state.fx || blankFx();
    const etiqueta = fx.source === 'api' ? 'BCE ' + fmtFecha(fx.date)
      : fx.source === 'manual' ? 'manual' : 'aprox.';
    const rateShown = String(+(+fx.rate || 38).toFixed(2));   // precisión real, sin ceros de más
    const line = el('p', 'fx-line');
    line.innerHTML = `1 € = <input type="number" step="0.1" min="0" class="fx-line__rate" value="${rateShown}"> THB <span class="muted">· ${esc(etiqueta)}</span>`;
    line.querySelector('.fx-line__rate').addEventListener('change', ev => {
      const v = +ev.target.value;
      if (v > 0) {
        state.fx = { rate: v, date: hoyYMD(), source: 'manual', stamp: hoyYMD() };
        save();
        renderDatos();
      } else {
        ev.target.value = rateShown;   // valor vacío o <= 0: no se guarda; se restaura lo que había
      }
    });
    box.appendChild(line);

    return box;
  }

  function gastoSummary(g) {
    const imp = +g.importe || 0;
    const propia = g.moneda === 'THB' ? fmtTHB(imp) : fmtEUR(imp);
    const otra = g.moneda === 'THB' ? fmtEUR(toEUR(imp, 'THB')) : fmtTHB(toTHB(imp, 'EUR'));
    return `<div class="item__title">${esc(g.concepto || 'Gasto')}</div>
      <div class="item__meta">${g.fecha ? fmtFecha(g.fecha) : '—'} · <span class="chip--cat">${esc(g.categoria || 'Otros')}</span></div>
      <div class="item__meta gasto-amt"><b>${propia}</b> <span class="muted">≈ ${otra}</span></div>
      ${g.notas ? `<div class="item__meta">${escLines(g.notas)}</div>` : ''}`;
  }

  /* ==========================================================
     Motor de itinerario
     ========================================================== */
  function buildItinerary() {
    const { meta } = state;
    const days = eachDay(meta.fechaInicio, meta.fechaFin);
    const byDay = new Map(days.map(d => [d, []]));
    const unassigned = [];
    const inRange = d => byDay.has(d);
    const push = (d, item) => byDay.get(d).push(item);

    // Vuelos (con escalas)
    state.vuelos.forEach(v => {
      const tr = v.tramos || [];
      const a = tr[0] || {}, z = tr[tr.length - 1] || {};
      const p = dtParts(a.salida);
      const arr = dtParts(z.llegada);
      const escTxt = vueloEscalas(tr)
        .map(x => x.cod + (x.min ? ' ' + fmtDur(x.min) : ''))
        .filter(Boolean);
      const subBits = [];
      if (p.time) subBits.push('Sale ' + p.time + (a.origen ? ' ' + a.origen : ''));
      if (arr.time) subBits.push('llega ' + arr.time + (z.destino ? ' ' + z.destino : '') + (arr.date && arr.date !== p.date ? ' (' + fmtFecha(arr.date) + ')' : ''));
      if (escTxt.length) subBits.push('escala ' + escTxt.join(', '));
      const horasTxt = vueloHorasTxt(tr);
      if (horasTxt) subBits.push(horasTxt);

      const antesMin = parseDurLoose(v.antelacion);
      const enAeropuerto = (antesMin != null && p.time) ? minusMin(p.time, antesMin) : '';
      if (enAeropuerto) subBits.push('en el aeropuerto ' + enAeropuerto);

      const notasItin = [
        enAeropuerto
          ? `En el aeropuerto sobre las ${enAeropuerto} (${v.antelacion} antes de las ${p.time}).`
          : (v.antelacion ? `Estar en el aeropuerto con ${v.antelacion} de antelación.` : ''),
        a.origenTerminal ? `Salida por la Terminal ${a.origenTerminal} de ${a.origen}.` : '',
        v.equipaje || ''
      ].filter(Boolean).join('\n');

      const item = {
        t: 'vuelo',
        hora: p.time,
        sortT: p.time ? toMin(p.time) : 0,
        titulo: `${v.tipo || 'Vuelo'} · ${a.origen || ''} → ${z.destino || ''}`.trim(),
        sub: subBits.join(' · '),
        notas: notasItin,
        loc: null,
        tag: 'Vuelo',
        costMin: 0
      };
      if (p.date && inRange(p.date)) push(p.date, item);
      else unassigned.push(Object.assign({ nota: p.date ? 'fecha fuera del rango' : 'sin fecha' }, item));
    });

    // Vehículo de alquiler (recogida + devolución)
    state.coches.forEach(v => {
      const rp = dtParts(v.recogida);
      const dp = dtParts(v.devolucion);
      const rLoc = v.recogidaLugar && v.recogidaLugar.lat != null ? v.recogidaLugar : null;
      const dLoc = (v.devolucionLugar && v.devolucionLugar.lat != null) ? v.devolucionLugar : rLoc;
      if (rp.date && inRange(rp.date)) {
        push(rp.date, {
          t: 'coche', hora: rp.time, sortT: rp.time ? toMin(rp.time) : 720,
          titulo: `Recogida del vehículo${v.empresa ? ' · ' + v.empresa : ''}`,
          sub: [v.modelo, v.recogidaLugar && v.recogidaLugar.texto, v.reserva].filter(Boolean).join(' · '),
          notas: v.notas || '', loc: rLoc, tag: 'Transporte', costMin: 0
        });
      }
      if (dp.date && inRange(dp.date)) {
        push(dp.date, {
          t: 'coche', hora: dp.time, sortT: dp.time ? toMin(dp.time) : 600,
          titulo: `Devolución del vehículo${v.empresa ? ' · ' + v.empresa : ''}`,
          sub: [v.devolucionLugar && v.devolucionLugar.texto || (v.recogidaLugar && v.recogidaLugar.texto), v.reserva].filter(Boolean).join(' · '),
          loc: dLoc, tag: 'Transporte', costMin: 0
        });
      }
    });

    // Alojamientos
    state.alojamientos.forEach(a => {
      const loc = a.loc && a.loc.lat != null ? a.loc : (a.loc || null);
      if (a.checkin && inRange(a.checkin)) {
        push(a.checkin, { t: 'checkin', hora: '', sortT: 1400, titulo: `Check-in · ${a.nombre || 'Alojamiento'}`, sub: a.loc && a.loc.texto || '', notas: a.notas || '', loc, tag: 'Alojamiento', costMin: 0 });
      }
      if (a.checkout && inRange(a.checkout)) {
        push(a.checkout, { t: 'checkout', hora: '', sortT: 10, titulo: `Check-out · ${a.nombre || 'Alojamiento'}`, sub: a.loc && a.loc.texto || '', loc, tag: 'Alojamiento', costMin: 0 });
      }
      eachDay(a.checkin, a.checkout).slice(0, -1).forEach(d => {
        if (inRange(d)) push(d, { t: 'noche', hora: '', sortT: 1460, titulo: `Noche en ${a.nombre || 'alojamiento'}`, sub: a.loc && a.loc.texto || '', loc, tag: 'Alojamiento', quiet: true, costMin: 0 });
      });
    });

    // Excursiones
    state.excursiones.forEach(e => {
      const item = {
        t: 'excursion',
        hora: e.hora || '',
        sortT: e.hora ? toMin(e.hora) : 540,
        titulo: e.nombre || 'Excursión',
        sub: [
          e.duracion ? fmtDur(+e.duracion) : '',
          e.encuentro && e.encuentro.texto ? 'Encuentro: ' + e.encuentro.texto : ''
        ].filter(Boolean).join(' · '),
        notas: e.notas || '',
        loc: e.encuentro && e.encuentro.lat != null ? e.encuentro : null,
        tag: 'Excursión',
        costMin: e.duracion ? +e.duracion : EXCURSION_MIN,
        foto: e.foto || null,
        desc: e.desc || null,
        opciones: e.opciones || null
      };
      if (e.fecha && inRange(e.fecha)) push(e.fecha, item);
      else unassigned.push(Object.assign({ nota: e.fecha ? 'fecha fuera del rango' : 'sin fecha' }, item));
    });

    // Comidas
    state.comidas.forEach(c => {
      const ht = firstTime(c.horario);
      const item = {
        t: 'comida',
        hora: ht,
        sortT: ht ? toMin(ht) : 780,
        titulo: c.nombre || 'Comida',
        sub: [c.tipo, c.horario].filter(Boolean).join(' · '),
        notas: c.notas || '',
        loc: c.loc && c.loc.lat != null ? c.loc : null,
        tag: 'Comida',
        costMin: COMIDA_MIN,
        foto: c.foto || null,
        desc: c.desc || null,
        opciones: c.opciones || null
      };
      if (c.fecha && inRange(c.fecha)) push(c.fecha, item);
      else unassigned.push(Object.assign({ nota: 'sin fecha' }, item));
    });

    // Lugares
    state.lugares.forEach(l => {
      const item = {
        t: 'lugar',
        hora: l.hora || '',
        sortT: l.hora ? toMin(l.hora) : 660,
        titulo: l.nombre || 'Lugar',
        sub: [
          l.prioridad ? 'Prioridad ' + l.prioridad : '',
          l.visita ? fmtDur(+l.visita) + ' de visita' : ''
        ].filter(Boolean).join(' · '),
        notas: l.notas || '',
        loc: l.loc && l.loc.lat != null ? l.loc : null,
        tag: 'Lugar',
        costMin: l.visita ? +l.visita : LUGAR_MIN,
        foto: l.foto || null,
        desc: l.desc || null,
        opciones: l.opciones || null
      };
      if (l.fecha && inRange(l.fecha)) push(l.fecha, item);
      else unassigned.push(Object.assign({ nota: 'sin fecha' }, item));
    });

    const outDays = days.map((d, i) => {
      const items = byDay.get(d).slice().sort((a, b) => a.sortT - b.sortT);
      let km = 0, prev = null;
      items.forEach(it => {
        if (it.loc && it.loc.lat != null) {
          if (prev && haversine(prev, it.loc) >= MIN_LEG_KM) km += driveByRoad(prev, it.loc).km;
          prev = it.loc;
        }
      });
      return { date: d, idx: i + 1, items, km };
    });

    return { days: outDays, unassigned, count: days.length };
  }

  /* ==========================================================
     Pantalla: ITINERARIO
     ========================================================== */
  let selectedItinDay = 'all';
  let selectedDatosTopic = 'all';
  let selectedGuiaTopic = 'all';
  // La primera vez que se pinta cada sección, si hoy cae dentro del viaje,
  // se abre directamente ese día en vez de «Todos». Después el usuario manda.
  let itinDayInit = false;

  // YMD de hoy si el viaje está en curso hoy; null en caso contrario.
  function diaHoyYMD() {
    const { fechaInicio, fechaFin } = state.meta;
    if (!fechaInicio || !fechaFin) return null;
    const hoy = hoyYMD();
    return (hoy >= fechaInicio && hoy <= fechaFin) ? hoy : null;
  }

  function itinChip(key, label) {
    const b = el('button', 'chip');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(selectedItinDay === key));
    b.addEventListener('click', () => {
      if (selectedItinDay === key) return;
      selectedItinDay = key;
      renderItinerario();
    });
    return b;
  }

  function guiaChip(key, label) {
    const b = el('button', 'chip');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(selectedGuiaTopic === key));
    b.addEventListener('click', () => {
      if (selectedGuiaTopic === key) return;
      selectedGuiaTopic = key;
      renderTransporte();
    });
    return b;
  }

  function renderItinerario() {
    const body = $('#itin-body');
    const sub = $('#itin-sub');
    destroyRutaMap();
    body.innerHTML = '';
    _odCache = {};   // cache de outdoorFor válido solo dentro de este render

    if (!state.meta.fechaInicio || !state.meta.fechaFin) {
      sub.textContent = '';
      body.appendChild(notice('Añade las fechas de inicio y fin en «Datos del viaje» para generar el itinerario por días.'));
      return;
    }

    const it = buildItinerary();
    sub.textContent = `${fmtFecha(state.meta.fechaInicio, true)} – ${fmtFecha(state.meta.fechaFin, true)} · ${it.count} día${it.count !== 1 ? 's' : ''}`;

    if (!itinDayInit) {
      itinDayInit = true;
      const hoy = diaHoyYMD();
      if (hoy && it.days.some(d => d.date === hoy)) selectedItinDay = hoy;
    }

    if (selectedItinDay !== 'all' && !it.days.some(d => d.date === selectedItinDay)) selectedItinDay = 'all';

    const hb = hoyBlock(it);
    if (hb) body.appendChild(hb);
    if (selectedItinDay === 'all') {
      body.appendChild(resumenBlock());
      const rb = rutaBlock();
      if (rb) body.appendChild(rb);
    }
    body.appendChild(outdoorRankBlock(it));

    const chips = el('div', 'chips chips--itin');
    chips.appendChild(itinChip('all', 'Todos'));
    it.days.forEach(d => chips.appendChild(itinChip(d.date, 'Día ' + d.idx)));
    body.appendChild(chips);

    const dias = selectedItinDay === 'all' ? it.days : it.days.filter(d => d.date === selectedItinDay);
    // Los días sin itinerario de un mismo destino se pintan juntos, una vez.
    const gruposPintados = new Set();
    dias.forEach(day => {
      const g = grupoDe(day.date);
      if (!g) { body.appendChild(dayBlock(day)); return; }
      if (gruposPintados.has(g.id)) return;
      gruposPintados.add(g.id);
      body.appendChild(grupoBlock(g, it.days));
    });

    if (selectedItinDay === 'all' && it.unassigned.length) body.appendChild(unassignedBlock(it.unassigned));
    ensureRutaMap();
  }

  // Tarjeta condensada del día en curso, arriba de todo en Itinerario.
  // No calcula nada nuevo: ensambla dayPlan/rainFor/outdoorFor, ya
  // verificados abajo. null si hoy no cae dentro del viaje.
  function hoyBlock(it) {
    const hoy = diaHoyYMD();
    if (!hoy) return null;
    const day = it.days.find(d => d.date === hoy);
    if (!day) return null;

    const plan = dayPlan(day);
    const r = rainFor(day);
    const od = outdoorFor(day);

    const box = el('section', 'hoy-card');
    const head = el('p', 'hoy-card__head');
    head.innerHTML = `Hoy, ${esc(fmtDiaSemana(hoy))} ${esc(fmtFecha(hoy))} (día ${day.idx})`;
    box.appendChild(head);

    if (plan.veredicto) {
      const label = verdictLabel(plan);
      const bits = [];
      if (plan.salirMin != null && plan.salirMin >= plan.inicioMin - 120) {
        bits.push('Sal sobre las <span class="mono">' + hhmmFromMin(plan.salirMin) + '</span>');
      }
      if (plan.drivingMin > 0 && plan.volante === 'ok') bits.push(fmtDur(plan.drivingMin) + ' de trayecto');
      const kmTxt = day.km >= 1 ? ' · ' + Math.round(day.km) + ' km' : '';
      const p = el('p', 'hoy-card__plan');
      p.innerHTML = `<span class="day-verdict day-verdict--${plan.veredicto}">${esc(label)}</span>${kmTxt}` +
        (bits.length ? '<br>' + bits.join(' · ') : '');
      box.appendChild(p);
    }

    if (r) {
      const pr = el('p', 'hoy-card__rain' + (r.level === 'fuerte' ? ' hoy-card__rain--fuerte' : ''));
      pr.innerHTML = `🌧️ ${esc(r.txt)}`;
      box.appendChild(pr);
    }
    if (od && od.level !== 'bueno') {
      const po = el('p', 'hoy-card__out');
      po.innerHTML = `${od.level === 'malo' ? '🌧️' : '⛅'} ${esc(od.txt)}`;
      box.appendChild(po);
    }

    return box;
  }

  // Nudge de la cabecera del Itinerario: solo cuando hay días flojos Y días
  // buenos (o sea, algo que mover y a dónde). No reordena nada — lo decide
  // el usuario.
  function outdoorRankBlock(it) {
    const box = el('section', 'itin-outlook');
    const rated = it.days.map(d => ({ d, o: outdoorFor(d) })).filter(x => x.o);
    const flojos = rated.filter(x => x.o.level !== 'bueno').sort((a, b) => b.o.score - a.o.score);
    const buenos = rated.filter(x => x.o.level === 'bueno').sort((a, b) => a.o.score - b.o.score);
    if (!flojos.length || !buenos.length) { box.hidden = true; return box; }
    const tag = x => `Día ${x.d.idx} (${fmtFecha(x.d.date)})`;
    const peores = flojos.slice(0, 2).map(tag);
    const mejores = buenos.slice(0, 3).map(tag);
    box.innerHTML =
      `<p>Días flojos por lluvia: <b>${esc(peores.join(' · '))}</b> · mejor pinta: ${esc(mejores.join(' · '))}.</p>` +
      `<p class="itin-outlook__nudge">Si puedes mover una visita al aire libre o una excursión movible, llévala a un día con mejor previsión.</p>`;
    return box;
  }

  // Aviso de lluvia fuerte (Open-Meteo) para todo el día, en la zona de la
  // pernocta. Total de mm sobre 24 h porque en temporada de monzón lo que
  // importa es si va a caer un chaparrón fuerte en algún momento del día
  // (puede afectar a un ferri de tarde igual que a un plan de mañana), no
  // solo una franja horaria como el aviso de viento del hermano de Islandia.
  function rainFor(day) {
    const P = (state.meteo && state.meteo.precip) || {};
    const keys = Object.keys(P);
    if (!keys.length) return null;
    const loc = locForDate(day.date);
    if (isFallbackCenter(loc)) return null;   // día sin alojamiento: no inventar lluvia
    let best = null, bestD = Infinity;
    keys.forEach(k => {
      const [la, lo] = k.split(',').map(Number);
      const d = haversine({ lat: la, lng: lo }, loc);
      if (d < bestD) { bestD = d; best = k; }
    });
    if (bestD > 40) return null;

    const ini = Date.parse(day.date + 'T00:00:00+07:00');
    const fin = Date.parse(day.date + 'T23:59:59+07:00');
    let mm = 0, maxProb = null;
    (P[best] || []).forEach(x => {
      const ms = Date.parse(x.t);
      if (ms < ini || ms > fin) return;
      if (typeof x.mm === 'number') mm += x.mm;
      if (typeof x.prob === 'number' && (maxProb == null || x.prob > maxProb)) maxProb = x.prob;
    });
    if (!(mm > 0) && maxProb == null) return null;

    const mmR = Math.round(mm);
    if (mmR < 8 && (maxProb == null || maxProb < 60)) return null;

    let level, txt;
    if (mmR >= 40) {
      level = 'fuerte';
      txt = `lluvia fuerte prevista (~${mmR} mm) — lleva poncho y bolsa estanca; posibles cancelaciones de ferri y calles anegadas`;
    } else if (mmR >= 15 || (maxProb != null && maxProb >= 75)) {
      level = 'aviso';
      txt = `lluvia probable (~${mmR} mm${maxProb != null ? ', ' + maxProb + '%' : ''}) — lleva poncho por si acaso`;
    } else {
      level = 'info';
      txt = `posible chubasco (~${mmR} mm${maxProb != null ? ', ' + maxProb + '%' : ''})`;
    }
    const stale = !!(state.meteo && state.meteo.fetched) && (Date.now() - Date.parse(state.meteo.fetched)) > 18 * 3600e3;
    if (stale) {
      const h = Math.round((Date.now() - Date.parse(state.meteo.fetched)) / 3600e3);
      txt += ` (hace ${h} h)`;
    }
    return { txt, level, stale };
  }

  // Condiciones para planes al aire libre ese día (nubes + lluvia del tramo
  // diurno). Devuelve null si no hay dato; el nivel 'bueno' no se pinta.
  // Memoizado por (fecha + fetch): renderItinerario lo llama 2× por día.
  let _odCache = {};
  function outdoorFor(day) {
    const M = state.meteo || {};
    const ck = day.date + '|' + (M.fetched || '');
    if (ck in _odCache) return _odCache[ck];
    const done = r => { _odCache[ck] = r; return r; };

    const loc = locForDate(day.date);
    if (isFallbackCenter(loc)) return done(null);
    const allKeys = [...new Set([].concat(Object.keys(M.clouds || {}), Object.keys(M.precip || {})))];
    let key = null, bestD = Infinity;
    allKeys.forEach(k => {
      const [la, lo] = k.split(',').map(Number);
      const d = haversine({ lat: la, lng: lo }, loc);
      if (d < bestD) { bestD = d; key = k; }
    });
    if (key == null || bestD > 40) return done(null);

    const ini = Date.parse(day.date + 'T08:00:00+07:00');
    const fin = Date.parse(day.date + 'T20:00:00+07:00');
    const inWin = t => { const ms = Date.parse(t); return ms >= ini && ms <= fin; };

    let cSum = 0, cN = 0;
    ((M.clouds && M.clouds[key]) || []).forEach(x => { if (inWin(x.t) && typeof x.pct === 'number') { cSum += x.pct; cN++; } });
    let pSum = 0, pN = 0, hoursRain = 0;
    ((M.precip && M.precip[key]) || []).forEach(x => { if (inWin(x.t) && typeof x.mm === 'number') { pSum += x.mm; pN++; if (x.mm >= 0.5) hoursRain++; } });
    if (!cN && !pN) return done(null);

    const avgCloud = cN ? cSum / cN : null;
    const score = (avgCloud != null && avgCloud >= 85 ? 0.4 : 0)
      + Math.min(pSum, 10) / 3
      + (hoursRain >= 4 ? 0.9 : hoursRain >= 2 ? 0.4 : 0);
    const level = score < 1.1 ? 'bueno' : score < 2.4 ? 'regular' : 'malo';

    const fac = [];
    if (avgCloud != null && avgCloud >= 60) fac.push(`nubes ${Math.round(avgCloud)}%`);
    if (pSum >= 1) fac.push(`${pSum.toLocaleString('es-ES', { maximumFractionDigits: pSum < 10 ? 1 : 0 })} mm`);
    const cola = fac.length ? ': ' + fac.join(' · ') : '';
    let txt = level === 'malo' ? 'día de plan B' + cola + ' — alternativas en Transporte y guías'
      : level === 'regular' ? 'día irregular' + cola
      : '';

    const stale = !!M.fetched && (Date.now() - Date.parse(M.fetched)) > 18 * 3600e3;
    if (stale && txt) txt += ` (hace ${Math.round((Date.now() - Date.parse(M.fetched)) / 3600e3)} h)`;
    return done({ level, txt, stale, score });
  }

  // embebido: el día va dentro de un bloque de días sin itinerario
  // (grupoBlock), así que lleva un subtítulo en vez de su propia cabecera.
  function dayBlock(day, embebido) {
    const wrap = el(embebido ? 'div' : 'section', embebido ? 'day-sub' : 'day');
    const esHoy = day.date === hoyYMD();
    if (esHoy && !embebido) wrap.classList.add('day--hoy');
    const plan = dayPlan(day);
    const pd = embebido ? null : PLAN_DIAS[day.date];

    if (embebido) {
      const h = el('h4', 'day-sub__t');
      h.innerHTML = `Día ${day.idx} · <span>${esc(fmtDiaSemana(day.date))} ${esc(fmtFecha(day.date))}</span>${esHoy ? ' <b class="day-sub__now">En curso</b>' : ''}`;
      wrap.appendChild(h);
    } else {
      const head = el('div', 'day__head');
      head.innerHTML =
        `<span class="day__badge"><small>Día</small>${day.idx}</span>` +
        `<div class="day__titles"><h3 class="day__date">${fmtFecha(day.date)}</h3><p class="day__wd">${esc(fmtDiaSemana(day.date))}</p>${esHoy ? '<b class="day__now">En curso</b>' : ''}</div>`;
      wrap.appendChild(head);
      if (pd) wrap.insertAdjacentHTML('beforeend', planCabecera(pd.zona, pd.titulo, pd.hotel));
    }

    if (plan.veredicto) {
      const label = verdictLabel(plan);
      const bits = [];
      if (plan.salirMin != null && plan.salirMin >= plan.inicioMin - 120) {
        bits.push('Sal sobre las <span class="mono">' + hhmmFromMin(plan.salirMin) + '</span>');
      }
      if (plan.endMin != null && plan.endMin !== plan.inicioMin) {
        bits.push('fin ~<span class="mono">' + hhmmFromMin(plan.endMin) + '</span>');
      }
      if (plan.drivingMin > 0 && plan.volante === 'ok') bits.push(fmtDur(plan.drivingMin) + ' de trayecto');
      const aria = label || (plan.veredicto === 'verde' ? 'Día holgado' : 'Día ' + plan.veredicto);
      const verdict = `<span class="day-verdict day-verdict--${plan.veredicto}" role="img" aria-label="${esc(aria)}"${plan.veredicto === 'verde' ? ' title="Día holgado"' : ''}>${esc(label)}</span>`;
      const p = el('p', 'day-plan');
      p.innerHTML = verdict + (bits.length ? ' ' + bits.join(' · ') : '');
      wrap.appendChild(p);
    }

    const od = outdoorFor(day);
    if (od && od.level !== 'bueno') {
      const po = el('p', 'day-out day-out--' + od.level);
      po.innerHTML = `${od.level === 'malo' ? '🌧️' : '⛅'} ${esc(od.txt)}`;
      wrap.appendChild(po);
    }

    const r = rainFor(day);
    if (r) {
      const pr = el('p', 'day-rain' + (r.level ? ' day-rain--' + r.level : ''));
      pr.title = 'Precipitación de Open-Meteo en la celda de la pernocta, total del día';
      pr.innerHTML = `🌧️ ${esc(r.txt)}`;
      wrap.appendChild(pr);
    }

    if (pd) {
      if (pd.nota) wrap.insertAdjacentHTML('beforeend', `<p class="plan-nota">${linkify(pd.nota)}</p>`);
      if (pd.franjas.length) wrap.insertAdjacentHTML('beforeend', franjasHtml(pd.franjas));
    }

    if (!day.items.length) {
      if (!pd && !embebido) wrap.appendChild(notice('Día libre — sin actividades planificadas.'));
      wrap.appendChild(diarioBlock(day));
      return wrap;
    }

    if (pd || embebido) {
      const t = el('p', 'plan-agenda');
      t.textContent = 'Agenda: vuelos, hotel y lo que añadáis';
      wrap.appendChild(t);
    }
    const tl = el('div', 'timeline');
    let prevLoc = null;
    day.items.forEach(it => {
      if (it.loc && it.loc.lat != null && prevLoc) {
        if (haversine(prevLoc, it.loc) >= MIN_LEG_KM) tl.appendChild(legRow(prevLoc, it.loc));
      }
      if (it.loc && it.loc.lat != null) prevLoc = it.loc;
      tl.appendChild(slotRow(it));
    });
    wrap.appendChild(tl);

    const pts = day.items.filter(i => i.loc && i.loc.lat != null).map(i => i.loc);
    if (pts.length) {
      const row = el('div', 'day__actions');
      const g = mapsLink('g', pts); g.textContent = 'Google Maps';
      const a = mapsLink('a', pts); a.textContent = 'Apple Maps';
      const w = mapsLink('w', pts); w.textContent = 'Waze';
      row.append(g, a, w);
      wrap.appendChild(row);
    }

    wrap.appendChild(diarioBlock(day));
    return wrap;
  }

  /* ---------- Plan del viaje: franjas, días de opciones y resumen ---------- */
  const URL_RE = /https?:\/\/[^\s]+/g;
  function hostDe(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; }
  }
  // Texto con URLs sueltas: el href es la URL exacta del plan; se muestra
  // solo el dominio para que no ocupe media pantalla en el móvil.
  function linkify(txt) {
    txt = String(txt || '');
    let out = '', last = 0, m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(txt))) {
      const url = m[0].replace(/[).,;]+$/, '');
      out += esc(txt.slice(last, m.index)) +
        `<a class="plan-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(hostDe(url))} ↗</a>`;
      last = m.index + url.length;
      URL_RE.lastIndex = last;
    }
    return out + esc(txt.slice(last));
  }
  function planLinks(l) {
    if (!l || !l.length) return '';
    return `<div class="slot__nav">` +
      l.map(([t, u]) => `<a class="slot__go" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ›</a>`).join('') +
      `</div>`;
  }
  function planFoto(e) {
    const src = e.foto && FOTO[e.foto];
    if (src) {
      return `<figure class="plan-foto"><img src="${esc(src)}" alt="${esc(e.n || e.alt || '')}" loading="lazy" onerror="this.remove()">` +
        (e.desc ? `<figcaption>${esc(e.desc)}</figcaption>` : '') + `</figure>`;
    }
    return e.desc ? `<p class="plan-desc">${esc(e.desc)}</p>` : '';
  }
  function planEntrada(e) {
    if (typeof e === 'string') return `<p class="plan-txt">${linkify(e)}</p>`;
    if (e.h) return `<p class="plan-subt">${esc(e.h)}</p>`;
    if (!e.n) return planFoto(e);
    return `<div class="plan-item">` +
      `<div class="plan-item__n">${linkify(e.n)}${e.p ? ` <span class="plan-precio">${esc(e.p)}</span>` : ''}</div>` +
      (e.x ? `<p class="plan-item__x">${linkify(e.x)}</p>` : '') +
      planFoto(e) + planLinks(e.l) + `</div>`;
  }
  function franjasHtml(franjas) {
    return `<div class="franjas">` + franjas.map(fr =>
      `<section class="franja"><h4 class="franja__label">${esc(fr.f)}${fr.h ? ` <span>(${esc(fr.h)})</span>` : ''}</h4>` +
      `<div class="franja__body">${fr.e.length ? fr.e.map(planEntrada).join('') : '<p class="franja__vacia">—</p>'}</div></section>`
    ).join('') + `</div>`;
  }
  function opcionHtml(o) {
    return `<div class="slot__opcion plan-op">` +
      `<div class="slot__opcion-nombre">${esc(o.n)}</div>` +
      (o.p ? `<div class="plan-precio plan-precio--op">${esc(o.p)}</div>` : '') +
      (o.x ? `<p class="plan-item__x">${linkify(o.x)}</p>` : '') +
      (o.pro ? `<p class="plan-op__pro">✅ ${esc(o.pro)}</p>` : '') +
      (o.contra ? `<p class="plan-op__contra">❌ ${esc(o.contra)}</p>` : '') +
      planFoto(o) + planLinks(o.l) + `</div>`;
  }
  function planCabecera(zona, titulo, hotel) {
    const t = zona === titulo ? `<b>${esc(zona)}</b>` : `<b>${esc(zona)}</b> · ${esc(titulo)}`;
    return `<div class="plan-head"><p class="plan-head__t">${t}</p>` +
      (hotel ? `<p class="plan-head__h">🛏️ ${esc(hotel)}</p>` : '') + `</div>`;
  }
  function resumenBlock() {
    const box = el('section', 'plan-resumen');
    box.innerHTML = `<h3 class="plan-resumen__t">El viaje · somos ${PLAN_RESUMEN.personas}</h3><ul>` +
      PLAN_RESUMEN.reparto.map(([f, t]) => `<li><span class="plan-resumen__f">${esc(f)}</span><span>${esc(t)}</span></li>`).join('') +
      `</ul>`;
    return box;
  }
  // Días sin itinerario (Phi Phi, Phuket): logística fija + opciones para
  // cualquiera de los días, y debajo la agenda y el diario de cada día.
  function grupoBlock(g, days) {
    const gd = days.filter(d => g.dias.includes(d.date));
    const wrap = el('section', 'day day--grupo');
    if (gd.some(d => d.date === hoyYMD())) wrap.classList.add('day--hoy');
    const a = gd[0], z = gd[gd.length - 1];
    const head = el('div', 'day__head');
    head.innerHTML =
      `<span class="day__badge day__badge--rango"><small>Días</small>${a.idx}–${z.idx}</span>` +
      `<div class="day__titles"><h3 class="day__date">${fmtFecha(a.date)} – ${fmtFecha(z.date)}</h3>` +
      `<p class="day__wd">${esc(gd.map(d => fmtDiaSemana(d.date)).join(' · '))}</p></div>`;
    wrap.appendChild(head);
    let html = planCabecera(g.zona, 'Sin itinerario (opciones a decidir allí)', g.hotel) +
      franjasHtml([{ f: 'Logística fija', e: g.logistica }]);
    g.secciones.forEach(sec => {
      html += `<div class="slot__opciones plan-opciones"><p class="slot__opciones-label">${esc(sec.titulo)}</p>` +
        `<p class="plan-opciones__nota">Valen para cualquiera de los dos días.</p>` +
        sec.opciones.map(opcionHtml).join('') + `</div>`;
    });
    if (g.ideas.length) html += franjasHtml([{ f: 'Ideas sueltas', e: g.ideas }]);
    wrap.insertAdjacentHTML('beforeend', html);
    gd.forEach(d => wrap.appendChild(dayBlock(d, true)));
    return wrap;
  }

  // Diario de viaje: solo texto. Sin re-render al escribir: nada más en la
  // tarjeta depende de este texto, así que el handler solo actualiza el
  // state y guarda.
  function diarioBlock(day) {
    const wrap = el('div', 'day-diario');
    const label = el('p', 'day-diario__label');
    label.textContent = '📝 Diario del día';
    const ta = el('textarea', 'day-diario__text');
    ta.placeholder = 'Escribe algo sobre este día…';
    ta.value = state.diario[day.date] || '';
    ta.rows = 3;
    ta.addEventListener('input', () => {
      const v = ta.value;
      if (v) state.diario[day.date] = v; else delete state.diario[day.date];
      save();
    });
    wrap.append(label, ta);
    return wrap;
  }

  // <figure> con foto + una explicación debajo de qué es (no solo el
  // nombre, que ya sale en el título de arriba). onerror quita la figura
  // entera si la URL de Commons deja de servir el archivo (public page,
  // sin control sobre terceros).
  function fotoBlock(foto, alt, caption, wrapCls, imgCls, capCls) {
    if (!foto) return '';
    return `<figure class="${wrapCls}">` +
      `<img class="${imgCls}" src="${esc(foto)}" alt="${esc(alt || '')}" loading="lazy" onerror="this.parentElement.remove()">` +
      (caption ? `<figcaption class="${capCls}">${esc(caption)}</figcaption>` : '') +
      `</figure>`;
  }

  function opcionesHtml(opciones) {
    if (!opciones || !opciones.length) return '';
    return `<div class="slot__opciones"><p class="slot__opciones-label">Elige una opción</p>` +
      opciones.map(o =>
        `<div class="slot__opcion">` +
        `<div class="slot__opcion-nombre">${esc(o.nombre || '')}</div>` +
        (o.notas ? `<div class="slot__opcion-notas">${esc(o.notas)}</div>` : '') +
        fotoBlock(o.foto, o.nombre, o.desc, 'slot__opcion-foto-wrap', 'slot__opcion-foto', 'slot__opcion-foto-caption') +
        `</div>`
      ).join('') +
      `</div>`;
  }

  function slotRow(it) {
    const r = el('div', 'slot slot--' + it.t + (it.quiet ? ' slot--quiet' : ''));
    const time = el('div', 'slot__time');
    time.textContent = it.hora || '';
    const body = el('div', 'slot__body');
    body.innerHTML =
      `<div class="slot__tag">${esc(it.tag)}${it.nota ? ' · ' + esc(it.nota) : ''}</div>` +
      `<div class="slot__title">${esc(it.titulo)}</div>` +
      (it.sub ? `<div class="slot__sub">${esc(it.sub)}</div>` : '') +
      (it.notas ? `<details class="slot__notes"><summary>Info importante</summary><p>${esc(it.notas)}</p></details>` : '') +
      fotoBlock(it.foto, it.titulo, it.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption') +
      opcionesHtml(it.opciones);
    if (it.loc && it.loc.lat != null) {
      const nav = el('div', 'slot__nav');
      const g = mapsLink('g', [it.loc]); g.className = 'slot__go'; g.textContent = 'Google Maps ›';
      const a = mapsLink('a', [it.loc]); a.className = 'slot__go'; a.textContent = 'Apple Maps ›';
      const w = mapsLink('w', [it.loc]); w.className = 'slot__go'; w.textContent = 'Waze ›';
      nav.append(g, a, w);
      body.appendChild(nav);
    }
    r.append(time, body);
    return r;
  }

  function legRow(a, b) {
    const { km, min } = driveByRoad(a, b);
    const r = el('div', 'leg');
    r.innerHTML = `<span class="leg__ico">🚗</span><span>≈ ${fmtDur(min)} · ${km.toFixed(km < 10 ? 1 : 0)} km de trayecto</span>`;
    return r;
  }

  function unassignedBlock(items) {
    const w = el('section', 'day');
    w.innerHTML =
      `<div class="day__head"><span class="day__badge"><small>Sin día</small>${items.length}</span><div class="day__titles"><h3 class="day__date">Por planificar</h3></div></div>`;
    w.appendChild(notice('Sin día asignado. Edita cada elemento y ponle una fecha dentro del viaje para colocarlo en el itinerario.'));
    const tl = el('div', 'timeline');
    items.forEach(it => tl.appendChild(slotRow(Object.assign({}, it, { hora: '' }))));
    w.appendChild(tl);
    return w;
  }

  function notice(txt) {
    const d = el('div', 'notice');
    d.textContent = txt;
    return d;
  }

  /* ==========================================================
     Enlaces a Google Maps / Apple Maps / Waze
     provider: 'g' = Google · 'a' = Apple · 'w' = Waze
     ========================================================== */
  function gmapsHref(pts) {
    const P = (pts || []).filter(p => p && p.lat != null);
    if (P.length <= 1) {
      const p = P[0];
      return p ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : '#';
    }
    const o = P[0], d = P[P.length - 1];
    const w = P.slice(1, -1).slice(0, 9).map(p => `${p.lat},${p.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}` +
      (w ? `&waypoints=${encodeURIComponent(w)}` : '');
  }

  function mapsLink(provider, pts) {
    const a = el('a', 'btn btn--ghost btn--sm');
    a.target = '_blank';
    a.rel = 'noopener';
    const P = (pts || []).filter(p => p && p.lat != null);

    if (provider === 'w') {
      // Waze no admite rutas con varias paradas: navega al destino final.
      const d = P[P.length - 1] || P[0];
      a.href = d ? `https://waze.com/ul?ll=${d.lat},${d.lng}&navigate=yes` : '#';
      return a;
    }

    if (provider === 'g') {
      a.href = gmapsHref(P);
    } else {
      if (P.length <= 1) {
        const p = P[0];
        a.href = p ? `https://maps.apple.com/?ll=${p.lat},${p.lng}&q=${encodeURIComponent('Punto')}` : '#';
      } else {
        const o = P[0], d = P[P.length - 1];
        a.href = `https://maps.apple.com/?dirflg=d&saddr=${o.lat},${o.lng}&daddr=${d.lat},${d.lng}`;
      }
    }
    return a;
  }

  /* ==========================================================
     Pantalla: DÓNDE COMER — estrellas Michelin y recomendados
     cerca de cada alojamiento
     ========================================================== */
  // Investigado y verificado en septiembre de 2026 (Guía Michelin Thailand
  // 2026: 43 restaurantes con estrella, coordenadas de la propia guía).
  // Krabi/Ao Nang y Koh Phi Phi no están cubiertos por la Guía Michelin —
  // ahí solo hay recomendados, no estrellas. Dentro de cada número de
  // estrellas, ordenados de más barato a más caro. Precios revisados el
  // 30 de septiembre de 2026 en las webs y cartas oficiales de cada sitio.
  const michelin = path => 'https://guide.michelin.com/th/en/' + path;
  const bkk = slug => michelin('bangkok-region/bangkok/restaurant/' + slug);
  const cnx = slug => michelin('chiang-mai-region/chiang-mai/restaurant/' + slug);
  const pkt = slug => michelin('phuket-region/phuket/restaurant/' + slug);
  const COMER_SEED = [
    { zona: 'Bangkok', fechas: '25 – 29 nov (4 noches)',
      intro: 'Bangkok tiene 39 restaurantes con estrella Michelin en la guía 2026, y hay 2 más en Nonthaburi, justo al norte. Los precios son por persona y sin bebidas; «++» significa que se suma un 10 % de servicio y un 7 % de IVA (el importe en € ya lo incluye). Debajo, Bib Gourmand (buena comida a buen precio, de la misma guía) y clásicos callejeros.',
      estrellas: [
        { nombre: 'Sorn', estrellas: 3, tipo: 'Cocina del sur de Tailandia', precio: 'Menú degustación ~7.800 THB++', precioThb: [7800, 7800], q: 'Sorn restaurant Bangkok', web: bkk('sorn'), loc: { lat: 13.7231, lng: 100.5685 } },
        { nombre: 'Sühring', estrellas: 3, tipo: 'Alemana moderna, en una villa de Sathorn', precio: 'Menú degustación ~7.800–9.800 THB++', precioThb: [7800, 9800], q: 'Suhring restaurant Bangkok', web: bkk('suhring'), loc: { lat: 13.7108, lng: 100.5457 } },
        { nombre: 'Côte by Mauro Colagreco', estrellas: 2, tipo: 'Mediterránea de la Riviera, en el Capella junto al río', precio: 'Almuerzo de 4 platos 3.800 THB++ · menú Signature 6.800 THB++ · Carte Blanche 8.000 THB++', precioThb: [3800, 8000], q: 'Cote by Mauro Colagreco Capella Bangkok', web: bkk('cote-by-mauro-colagreco'), loc: { lat: 13.7131, lng: 100.5108 } },
        { nombre: 'INDDEE', estrellas: 2, tipo: 'India contemporánea, menú de 10 pasos', precio: 'Menú de 8 o 10 pasos 4.200–4.900 THB++', precioThb: [4200, 4900], q: 'INDDEE Bangkok', web: bkk('inddee'), loc: { lat: 13.7377, lng: 100.5423 } },
        { nombre: 'Anne-Sophie Pic at Le Normandie', estrellas: 2, tipo: 'Francesa contemporánea, en el Mandarin Oriental', precio: 'Almuerzo de 3 platos 4.500 THB++ · menú Voyage (cena) 9.000 THB++', precioThb: [4500, 9000], q: 'Le Normandie Mandarin Oriental Bangkok', web: bkk('le-normandie'), loc: { lat: 13.7239, lng: 100.5139 } },
        { nombre: 'R-Haan', estrellas: 2, tipo: 'Cocina real tailandesa', precio: 'Menú degustación de temporada 6.512 THB++', precioThb: [6512, 6512], q: 'R-Haan restaurant Bangkok', web: bkk('r-haan'), loc: { lat: 13.7318, lng: 100.5796 } },
        { nombre: 'Gaa', estrellas: 2, tipo: 'India contemporánea', precio: 'Menú degustación 6.200 THB++', precioThb: [6200, 6200], q: 'Gaa restaurant Sukhumvit 53 Bangkok', web: bkk('gaa-1194845'), loc: { lat: 13.7273, lng: 100.5783 } },
        { nombre: 'Baan Tepa', estrellas: 2, tipo: 'Tailandesa contemporánea, con verduras de su propio huerto', precio: 'Menú degustación de 7 pasos 6.200 THB++ (solo cena)', precioThb: [6200, 6200], q: 'Baan Tepa Ramkhamhaeng Bangkok', web: bkk('baan-tepa'), loc: { lat: 13.7608, lng: 100.6264 } },
        { nombre: 'Mezzaluna', estrellas: 2, tipo: 'Francesa contemporánea, planta 65 de la State Tower (lebua)', precio: 'Menú de 7 pasos 8.000 THB++ · 9 pasos 9.600 THB++', precioThb: [8000, 9600], q: 'Mezzaluna lebua State Tower Bangkok', web: bkk('mezzaluna'), loc: { lat: 13.7221, lng: 100.5169 } },
        { nombre: "Chef's Table", estrellas: 2, tipo: 'Francesa contemporánea, planta 61 de la State Tower (lebua)', precio: 'Menú de 5 pasos 6.800 THB++ · 7 pasos 9.200 THB++', precioThb: [6800, 9200], q: "Chef's Table lebua Bangkok", web: bkk('chef-s-table1184372'), loc: { lat: 13.7215, lng: 100.5172 } },
        { nombre: 'Jay Fai', estrellas: 1, tipo: 'Street food — tortilla de cangrejo', nota: 'Sin reservas y con colas larguísimas: ve a primera hora.', precio: 'Tortilla de cangrejo 1.500 THB (la «VVIP», 4.000); ~1.500–2.500 THB/persona', precioThb: [1500, 2500], q: 'Jay Fai restaurant Bangkok', web: bkk('jay-fai'), loc: { lat: 13.7526, lng: 100.5047 } },
        { nombre: 'Saneh Jaan', estrellas: 1, tipo: 'Tailandesa clásica, en Wireless Road', precio: 'Almuerzo desde ~1.500 THB++ · menús de cena 3.200–3.600 THB++', precioThb: [1500, 3600], q: 'Saneh Jaan Bangkok', web: bkk('saneh-jaan'), loc: { lat: 13.7356, lng: 100.5458 } },
        { nombre: 'Mia', estrellas: 1, tipo: 'Contemporánea entre Europa y Asia', precio: 'Almuerzo de fin de semana 2.850 THB++ · cena «Taste of Mia» 5.850 THB++', precioThb: [2850, 5850], q: 'Mia restaurant Bangkok', web: bkk('mia'), loc: { lat: 13.7212, lng: 100.5713 } },
        { nombre: 'Resonance', estrellas: 1, tipo: 'Cocina moderna, en Sukhumvit 65', precio: 'Almuerzo del sábado 2.900 THB++ · cena 3.900–7.200 THB++ (vegetariano, 3.200++)', precioThb: [2900, 7200], q: 'Resonance restaurant Sukhumvit 65 Bangkok', web: bkk('resonance'), loc: { lat: 13.7214, lng: 100.5916 } },
        { nombre: 'Blue by Alain Ducasse', estrellas: 1, tipo: 'Francesa contemporánea, en ICONSIAM', precio: 'Almuerzo de 3 platos 2.950 THB++ · cena 6.500–8.500 THB++', precioThb: [2950, 8500], q: 'Blue by Alain Ducasse ICONSIAM', web: bkk('blue-by-alain-ducasse'), loc: { lat: 13.7266, lng: 100.5106 } },
        { nombre: 'Maison Dunand', estrellas: 1, tipo: 'Cocina alpina francesa, en Sathorn', precio: 'Menús de cena ~4.950–6.500 THB (precio final)', precioThb: [4950, 6500], q: 'Maison Dunand Bangkok', web: bkk('maison-dunand'), loc: { lat: 13.7229, lng: 100.5275 } },
        { nombre: 'Elements, Inspired by Ciel Bleu', estrellas: 1, tipo: 'Francesa-japonesa, planta 25 del hotel Okura', precio: 'Menús de 4 a 8 pasos ~4.900–7.200 THB++ (solo cena)', precioThb: [4900, 7200], q: 'Elements Okura Prestige Bangkok', web: bkk('elements'), loc: { lat: 13.7429, lng: 100.5476 } },
        { nombre: 'Chim by Siam Wisdom', estrellas: 1, tipo: 'Tailandesa, en Dusit', precio: 'Almuerzo 3.250 THB++ · menú completo 4.250 THB++', precioThb: [3250, 4250], q: 'Chim by Siam Wisdom Bangkok', web: bkk('chim-by-siam-wisdom'), loc: { lat: 13.7892, lng: 100.5186 } },
        { nombre: 'Coda', estrellas: 1, tipo: 'Tailandesa contemporánea, en Wireless Road', precio: '~3.490 THB++', precioThb: [3490, 3490], q: 'Coda restaurant Wireless Road Bangkok', web: bkk('coda-1206365'), loc: { lat: 13.7360, lng: 100.5461 } },
        { nombre: 'Haoma', estrellas: 1, tipo: 'India, cocina de huerto propio, en Sukhumvit 31', precio: '~3.500–4.990 THB++', precioThb: [3500, 4990], q: 'Haoma Bangkok', web: bkk('haoma'), loc: { lat: 13.7435, lng: 100.5677 } },
        { nombre: 'etcha', estrellas: 1, tipo: 'Creativa, en el Chatrium Grand', precio: 'Menú de 8 pasos 3.750 THB++ · 11 pasos 4.750 THB++', precioThb: [3750, 4750], q: 'etcha Chatrium Grand Bangkok', web: bkk('etcha'), loc: { lat: 13.7499, lng: 100.5349 } },
        { nombre: 'NAWA', estrellas: 1, tipo: 'Tailandesa contemporánea, en Sukhumvit 61', precio: 'Menú degustación ~4.800 THB++', precioThb: [4800, 4800], q: 'NAWA restaurant Bangkok', web: bkk('nawa'), loc: { lat: 13.7233, lng: 100.5839 } },
        { nombre: 'Wana Yook', estrellas: 1, tipo: 'Tailandesa contemporánea, junto a Victory Monument', precio: 'Menú degustación de ~9 pasos 4.950 THB++', precioThb: [4950, 4950], q: 'Wana Yook Bangkok', web: bkk('wana-yook'), loc: { lat: 13.7632, lng: 100.5377 } },
        { nombre: 'AKKEE', estrellas: 1, tipo: 'Tailandesa contemporánea', nota: 'En Nonthaburi (Pak Kret), ~20 km al norte del centro.', precio: 'Almuerzo 2.350 THB++ · menú de cena 3.850 THB++', precioThb: [2350, 3850], q: 'AKKEE restaurant Nonthaburi', web: michelin('nonthaburi-region/nonthaburi/restaurant/akkee'), loc: { lat: 13.8985, lng: 100.5151 } },
        { nombre: 'Nahm', estrellas: 1, tipo: 'Tailandesa, en el COMO Metropolitan', precio: 'Menú degustación ~3.900 THB++', precioThb: [3900, 3900], q: 'Nahm restaurant Bangkok', web: bkk('nahm'), loc: { lat: 13.7232, lng: 100.5390 } },
        { nombre: 'Juksunchae', estrellas: 1, tipo: 'Coreana contemporánea, en Sukhumvit 49', precio: '~3.900 THB++', precioThb: [3900, 3900], q: 'Juksunchae Bangkok', web: bkk('juksunchae'), loc: { lat: 13.7328, lng: 100.5767 } },
        { nombre: 'Samrub Samrub Thai', estrellas: 1, tipo: 'Tailandesa, en Silom', precio: 'Menú degustación 4.290 THB++', precioThb: [4290, 4290], q: 'Samrub Samrub Thai Bangkok', web: bkk('samrub-samrub-thai'), loc: { lat: 13.7269, lng: 100.5374 } },
        { nombre: 'Bo.lan', estrellas: 1, tipo: 'Tailandesa, en Sukhumvit 53', precio: 'Almuerzo 2.880 THB++ · cena 4.600–4.800 THB++', precioThb: [2880, 4800], q: 'Bo.lan restaurant Bangkok', web: bkk('bo-lan'), loc: { lat: 13.7263, lng: 100.5779 } },
        { nombre: 'Aksorn', estrellas: 1, tipo: 'Tailandesa de recetarios antiguos (David Thompson), en Charoen Krung', precio: 'Menú degustación 4.150 THB++', precioThb: [4150, 4150], q: 'Aksorn Bangkok Central The Original Store', web: bkk('aksorn'), loc: { lat: 13.7245, lng: 100.5162 } },
        { nombre: 'Le Du', estrellas: 1, tipo: 'Tailandesa contemporánea, en Silom', precio: 'Le Du Journey 4.500 THB++ · Le Du Experience 5.500 THB++', precioThb: [4500, 5500], q: 'Le Du restaurant Bangkok', web: bkk('le-du'), loc: { lat: 13.7289, lng: 100.5348 } },
        { nombre: '80/20', estrellas: 1, tipo: 'Tailandesa contemporánea, en Charoen Krung', precio: 'Menú de 14 pasos 4.500 THB++', precioThb: [4500, 4500], q: '80/20 restaurant Charoen Krung Bangkok', web: bkk('80-20'), loc: { lat: 13.7311, lng: 100.5155 } },
        { nombre: 'Signature', estrellas: 1, tipo: 'Francesa, en el VIE Hotel', precio: 'Menú de 5 pasos 4.800 THB++ · 8 pasos 5.800 THB++', precioThb: [4800, 5800], q: 'Signature restaurant VIE Hotel Bangkok', web: bkk('signature-1194955'), loc: { lat: 13.7505, lng: 100.5320 } },
        { nombre: 'GOAT', estrellas: 1, tipo: 'Tailandesa contemporánea, en Ekkamai', precio: '~4.590 THB++', precioThb: [4590, 4590], q: 'GOAT restaurant Ekkamai Bangkok', web: bkk('goat'), loc: { lat: 13.7274, lng: 100.5872 } },
        { nombre: 'Cannubi by Umberto Bombana', estrellas: 1, tipo: 'Italiana contemporánea, en el Dusit Thani', precio: 'Almuerzo 1.950–2.500 THB++ · cena de 7 pasos 5.500 THB++', precioThb: [1950, 5500], q: 'Cannubi Dusit Thani Bangkok', web: bkk('cannubi-by-umberto-bombana'), loc: { lat: 13.7280, lng: 100.5377 } },
        { nombre: 'IGNIV', estrellas: 1, tipo: 'Europea contemporánea para compartir, en el St. Regis', precio: 'Almuerzo 2.800–3.200 THB++ · cena 5.500 THB++', precioThb: [2800, 5500], q: 'IGNIV St Regis Bangkok', web: bkk('igniv'), loc: { lat: 13.7401, lng: 100.5401 } },
        { nombre: 'POTONG', estrellas: 1, tipo: 'Tailandesa-china innovadora, en Chinatown', precio: 'Menú degustación 6.700 THB++', precioThb: [6700, 6700], q: 'Potong restaurant Bangkok', web: bkk('potong'), loc: { lat: 13.7392, lng: 100.5085 } },
        { nombre: 'Sushi Saito', estrellas: 1, tipo: 'Sushi Edomae, junto al río', precio: 'Omakase: almuerzo desde 5.800 THB++ · cena 8.500–10.500 THB++', precioThb: [5800, 10500], q: 'Sushi Saito Four Seasons Bangkok', web: bkk('sushi-saito-1208794'), loc: { lat: 13.7124, lng: 100.5099 } },
        { nombre: 'AVANT', estrellas: 1, tipo: 'Cocina moderna, planta 30 del Kimpton Maa-Lai', precio: 'Almuerzo ~4.200 THB++ · cena ~5.900 THB++', precioThb: [4200, 5900], q: 'AVANT Kimpton Maa-Lai Bangkok', web: bkk('avant'), loc: { lat: 13.7377, lng: 100.5434 } },
        { nombre: 'Nusara', estrellas: 1, tipo: 'Tailandesa contemporánea, frente a Wat Pho', precio: '~5.990 THB++', precioThb: [5990, 5990], q: 'Nusara restaurant Bangkok', web: bkk('nusara-1192382'), loc: { lat: 13.7457, lng: 100.4915 } },
        { nombre: 'Gaggan', estrellas: 1, tipo: 'India innovadora (Gaggan Anand), en Sukhumvit 31', precio: 'Menú degustación 16.000 THB con maridaje, servicio e IVA incluidos', precioThb: [16000, 16000], q: 'Gaggan Anand restaurant Bangkok', web: bkk('gaggan-anand'), loc: { lat: 13.7408, lng: 100.5676 } },
        { nombre: 'Suan Thip', estrellas: 1, tipo: 'Tailandesa tradicional, en un jardín junto al río', nota: 'En Nonthaburi (Pak Kret), ~25 km al norte del centro.', precio: '~500–1.000 THB/persona a la carta', precioThb: [500, 1000], q: 'Suan Thip restaurant Nonthaburi', web: michelin('nonthaburi-region/nonthaburi/restaurant/suan-thip'), loc: { lat: 13.9271, lng: 100.5022 } }
      ],
      recomendados: [
        { nombre: 'Thipsamai Pad Thai', tipo: 'Bib Gourmand · el pad thai más famoso de Bangkok, desde 1966', precio: '~90–165 THB/plato (con langostinos de río grandes, ~500–790)', precioThb: [90, 165], q: 'Thipsamai Pad Thai Bangkok', loc: { lat: 13.7478, lng: 100.5034 } },
        { nombre: 'Krua Apsorn', tipo: 'Bib Gourmand · cocina tailandesa casera', precio: '~150–400 THB/plato (la tortilla de cangrejo, ~350)', precioThb: [150, 400], q: 'Krua Apsorn Dinso Road Bangkok', loc: { lat: 13.7582, lng: 100.5022 } },
        { nombre: 'Nai Mong Hoi Thod', tipo: 'Bib Gourmand · tortilla de ostras crujiente, Chinatown', precio: '~100–200 THB', precioThb: [100, 200], q: 'Nai Mong Hoi Thod Bangkok', loc: { lat: 13.7440, lng: 100.5148 } },
        { nombre: 'Jok Prince', tipo: 'Bib Gourmand · congee (arroz caldoso) con cerdo', precio: '~45–70 THB', precioThb: [45, 70], q: 'Jok Prince Bangkok', loc: { lat: 13.7317, lng: 100.5154 } },
        { nombre: 'Go-Ang Pratunam Chicken Rice', tipo: 'Bib Gourmand · khao man kai (arroz con pollo), en Pratunam', precio: '~60–100 THB/plato', precioThb: [60, 100], q: 'Go-Ang Pratunam Chicken Rice Bangkok', loc: { lat: 13.7496, lng: 100.5420 } }
      ] },
    { zona: 'Chiang Mai', fechas: '29 nov – 3 dic (4 noches)',
      intro: 'Chiang Mai está en la Guía Michelin pero todavía sin ningún restaurante con estrella (edición 2026). Aquí van Bib Gourmand (buena comida a buen precio) y selección Michelin, casi todos a menos de 2,5 km del alojamiento: cocina del norte (Lanna), khao soi y mucho street food.',
      estrellas: [], recomendados: [
        { nombre: 'Baan Landai', tipo: 'Selección Michelin · tailandesa casera, a un paseo del alojamiento', precio: '~150–300 THB/plato', precioThb: [150, 300], q: 'Baan Landai Phra Pok Klao Road Chiang Mai', web: cnx('baan-landai'), loc: { lat: 18.7941, lng: 98.9874 } },
        { nombre: 'Khao Soi Mae Sai', tipo: 'Bib Gourmand · khao soi del norte (fideos en curry de coco)', precio: '~50–60 THB/plato', precioThb: [50, 60], q: 'Khao Soi Mae Sai Chiang Mai', web: cnx('khao-soi-mae-sai'), loc: { lat: 18.8041, lng: 98.9851 } },
        { nombre: 'Nam Ngiao Yong', tipo: 'Selección Michelin · khanom jeen nam ngiao (fideos con caldo de cerdo y tomate), en el mercado Siri Wattana', precio: '~50–80 THB/plato', precioThb: [50, 80], q: 'Nam Ngiao Yong Siri Wattana Market Chiang Mai', web: cnx('nam-ngiao-yong'), loc: { lat: 18.8044, lng: 98.9839 } },
        { nombre: 'Huen Muan Jai', tipo: 'Bib Gourmand · cocina Lanna en una casa de madera con jardín', precio: '~80–250 THB/plato', precioThb: [80, 250], q: 'Huen Muan Jai Chiang Mai', web: cnx('huen-muan-jai'), loc: { lat: 18.8001, lng: 98.9756 } },
        { nombre: 'Roti Pa Day', tipo: 'Bib Gourmand · roti crujiente con leche condensada, en un puesto frente a Wat Mahawan', precio: '~20–70 THB', precioThb: [20, 70], q: 'Roti Pa Day Chiang Mai', web: cnx('rotee-pa-day'), loc: { lat: 18.7881, lng: 98.9959 } },
        { nombre: 'Guay Jub Chang Moi Tat Mai', tipo: 'Bib Gourmand · guay jub (fideos enrollados en caldo de pimienta) con salchicha sai ua', precio: '~50–80 THB/plato', precioThb: [50, 80], q: 'Guay Jub Chang Moi Tat Mai Chiang Mai', web: cnx('guay-jub-chang-moi-tat-mai'), loc: { lat: 18.7901, lng: 98.9987 } },
        { nombre: 'Rasik Local Kitchen', tipo: 'Bib Gourmand · tailandesa de autor con producto de temporada', nota: 'Solo 14–16 plazas por turno: hay que reservar.', precio: '~120–350 THB/plato', precioThb: [120, 350], q: 'Rasik Local Kitchen Chiang Mai', web: cnx('rasik-local-kitchen'), loc: { lat: 18.7811, lng: 98.9958 } },
        { nombre: 'Kiti Panit', tipo: 'Selección Michelin · cocina del norte en una antigua casa comercial de Tha Phae', precio: '~200–400 THB/plato', precioThb: [200, 400], q: 'Kiti Panit Chiang Mai', web: cnx('kiti-panit'), loc: { lat: 18.7879, lng: 99.0005 } },
        { nombre: 'Magnolia Café', tipo: 'Bib Gourmand · tailandesa en un comedor vintage con cuatro mesas compartidas', precio: '~150–300 THB/plato', precioThb: [150, 300], q: 'Magnolia Cafe Rattanakosin Road Chiang Mai', web: cnx('magnolia-cafe'), loc: { lat: 18.8006, lng: 98.9971 } },
        { nombre: 'Lung Khajohn Wat Ket', tipo: 'Bib Gourmand · postre: khao kriap pak mo (bolitas de arroz al vapor con leche de coco)', precio: '~20–60 THB', precioThb: [20, 60], q: 'Lung Khajohn Wat Ket Chiang Mai', web: cnx('lung-khajohn-wat-ket'), loc: { lat: 18.7923, lng: 99.0022 } },
        { nombre: 'Euang Kam Sai', tipo: 'Bib Gourmand · recetas del norte de la misma familia desde hace un siglo', precio: '~80–200 THB/plato', precioThb: [80, 200], q: 'Euang Kam Sai Wua Lai Road Chiang Mai', web: cnx('euang-kam-sai'), loc: { lat: 18.7716, lng: 98.9802 } },
        { nombre: 'Tue Ka Ko Na Prince', tipo: 'Bib Gourmand · taro frito crujiente con salsa de chile dulce y cacahuete', precio: '~40–60 THB', precioThb: [40, 60], q: 'Tue Ka Ko Na Prince Chiang Mai', web: cnx('tue-ka-ko-na-prince'), loc: { lat: 18.7962, lng: 99.0062 } },
        { nombre: 'Sanpakoi Kanomjeen', tipo: 'Bib Gourmand · khanom jeen con currys, en el mercado Thongkam desde 1977', precio: '~40–70 THB/plato', precioThb: [40, 70], q: 'Sanpakoi Kanomjeen Thongkam Market Chiang Mai', web: cnx('sanpakoi-kanomjeen'), loc: { lat: 18.7859, lng: 99.0087 } },
        { nombre: 'Saiyut and Doctor Sai Kitchen', tipo: 'Bib Gourmand · recetas familiares de toda Tailandia, incluida cocina real', precio: '~150–300 THB/plato', precioThb: [150, 300], q: 'Saiyut and Doctor Sai Kitchen Chiang Mai', web: cnx('saiyut-and-doctor-sai-kitchen'), loc: { lat: 18.8220, lng: 98.9873 } },
        { nombre: 'Huan Soontaree', tipo: 'Bib Gourmand · cocina Lanna junto al río Ping, con música en directo de la dueña', precio: '~400–600 THB/persona', precioThb: [400, 600], q: 'Huan Soontaree Chiang Mai', web: cnx('huan-soontaree'), loc: { lat: 18.8310, lng: 98.9938 } }
      ] },
    { zona: 'Krabi / Ao Nang', fechas: '3 – 5 dic (2 noches)',
      intro: 'Krabi no está cubierto todavía por la Guía Michelin: estas son recomendaciones locales bien valoradas (reseñas y guías de viaje), no de la Michelin. El viernes 4 de diciembre hay mercado nocturno en Krabi Town.',
      estrellas: [], recomendados: [
        { nombre: 'The Last Fisherman', tipo: 'Marisco con vistas, bueno para el atardecer', precio: 'Precio moderado (sin cifra oficial)', q: 'The Last Fisherman Ao Nang', loc: { lat: 8.0311, lng: 98.8219 } },
        { nombre: 'KoDam Kitchen', tipo: 'Cocina tailandesa tradicional', precio: '~200–400 THB/persona', precioThb: [200, 400], q: 'KoDam Kitchen Ao Nang', loc: { lat: 8.0385, lng: 98.8199 } },
        { nombre: 'Govinda’s', tipo: 'Vegetariana y vegana, india y tailandesa', precio: '~150–280 THB/plato', precioThb: [150, 280], q: 'Govindas Restaurant Ao Nang', loc: { lat: 8.0387, lng: 98.8195 } },
        { nombre: 'Lae Lay Grill', tipo: 'Marisco y tailandesa con vistas desde el acantilado sobre Ao Nang', nota: 'Reserva si quieres mesa para el atardecer.', precio: '~500–1.000 THB/persona', precioThb: [500, 1000], q: 'Lae Lay Grill Ao Nang', loc: { lat: 8.0401, lng: 98.8229 } },
        { nombre: 'Ao Nang Landmark Night Market', tipo: 'Mercado nocturno: pad thai, marisco a la brasa, roti y zumos', precio: '~40–150 THB/plato', precioThb: [40, 150], q: 'Ao Nang Landmark Night Market', loc: { lat: 8.0429, lng: 98.8123 } },
        { nombre: 'Krua Thara', tipo: 'Marisco fresco al peso (cangrejo, gambas, pescado), lleno de gente local', precio: '~300–600 THB/persona', precioThb: [300, 600], q: 'Krua Thara Restaurant Ao Nang Krabi', loc: { lat: 8.0471, lng: 98.8002 } },
        { nombre: 'Ao Nang Boat Noodle', tipo: 'Boat noodles (fideos en caldo intenso) y platos tailandeses baratos', precio: '~50–150 THB/plato', precioThb: [50, 150], q: 'Ao Nang Boat Noodle Krabi', loc: { lat: 8.0505, lng: 98.8144 } },
        { nombre: 'Krabi Town Walking Street', tipo: 'Mercado nocturno de fin de semana (viernes a domingo desde las 17:00): street food y marisco a la brasa', nota: 'El viernes 4 de diciembre coincide con vuestra estancia. Está en Krabi Town, a unos 20 min en coche.', precio: '~20–100 THB/plato', precioThb: [20, 100], q: 'Krabi Town Walking Street', loc: { lat: 8.0640, lng: 98.9162 } },
        { nombre: 'RuenMai', tipo: 'Cocina del sur de Tailandia en un jardín frondoso, en Krabi Town', nota: 'Abre de 10:30 a 15:00 y de 17:00 a 21:00.', precio: '~200–450 THB/persona', precioThb: [200, 450], q: 'RuenMai Restaurant Krabi', loc: { lat: 8.0880, lng: 98.8820 } }
      ] },
    { zona: 'Koh Phi Phi', fechas: '5 – 7 dic (2 noches)',
      intro: 'Phi Phi tampoco está en la Guía Michelin: recomendaciones locales bien valoradas, todas en el pueblo de Tonsai y a pie.',
      estrellas: [], recomendados: [
        { nombre: 'Tonsai Seafood Restaurant', tipo: 'Marisco frente a la playa, buena puesta de sol', precio: '~700–900 THB/persona', precioThb: [700, 900], q: 'Tonsai Seafood Restaurant Koh Phi Phi', loc: { lat: 7.7381, lng: 98.7728 } },
        { nombre: 'Papaya Restaurant', tipo: 'Tailandesa e india, raciones grandes; pocas mesas, ve pronto', precio: '~200–300 THB/plato', precioThb: [200, 300], q: 'Papaya Restaurant Koh Phi Phi Tonsai', loc: { lat: 7.7397, lng: 98.7736 } },
        { nombre: 'Garlic 1992', tipo: 'Tailandesa tradicional y barata, siempre llena', precio: '~120–250 THB/plato', precioThb: [120, 250], q: 'Garlic 1992 Restaurant Koh Phi Phi', loc: { lat: 7.7411, lng: 98.7738 } },
        { nombre: 'Mercado de Tonsai', tipo: 'Puestos de pad thai, arroz frito, roti y batidos: lo más barato de la isla', precio: '~60–150 THB/plato', precioThb: [60, 150], q: 'Phi Phi Market Tonsai', loc: { lat: 7.7391, lng: 98.7721 } },
        { nombre: 'Anna’s Restaurant', tipo: 'Familiar, tailandesa y occidental con un toque saludable', precio: '~150–300 THB/plato', precioThb: [150, 300], q: 'Annas Restaurant Koh Phi Phi', loc: { lat: 7.7390, lng: 98.7717 } },
        { nombre: 'Basil Bistro', tipo: 'Tailandesa: muy buenos curris y dumplings', precio: '~200–350 THB/plato', precioThb: [200, 350], q: 'Basil Bistro Bar Restaurant Koh Phi Phi', loc: { lat: 7.7399, lng: 98.7733 } },
        { nombre: 'Cosmic', tipo: 'Tailandesa y occidental (pasta, pizza)', precio: '~200–350 THB/plato', precioThb: [200, 350], q: 'Cosmic Restaurant Koh Phi Phi', loc: { lat: 7.7397, lng: 98.7730 } },
        { nombre: 'Breakfast & Friend', tipo: 'Desayunos: tortitas, fruta, huevos y café', precio: '~100–200 THB', precioThb: [100, 200], q: 'Breakfast and Friend Koh Phi Phi', loc: { lat: 7.7396, lng: 98.7730 } }
      ] },
    { zona: 'Phuket', fechas: '7 – 9 dic (2 noches)',
      intro: 'Phuket tiene un restaurante con estrella Michelin (PRU, en el norte de la isla) y hay otro en Phang Nga, pasado el puente de Sarasin (Aulis). Los dos quedan lejos del hotel (bahía de Chalong): cuenta 1 h o más en coche. Debajo, marisco en Rawai y Chalong y, si pasáis por el casco antiguo de Phuket (a ~15 km), sus Bib Gourmand.',
      estrellas: [
        { nombre: 'PRU', estrellas: 1, tipo: 'Km 0 — ingredientes de su propia granja, en el resort Trisara', nota: 'También tiene la Estrella Verde Michelin. Precio vigente desde el 1 de octubre de 2026.', precio: 'Almuerzo 4.000 THB++ · menú degustación de cena 7.500 THB++', precioThb: [4000, 7500], q: 'PRU restaurant Trisara Phuket', web: michelin('phuket-region/phuket/restaurant/pru'), loc: { lat: 8.0385, lng: 98.2765 } },
        { nombre: 'Aulis', estrellas: 1, tipo: 'Creativa (Simon Rogan), en Iniala Beach House', nota: 'En la playa de Natai (Phang Nga), fuera de la isla. Abre de martes a sábado.', precio: 'Menú degustación ~6.000 THB++', precioThb: [6000, 6000], q: 'Aulis Phuket Iniala Beach House', web: michelin('th-phang-nga-region/th-phang-nga/restaurant/aulis-1210910'), loc: { lat: 8.2879, lng: 98.2742 } }
      ],
      recomendados: [
        { nombre: 'Mook Manee', tipo: 'Selección Michelin · marisco en el mercado de Rawai: eliges el marisco vivo y te lo cocinan', nota: 'Se paga el marisco al peso más ~100 THB/kg por cocinarlo.', precio: '~800–1.600 THB/persona', precioThb: [800, 1600], q: 'Mook Manee Seafood Rawai Phuket', web: pkt('mook-manee'), loc: { lat: 7.7757, lng: 98.3286 } },
        { nombre: 'Salaloy Seafood Restaurant', tipo: 'Marisco con vistas, en Rawai', precio: '~600–800 THB/persona', precioThb: [600, 800], q: 'Salaloy Seafood Restaurant Rawai Phuket', loc: { lat: 7.7719, lng: 98.3063 } },
        { nombre: 'Kan Eang @ Pier', tipo: 'Clásico de marisco local en la playa', precio: '~900–1.000 THB/persona', precioThb: [900, 1000], q: 'Kan Eang @ Pier Phuket', loc: { lat: 7.7731, lng: 98.3071 } },
        { nombre: 'Mor Mu Dong', tipo: 'Bib Gourmand · marisco del sur en cabañas sobre el manglar, en Chalong', nota: 'Prueba el pla yut sai (caballa rellena de curry).', precio: '~300–500 THB/persona', precioThb: [300, 500], q: 'Mor Mu Dong Restaurant Chalong Phuket', web: pkt('mor-mu-dong'), loc: { lat: 7.8431, lng: 98.3720 } },
        { nombre: 'Niyom Salt Grilled Duck', tipo: 'Bib Gourmand · pato asado al carbón con sal, de camino al casco antiguo', precio: '~200–400 THB (el pato entero, ~350)', precioThb: [200, 400], q: 'Niyom Salt Grilled Duck Phuket', web: pkt('niyom-salt-grilled-duck'), loc: { lat: 7.8662, lng: 98.3493 } },
        { nombre: 'Roti Chaofa', tipo: 'Bib Gourmand · desayuno tailandés-musulmán: roti, curris y biryani de pollo', precio: '~30–120 THB', precioThb: [30, 120], q: 'Roti Chaofa Phuket Town', web: pkt('roti-chaofa'), loc: { lat: 7.8783, lng: 98.3806 } },
        { nombre: 'Chuan Chim', tipo: 'Bib Gourmand · marisco al wok en una de las casas de comida más antiguas de Phuket', precio: '~150–400 THB/plato', precioThb: [150, 400], q: 'Chuan Chim Montri Road Phuket', web: pkt('chuan-chim'), loc: { lat: 7.8829, lng: 98.3927 } },
        { nombre: 'Go Benz', tipo: 'Bib Gourmand · cerdo en caldo de pimienta con fideos de arroz enrollados', nota: 'Abre por la noche y siempre hay cola.', precio: '~60–120 THB/plato', precioThb: [60, 120], q: 'Go Benz Krabi Road Phuket', web: pkt('go-benz'), loc: { lat: 7.8849, lng: 98.3825 } },
        { nombre: 'One Chun', tipo: 'Bib Gourmand · recetas familiares de Phuket en un edificio del siglo XIX', precio: '~150–350 THB/plato', precioThb: [150, 350], q: 'One Chun Thep Krasattri Road Phuket', web: pkt('one-chun'), loc: { lat: 7.8852, lng: 98.3907 } },
        { nombre: 'The Charm Dining Gallery', tipo: 'Bib Gourmand · cocina de Phuket en una casona sino-portuguesa', precio: '~200–400 THB/plato', precioThb: [200, 400], q: 'The Charm Dining Gallery Phuket', web: pkt('the-charm'), loc: { lat: 7.8864, lng: 98.3862 } },
        { nombre: 'A Pong Mae Sunee', tipo: 'Bib Gourmand · khanom a pong (crepes de coco), en el casco antiguo de Phuket', precio: '~50–150 THB', precioThb: [50, 150], q: 'A Pong Mae Sunee Phuket Town', web: pkt('a-pong-mae-sunee'), loc: { lat: 7.8859, lng: 98.3875 } }
      ] }
  ];

  COMER_SEED.forEach(z => z.estrellas.sort((a, b) => b.estrellas - a.estrellas || a.precioThb[0] - b.precioThb[0]));

  const gmapsSearchHref = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const appleMapsSearchHref = q => `https://maps.apple.com/?q=${encodeURIComponent(q)}`;

  // Distancia en línea recta desde el alojamiento de esa zona (mismo cálculo
  // que usa el Itinerario para los trayectos entre paradas).
  function comerDistTxt(aloj, v) {
    if (!aloj || !aloj.loc || aloj.loc.lat == null || !v.loc) return '';
    const km = haversine(aloj.loc, v.loc);
    return km < 0.5 ? 'A pie desde el alojamiento' : `~${km.toFixed(1)} km del alojamiento`;
  }

  // Añade el equivalente en € (tipo del BCE del día, el mismo que usa
  // Gastos) al precio en THB cuando hay una cifra concreta. Si el precio
  // lleva «++», el € ya incluye el 10 % de servicio y el 7 % de IVA
  // (1,10 × 1,07), que es lo que se paga de verdad.
  function comerPrecioTxt(v) {
    if (!v.precioThb) return v.precio || '';
    const [thbMin, thbMax] = v.precioThb;
    const recargo = v.precio.includes('++') ? 1.177 : 1;
    const eMin = Math.round(toEUR(thbMin * recargo, 'THB'));
    const eMax = Math.round(toEUR(thbMax * recargo, 'THB'));
    const eurTxt = eMax > eMin ? `~${eMin}–${eMax} €` : `~${eMin} €`;
    return `${v.precio} (${eurTxt}${recargo > 1 ? ' con servicio e IVA' : ''})`;
  }

  const fact = (cls, ico, txt) => `<span class="fact fact--${cls}">${ico}${esc(txt)}</span>`;

  // Ficha de un sitio (restaurante o estadio). El número es el mismo que
  // lleva su chapa en el mapa; tocar cualquiera de los dos los enlaza.
  function venueCard(kind, v, aloj, n, key) {
    const w = el('div', 'venue' + (kind === 'mt' ? ' venue--mt' : v.estrellas ? ' venue--star' : ''));
    w.dataset.map = key;
    w.dataset.n = n;
    const dist = comerDistTxt(aloj, v);
    const facts = [];
    if (v.precio) facts.push(fact('price', ICON.coin, comerPrecioTxt(v)));
    if (dist) facts.push(fact('dist', ICON.pin, dist));
    const estrellas = v.estrellas
      ? `<span class="venue__stars" role="img" aria-label="${v.estrellas} estrella${v.estrellas > 1 ? 's' : ''} Michelin">${'★'.repeat(v.estrellas)}</span>`
      : '';
    const q = v.q || v.nombre;
    w.innerHTML =
      `<button class="venue__n" type="button" aria-label="Ver ${esc(v.nombre)} en el mapa">${n}</button>` +
      `<div class="venue__body">` +
      `<div class="venue__nombre">${estrellas}${esc(v.nombre)}</div>` +
      (v.tipo ? `<div class="venue__meta">${esc(v.tipo)}</div>` : '') +
      (v.dias ? `<div class="venue__dias">${esc(v.dias)}</div>` : '') +
      (v.horario ? `<div class="venue__meta">${esc(v.horario)}</div>` : '') +
      (facts.length ? `<div class="venue__facts">${facts.join('')}</div>` : '') +
      (v.nota ? `<div class="venue__meta">${esc(v.nota)}</div>` : '') +
      fotoBlock(v.foto, v.nombre, v.desc, 'slot__foto-wrap', 'slot__foto', 'slot__foto-caption') +
      `<div class="venue__go">` +
      (v.loc ? `<button class="reco-link reco-link--map" type="button" data-pin>${ICON.locate} Ver en el mapa</button>` : '') +
      `<a class="reco-link" href="${esc(gmapsSearchHref(q))}" target="_blank" rel="noopener">Google Maps</a>` +
      `<a class="reco-link" href="${esc(appleMapsSearchHref(q))}" target="_blank" rel="noopener">Apple Maps</a>` +
      (v.entradas ? `<a class="reco-link" href="${esc(v.entradas)}" target="_blank" rel="noopener">Entradas</a>` : '') +
      (v.web ? `<a class="reco-link" href="${esc(v.web)}" target="_blank" rel="noopener">Más información</a>` : '') +
      `</div></div>`;
    w.querySelectorAll('.venue__n, [data-pin]').forEach(b => b.addEventListener('click', () => selectVenue(key, n)));
    return w;
  }

  // Tarjeta de ciudad compartida por Comer y Muay Thai: nombre, fechas y mapa.
  function zonaCard(zona, key) {
    const c = el('section', 'zona');
    c.innerHTML =
      `<div class="zona__head"><h3 class="zona__nombre">${esc(zona.zona)}</h3><span class="zona__fechas">${esc(zona.fechas)}</span></div>` +
      `<div class="zmap" id="zmap-${key}"></div>`;
    return c;
  }

  // Ciudades de Comer abiertas o cerradas a mano en esta sesión (zona -> bool),
  // para que un re-render no las vuelva a plegar.
  const comerPlegado = {};

  // Por defecto solo se abre la ciudad en la que estáis hoy (del check-in al
  // check-out, ambos incluidos: el día del cambio se abren las dos).
  function comerAbierta(zona, aloj) {
    if (zona.zona in comerPlegado) return comerPlegado[zona.zona];
    const hoy = hoyYMD();
    return !!(aloj && aloj.checkin && aloj.checkout && aloj.checkin <= hoy && hoy <= aloj.checkout);
  }

  const ESTRELLAS_TXT = { 3: '3 estrellas Michelin', 2: '2 estrellas Michelin', 1: '1 estrella Michelin' };

  function comerCard(zona, idx, aloj) {
    const key = 'comer-' + idx;
    const c = el('details', 'zona zona--fold');
    c.open = comerAbierta(zona, aloj);
    const nE = zona.estrellas.length, nR = zona.recomendados.length;
    const cuenta = [nE ? `${nE} con estrella` : 'Sin estrellas', nR ? `${nR} recomendado${nR > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
    c.innerHTML =
      `<summary class="zona__head"><h3 class="zona__nombre">${esc(zona.zona)}</h3><span class="zona__fechas">${esc(zona.fechas)}</span>` +
      `<span class="zona__cuenta">${esc(cuenta)}</span><span class="zona__chev" aria-hidden="true">${ICON.chev}</span></summary>` +
      `<div class="zmap" id="zmap-${key}"></div>`;
    c.addEventListener('toggle', () => {
      comerPlegado[zona.zona] = c.open;
      // El mapa no se puede crear mientras la ciudad está plegada (mide 0)
      if (c.open) refreshZoneMaps();
    });
    if (zona.intro) {
      const p = el('p', 'zona__intro');
      p.textContent = zona.intro;
      c.appendChild(p);
    }
    let n = 0, grupo = 0;
    zona.estrellas.forEach(v => {
      if (v.estrellas !== grupo) {
        grupo = v.estrellas;
        const lab = el('p', 'sub-label sub-label--star');
        lab.textContent = ESTRELLAS_TXT[grupo];
        c.appendChild(lab);
      }
      c.appendChild(venueCard('comer', v, aloj, ++n, key));
    });
    if (nR) {
      const lab = el('p', 'sub-label');
      lab.textContent = nE ? 'También recomendados' : 'Recomendados';
      c.appendChild(lab);
      zona.recomendados.forEach(v => c.appendChild(venueCard('comer', v, aloj, ++n, key)));
    }
    return c;
  }

  function renderComer() {
    const body = $('#comer-body');
    if (!body) return;
    destroyZoneMaps('comer-');
    body.innerHTML = '';
    body.appendChild(notice('Guía Michelin Thailand 2026 y recomendaciones locales, revisadas en septiembre de 2026. Precios aproximados por persona y sin bebidas — confirma y reserva con tiempo, sobre todo en los restaurantes con estrella. Distancias en línea recta desde el alojamiento, no ruta real. Toca una ciudad para desplegarla.'));
    COMER_SEED.forEach((zona, idx) => {
      const aloj = state.alojamientos.find(a => a.zona === zona.zona);
      body.appendChild(comerCard(zona, idx, aloj));
    });
    refreshMaps();
  }

  /* ==========================================================
     Mapas (Leaflet): Comer, Muay Thai y la ruta del Itinerario
     ========================================================== */
  const OPTS_MAPA = {
    zoomControl: true, scrollWheelZoom: false, maxZoom: 18,
    // Sin animaciones: las de zoom/pan dejaban el pane de tiles mal colocado
    // al llamar a invalidateSize()/fitBounds() varias veces al abrir la pestaña.
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false
  };
  // El popup se ajusta para no quedar tapado por los botones de zoom
  const POPUP_MAPA = { maxWidth: 210, autoPanPaddingTopLeft: [52, 12] };
  const ATTR_MAPA = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Tiles claros de CARTO (el CSS los tiñe de lavanda). CARTO es un servicio
  // gratuito compartido y a veces da 503: tras varios fallos cambia a OSM.
  function addBaseTiles(map) {
    const carto = L.tileLayer('https://{s}.basemap.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19, crossOrigin: 'anonymous', attribution: ATTR_MAPA
    });
    let errs = 0, fallenBack = false;
    carto.on('tileerror', () => {
      if (fallenBack || ++errs < 4) return;
      fallenBack = true;
      map.removeLayer(carto);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, crossOrigin: 'anonymous',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
    });
    carto.addTo(map);
  }

  // Chapa numerada. El estilo va en un div interior para poder animarlo sin
  // pelearse con el transform que Leaflet aplica al marcador.
  function chapa(cls, inner, i, size) {
    return L.divIcon({
      className: '',
      html: `<div class="mpin ${cls}" style="--i:${i}">${inner}</div>`,
      iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2]
    });
  }

  const zoneMaps = {};   // clave ('comer-0', 'mt-1'…) -> { map, bounds, markers, home, line, active }

  function destroyZoneMaps(prefix) {
    Object.keys(zoneMaps).forEach(k => {
      if (k.indexOf(prefix) !== 0) return;
      zoneMaps[k].map.remove();
      delete zoneMaps[k];
    });
  }

  // No se puede crear un mapa de Leaflet en un contenedor oculto (tamaño 0),
  // así que se reintenta cuando la pestaña se hace visible.
  function ensureZoneMap(key, aloj, items, kind) {
    if (zoneMaps[key] || typeof L === 'undefined') return;
    const box = document.getElementById('zmap-' + key);
    if (!box || !box.clientHeight) return;

    const home = aloj && aloj.loc && aloj.loc.lat != null ? aloj.loc : null;
    const sitios = [];
    items.forEach((v, i) => { if (v.loc) sitios.push({ v, n: i + 1 }); });
    if (!home && !sitios.length) { box.remove(); return; }

    const first = home || sitios[0].v.loc;
    const map = L.map(box, OPTS_MAPA).setView([first.lat, first.lng], 14);
    addBaseTiles(map);
    const entry = { map, markers: {}, home, line: null, active: null, bounds: null };
    const pts = [];
    let i = 0;

    if (home) {
      // Círculos de 500 m y 1 km: cuánto se puede hacer a pie desde el alojamiento
      [1000, 500].forEach(r => L.circle([home.lat, home.lng], {
        radius: r, weight: 1.5, dashArray: '4 6', className: r === 500 ? 'map-ring map-ring--in' : 'map-ring map-ring--out', interactive: false
      }).addTo(map));
      L.marker([home.lat, home.lng], { icon: chapa('mpin--home', ICON.house, i++, 32), keyboard: false, zIndexOffset: 500 })
        .addTo(map).bindPopup(`<b>${esc(aloj.nombre || 'Alojamiento')}</b><small>Tu alojamiento</small>`);
      pts.push([home.lat, home.lng]);
      const leyenda = L.control({ position: 'bottomleft' });
      leyenda.onAdd = () => { const d = L.DomUtil.create('div', 'ring-key'); d.textContent = '500 m y 1 km'; return d; };
      leyenda.addTo(map);
    }

    sitios.forEach(({ v, n }) => {
      const cls = kind === 'mt' ? 'mpin--mt' : (v.estrellas ? 'mpin--star' : '');
      const m = L.marker([v.loc.lat, v.loc.lng], { icon: chapa(cls, n, i++, 32), keyboard: false }).addTo(map);
      m.bindPopup(`<b>${esc(v.nombre)}</b>${v.tipo || v.dias ? `<small>${esc(v.tipo || v.dias)}</small>` : ''}`, POPUP_MAPA);
      m.on('click', () => selectVenue(key, n, true));
      entry.markers[n] = m;
      pts.push([v.loc.lat, v.loc.lng]);
    });

    entry.bounds = L.latLngBounds(pts);
    map.fitBounds(entry.bounds, { padding: [40, 40], maxZoom: 16, animate: false });
    zoneMaps[key] = entry;
  }

  // Marca un sitio en la lista y en el mapa (chapa ampliada, línea discontinua
  // desde el alojamiento y popup). Si viene del mapa, desplaza la lista a su ficha.
  function selectVenue(key, n, fromMap) {
    const entry = zoneMaps[key];
    const m = entry && entry.markers[n];
    if (!m) return;

    document.querySelectorAll(`.venue.is-active[data-map="${key}"]`).forEach(c => c.classList.remove('is-active'));
    if (entry.active) { const old = entry.active.getElement(); if (old) old.firstChild.classList.remove('is-active'); }
    if (entry.line) { entry.map.removeLayer(entry.line); entry.line = null; }

    const card = document.querySelector(`.venue[data-map="${key}"][data-n="${n}"]`);
    if (card) card.classList.add('is-active');
    const icon = m.getElement();
    if (icon) icon.firstChild.classList.add('is-active');
    entry.active = m;

    if (entry.home) {
      entry.line = L.polyline([[entry.home.lat, entry.home.lng], m.getLatLng()], {
        weight: 3, dashArray: '6 8', lineCap: 'round', className: 'route-line', interactive: false
      }).addTo(entry.map);
    }
    entry.map.panTo(m.getLatLng(), { animate: false });
    m.openPopup();
    if (fromMap && card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function refreshZoneMaps() {
    COMER_SEED.forEach((zona, idx) => {
      const aloj = state.alojamientos.find(a => a.zona === zona.zona);
      ensureZoneMap('comer-' + idx, aloj, zona.estrellas.concat(zona.recomendados), 'comer');
    });
    MUAYTHAI_SEED.forEach((zona, idx) => {
      const aloj = state.alojamientos.find(a => a.zona === zona.zona);
      ensureZoneMap('mt-' + idx, aloj, zona.lugares, 'mt');
    });
    Object.keys(zoneMaps).forEach(k => {
      const e = zoneMaps[k];
      // invalidateSize() solo no siempre recoloca el pane de tiles tras
      // reflujos del layout: reencuadrar es idempotente y lo deja alineado.
      e.map.invalidateSize(false);
      e.map.fitBounds(e.bounds, { padding: [40, 40], maxZoom: 16, animate: false });
    });
  }

  // Ruta del viaje: un alojamiento tras otro, por fecha de entrada.
  let rutaMap = null;
  const rutaStops = () => state.alojamientos
    .filter(a => a.loc && a.loc.lat != null)
    .sort((a, b) => (a.checkin || '').localeCompare(b.checkin || ''));

  function rutaBlock() {
    const stops = rutaStops();
    if (!stops.length) return null;
    const km = stops.slice(1).reduce((s, a, i) => s + haversine(stops[i].loc, a.loc), 0);
    const box = el('section', 'ruta');
    box.innerHTML =
      `<div class="ruta__head"><h3>Tu ruta</h3><div class="ruta__stats">` +
      `<span class="stat"><b>${stops.length}</b> ${stops.length === 1 ? 'parada' : 'paradas'}</span>` +
      (km >= 1 ? `<span class="stat"><b>${Math.round(km)}</b> km en línea recta</span>` : '') +
      `</div></div><div class="zmap zmap--flat" id="ruta-mapa"></div>`;
    return box;
  }

  function destroyRutaMap() {
    if (rutaMap) { rutaMap.map.remove(); rutaMap = null; }
  }

  function ensureRutaMap() {
    if (rutaMap || typeof L === 'undefined') return;
    const box = document.getElementById('ruta-mapa');
    if (!box || !box.clientHeight) return;
    const stops = rutaStops();
    if (!stops.length) return;

    const map = L.map(box, OPTS_MAPA).setView([stops[0].loc.lat, stops[0].loc.lng], 6);
    addBaseTiles(map);
    const ll = stops.map(a => [a.loc.lat, a.loc.lng]);
    // Carretera: asfalto de tinta con su línea central, como en el itinerario
    L.polyline(ll, { weight: 7, lineCap: 'round', lineJoin: 'round', className: 'map-road', interactive: false }).addTo(map);
    L.polyline(ll, { color: '#ccf62f', weight: 2, dashArray: '2 9', lineCap: 'round', interactive: false }).addTo(map);
    // Etiquetas hacia fuera (las de más al oeste a la izquierda) y solo una
    // fija por grupo de paradas cercanas: las demás salen al tocar la chapa.
    const lngMedia = stops.reduce((s, a) => s + a.loc.lng, 0) / stops.length;
    const rotuladas = [];
    stops.forEach((a, i) => {
      const noches = Math.max(0, eachDay(a.checkin, a.checkout).length - 1);
      const izq = a.loc.lng < lngMedia;
      const fija = !rotuladas.some(l => haversine(l, a.loc) < 90);
      if (fija) rotuladas.push(a.loc);
      L.marker([a.loc.lat, a.loc.lng], { icon: chapa('mpin--stop', i + 1, i, 36), keyboard: false })
        .addTo(map)
        .bindTooltip(esc(a.zona || a.nombre || ''), { permanent: fija, direction: izq ? 'left' : 'right', offset: [izq ? -14 : 14, 0], className: 'city-tip' })
        .bindPopup(`<b>${esc(a.nombre || 'Alojamiento')}</b><small>${a.checkin ? esc(fmtFecha(a.checkin)) : ''}${noches ? ' · ' + noches + ' noche' + (noches !== 1 ? 's' : '') : ''}</small>`);
    });
    rutaMap = { map, bounds: L.latLngBounds(ll) };
    map.fitBounds(rutaMap.bounds, { padding: [56, 56], maxZoom: 12, animate: false });
  }

  function refreshRutaMap() {
    ensureRutaMap();
    if (!rutaMap) return;
    rutaMap.map.invalidateSize(false);
    rutaMap.map.fitBounds(rutaMap.bounds, { padding: [56, 56], maxZoom: 12, animate: false });
  }

  function refreshMaps() {
    refreshZoneMaps();
    refreshRutaMap();
  }

  /* ==========================================================
     Pantalla: TRANSPORTE Y GUÍAS
     ========================================================== */
  const TRANSPORTE_LOCAL = [
    { ico: '🛺', cat: 'Tuk-tuk, Grab y taxi',
      items: [
        'Grab (como Uber): precio fijo mostrado antes de aceptar — mejor que negociar. Disponible en Bangkok, Chiang Mai, Phuket; no llega a las islas pequeñas.',
        'Tuk-tuk: negocia el precio ANTES de subir, siempre algo por encima de lo que pediría un taxi con taxímetro. Bien para trayectos cortos y turísticos, no para tarifas largas.',
        'Taxi con taxímetro (Bangkok): pide "meter, please". Si el taxista se niega y solo ofrece tarifa plana muy alta, coge otro.',
        'Songthaew (camioneta compartida, típica en Chiang Mai y las islas): ruta fija tipo bus colectivo, se para donde se pide, tarifa barata fija por zona.'
      ] },
    { ico: '🚆', cat: 'Trenes y vuelos domésticos',
      items: [
        'Red estatal (SRT): conecta Bangkok con Chiang Mai (tren nocturno con literas, ~12 h), Kanchanaburi y el sur hacia Surat Thani (ferris a Koh Samui/Phangan/Tao). Reserva litera con antelación en temporada alta.',
        'Vuelos domésticos (AirAsia, Nok Air, Thai Lion Air, Thai Vietjet): conectan Bangkok con casi cualquier ciudad o isla en 1-2 h, a menudo más barato y rápido que tren o bus para tramos largos.'
      ] },
    { ico: '⛴️', cat: 'Ferris a las islas',
      items: [
        'Koh Samui / Koh Phangan / Koh Tao: ferris desde Surat Thani o Donsak.',
        'Koh Phi Phi / Koh Lanta: ferris desde Krabi o Phuket.',
        'Horarios reducidos y cancelaciones por mar de fondo en temporada de monzón — revisa el aviso de lluvia del día antes de reservar un trayecto en barco.'
      ] },
    { ico: '🛵', cat: 'Alquiler de scooter',
      items: [
        'Lleva el carné de conducir internacional: hay controles policiales habituales que lo piden.',
        'Casco obligatorio, también para el pasajero.',
        'Revisa el vehículo y fotografía los daños previos antes de irte con él.',
        'El seguro del alquiler no suele cubrir todo — conviene tener un seguro de viaje con cobertura de moto.'
      ] }
  ];

  const COMIDA_CALLEJERA = {
    intro: 'La comida callejera es uno de los mejores planes del viaje, y también segura si eliges bien el puesto.',
    items: [
      'Elige puestos con mucha rotación y cola de gente local, con la comida cocinada al momento y a fuego visible.',
      'Los primeros días, si tienes el estómago sensible, ten cuidado con jugos y hielo de puestos con higiene dudosa. El hielo cilíndrico con agujero central suele ser de fábrica (más fiable) que el hielo irregular.',
      'Lleva gel hidroalcohólico y algo de antidiarreico por si acaso.',
      'Nivel de picante: pide "mai phet" (nada picante) o "phet nit noy" (un poco picante) si lo prefieres suave.',
      'Platos imprescindibles: pad thai, som tam (ensalada de papaya verde), khao soi (curry de fideos, típico del norte), mango con arroz glutinoso, satay, tom yum.'
    ]
  };

  const TEMPLOS_ETIQUETA = {
    intro: 'Los templos (wat) son lugares de culto activos, no un photocall — el respeto se nota y se agradece.',
    items: [
      'Hombros y rodillas cubiertos para entrar. Lleva siempre una prenda ligera de más por si acaso; algunos templos prestan pareos en la entrada.',
      'Descálzate antes de entrar a cualquier sala con una imagen de Buda.',
      'Nunca señales con los pies hacia una imagen de Buda ni hacia una persona; al sentarte, pies hacia atrás, nunca extendidos hacia el altar.',
      'No toques la cabeza de nadie (es la parte más sagrada del cuerpo) ni la de una estatua.',
      'Las mujeres no deben tocar a un monje ni entregarle nada directamente en mano.',
      'Comportamiento silencioso y respetuoso. Posar de forma irrespetuosa con una estatua de Buda es delito en Tailandia.'
    ]
  };

  const TEMPORADA_TH = {
    intro: 'Tailandia no tiene una única "temporada": cambia por región, y si el viaje cruza varias zonas, la mejor época varía según dónde estés cada día — por eso el aviso de lluvia de Itinerario es por día y por ubicación, no un cartel único para todo el viaje.',
    items: [
      'Patrón general del país: calor máximo marzo-junio, monzón principal junio-octubre, fresco y seco noviembre-febrero.',
      'Bangkok y centro: monzón jun-oct con lluvias fuertes pero cortas por la tarde; el resto del año, seco.',
      'Norte (Chiang Mai, Chiang Rai, Pai): temporada de quemas agrícolas feb-abr (calima y contaminación — evítala si eres sensible), lluvias jun-oct, mejor época nov-feb (fresco).',
      'Golfo de Tailandia (Koh Samui, Koh Phangan, Koh Tao): patrón INVERTIDO respecto al resto del país — su temporada de lluvias es oct-dic. Mejor época mar-sep.',
      'Mar de Andamán (Phuket, Krabi, Koh Phi Phi, Koh Lanta): monzón may-oct, con mar picado y muchas rutas de ferri reducidas o cerradas. Mejor época nov-abr.'
    ]
  };

  const PLAN_B_TH = {
    intro: 'Si el aviso de lluvia del día pinta feo, cambia planes al aire libre por interior sin salir de la zona donde duermes esa noche.',
    items: [
      'Centros comerciales con aire acondicionado (siempre hay uno cerca en cualquier ciudad grande) — también sirven para comer y hacer algo de compras.',
      'Mercados nocturnos cubiertos o con toldos — muchos siguen funcionando con lluvia moderada.',
      'Masaje thai o spa: un clásico de día de lluvia, y barato fuera de las zonas más turísticas.',
      'Clase de cocina thai: suele ser en interior y es un buen plan para un día así.',
      'Museos y galerías, especialmente en Bangkok y Chiang Mai.',
      'Cafeterías con wifi para hacer una pausa larga y replanear el resto del día.'
    ]
  };

  // Referencia de coste fijo por persona (vuelos + alojamiento) calculada al
  // planificar el viaje — no es un gasto real ni una reserva, solo una cifra
  // orientativa para comparar con lo que acabe constando. El registro de
  // gastos real vive en Datos → Gastos.
  const PRESUPUESTO_TH = {
    intro: 'Referencia orientativa de coste fijo por persona para este viaje (vuelos + alojamiento), calculada al planificarlo — no incluye comida, entradas ni actividades, y no es un gasto real ni una reserva confirmada.',
    items: [
      'Vuelos internacionales (Madrid–Bangkok / Phuket–Madrid): ~616 € por persona.',
      'Vuelo interno Bangkok–Chiang Mai: ~70 € por persona.',
      'Vuelo interno Chiang Mai–Krabi: ~140 € por persona.',
      'Alojamiento, todas las noches del viaje: ~415 € por persona.',
      'Total aproximado (vuelos + alojamiento, sin comidas ni actividades): ~1.241 € por persona.'
    ]
  };

  const DINERO_TH = {
    intro: 'Algunos trucos para estirar el presupuesto en THB.',
    items: [
      'Cajeros: casi todos cobran una comisión fija (~220 THB) por operación, sea cual sea tu banco. Retira cantidades grandes pocas veces en vez de muchas pequeñas; revisa si tu propio banco te reembolsa las comisiones en el extranjero.',
      'Cambio de moneda: las casas de cambio tipo SuperRich suelen dar mejor cambio que los bancos o el aeropuerto.',
      'Regateo: normal en mercados y con tuk-tuks; no en tiendas con precio marcado ni en supermercados.',
      'Propinas: no son obligatorias. Redondear o dejar el cambio suelto en restaurantes está bien visto; en los puestos callejeros no se espera.',
      '7-Eleven: hay uno en casi cada esquina — útil para agua, tarjetas SIM y hasta para pagar reservas de alguna excursión.'
    ]
  };

  const EMERGENCIAS_TH = [
    { ico: '🚨', cat: 'Emergencias',
      items: [
        { l: 'Policía', tel: '191', d: 'Emergencia policial general.' },
        { l: 'Policía turística (Tourist Police)', tel: '1155', d: 'Atienden en inglés — denuncias, timos, mediación con comercios. La primera opción si el problema involucra a un turista.' },
        { l: 'Emergencia médica / ambulancia', tel: '1669', d: 'Número nacional de emergencia sanitaria.' }
      ] },
    { ico: '🛂', cat: 'Consulado',
      items: [
        { l: 'Embajada de España en Bangkok', d: 'Busca el teléfono de emergencia consular 24 h antes de viajar y guárdalo en el móvil — no lo escribimos aquí para no arriesgarnos a que quede desactualizado.' }
      ] }
  ];

  const GUIA_TOPICS = [
    { key: 'transporte', label: '🛺 Transporte', heads: ['Tuk-tuk, Grab y taxi', 'Trenes y vuelos domésticos', 'Ferris a las islas', 'Alquiler de scooter'] },
    { key: 'comida', label: '🍜 Comida callejera', heads: ['Comida callejera'] },
    { key: 'templos', label: '🙏 Templos', heads: ['Templos: etiqueta básica'] },
    { key: 'temporada', label: '🌧️ Temporada', heads: ['Temporada por región'] },
    { key: 'planb', label: '☔ Plan B', heads: ['Plan B para días de lluvia fuerte'] },
    { key: 'presupuesto', label: '🧾 Presupuesto', heads: ['Presupuesto de referencia'] },
    { key: 'dinero', label: '💸 Dinero', heads: ['Dinero: trucos en THB'] },
    { key: 'tuyas', label: '✍️ Tuyas', heads: ['Tus recomendaciones'] },
    { key: 'telefonos', label: '📞 Teléfonos', heads: ['Teléfonos importantes en Tailandia', 'Emergencias', 'Consulado'] }
  ];
  const HEAD_TO_GUIA_TOPIC = {};
  GUIA_TOPICS.forEach(t => t.heads.forEach(h => { HEAD_TO_GUIA_TOPIC[h] = t.key; }));

  function guiaSection(ico, cat, items) {
    const sec = el('section', 'reco-cat');
    sec.innerHTML =
      `<div class="reco-cat__head">` +
      `<span class="reco-cat__badge">${esc(ico)}</span>` +
      `<h3>${esc(cat)}</h3>` +
      `</div>` +
      `<div class="reco-cat__list">` +
      items.map(t => `<div class="reco-card">${esc(t)}</div>`).join('') +
      `</div>`;
    return sec;
  }

  function renderEmergenciasTH(body) {
    const lead = el('section', 'reco-cat emerg-lead');
    lead.innerHTML =
      `<div class="reco-cat__head">` +
      `<span class="reco-cat__badge">📞</span>` +
      `<h3>Teléfonos importantes en Tailandia</h3>` +
      `</div>` +
      `<p class="emerg-intro">Pulsa un número para llamar.</p>`;
    body.appendChild(lead);

    EMERGENCIAS_TH.forEach(g => {
      const sec = el('section', 'reco-cat emerg-cat');
      sec.innerHTML =
        `<div class="reco-cat__head">` +
        `<span class="reco-cat__badge">${esc(g.ico || '•')}</span>` +
        `<h3>${esc(g.cat)}</h3>` +
        `</div>` +
        `<div class="reco-cat__list">` +
        g.items.map(it => {
          const num = it.tel
            ? `<a class="emerg-num" href="tel:${esc(it.tel.replace(/\s+/g, ''))}">${esc(it.tel)}</a>`
            : '';
          return `<div class="reco-card emerg-card">` +
            `<div class="emerg-row"><span class="emerg-label">${esc(it.l)}</span>${num}</div>` +
            (it.d ? `<p class="emerg-note">${esc(it.d)}</p>` : '') +
            `</div>`;
        }).join('') +
        `</div>`;
      body.appendChild(sec);
    });
  }

  const RECO_CAT_ICO = { Ver: '👁️', Hacer: '🎯', Comer: '🍴', Comprar: '🛍️', Consejo: '💬', Otro: '📌' };

  function recoSummary(it) {
    const chip = it.categoria
      ? `<span class="reco-chip">${esc(RECO_CAT_ICO[it.categoria] || '')} ${esc(it.categoria)}</span>`
      : '';
    const link = it.link
      ? `<a class="reco-link" href="${esc(it.link)}" target="_blank" rel="noopener">Abrir enlace ›</a>`
      : '';
    return `<div class="item__title">${esc(it.texto || '')}</div>` +
      ((chip || link) ? `<div class="reco-foot">${chip}${link}</div>` : '');
  }

  function renderTransporte() {
    const body = $('#transporte-body');
    if (!body) return;
    body.innerHTML = '';

    const chips = el('div', 'chips chips--itin');
    chips.appendChild(guiaChip('all', 'Todo'));
    GUIA_TOPICS.forEach(t => chips.appendChild(guiaChip(t.key, t.label)));
    body.appendChild(chips);

    TRANSPORTE_LOCAL.forEach(g => body.appendChild(guiaSection(g.ico, g.cat, g.items)));
    body.appendChild(guiaSection('🍜', 'Comida callejera', COMIDA_CALLEJERA.items));
    body.appendChild(guiaSection('🙏', 'Templos: etiqueta básica', TEMPLOS_ETIQUETA.items));
    body.appendChild(guiaSection('🌧️', 'Temporada por región', TEMPORADA_TH.items));
    body.appendChild(guiaSection('☔', 'Plan B para días de lluvia fuerte', PLAN_B_TH.items));
    body.appendChild(guiaSection('🧾', 'Presupuesto de referencia', PRESUPUESTO_TH.items));
    body.appendChild(guiaSection('💸', 'Dinero: trucos en THB', DINERO_TH.items));

    const mine = el('section', 'reco-cat reco-cat--mine');
    mine.innerHTML =
      `<div class="reco-cat__head">` +
      `<span class="reco-cat__badge">✍️</span>` +
      `<h3>Tus recomendaciones</h3>` +
      `</div>`;

    const list = el('div', 'reco-cat__list');
    if (!state.recomendaciones.length) {
      const e = el('p', 'reco-empty');
      e.textContent = 'Apunta aquí cosas que te recomienden o que quieras hacer durante el viaje.';
      list.appendChild(e);
    } else {
      state.recomendaciones.forEach(it => {
        const c = itemCard('recomendacion', it, recoSummary(it), true);
        c.classList.add('reco-usercard');
        list.appendChild(c);
      });
    }
    mine.appendChild(list);

    const add = el('button', 'btn btn--accent btn--block');
    add.type = 'button';
    add.innerHTML = ICON.plus + ' Añadir recomendación';
    add.style.marginTop = 'var(--space-12)';
    add.addEventListener('click', () => openSheet('recomendacion'));
    mine.appendChild(add);

    body.appendChild(mine);

    renderEmergenciasTH(body);

    [...body.querySelectorAll('.reco-cat')].forEach(sec => {
      const h3 = sec.querySelector('h3');
      const key = h3 && HEAD_TO_GUIA_TOPIC[h3.textContent];
      sec.hidden = selectedGuiaTopic !== 'all' && selectedGuiaTopic !== key;
    });
  }

  /* ==========================================================
     Navegación por pestañas
     ========================================================== */
  const SCREENS = ['datos', 'itinerario', 'comer', 'quever', 'taz'];

  // Transporte y Muay Thai viven ahora plegados dentro de «Qué ver»: los
  // enlaces antiguos abren esa pantalla con su bloque desplegado.
  const QV_LEGACY = { transporte: 'qv-transporte', muaythai: 'qv-muaythai' };

  function showScreen(name) {
    if (QV_LEGACY[name]) {
      const d = document.getElementById(QV_LEGACY[name]);
      if (d) d.open = true;
      name = 'quever';
    }
    if (!SCREENS.includes(name)) name = 'datos';
    SCREENS.forEach(s => {
      const scr = $('#screen-' + s);
      if (scr) scr.hidden = (s !== name);
      const tab = $(`.tab[data-tab="${s}"]`);
      if (tab) tab.setAttribute('aria-current', s === name ? 'page' : 'false');
    });
    if (name === 'comer' || name === 'quever' || name === 'itinerario') {
      // La sección ya es visible: crea/redimensiona tras el reflujo.
      // Doble pasada (60 ms y 300 ms) para que Leaflet mida bien los contenedores.
      refreshMaps();
      setTimeout(refreshMaps, 60);
      setTimeout(refreshMaps, 300);
    }
    window.scrollTo(0, 0);
    if (name === 'itinerario') refreshMeteo();
    if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  }

  $$('.tab').forEach(t => t.addEventListener('click', () => showScreen(t.dataset.tab)));
  window.addEventListener('hashchange', () => showScreen(location.hash.slice(1)));

  // Los mapas de Muay Thai miden 0 mientras el bloque está plegado: se crean al abrirlo.
  on('#qv-muaythai', 'toggle', e => {
    if (!e.currentTarget.open) return;
    refreshMaps();
    setTimeout(refreshMaps, 60);
    setTimeout(refreshMaps, 300);
  });

  /* ==========================================================
     Bottom sheet
     ========================================================== */
  function showSheet() {
    const s = $('#sheet');
    s.hidden = false;
    s.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => {
      s.classList.add('is-open');
      const f = s.querySelector('input, select, textarea, button');
      if (f) f.focus();
    });
  }
  function hideSheet() {
    const s = $('#sheet');
    s.classList.remove('is-open');
    s.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { s.hidden = true; $('#sheet-form').innerHTML = ''; }, 220);
    editing = null;
  }
  $$('#sheet [data-close]').forEach(b => b.addEventListener('click', hideSheet));

  /* ==========================================================
     Diálogo de confirmación
     ========================================================== */
  let confirmResolve = null;
  function confirmAsk(msg) {
    return new Promise(resolve => {
      confirmResolve = value => {
        $('#confirm').hidden = true;
        if ($('#sheet').hidden) document.body.classList.remove('no-scroll');
        confirmResolve = null;
        resolve(value);
      };
      $('#confirm-msg').textContent = msg;
      $('#confirm').hidden = false;
      document.body.classList.add('no-scroll');
      requestAnimationFrame(() => $('#confirm [data-ok]').focus());
    });
  }
  $$('#confirm [data-cancel]').forEach(b => b.addEventListener('click', () => confirmResolve && confirmResolve(false)));
  on('#confirm [data-ok]', 'click', () => confirmResolve && confirmResolve(true));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#sheet').hidden) hideSheet();
    else if (!$('#confirm').hidden && confirmResolve) confirmResolve(false);
  });

  /* ==========================================================
     Toast
     ========================================================== */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('is-on');
      setTimeout(() => { t.hidden = true; }, 220);
    }, 2600);
  }

  /* ==========================================================
     Cuenta atrás hasta la salida del avión
     ========================================================== */
  function firstDeparture() {
    let best = null;
    state.vuelos.forEach(v => (v.tramos || []).forEach(t => {
      if (t.salida && (!best || t.salida < best)) best = t.salida;
    }));
    return best; // 'YYYY-MM-DDTHH:MM' o null
  }

  function countdownStr(depStr) {
    if (!depStr) return '';
    const dep = new Date(depStr).getTime();
    if (isNaN(dep)) return '';
    const ms = dep - Date.now();
    if (ms <= 0) return '';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (d >= 2) return d + ' días';
    if (d === 1) return '1 día ' + h + ' h';
    if (h >= 1) return h + ' h ' + m + ' min';
    return m + ' min';
  }

  // 'antes' | 'curso' | 'fin'
  function tripStatus() {
    const { fechaInicio, fechaFin } = state.meta;
    if (!fechaInicio) return 'antes';
    const hoy = hoyYMD();
    if (fechaFin && hoy > fechaFin) return 'fin';
    if (hoy >= fechaInicio) return 'curso';
    return 'antes';
  }

  function diaActual() {
    const { fechaInicio, fechaFin } = state.meta;
    if (!fechaInicio) return 0;
    const total = fechaFin ? eachDay(fechaInicio, fechaFin).length : 99;
    return Math.min(total, eachDay(fechaInicio, hoyYMD()).length || 1);
  }

  function updateCountdown() {
    const box = $('#appbar-count');
    if (!box) return;
    const st = tripStatus();

    if (st === 'fin') { box.hidden = true; box.classList.remove('is-live'); return; }

    if (st === 'curso') {
      box.textContent = 'En curso · día ' + diaActual();
      box.title = 'El viaje está en marcha';
      box.classList.add('is-live');
      box.hidden = false;
      return;
    }

    box.classList.remove('is-live');
    const s = countdownStr(firstDeparture());
    if (!s) { box.hidden = true; return; }
    box.innerHTML = ICON.plane + '<span>' + esc(s) + '</span>';
    const dp = dtParts(firstDeparture());
    box.title = dp.date ? `Salida del vuelo: ${fmtFecha(dp.date, true)}, ${dp.time}` : 'Cuenta atrás para el viaje';
    box.hidden = false;
  }

  /* ==========================================================
     Arranque
     ========================================================== */
  function paintAppbar() {
    $('#appbar-title').textContent = state.meta.titulo || 'Viaje a Tailandia';
    const m = state.meta;
    $('#appbar-sub').textContent = (m.fechaInicio && m.fechaFin)
      ? `${fmtFecha(m.fechaInicio)} – ${fmtFecha(m.fechaFin, true)}`
      : 'Sin fechas · añádelas en Datos';
    updateCountdown();
  }
  setInterval(updateCountdown, 60000);

  /* ==========================================================
     Tema claro / oscuro
     El script de <head> ya fijó data-theme antes de pintar. Aquí solo se
     dibuja el botón, se guarda la elección y, mientras no haya elección
     propia, se sigue el tema del sistema.
     ========================================================== */
  const TEMA_COLOR = { light: '#161a3c', dark: '#070920' };
  const temaActual = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const temaGuardado = () => { try { return localStorage.getItem('tema'); } catch (e) { return null; } };

  function paintTheme() {
    const dark = temaActual() === 'dark';
    const btn = $('#theme-btn');
    btn.innerHTML = dark ? ICON.sun : ICON.moon;
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
    $('meta[name="theme-color"]').content = TEMA_COLOR[temaActual()];
  }

  function setTheme(t, guardar) {
    document.documentElement.dataset.theme = t;
    if (guardar) { try { localStorage.setItem('tema', t === 'dark' ? 'oscuro' : 'claro'); } catch (e) { /* sin almacenamiento */ } }
    paintTheme();
  }

  on('#theme-btn', 'click', () => setTheme(temaActual() === 'dark' ? 'light' : 'dark', true));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ev => {
    if (!temaGuardado()) setTheme(ev.matches ? 'dark' : 'light', false);
  });
  paintTheme();

  function renderAll() {
    paintAppbar();
    renderDatos();
    renderItinerario();
    renderComer();
    renderTransporte();
    renderMuayThai();
  }

  /* ==========================================================
     Clima — Luz y luna (cálculo local con SunCalc)
     ========================================================== */
  const TH_CENTER = { lat: 13.7563, lng: 100.5018, label: 'Bangkok (centro)' };
  const isDate = d => d instanceof Date && !isNaN(d.getTime());

  // Ubicación de un día = alojamiento donde se duerme esa noche; si no, la
  // noche anterior; si nada, Bangkok como centro de referencia por defecto.
  function locForDate(dateStr) {
    let d = dateStr;
    for (let i = 0; i < 40; i++) {
      const a = state.alojamientos.find(x =>
        x.checkin && x.checkout && x.checkin <= d && d < x.checkout &&
        x.loc && x.loc.lat != null && x.loc.lng != null);
      if (a) return { lat: a.loc.lat, lng: a.loc.lng, label: a.nombre || 'Alojamiento' };
      const dt = parseDate(d);
      if (!dt) break;
      dt.setDate(dt.getDate() - 1);
      d = ymd(dt);
      if (state.meta.fechaInicio && d < state.meta.fechaInicio) break;
    }
    return { lat: TH_CENTER.lat, lng: TH_CENTER.lng, label: TH_CENTER.label };
  }
  const isFallbackCenter = l => l && l.lat === TH_CENTER.lat && l.lng === TH_CENTER.lng;

  function moonPhaseName(p) {
    if (p < 0.02 || p >= 0.98) return 'Luna nueva';
    if (p < 0.24) return 'Creciente';
    if (p < 0.26) return 'Cuarto creciente';
    if (p < 0.48) return 'Gibosa creciente';
    if (p < 0.52) return 'Luna llena';
    if (p < 0.74) return 'Gibosa menguante';
    if (p < 0.76) return 'Cuarto menguante';
    return 'Menguante';
  }

  function dayLenMin(dateNoon, loc) {
    const t = SunCalc.getTimes(dateNoon, loc.lat, loc.lng);
    if (!isDate(t.sunrise) || !isDate(t.sunset)) return null;
    return Math.round((t.sunset - t.sunrise) / 60000);
  }

  function moonInDarkWindow(win, loc) {
    if (!win) return null;
    const pts = [win.start.getTime(), (win.start.getTime() + win.end.getTime()) / 2, win.end.getTime()];
    const up = pts.filter(ms =>
      SunCalc.getMoonPosition(new Date(ms), loc.lat, loc.lng).altitude > 0).length;
    return up === 3 ? 'sí' : up === 0 ? 'no' : 'a medias';
  }

  function sky(dateStr) {
    const loc = locForDate(dateStr);
    // Mediodía en hora de Tailandia (ICT, UTC+7) del día: así SunCalc resuelve
    // siempre los eventos solares del día correcto sea cual sea la zona
    // horaria del dispositivo.
    const [Y, Mo, Da] = dateStr.split('-').map(Number);
    const localNoon = off => new Date(Date.UTC(Y, Mo - 1, Da + off, 12, 0, 0) - TH_TZ_OFFSET_MS);
    const noon = localNoon(0), prev = localNoon(-1), next = localNoon(1);

    const t = SunCalc.getTimes(noon, loc.lat, loc.lng);
    const tNext = SunCalc.getTimes(next, loc.lat, loc.lng);

    const todayLen = dayLenMin(noon, loc);
    const prevLen = dayLenMin(prev, loc);

    const darkWindow = (isDate(t.night) && isDate(tNext.nightEnd))
      ? { start: t.night, end: tNext.nightEnd } : null;

    const mi = SunCalc.getMoonIllumination(noon);
    const mt = SunCalc.getMoonTimes(noon, loc.lat, loc.lng);

    return {
      date: dateStr,
      locLabel: loc.label,
      loc: { lat: loc.lat, lng: loc.lng },
      sunrise: isDate(t.sunrise) ? t.sunrise : null,
      sunset: isDate(t.sunset) ? t.sunset : null,
      dayLengthMin: todayLen,
      deltaVsPrevMin: (todayLen != null && prevLen != null) ? todayLen - prevLen : null,
      goldenAM: { start: isDate(t.sunrise) ? t.sunrise : null, end: isDate(t.goldenHourEnd) ? t.goldenHourEnd : null },
      goldenPM: { start: isDate(t.goldenHour) ? t.goldenHour : null, end: isDate(t.sunset) ? t.sunset : null },
      civilDawn: isDate(t.dawn) ? t.dawn : null,
      civilDusk: isDate(t.dusk) ? t.dusk : null,
      darkWindow,
      moon: {
        phaseName: moonPhaseName(mi.phase),
        illumPct: Math.round(mi.fraction * 100),
        rise: isDate(mt.rise) ? mt.rise : null,
        set: isDate(mt.set) ? mt.set : null,
        alwaysUp: !!mt.alwaysUp,
        alwaysDown: !!mt.alwaysDown,
        inDarkWindow: moonInDarkWindow(darkWindow, loc)
      }
    };
  }

  /* ==========================================================
     Viabilidad del día — tiempos de trayecto y luz disponible
     ========================================================== */

  // Todo el cálculo va en minutos **continuos** desde la medianoche de
  // day.date en hora de Tailandia (ICT, UTC+7 fijo, sin horario de verano).
  // Los eventos (it.hora) están escritos en hora local de Tailandia; los
  // tiempos de SunCalc son instantes absolutos y se convierten a minutos
  // desde esa medianoche (puede pasar de 1440, o ser negativo — a propósito,
  // no se envuelve). Así el veredicto es correcto sea cual sea la zona
  // horaria del dispositivo.
  const COSTE_POR_TIPO = { excursion: EXCURSION_MIN, lugar: LUGAR_MIN, comida: COMIDA_MIN };

  function anchorMin(it) {
    // Los vuelos no anclan: no se depende de ellos para "salir", y su hora
    // puede estar en la zona del aeropuerto de origen.
    if (!['excursion', 'coche'].includes(it.t)) return null;
    const m = String(it.hora || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? (+m[1]) * 60 + (+m[2]) : null;
  }

  function itemCost(it) {
    const c = +it.costMin;
    if (Number.isFinite(c)) return c;
    const d = COSTE_POR_TIPO[it.t];
    return typeof d === 'number' ? d : 0;
  }

  // Determinista dado el estado (lee state.meta, state.alojamientos vía sky(), y SunCalc).
  function dayPlan(day) {
    const sk = (typeof SunCalc !== 'undefined' && state.meta.fechaInicio) ? sky(day.date) : null;
    // minutos continuos desde la medianoche de day.date en hora de Tailandia
    const midnight = Date.UTC(+day.date.slice(0, 4), +day.date.slice(5, 7) - 1, +day.date.slice(8, 10)) - TH_TZ_OFFSET_MS;
    const minOn = d => (isDate(d) ? Math.round((d.getTime() - midnight) / 60000) : null);

    const dawnMin = sk ? minOn(sk.civilDawn) : null;
    // Si el primer plan del día tiene una hora fija (p.ej. una excursión que
    // recoge a las 06:00), esa hora define el inicio real del día: no tiene
    // sentido marcarla como "no llegas" solo por no llegar a un suelo genérico.
    const earliestAnchorMin = day.items.reduce((min, it) => {
      const a = anchorMin(it);
      return a != null && (min == null || a < min) ? a : min;
    }, null);
    const inicio = earliestAnchorMin != null
      ? earliestAnchorMin
      : ((dawnMin != null && dawnMin > SALIDA_FLOOR_MIN) ? dawnMin : SALIDA_FLOOR_MIN);

    let reloj = inicio;
    let prev = null, drivingMin = 0;
    const legs = [];
    let firstAnchor = null, tHastaAncla = 0, missedAnchor = null;

    for (const it of day.items) {
      if (it.loc && it.loc.lat != null && prev && haversine(prev, it.loc) >= MIN_LEG_KM) {
        const leg = driveByRoad(prev, it.loc);
        drivingMin += leg.min;
        reloj += leg.min;
        legs.push(leg);
      }
      const a = anchorMin(it);
      if (a != null) {
        if (firstAnchor == null) { firstAnchor = a; tHastaAncla = reloj - inicio; }
        if (reloj > a + MARGEN_ANCLA_MIN) missedAnchor = missedAnchor || (it.titulo || 'un evento');
        reloj = Math.max(reloj, a);
      }
      reloj += itemCost(it);
      if (it.loc && it.loc.lat != null) prev = it.loc;
    }

    const endMin = reloj;
    const salirMin = firstAnchor != null ? firstAnchor - tHastaAncla : null;

    let luz = null;
    const sunsetMin = sk ? minOn(sk.sunset) : null;
    const duskMin = sk ? minOn(sk.civilDusk) : null;
    if (sunsetMin != null) {
      if (missedAnchor) luz = 'pasa';
      else if (endMin <= sunsetMin - MARGEN_ATARDECER_MIN) luz = 'ok';
      else if (duskMin != null && endMin <= duskMin) luz = 'justo';
      else if (duskMin == null) luz = 'ok';
      else luz = 'pasa';
    }

    const h = drivingMin / 60;
    const volante = h <= VOLANTE_LARGO_H ? 'ok' : h <= VOLANTE_MAX_H ? 'largo' : 'excesivo';

    const rank = { ok: 0, justo: 1, largo: 1, pasa: 2, excesivo: 2 };
    let veredicto = ['verde', 'ambar', 'rojo'][Math.max(rank[luz || 'ok'], rank[volante])];

    if (missedAnchor) veredicto = 'rojo';                       // siempre rojo, aunque no haya sky
    else if (!sk && volante === 'ok') veredicto = null;         // nada que decir sin luz ni trayecto
    if (day.items.some(x => x.t === 'vuelo')) veredicto = null; // día de vuelo: no se juzga
    if (!legs.length && firstAnchor == null && endMin === inicio) veredicto = null; // día sin nada

    return { drivingMin, legs, salirMin, endMin, inicioMin: inicio, missedAnchor, luz, volante, veredicto };
  }

  // Minutos continuos desde medianoche → 'HH:MM' (con ' (+1 d)' si pasa de medianoche).
  function hhmmFromMin(m) {
    if (m == null) return '';
    const t = Math.round(m);
    const hm = `${pad2(Math.floor((t % 1440 + 1440) % 1440 / 60))}:${pad2(((t % 60) + 60) % 60)}`;
    return t >= 1440 ? hm + ' (+1 d)' : hm;
  }

  function verdictLabel(p) {
    if (p.veredicto === 'rojo') {
      if (p.missedAnchor) return 'No llegas a: ' + p.missedAnchor;
      if (p.volante === 'excesivo') return fmtDur(p.drivingMin) + ' de trayecto';
      if (p.luz === 'pasa') return 'Terminas de noche';
      return '';
    }
    if (p.veredicto === 'ambar') {
      if (p.luz === 'justo') return 'Justo de luz';
      if (p.volante === 'largo') return fmtDur(p.drivingMin) + ' de trayecto';
      return '';
    }
    return ''; // verde: solo el punto
  }

  // Sitios cercanos a cada alojamiento para ver combates de Muay Thai, con
  // los días de la semana en los que suelen tener cartel y qué noche de la
  // estancia encaja. Investigado y verificado en septiembre de 2026 —
  // los estadios cambian de cartel a menudo: confirma horario y entradas
  // más cerca de la fecha.
  const MUAYTHAI_SEED = [
    { zona: 'Bangkok', fechas: '25 – 29 nov (4 noches)',
      lugares: [
        { nombre: 'Rajadamnern Stadium', nota: 'Uno de los dos estadios históricos de Bangkok. Cartel todas las noches de la semana.',
          dias: 'Viernes 27 nov: velada a las 19:00 (es la del plan, a la vuelta de Ayutthaya).', horario: 'Puertas ~18:00, combates desde las 19:00.', web: 'https://rajadamnern.com/',
          entradas: 'https://www.ticketmelon.com/raj/knockout-27nov26',
          precio: 'Entrada ~1.500–4.500 THB según localidad', precioThb: [1500, 4500],
          loc: { lat: 13.7640, lng: 100.5092 }, foto: FOTO.rajadamnern, desc: 'El estadio de Muay Thai más antiguo del mundo (desde 1945), uno de los dos templos del boxeo tailandés en Bangkok.' },
        { nombre: 'Lumpinee Boxing Stadium', nota: 'El otro estadio histórico, ahora bajo el sello ONE Championship y trasladado a las afueras (Ram Inthra), ya no en su antigua sede de Rama IV. Los «ONE Friday Fights» son semanales, los viernes.',
          dias: 'Solo los viernes (ONE Friday Fights). El viernes 27 nov el plan es la velada de Rajadamnern.', horario: 'Desde las 18:30.', web: 'https://www.onefc.com/',
          precio: 'Entrada ~1.000–3.500 THB según localidad', precioThb: [1000, 3500],
          loc: { lat: 13.8630, lng: 100.6323 }, foto: FOTO.lumpinee, desc: 'El otro gran estadio histórico de Bangkok, hoy sede de los combates televisados de ONE Championship.' }
      ] },
    { zona: 'Chiang Mai', fechas: '29 nov – 3 dic (4 noches)',
      lugares: [
        { nombre: 'Loi Kroh Boxing Stadium', nota: 'Céntrico, en Loi Kroh Road. Ya está entre las opciones de la noche libre del itinerario.',
          dias: 'Lunes 30 nov (también viernes/sábado si se cambia de plan).', horario: 'Puertas ~20:00, combates desde las 21:00.', web: 'https://loikrohboxingstadium.com/',
          precio: 'Entrada ~600–1.000 THB según localidad', precioThb: [600, 1000],
          loc: { lat: 18.7840, lng: 99.0000 }, foto: FOTO.muayThai, desc: 'Estadio de Muay Thai en pleno centro de Chiang Mai, con combates casi todas las noches.' },
        { nombre: 'Thapae Boxing Stadium', nota: 'Cerca de la puerta Thapae.',
          dias: 'Lunes 30 nov o martes 1 dic (las fuentes no coinciden del todo en los días exactos — confírmalo el mismo día).', horario: 'Combates desde las ~21:00.', web: 'https://muaythaichiangmai.com/fight-schedule',
          precio: 'Entrada ~600–1.500 THB según localidad', precioThb: [600, 1500],
          loc: { lat: 18.7874, lng: 98.9934 }, foto: FOTO.muayThai, desc: 'Estadio de Muay Thai cerca de la puerta Thapae, en el casco antiguo de Chiang Mai.' }
      ] },
    { zona: 'Krabi / Ao Nang', fechas: '3 – 5 dic (2 noches)',
      lugares: [
        { nombre: 'Ao Nang Landmark Boxing Stadium', nota: 'Cartel martes, jueves y sábado.',
          dias: 'Jueves 3 dic.', horario: 'Desde las 21:00.', web: 'https://www.muaythaistadium.com/ao-nang',
          precio: 'Entrada ~1.200–1.900 THB según localidad', precioThb: [1200, 1900],
          loc: { lat: 8.0425, lng: 98.8108 }, foto: FOTO.muayThai, desc: 'Estadio de Muay Thai en Ao Nang, con combates varias noches por semana.' },
        { nombre: 'Ao Nang Krabi Boxing Stadium (Krabi International)', nota: 'Uno de los estadios más grandes de Krabi, cartel los viernes.',
          dias: 'Viernes 4 dic.', horario: 'Desde las 21:00.', web: 'https://krabiinternationalboxingstadium.com/',
          precio: 'Entrada ~1.300–1.900 THB según localidad', precioThb: [1300, 1900],
          loc: { lat: 8.0433, lng: 98.8088 }, foto: FOTO.muayThai, desc: 'Uno de los estadios de Muay Thai más grandes de la provincia de Krabi.' }
      ] },
    { zona: 'Koh Phi Phi', fechas: '5 – 7 dic (2 noches)',
      lugares: [
        { nombre: 'Phi Phi Reggae Bar', nota: 'En Tonsai Village. No es un estadio formal: combates de ambiente/amateur cada noche.',
          dias: 'Sábado 5 dic o domingo 6 dic, cualquiera de las dos.', horario: 'Por la noche, consulta in situ.', web: '',
          precio: 'Entrada gratis con una consumición (~100–150 THB la bebida)', precioThb: [100, 150],
          loc: { lat: 7.7407, lng: 98.7784 }, foto: FOTO.muayThai, desc: 'Bar de ambiente en Tonsai Village con un pequeño ring donde se organizan combates amistosos cada noche.' }
      ] },
    { zona: 'Phuket', fechas: '7 – 9 dic (2 noches)',
      lugares: [
        { nombre: 'Bangla Boxing Stadium', nota: 'En Patong, justo detrás de Jungceylon. Cartel las 7 noches de la semana.',
          dias: 'Lunes 7 dic o martes 8 dic, cualquiera de las dos.', horario: 'Combates de 21:00 a 00:00.', web: 'https://banglaboxingstadium.com/',
          precio: 'Entrada ~1.600–2.000 THB según localidad', precioThb: [1600, 2000],
          loc: { lat: 7.8904, lng: 98.2998 }, foto: FOTO.bangla, desc: 'Estadio de Muay Thai en el corazón de Patong, con combates todas las noches del año.' },
        { nombre: 'Patong Boxing Stadium', nota: 'También en Patong. Cartel lunes, martes, miércoles y jueves.',
          dias: 'Lunes 7 dic o martes 8 dic.', horario: 'Desde las 21:00.', web: 'https://www.muaythaistadium.com/patong-stadium',
          precio: 'Entrada ~1.500–1.800 THB según localidad', precioThb: [1500, 1800],
          loc: { lat: 7.8966, lng: 98.2954 }, foto: FOTO.muayThai, desc: 'Otro estadio de Muay Thai en Patong, con cartel varias noches por semana.' }
      ] }
  ];

  function muayThaiCard(zona, idx, aloj) {
    const key = 'mt-' + idx;
    const c = zonaCard(zona, key);
    zona.lugares.forEach((l, i) => c.appendChild(venueCard('mt', l, aloj, i + 1, key)));
    return c;
  }

  function renderMuayThai() {
    const body = $('#muaythai-body');
    if (!body) return;
    destroyZoneMaps('mt-');
    body.innerHTML = '';
    body.appendChild(notice('Cartel, entradas y horarios orientativos (revisados en septiembre de 2026) — los estadios cambian el programa y el precio a menudo, confirma fecha y entradas más cerca del viaje. Distancias en línea recta desde el alojamiento, no ruta real.'));
    MUAYTHAI_SEED.forEach((zona, idx) => {
      const aloj = state.alojamientos.find(a => a.zona === zona.zona);
      body.appendChild(muayThaiCard(zona, idx, aloj));
    });
    refreshMaps();
  }

  /* ==========================================================
     Meteo — nubes y lluvia (Open-Meteo)
     ========================================================== */
  function meteoLocs() {
    const seen = new Set(), out = [];
    eachDay(state.meta.fechaInicio, state.meta.fechaFin).forEach(d => {
      const l = locForDate(d);
      if (isFallbackCenter(l)) return;   // día sin alojamiento: no pedir meteo del centro por defecto
      const key = l.lat.toFixed(2) + ',' + l.lng.toFixed(2);
      if (!seen.has(key)) { seen.add(key); out.push({ key, lat: l.lat, lng: l.lng }); }
    });
    return out;
  }

  // Nubes, lluvia y probabilidad de lluvia de Open-Meteo (~16 días) por
  // ubicación de pernocta. Cacheado en state.meteo; refresco máx. cada 2 h.
  // Fallo silencioso (solo red/HTTP/parseo; si el re-render peta, que se vea
  // en consola).
  let meteoFetching = false;
  function refreshMeteo() {
    if (meteoFetching) return;                        // ya hay una petición en curso (init + showScreen)
    if (!navigator.onLine) return;
    if (!state.meta.fechaInicio || !state.meta.fechaFin) return;
    const f = state.meteo && state.meteo.fetched;
    if (f && Date.now() - Date.parse(f) < 2 * 3600e3) return;

    const locs = meteoLocs();
    if (!locs.length) return;
    const om = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + locs.map(l => l.lat).join(',')
      + '&longitude=' + locs.map(l => l.lng).join(',')
      + '&hourly=cloud_cover,precipitation,precipitation_probability&forecast_days=16&timezone=UTC';

    meteoFetching = true;
    fetch(om).then(r => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null)
      .then(omRaw => {
        meteoFetching = false;
        if (!omRaw) return;
        // Recorta las series a la ventana del viaje (± margen): evita guardar
        // 16 días de datos horarios por ubicación y re-parsearlos en cada render.
        const t0 = Date.parse(state.meta.fechaInicio + 'T00:00:00Z') - 12 * 3600e3;
        const t1 = Date.parse(state.meta.fechaFin + 'T00:00:00Z') + 36 * 3600e3;
        const inTrip = iso => { const ms = Date.parse(iso); return ms >= t0 && ms <= t1; };

        const results = Array.isArray(omRaw) ? omRaw : [omRaw];
        // Parten de lo cacheado: si Open-Meteo no devuelve una ubicación, no se pierde su serie previa.
        const clouds = Object.assign({}, (state.meteo && state.meteo.clouds) || {});
        const precip = Object.assign({}, (state.meteo && state.meteo.precip) || {});
        results.forEach((res, i) => {
          if (!locs[i] || !res || !res.hourly || !Array.isArray(res.hourly.time)) return;
          const H = res.hourly;
          if (Array.isArray(H.cloud_cover)) {
            clouds[locs[i].key] = H.time
              .map((t, j) => ({ t: t + 'Z', pct: H.cloud_cover[j] }))
              .filter(x => typeof x.pct === 'number' && inTrip(x.t));
          }
          if (Array.isArray(H.precipitation)) {
            precip[locs[i].key] = H.time
              .map((t, j) => ({
                t: t + 'Z',
                mm: H.precipitation[j],
                prob: Array.isArray(H.precipitation_probability) ? H.precipitation_probability[j] : undefined
              }))
              .filter(x => typeof x.mm === 'number' && inTrip(x.t));
          }
        });
        // Poda las claves de ubicaciones que ya no están en el viaje (alojamiento
        // cambiado/borrado): evita crecer sin límite y que una clave vieja gane
        // el match de "más cercana".
        const cur = new Set(locs.map(l => l.key));
        [clouds, precip].forEach(m => Object.keys(m).forEach(k => { if (!cur.has(k)) delete m[k]; }));

        state.meteo = { clouds, precip, fetched: new Date().toISOString() };
        save();
        const hayDatos = Object.keys(clouds).some(k => clouds[k].length) || Object.keys(precip).some(k => precip[k].length);
        if (hayDatos) {
          const ae = document.activeElement;
          const itin = $('#itin-body');
          if (!(ae && itin && itin.contains(ae))) renderItinerario();
        }
      });
  }

  function initGazList() {
    const dl = $('#gaz-list');
    if (!dl) return;
    GAZ.forEach(g => { const o = el('option'); o.value = g.n; dl.appendChild(o); });
  }

  try {
    initGazList();
    renderAll();
    showScreen(location.hash.slice(1) || 'datos');
    refreshFx();
    refreshMeteo();
  } catch (err) {
    console.error('Error al iniciar:', err);
    const b = document.getElementById('datos-body');
    if (b) b.innerHTML = '<div class="notice">Ha ocurrido un error al cargar. Cierra la app del todo y vuelve a abrirla; si persiste, borra los datos del sitio en el navegador.</div>';
  }

})();

/* ==========================================================
   Service worker: registro y actualización automática
   ========================================================== */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var LOOP_KEY = 'sw-reload-at';
  var reloaded = false;
  var retryTimer = null;
  // Solo recargamos en el controllerchange que provoca una actualización que
  // hemos iniciado nosotros. El controllerchange de la primera instalación
  // (por el clients.claim() del SW) no debe recargar nada.
  var updating = false;

  function readMark() {
    try { return +sessionStorage.getItem(LOOP_KEY) || 0; } catch (e) { return 0; }
  }
  function writeMark() {
    try { sessionStorage.setItem(LOOP_KEY, String(Date.now())); } catch (e) {}
  }

  // Solo es seguro recargar si no hay ningún panel modal abierto.
  function safeToReload() {
    var sheet = document.getElementById('sheet');
    var conf = document.getElementById('confirm');
    return (!sheet || sheet.hidden) && (!conf || conf.hidden);
  }

  // Pide al worker en espera que tome el control; si hay un modal abierto,
  // reintenta en 2 s (una sola cadena de reintento).
  function applyUpdate(reg) {
    if (!reg.waiting) return;
    if (!safeToReload()) {
      if (retryTimer) return;
      retryTimer = setTimeout(function () {
        retryTimer = null;
        applyUpdate(reg);
      }, 2000);
      return;
    }
    updating = true;
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Sigue a un worker entrante: si llega a 'installed' con un controller activo
  // es una actualización (no la primera instalación) y se aplica.
  function track(reg, sw) {
    if (!sw) return;
    sw.addEventListener('statechange', function () {
      if (sw.state === 'installed' && navigator.serviceWorker.controller) {
        applyUpdate(reg);
      }
    });
  }

  // El worker nuevo ha tomado el control: recargar una vez, salvo bucle.
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!updating || reloaded) return;
    if (Date.now() - readMark() < 10000) {
      console.warn('[sw] recarga omitida: posible bucle de actualización.');
      writeMark();   // reinicia la ventana para no encadenar recargas
      return;
    }
    reloaded = true;
    writeMark();
    location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.update().catch(function () {});

      // Versión nueva ya esperando de una carga anterior.
      if (reg.waiting && navigator.serviceWorker.controller) applyUpdate(reg);
      // Worker que ya estaba instalándose en el momento de registrar.
      track(reg, reg.installing);
      // Versión nueva que aparece mientras la app está abierta.
      reg.addEventListener('updatefound', function () {
        track(reg, reg.installing);
      });

      // Al volver a primer plano tras un rato, buscar versión nueva.
      var lastCheck = Date.now();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible') return;
        if (Date.now() - lastCheck < 15 * 60 * 1000) return;
        lastCheck = Date.now();
        reg.update().catch(function () {});
      });
    }).catch(function (e) {
      console.warn('[sw] registro fallido:', e);
    });
  });
})();
