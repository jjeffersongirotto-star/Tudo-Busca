// Carimba a versão do app web em src/versaoApp.ts: AAAA.MM.DD.HHMM-hash7 (horário de Brasília), como servidor/versao.py.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const arq = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'versaoApp.ts');
let hash = 'local'; try { hash = execSync('git rev-parse --short=7 HEAD').toString().trim(); } catch {}
const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'})
  .formatToParts(new Date()).map(x => [x.type, x.value]));
const v = `${p.year}.${p.month}.${p.day}.${p.hour}${p.minute}-${hash}`;
writeFileSync(arq, readFileSync(arq, 'utf8').replace(/VERSAO_WEB = '[^']*'/, `VERSAO_WEB = '${v}'`));
console.log('versão', v);
