import test from 'node:test';
import assert from 'node:assert/strict';
import { keywordMatcher, matchesAny } from '../src/filters.js';

const hit = (keyword, text) => keywordMatcher(keyword)(text.toLowerCase());

test('a keyword does not match inside a longer word', () => {
    assert.equal(hit('java', 'Senior JavaScript Engineer'), false);
    assert.equal(hit('java', 'Senior Java Engineer'), true);
    assert.equal(hit('go', 'Google Cloud Architect'), false);
    assert.equal(hit('go', 'Ongoing contract, Python'), false);
    assert.equal(hit('go', 'Backend Engineer (Go)'), true);
    assert.equal(hit('node', 'Anode materials scientist'), false);
});

test('plural and js endings still match', () => {
    assert.equal(hit('developer', 'Hiring React developers'), true);
    assert.equal(hit('react', 'ReactJS Developer'), true);
    assert.equal(hit('react', 'React.js Developer'), true);
    assert.equal(hit('node', 'Node.js Backend Engineer'), true);
    assert.equal(hit('react', 'Reactive systems engineer'), false);
});

test('multi-word keywords match across a space, a hyphen or nothing', () => {
    for (const title of ['Full Stack Engineer', 'Full-Stack Engineer', 'Fullstack Engineer']) assert.equal(hit('full stack', title), true, title);
});

test('keywords that end in a symbol work', () => {
    assert.equal(hit('c++', 'C++ Developer'), true);
    assert.equal(hit('c#', 'C# / .NET Engineer'), true);
    assert.equal(hit('.net', 'Senior .NET Engineer'), true);
    assert.equal(hit('c++', 'Objc++ Developer'), false);
    assert.equal(hit('c', 'C++ Developer'), false);
    assert.equal(hit('c', 'C# Engineer'), false);
    assert.equal(hit('c', 'Embedded C Developer'), true);
});

test('regex characters in a keyword are taken literally', () => {
    assert.equal(hit('node (backend)', 'Node (Backend) Engineer'), true);
    assert.equal(hit('a.b', 'axb'), false);
});

test('exclude keywords behave the same way (a "lead" filter must not drop "Leading Edge Labs")', () => {
    const excl = ['lead', 'staff'].map(keywordMatcher);
    assert.equal(matchesAny('tech lead, payments', excl), true);
    assert.equal(matchesAny('engineer at leading edge labs', excl), false);
    assert.equal(matchesAny('staffing platform engineer', excl), false);
});

test('empty keywords never match', () => {
    assert.equal(hit('', 'anything'), false);
    assert.equal(hit('   ', 'anything'), false);
    assert.equal(matchesAny('anything', []), false);
});
