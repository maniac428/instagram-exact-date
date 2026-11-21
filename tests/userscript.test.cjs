'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');

const source = readFileSync(resolve(__dirname, '../instagram-exact-date.user.js'), 'utf8');

// Small independent DOM/observer fixture. No Instagram access or network is used.
function fixture(initial = [], ready = true) {
    let callback;
    let options;
    let readyCallback;
    let writes = 0;
    const timers = [];
    const emit = record => { if (callback) callback([record]); };

    class Element {
        constructor(tag, datetime, text = '') {
            this.nodeType = 1;
            this.tag = tag;
            this.attributes = new Map();
            if (datetime !== undefined) this.attributes.set('datetime', datetime);
            this._text = text;
            this.title = '';
            this.children = [];
            this.parentElement = null;
        }
        get isConnected() {
            return this === body || Boolean(this.parentElement?.isConnected);
        }
        get textContent() { return this._text; }
        set textContent(value) {
            this._text = value;
            writes++;
            emit({ type: 'childList', target: this, addedNodes: [] });
        }
        getAttribute(name) { return this.attributes.get(name) ?? null; }
        setAttribute(name, value) {
            this.attributes.set(name, value);
            if (name === 'datetime') emit({ type: 'attributes', target: this });
        }
        matches() { return this.tag === 'time' && this.attributes.has('datetime'); }
        closest() { return this.matches() ? this : this.parentElement?.closest() ?? null; }
        querySelectorAll() {
            return this.children.flatMap(child => [
                ...(child.matches() ? [child] : []), ...child.querySelectorAll()
            ]);
        }
        append(child) {
            child.parentElement = this;
            this.children.push(child);
            emit({ type: 'childList', target: this, addedNodes: [child] });
            return child;
        }
    }

    const body = new Element('body');
    const elements = initial.map(([raw, text]) => body.append(new Element('time', raw, text)));
    const document = {
        body: ready ? body : null,
        addEventListener(event, fn, config) {
            assert.equal(event, 'DOMContentLoaded');
            assert.equal(config.once, true);
            readyCallback = fn;
        }
    };
    const context = {
        document, Intl, Date,
        MutationObserver: class {
            constructor(fn) { callback = fn; }
            observe(target, config) { assert.equal(target, body); options = config; }
        },
        setTimeout(fn, delay) { assert.equal(delay, 150); timers.push(fn); return timers.length; }
    };
    runInNewContext(source, context, { timeout: 1000 });
    return {
        body, elements, Element, emit, timers,
        get options() { return options; },
        get writes() { return writes; },
        ready() { document.body = body; readyCallback(); },
        drain() {
            let count = 0;
            while (timers.length) {
                assert.ok(count++ < 10, 'observer must settle instead of looping');
                timers.shift()();
            }
        }
    };
}

test('KST date and year boundaries, offsets, leap day and fractional seconds', () => {
    const rows = [
        ['2024-05-12T09:35:21Z', '2024.05.12'],
        ['2024-12-31T14:59:59Z', '2024.12.31'],
        ['2024-12-31T15:00:00Z', '2025.01.01'],
        ['2024-05-12T23:00:00-07:00', '2024.05.13'],
        ['2024-05-12T00:00:00+09:00', '2024.05.12'],
        ['2024-02-29T14:59:59.999Z', '2024.02.29']
    ];
    const f = fixture(rows.map(([raw]) => [raw, '329주']));
    rows.forEach(([raw, expected], i) => {
        assert.equal(f.elements[i].textContent, expected);
        assert.equal(f.elements[i].getAttribute('datetime'), raw);
        assert.match(f.elements[i].title, /\(KST\)$/);
    });
    assert.match(f.elements[2].title, /00:00:00/);
});

test('missing, malformed and ambiguous timestamps remain untouched', () => {
    const f = fixture([undefined, '', '48주', '2024-05-12',
        '2024-05-12T09:35:21', '2024-13-12T09:35:21Z',
        '2024-05-12T99:00:00Z'].map(raw => [raw, '48주']));
    f.elements.forEach(element => {
        assert.equal(element.textContent, '48주');
        assert.equal(element.title, '');
    });
});

test('new post containers and datetime updates are handled in batches', () => {
    const f = fixture();
    const container = new f.Element('article');
    const time = container.append(new f.Element('time', '2024-12-31T15:00:00Z', '1주'));
    f.body.append(container);
    assert.equal(f.timers.length, 1);
    f.drain();
    assert.equal(time.textContent, '2025.01.01');
    time.setAttribute('datetime', '2024-05-12T09:35:21Z');
    f.drain();
    assert.equal(time.textContent, '2024.05.12');
});

test('relative text rerenders are restored and observer feedback settles', () => {
    const f = fixture([['2024-05-12T09:35:21Z', '329주']]);
    const time = f.elements[0];
    time.textContent = '329주';
    f.drain();
    assert.equal(time.textContent, '2024.05.12');
    const previousWrites = f.writes;
    f.emit({ type: 'characterData', target: { nodeType: 3, parentElement: time } });
    f.drain();
    assert.equal(f.writes, previousWrites, 'already formatted text must not be rewritten');
});

test('continuous mutations do not delay the first batch; unrelated changes do no work', () => {
    const f = fixture();
    f.body.append(new f.Element('div', undefined, 'unrelated'));
    assert.equal(f.timers.length, 0);
    for (let i = 0; i < 100; i++) {
        f.body.append(new f.Element('time', '2024-05-12T09:35:21Z', '48주'));
    }
    assert.equal(f.timers.length, 1);
    f.drain();
    f.body.querySelectorAll().forEach(time => assert.equal(time.textContent, '2024.05.12'));
});

test('removed nodes are skipped and DOM readiness fallback works', () => {
    const f = fixture([], false);
    f.ready();
    const time = f.body.append(new f.Element('time', '2024-05-12T09:35:21Z', '48주'));
    f.body.children.pop();
    time.parentElement = null;
    f.drain();
    assert.equal(time.textContent, '48주');
    assert.deepEqual(Array.from(f.options.attributeFilter), ['datetime']);
    assert.equal(f.options.subtree, true);
});

test('distribution metadata restricts sites and has no remote dependencies', () => {
    const matches = [...source.matchAll(/^\/\/ @match\s+(\S+)/gm)].map(match => match[1]);
    assert.deepEqual(matches, ['https://www.instagram.com/*', 'https://instagram.com/*']);
    assert.match(source, /^\/\/ @grant\s+none$/m);
    assert.doesNotMatch(source, /@require|@connect|\bfetch\s*\(|XMLHttpRequest|document\.cookie|localStorage/);
});
