// ==UserScript==
// @name         Bind Auto Continue (headless)
// @namespace    HOU3
// @version      1.0.4
// @description  Headless: wait for bind confirmation modal, hit 'C' via window.aft.scan, wait for it to dismiss, loop.
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

(function () {
    'use strict';

    // Text used to detect the confirmation modal. Adjust if the app text changes.
    const CONFIRM_PHRASE = 'Are you sure you want to bind everything to';

    // Short helper
    function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

    // Wait until a confirmation modal appears. Resolves true when found.
    function waitForConfirmationModal(timeoutMs = 0) {
        return new Promise((resolve) => {
            let resolved = false;

            function check() {
                const msg = document.querySelector('.modal-message');
                if (msg) {
                    const txt = (msg.innerText || '').trim();
                    if (txt.includes(CONFIRM_PHRASE)) return true;
                }
                return false;
            }

            if (check()) {
                resolve(true);
                return;
            }

            const observer = new MutationObserver(() => {
                if (!resolved && check()) {
                    resolved = true;
                    observer.disconnect();
                    resolve(true);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true, characterData: true });

            if (timeoutMs > 0) {
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        observer.disconnect();
                        resolve(false);
                    }
                }, timeoutMs);
            }
        });
    }

    // Wait for the modal ('.modal-message') to be removed/hidden. Resolves true when gone.
    function waitForModalGone(timeoutMs = 10000) {
        return new Promise((resolve) => {
            let resolved = false;

            function isGone() {
                const msg = document.querySelector('.modal-message');
                if (!msg) return true;
                // If element exists but not visible
                if (msg.offsetParent === null && !msg.getClientRects().length) return true;
                return false;
            }

            if (isGone()) {
                resolve(true);
                return;
            }

            const observer = new MutationObserver(() => {
                if (!resolved && isGone()) {
                    resolved = true;
                    observer.disconnect();
                    resolve(true);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

            if (timeoutMs > 0) {
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        observer.disconnect();
                        resolve(false);
                    }
                }, timeoutMs);
            }
        });
    }

    // Press 'C' using window.aft.scan and retry for a short window if aft isn't ready yet.
    // This intentionally prefers aft.scan only (per user request).
    async function sendConfirm() {
        const MAX_WAIT = 3000; // ms
        const INTERVAL = 100; // ms
        const start = Date.now();

        while (true) {
            try {
                if (window.aft && typeof window.aft.scan === 'function') {
                    try {
                        window.aft.scan('C');
                        console.info('Bind Auto Continue: called window.aft.scan("C")');
                        return true;
                    } catch (inner) {
                        console.warn('Bind Auto Continue: window.aft.scan threw', inner);
                        return false;
                    }
                }
            } catch (e) {
                // ignore and retry
            }

            if (Date.now() - start >= MAX_WAIT) break;
            // wait and retry
            // eslint-disable-next-line no-await-in-loop
            await sleep(INTERVAL);
        }

        console.warn('Bind Auto Continue: window.aft.scan not available after waiting', { waitedMs: Date.now() - start });
        return false;
    }

    // Main loop: wait for confirmation -> confirm -> wait for modal to disappear -> repeat
    async function mainLoop() {
        // small initial delay to allow page to stabilize
        await sleep(200);

        while (true) {
            const saw = await waitForConfirmationModal(0); // no timeout: wait indefinitely
            if (!saw) {
                // shouldn't happen when timeout=0, but safeguard
                await sleep(500);
                continue;
            }

            // send confirm via window.aft.scan (with retries)
            await sendConfirm();

            // wait for modal to go away (or timeout)
            await waitForModalGone(10000);

            // small pause before next listen to avoid tight-looping
            await sleep(200);
        }
    }

    // Start after load
    window.addEventListener('load', () => {
        setTimeout(() => {
            mainLoop().catch((err) => console.error('Bind Auto Continue error:', err));
        }, 150);
    });
})();
