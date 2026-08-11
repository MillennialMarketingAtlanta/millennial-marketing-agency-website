const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPostDraft } = require('./automate-blog-publishing');

test('buildPostDraft returns frontmatter and body content for a queued topic', () => {
  const topic = {
    topic: 'How mixed-use developments should position themselves beyond amenities',
    primaryKeyword: 'mixed-use development branding',
    audience: 'development teams and project marketers',
    cta: 'Encourage a strategy conversation around positioning and launch storytelling',
    angle: 'Explain how mixed-use brands need a stronger point of view than a list of amenities and tenants.'
  };

  const draft = buildPostDraft(topic, '2026-08-12');

  assert.match(draft.title, /Mixed-Use Developments/i);
  assert.equal(draft.slug, 'how-mixed-use-developments-should-position-themselves-beyond-amenities');
  assert.ok(draft.description.length >= 80);
  assert.match(draft.body, /# /);
  assert.match(draft.body, /## /);
  assert.match(draft.body, /development teams and project marketers/i);
});
