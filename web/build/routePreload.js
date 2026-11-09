// Static hosting serves the same HTML for every route. Preload only the current
// landing page's chunk graph while the main app is downloading.
export function routePreload() {
  return {
    name: 'solum-route-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
        const find = suffix => chunks.find(chunk => chunk.facadeModuleId?.endsWith(suffix));
        const collect = entry => {
          const seen = new Set();
          const assets = [];
          const visit = chunk => {
            if (!chunk || seen.has(chunk.fileName)) return;
            seen.add(chunk.fileName);
            if (!chunk.isEntry) assets.push({ href: `/${chunk.fileName}`, rel: 'modulepreload' });
            for (const css of chunk.viteMetadata?.importedCss ?? []) {
              assets.push({ href: `/${css}`, rel: 'preload', as: 'style' });
            }
            for (const file of chunk.imports) visit(bundle[file]);
          };
          visit(entry);
          return assets;
        };
        const home = find('/src/pages/FullSite.jsx');
        const buy = find('/src/pages/BuyPage.jsx');
        const stripe = find('/src/lib/stripe.js');
        if (!home || !buy || !stripe) throw new Error('Missing landing page preload chunks');
        const routes = { '/': collect(home), '/full': collect(home), '/buy': collect(buy) };
        return [{
          tag: 'script',
          attrs: { id: 'solum-route-preload' },
          injectTo: 'head',
          children: `(()=>{const routes=${JSON.stringify(routes)};for(const asset of routes[location.pathname]||[]){const link=document.createElement('link');Object.assign(link,asset);link.crossOrigin='';document.head.appendChild(link);}if(location.pathname==='/buy')import(${JSON.stringify('/' + stripe.fileName)}).catch(()=>{});})();`,
        }];
      },
    },
  };
}
