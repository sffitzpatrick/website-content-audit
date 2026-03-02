const { chromium } = require('playwright');
const cheerio = require('cheerio');
const { createObjectCsvWriter } = require('csv-writer');
const { URL } = require('url');

const minimist = require('minimist');

const args = minimist(process.argv.slice(2));

const START_URL = args.url || process.env.START_URL;

if (!START_URL) {
  console.error('❌ No start URL provided.');
  process.exit(1);
}

console.log(`🌐 Crawling: ${START_URL}`);

const MAX_PAGES = args.max-pages || 500;

const EXCLUDED_PATHS = ['/sites/default/files'];

const visited = new Set();
const queue = [START_URL];
const results = [];

function normalizeUrl(base, href) {
  try {
    const url = new URL(href, base);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function isExcluded(url) {
  const path = new URL(url).pathname;
  return EXCLUDED_PATHS.some(p => path.startsWith(p));
}

function daysSince(dateString) {
  if (!dateString) return 9999;
  const date = new Date(dateString);
  if (isNaN(date)) return 9999;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const startDomain = new URL(START_URL).hostname;

  while (queue.length && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url) || isExcluded(url)) continue;

    visited.add(url);
    console.log("Crawling:", url);

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      if (!response) continue;

      const contentType = response.headers()['content-type'] || '';
      if (!contentType.includes('text/html')) continue;

      const status = response.status();
      const html = await page.content();
      const $ = cheerio.load(html);

      const title = $('title').first().text().trim();
      const h1 = $('h1').first().text().trim();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const metaRobots = $('meta[name="robots"]').attr('content') || '';

      const bodyText = $('main').text() || $('body').text();
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

      const h2Count = $('h2').length;
      const images = $('img');
      const imageCount = images.length;
      const missingAltCount = images.filter((_, el) => !$(el).attr('alt')).length;
      const internalLinkCount = $('a[href^="/"]').length;

      const publishDate =
        $('time[datetime]').attr('datetime') ||
        $('meta[property="article:published_time"]').attr('content') ||
        '';

      results.push({
        url,
        status,
        title,
        title_length: title.length,
        h1,
        word_count: wordCount,
        h2_count: h2Count,
        image_count: imageCount,
        missing_alt_count: missingAltCount,
        internal_link_count: internalLinkCount,
        has_meta_description: metaDescription ? true : false,
        duplicate_title: false, // will compute later
        readability_grade: 0, // placeholder
        days_since_update: daysSince(publishDate),
        noindex: metaRobots.includes('noindex')
      });

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const normalized = normalizeUrl(url, href);
        if (!normalized) return;
        const linkDomain = new URL(normalized).hostname;
        if (linkDomain === startDomain && !visited.has(normalized)) {
          queue.push(normalized);
        }
      });

    } catch (err) {
      console.log("Failed:", url);
    }
  }

  await browser.close();

  // Detect duplicate titles
  const titleCounts = {};
  results.forEach(r => {
    titleCounts[r.title] = (titleCounts[r.title] || 0) + 1;
  });
  results.forEach(r => {
    if (titleCounts[r.title] > 1) r.duplicate_title = true;
  });

  const writer = createObjectCsvWriter({
    path: 'crawl.csv',
    header: Object.keys(results[0]).map(key => ({ id: key, title: key }))
  });

  await writer.writeRecords(results);

  console.log("Crawl complete → crawl.csv");
})();