// One fetcher per open feed. Each returns normalised rows:
// { source, sourceId, title, company, url, applyUrl, locationRaw, locationRestrictions[], tags[], salary, employmentType, postedAt (ISO), description (plain text) }
// Every endpoint here is a public JSON/RSS feed the site publishes for reuse: no login, no cookies, no proxy.

const UA = 'remote-jobs-eligibility-aggregator/0.1 (+https://apify.com)';

async function get(url, as = 'json') {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: as === 'json' ? 'application/json' : '*/*' }, signal: AbortSignal.timeout(30_000) });
            if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
            if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
            return as === 'json' ? await res.json() : await res.text();
        } catch (err) {
            if (err.fatal || attempt === 3) throw err;
            await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
    }
    return null;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", '#x2F': '/', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: '-', mdash: '-', hellip: '...' };
export const text = (html) => (html || '')
    .replace(/<(br|\/p|\/li|\/div|\/h\d)\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => ENT[e] ?? (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : m))
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

const iso = (d) => { const t = typeof d === 'number' ? new Date(d * (d < 1e12 ? 1000 : 1)) : new Date(d); return Number.isNaN(t.getTime()) ? null : t.toISOString(); };
const money = (min, max, cur = 'USD', per = '') => (min || max ? `${cur || ''} ${[min, max].filter(Boolean).map((n) => Number(n).toLocaleString('en-US')).join(' - ')}${per ? ` / ${per}` : ''}`.trim() : null);

