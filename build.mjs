// ===========================================================================
//  USMS Control — Build de producción: empaqueta (esbuild) + ofusca
//  (javascript-obfuscator) cada punto de entrada a assets/prod/.
//  El código fuente legible vive en assets/js/; en producción se sirve solo
//  la versión ofuscada. Ejecutar con:  npm run build
// ===========================================================================
import { build } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(ROOT, 'assets/prod');

// Puntos de entrada (módulos ES) y un script clásico (antiplagio).
const MODULES = ['app', 'td-app', 'academia-portal', 'examen'];
const SUPABASE_CDN = 'https://esm.sh/@supabase/supabase-js@2';

// La dependencia de Supabase se resuelve en el navegador (import externo),
// así que se mantiene fuera del bundle.
async function bundleModule(name) {
  const r = await build({
    entryPoints: [resolve(ROOT, `assets/js/${name}.js`)],
    bundle: true,
    format: 'esm',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    external: [SUPABASE_CDN],
    write: false,
  });
  return r.outputFiles[0].text;
}

async function bundleClassic(name) {
  const r = await build({
    entryPoints: [resolve(ROOT, `assets/js/${name}.js`)],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    write: false,
  });
  return r.outputFiles[0].text;
}

// Configuración de ofuscación: fuerte pero segura para una SPA
// (NO renombra propiedades ni claves de objeto → no rompe DOM/Supabase).
const obfOptions = (esModule) => ({
  compact: true,
  target: 'browser',
  renameGlobals: false,
  renameProperties: false,
  transformObjectKeys: false,
  identifierNamesGenerator: 'mangled-shuffled',
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  numbersToExpressions: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.9,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayIndexShift: true,
  stringArrayWrappersType: 'function',
  stringArrayWrappersCount: 2,
  selfDefending: true,
  disableConsoleOutput: true,
  // ESM: no tocar la estructura de import/export.
  ...(esModule ? { ignoreImports: true } : {}),
});

function obfuscate(code, esModule) {
  return JavaScriptObfuscator.obfuscate(code, obfOptions(esModule)).getObfuscatedCode();
}

async function run() {
  await mkdir(OUT, { recursive: true });
  for (const name of MODULES) {
    const bundled = await bundleModule(name);
    const out = obfuscate(bundled, true);
    await writeFile(resolve(OUT, `${name}.js`), out, 'utf8');
    console.log(`✓ ${name}.js  (${(out.length / 1024).toFixed(0)} KB ofuscado)`);
  }
  const anti = await bundleClassic('antiplagio');
  await writeFile(resolve(OUT, 'antiplagio.js'), obfuscate(anti, false), 'utf8');
  console.log('✓ antiplagio.js');
}

run().catch((e) => { console.error(e); process.exit(1); });
