#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("../lib/parse");
var program = require('commander');
var Path = require('path');
var Fs = require('fs');
program
    .version(`\
wordpress-helper v${require('../package.json').version}
FireBlog v${require('@foxzilla/fireblog/package.json').version}\
`)
    .arguments('<file>')
    .option('-o, --out [file]', 'output as file in')
    .action(async function (file, options) {
    console.log(`Parsing... ${Path.resolve(file)}`);
    var fbData = await parse_1.default(Path.resolve(file));
    console.log(`\
- Article: ${fbData.data.article.length}
- Comment: ${fbData.data.comment.length}
- Category: ${fbData.data.category.length}
- Tag: ${fbData.data.tag.length}\
`);
    var outPath = Path.resolve(options.out || `./${new Date().getTime()}.fbd.json`);
    Fs.writeFileSync(outPath, JSON.stringify(fbData, null, '  '));
    console.log(`output to ${outPath}`);
});
program.parse(process.argv);
process.on('unhandledRejection', function (e) {
    console.error(e);
});
