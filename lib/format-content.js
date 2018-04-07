"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function format(originContent, { codeShortNames = ['html', 'js', 'php'] } = {}) {
    var content = originContent;
    content = function (content, codeShortNames) {
        return content.replace(new RegExp(`\\[(${codeShortNames.join('|')})\\]([\\w\\W]+?)\\[\/\\1\\]`, 'img'), '[code lang="$1"]$2[/code]');
    }(content, codeShortNames);
    if (/\[code(?: +lang="?(\w+)"?)?\]/.test(content)) {
        content = content
            .replace(/<p>/g, '\r\n\r\n')
            .replace(/<\/p>/g, '\r\n')
            .replace(/\[code(?: +lang="?(\w+)"?)?\][\n\r]*([\w\W]*?)[\n\r]*\[\/code\]/gi, function (match, lang, content) {
            if (lang === undefined) {
                lang = '';
            }
            ;
            content = content
                .replace(/&nbsp;|&#0*160;/g, ' ')
                .replace(/&lt;|&#0*60;/g, '<')
                .replace(/&gt;|&#0*62;/g, '>')
                .replace(/&quot;|&#0*34;/g, '"')
                .replace(/&apos;|&#0*39;/g, '\'')
                .replace(/&amp;|&#0*38;/g, '&');
            return '```' + lang + '\r\n' + content + '\r\n' + '```';
        });
    }
    return content;
}
exports.default = format;
;
