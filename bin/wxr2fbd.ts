#!/usr/bin/env node

import Parse from '../lib/parse';
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
    .action(async function (file:string, options:any){
        console.log(`Parsing... ${Path.resolve(file)}`);
        var fbData =await Parse(Path.resolve(file));
        console.log(`\
- Article: ${fbData.data.article.length}
- Comment: ${fbData.data.comment.length}
- Category: ${fbData.data.category.length}
- Tag: ${fbData.data.tag.length}\
`);
        var outPath =Path.resolve(options.out||`./${new Date().getTime()}.fbd.json`);
        Fs.writeFileSync(outPath,JSON.stringify(fbData,null,'  '));
        console.log(`output to ${outPath}`);
    })
;

program.parse(process.argv);
process.on('unhandledRejection', function(e){
    console.error(e);
});