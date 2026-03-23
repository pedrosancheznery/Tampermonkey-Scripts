// ==UserScript==
// @name         PNP Automation Tool
// @namespace    HOU3
// @version      1.2
// @description  Automate palletization by processing a list of IDs via the PNP tool logic; logs unprocessed totes and continues on error modals
// @author       Pedro Sanchez (pefsanch)
// @match        https://pnp-iad.aka.amazon.com/pnp
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/PNP%20Automation%20Tool.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- UI creation ---
    function createUI() {
        // Container
        const container = document.createElement('div');
        container.id = 'tm-pnp-automation';
        container.style = "position: fixed; bottom: 50px; left: 10px; z-index: 9999; background: white; border: 2px solid #232f3e; padding: 10px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 300px; font-family: Arial, sans-serif; font-size: 13px;";

        // PAX label/input
        const label2 = document.createElement('label');
        label2.innerText = "PAX Label:";
        label2.style = "display: block; font-weight: bold; margin-bottom: 5px;";
        const paxInput = document.createElement('input');
        paxInput.id = "pax-input";
        paxInput.style = "width: 100%; margin-bottom: 8px; padding: 6px; box-sizing: border-box;";

        // IDs textarea
        const label1 = document.createElement('label');
        label1.innerText = "Paste IDs (One per line):";
        label1.style = "display: block; font-weight: bold; margin-bottom: 5px;";
        const textarea = document.createElement('textarea');
        textarea.id = "pnp-batch-input";
        textarea.style = "width: 100%; height: 120px; margin-bottom: 10px; font-family: monospace; box-sizing: border-box; padding:6px;";
        textarea.placeholder = "TOTE123\nPKG456...";

        // Process button
        const btn = document.createElement('button');
        btn.id = 'tm-process-button';
        btn.innerText = "Process Batch";
        btn.style = "width: 100%; padding: 10px; background-color: #28a745; color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 4px;";

        // Status
        const statusDiv = document.createElement('div');
        statusDiv.id = "check-status";
        statusDiv.innerText = "Ready";
        statusDiv.style = "margin-top: 8px; font-size: 12px; color: #555; font-weight: bold;";

        // Unprocessed Totes heading + table
        const unprocessedHeading = document.createElement('div');
        unprocessedHeading.innerText = "Unprocessed Totes";
        unprocessedHeading.style = "margin-top:10px;font-weight:bold;";
        const unprocessedTable = document.createElement('table');
        unprocessedTable.id = "unprocessed-totes-table";
        unprocessedTable.style = "width:100%;border-collapse:collapse;margin-top:6px;font-size:12px;border:1px solid #ddd;";
        unprocessedTable.innerHTML = '<thead><tr><th style="border:1px solid #ddd;padding:4px;text-align:left">Tote</th><th style="border:1px solid #ddd;padding:4px;text-align:left">Reason</th></tr></thead><tbody></tbody>';

        // Append elements
        container.appendChild(label2);
        container.appendChild(paxInput);
        container.appendChild(label1);
        container.appendChild(textarea);
        container.appendChild(btn);
        container.appendChild(statusDiv);
        container.appendChild(unprocessedHeading);
        container.appendChild(unprocessedTable);
        document.body.appendChild(container);

        // Wire button click
        btn.addEventListener('click', async () => {
            await handleProcessClick(textarea, paxInput, statusDiv);
        });

        // Start observing for error modals
        startErrorObserver();
    }

    // --- Utility: log unprocessed tote ---
    function logUnprocessedTote(toteId, reason) {
        const table = document.getElementById('unprocessed-totes-table');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="border:1px solid #ddd;padding:4px">${escapeHtml(toteId)}</td><td style="border:1px solid #ddd;padding:4px">${escapeHtml(reason)}</td>`;
        tbody.appendChild(tr);
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // --- Main processing handler ---
    async function handleProcessClick(textarea, paxInput, statusDiv) {
        const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const status = statusDiv;
        let i = 0;

        if (lines.length === 0) return alert("Please enter at least one ID.");

        for (const id of lines) {
            i += 1;
            console.log(`[PNP Automation] Processing: ${id}`);

            // Start processing
            window.scan && window.scan(id);
            status.innerText = `Checking (${i}/${lines.length}): ${id}`;
            status.style.color = "blue";

            // Wait for either success or error modal
            const result = await Promise.race([
                waitForSuccessMessage(),
                waitForErrorModal()
            ]);

            // If error modal detected and returned a toteId, it has been logged and dismissed.
            if (result && result.type === 'error') {
                status.innerText = `Skipped (${i}/${lines.length}): ${result.toteId}`;
                status.style.color = "orange";
                // continue to next ID
                await new Promise(r => setTimeout(r, 600)); // small pause
                continue;
            }

            // Otherwise proceed to PAX scan if provided
            const paxValue = paxInput.value.trim();
            if (paxValue) {
                window.scan && window.scan(paxValue);
                // Wait for palletize completion or possible error modal
                const postResult = await Promise.race([
                    waitForPalletizeCompleteMessage(),
                    waitForErrorModal()
                ]);

                if (postResult && postResult.type === 'error') {
                    status.innerText = `PAX failed (${i}/${lines.length}): ${postResult.toteId}`;
                    status.style.color = "orange";
                    await new Promise(r => setTimeout(r, 600));
                    continue;
                }
            } else {
                console.log("No PAX value to scan.");
            }

            // Optional delay between items
            await new Promise(r => setTimeout(r, 1000));
        }

        textarea.value = "";
        status.innerText = `Finished! Processed ${lines.length} items`;
        status.style.color = "green";
    }

    // --- wait for success message ---
    function waitForSuccessMessage(timeoutMs = 8000) {
        return new Promise((resolve) => {
            let resolved = false;
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    const successHeader = document.getElementById('rightViewHeader');
                    const statusContainer = document.getElementById('statusContainer');
                    const messageContainer = document.querySelector('.messageContainer .successMessageContainer');

                    if (successHeader && statusContainer) {
                        const table = statusContainer.querySelector('table');
                        if (table) {
                            if (!resolved) {
                                resolved = true;
                                observer.disconnect();
                                resolve({ type: 'success' });
                                return;
                            }
                        }
                    }

                    if (messageContainer) {
                        const header = messageContainer.querySelector('h1');
                        if (header && header.innerText.includes("Tote submitted to pack")) {
                            if (!resolved) {
                                resolved = true;
                                observer.disconnect();
                                resolve({ type: 'success' });
                                return;
                            }
                        }
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true, characterData: true });

            // Fallback timeout to avoid hanging forever
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    resolve({ type: 'timeout' });
                }
            }, timeoutMs);
        });
    }

    // --- wait for palletize complete message ---
    function waitForPalletizeCompleteMessage(timeoutMs = 10000) {
        return new Promise((resolve) => {
            let resolved = false;
            const observer = new MutationObserver(() => {
                const messageContainer = document.querySelector('.messageContainer .successMessageContainer');
                if (messageContainer) {
                    const header = messageContainer.querySelector('h1');
                    if (header && header.innerText.includes("Palletize complete")) {
                        if (!resolved) {
                            resolved = true;
                            observer.disconnect();
                            resolve({ type: 'success' });
                        }
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true, characterData: true });

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    resolve({ type: 'timeout' });
                }
            }, timeoutMs);
        });
    }

    // --- wait for error modal (and handle it) ---
    function waitForErrorModal(timeoutMs = 8000) {
        return new Promise((resolve) => {
            let resolved = false;

            // If an error modal already present, handle immediately
            const existing = findErrorModal();
            if (existing) {
                const info = handleErrorModal(existing);
                resolved = true;
                resolve({ type: 'error', toteId: info.toteId, reason: info.reason });
                return;
            }

            const observer = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    const modal = findErrorModal();
                    if (modal) {
                        const info = handleErrorModal(modal);
                        if (!resolved) {
                            resolved = true;
                            observer.disconnect();
                            resolve({ type: 'error', toteId: info.toteId, reason: info.reason });
                            return;
                        }
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Timeout fallback
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    resolve(null); // no error modal within timeout
                }
            }, timeoutMs);
        });
    }

    // Helper: locate error modal element
    function findErrorModal() {
        // Common selectors used in example
        return document.getElementById('errorModal') || document.querySelector('.customModal.errorModal') || document.querySelector('.customModal.customContainer.errorModal') || null;
    }

    // Helper: extract info and dismiss modal
    function handleErrorModal(modalEl) {
        try {
            const text = (modalEl && modalEl.textContent) ? modalEl.textContent : document.body.textContent;
            // Try multiple regexes for container/tote id (e.g., tsBAXT529795 or TOTE123)
            const toteMatch = text.match(/\b(ts[A-Za-z0-9]+)\b/i) || text.match(/\btote\s+([A-Za-z0-9-]+)\b/i) || text.match(/\b([A-Za-z0-9]{3,})\b/);
            const toteId = (toteMatch && toteMatch[1]) ? toteMatch[1] : 'Unknown';

            // Reason extraction: h4 or errorMessageHeader/NextStep
            let reason = '';
            const h4 = modalEl.querySelector('h4');
            if (h4) reason = h4.textContent.trim();
            const headerDiv = modalEl.querySelector('.errorMessageHeader');
            if (!reason && headerDiv) reason = headerDiv.textContent.trim();
            const nextStep = modalEl.querySelector('.errorMessageNextStep');
            if (!reason && nextStep) reason = nextStep.textContent.trim();
            if (!reason) {
                // fallback to some snippet of modal text
                reason = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0,2).join(' — ');
            }

            // Log to unprocessed table
            logUnprocessedTote(toteId, reason);

            // Try to dismiss the modal:
            // 1) Dispatch 'c' key (Continue)
            try {
                const ev = new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', keyCode: 67, which: 67, bubbles: true });
                document.dispatchEvent(ev);
            } catch (e) { /* ignore */ }

            // 2) Click obvious buttons inside modal
            const btnSelectors = ['button', '.btn', '.continue', '.close', '.modal-close', '.ok', '.confirm'];
            for (const sel of btnSelectors) {
                const btn = modalEl.querySelector(sel);
                if (btn) {
                    try { btn.click(); break; } catch(e) {}
                }
            }

            // 3) Remove overlay/modal from DOM as last resort after short delay
            setTimeout(() => {
                const still = findErrorModal();
                if (still) {
                    const overlay = document.querySelector('.overlay');
                    try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch(e){}
                    try { if (still.parentNode) still.parentNode.removeChild(still); } catch(e){}
                }
            }, 300);

            return { toteId, reason };
        } catch (err) {
            console.error('Error handling modal:', err);
            return { toteId: 'Unknown', reason: 'Error handling modal' };
        }
    }

    // --- Start script when page loads ---
    window.addEventListener('load', () => {
        // small delay to ensure page UI exists
        setTimeout(createUI, 200);
    });
})();
