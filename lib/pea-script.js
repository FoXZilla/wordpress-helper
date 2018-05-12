"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getRandomChar(len) {
    var str = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ123456789";
    var random = [];
    for (let i = 0; i < len; i++) {
        let rand = Math.floor(Math.random() * str.length);
        random.push(str.charAt(rand));
    }
    ;
    return random.join('');
}
exports.getRandomChar = getRandomChar;
;
function Assert(val) { return val; }
exports.Assert = Assert;
;
function doThatOr(it, that, or) {
    if (it)
        return that(it);
    else
        return or;
}
exports.doThatOr = doThatOr;
