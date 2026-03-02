const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { URL } = require('url');

const GA_PROPERTY_ID = '293164189';
const GA_KEY_FILE = './service-account.json';

function clamp(num, min, max) {
  return Math.max(min, Math.min(num, max));
}

function normalizePath(url) {
  try {
    const path = new URL(url).pathname;
    return path === '/' ? '/' : path.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function percentile(value, dataset) {
  const valid = dataset.filter(v => !isNaN(v));
  if (!valid.length) return 0;
  const countBelow = valid.filter(v => v <= value).length;
  return clamp((countBelow / valid.length) * 100, 0, 100);
}

function scoreContent(p) {
  let score = 0;

  if (p.word_count < 300) score += 5;
  else if (p.word_count < 600) score += 12;
  else if (p.word_count <= 2000) score += 20;
  else score += 15;

  score += clamp(p.h2_count * 2, 0, 10);

  if (p.image_count > 0) {
    const ratio = p.missing_alt_count / p.image_count;
    score += ratio < 0.1 ? 10 : ratio < 0.3 ? 6 : 2;
  } else score += 5;

  score += clamp(p.internal_link_count * 2, 0, 10);
  score += p.has_meta_description ? 5 : 0;
  score += p.title_length >= 30 && p.title_length <= 65 ? 5 : 2;

  if (p.duplicate_title) score -= 15;

  return clamp(score, 0, 100);
}

function scoreFreshness(p) {
  if (p.days_since_update < 365) return 100;
  if (p.days_since_update < 730) return 70;
  if (p.days_since_update < 1095) return 40;
  return 20;
}

function autoLabel(p, stats) {
  const trafficPct = percentile(p.pageviews, stats.pageviews);
  const score = p.final_score;

  if (score >= 80 && trafficPct >= 70) return "Top Performer";
  if (score >= 75 && trafficPct < 40) return "Hidden Gem";
  if (score < 50 && trafficPct >= 60) return "High Impact – Improve";
  if (score < 50 && trafficPct < 40) return "Review / Consolidate";
  return "Maintain";
}

async function getGAData() {
  const client = new BetaAnalyticsDataClient({
    keyFilename: GA_KEY_FILE,
  });

  const [response] = await client.runReport({
    property: `properties/${GA_PROPERTY_ID}`,
    dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'engagementRate' }
    ],
  });

  const data = {};
  response.rows.forEach(row => {
    const path = row.dimensionValues[0].value.replace(/\/$/, '') || '/';
    data[path] = {
      pageviews: +row.metricValues[0].value,
      avg_engagement_time: +row.metricValues[1].value,
      engagement_rate: +row.metricValues[2].value
    };
  });

  return data;
}

async function main() {
  const pages = [];

  await new Promise(resolve => {
    fs.createReadStream('crawl.csv')
      .pipe(csv())
      .on('data', row => {
        pages.push({
          ...row,
          word_count: +row.word_count || 0,
          h2_count: +row.h2_count || 0,
          image_count: +row.image_count || 0,
          missing_alt_count: +row.missing_alt_count || 0,
          internal_link_count: +row.internal_link_count || 0,
          has_meta_description: row.has_meta_description === 'true',
          duplicate_title: row.duplicate_title === 'true',
          title_length: +row.title_length || 0,
          days_since_update: +row.days_since_update || 9999,
          noindex: row.noindex === 'true'
        });
      })
      .on('end', resolve);
  });

  console.log("Loaded pages:", pages.length);

  const gaData = await getGAData();

  pages.forEach(p => {
    const path = normalizePath(p.url);
    const ga = gaData[path] || {
      pageviews: 0,
      avg_engagement_time: 0,
      engagement_rate: 0
    };

    p.pageviews = ga.pageviews;
    p.avg_engagement_time = ga.avg_engagement_time;
    p.engagement_rate = ga.engagement_rate;
  });

  const stats = {
    pageviews: pages.map(p => p.pageviews)
  };

  pages.forEach(p => {
    const quality = scoreContent(p);
    const freshness = scoreFreshness(p);

    p.content_score = quality;
    p.freshness_score = freshness;
    p.final_score = (quality * 0.6 + freshness * 0.4).toFixed(1);
    p.auto_label = autoLabel(p, stats);
    p.editor_override = "";
    p.final_label = "";
  });

  const writer = createObjectCsvWriter({
    path: 'scored-content.csv',
    header: Object.keys(pages[0]).map(k => ({ id: k, title: k }))
  });

  await writer.writeRecords(pages);

  console.log("Scoring complete → scored-content.csv");
}

main();