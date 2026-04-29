// ==UserScript==
// @name         317 Table Sorter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds sorting functionality to a specific table.
// @author       Pedro Sanchez (pefsanch)
// @match        https://wd-repair-portal-na.aka.amazon.com/resources/ReCommerceFCWebToolsUI/html/listTote.html
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts/
// downloadURL   https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/317%20Table%20Sorter.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/317%20Table%20Sorter.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    // Change this selector to match your target table.
    // For example: `table#my-data-table` or `table.results-table`
    const tableSelector = 'table#item-details-table';
    // ---------------------

    const setupSorting = () => {
        const table = document.querySelector(tableSelector);
        if (!table) return;

        const headers = table.querySelectorAll('th');
        if (headers.length === 0) return;

        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const isAscending = header.dataset.sortOrder === 'asc';
                sortTable(table, index, !isAscending);

                // Reset other headers
                headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));

                // Set indicator on the clicked header
                header.classList.add(isAscending ? 'sorted-desc' : 'sorted-asc');
                header.dataset.sortOrder = isAscending ? 'desc' : 'asc';
            });
        });
    };

    const sortTable = (table, columnIndex, isAscending) => {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Sort the rows based on the column content
        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[columnIndex].innerText.toLowerCase();
            const cellB = rowB.cells[columnIndex].innerText.toLowerCase();

            // Handle numeric values
            const numA = parseFloat(cellA);
            const numB = parseFloat(cellB);
            if (!isNaN(numA) && !isNaN(numB)) {
                return isAscending ? numA - numB : numB - numA;
            }

            // Handle string values
            if (isAscending) {
                return cellA.localeCompare(cellB);
            } else {
                return cellB.localeCompare(cellA);
            }
        });

        // Re-append the sorted rows to the table
        rows.forEach(row => tbody.appendChild(row));
    };

    // Add some basic visual style for sort direction
    const style = document.createElement('style');
    style.textContent = `
        th.sorted-asc::after { content: ' ▲'; }
        th.sorted-desc::after { content: ' ▼'; }
    `;
    document.head.appendChild(style);

    // Some websites load table content dynamically.
    // This watches for the table to appear on the page.
    const observer = new MutationObserver((mutations, obs) => {
        const table = document.querySelector(tableSelector);
        if (table) {
            //console.info(`Table found...`);
            setupSorting();
            obs.disconnect(); // Stop observing once the table is found
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
