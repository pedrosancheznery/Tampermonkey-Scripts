// ==UserScript==
// @name         Submit Scannable IDs in FROST
// @namespace    HOU3
// @version      1.1.24
// @author       Pedro Sanchez (pefsanch)
// @description  Read scannable IDs from user input and submit them to a form
// @match        https://frost-prod-jlb-iad.iad.proxy.amazon.com/packnhold/create
// @match        https://frost-prod.na.aftx.amazonoperations.app/packnhold/create
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @connect      qifcr.na.aftx.amazonoperations.app
// @connect      qi-fcresearch-na.corp.amazon.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts/
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Submit%20Scannable%20IDs%20in%20FROST.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Submit%20Scannable%20IDs%20in%20FROST.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const API_ENDPOINTS = [
        'https://qifcr.na.aftx.amazonoperations.app/HOU3/results/container-hierarchy',
        'https://qi-fcresearch-na.corp.amazon.com/HOU3/results/container-hierarchy'
    ];
    let selectedApiUrl = API_ENDPOINTS[0];

    GM_addStyle(`
        #tote-log-container, #inputModal {
            color: #e6edf3 !important;
            background-color: #161b22 !important;
            border-color: #484f58 !important;
            box-shadow: 0 4px 12px rgba(0,0,0,.65) !important;
        }
        #tote-log-container { position: fixed; bottom: 95px; left: 270px; width: 400px;
            border: 2px solid #484f58; border-radius: 8px; font-family: sans-serif;
            font-size: 9px; padding: 10px; overflow-y: auto; max-height: 360px; z-index: 10000; }
        #tote-log-container h4 { margin: 0 0 10px; font-size: 12px; font-weight: bold; text-align: center; }
        #tote-error-log-table { width: 100%; border-collapse: collapse; }
        #tote-error-log-table th, #tote-error-log-table td { border: 1px solid #30363d;
            padding: 8px; text-align: left; font-size: 9px; }
        #tote-error-log-table thead tr { background-color: #21262d; color: #58a6ff; }
        #tote-error-log-table tbody tr:nth-child(even) { background-color: #1c2128; }
        #tote-error-log-table tbody tr:nth-child(odd) { background-color: #161b22; }
        .api-url-selector { margin-bottom: 8px; font-size: 10px; }
        .api-url-selector label { display: flex; align-items: center; margin-bottom: 4px; cursor: pointer; }
        .api-url-selector input[type="radio"] { margin-right: 6px; cursor: pointer; }
        #inputModal { position: fixed; bottom: 95px; left: 10px; padding: 15px; width: 260px;
            border: 2px solid #484f58; border-radius: 8px; font-family: sans-serif; z-index: 9999; }
        #inputModal input, #inputModal textarea { color: #e6edf3 !important; background: #0d1117 !important;
            border: 1px solid #484f58 !important; }
        #inputModal input::placeholder, #inputModal textarea::placeholder { color: #8b949e !important; }
        #inputModal button { color: #fff !important; border: 1px solid #484f58 !important; }
        #inputModal button:first-of-type { background: #8957e5 !important; }
        #inputModal button:nth-last-of-type(2) { background: #238636 !important; }
        #inputModal button:last-of-type { background: #da3633 !important; }
        #check-status { color: #8b949e !important; }
    `);

    function createErrorLogTable() {
        const existing = document.getElementById('tote-error-log-table');
        if (existing) return existing.querySelector('tbody');
        const logContainer = document.createElement('div');
        logContainer.id = 'tote-log-container';
        logContainer.innerHTML = `<h4>Tote History</h4><table id="tote-error-log-table">
            <thead><tr><th>Tote ID</th><th>Disposition</th><th>Items</th><th>Status</th></tr></thead>
            <tbody id="tote-error-log-table-body"></tbody></table>`;
        document.body.appendChild(logContainer);
        return logContainer.querySelector('tbody');
    }

    function addErrorLogRow(tableBody, id, disposition, itemCount, isSuccess) {
        const row = document.createElement('tr');
        [id, disposition, itemCount, isSuccess ? '✔️' : '❌'].forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        tableBody.prepend(row);
        updateStats();
    }

    let ErrorToteLogTableBody, statsEl;
    let successCount = 0, failCount = 0;

    function setStatus(message, color = '#8b949e') {
        const status = document.getElementById('check-status');
        if (status) { status.textContent = message; status.style.color = color; }
    }

    function isAllowedEndpoint(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' && API_ENDPOINTS.includes(parsed.href);
        } catch (error) {
            return false;
        }
    }

    function getEndpointFailureReason(response, htmlDoc) {
        const text = `${htmlDoc.title || ''} ${htmlDoc.body ? htmlDoc.body.innerText : ''}`.toLowerCase();

        if (/single sign[- ]?on|sign in|log in|login|authenticate|sso/.test(text)) {
            return 'SSO/login required for this user or endpoint.';
        }
        if (/access denied|unauthorized|forbidden|not authorized|permission/.test(text)) {
            return 'Access denied. Check user permissions, VPN, and SSO.';
        }
        if (/proxy|gateway|temporarily unavailable|service unavailable|timeout|network/.test(text)) {
            return 'Network/proxy issue. Verify VPN, proxy, or endpoint reachability.';
        }
        if (response.status === 401) {
            return '401 Unauthorized. User is not authenticated for this HOU3 endpoint.';
        }
        if (response.status === 403) {
            return '403 Forbidden. Check user access and endpoint permissions.';
        }
        if (response.status < 200 || response.status >= 300) {
            return `Endpoint returned HTTP ${response.status}.`;
        }
        return 'The endpoint returned an unexpected page. Verify the site, user access, and endpoint.';
    }

    async function copyToClipboard(textarea) {
        try { await navigator.clipboard.writeText(textarea.value); }
        catch (error) { console.error('Clipboard write failed:', error); }
    }

    function fetchScannableIdsFromContainer(containerId) {
        setStatus(`Fetching data for container: ${containerId}`, '#58a6ff');
        if (!isAllowedEndpoint(selectedApiUrl)) {
            setStatus('Error: Blocked endpoint configuration. This script only supports the HOU3 hierarchy endpoints.', '#f85149');
            console.error('Blocked endpoint:', selectedApiUrl);
            return Promise.resolve([]);
        }

        return new Promise(resolve => {
            GM.xmlHttpRequest({
                method: 'POST', url: selectedApiUrl, data: `s=${encodeURIComponent(containerId)}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000,
                onload: response => {
                    try {
                        const parser = new DOMParser();
                        const htmlDoc = parser.parseFromString(response.responseText, 'text/html');
                        const table = htmlDoc.querySelector('#table-container-hierarchy');
                        if (response.status < 200 || response.status >= 300 || !table) {
                            const reason = getEndpointFailureReason(response, htmlDoc);
                            console.error('Hierarchy table missing:', {
                                status: response.status,
                                finalUrl: response.finalUrl || response.responseURL,
                                title: htmlDoc.title,
                                reason,
                                bodyPreview: htmlDoc.body ? htmlDoc.body.innerText.slice(0, 500) : ''
                            });
                            setStatus(`Error: ${reason}`, '#f85149');
                            resolve([]);
                            return;
                        }

                        const scannableIds = [];
                        table.querySelectorAll('tbody tr').forEach(row => {
                            const cells = row.querySelectorAll('td');
                            const quantity = parseInt(cells[2]?.textContent.trim(), 10);
                            if (cells.length >= 3 && quantity > 0) scannableIds.push(cells[0].textContent.trim());
                        });
                        const textarea = document.getElementById('scannableIdsInput');
                        if (textarea) {
                            textarea.value = scannableIds.join('\n');
                            copyToClipboard(textarea);
                        }
                        setStatus(`✅ Loaded ${scannableIds.length} IDs (copied to clipboard)`, '#3fb950');
                        resolve(scannableIds);
                        submitScannableIDs(scannableIds);
                    } catch (error) {
                        console.error('Error parsing response:', error);
                        setStatus('Error parsing endpoint response.', '#f85149');
                        resolve([]);
                    }
                },
                onerror: error => {
                    console.error('API request failed:', error);
                    setStatus('Error: API request failed. Check endpoint access, SSO, or VPN.', '#f85149');
                    resolve([]);
                },
                ontimeout: () => {
                    setStatus('Error: Endpoint request timed out. Check network access.', '#f85149');
                    resolve([]);
                }
            });
        });
    }

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'inputModal';
        modal.innerHTML = `<b style="display:block;margin-bottom:5px;">Tote Pack And Hold</b>
            <div style="font-size:10px;margin-bottom:2px;font-weight:bold;">Container ID:</div>`;
        const containerInput = document.createElement('input');
        containerInput.id = 'containerIdInput'; containerInput.type = 'text'; containerInput.placeholder = 'e.g., paXPBT2JQYZ';
        Object.assign(containerInput.style, { width: '100%', padding: '6px', marginBottom: '8px', boxSizing: 'border-box' });
        modal.appendChild(containerInput);

        const selector = document.createElement('div'); selector.className = 'api-url-selector';
        selector.innerHTML = '<div style="font-size:10px;margin-bottom:4px;font-weight:bold;">API Endpoint:</div>';
        API_ENDPOINTS.forEach((url, index) => {
            const label = document.createElement('label'); const radio = document.createElement('input');
            radio.type = 'radio'; radio.name = 'apiUrl'; radio.value = url; radio.checked = index === 0;
            radio.onchange = () => { if (radio.checked) selectedApiUrl = radio.value; };
            label.append(radio, document.createTextNode(new URL(url).hostname)); selector.appendChild(label);
        });
        modal.appendChild(selector);

        const containerButton = document.createElement('button'); containerButton.textContent = 'Container';
        containerButton.style.cssText = 'width:100%;padding:10px;cursor:pointer;background:#8957e5;color:white;border:none;border-radius:4px;font-weight:bold;margin-bottom:8px;';
        containerButton.onclick = async () => {
            if (!containerInput.value.trim()) { alert('Please enter a container ID'); return; }
            clearContents(); await fetchScannableIdsFromContainer(containerInput.value.trim());
        }; modal.appendChild(containerButton);

        const input = document.createElement('textarea'); input.id = 'scannableIdsInput'; input.placeholder = 'Enter Scannable IDs (one per line):';
        input.style.cssText = 'width:100%;height:120px;box-sizing:border-box;'; modal.appendChild(input);
        statsEl = document.createElement('div'); statsEl.style.cssText = 'font-size:12px;color:#8b949e;margin:14px 0;';
        statsEl.textContent = '✅ 0 | ❌ 0'; modal.appendChild(statsEl);

        const submitButton = document.createElement('button'); submitButton.textContent = '▶ Process';
        submitButton.style.cssText = 'width:60%;padding:8px;cursor:pointer;background:#238636;color:white;border:none;border-radius:4px;font-weight:bold;';
        submitButton.onclick = () => submitScannableIDs(input.value.split('\n').map(id => id.trim()).filter(Boolean)); modal.appendChild(submitButton);
        const clearButton = document.createElement('button'); clearButton.textContent = 'Clear';
        clearButton.style.cssText = 'width:30%;padding:8px;cursor:pointer;background:#da3633;color:white;border:none;border-radius:4px;font-weight:bold;margin-left:10px;';
        clearButton.onclick = clearContents; modal.appendChild(clearButton);

        const statusBar = document.createElement('div'); statusBar.id = 'check-status'; statusBar.textContent = 'Ready';
        statusBar.style.cssText = 'margin-top:8px;font-size:13px;color:#8b949e;font-weight:bold;'; modal.appendChild(statusBar);
        document.body.appendChild(modal);
    }

    function clearContents() {
        const containerInput = document.getElementById('containerIdInput'); if (containerInput) containerInput.value = '';
        const scannableInput = document.getElementById('scannableIdsInput'); if (scannableInput) scannableInput.value = '';
        const body = document.getElementById('tote-error-log-table-body'); if (body) body.innerHTML = '';
        successCount = 0; failCount = 0; updateStats();
        const log = document.getElementById('tote-log-container'); if (log) log.style.display = 'none';
    }

    function updateStats() { if (statsEl) statsEl.textContent = `✅ ${successCount} | ❌ ${failCount}`; }

    async function submitScannableIDs(scannableIDs) {
        const inputText = document.getElementById('scannableIdsInput'); const log = document.getElementById('tote-log-container');
        if (!scannableIDs.length) return; inputText.disabled = true; if (log) log.style.display = 'block';
        let i = 0;
        for (const id of scannableIDs) {
            setStatus(`Processing (${i + 1}/${scannableIDs.length}): ${id}`, '#58a6ff');
            document.querySelector('#scannableIds').value = id; $('#submitPnHForm').submit();
            await waitForMessageChange(id); i++;
        }
        setStatus('DONE! Batch complete.', '#3fb950'); inputText.disabled = false;
    }

    function waitForMessageChange(toteId) {
        ErrorToteLogTableBody = createErrorLogTable();
        return new Promise(resolve => {
            const errorMessage = document.querySelector('#errorMessage'); const successMessage = document.querySelector('#successMessage');
            const originalError = errorMessage.innerText, originalSuccess = successMessage.innerText;
            const interval = setInterval(() => {
                if (errorMessage.innerText !== originalError || successMessage.innerText !== originalSuccess) {
                    clearInterval(interval);
                    if (errorMessage.innerText) {
                        failCount++; const disposition = errorMessage.innerText.includes('Null / Empty list of Items') ? 'Empty' : 'Stow';
                        addErrorLogRow(ErrorToteLogTableBody, toteId, disposition, '-', false); resolve(false);
                    } else { handleSuccessMessage(successMessage.innerText); resolve(true); }
                }
            }, 600);
            setTimeout(() => { clearInterval(interval); resolve(false); }, 10000);
        });
    }

    function handleSuccessMessage(message) {
        const match = message.match(/quantity of (\d+) for bins (tscage\d+|ts[A-Za-z0-9]+) for Destination (\w+)/);
        ErrorToteLogTableBody = createErrorLogTable();
        if (match && !isNaN(parseInt(match[1], 10))) {
            successCount++; addErrorLogRow(ErrorToteLogTableBody, match[2], match[3], parseInt(match[1], 10), true);
        } else console.info(`No match from '${message}'`);
    }

    createModal();
    $('#scannableIds').focus();
})();
