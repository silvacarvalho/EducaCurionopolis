import favicons from 'favicons';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceSvgPath = resolve(process.cwd(), 'public', 'favicon.svg');
const svg = readFileSync(sourceSvgPath);

const configuration = {
  appName: 'EDUCA+ Curionópolis',
  appShortName: 'Educa+',
  appDescription: 'Sistema EDUCA+ Curionópolis',
  developerName: 'Curionópolis',
  developerURL: null,
  icons: {
    favicons: true,
    windows: false,
    appleIcon: false,
    appleStartup: false,
    android: false,
    firefox: false,
    yandex: false,
    coast: false,
  },
  path: '/',
  replaceOriginal: true,
};

console.log('Generating icons from', sourceSvgPath);

favicons(svg, configuration)
  .then((response) => {
    // Write .ico and 32x32 png explicitly
    for (const image of response.images) {
      if (image.name === 'favicon.ico') {
        writeFileSync(resolve(process.cwd(), 'public', 'favicon.ico'), image.contents);
        console.log('Wrote public/favicon.ico');
      }
      if (image.name === 'favicon-32x32.png') {
        writeFileSync(resolve(process.cwd(), 'public', 'favico-32.png'), image.contents);
        console.log('Wrote public/favico-32.png');
      }
      if (image.name === 'favicon-48x48.png') {
        writeFileSync(resolve(process.cwd(), 'public', 'favico-48.png'), image.contents);
        console.log('Wrote public/favico-48.png');
      }
      if (image.name === 'favicon-64x64.png') {
        writeFileSync(resolve(process.cwd(), 'public', 'favico-64.png'), image.contents);
        console.log('Wrote public/favico-64.png');
      }
    }
  })
  .catch((err) => {
    console.error('Favicons generation failed:', err);
    process.exit(1);
  });
