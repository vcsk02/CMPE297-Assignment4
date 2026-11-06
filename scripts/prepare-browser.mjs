// Linux-only fallback for environments where the Playwright download is blocked.
// The regular cross-platform option is: npx playwright-core install chromium.
import fs from 'node:fs/promises';
import {brotliDecompressSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
if(process.platform!=='linux')throw Error('Use an installed Chromium with CHROMIUM_PATH on this platform.');
const target=path.join(os.tmpdir(),'cmpe297-chromium'),assets=path.join(os.tmpdir(),'cmpe297-browser-assets');
await fs.mkdir(assets,{recursive:true});
for(const name of ['chromium','swiftshader.tar','fonts.tar']){
 const data=brotliDecompressSync(await fs.readFile(`node_modules/@sparticuz/chromium/bin/${name}.br`));
 const file=name==='chromium'?target:path.join(assets,name);await fs.writeFile(file,data);
 if(name.endsWith('.tar'))execFileSync('tar',['--no-same-owner','-xf',file,'-C',assets]);
}
await fs.chmod(target,0o700);
console.log(`CHROMIUM_PATH=${target}`);console.log(`LD_LIBRARY_PATH=${assets}`);
