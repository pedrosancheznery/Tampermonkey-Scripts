// ==UserScript==
// @name         Bind Auto Continue (headless) + A-to-switch + Config
// @namespace    HOU3
// @version      1.0.8
// @description  Headless: wait for bind confirmation modal, allow pressing 'A' to switch destinations (even before modal), otherwise hit 'C' via window.aft.scan, wait for it to dismiss, loop. Adds configurable wait and pause option (UI + hotkey P).
// @author       Pedro Sanchez (pefsanch) (modified)
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

    // LocalStorage keys for persistence
    const LS_KEY_WAIT = 'bindAuto_wait_ms';
    const LS_KEY_PAUSED = 'bindAuto_paused';
    const LS_KEY_PRE_SWITCH = 'bindAuto_preSwitch_ms';

    // Default values
    const DEFAULT_WAIT_MS = 800;
    const DEFAULT_PRE_SWITCH_MS = 2000; // how long a prior 'A' press should be considered recent

    // Track last user-initiated A press time
    let lastUserSwitchAt = 0;

    // Short helper
    function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

    // Configuration helpers
    function getConfig() {
        const wait = parseInt(localStorage.getItem(LS_KEY_WAIT), 10);
        const paused = localStorage.getItem(LS_KEY_PAUSED) === '1';
        const preSwitch = parseInt(localStorage.getItem(LS_KEY_PRE_SWITCH), 10);
        return {
            waitMs: Number.isFinite(wait) && wait > 0 ? wait : DEFAULT_WAIT_MS,
            paused: !!paused,
            preSwitchMs: Number.isFinite(preSwitch) && preSwitch > 0 ? preSwitch : DEFAULT_PRE_SWITCH_MS,
        };
    }

    function setConfig({ waitMs, paused, preSwitchMs }) {
        if (typeof waitMs === 'number' && Number.isFinite(waitMs) && waitMs > 0) {
            localStorage.setItem(LS_KEY_WAIT, String(Math.max(50, Math.round(waitMs))));
        }
        if (typeof paused === 'boolean') {
            localStorage.setItem(LS_KEY_PAUSED, paused ? '1' : '0');
        }
        if (typeof preSwitchMs === 'number' && Number.isFinite(preSwitchMs) && preSwitchMs > 0) {
            localStorage.setItem(LS_KEY_PRE_SWITCH, String(Math.max(100, Math.round(preSwitchMs))));
        }
        updateControlUI();
    }

    // Create a small control UI (bottom-right) to adjust wait and pause/resume
    function createControlUI() {
        if (document.getElementById('bind-auto-control')) return; // already created

        const wrapper = document.createElement('div');
        wrapper.id = 'bind-auto-control';
        wrapper.style.position = 'fixed';
        wrapper.style.right = '12px';
        wrapper.style.bottom = '12px';
        wrapper.style.zIndex = 1_000_000; // high
        wrapper.style.background = 'rgba(30,30,30,0.9)';
        wrapper.style.color = '#fff';
        wrapper.style.padding = '8px 10px';
        wrapper.style.borderRadius = '6px';
        wrapper.style.fontFamily = 'sans-serif';
        wrapper.style.fontSize = '12px';
        wrapper.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
        wrapper.style.minWidth = '220px';

        wrapper.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <strong style="font-size:12px">Bind Auto</strong>
                <span id="bind-auto-version" style="opacity:0.8;font-size:11px">v1.0.8</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <label for="bind-auto-wait" style="font-size:11px;opacity:0.9;min-width:60px;">Wait (ms)</label>
                <input id="bind-auto-wait" type="number" min="50" step="50" style="flex:1;padding:4px;border-radius:4px;border:1px solid #444;background:#222;color:#fff;font-size:12px;" />
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <label for="bind-auto-preswitch" style="font-size:11px;opacity:0.9;min-width:60px;">A-window (ms)</label>
                <input id="bind-auto-preswitch" type="number" min="100" step="100" style="flex:1;padding:4px;border-radius:4px;border:1px solid #444;background:#222;color:#fff;font-size:12px;" />
            </div>
            <div style="display:flex;gap:6px;align-items:center;justify-content:space-between;">
                <button id="bind-auto-toggle" style="flex:1;padding:6px;border-radius:4px;border:0;background:#1a73e8;color:white;cursor:pointer;">Pause</button>
                <button id="bind-auto-reset" title="Reset to defaults" style="margin-left:6px;padding:6px;border-radius:4px;border:0;background:#333;color:#ddd;cursor:pointer;">Reset</button>
            </div>
            <div id="bind-auto-hint" style="margin-top:6px;font-size:11px;opacity:0.8">Hotkey: <strong>P</strong> pause/resume • Press <strong>A</strong> to switch destination (can be pressed before modal)</div>
        `;

        document.body.appendChild(wrapper);

        // Wire up controls
        const waitInput = document.getElementById('bind-auto-wait');
        const preSwitchInput = document.getElementById('bind-auto-preswitch');
        const toggleBtn = document.getElementById('bind-auto-toggle');
        const resetBtn = document.getElementById('bind-auto-reset');

        waitInput.addEventListener('change', () => {
            const v = parseInt(waitInput.value, 10);
            if (Number.isFinite(v) && v >= 50) {
                setConfig({ waitMs: v });
            } else {
                // restore to current config
                updateControlUI();
            }
        });

        preSwitchInput.addEventListener('change', () => {
            const v = parseInt(preSwitchInput.value, 10);
            if (Number.isFinite(v) && v >= 100) {
                setConfig({ preSwitchMs: v });
            } else {
                updateControlUI();
            }
        });

        toggleBtn.addEventListener('click', () => {
            const cfg = getConfig();
            setConfig({ paused: !cfg.paused });
        });

        resetBtn.addEventListener('click', () => {
            localStorage.removeItem(LS_KEY_WAIT);
            localStorage.removeItem(LS_KEY_PAUSED);
            localStorage.removeItem(LS_KEY_PRE_SWITCH);
            updateControlUI();
        });

        updateControlUI();
    }

    function updateControlUI() {
        const cfg = getConfig();
        const waitInput = document.getElementById('bind-auto-wait');
        const preSwitchInput = document.getElementById('bind-auto-preswitch');
        const toggleBtn = document.getElementById('bind-auto-toggle');
        if (waitInput) waitInput.value = String(cfg.waitMs);
        if (preSwitchInput) preSwitchInput.value = String(cfg.preSwitchMs);
        if (toggleBtn) {
            toggleBtn.textContent = cfg.paused ? 'Resume' : 'Pause';
            toggleBtn.style.background = cfg.paused ? '#0f9d58' : '#1a73e8';
        }
    }

    // Wait until a confirmation modal appears. Resolves true when found.
    function waitForConfirmationModal(timeoutMs = 0) {
        return new Promise((resolve) => {
            let resolved = false;

            function check() {
                const msg = document.querySelector('.modal-instruction');
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

    // When a confirmation modal appears, give the user a short window to press 'A' to switch destinations.
    // If 'A' is pressed during the window we call window.aft.scan('A') and skip auto-confirm for that modal.
    async function waitForUserSwitchOrConfirm(waitMs) {
        let aPressed = false;

        function onKey(e) {
            try {
                const key = (e.key || '').toLowerCase();
                if (key === 'a') {
                    // Attempt to switch destination
                    aPressed = true;
                    lastUserSwitchAt = Date.now();
                    if (window.aft && typeof window.aft.scan === 'function') {
                        try {
                            window.aft.scan('A');
                            console.info('Bind Auto Continue: called window.aft.scan("A") due to user keypress');
                        } catch (err) {
                            console.warn('Bind Auto Continue: window.aft.scan("A") threw', err);
                        }
                    } else {
                        console.warn('Bind Auto Continue: window.aft.scan not available to handle "A" press');
                    }
                    // Let the modal update; we keep listening only for this modal event instance.
                }
            } catch (err) {
                // swallow
            }
        }

        // Listen only while the modal is present.
        window.addEventListener('keydown', onKey, false);
        await sleep(waitMs);
        window.removeEventListener('keydown', onKey, false);

        return aPressed;
    }

    // Global A listener so pressing A before the modal will switch destinations and be honored
    function setupGlobalAListener() {
        window.addEventListener('keydown', (e) => {
            try {
                const key = (e.key || '').toLowerCase();
                if (key === 'a') {
                    lastUserSwitchAt = Date.now();
                    if (window.aft && typeof window.aft.scan === 'function') {
                        try {
                            window.aft.scan('A');
                            console.info('Bind Auto Continue: global A -> window.aft.scan("A")');
                        } catch (err) {
                            console.warn('Bind Auto Continue: window.aft.scan("A") threw', err);
                        }
                    } else {
                        console.warn('Bind Auto Continue: global A pressed but window.aft.scan not available');
                    }
                }
            } catch (err) {
                // ignore
            }
        }, false);
    }

    // Hotkey: P to toggle pause/resume at any time
    function setupHotkeys() {
        window.addEventListener('keydown', (e) => {
            try {
                const key = (e.key || '').toLowerCase();
                if (key === 'p') {
                    const cfg = getConfig();
                    setConfig({ paused: !cfg.paused });
                }
            } catch (err) {
                // ignore
            }
        }, false);
    }

    // Main loop: wait for confirmation -> give user time to press 'A' -> confirm if no 'A' -> wait for modal to disappear -> repeat
    async function mainLoop() {
        // small initial delay to allow page to stabilize
        await sleep(200);

        while (true) {
            const cfg = getConfig();

            // If paused, sleep and re-check
            if (cfg.paused) {
                // sleep a bit so we don't busy-loop
                // eslint-disable-next-line no-await-in-loop
                await sleep(500);
                continue;
            }

            const saw = await waitForConfirmationModal(0); // no timeout: wait indefinitely
            if (!saw) {
                // shouldn't happen when timeout=0, but safeguard
                await sleep(500);
                continue;
            }

            // re-check pause in case user paused while modal appeared
            if (getConfig().paused) {
                console.info('Bind Auto Continue: paused while modal present; skipping auto-confirm until resumed');
                // Wait until unpaused or modal goes away
                while (getConfig().paused) {
                    // If modal disappears while paused, break out
                    const gone = await waitForModalGone(500);
                    if (gone) break;
                    await sleep(300);
                }
                // continue to top
                continue;
            }

            // read current wait value (configurable)
            const waitMs = cfg.waitMs;

            // If the user pressed A shortly before the modal appeared, treat that as a manual switch
            const preSwitchWindow = cfg.preSwitchMs;
            const recentlySwitched = lastUserSwitchAt && (Date.now() - lastUserSwitchAt) <= preSwitchWindow;
            if (recentlySwitched) {
                console.info('Bind Auto Continue: recent A press detected before modal; skipping auto-confirm for this modal');
            }

            // give user a short chance to press 'A' to switch destinations if not already done recently
            let userSwitched = recentlySwitched;
            if (!userSwitched) {
                userSwitched = await waitForUserSwitchOrConfirm(waitMs);
            }

            if (!userSwitched) {
                // no 'A' detected, send confirm via window.aft.scan (with retries)
                await sendConfirm();
            } else {
                // user pressed 'A' — we won't auto-send 'C' for this modal instance.
                console.info('Bind Auto Continue: user switched destination; skipping auto-confirm for this modal');
            }

            // wait for modal to go away (or timeout)
            await waitForModalGone(10000);

            // small pause before next listen to avoid tight-looping
            await sleep(200);
        }
    }

    // Start after load
    window.addEventListener('load', () => {
        setTimeout(() => {
            try {
                createControlUI();
                setupHotkeys();
                setupGlobalAListener();
            } catch (err) {
                // ignore UI errors
                console.error('Bind Auto Continue UI init error:', err);
            }

            mainLoop().catch((err) => console.error('Bind Auto Continue error:', err));
        }, 150);
    });
})();
