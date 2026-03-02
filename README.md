# Library Content Audit Toolkit

A Node.js-based crawler and scoring tool for auditing content quality on  library websites.

This tool:

- Crawls a website starting from a given URL  
- Extracts core content metadata  
- Pulls GA4 engagement metrics  
- Scores each page using content-type-specific weighting  
- Outputs a CSV report for editorial review  
- Can be automated monthly using GitHub Actions  

---

## 🚀 What This Is For

Public libraries don’t optimize for revenue — they optimize for:

- Clarity  
- Discoverability  
- Community engagement  
- Freshness  
- Information quality  

This toolkit generates a **Content Health Score (0–100)** per page to help prioritize improvements.

---

## 📦 Features

- URL inventory  
- Page title  
- H1  
- Meta description  
- Word count  
- Internal link count  
- Auto-detected content type (event, location, research, static, etc.)  
- GA4 metrics (pageviews, engagement rate, bounce rate)  
- Weighted scoring model by content type  
- Auto-labeling (High Performer, Needs Attention, etc.)  
- CSV output for dashboard import  

---

## 🛠 Installation

### 1. Clone the repo

```
    git clone https://github.com/your-org/library-content-audit.git
    cd library-content-audit
```

### 2. Install dependencies

```
    npm install
```

---

## 🔐 GA4 Setup

This project uses the Google Analytics Data API (GA4).

### 1. Create a Service Account

1. Go to Google Cloud Console  
2. Create a project (or use existing)  
3. Enable Google Analytics Data API  
4. Create a Service Account  
5. Generate JSON key  
6. Download the file  

Rename it:

```
    ga4-service-account.json
```

Place it in the project root (for local use only).

---

### 2. Grant GA4 Access

In GA4:

Admin → Property Access Management  
Add the service account email as Viewer.

---

## ▶ Running Locally

Basic usage:

```
    node crawler.js --url=https://www.yourlibrary.org
    node scorer.js
```

---

## 📊 Output

The script generates a CSV file:

```
    content-audit.csv
```

Columns include:

- url  
- title  
- h1  
- meta_description  
- word_count  
- content_type  
- pageviews  
- engagement_rate  
- bounce_rate  
- content_score  
- auto_label  

You can import this into:

- Airtable  
- Excel  
- Looker Studio  
- Metabase  
- Power BI  

---

## 🧠 How Scoring Works

Each page receives a 0–100 score based on:

- Content depth  
- Readability  
- Metadata completeness  
- Internal linking  
- GA4 engagement  
- Bounce rate  
- Traffic  
- Freshness (optional)  

Weights vary by content type (for Drupal only).

Example:

- Event pages emphasize engagement  
- Research pages emphasize depth  
- Static policy pages emphasize clarity and completeness  

---

## 🔄 GitHub Actions Automation

This project includes a GitHub workflow that can:

- Run manually  
- Run monthly (cron schedule)  
- Commit updated CSV reports  
- Use GA4 credentials stored as repository secrets  

### Required GitHub Secrets

- GA4_SERVICE_ACCOUNT_JSON  
- (optional) GA4_PROPERTY_ID  

To run manually:

Actions → Library Content Audit → Run Workflow → Enter URL

---

## ⚙ Customization

You can modify:

- Content type detection logic  
- Weight profiles  
- Scoring thresholds  
- Auto-label rules  
- Excluded paths (e.g. /sites/default/files)  
- Crawl depth  

---

## 📂 Suggested Project Structure

    .
    ├── crawler.js
    ├── scorer.js
    ├── package.json
    ├── .github/workflows/content-audit.yml

---

## ⚠ Known Limitations

- Does not render JavaScript-heavy pages (simple HTTP crawl)  
- GA4 must have page_path matching your URLs  
- Scheduled GitHub jobs use default URL unless overridden  

---

## 🧩 Future Enhancements

- Month-over-month comparison  
- Auto-open GitHub issues for low-score pages  
- Dashboard UI  
- Accessibility scoring (axe-core integration)  
- XML sitemap validation  
- Orphaned page detection  

---

## 👥 Intended Audience

- Library marketing teams  
- Content managers  
- Web coordinators  
- Digital services staff  

---

## 📄 License

MIT (or your preferred license)