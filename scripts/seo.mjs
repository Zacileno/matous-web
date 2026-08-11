#!/usr/bin/env node
/**
 * Doplní doménu do všech SEO míst a přerazítkuje sitemapu dnešním datem.
 *
 * Použití:
 *   node scripts/seo.mjs https://vase-domena.cz
 *
 * Skript upraví: index.html (canonical, og:url, og:image, twitter:image,
 * strukturovaná data), robots.txt a sitemap.xml.
 * Je možné ho spustit opakovaně, i po změně domény.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZASTUPNY_VZOR = /https:\/\/(DOMENA\.cz|[a-z0-9.-]+\.[a-z]{2,})(?=\/|"|<)/g;

const vstup = process.argv[2];
if (!vstup) {
  console.error('Chybí adresa. Příklad: node scripts/seo.mjs https://matoussyrovy.cz');
  process.exit(1);
}

let domena;
try {
  domena = new URL(vstup).origin;
} catch {
  console.error(`"${vstup}" není platná adresa. Uveď ji včetně https://`);
  process.exit(1);
}

// Adresy, které patří někomu jinému a nesmí se přepsat
const CIZI = ['koupelnysyrovy.cz', 'forbes.cz', 'linkedin.com', 'schema.org',
              'sitemaps.org', 'googleapis.com', 'gstatic.com', 'google.com', 'w3.org'];

const dnes = new Date().toISOString().slice(0, 10);

function uprav(soubor, upravaObsahu) {
  const cesta = join(KOREN, soubor);
  if (!existsSync(cesta)) {
    console.warn(`  přeskakuji ${soubor} (neexistuje)`);
    return;
  }
  const puvodni = readFileSync(cesta, 'utf8');
  const novy = upravaObsahu(puvodni);
  if (novy === puvodni) {
    console.log(`  ${soubor} – beze změny`);
    return;
  }
  writeFileSync(cesta, novy);
  console.log(`  ${soubor} – upraveno`);
}

const nahradDomenu = (text) =>
  text.replace(ZASTUPNY_VZOR, (shoda) =>
    CIZI.some((c) => shoda.includes(c)) ? shoda : domena
  );

console.log(`Nastavuji doménu na ${domena}\n`);

uprav('index.html', nahradDomenu);
uprav('robots.txt', nahradDomenu);
uprav('sitemap.xml', (t) =>
  nahradDomenu(t).replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${dnes}</lastmod>`)
);

console.log(`\nHotovo. Sitemapa má datum ${dnes}.`);
console.log('Nezapomeň web ověřit v Google Search Console a sitemapu tam odeslat.');
