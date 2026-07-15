// ==UserScript==
// @name         Automate Kiosk Badge Submission
// @namespace    HOU3
// @version      1.8
// @description  Processes a list of badge IDs one by one through the labor tracking form
// @author       Pedro Sanchez (pefsanch)
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Automate%20Kiosk%20Badge%20Submission.user.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/Automate%20Kiosk%20Badge%20Submission.user.js
// @match        http://*/do/laborTrackingKiosk*
// @match        https://*/do/laborTrackingKiosk*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Key names for tracking progress in localStorage
    const STORAGE_KEY_LIST = "kiosk_badges_queue";
    const STORAGE_KEY_ACTIVE = "kiosk_automation_active";
    //const STORAGE_KEY_BADGES = "kiosk_badges_list";
    const STORAGE_KEY_SUBMITTED = "kiosk_submitted_badges";

    // Calm codes to filter out
    const FILTERED_CALM_CODES = ["ISTOP", "MSTOP"];

    // Locate the form and input fields
    const form = document.querySelector('form[action="/do/laborTrackingKiosk"]');
    const badgeInput = document.getElementById('trackingBadgeId');

    if (!form || !badgeInput) return;

    // Create control UI panels on the screen
    //createControlPanel();
    createActiveIdsTable();
    showActiveIds();

    // Capture submitted badges before form submission
    captureSubmittedBadges();

    // Set up auto-refresh of table every 2 minutes (120000 milliseconds)
    setInterval(() => {
        showActiveIds();
    }, 120000);

    // Check if automation is currently running
    if (localStorage.getItem(STORAGE_KEY_ACTIVE) === "true") {
        processNextBadge();
    }

    function getBadgesFromStorage() {
        const stored = localStorage.getItem(STORAGE_KEY_SUBMITTED);
        return stored ? JSON.parse(stored) : [];
    }

    function getElapsedTime(timestamp) {
        const now = new Date();
        const badgeTime = new Date(timestamp);
        const diffMs = now - badgeTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays}d ${diffHours % 24}h`;
        } else if (diffHours > 0) {
            return `${diffHours}h ${diffMins % 60}m`;
        } else if (diffMins > 0) {
            return `${diffMins}m`;
        } else {
            return 'now';
        }
    }

    function createActiveIdsTable() {
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '100px';
        panel.style.left = '10px';
        panel.style.padding = '15px';
        panel.style.background = '#f0f0f0';
        panel.style.border = '2px solid #ccc';
        panel.style.zIndex = '9999';
        panel.style.fontFamily = 'sans-serif';
        panel.style.maxHeight = '500px';
        panel.style.overflowY = 'auto';
        panel.style.maxWidth = '400px';

        const table = document.createElement('table');
        table.id = "id-table";
        table.innerHTML = "<thead><tr><td>Badge</td><td>Name</td><td>Code</td><td>Elapsed</td></tr></thead><tbody></tbody>"
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '12px';

        // Add table styling
        const style = document.createElement('style');
        style.textContent = `
            #id-table {
                width: 100%;
                border-collapse: collapse;
            }
            #id-table td {
                border: 1px solid #999;
                padding: 4px;
            }
            #id-table thead td {
                background-color: #ddd;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);

        panel.appendChild(table);

        document.body.appendChild(panel);
        updateStatus();
    }


    function updateStatus() {
        const isActive = localStorage.getItem(STORAGE_KEY_ACTIVE) === "true";
        const queue = JSON.parse(localStorage.getItem(STORAGE_KEY_LIST) || "[]");
        const badgeList = getBadgesFromStorage();
        const submittedBadges = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMITTED) || "[]");

        if (isActive) {
            updateStatusText(`Running... Items left in queue: ${queue.length} | Submitted: ${submittedBadges.length}`);
        } else {
            updateStatusText(`Idle. Total items ready to load: ${badgeList.length} | Submitted: ${submittedBadges.length}`);
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
        // Get submitted badges instead of queue
        const submittedBadges = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMITTED) || "[]");

        const tbody = document.querySelector("#id-table tbody") || document.querySelector("#id-table");
        if (!tbody) return;

        // Clear existing rows
        const rows = tbody.tagName.toLowerCase() === "tbody" ? tbody : tbody.querySelector("tbody");
        const tbodyEl = rows ? rows : tbody;
        tbodyEl.innerHTML = "";

        // Display each submitted badge with id, name, calmCode, and elapsed time
        for (const item of submittedBadges) {
            const badgeId = item.id ?? "";
            const badgeName = item.name ?? "";
            const calmCode = item.calmCode ?? "";
            const elapsed = getElapsedTime(item.timestamp);

            const tr = document.createElement("tr");

            const tdId = document.createElement("td");
            tdId.textContent = badgeId;

            const tdName = document.createElement("td");
            tdName.textContent = badgeName;

            const tdCode = document.createElement("td");
            tdCode.textContent = calmCode;

            const tdElapsed = document.createElement("td");
            tdElapsed.textContent = elapsed;

            tr.appendChild(tdId);
            tr.appendChild(tdName);
            tr.appendChild(tdCode);
            tr.appendChild(tdElapsed);

            tbodyEl.appendChild(tr);
        }

        updateStatus();
    }

    function captureSubmittedBadges() {
        if (!form) return;

        form.addEventListener("submit", function(e) {
            // Get the calmCode value first
            const calmCodeInput = form.querySelector('input[name="calmCode"]');
            const calmCode = calmCodeInput ? calmCodeInput.value : "";

            // Get or initialize the submitted badges list first
            let submittedBadges = [];
            const stored = localStorage.getItem(STORAGE_KEY_SUBMITTED);
            if (stored) {
                submittedBadges = JSON.parse(stored);
            }

            // Check if this calm code should be filtered out
            if (FILTERED_CALM_CODES.includes(calmCode)) {
                // Filter out ALL badges with ISTOP or MSTOP calm codes
                submittedBadges = submittedBadges.filter(item => !FILTERED_CALM_CODES.includes(item.calmCode));

                // Save the filtered list back to localStorage
                localStorage.setItem(STORAGE_KEY_SUBMITTED, JSON.stringify(submittedBadges));
                console.log(`Filtered out badges with calm code: ${calmCode}`);

                // Refresh the table display
                setTimeout(() => showActiveIds(), 100);
                return; // Don't add any badges for filtered calm codes
            }

            // Get all hidden input fields for badge IDs and names
            const trackingIdInputs = form.querySelectorAll('input[name="trackingIdList"]');
            const trackingNameInputs = form.querySelectorAll('input[name="trackingNameList"]');

            // Add each badge and name pair to the list
            for (let i = 0; i < trackingIdInputs.length; i++) {
                const badgeId = trackingIdInputs[i].value;
                const badgeName = trackingNameInputs[i] ? trackingNameInputs[i].value : "";

                // Avoid duplicates
                const exists = submittedBadges.some(item => item.id === badgeId);
                if (!exists) {
                    submittedBadges.push({
                        id: badgeId,
                        name: badgeName,
                        calmCode: calmCode,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            // Save back to localStorage
            localStorage.setItem(STORAGE_KEY_SUBMITTED, JSON.stringify(submittedBadges));
            console.log("Captured badges:", submittedBadges);
            
            // Refresh the table display
            setTimeout(() => showActiveIds(), 100);
        });
    }

    function waitForAndSaveBadgeId() {
        if (!form) return;
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

        form.addEventListener("submit", onSubmit);
    }


})();
