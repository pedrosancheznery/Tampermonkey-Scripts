// ==UserScript==
// @name         Bind Auto Continue
// @namespace    HOU3
// @version      1.0.2
// @description  Automate binding by processing a list of IDs via the Bind tool logic; logs unprocessed totes and continues on error modals
// @author       Pedro Sanchez (pefsanch)
// @match        https://tx-b-hierarchy-iad.iad.proxy.amazon.com/bindHierarchy
// @match        https://tx-b-hierarchy.na.aftx.amazonoperations.app/bindHierarchy
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Bind%20Auto%20Continue.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Bind%20Auto%20Continue.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let statsEl;
    let successCount = 0;
    let failCount = 0;

    function output(txt, extra) {
        console.log(`%c%s`, "font-weight:bold;color:light-blue;font-size: 12px;", txt, extra);
    }

    // --- UI creation ---
    function createUI() {
        const container = document.createElement('div');
        container.id = 'tm-pnp-automation';
        container.style = "position: fixed; bottom: 50px; left: 10px; z-index: 9999; background: white; border: 2px solid #232f3e; padding: 10px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";

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

        // Unprocessed Totes
        const unprocessedDiv = document.createElement('div');
        unprocessedDiv.id = "unprocessed-div";
        unprocessedDiv.style = "position:fixed;top:50px;right:10px;background:white;border:2px solid rgb(35, 47, 62);border-radius:4px;box-shadow:rgba(0, 0, 0, 0.1) 0px 4px 6px;font-family:Arial, sans-serif;font-size:13px;width:400px;max-height:500px;padding:10px;z-index:9998;display:none;overflow-y:auto;";
        
        const unprocessedHeading = document.createElement('div');
        unprocessedHeading.id = "unprocessed-heading";
        unprocessedHeading.innerText = "Unprocessed Totes";
        unprocessedHeading.style = "font-weight:bold;margin-bottom:10px;";
        
        const unprocessedTable = document.createElement('table');
        unprocessedTable.id = "unprocessed-totes-table";
        unprocessedTable.style = "width:100%;border-collapse:collapse;font-size:12px;border:1px solid #ddd;";
        unprocessedTable.innerHTML = '<thead><tr><th style="border:1px solid #ddd;padding:4px;text-align:left;background:#f5f5f5;">Tote</th><th style="border:1px solid #ddd;padding:4px;text-align:left;background:#f5f5f5;">Reason</th></tr></thead><tbody></tbody>';

        unprocessedDiv.appendChild(unprocessedHeading);
        unprocessedDiv.appendChild(unprocessedTable);

        // Append elements
        container.appendChild(delayWrapper);
        container.appendChild(label1);
        container.appendChild(textarea);
        container.appendChild(statsEl);
        container.appendChild(btn);
        container.appendChild(statusDiv);
        
        document.body.appendChild(unprocessedDiv);
        document.body.appendChild(container);

        // Wire button click
        btn.addEventListener('click', async () => {
            await handleProcessClick(textarea, statusDiv);
        });
    }

    // --- Utility: log unprocessed tote ---
    function logUnprocessedTote(toteId, reason) {
        const table = document.getElementById('unprocessed-totes-table');
        const unprocessedDiv = document.getElementById('unprocessed-div');
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
        const originalLines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const lines = [...new Set(originalLines)];
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
            output(`[Bind Automation] Processing: ${id}`);

            // Start scanning the ID
            window.aft.scan && window.aft.scan(id);
            statusDiv.innerText = `Checking (${i}/${lines.length}): ${id}`;
            statusDiv.style.color = "blue";

            // Wait for success message
            const result = await waitForSuccessMessage();

            if (result && result.type === 'error') {
                statusDiv.innerText = `Error (${i}/${lines.length}): ${id}`;
                statusDiv.style.color = "orange";
                failCount++;
                updateStats();
                await sleep(600);
                continue;
            }

            if (result && result.type === 'success') {
                // Wait for confirmation modal
                const confirmResult = await waitForConfirmationModal();
                
                if (confirmResult && confirmResult.type === 'confirmed') {
                    // Hit 'C' to confirm
                    window.aft.scan('C');
                    
                    // Wait for completion or error
                    const completionResult = await waitForPalletizeCompleteMessage();
                    
                    if (completionResult && completionResult.type === 'success') {
                        statusDiv.innerText = `Success (${i}/${lines.length}): ${id}`;
                        statusDiv.style.color = "green";
                        successCount++;
                        updateStats();
                    } else if (completionResult && completionResult.type === 'error') {
                        const reasonText = (completionResult.reason || '').toString().toLowerCase();
                        
                        const isVendorMix = reasonText.includes('mix_of_vendor_code') ||
                                            reasonText.includes('mix of vendor') ||
                                            reasonText.includes('vendor code mismatch') ||
                                            reasonText.includes('mix of different vendor');
                        
                        if (isVendorMix) {
                            statusDiv.innerText = `Vendor Mix (${i}/${lines.length}): ${id}`;
                            logUnprocessedTote(id, reasonText);
                        } else {
                            statusDiv.innerText = `Completion Error (${i}/${lines.length}): ${id}`;
                            logUnprocessedTote(id, reasonText);
                        }
                        failCount++;
                        updateStats();
                    }
                }
            }

            await sleep(500);

            // Apply configured delay between items if enabled
            if (delayEnabled && delaySeconds > 0) {
                output(`[Bind Automation] Delaying ${delaySeconds} seconds`);
                await sleep(delaySeconds * 1000);
            }
        }

        textarea.disabled = false;
        textarea.value = "";
        statusDiv.innerText = `Finished! Processed ${lines.length} items`;
        statusDiv.style.color = "green";
    }

    // --- Wait for success message (binding summary) ---
    function waitForSuccessMessage(timeoutMs = 8000) {
        output("[Bind Automation] Waiting for success message");
        return new Promise((resolve) => {
            let resolved = false;

            function check() {
                const successStep = document.querySelector('#binding-summary-container');
                const msg = document.querySelector(".modal-message");
                
                if (successStep && successStep.offsetParent !== null && msg) {
                    const msgText = msg.innerText || "";
                    if (msgText.includes("Current bindings for")) {
                        if (!resolved) {
                            resolved = true;
                            observer.disconnect();
                            clearTimeout(timeout);
                            resolve({ type: 'success' });
                        }
                        return true;
                    }
                }
                return false;
            }

            if (check()) return;

            const observer = new MutationObserver(() => {
                if (!resolved && check()) {
                    resolved = true;
                    observer.disconnect();
                    clearTimeout(timeout);
                    resolve({ type: 'success' });
                }
            });

            observer.observe(document.body, { childList: true, subtree: true, characterData: true });

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    resolve({ type: 'timeout' });
                }
            }, timeoutMs);
        });
    }

    // --- Wait for confirmation modal ---
    function waitForConfirmationModal(timeoutMs = 5000) {
        output("[Bind Automation] Waiting for confirmation modal");
        return new Promise((resolve) => {
            let resolved = false;

            function check() {
                const msg = document.querySelector(".modal-message");
                if (msg) {
                    const msgText = msg.innerText || "";
                    if (msgText.includes("Are you sure you want to bind everything to")) {
                        if (!resolved) {
                            resolved = true;
                            observer.disconnect();
                            clearTimeout(timeout);
                            resolve({ type: 'confirmed' });
                        }
                        return true;
                    }
                }
                return false;
            }

            if (check()) return;

            const observer = new MutationObserver(() => {
                if (!resolved && check()) {
                    resolved = true;
                    observer.disconnect();
                    clearTimeout(timeout);
                    resolve({ type: 'confirmed' });
                }
            });

            observer.observe(document.body, { childList: true, subtree: true, characterData: true });

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    resolve({ type: 'timeout' });
                }
            }, timeoutMs);
        });
    }

    // --- Wait for palletize complete message ---
    function waitForPalletizeCompleteMessage(timeoutMs = 8000) {
        const phrase = 'Successfully bound';
        output("[Bind Automation] Waiting for completion message");
        
        return new Promise((resolve) => {
            let resolved = false;

            function check() {
                const parent = document.querySelector('.success-step') || document.querySelector('.step-container.view.complete');
                if (parent && parent.textContent && parent.textContent.includes(phrase)) return true;
                if (document.body && document.body.innerText && document.body.innerText.includes(phrase)) return true;
                return false;
            }

            if (check() && !resolved) {
                resolved = true;
                return resolve({ type: 'success' });
            }

            const observer = new MutationObserver(() => {
                if (check() && !resolved) {
                    resolved = true;
                    observer.disconnect();
                    clearInterval(poll);
                    clearTimeout(timeout);
                    resolve({ type: 'success' });
                }
            });

            observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

            const poll = setInterval(() => {
                if (check() && !resolved) {
                    resolved = true;
                    observer.disconnect();
                    clearInterval(poll);
                    clearTimeout(timeout);
                    resolve({ type: 'success' });
                }
            }, 120);

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    clearInterval(poll);
                    resolve({ type: 'timeout' });
                }
            }, timeoutMs);
        });
    }

    // --- Wait for error modal ---
    function waitForErrorModal(timeoutMs = 5000) {
        output('[Bind Automation] Waiting for error modal');
        return new Promise((resolve) => {
            let resolved = false;

            function checkError() {
                const modal = document.querySelector('#diversion-awaiting-scan-container');
                return !!(modal && (modal.offsetWidth || modal.offsetHeight || modal.getClientRects().length));
            }

            const existing = checkError();
            if (existing) {
                const info = handleErrorModal();
                resolved = true;
                return resolve({ type: 'error', toteId: info.toteId, reason: info.reason });
            }

            const observer = new MutationObserver(() => {
                if (!resolved && checkError()) {
                    const info = handleErrorModal();
                    resolved = true;
                    observer.disconnect();
                    clearTimeout(timeout);
                    resolve({ type: 'error', toteId: info.toteId, reason: info.reason });
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    resolve(null);
                }
            }, timeoutMs);
        });
    }

    // --- Handle error modal ---
    function handleErrorModal() {
        output('[Bind Automation] Handling error modal');
        
        try {
            let reason = "";
            const modalEl = document.querySelector('#diversion-awaiting-scan-container');
            
            if (modalEl) {
                const modalMessageEl = modalEl.querySelector('.modal-message');
                if (modalMessageEl) {
                    const errorReason = modalMessageEl.textContent;
                    const rawText = errorReason.trim();
                    const errorLine = rawText.split('\n')[0].trim();
                    reason = errorLine || rawText;
                    output('[Bind Automation] Error reason:', reason);
                    logUnprocessedTote('Unknown', reason);
                }
            }

            dismissErrorModal();
            return { toteId: 'Unknown', reason };
        } catch (err) {
            console.error('[Bind Automation] Error handling modal:', err);
            return { toteId: 'Unknown', reason: 'Error handling modal' };
        }
    }

    // --- Dismiss error modal ---
    function dismissErrorModal() {
        output('[Bind Automation] Dismissing error modal');
        
        try {
            const ev = new KeyboardEvent('keydown', { key: 'b', code: 'KeyB', keyCode: 66, bubbles: true });
            document.dispatchEvent(ev);
        } catch (e) {}

        setTimeout(() => {
            window.aft.scan("b");
        }, 500);
    }

    // --- Update Stats ---
    function updateStats() {
        if (statsEl) {
            statsEl.textContent = "✅ " + successCount + " | ❌ " + failCount;
        }
    }

    // --- Sleep helper ---
    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // --- Initialize on page load ---
    window.addEventListener('load', () => {
        setTimeout(createUI, 150);
    });
})();
