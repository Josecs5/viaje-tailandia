// Saca de app.js las horas de la hora Taz y las guarda en bot/taz-horario.json,
// que es lo que lee el bot de Telegram (bot/worker.js).
//
// Ejecuta el mismo bloque del sorteo que usa la app (entre <taz-plan> y
// </taz-plan>), así que las horas del bot siempre coinciden con las de la
// ruleta. Solo guarda las horas: ni personas ni retos, para no destripar nada.
//
// Uso: node bot/generar-horario.mjs        (escribe el JSON)
//      node bot/generar-horario.mjs --check (falla si el JSON no está al día)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(raiz, 'app.js'), 'utf8');
const m = app.match(/\/\/ <taz-plan>[^\n]*\n([\s\S]*?)\/\/ <\/taz-plan>/);
if (!m) throw new Error('No encuentro el bloque <taz-plan> … </taz-plan> en app.js');

const codigo = `(() => {
  const pad2 = n => String(n).padStart(2, '0');
  ${m[1]}
  return { TAZ_PLAN, TAZ_INICIO, TAZ_FIN, TAZ_UTC_OFFSET };
})()`;
const { TAZ_PLAN, TAZ_INICIO, TAZ_FIN, TAZ_UTC_OFFSET } = vm.runInNewContext(codigo, {});

const fechas = Object.keys(TAZ_PLAN).sort();
const turnos = [];
fechas.forEach(fecha => {
  const ts = TAZ_PLAN[fecha].turnos;
  ts.forEach(t => {
    const utc = Date.parse(fecha + 'T00:00Z') + t.min * 60e3 - TAZ_UTC_OFFSET;
    turnos.push({
      fecha,
      turno: t.clave,                 // 'dia' | 'noche'
      utc: new Date(utc).toISOString(),
      doble: ts.length > 1            // ese día hay turno de día y de noche
    });
  });
});
turnos.forEach((t, i) => {
  t.primera = i === 0;
  t.ultima = i === turnos.length - 1;
});

const salida = JSON.stringify({ inicio: TAZ_INICIO, fin: TAZ_FIN, turnos }, null, 2) + '\n';
const destino = join(raiz, 'bot', 'taz-horario.json');

if (process.argv.includes('--check')) {
  const actual = existsSync(destino) ? readFileSync(destino, 'utf8') : '';
  if (actual !== salida) {
    console.error('bot/taz-horario.json no está al día: ejecuta node bot/generar-horario.mjs');
    process.exit(1);
  }
  console.log('bot/taz-horario.json está al día');
} else {
  writeFileSync(destino, salida);
  console.log(`bot/taz-horario.json: ${turnos.length} turnos del ${TAZ_INICIO} al ${TAZ_FIN}`);
}
