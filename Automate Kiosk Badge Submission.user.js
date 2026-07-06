// ==UserScript==
// @name         Automate Kiosk Badge Submission
// @namespace    HOU3
// @version      1.0
// @description  Processes a list of badge IDs one by one through the labor tracking form
// @author       Pedro Sanchez (pefsanch)
// @match        http://*/do/laborTrackingKiosk*
// @match        https://*/do/laborTrackingKiosk*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. PLACE YOUR LIST OF BADGE IDS HERE
    const BADGES_TO_PROCESS = [
        "11325083",
        "14810336",
        "12725535",
        "11027771",
        "15170529",
        "13607037",
        "12309806",
        "13985221",
        "11659070",
        "12514118",
        "14626461"
    ];

    // Key names for tracking progress in localStorage
    const STORAGE_KEY_LIST = "kiosk_badges_queue";
    const STORAGE_KEY_ACTIVE = "kiosk_automation_active";

    // Locate the form and input fields
    const form = document.querySelector('form[action="/do/laborTrackingKiosk"]');
    const badgeInput = document.getElementById('trackingBadgeId');

    if (!form || !badgeInput) return;
        let tableBody = ""
        for( const line of BADGES_TO_PROCESS ) {
            tableBody += `<tr><td>${line}</td></tr>`;
            console.log(tableBody)
        };

    function movebox() {
        let waitForIt;
        if (waitForIt = document.querySelector('#body > .login')) {
            waitForIt.style = '';
        } else {
            setTimeout(movebox, 500);
        }
    }
    movebox();

    // Create a simple control UI panel on the screen
    createControlPanel();
    createActiveIdsTable();
    showActiveIds();

    // Check if automation is currently running
    if (localStorage.getItem(STORAGE_KEY_ACTIVE) === "true") {
        processNextBadge();
    }

    function createActiveIdsTable() {
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '100px';
        panel.style.right = '300px';
        panel.style.padding = '15px';
        panel.style.background = '#f0f0f0';
        panel.style.border = '2px solid #ccc';
        panel.style.zIndex = '9999';
        panel.style.fontFamily = 'sans-serif';

        const table = document.createElement('table');
        table.id = "id-table";
        //title.innerText = "Automation Control";
        //title.style.margin = '0 0 10px 0';
        table.innerHTML = "<thead><tr><td>Badge</td><td>Name</td></tr></thead><tbody></tbody>"

        panel.appendChild(table);

        document.body.appendChild(panel);
        updateStatus();
    }

    function createControlPanel() {
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '100px';
        panel.style.right = '10px';
        panel.style.padding = '15px';
        panel.style.background = '#f0f0f0';
        panel.style.border = '2px solid #ccc';
        panel.style.zIndex = '9999';
        panel.style.fontFamily = 'sans-serif';

        const title = document.createElement('h4');
        title.innerText = "Automation Control";
        title.style.margin = '0 0 10px 0';
        panel.appendChild(title);

        const table = document.createElement('table');
        table.id = "id-table";
        //title.innerText = "Automation Control";
        //title.style.margin = '0 0 10px 0';
        table.innerHTML = "<thead><tr><td>Badge</td></tr></thead><tbody>" + tableBody + "</tbody>"

        panel.appendChild(table);


        // Status text
        const status = document.createElement('p');
        status.id = 'automation-status';
        status.style.margin = '0 0 10px 0';
        status.style.fontSize = '12px';
        panel.appendChild(status);

        // Start Button
        const startBtn = document.createElement('button');
        startBtn.innerText = "Start Processing";
        startBtn.style.marginRight = '5px';
        startBtn.onclick = function() {
            localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(BADGES_TO_PROCESS));
            localStorage.setItem(STORAGE_KEY_ACTIVE, "true");
            processNextBadge();
        };
        panel.appendChild(startBtn);

        // Stop Button
        const stopBtn = document.createElement('button');
        stopBtn.innerText = "Stop";
        stopBtn.onclick = function() {
            localStorage.setItem(STORAGE_KEY_ACTIVE, "false");
            updateStatusText("Stopped.");
        };
        panel.appendChild(stopBtn);

        document.body.appendChild(panel);
        updateStatus();
    }

    function updateStatus() {
        const isActive = localStorage.getItem(STORAGE_KEY_ACTIVE) === "true";
        const queue = JSON.parse(localStorage.getItem(STORAGE_KEY_LIST) || "[]");

        if (isActive) {
            updateStatusText(`Running... Items left in queue: ${queue.length}`);
        } else {
            updateStatusText(`Idle. Total items ready to load: ${BADGES_TO_PROCESS.length}`);
        }
    }

    function updateStatusText(text) {
        const el = document.getElementById('automation-status');
        if (el) el.innerText = text;
    }

    function processNextBadge() {
        let queue = JSON.parse(localStorage.getItem(STORAGE_KEY_LIST) || "[]");

        if (queue.length === 0) {
            // No items left, shut down automation loop
            localStorage.setItem(STORAGE_KEY_ACTIVE, "false");
            updateStatusText("Finished processing all items!");
            return;
        }

        // Get the first item from the queue list
        const nextBadge = queue.shift();

        // Update the queue inside storage before navigating away
        localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(queue));
        updateStatusText(`Submitting: ${nextBadge}. Items remaining: ${queue.length}`);

        // Insert value into the input element and submit the form
        setTimeout(() => {
            badgeInput.value = nextBadge;
            form.submit();
        }, 1000); // 1-second delay to prevent slamming the server too fast
    }

    function showActiveIds() {
        const queue = JSON.parse(localStorage.getItem(STORAGE_KEY_LIST) || "[]");

        const tbody = document.querySelector("#id-table tbody") || document.querySelector("#id-table");
        if (!tbody) return;

        // Clear existing rows
        const rows = tbody.tagName.toLowerCase() === "tbody" ? tbody : tbody.querySelector("tbody");
        const tbodyEl = rows ? rows : tbody;
        tbodyEl.innerHTML = "";

        // If your queue contains objects: { id, name }
        // If it contains strings/numbers, we’ll treat the value as the id and leave name blank.
        for (const item of queue) {
            const badgeId = (item && typeof item === "object") ? item.id : item;
            const badgeName = (item && typeof item === "object") ? (item.name ?? "") : "";

            const tr = document.createElement("tr");

            const tdId = document.createElement("td");
            tdId.textContent = badgeId ?? "";

            const tdName = document.createElement("td");
            tdName.textContent = badgeName;

            tr.appendChild(tdId);
            tr.appendChild(tdName);

            tbodyEl.appendChild(tr);
        }
    }

    function waitForAndSaveBadgeId() {
        //const form = document.querySelector('form[action="/do/laborTrackingKiosk"]');
        if (!form) return;

        //const badgeInput = form.querySelector('#trackingBadgeId, [name="trackingBadgeId"], input[aria-label*="trackingBadgeId"]');
        if (!badgeInput) return;

        const getBadgeId = () => (badgeInput.value ?? "").trim();

        const onSubmit = (e) => {
            const badgeId = getBadgeId();
            if (!badgeId) return;

            const queue = JSON.parse(localStorage.getItem(STORAGE_KEY_LIST) || "[]");

            if (!queue.includes(badgeId)) queue.push(badgeId);
            console.log(badgeId);

            localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(queue));
            showActiveIds();
        };

        form.addEventListener("submit", onSubmit, true);
    }


})();
