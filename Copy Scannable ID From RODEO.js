// ==UserScript==
// @name         Rodeo - Copy unique Scannable IDs
// @match        https://rodeo-iad.amazon.com/HOU3/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  const TABLE_SELECTOR = 'table.result-table.shipment-list.tablesorter';
  const BUTTON_ID = 'copy-scannable-id-btn';

  function findScannableColumnIndex(table) {
    const headers = table.querySelectorAll('thead th');
    let idx = -1;
    headers.forEach((th, i) => {
      const label = (th.textContent || '').replace(/\s+/g, ' ').trim();
      if (label === 'Scannable ID') idx = i;
    });
    return idx;
  }

  function getUniqueScannableIds() {
    const table = document.querySelector(TABLE_SELECTOR);
    if (!table) return [];

    const col = findScannableColumnIndex(table);
    if (col < 0) return [];

    const ids = new Set();
    table.querySelectorAll('tbody tr').forEach(tr => {
      const tds = tr.querySelectorAll('td');
      const td = tds[col];
      if (!td) return;
      const id = (td.textContent || '').replace(/\s+/g, ' ').trim();
      if (id) ids.add(id);
    });

    return [...ids];
  }

  async function copyToClipboard(text) {
    // Try modern clipboard API first (requires user gesture; we’re in a click handler)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback: hidden textarea + execCommand('copy')
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);

    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }

  function ensureButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.textContent = 'Copy unique Scannable IDs';
    btn.style.cssText =
      'position: sticky; top: 8px; z-index: 9999; margin: 8px; padding: 6px 10px;';

    btn.addEventListener('click', async () => {
      const ids = getUniqueScannableIds();
      if (!ids.length) return alert('No Scannable IDs found.');

      const text = ids.join('\n');

      try {
        const ok = await copyToClipboard(text);
        if (!ok) return alert('Copy failed. Your browser may block clipboard access.');
        //alert(`Copied ${ids.length} unique Scannable ID(s).`);
      } catch (e) {
        alert('Copy failed. Clipboard permissions may be blocked by the browser.');
      }
    });

    const table = document.querySelector(TABLE_SELECTOR);
    (table && table.parentElement ? table.parentElement : document.body).prepend(btn);
  }

  // Wait briefly for the table to exist
  const start = Date.now();
  const timer = setInterval(() => {
    if (document.querySelector(TABLE_SELECTOR)) {
      ensureButton();
      clearInterval(timer);
      return;
    }
    if (Date.now() - start > 5000) clearInterval(timer);
  }, 100);
})();
