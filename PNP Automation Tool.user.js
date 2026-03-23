// ==UserScript==
// @name         PNP Automation Tool
// @namespace    HOU3
// @version      1.0
// @description  Automate palletization by processing a list of IDs via the PNP tool logic
// @author       Pedro Sanchez (pefsanch)
// @match        https://pnp-iad.aka.amazon.com/pnp
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts/blob/main/PNP%20Automation%20Tool.user.js
// @updateURL    https://github.com/pedrosancheznery/Tampermonkey-Scripts/blob/main/PNP%20Automation%20Tool.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function createUI() {
        const container = document.createElement('div');
        container.style = "position: fixed; bottom: 50px; left: 10px; z-index: 9999; background: white; border: 2px solid #232f3e; padding: 10px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 250px;";

        const label1 = document.createElement('label');
        label1.innerText = "Paste IDs (One per line):";
        label1.style = "display: block; font-weight: bold; margin-bottom: 5px;";

        const label2 = document.createElement('label');
        label2.innerText = "PAX Label:";
        label2.style = "display: block; font-weight: bold; margin-bottom: 5px;";

        const paxInput = document.createElement('input');
        paxInput.id = "pax-input"; // Added ID for reference

        const textarea = document.createElement('textarea');
        textarea.id = "pnp-batch-input";
        textarea.style = "width: 100%; height: 150px; margin-bottom: 10px; font-family: monospace;";
        textarea.placeholder = "TOTE123\nPKG456...";

        const btn = document.createElement('button');
        btn.innerText = "Process Batch";
        btn.style = "width: 100%; padding: 10px; background-color: #28a745; color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 4px;";

        const statusDiv = document.createElement('div');
        statusDiv.id = "check-status";
        statusDiv.innerText = "Ready";
        statusDiv.style = "margin-top: 8px; font-size: 12px; color: #555; font-weight: bold;";

        btn.onclick = async () => {
            const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const status = document.getElementById('check-status');
            let i = 0;

            if (lines.length === 0) return alert("Please enter at least one ID.");

            for (const id of lines) {
                i = i + 1;
                console.log(`[PNP Automation] Processing: ${id}`);

                window.scan(id); // Scan the current ID
                status.innerText = `Checking (${i}/${lines.length}): ${id}`;
                status.style.color = "blue";


                // Wait for the success message to appear before proceeding
                await waitForSuccessMessage();

                // Scan the PAX input value after the success message is detected
                const paxValue = paxInput.value.trim();
                if (paxValue) {
                    window.scan(paxValue); // Scan the PAX input

                    // Wait for the palletize complete message
                    await waitForPalletizeCompleteMessage();
                } else {
                    console.log("No PAX value to scan.");
                }

                // Optional: Small delay if needed
                await new Promise(r => setTimeout(r, 1000));
            }

            textarea.value = "";
            //alert("Batch processing complete.");
            status.innerText = `Finished! Procesed ${id} items`;
            status.style.color = "green";
        };

        container.appendChild(label2);
        container.appendChild(paxInput);
        container.appendChild(label1);
        container.appendChild(textarea);
        container.appendChild(btn);
        container.appendChild(statusDiv);
        document.body.appendChild(container);
    }

    // Function to wait for the success message for ID processing
    function waitForSuccessMessage() {
        return new Promise((resolve) => {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    const successHeader = document.getElementById('rightViewHeader');
                    const statusContainer = document.getElementById('statusContainer');
                    const messageContainer = document.querySelector('.messageContainer .successMessageContainer'); // For Remove/Recycle

                    if (successHeader && statusContainer) {
                        const table = statusContainer.querySelector('table');
                        if (table) {
                            console.log("Success message detected for ID processing.");
                            observer.disconnect(); // Stop observing once we find the element
                            resolve();
                        }
                    }

                    // For Remove/Recycle
                    if (messageContainer) {
                        const header = messageContainer.querySelector('h1');
                        console.log(header.innerText);
                        if (header && header.innerText.includes("Tote submitted to pack")) {
                            console.log("Remove palletization complete message detected.");
                            observer.disconnect(); // Stop observing once we find the element
                            resolve();
                        }
                    }
                }
            });

            // Start observing the body for changes
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    // Function to wait for the palletize complete message
    function waitForPalletizeCompleteMessage() {
        return new Promise((resolve) => {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    const messageContainer = document.querySelector('.messageContainer .successMessageContainer');

                    if (messageContainer) {
                        const header = messageContainer.querySelector('h1');

                        if (header && header.innerText.includes("Palletize complete")) {
                            console.log("Palletization complete message detected.");
                            observer.disconnect(); // Stop observing once we find the element
                            resolve();
                        }
                    }
                }
            });

            // Start observing the body for changes
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    // Initialize UI when page is ready
    window.addEventListener('load', createUI);
})();
