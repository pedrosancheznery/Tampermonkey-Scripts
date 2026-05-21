 // ==UserScript==
// @name         Flow Activity Log
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Creates and updates a table with flow scan data.
// @author       Pedro Sanchez (pefsanch)
// @match        https://sortcenter-menu-na.amazon.com/containerization/flow
// @grant        GM_addStyle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// ==/UserScript==

(function() {
    'use strict';

    // Create a container for the table if it doesn't exist
    let tableContainer;
    let packageIDs = new Set(); // To keep track of unique Package IDs
    let statsEl;
    let statusDiv;
    let statusArea;
    let successCount = 0;
    let failCount = 0;
    let previousProcessedCount = 0;

      // Create the modal for user input
    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'inputModal';
        modal.style.position = 'fixed';
        modal.style.bottom = '30px';
        modal.style.right = '10px';
        //modal.style.transform = 'translate(-50%, -50%)';
        modal.style.padding = '15px';
        modal.style.backgroundColor = '#f9f9f9';
        modal.style.border = '1px solid #ccc';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        modal.style.width = '300px';
        modal.style.zIndex = '9999';
        //modal.style.display = 'none'; // Hidden by default

        const label = document.createElement('label');
        label.innerText = "Enter Container IDs (one per line):";
        modal.appendChild(label);

        const input = document.createElement('textarea');
        input.id = 'scannableIdsInput';
        input.style.width = '100%';
        input.style.height = '100px';
        input.placeHolder = "Enter Container IDs (one per line):";
        modal.appendChild(input);

        statsEl = document.createElement("div");
        statsEl.style = "font-size:12px;color:#888;margin-bottom:14px;";
        statsEl.innerText = `✅ ${successCount} | ❌ ${failCount} | ⛔ ${previousProcessedCount}`;
        modal.appendChild(statsEl);

        const submitButton = document.createElement('button');
        submitButton.innerText = "▶ Process";
        submitButton.style = "width: 60%; padding: 8px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold;";
        submitButton.onclick = () => {
              // 1. Get raw lines, 2. trim whitespace, 3. filter out empty lines
            const rawIds = input.value.split('\n').map(id => id.trim()).filter(id => id);
            const uniqueIds = [...new Set(rawIds)];
            resultDiv.innerText = `IDs entered: ${input.value.length} | Unique IDs: ${uniqueIds}`;


            // NEW: Replace textbox content with the cleaned, unique list
            input.value = uniqueIds.join('\n');

            statusArea.value = "Processing...\r\n";
            successCount = 0;
            failCount = 0;
            previousProcessedCount = 0;

            // FIX: Ensure table exists BEFORE processing starts
            //createPackageTable();

            //modal.style.display = 'none';
            submitScannableIDs(uniqueIds);
        };
        modal.appendChild(submitButton);

        const clearButton = document.createElement('button');
        clearButton.innerText = "Clear";
        clearButton.style = "width: 30%; padding: 8px; cursor: pointer; background: #cc0000; color: white; border: none; border-radius: 4px; font-weight: bold; margin-left: 10px";
        clearButton.onclick = () => input.value = "";
        modal.appendChild(clearButton);

        statusArea = document.createElement('textarea');
        statusArea.id = 'statusArea';
        statusArea.style.width = '100%';
        statusArea.style.height = '100px';
        statusArea.style.overflowY = "auto";
        statusArea.readOnly = true;
        statusArea.disabled = true;
        modal.appendChild(statusArea);

        // Status
        statusDiv = document.createElement('div');
        statusDiv.id = "check-status";
        statusDiv.innerText = "Ready";
        statusDiv.style = "margin-top: 8px; font-size: 12px; color: #555; font-weight: bold;";
        modal.appendChild(statusDiv);

        // Temp Result
        const resultDiv = document.createElement('div');
        resultDiv.id = "result-status";
        resultDiv.innerText = "IDs entered: 0 | Unique IDs: 0";
        resultDiv.style = "margin-top: 8px; font-size: 12px; color: #555; font-weight: bold;";
        modal.appendChild(resultDiv);

        document.body.appendChild(modal);
        return modal;
    }

    // Function to submit scannable IDs with built-in throttle
    async function submitScannableIDs(scannableIDs) {
        //console.log('Starting process for:', scannableIDs);
        let idCounter = 1;

        for (const id of scannableIDs) {
            const inputField = document.querySelector('#sd_input');
            if (!inputField) continue;

            //console.log(`Processing ID: ${id}`);
            if (statusDiv) {
              statusDiv.innerText = `Processing (${idCounter}/${scannableIDs.length}) ID: ${id}`;
            }
            inputField.focus();
            inputField.value = id;

            // Trigger events
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter', keyCode: 13, which: 13, bubbles: true
            }));
            inputField.dispatchEvent(new Event('blur', { bubbles: true }));
            inputField.blur();

            // WAIT for the site to process the scan before checking the message
            await new Promise(resolve => setTimeout(resolve, 1500));
            await checkMessage();
            idCounter++;
        }
        await new Promise( resolve => {
            statusArea.value += `Total IDs: ${scannableIDs.length}`;
            statusDiv.innerText = "Finished";
            statusDiv.style.color = "green";
            setTimeout(resolve,1000)
        })
    }


    function checkMessage() {
        return new Promise((resolve) => {
            const infoDisplay = document.getElementById('infodisplay');
            const otherDisplay = document.getElementById('infodisplay_add');
            const errorText = "The wrong barcode was scanned. Scan correct SC barcode.";
            const errorText2 = "Invalid Package";
            const otherText = "Package already scanned to Container- Place package on container and scan next package.";
            const packageIDElement = document.getElementById('pkInValue');

            if (infoDisplay && infoDisplay.offsetParent !== null && (infoDisplay.innerText.includes(errorText) || infoDisplay.innerText.includes(errorText2) ) ) {
            //if (infoDisplay && infoDisplay.innerText.includes(errorText)) {
                if (packageIDElement) {
                    statusArea.value += `❌ ${packageIDElement.innerText}\r\n`;
                    //addPackageID(packageIDElement.innerText);
                    failCount++;
                    updateStats();
                }
            } else if (otherDisplay && otherDisplay.offsetParent !== null && otherDisplay.innerText.includes(otherText)) {
                statusArea.value += `⛔ ${packageIDElement.innerText}\r\n`;
                previousProcessedCount++;
                updateStats();
            } else {
                statusArea.value += `✅ ${packageIDElement.innerText}\r\n`;
                successCount++;
                updateStats();
            }
            resolve();
        });
    }

    // Function to create and display the table
    function createPackageTable() {
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'missedTotesDiv';
            tableContainer.style.position = 'fixed';
            tableContainer.style.bottom = '30px';
            tableContainer.style.right = '341px';
            tableContainer.style.maxHeigth = '392px';
            tableContainer.style.padding = '15px';
            tableContainer.style.backgroundColor = '#f9f9f9';
            tableContainer.style.border = '1px solid #ccc';
            tableContainer.style.borderRadius = '8px';
            tableContainer.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            tableContainer.style.zIndex = '9999';
            document.body.appendChild(tableContainer);

            tableContainer.innerHTML = `
                <table style="border: 1px solid black; border-collapse: collapse; margin: 20px; background-color: #f9f9f9;">
                    <tr>
                        <th style="border: 1px solid black; padding: 50px;">Missed Totes</th>
                    </tr>
                </table>
            `;
        }
    }

    // Function to add a new Package ID to the table
    function addPackageID(packageID) {
        if (!packageIDs.has(packageID)) {
            packageIDs.add(packageID);
            const table = tableContainer.querySelector('table');
            const newRow = table.insertRow();
            const newCell = newRow.insertCell(0);
            newCell.textContent = packageID;
            newCell.style.border = "1px solid black"; // Adding border for the cell
            newCell.style.padding = "10px"; // Adding padding for the cell
            newCell.style.fontWeight = "bold"; // Making the text bold
        }
    }

        // Update Stats
    function updateStats() {
        if (statsEl) {
            statsEl.textContent = `✅ ${successCount} | ❌ ${failCount} | ⛔ ${previousProcessedCount}`;
        }
    }

    // Set an interval to check for the message
    //setInterval(checkMessage, 1000); // Check every second

    // Initialize
    //createOpenModalButton();
    createModal();

})();
