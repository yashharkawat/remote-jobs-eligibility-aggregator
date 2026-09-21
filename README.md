# Worldwide Remote Jobs Scraper - find remote jobs you can apply to from your country

**Most "remote" jobs are not remote for you.** They are US-only, EU-only, or locked to a timezone, and you find that
out after reading the whole posting. This Actor reads **8 remote job boards in one run**, removes duplicates, and tells
you for every job whether someone living in **your country** can actually apply - with the exact words from the posting
as proof.

Use it as a **remote jobs API**, a **work-from-anywhere job feed**, or an **MCP tool for AI agents**. No login, no
cookies, no proxies, no API keys.

## What does the Worldwide Remote Jobs Scraper do?

1. Collects fresh postings from Himalayas, RemoteOK, We Work Remotely, Remotive, Jobicy, Arbeitnow, Working Nomads and
   the latest Hacker News "Who is hiring?" thread (about 900 jobs per run).
2. Merges the same job posted on several boards into one row (`alsoOn` lists the other boards).
3. Labels each job for the candidate's country:

| `eligibility` | Meaning |
|---|---|
| `country` | The posting names your country (for example "India, Philippines") |
| `region` | It names a region that includes your country: APAC, EMEA, LATAM, Europe, Asia, Africa ... |
| `worldwide` | "Anywhere in the world", "Worldwide", "work from anywhere", "we hire globally" |
| `unclear` | No location restriction stated - worth a look |
| `restricted` | Limited to somewhere else: another country or region, "must be authorized to work in the US", a timezone window that excludes you, or a local-hire marker such as `(m/w/d)` |

4. Adds `eligibilityReason`, a one-line quote of the evidence, so you can verify any verdict in a second:
   `Location lists APAC, which includes India: "Europe, LATAM, APAC, the U.S., Canada"`.

## Who is it for?

- **Job seekers outside the US and EU** - India, Pakistan, Bangladesh, Philippines, Indonesia, Vietnam, Nigeria, Kenya,
  South Africa, Egypt, Brazil, Argentina, Colombia, Mexico, Turkey, Ukraine and 90+ more countries.
- **Newsletters, Telegram / Discord / WhatsApp job bots** that publish "remote jobs open to [country]".
- **Recruiters and talent platforms** looking for companies that hire globally.
- **AI agents and LLM apps** that need clean, structured, pre-filtered remote job data in one call.

## How do I find remote jobs open to my country?

Set `candidateCountry`, add your keywords, and run. Example input for a React / Node.js developer in India:

```json
{
  "candidateCountry": "India",
  "keywords": ["react", "node", "full stack"],
  "excludeKeywords": ["staff", "principal", "manager"],
  "eligibility": "eligible_and_unclear",
  "maxYearsRequired": 5,
  "postedWithinDays": 14
}
```

Other examples: `"candidateCountry": "Nigeria", "keywords": ["python", "django"]` ·
`"candidateCountry": "Brazil", "keywords": ["product designer"]` ·
`"candidateCountry": "Philippines", "keywords": ["customer support", "virtual assistant"]`.

## Input

| Field | What it does |
|---|---|
| `candidateCountry` | Where the candidate lives. 110+ countries recognised; 45 with region and timezone data. Default `India`. |
| `keywords` | Keep jobs containing ANY of these (title, tags, description). Empty = all jobs. |
| `titleMustMatch` | Stricter: the keyword must be in the job title. |
| `excludeKeywords` | Drop jobs whose title contains any of these (`senior`, `staff`, `manager` ...). |
| `eligibility` | `eligible` (can apply) · `eligible_and_unclear` (default) · `all` (everything, labelled). |
| `maxYearsRequired` | Drop jobs asking for more than N years of experience. Jobs that state no number are kept. |
| `postedWithinDays` | Default 14. |
| `sources` | Choose boards. Default: all 8. |
| `maxItems` | Cap on returned rows. **You pay only for rows returned.** |
| `includeDescription` | Add the plain-text job description. |

## Output

One row per unique job, sorted best-first: `country`, `region`, `worldwide`, `unclear`, `restricted`; newest first
inside each group. Export as JSON, CSV, Excel or via the Apify API.

