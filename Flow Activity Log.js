// ==UserScript==
// @name         Flow Activity Log
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  Creates and updates a table with flow scan data.
// @author       Pedro Sanchez (pefsanch)
// @match        https://sortcenter-menu-na.amazon.com/containerization/flow
// @grant        GM_addStyle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Flow%20Activity%20Log.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Flow%20Activity%20Log.js
// ==/UserScript==

(function() {
    'use strict';

    // Constants
    const STORAGE_KEY = 'flowActivityLogPresets';

    // Create a container for the table if it doesn't exist
    let tableContainer;
    let packageIDs = new Set(); // To keep track of unique Package IDs
    let statsEl;
    let statusDiv;
    let statusArea;
    let successCount = 0;
    let failCount = 0;
    let previousProcessedCount = 0;

    // LocalStorage Management Functions
    const StorageManager = {
        getAll: () => {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Error reading from localStorage:', e);
                return [];
            }
        },
        
        add: (name, ids) => {
            const presets = StorageManager.getAll();
            if (!presets.find(p => p.name === name)) {
                presets.push({ name, ids: ids.split('\n').filter(id => id.trim()), createdAt: new Date().toISOString() });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
                return true;
            }
            return false;
        },
        
        edit: (oldName, newName, ids) => {
            const presets = StorageManager.getAll();
            const index = presets.findIndex(p => p.name === oldName);
            if (index !== -1) {
                presets[index] = { name: newName, ids: ids.split('\n').filter(id => id.trim()), createdAt: presets[index].createdAt, updatedAt: new Date().toISOString() };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
                return true;
            }
            return false;
        },
        
        delete: (name) => {
            const presets = StorageManager.getAll();
            const filtered = presets.filter(p => p.name !== name);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            return presets.length !== filtered.length;
        },
        
        getByName: (name) => {
            const presets = StorageManager.getAll();
            return presets.find(p => p.name === name);
        }
    };

    // Function to update #sd_input and trigger Enter
    function updateAndProcessInput(idsList) {
        const inputField = document.querySelector('#sd_input');
        if (!inputField) {
            console.error('#sd_input not found');
            return;
        }

        // Set the first ID
        if (idsList.length > 0) {
            const firstId = idsList[0];
            inputField.focus();
            inputField.value = firstId;

            // Trigger input event
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Trigger Enter key
            inputField.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter', keyCode: 13, which: 13, bubbles: true
            }));
            
            inputField.dispatchEvent(new Event('blur', { bubbles: true }));
            inputField.blur();
        }
    }

    // Create the modal for user input
    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'inputModal';
        modal.style.position = 'fixed';
        modal.style.bottom = '30px';
        modal.style.right = '10px';
        modal.style.padding = '15px';
        modal.style.backgroundColor = '#f9f9f9';
        modal.style.border = '1px solid #ccc';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        modal.style.width = '300px';
        modal.style.zIndex = '9999';

        // Check if #parentInfo is hidden
        const parentInfo = document.getElementById('parentInfo');
        const parentInfoHidden = !parentInfo || parentInfo.offsetParent === null;

        if (parentInfoHidden) {
            // Show select dropdown from localStorage
            const selectContainer = document.createElement('div');
            selectContainer.style.marginBottom = '15px';

            const label = document.createElement('label');
            label.innerText = "Load Preset: ";
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            label.style.fontWeight = 'bold';
            selectContainer.appendChild(label);

            const select = document.createElement('select');
            select.id = 'presetSelect';
            select.style.width = '100%';
            select.style.padding = '8px';
            select.style.marginBottom = '5px';
            select.style.borderRadius = '4px';
            select.style.border = '1px solid #ccc';

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.innerText = '-- Select a preset --';
            select.appendChild(defaultOption);

            const presets = StorageManager.getAll();
            presets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset.name;
                option.innerText = `${preset.name} (${preset.ids.length} IDs)`;
                select.appendChild(option);
            });

            select.onchange = (e) => {
                if (e.target.value) {
                    const preset = StorageManager.getByName(e.target.value);
                    if (preset) {
                        input.value = preset.ids.join('\n');
                        // Update #sd_input and trigger Enter
                        updateAndProcessInput(preset.ids);
                    }
                }
            };

            selectContainer.appendChild(select);
            modal.appendChild(selectContainer);

            // Preset Management Buttons
            const presetBtnsContainer = document.createElement('div');
            presetBtnsContainer.style.marginBottom = '10px';
            presetBtnsContainer.style.display = 'grid';
            presetBtnsContainer.style.gridTemplateColumns = '1fr 1fr';
            presetBtnsContainer.style.gap = '5px';

            const savePresetBtn = document.createElement('button');
            savePresetBtn.innerText = "💾 Save";
            savePresetBtn.style = "padding: 6px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 12px;";
            savePresetBtn.onclick = () => {
                const presetName = prompt("Enter preset name:");
                if (presetName && input.value) {
                    if (StorageManager.add(presetName, input.value)) {
                        alert(`Preset "${presetName}" saved!`);
                        location.reload(); // Reload to update select options
                    } else {
                        alert(`Preset "${presetName}" already exists!`);
                    }
                }
            };
            presetBtnsContainer.appendChild(savePresetBtn);

            const editPresetBtn = document.createElement('button');
            editPresetBtn.innerText = "✏️ Edit";
            editPresetBtn.style = "padding: 6px; cursor: pointer; background: #ffc107; color: black; border: none; border-radius: 4px; font-size: 12px;";
            editPresetBtn.onclick = () => {
                const selectedName = select.value;
                if (!selectedName) {
                    alert("Select a preset first!");
                    return;
                }
                const newName = prompt("Enter new preset name:", selectedName);
                if (newName && input.value) {
                    if (StorageManager.edit(selectedName, newName, input.value)) {
                        alert(`Preset updated to "${newName}"!`);
                        location.reload();
                    }
                }
            };
            presetBtnsContainer.appendChild(editPresetBtn);

            const deletePresetBtn = document.createElement('button');
            deletePresetBtn.innerText = "🗑️ Delete";
            deletePresetBtn.style = "padding: 6px; cursor: pointer; background: #dc3545; color: white; border: none; border-radius: 4px; font-size: 12px; grid-column: 1 / -1;";
            deletePresetBtn.onclick = () => {
                const selectedName = select.value;
                if (!selectedName) {
                    alert("Select a preset first!");
                    return;
                }
                if (confirm(`Delete preset "${selectedName}"?`)) {
                    if (StorageManager.delete(selectedName)) {
                        alert(`Preset "${selectedName}" deleted!`);
                        location.reload();
                    }
                }
            };
            presetBtnsContainer.appendChild(deletePresetBtn);

            modal.appendChild(presetBtnsContainer);
        }

        const label = document.createElement('label');
        label.innerText = "Enter Container IDs (one per line):";
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        label.style.fontWeight = 'bold';
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
            const rawIds = input.value.split('\n').map(id => id.trim()).filter(id => id);
            const uniqueIds = [...new Set(rawIds)];
            resultDiv.innerText = `IDs entered: ${input.value.length} | Unique IDs: ${uniqueIds.length}`;

            input.value = uniqueIds.join('\n');

            statusArea.value = "Processing...\r\n";
            successCount = 0;
            failCount = 0;
            previousProcessedCount = 0;

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

        statusDiv = document.createElement('div');
        statusDiv.id = "check-status";
        statusDiv.innerText = "Ready";
        statusDiv.style = "margin-top: 8px; font-size: 12px; color: #555; font-weight: bold;";
        modal.appendChild(statusDiv);

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
        let idCounter = 1;

        for (const id of scannableIDs) {
            const inputField = document.querySelector('#sd_input');
            if (!inputField) continue;

            if (statusDiv) {
                statusDiv.innerText = `Processing (${idCounter}/${scannableIDs.length}) ID: ${id}`;
            }
            inputField.focus();
            inputField.value = id;

            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter', keyCode: 13, which: 13, bubbles: true
            }));
            inputField.dispatchEvent(new Event('blur', { bubbles: true }));
            inputField.blur();

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
                if (packageIDElement) {
                    statusArea.value += `❌ ${packageIDElement.innerText}\r\n`;
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
            newCell.style.border = "1px solid black";
            newCell.style.padding = "10px";
            newCell.style.fontWeight = "bold";
        }
    }

    function updateStats() {
        if (statsEl) {
            statsEl.textContent = `✅ ${successCount} | ❌ ${failCount} | ⛔ ${previousProcessedCount}`;
        }
    }

    // Initialize
    createModal();

})();