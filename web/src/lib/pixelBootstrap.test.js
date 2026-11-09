import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g), match => match[1]).find(source => source.includes("fbq('init'"));
function bootstrap(hostname, webdriver = false) {
  const context = { location: { hostname }, navigator: { webdriver }, document: { readyState: 'complete' }, setTimeout: () => {}, Date };
  context.window = context; vm.runInNewContext(script, context); return context;
}
describe('production pixel bootstrap', () => {
  it.each(['bysolum.co.uk', 'www.bysolum.co.uk', 'bysolum.com', 'www.bysolum.com'])('queues the pixel and PageView on %s', host => {
    expect(bootstrap(host).fbq?.queue.map(args => args[1])).toEqual(['690345887768095', 'PageView']);
  });
  it.each(['localhost', 'dev.d3pa095gzazg3c.amplifyapp.com', 'bysolum.com.example.org'])('does not load tracking on %s', host => {
    expect(bootstrap(host).fbq).toBeUndefined();
  });
  it('does not load tracking for automated tests', () => { expect(bootstrap('bysolum.com', true).fbq).toBeUndefined(); });
});
