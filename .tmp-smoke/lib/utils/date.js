"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLocalDate = formatLocalDate;
exports.todayLocalDate = todayLocalDate;
function pad2(value) {
    return String(value).padStart(2, '0');
}
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    return `${year}-${month}-${day}`;
}
function todayLocalDate() {
    return formatLocalDate(new Date());
}
