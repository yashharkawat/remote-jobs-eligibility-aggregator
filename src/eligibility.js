// Decides whether a candidate living in `country` can apply to a "remote" job.
// Evidence order: the source's structured location field first, then phrases in the description.

const COUNTRIES = {
    // name: [aliases..., region tags]
    India: { alias: ['india', 'in', 'ind', 'bharat'], regions: ['asia', 'apac', 'south asia', 'apj', 'jamea'], tz: [5.5] },
    'United States': { alias: ['united states', 'usa', 'us', 'u.s.', 'u.s.a.', 'united states of america'], regions: ['north america', 'americas', 'amer', 'na'], tz: [-10, -9, -8, -7, -6, -5] },
    Canada: { alias: ['canada', 'ca'], regions: ['north america', 'americas', 'amer', 'na'], tz: [-8, -7, -6, -5, -4] },
    Mexico: { alias: ['mexico', 'mx'], regions: ['north america', 'latam', 'latin america', 'americas', 'amer'], tz: [-6] },
    Brazil: { alias: ['brazil', 'brasil', 'br'], regions: ['latam', 'latin america', 'south america', 'americas', 'amer'], tz: [-3] },
    Argentina: { alias: ['argentina', 'ar'], regions: ['latam', 'latin america', 'south america', 'americas', 'amer'], tz: [-3] },
    Colombia: { alias: ['colombia', 'co'], regions: ['latam', 'latin america', 'south america', 'americas', 'amer'], tz: [-5] },
    Chile: { alias: ['chile', 'cl'], regions: ['latam', 'latin america', 'south america', 'americas', 'amer'], tz: [-4] },
    'United Kingdom': { alias: ['united kingdom', 'uk', 'u.k.', 'great britain', 'gb', 'england', 'scotland', 'wales'], regions: ['europe', 'emea'], tz: [0] },
    Ireland: { alias: ['ireland', 'ie'], regions: ['europe', 'emea', 'eu', 'european union'], tz: [0] },
    Germany: { alias: ['germany', 'deutschland', 'de'], regions: ['europe', 'emea', 'eu', 'european union', 'dach'], tz: [1] },
    France: { alias: ['france', 'fr'], regions: ['europe', 'emea', 'eu', 'european union'], tz: [1] },
    Spain: { alias: ['spain', 'españa', 'es'], regions: ['europe', 'emea', 'eu', 'european union'], tz: [1] },
    Portugal: { alias: ['portugal', 'pt'], regions: ['europe', 'emea', 'eu', 'european union'], tz: [0] },
    Italy: { alias: ['italy', 'it'], regions: ['europe', 'emea', 'eu', 'european union'], tz: [1] },
    Netherlands: { alias: ['netherlands', 'holland', 'nl'], regions: ['europe', 'emea', 'eu', 'european union'], tz: [1] },
    Poland: { alias: ['poland', 'pl'], regions: ['europe', 'emea', 'eu', 'european union', 'cee'], tz: [1] },
    Romania: { alias: ['romania', 'ro'], regions: ['europe', 'emea', 'eu', 'european union', 'cee'], tz: [2] },
    Ukraine: { alias: ['ukraine', 'ua'], regions: ['europe', 'emea', 'cee'], tz: [2] },
    Turkey: { alias: ['turkey', 'türkiye', 'turkiye', 'tr'], regions: ['europe', 'emea', 'middle east'], tz: [3] },
    Sweden: { alias: ['sweden', 'se'], regions: ['europe', 'emea', 'eu', 'european union', 'nordics'], tz: [1] },
    Switzerland: { alias: ['switzerland', 'ch'], regions: ['europe', 'emea', 'dach'], tz: [1] },
    Nigeria: { alias: ['nigeria', 'ng'], regions: ['africa', 'emea'], tz: [1] },
    Kenya: { alias: ['kenya', 'ke'], regions: ['africa', 'emea'], tz: [3] },
    'South Africa': { alias: ['south africa', 'za'], regions: ['africa', 'emea'], tz: [2] },
    Egypt: { alias: ['egypt', 'eg'], regions: ['africa', 'emea', 'middle east', 'mena'], tz: [2] },
    'United Arab Emirates': { alias: ['united arab emirates', 'uae', 'dubai', 'ae'], regions: ['middle east', 'emea', 'mena', 'gcc'], tz: [4] },
    Pakistan: { alias: ['pakistan', 'pk'], regions: ['asia', 'apac', 'south asia'], tz: [5] },
    Bangladesh: { alias: ['bangladesh', 'bd'], regions: ['asia', 'apac', 'south asia'], tz: [6] },
    'Sri Lanka': { alias: ['sri lanka', 'lk'], regions: ['asia', 'apac', 'south asia'], tz: [5.5] },
    Nepal: { alias: ['nepal', 'np'], regions: ['asia', 'apac', 'south asia'], tz: [5.75] },
    Philippines: { alias: ['philippines', 'ph'], regions: ['asia', 'apac', 'southeast asia', 'sea', 'asean'], tz: [8] },
    Indonesia: { alias: ['indonesia', 'id'], regions: ['asia', 'apac', 'southeast asia', 'sea', 'asean'], tz: [7] },
    Vietnam: { alias: ['vietnam', 'viet nam', 'vn'], regions: ['asia', 'apac', 'southeast asia', 'sea', 'asean'], tz: [7] },
    Malaysia: { alias: ['malaysia', 'my'], regions: ['asia', 'apac', 'southeast asia', 'sea', 'asean'], tz: [8] },
    Singapore: { alias: ['singapore', 'sg'], regions: ['asia', 'apac', 'southeast asia', 'sea', 'asean'], tz: [8] },
    Thailand: { alias: ['thailand', 'th'], regions: ['asia', 'apac', 'southeast asia', 'sea', 'asean'], tz: [7] },
    Japan: { alias: ['japan', 'jp'], regions: ['asia', 'apac', 'apj', 'east asia'], tz: [9] },
    'South Korea': { alias: ['south korea', 'korea', 'kr'], regions: ['asia', 'apac', 'east asia'], tz: [9] },
    China: { alias: ['china', 'cn'], regions: ['asia', 'apac', 'east asia'], tz: [8] },
    Australia: { alias: ['australia', 'au'], regions: ['apac', 'oceania', 'anz', 'apj'], tz: [8, 9.5, 10] },
    'New Zealand': { alias: ['new zealand', 'nz'], regions: ['apac', 'oceania', 'anz'], tz: [12] },
};

