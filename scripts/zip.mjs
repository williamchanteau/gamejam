import AdmZip from 'adm-zip';
const z = new AdmZip();
z.addLocalFolder('dist');
z.writeZip('jeu-web.zip');
console.log('jeu-web.zip OK');
