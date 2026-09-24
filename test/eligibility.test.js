import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, resolveCountry, cleanTitle } from '../src/eligibility.js';

const india = resolveCountry('India');
const v = (job) => classify({ description: '', ...job }, india).eligibility;

test('country and region hits', () => {
    assert.equal(v({ title: 'Engineer', locationRaw: 'India' }), 'country');
    assert.equal(v({ title: 'Engineer', locationRaw: 'Northern America, LATAM, Europe, APAC' }), 'region');
});

test('worldwide location', () => {
    assert.equal(v({ title: 'Software Engineer', locationRaw: 'Anywhere in the World' }), 'worldwide');
});

test('a country outside the main table is still a restriction (21 Sep: Suriname came back "unclear")', () => {
    assert.equal(v({ title: 'CX Associate', locationRaw: 'Suriname' }), 'restricted');
});

test('a region in the title overrides a worldwide board location (21 Sep: "... EMEA" came back "worldwide")', () => {
    assert.equal(v({ title: 'Developer Advocate - Service Management EMEA', locationRaw: 'Anywhere in the World' }), 'restricted');
    assert.equal(v({ title: 'Account Executive (US)', locationRaw: 'Worldwide' }), 'restricted');
    assert.equal(v({ title: 'Solutions Engineer, APAC', locationRaw: 'Worldwide' }), 'worldwide');
});

test('description restrictions still apply', () => {
    assert.equal(v({ title: 'Engineer', locationRaw: 'Remote', description: 'Applicants must be US-based.' }), 'restricted');
    assert.equal(v({ title: 'Engineer', locationRaw: 'Remote', description: 'We hire from anywhere in the world.' }), 'worldwide');
});

test('"work from anywhere in the EU" is not worldwide (21 Sep: Makersite came back "worldwide")', () => {
    assert.equal(v({ title: 'Data Scientist', locationRaw: 'Remote', description: 'Remote-First Flexibility - Work from anywhere in the EU, with the option to' }), 'restricted');
    assert.equal(v({ title: 'Data Scientist', locationRaw: 'Remote', description: 'Work from anywhere in Asia.' }), 'region');
});

test('stray leading punctuation is stripped from titles (22 Sep: Tether "- DevOps Engineer")', () => {
    assert.equal(cleanTitle('- DevOps Engineer'), 'DevOps Engineer');
    assert.equal(cleanTitle(' • Senior  Engineer '), 'Senior Engineer');
    assert.equal(cleanTitle('C++ Engineer - Remote'), 'C++ Engineer - Remote');
});

test('"work from anywhere with the setup that suits you" is a perk, not worldwide (23 Sep: Camunda came back "worldwide")', () => {
    assert.equal(v({ title: 'Senior Software Engineer', locationRaw: '', description: 'Benefits where applicable. - Remote & Flexible: Work from anywhere with the setup that suits you' }), 'unclear');
});

test('"work from anywhere in the world" is still worldwide', () => {
    assert.equal(v({ title: 'Software Engineer', locationRaw: '', description: 'We are fully remote. You can work from anywhere in the world.' }), 'worldwide');
});

test('work authorization in a list of countries is a restriction (24 Sep: Anthropic Fellows came back "worldwide")', () => {
    assert.equal(v({ title: 'Anthropic Fellows Program', locationRaw: 'Anywhere in the World', description: 'Logistics Requirements: To participate in the Fellows program, you must have work authorization in the US, UK, or Canada and be located in that country during the program.' }), 'restricted');
    assert.equal(v({ title: 'Engineer', locationRaw: 'Remote', description: 'You must be authorized to work in India or Singapore.' }), 'country');
});