const WORLDWIDE = /\b(worldwide|world wide|anywhere|global(ly)?|international|all countries|any country|any location|work from anywhere|fully distributed|remote\s*\(?(global|world)\)?)\b/i;
// Descriptions say "a global company" all the time, so prose needs an explicit hiring statement.
const WORLDWIDE_PROSE = /\b(work from anywhere|anywhere in the world|remote[ ,:-]+(worldwide|global(ly)?|anywhere)|(fully )?remote,? worldwide|(hire|hiring|hires|open to candidates?|applicants?|candidates?) (from )?(globally|worldwide|anywhere|all over the world|any country|around the world)|location:? (worldwide|anywhere|global)|no location (restrictions?|requirements?)|any time ?zone)\b/i;
// Any other country name means "restricted to somewhere that is not you", even if we hold no region data for it.
const OTHER_COUNTRIES = ['afghanistan', 'albania', 'algeria', 'armenia', 'austria', 'azerbaijan', 'bahrain', 'belarus', 'belgium', 'bolivia', 'bosnia', 'bulgaria', 'cambodia', 'cameroon', 'costa rica', 'croatia', 'cyprus', 'czech republic', 'czechia', 'denmark', 'dominican republic', 'ecuador', 'el salvador', 'estonia', 'ethiopia', 'finland', 'georgia', 'ghana', 'greece', 'guatemala', 'honduras', 'hong kong', 'hungary', 'iceland', 'iran', 'iraq', 'israel', 'jamaica', 'jordan', 'kazakhstan', 'kuwait', 'latvia', 'lebanon', 'lithuania', 'luxembourg', 'malta', 'moldova', 'morocco', 'nicaragua', 'north macedonia', 'norway', 'oman', 'panama', 'paraguay', 'peru', 'puerto rico', 'qatar', 'russia', 'rwanda', 'saudi arabia', 'senegal', 'serbia', 'slovakia', 'slovenia', 'taiwan', 'tanzania', 'tunisia', 'uganda', 'uruguay', 'uzbekistan', 'venezuela', 'zambia', 'zimbabwe',
    'angola', 'bahamas', 'barbados', 'belize', 'benin', 'bhutan', 'botswana', 'brunei', 'burkina faso', 'cuba', "cote d'ivoire", 'ivory coast',
    'fiji', 'gabon', 'guyana', 'haiti', 'kyrgyzstan', 'laos', 'libya', 'madagascar', 'malawi', 'maldives', 'mali', 'mauritius', 'mongolia',
    'montenegro', 'mozambique', 'myanmar', 'namibia', 'niger', 'papua new guinea', 'sudan', 'suriname', 'syria', 'tajikistan', 'togo',
    'trinidad', 'turkmenistan', 'yemen', 'kosovo', 'curacao', 'aruba'];

