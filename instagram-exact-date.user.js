// ==UserScript==
// @name         Instagram Exact Post Date (KST)
// @namespace    https://github.com/maniac428/instagram-exact-date
// @version      1.0.1
// @description  인스타그램의 상대 날짜를 원본 datetime 기준 한국 날짜로 표시합니다.
// @author       maniac428
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @homepageURL  https://github.com/maniac428/instagram-exact-date
// @supportURL   https://github.com/maniac428/instagram-exact-date/issues
// @downloadURL  https://raw.githubusercontent.com/maniac428/instagram-exact-date/main/instagram-exact-date.user.js
// @updateURL    https://raw.githubusercontent.com/maniac428/instagram-exact-date/main/instagram-exact-date.user.js
// @grant        none
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const selector = 'time[datetime]';
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });

    function convertDate(element) {
        const raw = element.getAttribute('datetime');
        // Only timestamps with an explicit time zone identify an unambiguous instant.
        // Never guess a date from a relative label or the computer's local time zone.
        if (!raw || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)) return;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return;

        const parts = Object.fromEntries(dateFormatter.formatToParts(date)
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, part.value]));
        const exactDate = `${parts.year}.${parts.month}.${parts.day}`;
        const tooltip = `${timeFormatter.format(date)} (KST)`;

        // Idempotent writes let the observer settle after our own DOM changes.
        if (element.textContent !== exactDate) element.textContent = exactDate;
        if (element.title !== tooltip) element.title = tooltip;
    }

    const pending = new Set();
    let timer = null;

    function collect(node) {
        const element = node.nodeType === 1 ? node : node.parentElement;
        if (!element) return;
        const containingTime = element.closest(selector);
        if (containingTime) pending.add(containingTime);
        element.querySelectorAll(selector).forEach(time => pending.add(time));
    }

    function flush() {
        timer = null;
        const elements = [...pending];
        pending.clear();
        elements.forEach(element => {
            if (element.isConnected) convertDate(element);
        });
    }

    function start() {
        collect(document.body);
        flush();

        const observer = new MutationObserver(records => {
            for (const record of records) {
                if (record.type === 'childList') {
                    // The target may be a time element whose text was replaced.
                    const containingTime = record.target.nodeType === 1
                        ? record.target.closest(selector) : null;
                    if (containingTime) pending.add(containingTime);
                    record.addedNodes.forEach(collect);
                } else {
                    collect(record.target);
                }
            }
            // A fixed batch window avoids starvation during continuous scrolling.
            if (pending.size && timer === null) timer = setTimeout(flush, 150);
        });
        observer.observe(document.body, {
            childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ['datetime']
        });
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
