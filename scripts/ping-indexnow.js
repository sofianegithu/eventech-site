#!/usr/bin/env node
/**
 * Ping IndexNow to instantly notify Bing, Yandex, Seznam, and Naver
 * that URLs on eventech.cloud have been added or updated.
 *
 * Usage:
 *   node scripts/ping-indexnow.js                       # pings all sitemap URLs
 *   node scripts/ping-indexnow.js https://.../path      # pings one URL
 *
 * Get your free IndexNow key at https://www.indexnow.org/
 * Then host the key as a text file at https://yourdomain.com/indexnow-<KEY>.txt
 *
 * Env vars (optional):
 *   INDEXNOW_KEY     override the hardcoded key
 *   INDEXNOW_HOST    override the host (default: eventech.cloud)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const KEY = process.env.INDEXNOW_KEY || '2f025942072ee908195d204bbc88ef29';
const HOST = process.env.INDEXNOW_HOST || 'eventech.cloud';
const SCHEME = 'https';

function readSitemapUrls() {
  const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return [];
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map(m => m[1].trim());
}

function submit(urlList) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `${SCHEME}://${HOST}/indexnow-${KEY}.txt`,
    urlList
  });

  const req = https.request({
    method: 'POST',
    hostname: 'api.indexnow.org',
    path: '/indexnow',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
      console.log(`IndexNow response: ${res.statusCode} ${data.trim()}`);
      if (res.statusCode === 200) {
        console.log(`  OK — ${urlList.length} URL(s) submitted for indexing`);
      } else if (res.statusCode === 202) {
        console.log('  OK — URL(s) accepted, key will be validated async');
      } else if (res.statusCode === 400) {
        console.error('  Bad request. Check that the key file is hosted at the keyLocation above.');
      } else if (res.statusCode === 403) {
        console.error('  Forbidden. Key file is missing or its content does not match the key.');
      } else {
        console.error(`  Unexpected status: ${res.statusCode}`);
      }
    });
  });

  req.on('error', (e) => console.error('Request failed:', e.message));
  req.write(body);
  req.end();
}

function main() {
  const argUrl = process.argv[2];
  let urls;
  if (argUrl) {
    urls = [argUrl];
  } else {
    urls = readSitemapUrls();
  }

  if (!urls.length) {
    console.error('No URLs to submit. Pass a URL or ensure sitemap.xml exists.');
    process.exit(1);
  }

  console.log(`Pinging IndexNow for ${urls.length} URL(s) on ${HOST}`);
  console.log(`Key location: ${SCHEME}://${HOST}/indexnow-${KEY}.txt`);
  submit(urls);
}

main();