const REGION_WORDS = ['north america', 'latin america', 'south america', 'southeast asia', 'south asia', 'east asia', 'middle east', 'european union',
    'americas', 'europe', 'emea', 'apac', 'asia', 'africa', 'oceania', 'latam', 'mena', 'dach', 'nordics', 'cee', 'anz', 'apj', 'asean', 'gcc', 'eu', 'amer'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function resolveCountry(input) {
    const q = norm(input);
    for (const [name, c] of Object.entries(COUNTRIES)) {
        if (norm(name) === q || c.alias.includes(q)) return { name, ...c };
    }
    // unknown country: still usable, we just cannot map regions/timezones for it
    return { name: input.trim().replace(/\b[a-z]/g, (x) => x.toUpperCase()), alias: [q], regions: [], tz: [] };
}

/** All countries/regions mentioned in a short location string. */
// Two-letter codes are ambiguous in prose ("in", "it", "de"), so only these count, and only in UPPER CASE.
const SAFE_CODES = { US: 'United States', USA: 'United States', UK: 'United Kingdom', UAE: 'United Arab Emirates', NZ: 'New Zealand' };

function mentions(text) {
    const t = norm(text);
    const countries = new Set();
    for (const [name, c] of Object.entries(COUNTRIES)) {
        const words = [norm(name), ...c.alias].filter((a) => a.length > 3 || a === 'usa' || a === 'uae');
        if (words.some((a) => new RegExp(`(^|[^a-z])${esc(a)}([^a-z]|$)`).test(t))) countries.add(name);
    }
    for (const c of OTHER_COUNTRIES) if (new RegExp(`(^|[^a-z])${esc(c)}([^a-z]|$)`).test(t)) countries.add(c.replace(/\b[a-z]/g, (x) => x.toUpperCase()));
    for (const [code, name] of Object.entries(SAFE_CODES)) {
        if (new RegExp(`(^|[^A-Za-z])${code}([^A-Za-z]|$)`).test(text)) countries.add(name);
    }
    const regions = REGION_WORDS.filter((r) => (r.length <= 3
        ? new RegExp(`(^|[^A-Za-z])${r.toUpperCase()}([^A-Za-z]|$)`).test(text)
        : new RegExp(`(^|[^a-z])${esc(r)}([^a-z]|$)`).test(t)));
    return { countries: [...countries], regions };
}

const DESC_RULES = [
    // [regex, country/region the job is limited to]
    // upper-case only, so "contact us only if..." does not count
    [/\bUS[ -]?(based|only|residents?|citizens?|persons?)\b|\bUS[ -](Based|Only|ONLY)\b|\(US\)|Remote[ ,-]+US\b/, 'United States'],
    [/\b(u\.s\.|united states|usa)[ -]?(based|only|residents?|citizens?|persons?)\b|must (be|reside|live) (located )?in the (us|u\.s\.|united states|usa)|authorized to work in the (us|u\.s\.|united states)|\bw-?2\b|us work authori[sz]ation|eligible to work in the (us|united states)|remote\s*\(?\s*(usa|united states)\s*(only)?\s*\)?(?![a-z])/i, 'United States'],
    [/\b(canada|canadian)[ -]?(based|only|residents?)\b|authorized to work in canada|eligible to work in canada/i, 'Canada'],
    [/\b(uk|u\.k\.|united kingdom)[ -]?(based|only|residents?)\b|right to work in the (uk|united kingdom)|eligible to work in the (uk|united kingdom)/i, 'United Kingdom'],
    [/\b(eu|europe|european union|eea)[ -]?(based|only|residents?|timezones? only)\b|right to work in (the )?(eu|europe|european union)|must (be|reside|live) in (the )?(eu|europe)/i, 'europe'],
    [/\b(latam|latin america)[ -]?(based|only)\b/i, 'latam'],
    [/\b(australia|australian)[ -]?(based|only|residents?)\b|right to work in australia/i, 'Australia'],
    [/\bno (visa )?sponsorship\b.{0,80}\b(us|u\.s\.|united states)\b/i, 'United States'],
];

const TZ_RULE = /(?:within|overlap(?:ping)?(?: with)?|\+\/?-|±)\s*(\d{1,2})\s*(?:h|hrs?|hours?)\s*(?:of|with|from)?\s*(utc|gmt|est|et|edt|pst|pt|pdt|cst|ct|cet|cest|ist|bst)\b/i;
const TZ_RULE_B = /\b(utc|gmt|est|edt|pst|pdt|cst|cet|cest|ist|bst)\s*\(?\s*(?:\+\/?-|±)\s*(\d{1,2})\s*(?:h|hrs?|hours?)/i;
const TZ_OFFSET = { utc: 0, gmt: 0, bst: 1, cet: 1, cest: 2, est: -5, et: -5, edt: -4, cst: -6, ct: -6, pst: -8, pt: -8, pdt: -7, ist: 5.5 };

/**
 * @returns {{eligibility: 'worldwide'|'country'|'region'|'restricted'|'unclear', eligibilityReason: string}}
 */
export function classify(job, cand) {
    const loc = [...new Set([job.locationRaw, ...(job.locationRestrictions || [])].filter(Boolean).join(',').split(',').map((s) => s.trim()).filter(Boolean))].join(', ');
    const myRegions = new Set(cand.regions);

    if (loc) {
        const m = mentions(loc);
        if (m.countries.includes(cand.name)) return { eligibility: 'country', eligibilityReason: `Location lists ${cand.name}: "${short(loc)}"` };
        const regionHit = m.regions.find((r) => myRegions.has(r));
        if (regionHit) return { eligibility: 'region', eligibilityReason: `Location lists ${regionHit.toUpperCase()}, which includes ${cand.name}: "${short(loc)}"` };
        if (WORLDWIDE.test(loc) && !m.countries.length) {
            // "Anywhere in the World" on the board, but a title like "Developer Advocate - EMEA" still scopes the hire.
            const t = mentions(job.title || '');
            const titleMine = t.countries.includes(cand.name) || t.regions.some((r) => myRegions.has(r));
            if ((t.countries.length || t.regions.length) && !titleMine) {
                return { eligibility: 'restricted', eligibilityReason: `Title limits it to ${[...t.countries, ...t.regions.map((r) => r.toUpperCase())].slice(0, 5).join(', ')}: "${short(job.title)}"` };
            }
            return descriptionCheck(job, cand, { eligibility: 'worldwide', eligibilityReason: `Location says "${short(loc)}"` });
        }
        if (m.countries.length || m.regions.length) {
            return { eligibility: 'restricted', eligibilityReason: `Limited to ${[...m.countries, ...m.regions.map((r) => r.toUpperCase())].slice(0, 5).join(', ')}: "${short(loc)}"` };
        }
    }
    return descriptionCheck(job, cand, { eligibility: 'unclear', eligibilityReason: loc ? `Location "${short(loc)}" does not name a country or region` : 'No location restriction stated' });
}

function descriptionCheck(job, cand, fallback) {
    const d = job.description || '';
    for (const [re, place] of DESC_RULES) {
        const m = d.match(re);
        if (!m) continue;
        const mine = place === cand.name || cand.regions.includes(place);
        if (mine) return { eligibility: place === cand.name ? 'country' : 'region', eligibilityReason: `Description: "${short(m[0])}"` };
        return { eligibility: 'restricted', eligibilityReason: `Description limits it to ${place}: "${short(context(d, m.index, m[0].length))}"` };
    }
    if (/\((m\/w\/d|w\/m\/d|m\/f\/d|f\/m\/d|m\/f\/x|f\/m\/x|h\/f|f\/h|m\/w\/x|all genders)\)/i.test(job.title || '') && !['Germany', 'France', 'Switzerland'].includes(cand.name)) {
        return { eligibility: 'restricted', eligibilityReason: `Title uses a German/French local-hire marker: "${short(job.title)}"` };
    }
    const where = `${job.locationRaw || ''} ${d}`;
    const a = where.match(TZ_RULE); const b = a ? null : where.match(TZ_RULE_B);
    const tz = a ? [a[0], a[1], a[2]] : b ? [b[0], b[2], b[1]] : null;
    if (tz && cand.tz.length) {
        const span = Number(tz[1]); const base = TZ_OFFSET[tz[2].toLowerCase()];
        const ok = cand.tz.some((o) => Math.abs(o - base) <= span);
        if (!ok) return { eligibility: 'restricted', eligibilityReason: `Timezone rule "${short(tz[0])}" excludes UTC${cand.tz[0] >= 0 ? '+' : ''}${cand.tz[0]}` };
    }
    if (fallback.eligibility === 'unclear' && WORLDWIDE_PROSE.test(d)) {
        const m = d.match(WORLDWIDE_PROSE);
        // "work from anywhere in the EU" is a region rule, not a worldwide one.
        const tail = d.slice(m.index + m[0].length, m.index + m[0].length + 40).match(/^\s*(?:in|within|across)\s+(?:the\s+)?([^.,;\n]+)/i);
        if (tail) {
            const w = mentions(tail[1]);
            const mine = w.countries.includes(cand.name) || w.regions.some((r) => cand.regions.includes(r));
            if (mine) return { eligibility: w.countries.includes(cand.name) ? 'country' : 'region', eligibilityReason: `Description says "${short(context(d, m.index, m[0].length + tail[0].length))}"` };
            if (w.countries.length || w.regions.length) return { eligibility: 'restricted', eligibilityReason: `Description limits it to ${[...w.countries, ...w.regions.map((r) => r.toUpperCase())].slice(0, 5).join(', ')}: "${short(context(d, m.index, m[0].length + tail[0].length))}"` };
        }
        return { eligibility: 'worldwide', eligibilityReason: `Description says "${short(context(d, m.index, m[0].length))}"` };
    }
    return fallback;
}

const short = (s) => (s.length > 90 ? `${s.slice(0, 87)}...` : s).replace(/\s+/g, ' ').trim();
const context = (d, i, len) => d.slice(Math.max(0, i - 30), i + len + 30);

/** Job title without the stray bullets/dashes some feeds put in front ("- DevOps Engineer"). */
export function cleanTitle(title) {
    return String(title || '').replace(/\s+/g, ' ').replace(/^[\s\-–—•·|:*]+/, '').trim();
}

/** Smallest "N+ years" figure in the text, or null. */
export function minYears(text) {
    const nums = [...(text || '').matchAll(/(\d{1,2})\s*(?:\+|-\s*\d{1,2}|–\s*\d{1,2}|to\s*\d{1,2})?\s*(?:\+\s*)?(?:years?|yrs?)\b(?!\s*old)/gi)]
        .map((m) => Number(m[1])).filter((n) => n > 0 && n < 25);
    return nums.length ? Math.min(...nums) : null;
}
