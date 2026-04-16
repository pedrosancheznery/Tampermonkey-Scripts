// ==UserScript==
// @name         RapidFlow - SAM Compatible (Refactored)
// @namespace    HOU3
// @version      1.0.2
// @description  Rapid flow containers with improved performance and error handling.
// @author       Pedro Sanchez (pefsanch)
// @match        http://sortcenter-menu-na.amazon.com/containermovement/*
// @match        https://sortcenter-menu-na.amazon.com/containermovement/*
// @match        https://sortcenter-menu-na.amazon.com/containerization/flow*
// @require      https://code.jquery.com/jquery-3.4.0.min.js
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/refs/heads/main/RapidFlow.js
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/refs/heads/main/RapidFlow.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @grant        none
// ==/UserScript==

(function($) {
    'use strict';

    let lastFailures = [];

    const setupUI = () => {
        const uiHtml = `
            <div id="RapidFlow" style="position: fixed; top: 50px; right: 10px; z-index: 9999; background: #f9f9f9; border: 1px solid #ccc; padding: 15px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 300px; font-family: sans-serif;">
                <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <b>RapidFlow v1.0.2</b>
                    <button id="tf_clear" style="font-size: 10px; padding: 2px 5px; cursor: pointer;">Clear All</button>
                </div>
                <input type="text" id="tf_dst" placeholder="Destination Container" style="width: 100%; margin-bottom: 5px; padding: 5px; box-sizing: border-box;">
                <textarea id="tf_moveList" placeholder="Containers (one per line)" rows="8" style="width: 100%; margin-bottom: 5px; padding: 5px; resize: vertical; box-sizing: border-box;"></textarea>
                <button id="tf_submit" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Turbo FLOW!</button>
                <textarea id="tf_status" placeholder="Results..." rows="10" readonly style="width: 100%; margin-top: 10px; font-size: 11px; background: #eee; border: 1px inset #ccc; box-sizing: border-box;"></textarea>
                <button id="tf_export" style="display:none; width: 100%; margin-top: 5px; padding: 5px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Download Failed List (.txt)</button>
            </div>
        `;
        $('body').append(uiHtml);
    };

    const downloadTxt = (filename, text) => {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const performMoves = async () => {
        const $status = $('#tf_status');
        const $submitBtn = $('#tf_submit');
        const $exportBtn = $('#tf_export');
        const destination = $('#tf_dst').val().trim();

        const rawItems = $('#tf_moveList').val().split('\n').map(i => i.trim()).filter(i => i !== "");
        const items = [...new Set(rawItems)];
        const duplicateCount = rawItems.length - items.length;

        if (!destination || items.length === 0) {
            alert("Please provide a destination and at least one container.");
            return;
        }

        // Reset state
        lastFailures = [];
        $exportBtn.hide();
        $submitBtn.prop('disabled', true).text('Processing...').css('background', '#6c757d');
        $status.val(`Starting batch move of ${items.length} containers...${duplicateCount > 0 ? ` (${duplicateCount} duplicates ignored)` : ''}\n\n`);

        const successList = [];

        for (const item of items) {
            try {
                await $.ajax({
                    type: "POST",
                    url: "/containerization/backend/moveContainer",
                    contentType: "application/json",
                    data: JSON.stringify({
                        containerId: item,
                        containerScannedTime: Date.now(),
                        destinationContainerId: destination,
                        enforceDirectedWorkExistCheck: false,
                        overrideValidation: false,
                        subContainerId: null
                    })
                });
                successList.push(item);
                $status.val((i, old) => old + `[OK] ${item}\n`);
            } catch (err) {
                lastFailures.push(item);
                $status.val((i, old) => old + `[FAIL] ${item}\n`);
            }
            $status.scrollTop($status[0].scrollHeight);
        }

        const report = `
--------------------------
FINAL REPORT
--------------------------
Total Unique: ${items.length}
Success: ${successList.length}
Failed: ${lastFailures.length}
Duplicates Ignored: ${duplicateCount}
--------------------------`;

        $status.val((i, old) => old + report);
        $status.scrollTop($status[0].scrollHeight);
        $submitBtn.prop('disabled', false).text('Turbo FLOW!').css('background', '#007bff');

        if (lastFailures.length > 0) {
            $exportBtn.show().text(`Download ${lastFailures.length} Failures (.txt)`);
        }
    };

    $(() => {
        setupUI();

        // Event Listeners
        $(document).on('click', '#tf_submit', performMoves);

        $(document).on('click', '#tf_clear', () => {
            if(confirm("Clear all inputs and logs?")) {
                $('#tf_dst, #tf_moveList, #tf_status').val('');
                $('#tf_export').hide();
                lastFailures = [];
            }
        });

        $(document).on('click', '#tf_export', () => {
            const timestamp = new Date().toLocaleTimeString();
            downloadTxt(`failed_moves_${timestamp}.txt`, lastFailures.join('\n'));
        });
    });

})(window.jQuery);
