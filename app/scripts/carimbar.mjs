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
// Versão que o usuário vê (0.50, 0.51…): sobe 1 a cada commit da main que muda o app (app/, menos este arquivo).
// Precisa do histórico completo (actions/checkout com fetch-depth: 0). BASE = contagem no commit da versão 0.50.
const BASE = 14;
let num = null;
try { num = 50 + Number(execSync("git rev-list --count HEAD -- . ':(exclude)src/versaoApp.ts'", {cwd: join(dirname(arq), "..")}).toString().trim()) - BASE; } catch {}
let txt = readFileSync(arq, 'utf8').replace(/VERSAO_WEB = '[^']*'/, `VERSAO_WEB = '${v}'`);
if (num != null && num >= 50) txt = txt.replace(/VERSAO_APP = '[^']*'/, `VERSAO_APP = '${(num / 100).toFixed(2)}'`);
writeFileSync(arq, txt);
console.log('versão', v, '· versão do app', txt.match(/VERSAO_APP = '([^']*)'/)?.[1]);