export const SOURCES = {
    async himalayas({ maxPerSource }) {
        const out = [];
        for (let offset = 0; offset < maxPerSource; offset += 20) {
            const d = await get(`https://himalayas.app/jobs/api?limit=20&offset=${offset}`);
            if (!d?.jobs?.length) break;
            for (const j of d.jobs) {
                out.push({ source: 'himalayas', sourceId: j.guid, title: j.title, company: j.companyName, url: j.guid, applyUrl: j.applicationLink,
                    locationRaw: (j.locationRestrictions || []).join(', ') || 'Worldwide', locationRestrictions: j.locationRestrictions || [],
                    tags: [...(j.categories || []), ...(j.seniority || [])], salary: money(j.minSalary, j.maxSalary, j.currency, j.salaryPeriod),
                    employmentType: j.employmentType, postedAt: iso(j.pubDate), description: text(j.description) });
            }
        }
        return out;
    },

    async remoteok() {
        const d = await get('https://remoteok.com/api');
        return d.filter((j) => j.id && j.position).map((j) => ({ source: 'remoteok', sourceId: String(j.id), title: j.position, company: j.company, url: j.url, applyUrl: j.apply_url || j.url,
            locationRaw: j.location || '', tags: j.tags || [], salary: money(j.salary_min, j.salary_max, 'USD', 'year'), employmentType: null, postedAt: iso(j.date), description: text(j.description) }));
    },

    async weworkremotely() {
        const xml = await get('https://weworkremotely.com/remote-jobs.rss', 'text');
        const tag = (item, t) => { const m = item.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`)); return m ? m[1].trim() : ''; };
        return xml.split('<item>').slice(1).map((item) => {
            const full = text(tag(item, 'title')); const [company, ...rest] = full.split(': ');
            return { source: 'weworkremotely', sourceId: tag(item, 'guid') || tag(item, 'link'), title: rest.join(': ') || full, company: rest.length ? company : '', url: tag(item, 'link'), applyUrl: tag(item, 'link'),
                locationRaw: text(tag(item, 'region')), tags: [text(tag(item, 'category')), text(tag(item, 'type'))].filter(Boolean), salary: null, employmentType: text(tag(item, 'type')) || null,
                postedAt: iso(tag(item, 'pubDate')), description: text(tag(item, 'description').replace(/&lt;/g, '<').replace(/&gt;/g, '>')) };
        });
    },

    async remotive() {
        const d = await get('https://remotive.com/api/remote-jobs');
        return (d.jobs || []).map((j) => ({ source: 'remotive', sourceId: String(j.id), title: j.title, company: j.company_name, url: j.url, applyUrl: j.url,
            locationRaw: j.candidate_required_location || '', tags: [j.category, ...(j.tags || [])].filter(Boolean), salary: j.salary || null, employmentType: j.job_type || null,
            postedAt: iso(j.publication_date), description: text(j.description) }));
    },

    async jobicy() {
        const d = await get('https://jobicy.com/api/v2/remote-jobs?count=50');
        return (d.jobs || []).map((j) => ({ source: 'jobicy', sourceId: String(j.id), title: text(j.jobTitle), company: text(j.companyName), url: j.url, applyUrl: j.url,
            locationRaw: text(j.jobGeo || ''), tags: [].concat(j.jobIndustry || [], j.jobLevel || []).map(text), salary: money(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod),
            employmentType: [].concat(j.jobType || []).join(', ') || null, postedAt: iso(j.pubDate), description: text(j.jobDescription) }));
    },

    async arbeitnow({ maxPerSource }) {
        const out = [];
        for (let page = 1; out.length < maxPerSource && page <= 5; page++) {
            const d = await get(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
            if (!d?.data?.length) break;
            for (const j of d.data) {
                if (!j.remote) continue; // the board also lists on-site jobs in Germany
                out.push({ source: 'arbeitnow', sourceId: j.slug, title: j.title, company: j.company_name, url: j.url, applyUrl: j.url, locationRaw: j.location || '',
                    tags: j.tags || [], salary: null, employmentType: (j.job_types || []).join(', ') || null, postedAt: iso(j.created_at), description: text(j.description) });
            }
        }
        return out;
    },

    async workingnomads() {
        const d = await get('https://www.workingnomads.com/api/exposed_jobs/');
        return d.map((j) => ({ source: 'workingnomads', sourceId: j.url, title: j.title, company: j.company_name, url: j.url, applyUrl: j.url, locationRaw: j.location || '',
            tags: [j.category_name, ...String(j.tags || '').split(',')].map((s) => s && s.trim()).filter(Boolean), salary: null, employmentType: null,
            postedAt: iso(j.pub_date), description: text(j.description) }));
    },

    // Latest "Ask HN: Who is hiring?" thread; only top-level comments that say REMOTE.
    async hackernews({ maxPerSource }) {
        const s = await get('https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=10');
        const story = (s.hits || []).find((h) => /who is hiring/i.test(h.title || ''));
        if (!story) return [];
        const out = [];
        for (let page = 0; page < 10 && out.length < maxPerSource; page++) {
            const c = await get(`https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_${story.objectID}&hitsPerPage=200&page=${page}`);
            if (!c?.hits?.length) break;
            for (const h of c.hits) {
                if (String(h.parent_id) !== String(story.objectID) || !h.comment_text) continue;
                const body = text(h.comment_text); const head = body.split('\n')[0];
                if (!/\bremote\b/i.test(head) && !/\bremote\b/i.test(body.slice(0, 400))) continue;
                // job seekers sometimes post in the hiring thread
                if (/^\s*location\s*:/i.test(head) || /willing to relocate|r[ée]sum[ée]\/cv|seeking work/i.test(body.slice(0, 600))) continue;
                const parts = head.split(/\s*[|•·]\s*|\s+[-–—]\s+/).map((p) => p.trim()).filter(Boolean);
                const loc = parts.filter((p) => /remote|onsite|on-site|hybrid|worldwide|anywhere|\b(US|USA|UK|EU|EMEA|APAC|LATAM)\b|europe|america|asia|india|canada|germany/i.test(p) && !/https?:/.test(p)).join(', ');
                const ROLE = /[^.|,;:()\n]{0,40}\b(engineers?|developers?|designers?|scientists?|architects?|devops|sre|analysts?|full[- ]?stack|back[- ]?end|front[- ]?end)\b[^.|,;:()\n]{0,25}/i;
                const title = parts.slice(1).find((p) => ROLE.test(p) && p.length < 120) || (body.match(ROLE) || [])[0]?.trim() || 'Multiple roles - see post';
                const link = (body.match(/https?:\/\/[^\s)>\]]+/) || [])[0] || null;
                const email = (body.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || null;
                out.push({ source: 'hackernews', sourceId: String(h.objectID), title: title.slice(0, 140), company: (parts[0] || '').replace(/\(?https?:\/\/[^\s)]*\)?/g, '').split(/\s+(is|are|we're|we are|builds?|-)\s+/i)[0].replace(/^at\s+/i, '').trim().slice(0, 60),
                    url: `https://news.ycombinator.com/item?id=${h.objectID}`, applyUrl: link, contactEmail: email, locationRaw: loc, tags: ['hn-who-is-hiring'], salary: (head.match(/[$€£]\s?\d[\d,.]*\s?k?(\s?[-–]\s?[$€£]?\s?\d[\d,.]*\s?k?)?/i) || [])[0] || null,
                    employmentType: /contract/i.test(head) ? 'contract' : null, postedAt: iso(h.created_at), description: body });
            }
        }
        return out;
    },
};
