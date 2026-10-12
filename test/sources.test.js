import test from 'node:test';
import assert from 'node:assert/strict';
import { get, paginate, retryAfterMs } from '../src/sources.js';

test('paginate stops when the feed ends (null), not on a page with nothing kept', async () => {
    const pages = [[1, 2], [], [3], null];
    const calls = [];
    const out = await paginate(async (i) => { calls.push(i); return pages[i]; }, { maxPages: 10 });
    assert.deepEqual([...out], [1, 2, 3]);
    assert.deepEqual(calls, [0, 1, 2, 3]);
    assert.equal(out.partialError, undefined);
});

test('paginate keeps earlier pages when a later page fails', async () => {
    const out = await paginate(async (i) => { if (i === 2) throw new Error('HTTP 503'); return [i]; }, { maxPages: 10 });
    assert.deepEqual([...out], [0, 1]);
    assert.equal(out.partialError, 'page 3: HTTP 503');
});

test('paginate still throws when the first page fails', async () => {
    await assert.rejects(paginate(async () => { throw new Error('HTTP 500'); }, { maxPages: 3 }), /HTTP 500/);
});

test('paginate respects maxPages and maxRows', async () => {
    assert.equal((await paginate(async (i) => [i], { maxPages: 4 })).length, 4);
    assert.deepEqual([...(await paginate(async () => [1, 2, 3], { maxPages: 10, maxRows: 5 }))], [1, 2, 3, 1, 2]);
});

test('retryAfterMs reads seconds and HTTP dates, and caps the wait', () => {
    assert.equal(retryAfterMs('5'), 5000);
    assert.equal(retryAfterMs('3600'), 20_000);
    const now = Date.parse('2026-10-12T00:00:00Z');
    assert.equal(retryAfterMs('Mon, 12 Oct 2026 00:00:07 GMT', now), 7000);
    assert.equal(retryAfterMs('Mon, 12 Oct 2026 00:00:00 GMT', now + 60_000), null); // already in the past
    assert.equal(retryAfterMs(null), null);
    assert.equal(retryAfterMs('soon'), null);
});

test('get waits for the Retry-After time on a 429, and for the backoff when there is no header', async (t) => {
    const waits = [];
    const sleep = async (ms) => { waits.push(ms); };
    const replies = [
        new Response('slow down', { status: 429, headers: { 'retry-after': '2' } }),
        new Response('still busy', { status: 503 }),
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ];
    t.mock.method(globalThis, 'fetch', async () => replies.shift());
    assert.deepEqual(await get('https://example.test/feed', 'json', { backoffMs: 7, sleep }), { ok: true });
    // 2000 comes from the header; 14 is backoffMs x attempt 2, because the 503 carried no header
    assert.deepEqual(waits, [2000, 14]);
});

test('get gives up at once on a 404 and after the last retry on a 500', async (t) => {
    const sleep = async () => {};
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('gone', { status: 404 }); });
    await assert.rejects(get('https://example.test/feed', 'json', { sleep }), /HTTP 404/);
    assert.equal(calls, 1);

    calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('down', { status: 500 }); });
    await assert.rejects(get('https://example.test/feed', 'json', { sleep }), /HTTP 500/);
    assert.equal(calls, 3);
});
