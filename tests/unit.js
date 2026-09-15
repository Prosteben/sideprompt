// Unit tests for the pure parts of storage.js (runs in Node with a tiny chrome mock)
const assert = require('assert');

const mem = {};
global.chrome = {
  storage: {
    local: {
      async get(k) {
        if (k === null) return { ...mem };
        return { [k]: mem[k] };
      },
      async set(o) {
        Object.assign(mem, o);
      },
      async remove(k) {
        (Array.isArray(k) ? k : [k]).forEach((x) => delete mem[x]);
      },
    },
    sync: { async get() { return {}; }, async set() {}, async remove() {} },
  },
};
const PV = require('../extension/src/storage.js');

(async () => {
  // variables
  const vars = PV.extractVariables('Hello {{name}}, today {{date}}. {{ tone | friendly }} and {{name}} again');
  assert.deepStrictEqual(vars.map((v) => v.name), ['name', 'date', 'tone']);
  assert.strictEqual(vars[2].default, 'friendly');
  assert.ok(vars[1].default.length > 0, 'date built-in has default');
  assert.strictEqual(PV.fillVariables('Hi {{name}}! {{tone|calm}}', { name: 'Ben' }), 'Hi Ben! calm');
  assert.strictEqual(PV.fillVariables('{{x}}', {}), '');

  // search
  const prompts = [
    PV.newPrompt({ title: 'Code review', body: 'Review code', folder: 'Coding', tags: ['review'], updatedAt: 2 }),
    PV.newPrompt({ title: 'Email reply', body: 'Reply nicely', folder: 'Writing', tags: ['email'], updatedAt: 1, pinned: true }),
  ];
  assert.strictEqual(PV.search(prompts, '', '__all')[0].title, 'Email reply', 'pinned first');
  assert.strictEqual(PV.search(prompts, 'review', '__all').length, 1);
  assert.strictEqual(PV.search(prompts, '#email', '__all')[0].title, 'Email reply');
  assert.strictEqual(PV.search(prompts, '', 'Coding').length, 1);

  // persistence + free limit
  for (let i = 0; i < PV.FREE_LIMITS.prompts; i++) await PV.upsertPrompt(PV.newPrompt({ title: 'p' + i, body: 'b' }));
  await assert.rejects(() => PV.upsertPrompt(PV.newPrompt({ title: 'over', body: 'b' })), (e) => e.message === 'limit' && e.reason === 'prompts');
  await PV.setPro(true);
  await PV.upsertPrompt(PV.newPrompt({ title: 'over', body: 'b' }));
  assert.strictEqual((await PV.load()).prompts.length, PV.FREE_LIMITS.prompts + 1);

  // import/export round trip
  const json = await PV.exportJSON();
  const res = await PV.importJSON(json);
  assert.strictEqual(res.added, 0, 'same ids are merged, not duplicated');
  const res2 = await PV.importJSON(JSON.stringify([{ title: 'ext', prompt: 'from other tool', category: 'Misc' }]));
  assert.strictEqual(res2.added, 1);
  assert.ok((await PV.load()).folders.includes('Misc'));
  await assert.rejects(() => PV.importJSON('not json'), /Invalid JSON/);

  console.log('unit: all tests passed');
})().catch((e) => {
  console.error('unit: FAILED', e);
  process.exit(1);
});
