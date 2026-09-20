import { Actor, log } from 'apify';
import { SOURCES } from './sources.js';
import { classify, minYears, resolveCountry } from './eligibility.js';

const ORDER = { country: 0, region: 1, worldwide: 2, unclear: 3, restricted: 4 };
const key = (j) => `${(j.company || '').toLowerCase().replace(/\W|inc$|llc$|ltd$|gmbh$/g, '')}|${(j.title || '').toLowerCase().replace(/\(.*?\)|\W/g, '')}`;

await Actor.init();
try {
    const input = (await Actor.getInput()) ?? {};
    const {
        candidateCountry = 'India', keywords = [], titleMustMatch = false, excludeKeywords = [], eligibility = 'eligible_and_unclear',
        maxYearsRequired, postedWithinDays = 14, sources = Object.keys(SOURCES), maxItems = 200, includeDescription = false,
    } = input;

    const cand = resolveCountry(candidateCountry);
    if (!cand.regions.length) log.warning(`"${candidateCountry}" is not in the built-in country list: only exact country-name matches and worldwide jobs can be recognised.`);
    const kws = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
    const excl = excludeKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
    const since = Date.now() - postedWithinDays * 86_400_000;

    // 1. fetch every source in parallel; one broken feed never fails the run
    const stats = {};
    const fetched = (await Promise.all(sources.filter((s) => SOURCES[s]).map(async (s) => {
        try {
            const rows = await SOURCES[s]({ maxPerSource: 400 });
            stats[s] = { fetched: rows.length };
            return rows;
        } catch (err) {
            stats[s] = { fetched: 0, error: err.message };
            log.warning(`${s}: ${err.message} - skipped`);
            return [];
        }
    }))).flat();

    // 2. filter, 3. de-duplicate across sources, 4. classify
    const seen = new Map();
    const dropped = { old: 0, keyword: 0, excluded: 0, years: 0, duplicate: 0, restricted: 0, unclear: 0 };
    for (const j of fetched) {
        if (!j.title || !j.url) continue;
        if (j.postedAt && new Date(j.postedAt).getTime() < since) { dropped.old++; continue; }
        const title = j.title.toLowerCase();
        const hay = titleMustMatch ? title : `${title} ${(j.tags || []).join(' ').toLowerCase()} ${(j.description || '').toLowerCase()}`;
        if (kws.length && !kws.some((k) => hay.includes(k))) { dropped.keyword++; continue; }
        if (excl.some((k) => new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(title))) { dropped.excluded++; continue; }
        const yrs = minYears(j.description);
        if (maxYearsRequired != null && yrs != null && yrs > maxYearsRequired) { dropped.years++; continue; }

        const verdict = classify(j, cand);
        if (eligibility !== 'all' && verdict.eligibility === 'restricted') { dropped.restricted++; continue; }
        if (eligibility === 'eligible' && verdict.eligibility === 'unclear') { dropped.unclear++; continue; }

        const k = key(j);
        const row = { ...verdict, title: j.title.trim(), company: (j.company || '').trim(), locationRaw: j.locationRaw || null, salary: j.salary || null, minYears: yrs,
            employmentType: j.employmentType || null, tags: [...new Set((j.tags || []).map((t) => String(t).trim()).filter(Boolean))].slice(0, 15), postedAt: j.postedAt,
            source: j.source, alsoOn: [], url: j.url, applyUrl: j.applyUrl || j.url, contactEmail: j.contactEmail || null, candidateCountry: cand.name,
            ...(includeDescription ? { description: j.description } : {}) };
        const prev = seen.get(k);
        if (prev) {
            dropped.duplicate++;
            if (!prev.alsoOn.includes(j.source) && prev.source !== j.source) prev.alsoOn.push(j.source);
            // keep whichever copy carries the clearer eligibility evidence
            if (ORDER[row.eligibility] < ORDER[prev.eligibility]) seen.set(k, { ...row, alsoOn: [...new Set([...prev.alsoOn, prev.source])].filter((s) => s !== row.source) });
            continue;
        }
        seen.set(k, row);
    }

    const rows = [...seen.values()]
        .sort((a, b) => ORDER[a.eligibility] - ORDER[b.eligibility] || new Date(b.postedAt || 0) - new Date(a.postedAt || 0))
        .slice(0, maxItems);

    // Billing: the platform charges the `apify-default-dataset-item` event per row pushed here, so only delivered,
    // de-duplicated jobs cost the user anything. pushData stops at the user's max-charge limit on its own.
    for (let i = 0; i < rows.length; i += 50) await Actor.pushData(rows.slice(i, i + 50));

    const byVerdict = rows.reduce((a, r) => ({ ...a, [r.eligibility]: (a[r.eligibility] || 0) + 1 }), {});
    await Actor.setValue('SUMMARY', { candidateCountry: cand.name, returned: rows.length, byEligibility: byVerdict, sources: stats, dropped });
    log.info(`Done: ${rows.length} jobs for ${cand.name}`, { byEligibility: byVerdict, dropped, sources: stats });
} catch (err) {
    log.exception(err, 'Run failed');
    await Actor.fail(err.message);
}
await Actor.exit();
