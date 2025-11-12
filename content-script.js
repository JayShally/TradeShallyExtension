(function () {
    const STATE = {
        enabled: true,
        seenKeys: new Set(), // to avoid duplicates on re-renders
    };

    // Small UI toggle
    function injectToggle() {
        const btn = document.createElement('button');
        btn.id = 'sthl-toggle';
        btn.textContent = 'Steam Logger: ON';
        btn.onclick = () => {
            STATE.enabled = !STATE.enabled;
            btn.textContent = `Steam Logger: ${STATE.enabled ? 'ON' : 'OFF'}`;
            console.log(`[STHL] Logging ${STATE.enabled ? 'enabled' : 'disabled'}`);
        };
        document.body.appendChild(btn);
    }

    // Utility: normalize whitespace
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();

    // Utility: parse date text to ISO if possible (Steam uses locale strings)
    function toISO(dateText) {
        // Best effort; leave raw if parsing fails
        const d = new Date(dateText);
        if (!isNaN(d.getTime())) return d.toISOString();
        return null;
    }

    // Heuristics for direction based on text/iconography present in entry
    function inferDirection(el) {
        const txt = el.textContent.toLowerCase();
        if (txt.includes('received') && txt.includes('given')) return 'mixed';
        if (txt.includes('received')) return 'received';
        if (txt.includes('gave') || txt.includes('given') || txt.includes('traded away')) return 'given';
        return 'unknown';
    }

    // Extract counterpart name if present
    function extractCounterpart(el) {
        // Look for profile links in the entry
        const a = el.querySelector('a[href*="/profiles/"], a[href*="/id/"]');
        return a ? norm(a.textContent) || a.href : null;
    }

    // Extract items on each side (Steam DOM varies; we use common class patterns)
    function extractItems(el) {
        const items = [];
        // Common classes: .tradehistory_event, .history_item, .item, .tradehistory_categories
        // We will scan elements that look like item blocks
        const itemEls = el.querySelectorAll('.history_item, .tradehistory_item, .item');
        itemEls.forEach(node => {
            const title = node.getAttribute('data-economy-item') || node.getAttribute('data-tooltip') || node.title || node.getAttribute('data-title');
            const name = norm(title || node.textContent);
            if (!name) return;

            // app or game title sometimes near item; attempt to find parent app text
            let app = null;
            const appEl = node.closest('.tradehistory_event')?.querySelector('.tradehistory_event_description, .tradehistory_event_heading');
            if (appEl) {
                const t = norm(appEl.textContent);
                if (t) app = t;
            }

            // Direction side: try to infer from container columns (left/right) or labels
            let side = 'in';
            const parentTxt = node.closest('.tradehistory_event')?.textContent.toLowerCase() || '';
            if (parentTxt.includes('traded away') || parentTxt.includes('given')) side = 'out';

            items.push({ name, app, qty: 1, side });
        });
        return items;
    }

    // Produce a stable key for de-dup
    function keyFrom(entry) {
        return `${entry.timestampISO || 'raw'}|${entry.counterpart || 'n/a'}|${entry.direction}|${entry.items.map(i => i.name + ':' + i.side).join(',')}`;
    }

    // Parse a single trade history block
    function parseTradeBlock(block) {
        const dateEl = block.querySelector('.tradehistory_date, .tradehistory_timestamp, .date');
        const dateText = norm(dateEl ? dateEl.textContent : '');
        const timestampISO = toISO(dateText) || null;

        const direction = inferDirection(block);
        const counterpart = extractCounterpart(block);
        const items = extractItems(block);

        const entry = {
            timestampISO,
            counterpart,
            direction,
            items,
            rawText: norm(block.textContent).slice(0, 500)
        };

        return entry;
    }

    // Scan the page for trade history entries
    function scan() {
        // Known containers: .tradehistory_page, .tradehistory_events, .inventory_history_page
        const blocks = document.querySelectorAll(
            '.tradehistory_event, .inventory_history_row, .tradehistory_event_row'
        );
        blocks.forEach(b => {
            const entry = parseTradeBlock(b);
            const k = keyFrom(entry);
            if (STATE.seenKeys.has(k)) return;
            STATE.seenKeys.add(k);
            if (STATE.enabled) console.log('[STHL entry]', entry);
        });
    }

    // Mutation observer to catch lazy loads
    function watch() {
        const obs = new MutationObserver((muts) => {
            let touched = false;
            for (const m of muts) {
                if (m.addedNodes && m.addedNodes.length) {
                    touched = true;
                    break;
                }
            }
            if (touched) {
                // Debounce
                clearTimeout(watch._t);
                watch._t = setTimeout(scan, 200);
            }
        });
        obs.observe(document.documentElement, { subtree: true, childList: true });
    }

    // Optional: try to reveal more history (can comment out if you prefer manual scroll)
    function autoLoadMore() {
        // Steam often has "Load More" or infinite scroll; handle button if present.
        const btn = document.querySelector('a.load_more_history, .load_more_button, .btnv6_lightblue_blue');
        if (btn && !btn.dataset._sthlBound) {
            btn.dataset._sthlBound = '1';
            setInterval(() => {
                if (!STATE.enabled) return;
                if (btn.offsetParent !== null) btn.click();
            }, 3000);
        }
    }

    // Boot
    function init() {
        injectToggle();
        scan();
        watch();
        autoLoadMore();
        console.log('[STHL] Steam Trade History Logger initialized.');
    }

    // Ensure DOM available
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
