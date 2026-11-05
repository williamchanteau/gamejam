import fs from 'node:fs';
import AdmZip from 'adm-zip';
const z = new AdmZip();
z.addLocalFolder('dist');
fs.mkdirSync('exports', { recursive: true });
z.writeZip('exports/ashenborn-web.zip');
console.log('exports/ashenborn-web.zip OK');
