// ==UserScript==
// @name         Submit Scannable IDs in FROST
// @namespace    HOU3
// @version      1.1.9
// @author       Pedro Sanchez (pefsanch)
// @description  Read scannable IDs from user input and submit them to a form
// @match        https://frost-prod-jlb-iad.iad.proxy.amazon.com/packnhold/create
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts/
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Submit%20Scannable%20IDs%20in%20FROST.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Submit%20Scannable%20IDs%20in%20FROST.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Add CSS for the new table
    GM_addStyle(`
        #tote-log-container {
            position: fixed;
            top: 250px;
            left: 270px;
            width: 400px;
            background-color: #f9f9f9;
            border: 2px solid rgb(51, 51, 51);
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            font-family: sans-serif;
            font-size: 9px;
            padding: 10px;
			overflow-y: auto;
			max-height: 360px;
            z-index: 10000;
        }
        #tote-log-container h4 {
            margin: 0 0 10px;
            font-size: 12px;
			font-weight: bold;
            text-align: center;
        }
        #tote-error-log-table {
            width: 100%;
            border-collapse: collapse;
        }
        #tote-error-log-table th, #tote-error-log-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
			font-size: 9px;
        }
        #tote-error-log-table thead tr {
            background-color: #003399;
            color: #FFFFFF;
        }
        #tote-error-log-table tbody tr:nth-child(even) {
            background-color: #f2f2f2;
        }
    `);

    // Create the container for the new table
    function createErrorLogTable() {
        // Check if the table already exists
        if (document.getElementById('tote-error-log-table')) {
            return document.getElementById('tote-error-log-table').querySelector('tbody');
        }

        const logContainer = document.createElement('div');
        logContainer.id = 'tote-log-container';
        logContainer.innerHTML = `
            <h4>Tote Scan History</h4>
            <table id="tote-error-log-table">
                <thead>
                    <tr>
                        <th>Tote ID</th>
                        <th>Disposition</th>
                        <th>Items</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="tote-error-log-table-body">
                </tbody>
            </table>
        `;
        document.body.appendChild(logContainer);
        return document.getElementById('tote-error-log-table').querySelector('tbody');
    }

    // Function to add a new row to the table
    function addErrorLogRow(tableBody, id, disposition, itemCount, isSuccess) {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${id}</td>
            <td>${disposition}</td>
            <td>${itemCount}</td>
            <td>${isSuccess ? '✔️' : '❌'}</td>
        `;
        tableBody.prepend(newRow); // Add to the top of the table
		updateStats();
    }

    let toteLogTableBody, ErrorToteLogTableBody;
    let toteId, statsEl;
    let successCount = 0;
    let failCount = 0;
    
    // paste into a specific textarea element
    async function pasteIntoTextarea(textarea) {  
        try {    
            const text = await navigator.clipboard.readText(); // requires HTTPS and user gesture    
            textarea.value = text;  
        } catch (err) {    
            console.error('Clipboard read failed:', err);  
        }
    }
    
    // Create the modal for user input
    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'inputModal';
        modal.style.position = 'fixed';
        modal.style.top = '250px';
        modal.style.left = '10px';
        //modal.style.transform = 'translate(-50%, -50%)';
        modal.style.padding = '15px';
        modal.style.backgroundColor = '#f9f9f9';
        modal.style.border = "2px solid #333";
        modal.style.borderRadius = "8px";
        modal.style.boxShadow = '0px 4px 10px rgba(0,0,0,0.3)';
        modal.style.fontFamily = "sans-serif";
        modal.style.width = "260px";
        modal.style.zIndex = '9999';
        //modal.style.display = 'none'; // Hidden by default

        const header = document.createElement('div');
        header.innerHTML = '<b style="display:block; margin-bottom:5px;">Bulk Tote Pack And Hold</b>';
        modal.appendChild(header);

        const pasteButton = document.createElement('button');
        pasteButton.innerText = "Paste";
        pasteButton.style = "width: 100%; padding: 10px; cursor: pointer; background: #0078d4; color: white; border: none; border-radius: 4px; font-weight: bold;";
        pasteButton.onclick = () => {
            const ta = document.getElementById('scannableIdsInput');
            pasteIntoTextarea(ta);
        };
        modal.appendChild(pasteButton);

        const input = document.createElement('textarea');
        input.id = 'scannableIdsInput';
        input.fontFamily = "monospace";
        input.marginBottom = "20px";
        input.placeholder = "Enter Scannable IDs (one per line):";
        input.style.width = '100%';
        input.style.height = '150px';
        modal.appendChild(input);

        const spacer = document.createElement("div");
        spacer.style.margin = "5px";
        spacer.style.padding = "5px";
        modal.appendChild(spacer);
        
        const countEl = document.createElement("div");
        countEl.style.cssText = "font-size:12px;color:#888;margin-bottom:4px;";
        countEl.textContent = "0 / 0";
        //modal.appendChild(countEl);
    
        statsEl = document.createElement("div");
        statsEl.style.cssText = "font-size:12px;color:#888;margin-bottom:14px;";
        statsEl.textContent = "✅ 0 | ❌ 0";
        modal.appendChild(statsEl);

        modal.appendChild(spacer);

        const submitButton = document.createElement('button');
        submitButton.innerText = "▶ Process";
        submitButton.style = "width: 60%; padding: 10px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold;";
        submitButton.onclick = () => {
            // Split input by newline and trim whitespace
            const ids = input.value.split('\n').map(id => id.trim()).filter(id => id); // Clean and filter
            //modal.style.display = 'none'; // Hide modal
            submitScannableIDs(ids); // Process IDs
        };
        modal.appendChild(submitButton);

        const clearButton = document.createElement('button');
        clearButton.style = "width: 30%; padding: 10px; cursor: pointer; background: #cc0000; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px";
        clearButton.innerText = "Clear";
        clearButton.onclick = () => {
            document.getElementById("scannableIdsInput").value = ""
            document.getElementById("tote-error-log-table-body").innerHTML = ""
			successCount = 0 
			failCount = 0
			updateStats()
        }; // Clear contents
        modal.appendChild(clearButton);

        const statusBar = document.createElement("div");
        statusBar.id = "check-status";
        statusBar.style = "margin-top: 8px; font-size: 12px; color: #555; font-weight: bold;";
        statusBar.innerText = "Ready";

        modal.appendChild(statusBar);

        document.body.appendChild(modal);
        console.log("Submit Scannable IDs in FROST Script Started")
        return modal;
    }

    function updateStats() {
        if (statsEl) {
          statsEl.textContent = "✅ " + successCount + " | ❌ " + failCount;
        }
    }

    // Function to submit scannable IDs
    async function submitScannableIDs(scannableIDs) {
        const status = document.getElementById('check-status');
		const inputText = document.getElementById('scannableIdsInput');
        let i = 0;
        console.log('Retrieved scannable IDs:', scannableIDs);

        if (scannableIDs.length === 0) {
            console.log('No scannable IDs were provided.');
            return;
        }

        inputText.disabled = true;

        for (const id of scannableIDs) {
            //const toteId = id;
            status.innerText = `Processing (${i + 1}/${scannableIDs.length}): ${id}`;
            status.style.color = "blue";
            console.log(`Processing ID: ${id}`);
            document.querySelector('#scannableIds').value = id; // Set ID value
            $("#submitPnHForm").submit(); // Submit the form

            // Wait for the message to change
            const success = await waitForMessageChange(id);

            // Assuming messages from the server help determine success or failure
            const disposition = success ? "Processed" : "Stow";
            const itemCount = success ? "1" : "0"; // Assume 1 item per ID

            //addErrorLogRow(ErrorToteLogTableBody, toteId, disposition, itemCount, success);
            ++i;
        }
        status.innerText = "DONE! Batch complete.";
        status.style.color = "green";
		inputText.disabled = false;
    }

    // Function to wait for the #message div to change
    function waitForMessageChange(toteId) {
        ErrorToteLogTableBody = createErrorLogTable();
        return new Promise((resolve) => {
            const messageDiv = document.querySelector('#message');
            const errorMessage = document.querySelector('#errorMessage');
            const successMessage = document.querySelector('#successMessage');

            // Store the original message states
            const originalError = errorMessage.innerText;
            const originalSuccess = successMessage.innerText;

            // Polling interval
            const interval = setInterval(() => {
                // Check for changes in either message
                if (errorMessage.innerText !== originalError || successMessage.innerText !== originalSuccess) {
                    clearInterval(interval); // Stop polling
                    console.log('Message changed!'); // For debugging
                    if (errorMessage.innerText != '') {
						failCount++;
					    // Check for the specific "Empty list" error message
					    let disposition = "Stow"; 
					    if (errorMessage.innerText.includes("Null / Empty list of Items")) {
					        disposition = "Empty";
					    }
					
					    addErrorLogRow(ErrorToteLogTableBody, toteId, disposition, "-", 0);
					    
					    console.log(`Error Message: ${errorMessage.innerText} | Disposition: ${disposition}`);
					    resolve(
					
					false);
                    } else {
                        console.log(`Success Message: ${successMessage.innerText}`);
                        handleSuccessMessage(successMessage.innerText);
                    }
                    resolve(true); // Resolve the promise
                }
            }, 500); // Check every 500 milliseconds

            // Optional: Set a timeout to stop polling after a certain period
            setTimeout(() => {
                clearInterval(interval);
                console.log('Timeout: No change detected in the message box.');
                resolve(); // Resolve regardless of change if timeout occurs
            }, 10000); // Adjust the timeout as necessary (10 seconds in this case)
        });
    }

    function handleSuccessMessage(message) {
        const regex = /quantity of (\d+) for bins (tscage\d+|ts[A-Za-z0-9]+) for Destination(\w+)/;
        const match = message.match(regex);
        ErrorToteLogTableBody = createErrorLogTable();
        if (match) {
            const itemCount = parseInt(match[1], 10);
            const toteId = match[2];
            const disposition = match[3];
            if (!isNaN(itemCount)) {
				successCount++;
                //errorProcessed = false; // Reset error processed flag on new success message
                addErrorLogRow(ErrorToteLogTableBody, toteId, disposition, itemCount, 1);
            }
        } else {
            console.info(`No match from '${message}'`);
        }
    }

    // Initialize
    createModal();
    $("#scannableIds").focus();
})();

