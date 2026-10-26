import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buyPage = () => readFileSync(resolve(__dirname, 'BuyPage.jsx'), 'utf8');

describe('desktop checkout first fold', () => {
  it('keeps a kit chosen in the URL compact so payment starts in the first view', () => {
    const page = buyPage();

    expect(page).toContain("const [kitPickerOpen, setKitPickerOpen]       = useState(() => !preselect);");
    expect(page).toContain('@media(min-width:901px){');
    expect(page).toContain('.by-kits{margin-bottom:16px;}');
    expect(page).toContain('.by-kit-img,.by-kit-result,.by-kit-mini-ledger{display:none;}');
    expect(page).toContain('.co-form-trust{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));');
    expect(page).toContain('.by-press-proof{display:none;}');
    expect(page).toContain('.by-express-wrap + .co-progress{display:none;}');
  });
});
