import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, resolveCountry, cleanTitle, minYears } from '../src/eligibility.js';
import { text } from '../src/sources.js';

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

test('a bare city pins the job to its country (25 Sep: Phantasma Labs "Berlin" came back "unclear")', () => {
    assert.equal(v({ title: 'Machine Learning Engineer', locationRaw: 'Berlin', description: '' }), 'restricted');
    assert.equal(v({ title: 'Engineer', locationRaw: 'Remote, Bengaluru', description: '' }), 'country');
    assert.equal(v({ title: 'Engineer', locationRaw: 'Vienna', description: '' }), 'restricted');
    assert.equal(v({ title: 'Product Builder', locationRaw: 'Remote', description: '' }), 'unclear');
});

test('a region in the title also overrides a bare "Remote" location (1 Oct: GitLab "... - EMEA" came back "worldwide")', () => {
    assert.equal(v({ title: 'Forward Deployed Engineer - EMEA', locationRaw: 'Remote', description: 'Remote-Global. Work from anywhere in the world.' }), 'restricted');
    assert.equal(v({ title: 'Forward Deployed Engineer', locationRaw: 'Remote', description: 'We hire from anywhere in the world.' }), 'worldwide');
    assert.equal(v({ title: 'Support Engineer, APAC', locationRaw: 'Remote' }), 'unclear');
});

test('years in the title are read (1 Oct: "8+ Years Exp" passed a 5-year cap)', () => {
    assert.equal(minYears('ServiceNow Developer | 8+ Years Exp| IST Time | Remote'), 8);
    assert.equal(minYears('Senior Fullstack Developer'), null);
});

test('entity-encoded markup is stripped from descriptions (1 Oct: reason showed raw span tags)', () => {
    assert.equal(text('&lt;span style="color: white;"&gt;Remote-Global&lt;/span&gt;&lt;/div&gt;&lt;div class="x"&gt;Next'), 'Remote-Global\nNext');
    assert.equal(text('latency &lt; 5 ms and x &gt; y'), 'latency < 5 ms and x > y');
});

test('German-language job titles are local hires (2 Oct: "Softwareentwickler/in" in Markt Indersdorf came back "unclear")', () => {
    assert.equal(v({ title: 'Java Softwareentwickler/in mit Karriereambitionen', locationRaw: 'Markt Indersdorf' }), 'restricted');
    assert.equal(v({ title: 'Frontend Entwickler:in', locationRaw: 'Remote' }), 'restricted');
    assert.equal(v({ title: 'Senior Software Engineer, Quality', locationRaw: 'Remote' }), 'unclear');
    assert.equal(v({ title: 'Sign-in Platform Engineer', locationRaw: 'Remote' }), 'unclear');
});

test('HN <p> paragraphs split the header from the body (3 Oct: "Remote (North America / LatAm)" came back "worldwide")', () => {
    const body = text('Perry Street Software | Senior Mobile Developer | Remote (North America / LatAm), Full-Time<p>Our brands reach 30 million members worldwide.');
    assert.equal(body.split('\n')[0], 'Perry Street Software | Senior Mobile Developer | Remote (North America / LatAm), Full-Time');
    assert.equal(v({ title: 'Senior Mobile Developer', locationRaw: 'Remote (North America / LatAm), Full-Time' }), 'restricted');
    assert.equal(text('a<p class="x">b').split('\n').length, 2);
});

test('"European time zones" is a Europe rule (3 Oct: All Gravy came back "unclear")', () => {
    assert.equal(v({ title: 'Senior Software Engineer', locationRaw: 'REMOTE (European time zones) or ONSITE' }), 'restricted');
    assert.equal(v({ title: 'Engineer', locationRaw: 'Remote (European time zones or India)' }), 'country');
});
