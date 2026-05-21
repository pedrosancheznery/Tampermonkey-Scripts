// ==UserScript==
// @name         Submit Scannable IDs in FROST
// @namespace    HOU3
// @version      1.1.20
// @author       Pedro Sanchez (pefsanch)
// @description  Read scannable IDs from user input and submit them to a form
// @match        https://frost-prod-jlb-iad.iad.proxy.amazon.com/packnhold/create
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts/
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Submit%20Scannable%20IDs%20in%20FROST.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Submit%20Scannable%20IDs%20in%20FROST.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Add CSS for the new table
    GM_addStyle(`
        #tote-log-container {
            position: fixed;
            bottom: 95px;
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
            <h4>Tote History</h4>
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

    // Function to copy textarea content to clipboard
    async function copyToClipboard(textarea) {
        try {
            await navigator.clipboard.writeText(textarea.value);
            console.log('Copied to clipboard');
        } catch (err) {
            console.error('Clipboard write failed:', err);
        }
    }

    // Function to fetch scannable IDs from container hierarchy
    async function fetchScannableIdsFromContainer(containerId) {
        const status = document.getElementById('check-status');
        status.innerText = `Fetching data for container: ${containerId}`;
        status.style.color = "blue";

        return new Promise((resolve) => {
            GM.xmlHttpRequest({
                method: "POST",
                url: "https://qi-fcresearch-na.corp.amazon.com/HOU3/results/container-hierarchy",
                data: `s=${containerId}`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                onload: function(response) {
                    try {
                        const parser = new DOMParser();
                        const htmlDoc = parser.parseFromString(response.responseText, "text/html");

                        // Find the table with child containers
                        const table = htmlDoc.querySelector('#table-container-hierarchy');
                        if (!table) {
                            console.error('Could not find container hierarchy table');
                            status.innerText = "Error: Table not found";
                            status.style.color = "red";
                            resolve([]);
                            return;
                        }

                        // Extract scannable IDs where quantity > 0
                        const scannableIds = [];
                        const rows = table.querySelectorAll('tbody tr');

                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 3) {
                                const scannableId = cells[0].textContent.trim();
                                const quantity = parseInt(cells[2].textContent.trim(), 10);

                                if (quantity > 0) {
                                    scannableIds.push(scannableId);
                                    console.log(`Found: ${scannableId} (Qty: ${quantity})`);
                                }
                            }
                        });

                        console.log('Extracted scannable IDs:', scannableIds);

                        // Fill the textarea with the scannable IDs
                        const textarea = document.getElementById('scannableIdsInput');
                        if (textarea) {
                            textarea.value = scannableIds.join('\n');
                            // Copy to clipboard
                            copyToClipboard(textarea);
                            status.innerText = `✅ Loaded ${scannableIds.length} IDs (copied to clipboard)`;
                            status.style.color = "green";
                        }

                        resolve(scannableIds);
                        submitScannableIDs(scannableIds); // Process IDs
                    } catch (error) {
                        console.error('Error parsing response:', error);
                        status.innerText = "Error parsing response";
                        status.style.color = "red";
                        resolve([]);
                    }
                },
                onerror: function(error) {
                    console.error('API request failed:', error);
                    status.innerText = "Error: API request failed";
                    status.style.color = "red";
                    resolve([]);
                }
            });
        });
    }

    // Create the modal for user input
    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'inputModal';
        modal.style.position = 'fixed';
        modal.style.bottom = '95px';
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
        header.innerHTML = '<b style="display:block; margin-bottom:5px;">Tote Pack And Hold</b>';
        modal.appendChild(header);

        const containerInputLabel = document.createElement('div');
        containerInputLabel.style = "font-size: 10px; margin-bottom: 2px; font-weight: bold;";
        containerInputLabel.innerText = "Container ID:";
        modal.appendChild(containerInputLabel);

        const containerInput = document.createElement('input');
        containerInput.id = 'containerIdInput';
        containerInput.type = 'text';
        containerInput.placeholder = "e.g., paXPBT2JQYZ";
        containerInput.style.width = '100%';
        containerInput.style.padding = '6px';
        containerInput.style.marginBottom = '8px';
        containerInput.style.boxSizing = 'border-box';
        modal.appendChild(containerInput);

        const containerButton = document.createElement('button');
        containerButton.innerText = "Container";
        containerButton.style = "width: 100%; padding: 10px; cursor: pointer; background: #9c27b0; color: white; border: none; border-radius: 4px; font-weight: bold; margin-bottom: 8px;";
        containerButton.onclick = async () => {
            const containerInput = document.getElementById('containerIdInput');
            if (!containerInput.value.trim()) {
                alert('Please enter a container ID');
                return;
            }
            clearContents();
            await fetchScannableIdsFromContainer(containerInput.value.trim());
        };
        modal.appendChild(containerButton);

        const input = document.createElement('textarea');
        input.id = 'scannableIdsInput';
        input.fontFamily = "monospace";
        input.marginBottom = "20px";
        input.placeholder = "Enter Scannable IDs (one per line):";
        input.style.width = '100%';
        input.style.height = '120px';
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
        submitButton.style = "width: 60%; padding: 8px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold;";
        submitButton.onclick = () => {
            // Split input by newline and trim whitespace
            const ids = input.value.split('\n').map(id => id.trim()).filter(id => id); // Clean and filter
            //modal.style.display = 'none'; // Hide modal
            submitScannableIDs(ids); // Process IDs
        };
        modal.appendChild(submitButton);

        const clearButton = document.createElement('button');
        clearButton.style = "width: 30%; padding: 8px; cursor: pointer; background: #cc0000; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px";
        clearButton.innerText = "Clear";
        clearButton.onclick = () => {
            clearContents();
        }; // Clear contents
        modal.appendChild(clearButton);

        const statusBar = document.createElement("div");
        statusBar.id = "check-status";
        statusBar.style = "margin-top: 8px; font-size: 13px; color: #555; font-weight: bold;";
        statusBar.innerText = "Ready";

        modal.appendChild(statusBar);

        document.body.appendChild(modal);
        console.log("Submit Scannable IDs in FROST Script Started")
        return modal;
    }

    function clearContents() {
        document.getElementById("scannableIdsInput").value = "";
        document.getElementById("tote-error-log-table-body").innerHTML = "";
        successCount = 0 ;
        failCount = 0;
        updateStats();
        const logContainer = document.getElementById('tote-log-container');
        logContainer.style.display = 'none';
        return true;
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
		const logContainer = document.getElementById('tote-log-container');
        let i = 0;
        console.log('Retrieved scannable IDs:', scannableIDs);

        if (scannableIDs.length === 0) {
            console.log('No scannable IDs were provided.');
            return;
        }

        inputText.disabled = true;
        if (logContainer) {
            logContainer.style.display = 'block';
        }

        for (const id of scannableIDs) {
            //const toteId = id;
            status.innerText = `Processing (${i + 1}/${scannableIDs.length}): ${id}`;
            status.style.color = "blue";
            //console.log(`Processing ID: ${id}`);
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
            }, 600); // Check every 600 milliseconds

            // Optional: Set a timeout to stop polling after a certain period
            setTimeout(() => {
                clearInterval(interval);
                console.log('Timeout: No change detected in the message box.');
                resolve(); // Resolve regardless of change if timeout occurs
            }, 10000); // Adjust the timeout as necessary (10 seconds in this case)
        });
    }

    function handleSuccessMessage(message) {
        const regex = /quantity of (\d+) for bins (tscage\d+|ts[A-Za-z0-9]+) for Destination (\w+)/;
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
