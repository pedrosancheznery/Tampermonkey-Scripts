// ==UserScript==
// @name         Bind Automation Tool
// @namespace    HOU3
// @version      1.0.2
// @description  Automate binding by processing a list of IDs via the Bind tool logic; logs unprocessed totes and continues on error modals
// @author       Pedro Sanchez (pefsanch)
// @match        https://tx-b-hierarchy-iad.iad.proxy.amazon.com/bindHierarchy
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Bind%20Automation%20Tool.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Bind%20Automation%20Tool.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let statsEl;
    let successCount = 0;
    let failCount = 0;
    let toteId = "";

    // --- UI creation ---
    function createUI() {
        // Container
        const container = document.createElement('div');
        container.id = 'tm-pnp-automation';
        container.style = "position: fixed; bottom: 50px; left: 10px; z-index: 9999; background: white; border: 2px solid #232f3e; padding: 10px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 300px; font-family: Arial, sans-serif; font-size: 13px;";

        // IDs textarea
        const label1 = document.createElement('label');
        label1.innerText = "Paste IDs (One per line):";
        label1.style = "display: block; font-weight: bold; margin-bottom: 5px;";
        const textarea = document.createElement('textarea');
        textarea.id = "pnp-batch-input";
        textarea.style = "width: 100%; height: 120px; margin-bottom: 10px; font-family: monospace; box-sizing: border-box; padding:6px;";
        textarea.placeholder = "TOTE123\nPKG456...";

        // Delay controls
        const delayWrapper = document.createElement('div');
        delayWrapper.style = "display:flex;gap:8px;align-items:center;margin-bottom:8px;";
        const delayCheckbox = document.createElement('input');

        delayCheckbox.type = 'checkbox';
        delayCheckbox.id = 'delay-enable-checkbox';
        delayCheckbox.title = 'Enable delay between items';
        const delayLabel = document.createElement('label');

        delayLabel.htmlFor = 'delay-enable-checkbox';
        delayLabel.innerText = 'Delay (s):';
        delayLabel.style = "font-weight: bold;";

        const delaySecondsInput = document.createElement('input');
        delaySecondsInput.type = 'number';
        delaySecondsInput.id = 'delay-seconds-input';
        delaySecondsInput.min = '0';
        delaySecondsInput.value = '1';
        delaySecondsInput.style = "width: 60px; padding:4px; box-sizing:border-box;";
        delayWrapper.appendChild(delayCheckbox);
        delayWrapper.appendChild(delayLabel);
        delayWrapper.appendChild(delaySecondsInput);

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
        unprocessedDiv.style = "background:white;border:2px solid rgb(35, 47, 62);border-radius:4px;box-shadow:rgba(0, 0, 0, 0.1) 0px 4px 6px;font-family:Arial, sans-serif;font-size:13px;height:465px;position:fixed;bottom:50px;left:310px;margin-top:10px;overflow-y:auto;font-weight:bold;width:300px;display:none;";
        const unprocessedHeading = document.createElement('div');
        unprocessedHeading.id = "unprocessed-heading";
        unprocessedHeading.innerText = "Unprocessed Totes";
        //unprocessedHeading.style = "margin-top:10px;font-weight:bold;";
        const unprocessedTableDiv = document.createElement('div');
        unprocessedTableDiv.id = "unprocessed-table-div";
        //unprocessedTableDiv.style = "max-height: 250px; overflow-y: auto";
        const unprocessedTable = document.createElement('table');
        unprocessedTable.id = "unprocessed-totes-table";
        unprocessedTable.style = "width:100%;border-collapse:collapse;margin-top:6px;font-size:12px;border:1px solid #ddd;";
        unprocessedTable.innerHTML = '<thead><tr><th style="border:1px solid #ddd;padding:4px;text-align:left">Tote</th><th style="border:1px solid #ddd;padding:4px;text-align:left">Reason</th></tr></thead><tbody></tbody>';

        // Append elements
        container.appendChild(delayWrapper);
        container.appendChild(label1);
        container.appendChild(textarea);
        container.appendChild(statsEl);
        container.appendChild(btn);
        container.appendChild(statusDiv);
        unprocessedTableDiv.appendChild(unprocessedTable);
        unprocessedHeading.appendChild(unprocessedTableDiv);
        unprocessedDiv.appendChild(unprocessedHeading);
        document.body.appendChild(unprocessedDiv);
        document.body.appendChild(container);

        // Wire button click
        btn.addEventListener('click', async () => {
            await handleProcessClick(textarea, statusDiv);
        });

        // Start observing for error modals
        //startErrorObserver();
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
    async function handleProcessClick(textarea, statusDiv) {
        const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const status = statusDiv;
        const table = document.getElementById('unprocessed-totes-table');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        const delayEnabledEl = document.getElementById('delay-enable-checkbox');
        const delayEnabled = !!(delayEnabledEl && delayEnabledEl.checked);
        const raw = document.getElementById('delay-seconds-input')?.value;
        const parsed = Number(raw);
        const delaySeconds = Number.isFinite(parsed) && parsed > 0 ? Math.max(0, Math.floor(parsed)) : 0;

        let i = 0;
        tbody.innerHTML = '';
        textarea.disabled = true;
        failCount = 0;
        successCount = 0;

        if (lines.length === 0) return alert("Please enter at least one ID.");

        for (const id of lines) {
            i += 1;
            console.log(`[Bind Automation] Processing: ${id}`);

            // Start processing
            window.aft.scan && window.aft.scan(id);
            status.innerText = `Checking (${i}/${lines.length}): ${id}`;
            status.style.color = "blue";
            toteId = id;

            // Wait for either success or error modal
            //const result = await Promise.race([
                //waitForSuccessMessage(),
                //waitForErrorModal()
            //]);
            const result = await waitForSuccessMessage();
            //console.info('[Bind Automation] Result: ', result);

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

            // Otherwise proceed
            if (result && result.type === 'success') {
                window.aft.scan('C');
                //window.aft && window.aft(paxValue);
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
                        status.innerText = `No to try (${i}/${lines.length}): ${postResult.toteId || ''}`;
                        status.style.color = "orange";
                        failCount++;
                        updateStats();
                        await new Promise(r => setTimeout(r, 600));
                        continue;
                    }
                    successCount++;
                    updateStats();

                    // Non-vendor-mix errors fall through to default skip behavior
                    status.innerText = `PAX failed (${i}/${lines.length}): ${postResult.toteId || ''}`;
                    status.style.color = "orange";
                    await new Promise(r => setTimeout(r, 600));
                    continue;
                }
            }

            // Optional delay between items
            await new Promise(r => setTimeout(r, 500));

            // Apply configured delay between items if enabled
            if (delayEnabled && delaySeconds > 0) {
				      console.log(`Delaying ${delaySeconds} seconds`);
              await new Promise(r => setTimeout(r, delaySeconds * 1000));
            }
        }

        textarea.disabled = false;
        textarea.value = "";
        status.innerText = `Finished! Processed ${lines.length} items`;
        status.style.color = "green";
    }

    // --- wait for success message ---
    function waitForSuccessMessage(timeoutMs = 8000) {
        console.log("[Bind Automation] waitForSuccessMessage");
        return new Promise((resolve) => {
            let resolved = false;
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    const successStep = document.querySelector('#binding-summary-container');
                    const msg = document.querySelector(".modal-message");
                    // Check if .binding-summary-container is visible
                    if (successStep && successStep.offsetParent !== null) {
                        console.log("[Bind Automation] Found binding-summary-container element!", successStep);
                        if (msg && msg.innerText.includes("Current bindings for")) {
                            console.log("[Bind Automation] Found binding-summary-container element!");
                            if (!resolved) {
                                // Fallback: if no <ul> but message has "Current bindings for", still resolve
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
        console.log("[Bind Automation] waitForPalletizeCompleteMessage");
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
        console.log('[Bind Automation] waitForErrorModal');
        return new Promise((resolve) => {
            setTimeout( () => {
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
            }, 1000);
        });
    }

    // Helper: locate error modal element
    function findErrorModal() {
        // Common selectors used in example
        console.log('[Bind Automation] findErrorModal');
        return document.querySelector('#diversion-awaiting-scan-container') || null;
        //return document.getElementById('errorModal') || document.querySelector('.modal-instruction.recoverable') || document.querySelector('.customModal.customContainer.errorModal') || null;
    }

    // Helper: extract info and dismiss modal
    function handleErrorModal(modalEl) {
        console.log('[Bind Automation] handleErrorModal')
        try {
            const text = modalEl?.textContent || "";

            // 1. Improved Tote ID Extraction
            // Priorities: 1. ts-style IDs, 2. "tote [id]", 3. Fallback
            //const toteMatch = text.match(/\b(ts[A-Za-z0-9]+)\b/i) ||
                              text.match(/\btote\s+([A-Za-z0-9-]+)\b/i);
            //const toteId = toteMatch ? toteMatch[1] : 'Unknown';

            // 2. Reason Extraction - Extract full error message from .modal-message
            let reason = "";
            const modalMessageEl = modalEl.querySelector('.modal-message');
                //console.log('[Bind Automation] modalMessageEl :', modalMessageEl.textContent);
            if (modalMessageEl) {
                // Get the text content and clean it up
                const rawText = modalMessageEl.textContent.trim();
                //console.log('[Bind Automation] rawText :', rawText);
                // Extract the first line which contains Item, units, and Error
                const errorLine = rawText.split('\n')[0].trim();
                //console.log('[Bind Automation] errorLine :', errorLine);
                reason = errorLine || rawText;
                //console.log('[Bind Automation] Extracted reason:', reason);
            }

            // Fallback: first two lines of text
            //if (!reason) {
                //reason = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 2).join(' — ');
            //}

            // Log result
            logUnprocessedTote(toteId, reason);

            // 3. Modal Dismissal Logic
            dismissModal(modalEl);

            return { toteId, reason };
        } catch (err) {
            console.error('[Bind Automation] Error handling modal:', err);
            return { toteId: 'Unknown', reason: 'Error handling modal' };
        }
    }

    // Sub-function to keep logic separated
    function dismissModal(modalEl) {
        console.log('[Bind Automation] dismissModal');
        if (!modalEl) return;

        // 1. Keyboard Shortcut
        try {
            const ev = new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', keyCode: 67, bubbles: true });
            document.dispatchEvent(ev);
        } catch (e) {}

        // 2. Button Click
        setTimeout(() => {
          window.aft.scan("b");
        }, 1000);

        // 3. Nuclear Removal
        //setTimeout(() => {
            //const overlay = document.querySelector('.overlay');
            //overlay?.remove();
            //modalEl?.remove();
        //}, 300);
    }

    // --- Start script when page loads ---
    window.addEventListener('load', () => {
        // small delay to ensure page UI exists
        setTimeout(createUI, 150);
    });
})();
