// ==UserScript==
// @name         Tote Bulk Checker
// @namespace    HOU3
// @version      1.2.0
// @description  Batch check totes with API calls, display results in table, and export to CSV
// @author       Pedro Sanchez (pefsanch)
// @match        https://wd-repair-portal-na.aka.amazon.com/resources/ReCommerceFCWebToolsUI/html/listTote.html
// @match        https://vret-list-tote.na.aft.amazonoperations.app/resources/ReCommerceFCWebToolsUI/html/listTote.html
// @grant        GM_xmlhttpRequest
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Tote%20Bulk%20Checker.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Tote%20Bulk%20Checker.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let checkResults = [];

    const colors = {
        panel: '#1e1e1e',
        panelBorder: '#444',
        input: '#2b2b2b',
        text: '#f1f1f1',
        muted: '#b8b8b8',
        tableHeader: '#333',
        tableBorder: '#555',
        success: '#4ade80',
        error: '#f87171',
        info: '#60a5fa'
    };

    // 1. Create the UI
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed; bottom: 50px; left: 10px; z-index: 9999;
        background: ${colors.panel}; color: ${colors.text}; padding: 15px;
        border: 2px solid ${colors.panelBorder}; border-radius: 8px;
        box-shadow: 0px 4px 10px rgba(0,0,0,0.6); width: 320px;
        font-family: sans-serif; max-height: 80vh; overflow-y: auto;
    `;

    container.innerHTML = `
        <b style="display:block; margin-bottom:8px;">Bulk Tote Checker</b>
        <label for="api-endpoint-select" style="display:block; margin-bottom:4px; font-size:12px; color:${colors.muted};">Bulk Check API</label>
        <select id="api-endpoint-select" style="box-sizing:border-box; width:100%; margin-bottom:10px; padding:8px; background:${colors.input}; color:${colors.text}; border:1px solid ${colors.tableBorder}; border-radius:4px;">
            <option value="https://vret-list-tote.na.aft.amazonoperations.app/api/v1/list-tote/">VRET List Tote API</option>
            <option value="https://wd-repair-portal-na.aka.amazon.com/api/v1/list-tote/">WD Repair Portal API</option>
        </select>
        <textarea id="bulk-tote-input" rows="8" placeholder="Paste IDs here..."
            style="box-sizing:border-box; width:100%; margin-bottom:10px; padding:8px; font-family:monospace; background:${colors.input}; color:${colors.text}; border:1px solid ${colors.tableBorder}; border-radius:4px;"></textarea>
        <button id="run-check-btn" style="width:100%; padding:10px; cursor:pointer; background:#15803d; color:white; border:none; border-radius:4px; font-weight:bold; margin-bottom:5px;">
            CHECK NOW
        </button>
        <button id="run-api-check-btn" style="width:100%; padding:10px; cursor:pointer; background:#2563eb; color:white; border:none; border-radius:4px; font-weight:bold; margin-bottom:5px;">
            BULK CHECK (API)
        </button>
        <button id="clear-contents" style="width:100%; padding:10px; cursor:pointer; background:#b91c1c; color:white; border:none; border-radius:4px; font-weight:bold; margin-bottom:5px;">
            Clear Contents
        </button>
        <button id="export-csv-btn" style="width:100%; padding:10px; cursor:pointer; background:#7c3aed; color:white; border:none; border-radius:4px; font-weight:bold; margin-bottom:5px; display:none;">
            Export to CSV
        </button>
        <div id="check-status" style="margin-top:8px; font-size:12px; color:${colors.muted}; font-weight:bold;">Ready.</div>
        <div id="results-table-container" style="margin-top:10px; display:none; overflow-x:auto;">
            <table id="results-table" style="width:100%; border-collapse:collapse; font-size:11px; color:${colors.text};">
                <thead>
                    <tr style="background:${colors.tableHeader};">
                        <th style="border:1px solid ${colors.tableBorder}; padding:4px;">Tote ID</th>
                        <th style="border:1px solid ${colors.tableBorder}; padding:4px;">Destination</th>
                        <th style="border:1px solid ${colors.tableBorder}; padding:4px;">Units</th>
                        <th style="border:1px solid ${colors.tableBorder}; padding:4px;">Status</th>
                    </tr>
                </thead>
                <tbody id="results-tbody"></tbody>
            </table>
        </div>
    `;

    document.body.appendChild(container);

    const getLines = () => document.getElementById('bulk-tote-input').value
        .split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    const setStatus = (message, color = colors.muted) => {
        const status = document.getElementById('check-status');
        status.innerText = message;
        status.style.color = color;
    };

    // 2. Original UI-based processing logic
    document.getElementById('run-check-btn').addEventListener('click', async () => {
        const mainInput = document.querySelector('#tote-id-input-textfield');
        if (!mainInput) {
            alert("Error: Input field '#tote-id-input-textfield' not found.");
            return;
        }

        const lines = getLines();
        if (lines.length === 0) {
            setStatus('Error: No IDs entered.', colors.error);
            return;
        }

        for (let i = 0; i < lines.length; i++) {
            const currentID = lines[i];
            setStatus(`Checking (${i + 1}/${lines.length}): ${currentID}`, colors.info);
            mainInput.focus();
            mainInput.value = currentID;
            mainInput.dispatchEvent(new Event('input', { bubbles: true }));
            mainInput.dispatchEvent(new Event('change', { bubbles: true }));

            const eventOptions = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
            mainInput.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
            mainInput.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
            mainInput.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setStatus('DONE! Batch complete.', colors.success);
    });

    // 3. API-based bulk check. The endpoint is selected in the API dropdown.
    document.getElementById('run-api-check-btn').addEventListener('click', async () => {
        const lines = getLines();
        const tableContainer = document.getElementById('results-table-container');
        const tbody = document.getElementById('results-tbody');
        const exportBtn = document.getElementById('export-csv-btn');
        const apiBaseUrl = document.getElementById('api-endpoint-select').value;

        if (lines.length === 0) {
            setStatus('Error: No IDs entered.', colors.error);
            return;
        }

        checkResults = [];
        tbody.innerHTML = '';
        tableContainer.style.display = 'none';
        exportBtn.style.display = 'none';
        setStatus('Starting API checks...', colors.info);

        for (let i = 0; i < lines.length; i++) {
            const toteID = lines[i];
            setStatus(`Checking (${i + 1}/${lines.length}): ${toteID}`, colors.info);

            try {
                const response = await fetch(`${apiBaseUrl}${encodeURIComponent(toteID)}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const data = await response.json();
                const summary = data && data.toteReloSummary;
                const result = {
                    toteID,
                    destination: summary?.destination || 'N/A',
                    units: summary?.itemCount ?? 'N/A',
                    status: 'Success'
                };
                checkResults.push(result);
                appendResultRow(tbody, result, false);
            } catch (error) {
                console.error(`Error checking tote ${toteID}:`, error);
                const result = { toteID, destination: 'Error', units: 'Error', status: 'Failed' };
                checkResults.push(result);
                appendResultRow(tbody, result, true);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        tableContainer.style.display = 'block';
        exportBtn.style.display = 'block';
        setStatus(`DONE! Checked ${lines.length} totes. Results displayed below.`, colors.success);
    });

    function appendResultRow(tbody, result, failed) {
        const row = document.createElement('tr');
        [result.toteID, result.destination, result.units].forEach(value => {
            const cell = document.createElement('td');
            cell.style.cssText = `border:1px solid ${colors.tableBorder}; padding:4px;${failed ? ` color:${colors.error};` : ''}`;
            cell.textContent = value;
            row.appendChild(cell);
        });
        const statusCell = document.createElement('td');
        statusCell.style.cssText = `border:1px solid ${colors.tableBorder}; padding:4px; color:${failed ? colors.error : colors.success};`;
        statusCell.textContent = `${failed ? '✗' : '✓'} ${result.status}`;
        row.appendChild(statusCell);
        tbody.appendChild(row);
    }

    // 4. Export to CSV functionality
    document.getElementById('export-csv-btn').addEventListener('click', () => {
        if (checkResults.length === 0) {
            alert('No results to export.');
            return;
        }

        const escapeCsv = value => `"${String(value).replace(/"/g, '""')}"`;
        const csvContent = [
            'Tote ID,Destination,Units,Status',
            ...checkResults.map(result => [result.toteID, result.destination, result.units, result.status].map(escapeCsv).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `tote-check-results-${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    });

    // 5. Clear contents
    document.getElementById('clear-contents').addEventListener('click', () => {
        document.getElementById('bulk-tote-input').value = '';
    });
})();