```json
{
  "eligibility": "region",
  "eligibilityReason": "Location lists APAC, which includes India: \"Europe, LATAM, APAC, the U.S., Canada\"",
  "title": "Senior Java & React Developer",
  "company": "Lemon.io",
  "locationRaw": "Europe, LATAM, APAC, the U.S., Canada",
  "salary": null,
  "minYears": 4,
  "employmentType": null,
  "tags": ["Development", "java", "react"],
  "postedAt": "2026-09-18T10:02:11.000Z",
  "source": "workingnomads",
  "alsoOn": ["remotive"],
  "url": "https://www.workingnomads.com/jobs/...",
  "applyUrl": "https://www.workingnomads.com/jobs/...",
  "contactEmail": null,
  "candidateCountry": "India"
}
```

A `SUMMARY` record in the key-value store reports per-board counts and how many jobs were filtered out and why
(too old, keyword, too many years, duplicate, restricted).

## How much does it cost to scrape remote jobs?

**$2 per 1,000 jobs returned** (pay per event), platform usage included. Jobs that are filtered out - restricted,
duplicate, off-keyword - are never charged. A typical filtered run returns 15 to 60 jobs, so it costs **3 to 12 cents**.
A run reads about 900 postings and finishes in under 30 seconds.

## Use it as an MCP tool for AI agents (Claude, ChatGPT, Cursor)

Add the Actor through the [Apify MCP server](https://mcp.apify.com) and ask:
*"Find remote React jobs I can apply to from India, posted this week, under 5 years of experience."*
The agent gets a small, clean JSON list with a verdict and a quoted reason on every row - no HTML, no pagination, no
need to read 900 postings with an LLM.

## Schedule it: a daily remote job alert for your country

Create a Task with your input, schedule it daily, and connect the dataset to Slack, Telegram, Google Sheets, Make, Zapier
or n8n through Apify integrations or a webhook.

## FAQ

### What does "worldwide remote job" mean?
A job whose posting says it can be done from any country: "Anywhere in the world", "Worldwide", "work from anywhere",
"we hire globally". This Actor labels those `worldwide`. A job that simply says "Remote" without naming a place is
labelled `unclear`, not worldwide, because many of those turn out to be US-only.

### Which remote job boards does it cover?
Himalayas, RemoteOK, We Work Remotely, Remotive, Jobicy, Arbeitnow, Working Nomads and the monthly Hacker News
"Ask HN: Who is hiring?" thread (remote posts only, job-seeker comments removed).

### How is this different from other remote jobs scrapers?
Other aggregators return every remote job and leave the location text for you to read. This one answers the question a
job seeker outside the US or EU actually has - *can I apply to this from my country?* - and shows the evidence.

### How does it know a job is US-only or EU-only?
It reads the board's structured location field first ("USA Only", "Europe, LATAM"), then phrases in the description
("must be authorized to work in the United States", "EU residents only"), timezone rules ("within 3 hours of EST",
"CET +/- 3 hours") and local-hire markers like `(m/w/d)`. The matched text is returned in `eligibilityReason`.

### Does it need a login, cookies, proxies or an API key?
No. Every source is a public JSON or RSS feed the job board publishes for reuse.

### How fresh are the jobs?
The boards expose their most recent few hundred postings, so this is a fresh-jobs monitor (last 1 to 30 days), not a
historical archive. Run it daily for alerts.

### Is it legal to scrape remote job boards?
The Actor reads public feeds that the boards publish for syndication and collects no personal data beyond what a
posting itself contains. Respect each board's terms: link back to the original posting (`url` is on every row) and do
not republish the listings as your own job board.

### Can I get only jobs with a salary, or only contract jobs?
`salary` and `employmentType` are on every row when the board provides them; filter the dataset on those fields.

## Limits, honestly

The verdict comes from what the posting says. Some `unclear` jobs will turn out to be restricted once you talk to the
company, and a posting can be wrong about itself. If a board is down, the run continues with the others and says so in
the log and in `SUMMARY`. Found a wrong verdict? Open an issue with the job URL and it gets fixed.

## Source code and running it

- Run it on Apify: https://apify.com/yash_harkawat/remote-jobs-eligibility-aggregator
- Source code and issues: https://github.com/yashharkawat/remote-jobs-eligibility-aggregator

## Changelog

- **0.1.5 (21 Sep 2026)** - a region in the job title ("Developer Advocate - EMEA", "Account Executive (US)") now
  overrides a board's "Anywhere in the World" location; 45 more countries are recognised as restrictions, so a
  Suriname-only posting no longer comes back as `unclear`. Unit tests added (`npm test`).
