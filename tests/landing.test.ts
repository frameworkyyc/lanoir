import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { landing, landingDescription } from '../src/config/landing.ts';
import { primaryNav } from '../src/config/site.ts';

describe('landing page copy and links (approved wording)', () => {
  const [shop, divination] = landing.doors;

  it('has exactly two doors: The Shop and Divination', () => {
    assert.equal(landing.doors.length, 2);
    assert.deepEqual(landing.doors.map((d) => d.label), ['The Shop', 'Divination']);
  });
  it('uses the approved descriptions, word for word', () => {
    assert.equal(shop.description, 'Handcrafted collections for the bold, curious and unapologetic.');
    assert.equal(divination.description, 'Intuitive readings for clarity, reflection and guidance.');
  });
  it('The Shop door goes to /store and the Divination door to /divination', () => {
    assert.equal(shop.href, '/store');
    assert.equal(divination.href, '/divination');
  });
  it('metadata description is built from the same two lines', () => {
    assert.equal(landingDescription, `${shop.description} ${divination.description}`);
    assert.ok(landing.title.includes('LaNoir') && landing.title.includes('Bad Ass Witchery'));
  });
});

describe('shop navigation', () => {
  it('Shop All still points at the catalogue (/shop), not the shop front page', () => {
    assert.equal(primaryNav.find((i) => i.label === 'Shop All')?.href, '/shop');
  });
  it('includes Divination (desktop and mobile both read this list), highlighted', () => {
    const d = primaryNav.find((i) => i.href === '/divination');
    assert.ok(d, 'Divination is in the primary navigation');
    assert.equal(d.label, 'Divination');
    assert.equal(d.accent, true);
  });
  it('has no duplicate destinations', () => {
    const hrefs = primaryNav.map((i) => i.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });
});
