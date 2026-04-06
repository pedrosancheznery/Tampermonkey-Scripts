// ==UserScript==
// @name         YMS Superuser
// @namespace    fyi.lamp.amzn
// @version      2026.04.05.01
// @description  Quality Of Life improvements for YMS
// @author       Pedro Sanchez (pefsanch)
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts/
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/refs/heads/main/YMS%20Super%20User.js
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/refs/heads/main/YMS%20Super%20User.js
// @match        https://trans-logistics.amazon.com/yms/shipclerk*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @require      https://code.jquery.com/jquery-3.7.0.min.js
// @require      https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ========== Configuration & State ==========
    const CONFIG = {
        YMS_CODES: new Set(["IBVEND", "IBUNSELL", "IBPROBSOLV", "IBCRET", "IBTRANS", "IBUNDELIV", "IBMISSHIP", "IBREJECT", "FULLPOD", "EMPTYPOD", "IBFoundLoaded", "IBDONATE", "RMVLIQEMPTY", "RMVRECEMPTY", "RMVLTLEMPTY", "RMVDONEMPTY", "RMVLIQ", "RMVREC", "RMVLTL", "RMVDON", "OBSCHED", "OBLATE", "OBVRET", "OBTHO", "OBRTD", "OBTRANSLOAD", "OBDEPARTED", "OBRECOVERY", "LNCHPOD", "WASTE", "APSTORAGE", "NONAPSTORAGE", "LEGALHOLD", "NIEMPTY", "OBEMPTY", "OBMISLOAD", "IBEMPTY", "NICONSUM", "NIBADWOOD", "NIWOOD", "NIAMXL", "NIUSPS", "NIBADUPP", "NIUPP", "NIBADTOTES", "NITOTES", "NIBADCARTS", "NICARTS", "NIRECY", "NISTORAGE", "NIFRESHGUPP"]),
        ASSET_ICONS: {
            'yard-asset-icon-TRAILER': 'trailer', 'yard-asset-icon-TRAILER_SKIRTED': 'trailer',
            'yard-asset-icon-TRAILER_INTERMODAL': 'intermodal', 'yard-asset-icon-TRAILER_PUP': 'pup',
            'yard-asset-icon-TRACTOR': 'tractor', 'yard-asset-icon-BOX_TRUCK': 'boxtruck',
            'yard-asset-icon-AIRPLANE': 'airplane', 'yard-asset-icon-CAR': 'car'
        }
    };

    //let settings = {};
    let appliedFilter = "";

    const defaultSettings = {
        enable_notesCompliance: true,
        enable_sealNotes: false,
        enable_DDUDoors: false,
        ixd_bol: 0,
        ixd_blueflag: 0,
        ixd_notes: 0,
        refresh_notesCompliance: 10000,
        refresh_filteredResults: 5000,
        showLicenseCopy: true,
        autoselectYard: "",
        notesCompliance_redFlagLimit: 72,
        notesCompliance_yellowFlagLimit: 12,
        dashboardFilters: {
            "ymsnote_missing": { id: "ymsnote_missing", category: "notescompliance", title: "Missing YMS Note", filters: "tractor=0 boxtruck=0 aap=0 hasymsnote=0|aap=1 empty=0 hasymsnote=0 longdwell=1", enableNotifs: "1", quickView: "1" },
            "empty_aap": { id: "empty_aap", category: "empties", title: "AAP Fleet Empties", filters: "aap=1 empty=1", enableNotifs: "0", quickView: "0" }
            // ... Add others back here as needed
        },
        dashboardCategories: {
            "empties": { name: "Empties", id: "empties" },
            "notescompliance": { name: "Notes Compliance", id: "notescompliance" },
            "tagged": { name: "Tagged Assets", id: "tagged" }
        }
    };

    // ========== Data Structures ==========
    const validFilters = {
        "vehicletype": {
            "name": "Vehicle Type",
            "values": ["Airplane|airplane", "Tractor|tractor", "Trailer|trailer", "Dolly|dolly", "Pup|pup", "Intermodal|intermodal", "Box Truck|boxtruck", "Swap Body|swapbody", "Car|car", "Van|van", "Person|person", "Other|otherasset"]
        },
        "tagstatus": {
            "name": "Tag Status",
            "values": ["Yellow Tag|yellowtagged", "Red Tag|redtagged", "Has Tag Note|hastagnote"]
        },
        "scac": {
            "name": "SCAC & Operator",
            "values": ["AZNG|azng", "AZNU|aznu", "AZNA|azna", "AAP Fleet|aap", "3P|3p","Operator|operator|text"]
        },
        "loadstatus": {
            "name": "Load Status",
            "values": ["Empty|empty", "Loaded|loaded", "In Progress|inprogress"]
        },
        "visitreason": {
            "name": "Visit Reason",
            "values": ["Inbound|inbound", "Outbound|outbound", "Non-Inventory|noninventory"]
        },
        "other": {
            "name": "Other",
            "values": ["Has VRID|hasvrid", "Has ISA|hasisa", "Has YMS Note|hasymsnote", "Has Seal Note|hassealnote", "Blue Flag|blueflag", "Long Dwell|longdwell", "Parking Slip|parkingslip", "Dock Door|dockdoor", "Off Site|offsite"]
        }
    };

    let settings = JSON.parse(localStorage.getItem("YMSSuperuserSettings")) || {};

    // ========== CSS Updates (Grid-Based Editor) ==========
    const injectStyles = () => {
        const style = `
            #superuserPanel { width: 85%; height: 800px; background: #e0e0e0; z-index: 2000; position: fixed; top: 50px; left: 50%; transform: translateX(-50%); border: 1px solid black; box-shadow: 0 0 10px black; display: none; font-family: Verdana, sans-serif; overflow-y:auto }
            .dashboardDeck { border: 2px solid black; display: flex; flex-wrap: wrap; gap: 10px; margin: 10px; padding: 10px; }
            #dashboardEditTab { display: grid; grid-template-columns: 300px 1fr; height: calc(100% - 40px); overflow: hidden; }
            .dashboardCard { width: 140px; height: 140px; background: white; border: 2px solid black; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
            .dashboardCard h1 { font-size: 12px; margin: 0; text-align: center; }
            .dashboardCard p { font-size: 40px; margin: 0; font-weight: bold; }
            .edit-sidebar { border-right: 2px solid #ccc; background: #f5f5f5; display: flex; flex-direction: column; height: 100%; }
            .itemlistbox { flex: 1; overflow-y: auto; padding: 10px; }
            .itemlistitem { padding: 8px; background: #0071bc; color: white; margin-bottom: 2px; cursor: pointer; display: flex; align-items: center; gap: 10px; }
            .itemlistitem:hover { background: #2091dc; }
            .editor-workspace { padding: 20px; overflow-y: auto; background: white; }
            .filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
            .settingsOption-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center; margin-bottom: 10px; }
            .filterSaveOptions { display: flex; gap: 15px; padding-bottom: 20px; border-bottom: 2px solid #eee; margin-bottom: 20px; }
            .orangeButton { background: #C7511F; color: white; }
            .quickViewFilter {width: max-content;background-color: white;border: 1px solid black;border-radius: 0;color: black;padding: 2px;margin: 2px;}
            .superuser-loader {width: 12px;height: 12px;background-color: #22c55e; /* Green */border-radius: 50%;display: inline-block;margin-left: 10px;opacity: 0;transition: opacity 0.3s;}
            .superuser-loader.is-loading {opacity: 1;animation: pulse-green 1s infinite; }
            @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }}
            .yms-button { cursor: pointer; padding: 5px 10px; border: 1px solid black; font-weight: bold; }
`;
        $("<style>").html(style).appendTo("head");
    };

    // ========== CSS Injection ==========
    /*
    const injectStyles = () => {
        const style = `
            #superuserPanel { width: 85%; height: 800px; background: #e0e0e0; z-index: 2000; position: fixed; top: 50px; left: 50%; transform: translateX(-50%); border: 1px solid black; box-shadow: 0 0 10px black; color: black; display: none; overflow: hidden; font-family: Verdana, sans-serif; }
            #superuserHeader { background: #0071bc; color: white; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
            .notificationsCount { background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 10px; position: absolute; top: -5px; right: -5px; }
            .blueButton { background: #0071bc; color: white; }
            .redButton { background: #dd2222; color: white; }
            .superuserTabActive { background: #00519c !important; }
            [dwell='red'] .col11 { background-color: #ffcccc !important; border: 2px solid red !important; }
            [dwell='yellow'] .col11 { background-color: #fff9c4 !important; border: 2px solid orange !important; }
        `;
        $("<style>").html(style).appendTo("head");
    };
    */

    // ========== Utility Functions ==========
    function isMoreThan72(inputText) {return getDwellTime(inputText) > 72 * 60 * 60;}

    function isMoreThanHours(inputText, hours) {return getDwellTime(inputText) > parseInt(hours) * 60 * 60;}

    function getDwellTime(inputText) {
        var dwellTime = 0;
        if (inputText.toLowerCase().includes("year")) {
            var yearNum = inputText.replace(/[^0-9]/g, "");
            if (yearNum == "") {
                dwellTime = 60*60*24*30*365;
            }
            else {
                dwellTime = parseInt(yearNum) * 60 * 60 * 24 * 30 * 365;
            }
        }
        if (inputText.toLowerCase().includes("month")) {
            var monthNum = inputText.replace(/[^0-9]/g, "");
            if (monthNum == "") {
                dwellTime = 60*60*24*30;
            }
            else {
                dwellTime = parseInt(monthNum) * 60 * 60 * 24 * 30;
            }
        }
        if (inputText.toLowerCase().includes("days")) {
            var dayNum = inputText.replace(/[^0-9]/g, "");
            dwellTime = parseInt(dayNum) * 60 * 60 * 24;
        }
        if (inputText.toLowerCase().includes(":")) {
            var hourMinute = inputText.replace(/[^0-9:]/g, "").split(":");
            dwellTime = (hourMinute[0] * 60 * 60) + (hourMinute[1]) * 60;
        }
        return dwellTime;
    }

    const saveSettings = () => localStorage.setItem("YMSSuperuserSettings", JSON.stringify(settings));

    const parseDwell = (text) => {
        const hoursMatch = text.match(/(\d+):(\d+)/);
        if (hoursMatch) return parseInt(hoursMatch[1]) + (parseInt(hoursMatch[2]) / 60);
        if (text.includes("days")) return parseInt(text) * 24;
        return 0;
    };

    const getCSSSelectorFromFilter = (filterStr) => {
        if (!filterStr) return "";

        return filterStr.split("|").map(group => {
            return group.split(" ").filter(f => f.includes("=")).map(f => {
                const [key, val] = f.split("=");
                // Stamping uses lowercase category_ keys, so we force that here
                // Quoting the value is required for numeric matches like "1" or "0"
                return `[category_${key.toLowerCase().trim()}="${val.trim()}"]`;
            }).join("");
        }).join(", ");
    };

    // ========== Core Engine ==========
    window.updateCategories = function(force = false) {
        const loader = document.getElementById('superuser-status');
        if (loader) loader.classList.add('is-loading');

        let hasTractor = false;
        let hasBeenChanged = false;

        // Select only unprocessed rows unless forced
        let selectorString = "tbody.masterYardLP > tr" + (force ? "" : ":not([categoriesApplied])");
        let $rows = $(selectorString);

        if ($rows.length === 0) {
            if (loader) loader.classList.remove('is-loading');
            // Always update dashboard even if no new rows, to ensure counts are fresh
            if (typeof window.updateDashboardValues === "function") window.updateDashboardValues();
            return;
        }

        const YMSCodesSet = new Set(["IBVEND", "IBUNSELL", "IBPROBSOLV", "IBCRET", "IBTRANS", "IBUNDELIV", "IBMISSHIP", "IBREJECT","FULLPOD", "EMPTYPOD", "IBFoundLoaded", "IBDONATE", "RMVLIQEMPTY", "RMVRECEMPTY", "RMVLTLEMPTY", "RMVDONEMPTY", "RMVLIQ", "RMVREC", "RMVLTL", "RMVDON", "OBSCHED", "OBLATE", "OBVRET", "OBTHO", "OBRTD", "OBTRANSLOAD", "OBDEPARTED", "OBRECOVERY", "LNCHPOD", "WASTE", "APSTORAGE", "NONAPSTORAGE", "LEGALHOLD", "NIEMPTY", "OBEMPTY","OBMISLOAD", "IBEMPTY", "NICONSUM", "NIBADWOOD", "NIWOOD", "NIAMXL", "NIUSPS", "NIBADUPP", "NIUPP", "NIBADTOTES", "NITOTES", "NIBADCARTS", "NICARTS","NIRECY", "NISTORAGE", "NIFRESHGUPP"].map(c => c.toLowerCase()));

        $rows.each(function () {
            const $row = $(this);
            hasBeenChanged = true;

            // --- Data Extraction ---
            const owneropField = $row.children(".col8").find(".ownerOperatorCodeGroup span").text().split(" ");
            let scac = owneropField.length > 1 ? owneropField[0] : "";
            let operator = owneropField.length > 1 ? owneropField[1].replace(/[\(\)]/g, "") : "";

            const offsite = $row.children(".col1").text().includes("OSY");
            const empty = $row.children(".col2").find(".yardasset-empty").length > 0;
            const loaded = $row.children(".col2").find(".yardasset-full").length > 0;
            const inprogress = $row.children(".col2").find(".yardasset-in-progress").length > 0;
            const hasVRID = $row.children(".col9").find("div.load-identifiers").text().includes("VRID ");
            const hasISA = $row.children(".col9").find("div.load-identifiers").text().includes("ISA ");
            const occupied = !$row.hasClass("empty-location");
            const note = $row.find("div#noteContainer p").text().toLowerCase();
            const dwellTime = $row.find("td.col4 span").text();
            const visitReasonRaw = $row.find(".col5>div").text().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

            // --- Category Flags Initialization ---
            let cats = {
                "azng": 0, "aznu": 0, "azna": 0, "aap": 0, "3p": 0,
                "empty": empty ? 1 : 0, "loaded": loaded ? 1 : 0, "inprogress": inprogress ? 1 : 0,
                "hasVRID": hasVRID ? 1 : 0, "hasISA": hasISA ? 1 : 0,
                "trailer": 0, "tractor": 0, "boxtruck": 0, "airplane": 0, "car": 0, "van": 0, "person": 0, "otherasset": 0,
                "yellowtagged": $row.find("div.yard-asset-yellow").length > 0 ? 1 : 0,
                "redtagged": $row.find("div.yard-asset-red").length > 0 ? 1 : 0,
                "hastagnote": note.includes(" tagged") ? 1 : 0,
                "hassealnote": (note.includes("yes seal at ci") || note.includes("no seal at ci") || note.includes("undetermined seal condition due to")) ? 1 : 0,
                "hasbolnote": (note.includes("bolwseal") || note.includes("bolwoutseal") || note.includes("blue flag")) ? 1 : 0,
                "blueflag": note.includes("blue flag") ? 1 : 0,
                "hasymsnote": 1, // Default to true, logic below validates
                "hasgoodwoodpalletsnote": note.includes("niwood") ? 1 : 0,
                "hasbadwoodpalletsnote": note.includes("nibadwood") ? 1 : 0,
                "hasuppnote": note.includes("niupp") ? 1 : 0,
                "hasemptytotesnote": note.includes("nitotes") ? 1 : 0,
                "inbound": visitReasonRaw === "inbound" ? 1 : 0,
                "outbound": visitReasonRaw === "outbound" ? 1 : 0,
                "noninventory": visitReasonRaw === "noninventory" ? 1 : 0,
                "longdwell": isMoreThanHours(dwellTime, 72) ? 1 : 0,
                "offsite": offsite ? 1 : 0,
                "parkingslip": $row.find(".col1 div.location-type-ParkingLocation").length > 0 ? 1 : 0,
                "dockdoor": $row.find(".col1 div.location-type-ProcessingLocation").length > 0 ? 1 : 0
            };

            // --- SCAC Logic ---
            if (["AZNG", "AZNU", "AZNA"].includes(scac)) {
                cats[scac.toLowerCase()] = 1;
                cats.aap = 1;
            } else {
                cats["3p"] = 1;
            }

            // --- Asset Type Icon Detection ---
            if ($row.find(".yard-asset-icon-TRAILER, [class*='yard-asset-icon-TRAILER_']").length > 0) cats.trailer = 1;
            if ($row.find(".yard-asset-icon-TRAILER_INTERMODAL").length > 0) cats.intermodal = 1;
            if ($row.find("[class*='yard-asset-icon-TRAILER_PUP']").length > 0) cats.pup = 1;

            const isTractorIcon = $row.find(".yard-asset-icon-TRACTOR, .yard-asset-icon-TRACTOR_FLATBED").length > 0;
            if (isTractorIcon && (cats.trailer || cats.intermodal || cats.pup)) {
                hasTractor = true;
            } else if (isTractorIcon) {
                cats.tractor = 1;
            } else {
                if (hasTractor) cats.tractor = 1;
                hasTractor = false;
            }

            if ($row.find("[class*='yard-asset-icon-BOX_TRUCK']").length > 0) cats.boxtruck = 1;
            if ($row.find(".yard-asset-icon-AIRPLANE").length > 0) cats.airplane = 1;
            if ($row.find(".yard-asset-icon-CAR").length > 0) cats.car = 1;
            if ($row.find(".yard-asset-icon-SPRINTER_VAN").length > 0) cats.van = 1;
            if ($row.find(".yard-asset-icon-MOTORCYCLE, .yard-asset-icon-THREE_WHEELER").length > 0) cats.otherasset = 1;

            // --- YMS Note Validation ---
            const hasValidCode = Array.from(YMSCodesSet).some(code => note.includes(code));
            if (!hasValidCode && occupied) cats.hasymsnote = 0;

            // --- Dwell/Compliance Styling ---
            const redLimit = settings.notesCompliance_redFlagLimit || 72;
            const yellowLimit = settings.notesCompliance_yellowFlagLimit || 12;

            if (settings.enable_notesCompliance) {
                if (isMoreThanHours(dwellTime, redLimit)) $row.attr("dwell", "red");
                else if (isMoreThanHours(dwellTime, yellowLimit)) $row.attr("dwell", "yellow");
                else $row.removeAttr("dwell");
            }

            // --- Final Attribute Stamping ---
            $row.attr("category_scac", scac);
            $row.attr("category_operator", operator);
            for (let cat in cats) {
                $row.attr("category_" + cat, cats[cat]);
            }
            $row.attr("categoriesApplied", "1");
        });

        if (hasBeenChanged) {
            if (typeof updateFilteredResults === "function") updateFilteredResults();
            if (typeof window.updateDashboardValues === "function") window.updateDashboardValues();
        }

        if (loader) {
            setTimeout(() => loader.classList.remove('is-loading'), 500);
        }
    };

    window.updateDashboardValues = function() {
        // First, make sure the tiles exist (if they were added/removed in Edit tab)
        if ($(".quickViewFilter").length === 0) renderQuickViewTiles();

        document.querySelectorAll(".dashboardCard, .quickViewFilter").forEach(card => {
            const filter = card.getAttribute("data-filter") || card.querySelector("p")?.getAttribute("filters");
            if (!filter) return;

            const selector = getCSSSelectorFromFilter(filter);

            // Count from Table View
            const tableCount = document.querySelectorAll(`tbody.masterYardLP > tr${selector}`).length;

            // Count from Brief View
            const briefCount = document.querySelectorAll(`.brief-dashboard .location-name-occupied${selector}`).length;

            const total = tableCount + briefCount;
            const p = card.querySelector("p");
            if (p) p.textContent = total;
        });
    };

    // Adds the 'Copy' icon to all Vehicle IDs for one-click clipboard action
    window.updateLicensePlateCopyButtons = function() {
        if (!settings.showLicenseCopy) return;

        // Target the specific AngularJS spans for vehicle numbers
        const selector = "span[ng-if*='vehicleNumber'], span[ng-if*='licensePlateIdentifier'], div[ng-show*='vehicleNumber']";

        $(selector).each(function() {
            const $el = $(this);
            const number = $el.text().split("\n")[0].trim();

            // Only add if not already present
            if ($el.parent().find(".superuserSmallButton").length === 0) {
                $el.parent().append(
                    $(`<img src="https://amazonaws.com"
                        class="superuserSmallButton superuserTooltip"
                        title="Copy Vehicle ID: ${number}"
                        style="cursor:pointer; width:16px; margin-left:5px;">`)
                    .on('click', function() {
                        navigator.clipboard.writeText(number.split(" ")[0]);
                        $(this).attr("src", "https://amazonaws.com");
                        setTimeout(() => $(this).attr("src", "https://amazonaws.com"), 2000);
                    })
                );
            }
        });
    };

    // Refactored DDU Logic
    window.updateDDUDisplay = function() {
        if (!settings.enable_DDUDoors) return;

        $('table#ship-clerk-dashboard-table > tbody > tr').each(function() {
            const routeAttr = $(this).find("[ng-if='yardAsset.hasLane']").attr("title");
            if (routeAttr && routeAttr.includes("DDU-")) {
                const routeNum = routeAttr.split("-").pop();
                // Stamping the route num for potential CSS styling
                $(this).attr("category_ddu_route", routeNum);
            }
        });
    };

    const applyFilter = (filter, name) => {
        appliedFilter = filter;
        const selector = filter ? getCSSSelectorFromFilter(filter) : null;

        document.querySelectorAll("tbody.masterYardLP > tr").forEach(row => {
            if (!selector) row.style.display = "";
            else row.style.display = row.matches(selector) ? "" : "none";
        });

        $(".currentFilterBox").toggle(!!filter).text(`Filter: ${name}`);
    };

    // ========== UI Builders ==========
    const EditTabManager = {
        // 1. MAIN RENDER
        render: function(containerId) {
            $(containerId).html(`
            <div id="dashboardEditTab" style="display: grid; grid-template-columns: 280px 1fr; height: 710px; background: #eee; overflow: hidden; border: 1px solid #000;">
                <div class="edit-sidebar" style="border-right: 1px solid #000; background: #f4f4f4; display: flex; flex-direction: column; height: 100%; overflow: hidden;">
                    <div style="padding:10px; background:#0071bc; color:white; font-weight:bold; flex-shrink: 0;">
                        <span>Structure Editor</span>
                    </div>
                    <div id="edit-list-container" style="flex: 1; overflow-y: auto; padding: 5px; background: white;"></div>
                    <div style="padding:10px; background:#eee; display:flex; gap:5px; border-top: 1px solid #ccc; flex-shrink: 0;">
                        <button class="yms-button greenButton" onclick="EditTabManager.createNewFilter()" style="flex:1; padding:8px; font-size:11px; background:#2e6930; color:white;">+ Filter</button>
                        <button class="yms-button greenButton" onclick="EditTabManager.createNewCategory()" style="flex:1; padding:8px; font-size:11px; background:#2e6930; color:white;">+ Category</button>
                    </div>
                </div>
                <div id="editor-workspace" style="padding:20px; overflow-y:auto; background: white; height: 100%;">
                    <p class="superuserFont" style="text-align:center; margin-top:50px;">Select an item from the sidebar to edit.</p>
                </div>
            </div>
        `);
            this.refreshList();
        },

        // 2. SIDEBAR REFRESH
        refreshList: function() {
            const container = $('#edit-list-container');
            container.empty();

            Object.values(settings.dashboardCategories).forEach(cat => {
                container.append(`
                <div class="itemlistitem category-item" onclick="EditTabManager.openCategoryEditor('${cat.id}')"
                     style="padding:8px; background:#00519c; color:white; font-weight:bold; margin-bottom:2px; cursor:pointer;">
                    📁 ${cat.name}
                </div>
            `);

                Object.values(settings.dashboardFilters)
                    .filter(f => f.category === cat.id)
                    .forEach(filter => {
                    container.append(`
                        <div class="itemlistitem filter-item" onclick="EditTabManager.openEditor('${filter.id}')"
                             style="padding:8px 8px 8px 25px; background:white; color:black; border-bottom:1px solid #eee; cursor:pointer; font-size:12px;">
                            • ${filter.title}
                        </div>
                    `);
                });
            });
        },

        // 3. CATEGORY LOGIC
        openCategoryEditor: function(id) {
            const cat = settings.dashboardCategories[id];
            $('#editor-workspace').html(`
            <h3 class="superuserFont">Editing Category: ${cat.name}</h3>
            <div style="margin-bottom:20px;">
                <label>Category Name:</label><br>
                <input type="text" id="edit-cat-name" value="${cat.name}" style="width:100%; padding:8px; margin-top:5px;">
            </div>
            <button class="yms-button blueButton" onclick="EditTabManager.saveCategory('${id}')">Save Category</button>
            <button class="yms-button redButton" onclick="EditTabManager.deleteCategory('${id}')" style="background:#dd2222; color:white;">Delete Category</button>
        `);
        },

        saveCategory: function(id) {
            settings.dashboardCategories[id].name = $('#edit-cat-name').val();
            saveSettings();
            this.refreshList();
            if (typeof renderDashboardCards === "function") renderDashboardCards();
            alert("Category saved!");
        },

        deleteCategory: function(id) {
            if (confirm("Delete this category? Filters inside will become uncategorized.")) {
                delete settings.dashboardCategories[id];
                saveSettings();
                this.refreshList();
                $('#editor-workspace').html('<p>Category deleted.</p>');
                if (typeof renderDashboardCards === "function") renderDashboardCards();
            }
        },

        createNewCategory: function() {
            const newId = crypto.randomUUID();
            settings.dashboardCategories[newId] = { id: newId, name: "New Category" };
            saveSettings();
            this.refreshList();
            this.openCategoryEditor(newId);
        },

        // 4. FILTER LOGIC
        createNewFilter: function() {
            const newId = crypto.randomUUID();
            // Default to first category if it exists
            const firstCat = Object.keys(settings.dashboardCategories)[0] || "NA";
            settings.dashboardFilters[newId] = {
                id: newId,
                category: firstCat,
                title: "New Filter",
                filters: "empty=1",
                enableNotifs: "0",
                quickView: "0"
            };
            saveSettings();
            this.refreshList();
            this.openEditor(newId);
        },

        // Uses your existing logic for buildConditionBlock and openEditor
        openEditor: function(id) {
            const filter = settings.dashboardFilters[id];
            const subFilters = filter.filters.split("|");

            // Category dropdown for filter organization
            const catOptions = Object.values(settings.dashboardCategories).map(c =>
                                                                               `<option value="${c.id}" ${filter.category === c.id ? 'selected' : ''}>${c.name}</option>`
                                                                              ).join('');
            const quickViewStatus = filter.quickView === "1" ? "selected" : "";

            let html = `
            <div class="filter-header" style="display:flex; gap:10px; margin-bottom:20px; padding-bottom:15px; border-bottom:2px solid #0071bc; align-items:center;">
                <div style="flex:1">
                    <label style="font-weight:bold; font-size:12px;">Filter Name</label>
                    <input type="text" id="edit-title" value="${filter.title}" style="width:100%; padding:8px; border:1px solid #ccc;">
                </div>
        <div style="width:100px">
            <label style="font-weight:bold; font-size:12px;">QuickView</label>
            <select id="edit-quickview" style="width:100%; padding:8px;">
                <option value="0">Off</option>
                <option value="1" ${

            quickViewStatus}>On</option>
            </select>
        </div>
                <div style="width:150px">
                    <label style="font-weight:bold; font-size:12px;">Category</label>
                    <select id="edit-filter-cat" style="width:100%; padding:8px;">${catOptions}</select>
                </div>
                <div style="display:flex; gap:5px; align-items:flex-end; padding-top:15px;">
                    <button class="yms-button blueButton" onclick="EditTabManager.saveFilter('${id}')">Save</button>
                    <button class="yms-button orangeButton" onclick="EditTabManager.addCondition()">+ OR</button>
                    <button class="yms-button redButton" onclick="EditTabManager.deleteFilter('${id}')" style="background:#dd2222; color:white;">Del</button>
                </div>
            </div>
            <div id="sub-filter-container">${subFilters.map((sf, idx) => this.buildConditionBlock(sf, idx)).join('')}</div>
        `;
            $('#editor-workspace').html(html);
        },

        saveFilter: function(id) {
            const newTitle = $('#edit-title').val();
            const newCat = $('#edit-filter-cat').val();
            let finalStrings = [];

            $('.logic-block').each(function() {
                let blockParts = [];
                $(this).find('.logic-input').each(function() {
                    if ($(this).val() !== 'NA') blockParts.push(`${$(this).data('key')}=${$(this).val()}`);
                });
                if (blockParts.length > 0) finalStrings.push(blockParts.join(' '));
            });

            settings.dashboardFilters[id].title = newTitle;
            settings.dashboardFilters[id].category = newCat;
            settings.dashboardFilters[id].filters = finalStrings.join('|');
            settings.dashboardFilters[id].quickView = $('#edit-quickview').val();

            saveSettings();
            this.refreshList();
            if (typeof renderDashboardCards === "function") renderDashboardCards();
            alert("Filter saved!");
        },

        deleteFilter: function(id) {
            if (confirm("Delete this filter?")) {
                delete settings.dashboardFilters[id];
                saveSettings();
                this.refreshList();
                $('#editor-workspace').html('<p>Filter deleted.</p>');
                if (typeof renderDashboardCards === "function") renderDashboardCards();
            }
        },

        // Helpers
        addCondition: function() {
            $('#sub-filter-container').append(this.buildConditionBlock("", $('.logic-block').length));
        },

        buildConditionBlock: function(filterStr, index) {
            const schemaToUse = typeof validFilters !== 'undefined' ? validFilters : this.schema;
            // ... (Keep your existing buildConditionBlock code here) ...
            const activeVals = new Map(filterStr.split(' ').filter(s => s.includes('=')).map(p => p.split('=')));
            const groupsHtml = Object.entries(schemaToUse).map(([key, group]) => `
            <div style="border:1px solid #ddd; padding:10px; background:#fcfcfc;">
                <p style="font-weight:bold; margin:0 0 8px 0; font-size:10px; text-transform:uppercase; color:#0071bc;">${group.name}</p>
                <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:4px; font-size:11px;">
                    ${group.values.map(v => {
                const [label, fKey, type] = v.split('|');
                const val = activeVals.get(fKey) || "NA";
                if (type === "text") {
                    return `
            <span>${label}</span>
            <input type="text" class="logic-input" data-key="${fKey}" value="${val}"
                   style="font-size:11px; padding:2px; border:1px solid #ccc;">`;
                }
                return `<span>${label}</span><select class="logic-input" data-key="${fKey}"><option value="NA" ${val === 'NA' ? 'selected' : ''}>-</option><option value="1" ${val === '1' ? 'selected' : ''}>Yes</option><option value="0" ${val === '0' ? 'selected' : ''}>No</option></select>`;
            }).join('')}
                </div>
            </div>
        `).join('');

            return `<fieldset class="logic-block" style="margin-bottom:20px; border:1px solid #000; padding:15px; position:relative; background:#fff;"><legend style="background:#0071bc; color:white; padding:2px 10px; font-weight:bold; font-size:12px;">Condition Group #${index + 1}</legend><button onclick="$(this).parent().remove()" style="position:absolute; top:-10px; right:10px; background:red; color:white; border:none; padding:2px 5px; cursor:pointer;">Remove</button><div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:10px;">${groupsHtml}</div></fieldset>`;
        },

        schema: { /* ... Include your full schema here ... */ }
    };

    window.EditTabManager = EditTabManager;

    const renderDashboardCards = () => {
        const container = $("#tab-dashboard");
        container.empty();
        Object.entries(settings.dashboardCategories).forEach(([catId, cat]) => {
            const deck = $(`<fieldset class="dashboardDeck"><legend>${cat.name}</legend></fieldset>`).appendTo(container);
            Object.values(settings.dashboardFilters).filter(f => f.category === catId).forEach(f => {
                $(`<div class="dashboardCard" data-id="${f.id}">
                    <h1>${f.title}</h1>
                    <p filters="${f.filters}">0</p>
                </div>`).on('click', () => {
                    applyFilter(f.filters, f.title);
                    $("#superuserPanel").hide();
                }).appendTo(deck);
            });
        });
    };

    window.renderQuickViewTiles = function() {
        //console.info("Rendering Quick View Tiles");
        const container = document.getElementById("filters");
        if (!container) return;
        container.innerHTML = ""; // Clear existing tiles

        Object.values(settings.dashboardFilters).forEach(f => {
            if (f.quickView === "1") {
                // 1. Create a native div element
                const tile = document.createElement("div");
                tile.className = "quickViewFilter";
                tile.style.cssText = "cursor:pointer; display:inline-block; margin:2px; padding:2px 8px; background:white; border:1px solid #0071bc; border-radius:2px; min-width:60px;";

                // 2. Set the internal HTML
                tile.innerHTML = `
                <h1 style="margin:0; font-size:9px; color:#0071bc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80px;">${f.title}</h1>
                <p filters="${f.filters}" style="margin:0; font-weight:bold; text-align:center; font-size:12px; color:black;">0</p>
            `;

                // 3. Attach the click event using native addEventListener
                tile.addEventListener('click', function() {
                    if (typeof applyFilter === "function") {
                        applyFilter(f.filters, f.title);
                    }
                });

                // 4. Append to the container
                container.appendChild(tile);
            }
        });
    };

    const initPanel = () => {
        const panelHtml = `
        <div id="superuserPanel">
            <div id="superuserHeader">
            <span>YMS Superuser v3.0 <div id="superuser-status" class="superuser-loader"></div></span>
            <button id="closePanel" class="redButton yms-button">X</button>
            </div>
            <div id="tabsList" style="display:flex; background:#eee; padding:5px; gap:5px; border-bottom:1px solid #000;">
                <div class="yms-button blueButton superuserTabActive" data-tab="dashboard">Dashboard</div>
                <div class="yms-button blueButton" data-tab="edit">Edit Dashboard</div>
                <div class="yms-button blueButton" data-tab="settings">Settings</div>
            </div>
            <div id="panelContent" style="height:calc(100% - 85px); background:white;">
                <div id="tab-dashboard" class="panel-tab"></div>
                <div id="tab-edit" class="panel-tab" style="display:none; height:100%;"></div>
                <div id="tab-settings" class="panel-tab" style="display:none; padding:20px;"></div>
            </div>
        </div>
    `;
        $("body").prepend(panelHtml);

        // Build Dashboard Cards (Original logic)
        renderDashboardCards();

        // --- Tab Switcher Logic ---
        $("[data-tab]").click(function() {
            const target = $(this).data('tab');

            // UI Updates
            $("[data-tab]").removeClass("superuserTabActive");
            $(this).addClass("superuserTabActive");
            $(".panel-tab").hide();
            $(`#tab-${target}`).show();

            // Specific Tab Actions
            if (target === "edit") {
                EditTabManager.render("#tab-edit"); // Tell the manager WHERE to draw
            }
        });

        $("#closePanel").click(() => $("#superuserPanel").hide());
    };

    const initLaunchButton = () => {
        const btn = $(`
            <div style="position:fixed; top:10px; right:50%; transform:translateX(50%); z-index:9999; display:flex;">
                <button class="yms-button blueButton" id="openSuperuser">Dashboard <span id="notifBadge" class="notificationsCount" style="display:none">0</span></button>
                <div class="currentFilterBox yms-button orangeButton" style="display:none"></div>
            </div>
        `).appendTo("body");

        $("#openSuperuser").click(() => $("#superuserPanel").toggle());
        $(".currentFilterBox").click(() => applyFilter("", ""));
    };

    // Ensure jQuery and original styles are loaded first
    const init = () => {
        if (!window.jQuery) {
            console.log("Waiting for jQuery...");
            setTimeout(init, 1000);
            return;
        }

        // 1. Re-inject the original styles from Part 1-5
        // (I'm assuming 'style' variable from your original parts is available)
        //$("<style>").html(style).appendTo("head");

        // 2. Add the NEW Edit Tab styles
        $("<style>").html(`
            #dashboardEditTab { display: grid; grid-template-columns: 300px 1fr; height: 710px; overflow: hidden; background: #fff; }
            .edit-sidebar { border-right: 2px solid #ccc; background: #f5f5f5; display: flex; flex-direction: column; height: 100%; }
            .itemlistbox { flex: 1; overflow-y: auto; padding: 5px; border: 1px solid #000; }
            .editor-workspace { padding: 15px; overflow-y: auto; background: white; border-top: 1px solid #ccc; }
            .filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
            .settingsOption-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; align-items: center; font-size: 12px; }
        `).appendTo("head");

        const filterDiv = $(`<div style="position:fixed; top:10px; right:50%; transform:translateX(50%); z-index:99; display:flex;" id="filters"></div>`).appendTo("#top-section");

        // 3. Initialize the original script's setup()
        // This ensures your original Dashboard and Tabs are built first
        if (typeof setup === "function") setup();

        // 4. Overwrite the Edit Tab initializer to use the new High-Performance Manager
        window.initializeDashboardEditTab = function() {
            EditTabManager.render();
        };
        startObserver();
    };


    // ========== Main Loop ==========
    const setup = () => {
        const saved = localStorage.getItem("YMSSuperuserSettings");
        settings = saved ? JSON.parse(saved) : defaultSettings;

        injectStyles();
        initPanel();
        initLaunchButton();
        //EditTabManager.render();
        // Optimized Unified Interval
        setInterval(() => {
            window.updateCategories();
            // Handle auto-select yard if needed
            if (settings.autoselectYard && $("div.yard-selector select").val() === "") {
                // ... selection logic
            }
            window.updateDashboardValues();
            window.updateDDUDisplay();         // Tracks DDU lanes
            window.updateLicensePlateCopyButtons(); // Adds copy icons
             //$("#filters").appendTo("#top-section");
        }, 2000);

        // UI Refresh Observer (to handle native YMS pagination/refresh)
        const observer = new MutationObserver(() => window.updateCategories(true));
    };

    const startObserver = () => {
        // We observe the body to ensure we don't lose the observer if YMS recreates the table
        const targetNode = document.body;

        const observer = new MutationObserver((mutations) => {
            // Use a flag to avoid triggering multiple times per batch update
            let shouldUpdate = false;

            for (const mutation of mutations) {
                // Check if rows were added to the master yard table
                const addedRows = Array.from(mutation.addedNodes).some(node =>
                                                                       node.nodeName === 'TR' || (node.querySelector && node.querySelector('tr'))
                                                                      );

                if (addedRows) {
                    shouldUpdate = true;
                    break;
                }
            }

            if (shouldUpdate) {
                const container = document.getElementById("filters");
                if (!container) {
                    const filterDiv = $(`<div style="position:fixed; top:10px; right:50%; transform:translateX(50%); z-index:99; display:flex;" id="filters"></div>`).appendTo("#top-section");
                }
                console.log("YMS Superuser: Changes detected, scanning...");
                window.updateCategories();
            }
        });

        // CRITICAL: subtree must be true to catch changes inside the table
        observer.observe(targetNode, { childList: true, subtree: true });
        console.log("YMS Superuser: High-level MutationObserver active.");
    };

    // Start
    if (window.jQuery) {
        //setup();
        //window.EditTabManager = EditTabManager;
        init();
   }
    else {
        const script = document.createElement('script');
        script.src = "https://googleapis.com";
        script.onload = setup;
        document.head.appendChild(script);
    }

})
();


