"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function toIOSDate(str) {
    var date = new Date(str);
    if (Number.isNaN(date.getTime()))
        return '0000-01-01T00:00:00.000Z';
    return date.toISOString();
}
exports.toIOSDate = toIOSDate;
;
