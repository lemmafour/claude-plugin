#!/usr/bin/env node
// Lemmafour publish helper for AI agents. Node 18+, no dependencies.
//   node lemmafour.mjs templates
//   node lemmafour.mjs validate <doc.md> [--template id]
//   node lemmafour.mjs render <doc.md> [--out doc.pdf] [--template id] [--profile id]
//        [--set key=value ...] [--free] [--flavor pandoc|quarto|obsidian|myst]
// --set overrides a frontmatter setting (columns=2, margins=compact, paper=us-letter...);
// --free makes the free version when the account has no plan for a paid choice;
// --flavor reads a whole file written for another tool with that tool's syntax (a .qmd
// file is read as Quarto unless --flavor says otherwise).
// Prints one JSON object. Exit codes: 0 success, 1 the document needs changes (read the
// diagnostics), 2 usage or network problem.
// Sends only what it prints about: the Markdown file and the images it references, to the
// Lemmafour API (https://mcp.lemmafour.com), which renders in memory and stores nothing.
// It sends no credentials: free features need no account, and paid ones go through the
// Lemmafour connector's sign-in. LEMMAFOUR_API_URL points it at another Lemmafour server
// (for testing).
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const API = (process.env.LEMMAFOUR_API_URL ?? 'https://mcp.lemmafour.com').replace(/\/+$/, '');
const ASSET_PATH = /^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._/-]{0,200}\.(png|jpe?g|gif|webp|svg)$/i;
const MAX_ASSETS = 64;

/** Ends the run with this result. Unwinds to the bottom of the file instead of calling
 * process.exit(), which on Windows can abort while piped output is still being written. */
class Finished {
  constructor(result, code) {
    this.result = result;
    this.code = code;
  }
}

function print(result, code) {
  throw new Finished(result, code);
}

function usage(message) {
  print({ ok: false, error: { code: 'usage', message: `${message} Usage: lemmafour.mjs templates | validate <doc.md> | render <doc.md> [--out file.pdf] [--template id] [--profile id] [--set key=value ...] [--free] [--flavor name]` } }, 2);
}

/** "true", "2", "0.9" become booleans and numbers; anything else stays text. */
function settingValue(text) {
  if (text === 'true' || text === 'false') return text === 'true';
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
}

function parseArgs(argv) {
  const [command, file, ...rest] = argv;
  const options = { settings: {} };
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    if (flag === '--free') {
      options.free = true;
      continue;
    }
    if (!['--out', '--template', '--profile', '--set', '--flavor'].includes(flag) || rest[i + 1] === undefined) usage(`Unknown or incomplete option ${flag}.`);
    if (flag === '--set') {
      const [key, ...value] = rest[i + 1].split('=');
      if (!key || value.length === 0) usage(`--set needs key=value, for example --set columns=2.`);
      options.settings[key] = settingValue(value.join('='));
    } else {
      options[flag.slice(2)] = rest[i + 1];
    }
    i += 1;
  }
  return { command, file, options };
}

/** Relative image paths the Markdown references, read from disk next to the file. */
function collectAssets(markdown, baseDir) {
  const paths = new Set();
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) paths.add(match[1]);
  for (const match of markdown.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) paths.add(match[1]);
  const assets = [];
  const skipped = [];
  for (const raw of paths) {
    const relative = decodeURI(raw).replace(/^\.\//, '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(relative) || relative.startsWith('/')) continue; // URLs and absolute paths
    const full = path.resolve(baseDir, relative);
    if (!ASSET_PATH.test(relative) || !existsSync(full) || !statSync(full).isFile()) {
      skipped.push(relative);
      continue;
    }
    assets.push({ path: relative, contentBase64: readFileSync(full).toString('base64') });
  }
  if (assets.length > MAX_ASSETS) usage(`The document references ${assets.length} images; the limit is ${MAX_ASSETS}.`);
  return { assets, skipped };
}

async function call(route, init = {}) {
  try {
    return await fetch(`${API}${route}`, init);
  } catch (error) {
    print({ ok: false, error: { code: 'network', message: `Could not reach ${API}: ${error.cause?.code ?? error.message}` } }, 2);
  }
}

