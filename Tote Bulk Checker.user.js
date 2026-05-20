// ==UserScript==
// @name         Tote Bulk Checker
// @namespace    HOU3
// @version      1.1.1
// @description  Batch check totes with API calls, display results in table, and export to CSV
// @author       Pedro Sanchez (pefsanch)
// @match        https://wd-repair-portal-na.aka.amazon.com/resources/ReCommerceFCWebToolsUI/html/listTote.html
// @grant        GM_xmlhttpRequest
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Tote%20Bulk%20Checker.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Tote%20Bulk%20Checker.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Store results globally
    let checkResults = [];

    // 1. Create the UI
    const container = document.createElement('div');
    container.style = `
        position: fixed; bottom: 50px; left: 10px; z-index: 9999;
        background: #f9f9f9; padding: 15px; border: 2px solid #333;
        border-radius: 8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.3);
        width: 320px; font-family: sans-serif; max-height: 80vh; overflow-y: auto;
    `;

    container.innerHTML = `
        <b style="display:block; margin-bottom:5px;">Bulk Tote Checker</b>
        <textarea id="bulk-tote-input" rows="8" placeholder="Paste IDs here..."
            style="width: 100%; margin-bottom: 10px; font-family: monospace;"></textarea>
        <button id="run-check-btn" style="width: 100%; padding: 10px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold; margin-bottom: 5px;">
            CHECK NOW
        </button>
        <button id="run-api-check-btn" style="width: 100%; padding: 10px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; font-weight: bold; margin-bottom: 5px;">
            BULK CHECK (API)
        </button>
        <button id='clear-contents' style="width: 100%; padding: 10px; cursor: pointer; background: #cc0000; color: white; border: none; border-radius: 4px; font-weight: bold; margin-bottom: 5px;">
            Clear Contents
        </button>
        <button id='export-csv-btn' style="width: 100%; padding: 10px; cursor: pointer; background: #6f42c1; color: white; border: none; border-radius: 4px; font-weight: bold; margin-bottom: 5px; display: none;">
            Export to CSV
        </button>
        <div id="check-status" style="margin-top: 8px; font-size: 12px; color: #555; font-weight: bold;">Ready.</div>
        <div id="results-table-container" style="margin-top: 10px; display: none; overflow-x: auto;">
            <table id="results-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="background: #ddd;">
                        <th style="border: 1px solid #999; padding: 4px;">Tote ID</th>
                        <th style="border: 1px solid #999; padding: 4px;">Destination</th>
                        <th style="border: 1px solid #999; padding: 4px;">Units</th>
                        <th style="border: 1px solid #999; padding: 4px;">Status</th>
                    </tr>
                </thead>
                <tbody id="results-tbody"></tbody>
            </table>
        </div>
    `;

    document.body.appendChild(container);

    // 2. The original Processing Logic (CHECK NOW button)
    document.getElementById('run-check-btn').addEventListener('click', async () => {
        const textArea = document.getElementById('bulk-tote-input');
        const status = document.getElementById('check-status');
        const mainInput = document.querySelector('#tote-id-input-textfield');

        if (!mainInput) {
            alert("Error: Input field '#tote-id-input-textfield' not found.");
            return;
        }

        // Define 'lines' here so it is accessible in the loop
        const lines = textArea.value.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) {
            status.innerText = "Error: No IDs entered.";
            return;
        }

        for (let i = 0; i < lines.length; i++) {
            const currentID = lines[i];
            status.innerText = `Checking (${i + 1}/${lines.length}): ${currentID}`;
            status.style.color = "blue";

            // Focus and set value
            mainInput.focus();
            mainInput.value = currentID;

            // Trigger UI updates
            mainInput.dispatchEvent(new Event('input', { bubbles: true }));
            mainInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Simulate the full Enter key sequence (Down, Press, Up)
            // This is the "aggressive" fix to make the site recognize the submission
            const eventOptions = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
            mainInput.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
            mainInput.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
            mainInput.dispatchEvent(new KeyboardEvent('keyup', eventOptions));

            // WAIT: Adjust this time (in milliseconds) if the site is slow
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        status.innerText = "DONE! Batch complete.";
        status.style.color = "green";
    });

    // 3. New API-based Bulk Check Logic
    document.getElementById('run-api-check-btn').addEventListener('click', async () => {
        const textArea = document.getElementById('bulk-tote-input');
        const status = document.getElementById('check-status');
        const tableContainer = document.getElementById('results-table-container');
        const tbody = document.getElementById('results-tbody');
        const exportBtn = document.getElementById('export-csv-btn');

        const lines = textArea.value.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) {
            status.innerText = "Error: No IDs entered.";
            status.style.color = "red";
            return;
        }

        // Clear previous results
        checkResults = [];
        tbody.innerHTML = '';
        tableContainer.style.display = 'none';
        exportBtn.style.display = 'none';

        status.innerText = `Starting API checks...`;
        status.style.color = "blue";

        for (let i = 0; i < lines.length; i++) {
            const toteID = lines[i];
            status.innerText = `Checking (${i + 1}/${lines.length}): ${toteID}`;

            try {
                const response = await fetch(`https://wd-repair-portal-na.aka.amazon.com/api/v1/list-tote/${toteID}`);
                const data = await response.json();

                let destination = 'N/A';
                let units = 'N/A';
                let statusMsg = 'Success';

                // Parse from toteReloSummary object
                if (data && data.toteReloSummary) {
                    const summary = data.toteReloSummary;
                    destination = summary.destination || 'N/A';
                    units = summary.itemCount || 'N/A';
                }

                checkResults.push({
                    toteID: toteID,
                    destination: destination,
                    units: units,
                    status: statusMsg
                });

                // Add row to table
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="border: 1px solid #ccc; padding: 4px;">${toteID}</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${destination}</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${units}</td>
                    <td style="border: 1px solid #ccc; padding: 4px; color: green;">✓ ${statusMsg}</td>
                `;
                tbody.appendChild(row);

            } catch (error) {
                console.error(`Error checking tote ${toteID}:`, error);

                checkResults.push({
                    toteID: toteID,
                    destination: 'Error',
                    units: 'Error',
                    status: 'Failed'
                });

                // Add error row to table
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="border: 1px solid #ccc; padding: 4px;">${toteID}</td>
                    <td style="border: 1px solid #ccc; padding: 4px; color: red;">Error</td>
                    <td style="border: 1px solid #ccc; padding: 4px; color: red;">Error</td>
                    <td style="border: 1px solid #ccc; padding: 4px; color: red;">✗ Failed</td>
                `;
                tbody.appendChild(row);
            }

            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Show results table and export button
        tableContainer.style.display = 'block';
        exportBtn.style.display = 'block';

        status.innerText = `DONE! Checked ${lines.length} totes. Results displayed below.`;
        status.style.color = "green";
    });

    // 4. Export to CSV functionality
    document.getElementById('export-csv-btn').addEventListener('click', () => {
        if (checkResults.length === 0) {
            alert('No results to export.');
            return;
        }

        // Create CSV content
        let csvContent = 'Tote ID,Destination,Units,Status\n';
        checkResults.forEach(result => {
            const row = `"${result.toteID}","${result.destination}","${result.units}","${result.status}"`;
            csvContent += row + '\n';
        });

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `tote-check-results-${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // 5. Clear Contents button
    document.getElementById('clear-contents').addEventListener('click', async() => {
        const myList = document.getElementById('bulk-tote-input');
        myList.value = '';
    });
})();
