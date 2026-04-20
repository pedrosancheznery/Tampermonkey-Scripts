// ==UserScript==
// @name         Extract Scannable IDs in FCResearch (Copy to Clipboard)
// @namespace    HOU3
// @version      1.0.3
// @author       Pedro Sanchez (pefsanch)
// @description  Extract scannable IDs from container hierarchy and copy to clipboard via a button (only containers with qty > 0)
// @match        https://qi-fcresearch-na.corp.amazon.com/HOU3/*
// @match        https://fcresearch-na.aka.amazon.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts/
// downloadURL   https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Extract%20Scannable%20IDs%20in%20FCResearch%20(Copy%20to%20Clipboard).user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Extract%20Scannable%20IDs%20in%20FCResearch%20(Copy%20to%20Clipboard).user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function extractScannableIDs() {
        const ids = [];
        const rows = document.querySelectorAll("#table-container-hierarchy tbody tr");
        rows.forEach(row => {
            // adjust selectors if your quantity cell is in a different column
            const qtyCell = row.querySelector("td:nth-child(3)"); // assume quantity is 3rd column
            const idCell = row.querySelector("td:first-child a");
            if (!idCell) return;
            const qtyText = qtyCell ? qtyCell.textContent.trim() : '';
            const qty = parseFloat(qtyText.replace(/[,]/g, '')) || 0;
            if (qty > 0) ids.push(idCell.textContent.trim());
        });
        return ids;
    }

    async function copyTextToClipboard(text) {
        if (!text) return false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (e) {}
        }
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.setAttribute('readonly', '');
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e) {
            return false;
        }
    }

    function createCopyButton() {
        if (document.getElementById('tm-copy-scannable-ids')) return;
        const btn = document.createElement('button');
        btn.id = 'tm-copy-scannable-ids';
        btn.textContent = 'Copy Scannable IDs';
        Object.assign(btn.style, {
            position: 'fixed',
            right: '16px',
            bottom: '16px',
            zIndex: 2147483647,
            padding: '8px 12px',
            background: '#0078d4',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            fontSize: '13px'
        });
        btn.addEventListener('click', async () => {
            const ids = extractScannableIDs();
            if (ids.length === 0) {
                btn.textContent = 'No IDs with qty > 0';
                setTimeout(() => btn.textContent = 'Copy Scannable IDs', 2000);
                document.getElementById('search').focus();
                return;
            }
            const text = ids.join('\n');
            const ok = await copyTextToClipboard(text);
            btn.textContent = ok ? 'Copied!' : 'Copy failed';
            setTimeout(() => btn.textContent = 'Copy Scannable IDs', 1500);
        });
        document.body.appendChild(btn);
    }

    function onTableReady() {
        createCopyButton();
    }

    const observer = new MutationObserver(() => {
        const table = document.querySelector("#table-container-hierarchy");
        if (table) {
            onTableReady();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        if (document.querySelector("#table-container-hierarchy")) onTableReady();
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector("#table-container-hierarchy")) onTableReady();
        });
    }
})();
