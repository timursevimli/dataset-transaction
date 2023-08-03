'use strict';

const fs = require('node:fs');
const path = require('node:path');

const isJs = (file) => file.endsWith('.js');
const testFiles = fs.readdirSync(__dirname).filter(isJs);

for (const file of testFiles) {
  if (__filename.includes(file)) continue;
  const filePath = path.join(__dirname, file);
  console.log(`Running tests in ${file}`);
  require(filePath);
}
