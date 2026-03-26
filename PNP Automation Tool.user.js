// ==UserScript==
// @name         PNP Automation Tool
// @namespace    HOU3
// @version      1.1.1.14
// @description  Automate palletization by processing a list of IDs via the PNP tool logic; logs unprocessed totes and continues on error modals
// @author       Pedro Sanchez (pefsanch)
// @match        https://pnp-iad.aka.amazon.com/pnp
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/PNP%20Automation%20Tool.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/PNP%20Automation%20Tool.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let statsEl;
    let successCount = 0;
    let failCount = 0;

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

        // Alt PAX label/input
        const label3 = document.createElement('label');
        label3.innerText = "Alternative PAX Label:";
        label3.style = "display: block; font-weight: bold; margin-bottom: 5px;";
        const altpaxInput = document.createElement('input');
        altpaxInput.id = "alt-pax-input";
        altpaxInput.style = "width: 100%; margin-bottom: 8px; padding: 6px; box-sizing: border-box;";
        altpaxInput.disabled = true;

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
        btn.innerText = "▶ Process";
        btn.style = "width: 100%; padding: 10px; background-color: #28a745; color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 4px;";

        statsEl = document.createElement("div");
        statsEl.style = "font-size:12px;color:#888;margin-bottom:14px;";
        statsEl.innerText = "✅ 0 | ❌ 0";

        // Status
        const statusDiv = document.createElement('div');
        statusDiv.id = "check-status";
        statusDiv.innerText = "Ready";
        statusDiv.style = "margin-top: 8px; font-size: 12px; color: #555; font-weight: bold;";

        // Unprocessed Totes heading + table
        const unprocessedDiv = document.createElement('div');
        unprocessedDiv.id = "unprocessed-div";
        unprocessedDiv.style = "margin-top:10px;font-weight:bold;display:none;";
        const unprocessedHeading = document.createElement('div');
        unprocessedHeading.id = "unprocessed-heading";
        unprocessedHeading.innerText = "Unprocessed Totes";
        //unprocessedHeading.style = "margin-top:10px;font-weight:bold;";
        const unprocessedTableDiv = document.createElement('div');
        unprocessedTableDiv.id = "unprocessed-table-div";
        unprocessedTableDiv.style = "max-height: 250px; overflow-y: auto";
        const unprocessedTable = document.createElement('table');
        unprocessedTable.id = "unprocessed-totes-table";
        unprocessedTable.style = "width:100%;border-collapse:collapse;margin-top:6px;font-size:12px;border:1px solid #ddd;";
        unprocessedTable.innerHTML = '<thead><tr><th style="border:1px solid #ddd;padding:4px;text-align:left">Tote</th><th style="border:1px solid #ddd;padding:4px;text-align:left">Reason</th></tr></thead><tbody></tbody>';

        // Append elements
        container.appendChild(label2);
        container.appendChild(paxInput);
        container.appendChild(label1);
        container.appendChild(textarea);
        container.appendChild(statsEl);
        container.appendChild(btn);
        container.appendChild(statusDiv);
        unprocessedTableDiv.appendChild(unprocessedTable);
        unprocessedHeading.appendChild(unprocessedTableDiv);
        unprocessedDiv.appendChild(unprocessedHeading);
        container.appendChild(unprocessedDiv);
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
        const unprocessedDiv = document.getElementById('unprocessed-div'); //unprocessed-div
        unprocessedDiv.style.display = 'block';

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
        const table = document.getElementById('unprocessed-totes-table');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        
        let i = 0;
        tbody.innerHTML = '';
        textarea.disabled = true;
        paxInput.disabled = true;
        failCount = 0;
        successCount = 0;

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
                failCount++;
                updateStats();
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
                    const reasonText = (postResult.reason || '').toString().toLowerCase();

                    // Detect vendor-mix / MIX_OF_VENDOR_CODE / vendor code mismatch cases
                    const isVendorMix = reasonText.includes('mix_of_vendor_code') ||
                                        reasonText.includes('mix of vendor') ||
                                        reasonText.includes('vendor code mismatch') ||
                                        reasonText.includes('mix of different vendor');

                    if (isVendorMix) {
                        status.innerText = `Vendor-mix detected (${i}/${lines.length}): scanning alt pax`;
                        status.style.color = "orange";

                        // Get alternate pax value and try scanning it
                        const altPaxEl = document.getElementById('alt-pax-input');
                        const altPax = altPaxEl ? altPaxEl.value.trim() : '';
                        if (altPax) {
                            window.scan && window.scan(altPax);
                            // wait for palletize/success or another error
                            const altResult = await Promise.race([
                                waitForPalletizeCompleteMessage(),
                                waitForSuccessMessage(),
                                waitForErrorModal()
                            ]);

                            if (altResult && altResult.type === 'error') {
                                // still an error after alt pax
                                status.innerText = `Alt PAX failed (${i}/${lines.length}): ${altResult.toteId || ''}`;
                                status.style.color = "orange";
                                failCount++;
                                updateStats();
                                await new Promise(r => setTimeout(r, 600));
                                continue;
                            }

                            // success on alt pax
                            successCount++;
                            updateStats();
                            await new Promise(r => setTimeout(r, 600));
                            continue;
                        } else {
                            // no alt pax provided — treat as failure/skip
                            status.innerText = `No alt PAX to try (${i}/${lines.length}): ${postResult.toteId || ''}`;
                            status.style.color = "orange";
                            failCount++;
                            updateStats();
                            await new Promise(r => setTimeout(r, 600));
                            continue;
                        }
                    }

                    // Non-vendor-mix errors fall through to default skip behavior
                    status.innerText = `PAX failed (${i}/${lines.length}): ${postResult.toteId || ''}`;
                    status.style.color = "orange";
                    await new Promise(r => setTimeout(r, 600));
                    continue;
                }
            } else {
                console.log("No PAX value to scan.");
            }

            // Optional delay between items
            await new Promise(r => setTimeout(r, 500));
        }

        textarea.disabled = false;
        paxInput.disabled = false;
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
                            successCount++;
                            updateStats();
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

    // Update Stats
    function updateStats() {
        if (statsEl) {
            statsEl.textContent = "✅ " + successCount + " | ❌ " + failCount;
        }
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
                            successCount++;
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
        const text = modalEl?.textContent || document.body.textContent || "";
        // 1. Improved Tote ID Extraction
        // Priorities: 1. ts-style IDs, 2. "tote [id]", 3. Fallback
        const toteMatch = text.match(/\b(ts[A-Za-z0-9]+)\b/i) || 
                          text.match(/\btote\s+([A-Za-z0-9-]+)\b/i);
        const toteId = toteMatch ? toteMatch[1] : 'Unknown';

        // 2. Reason Extraction (Cleaned up Regex Logic)
        const reasonPatterns = [
            /Error\s+is\b[^:]*:\s*(Container is empty)/i,
            /status\s+is\s*(PALLETIZED)/i,
            /\b(PNH)\b(?=\s+container)/ // Your new PNH regex
        ];

        let reason = "";

        // Check specific elements for the reason first
        const sourceElements = ['h4', '.errorMessageHeader', '.errorMessageNextStep'];
        for (const selector of sourceElements) {
            const el = modalEl.querySelector(selector);
            if (el && el.textContent.trim()) {
                const content = el.textContent.trim();
                // Check if the content matches one of our specific error patterns
                const foundPattern = reasonPatterns.find(reg => reg.test(content));
                if (foundPattern) {
                    const match = content.match(foundPattern);
                    reason = match[1] || match[0];
                    break;
                }
                // If no specific pattern match, keep the raw text as a secondary fallback
                if (!reason) reason = content;
            }
        }

        // Final fallback: first two lines of text
        if (!reason) {
            reason = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 2).join(' — ');
        }

        // Log result
        logUnprocessedTote(toteId, reason);

        // 3. Modal Dismissal Logic
        dismissModal(modalEl);

        return { toteId, reason };
    } catch (err) {
        console.error('Error handling modal:', err);
        return { toteId: 'Unknown', reason: 'Error handling modal' };
    }
}

// Sub-function to keep logic separated
function dismissModal(modalEl) {
    if (!modalEl) return;

    // 1. Keyboard Shortcut
    try {
        const ev = new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', keyCode: 67, bubbles: true });
        document.dispatchEvent(ev);
    } catch (e) {}

    // 2. Button Click
    const btnSelectors = ['button', '.btn', '.continue', '.close', '.modal-close', '.ok', '.confirm'];
    const btn = modalEl.querySelector(btnSelectors.join(','));
    if (btn) btn.click();

    // 3. Nuclear Removal
    setTimeout(() => {
        const overlay = document.querySelector('.overlay');
        overlay?.remove();
        modalEl?.remove();
    }, 300);
}

    // --- Start script when page loads ---
    window.addEventListener('load', () => {
        // small delay to ensure page UI exists
        setTimeout(createUI, 200);
    });
})();