async function failure(response) {
  const body = await response.json().catch(() => ({}));
  const authProblem = response.status === 401 || response.status === 403 || response.status === 503;
  const paidOnly = (body.diagnostics ?? []).some((d) => d.code?.startsWith('access.'));
  print({
    ok: false,
    status: response.status,
    error: body.error ?? { code: `http.${response.status}`, message: response.statusText },
    diagnostics: body.diagnostics ?? [],
    // Paid choices: apply each diagnostic's free fix (or --free), or make the PDF with the
    // Lemmafour connector's render_pdf, which signs the user in to their plan.
    ...(paidOnly ? { paidFeatures: 'Use the free fixes, or the Lemmafour connector (render_pdf) to use a Lemmafour plan.' } : {}),
    ...(body.plansUrl ? { plansUrl: body.plansUrl } : {}),
  }, authProblem && !paidOnly ? 2 : 1);
}

async function main() {
  const { command, file, options } = parseArgs(process.argv.slice(2));

  if (command === 'templates') {
    const response = await call('/v1/templates');
    if (!response.ok) await failure(response);
    const body = await response.json();
    print({ ok: true, templates: body.templates, profiles: body.profiles, settings: body.settings, markdownSyntax: body.markdownSyntax, notRendered: body.notRendered, limits: body.limits }, 0);
  }

  if (command !== 'render' && command !== 'validate') usage('Unknown command.');
  if (!file || !existsSync(file)) usage(`Markdown file not found: ${file ?? '(none)'}.`);

  const markdown = readFileSync(file, 'utf8');
  const flavor = options.flavor ?? (/\.qmd$/i.test(file) ? 'quarto' : undefined);
  const { assets, skipped } = collectAssets(markdown, path.dirname(path.resolve(file)));
  const body = JSON.stringify({
    markdown,
    ...(options.template ? { template: options.template } : {}),
    ...(options.profile ? { profile: options.profile } : {}),
    ...(Object.keys(options.settings).length ? { settings: options.settings } : {}),
    ...(options.free ? { withoutPlan: 'use-free-alternative' } : {}),
    ...(flavor ? { markdownFlavor: flavor } : {}),
    ...(assets.length ? { assets } : {}),
  });
  const notes = skipped.length ? { skippedImages: skipped, note: 'These images were not found or have unsupported paths; they will be reported as missing.' } : {};

  if (command === 'validate') {
    const response = await call('/v1/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (!response.ok) await failure(response);
    const report = await response.json();
    print({ ok: report.valid, valid: report.valid, profile: report.profile, pageCount: report.pageCount, appliedSettings: report.appliedSettings, diagnostics: report.diagnostics, ...notes }, report.valid ? 0 : 1);
  }

  const out = options.out ?? file.replace(/\.(md|markdown|qmd)$/i, '') + '.pdf';
  const response = await call('/v1/render', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body,
  });
  if (!response.ok) await failure(response);
  const rendered = await response.json();
  writeFileSync(out, Buffer.from(rendered.pdfBase64, 'base64'));
  print({
    ok: true,
    output: path.resolve(out),
    pageCount: rendered.pageCount,
    appliedSettings: rendered.appliedSettings,
    // Settings and syntax Lemmafour translated, or free alternatives it used: keep the
    // document in sync with them, and tell the user what changed.
    notes: rendered.diagnostics.filter((d) => d.severity === 'info').map((d) => d.message),
    warnings: rendered.diagnostics.filter((d) => d.severity === 'warning'),
    ...(rendered.freeAlternatives ? { freeAlternatives: rendered.freeAlternatives } : {}),
    ...(rendered.missingImages ? { missingImages: rendered.missingImages } : {}),
    ...notes,
  }, 0);
}

let finished;
try {
  await main();
  finished = new Finished({ ok: false, error: { code: 'internal', message: 'The script ended without a result.' } }, 2);
} catch (error) {
  finished = error instanceof Finished
    ? error
    : new Finished({ ok: false, error: { code: 'internal', message: String(error?.message ?? error) } }, 2);
}
// Let Node drain stdout and exit on its own with this code.
process.stdout.write(`${JSON.stringify(finished.result, null, 2)}\n`);
process.exitCode = finished.code;
