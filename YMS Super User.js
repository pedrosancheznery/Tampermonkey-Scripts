// ==UserScript==
// @name         YMS Superuser
// @namespace    fyi.lamp.amzn
// @version      2026.04.05.01
// @description  Quality Of Life improvements for YMS
// @author       Pedro Sanchez (pefsanch)
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts
// @updateURL    https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/YMS%20Super%20User.js
// @downloadURL  https://raw.githubusercontent.com/pedrosancheznery/Tampermonkey-Scripts/main/YMS%20Super%20User.js
// @match        https://trans-logistics.amazon.com/yms/shipclerk*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @grant        none
// @require      https://code.jquery.com/jquery-3.7.0.min.js
// @require      https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js
// @run-at       document-end
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

    let appliedFilter = "";

    const defaultSettings = {
        enable_notesCompliance: true,
        enable_sealNotes: false,
        enable_DDUDoors: false,
        enable_dd_range: false,
        dd_range_min: 1,
        dd_range_max: 999,
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
            .dashboardCard p { font-size: 30px; margin: 0; font-weight: bold; }
            .edit-sidebar { border-right: 2px solid #ccc; background: #f5f5f5; display: flex; flex-direction: column; height: 100%; }
            img.superuserSmallButton { width: 20px; height: 20px; border: 1px solid black; border-radius: 2px; padding: 2px; cursor: pointer; background-color: white; box-shadow: inset 10px 10px 10px 10px white; }
            .itemlistbox { flex: 1; overflow-y: auto; padding: 10px; }
            .itemlistitem { padding: 8px; background: #0071bc; color: white; margin-bottom: 2px; cursor: pointer; display: flex; align-items: center; gap: 10px; }
            .itemlistitem:hover { background: #2091dc; }
            .editor-workspace { padding: 20px; overflow-y: auto; background: white; }
            .filter-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
            .logic-block { margin-bottom:20px; border:1px solid #000; padding:15px; position:relative; background:#fff; }
            .miniCard { border:1px solid #ddd; padding:10px; background:#fcfcfc; }
            .miniCardTitle { font-weight:bold; margin:0 0 8px 0; font-size:10px; text-transform:uppercase; color:#0071bc; }
            .settingsInputContainer { display:grid; grid-template-columns: 1.2fr 1fr; gap:4px; font-size:11px; }
            .settingsFieldset { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center; margin-bottom: 10px; }
            .settingsOption-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center; margin-bottom: 10px; }
            .filterSaveOptions { display: flex; gap: 15px; padding-bottom: 20px; border-bottom: 2px solid #eee; margin-bottom: 20px; }
            .orangeButton { background: #C7511F; color: white; }
            #quickViewContainer { display: flex; }
            .quickViewFilter {width: max-content;background-color: white;border: 1px solid black;border-radius: 0;color: black;padding: 2px;margin: 2px;}
            .quickViewFilter { width: max-content; background-color: white; border: 1px solid black; border-radius: 0; color: black; padding: 2px; margin: 2px; }
            .quickViewFilter h1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; max-width: 130px; overflow: hidden; font-size: 10px; padding: 0; }
            .quickViewFilter p { font-size: 10px; font-weight: 900; }
            .superuser-loader {width: 12px;height: 12px;background-color: #22c55e; /* Green */border-radius: 50%;display: inline-block;margin-left: 10px;opacity: 0;transition: opacity 0.3s;}
            .superuser-loader.is-loading {opacity: 1;animation: pulse-green 1s infinite; }
            .superuserTabActive { background: #00519c !important; }
            [dwell='red'] .col11 { background-color: #ffcccc !important; border: 2px solid red !important; }
            [dwell='yellow'] .col11 { background-color: #fff9c4 !important; border: 2px solid orange !important; }
			#tabsList { display: flex; background: #f1f1f1; padding: 10px 10px 0 10px; /* Top/Sides padding, 0 bottom */ gap: 2px; border-bottom: 1px solid #ccc; }
			.super-tab { padding: 8px 16px; cursor: pointer; font-size: 13px; color: #666; border: 1px solid transparent; border-bottom: none; border-radius: 4px 4px 0 0; transition: all 0.2s ease; background: #e0e0e0; }
			.super-tab:hover { background: #e8e8e8; color: #333; }
			.super-tab.active { background: #205493 !important; color: #fff !important; font-weight: bold; border-color: #ccc; position: relative; top: 1px; /* Overlaps the container border to look connected */ }
			#panelContent { height: calc(100% - 85px); background: white; border-top: none; /* Let the tabsList border handle the top */ }
            @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }}
`;
        $("<style>").html(style).appendTo("head");
    };

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

        // Internal helper to update the text area and trigger UI updates
    function commitNoteChange(newText) {
        const $textArea = $("#noteTextArea");
        $textArea.val(newText.trim() + "\n"); // Ensures clean spacing
        $textArea[0].dispatchEvent(new Event("change"));
    }

    function updateSealPresent(status = $("#sealPresentSelect").val()) {
        if (status === "NA") return;

        const currentNotes = $("#noteTextArea").val();
        commitNoteChange(`${status}\n${currentNotes}`);
    }

    function updateYMSNote() {
        const $select = $("#quickNoteSelect");
        const status = $select.val();

        if (status !== "NA") {
            const currentNotes = $("#noteTextArea").val();
            commitNoteChange(`${status}\n${currentNotes}`);

            // Reset dropdown to default
            $select.val("NA");
        }
    }

    function updateTagStatus(status) {
        if (!status || status === "NA") return;

        let lines = $("#noteTextArea").val().split("\n");
        let linesToSkip = 0;
        const firstLine = lines[0];

        // Find if the first line matches any YMS code to preserve formatting
        $("#quickNoteSelect option").each(function() {
            const val = $(this).val();
            if (val !== "NA" && val.split("\n")[0] === firstLine) {
                linesToSkip = val.split("\n").length;
                return false; // Break loop
            }
        });

        // Insert the tag status after the skipped lines
        lines.splice(linesToSkip, 0, status);

        commitNoteChange(lines.join("\n"));
    }

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

            if (settings.enable_dd_range ) applyDockDoorFilter();
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

        const selector = "span[ng-if='yardAsset.vehicleNumber'], span[ng-if='yardAsset.licensePlateIdentifier && yardAsset.licensePlateIdentifier.registrationIdentifier'], div[ng-show='move.yardAssets[0].vehicleNumber']";
        const copyUrl = "https://nathanloppnowtools.s3.us-east-2.amazonaws.com/WhosThatDriver/copy.png";
        const checkUrl = "https://nathanloppnowtools.s3.us-east-2.amazonaws.com/WhosThatDriver/check.png";

        $(selector).each(function () {
            const $this = $(this);
            const text = ($this.html() || "").split("<br>")[0].trim();
            const plate = text.split(" ")[0] || "";
            if (!plate) return;

            // choose a sensible container to append the button; adjust if needed
            const $container = $this.closest("div, td, tr").first();
            if ($container.find("img.superuserSmallButton").length) return;

            const $btn = $("<img>", {
                class: "superuserSmallButton superuserTooltip",
                title: "Copy to clipboard",
                src: copyUrl,
                "data-plate": plate
            });
            $container.append($btn);
        });

        // delegated handler (idempotent: remove previous namespace then attach)
        $(document).off("click.copyPlate").on("click.copyPlate", "img.superuserSmallButton", function () {
            const $btn = $(this);
            const plate = $btn.data("plate") || "";
            if (!plate || !navigator.clipboard) return;

            navigator.clipboard.writeText(plate).then(function () {
                $btn.attr("src", checkUrl);
                setTimeout(function () { $btn.attr("src", copyUrl); }, 3000);
            }).catch(function (err) {
                console.error("Copy failed", err);
            });
        });
    }

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

        $("#currentFilterBox").toggle(!!filter).text(`Filter: ${name}`);
    };

    function updateNotesDisplay() {
        $("#noteEditForm").each(function () {
            const $form = $(this);
            if ($form.find("#superuserNotesDiv").length > 0) return;

            // 1. Data Extraction & Setup
            const modalBody = $("#yms-annotation-modal-body");
            const thisCarrier = modalBody.find("#noteValues :nth-child(2)").text().trim();
            const thisID = modalBody.find("#noteValues :nth-child(3)").text().trim();
            const noteText = $form.find("#noteTextArea").val() || "";

            const $btnHolder = $("<div>", { id: "notesButtonsHolder", style: "width: 80%; margin-bottom: 10px;" });
            const $notesDiv = $("<div>", { id: "superuserNotesDiv", style: "display: inline-block;" });

            $form.prepend($btnHolder);
            $form.append($notesDiv);

            // 2. Carrier-Specific Buttons (Relay Garage)
            const garageCarriers = ["AZNG", "AZNU", "AZNA"];
            if (garageCarriers.includes(thisCarrier)) {
                const garageBase = "https://amazon.com";

                const garageBtns = [
                    { text: "View Unplanned Services", url: `${garageBase}817ca098-8441-4329-a71e-6768f9d7e6c5?tab=Unplanned&ids=${thisID}` },
                    { text: "View Planned Services", url: `${garageBase}817ca098-8441-4329-a71e-6768f9d7e6c5?ids=${thisID}` },
                    { text: "New Unplanned Service", url: `${garageBase}891a81dc-538d-4f10-be93-441545840a24`, click: () => navigator.clipboard.writeText(thisID) }
                ];

                garageBtns.forEach(btn => {
                    const $a = $("<a>", { target: "_blank", href: btn.url })
                    .append($("<p>", { class: "yms-button blueButton superuserTooltip", text: btn.text }));
                    if (btn.click) $a.on('click', btn.click);
                    $btnHolder.append($a);
                });

                if (noteText.toLowerCase().includes("tagged")) {
                    $btnHolder.append($("<a>", { target: "_blank", href: "https://amazon.com" })
                                      .append($("<p>", { class: "yms-button greenButton superuserTooltip", text: "Open Flip SIM" })));
                }
            }

            // 3. Dynamic Link Detection
            const httpRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;
            const linkMatches = noteText.match(httpRegex);

            if (linkMatches) {
                const linkMap = [
                    { match: ["://amazon.com", "://amazon.com", "://amazon.com"], label: "Open SIM" },
                    { match: ["://amazon.com"], label: "Open AAP" },
                    { match: ["://amazon.com"], label: "Open Paragon" }
                ];

                linkMatches.forEach(link => {
                    let label = "Open Link";
                    const found = linkMap.find(m => m.match.some(domain => link.includes(domain)));
                    if (found) label = found.label;

                    $btnHolder.append($("<a>", { target: "_blank", href: link })
                                      .append($("<p>", { class: "yms-button blueButton superuserTooltip", text: label, title: `Opens ${link}` })));
                });
            }

            // 4. Seal & Tagging Section
            if (settings.enable_sealNotes) {
                const $sealDiv = $("<div>", { id: "sealStatusDiv", style: "display: flex;" }).appendTo($notesDiv);
                const $sealSelect = $("<select>", { id: "sealPresentSelect", class: "superuserSelect superuserFont" }).on("change", updateSealPresent);

                const sealOptions = [
                    ["Seal Status", "NA"], ["Yes", "Yes seal at CI"], ["No", "No seal at CI"],
                    ["Undetermined - CI Miss", "Undetermined seal condition due to check-in miss"],
                    ["Undetermined - Weather", "Undetermined seal condition due to weather conditions"],
                    ["Undetermined - Camera", "Undetermined seal condition due to camera issues"],
                    ["Undetermined - Visibility", "Undetermined seal condition due to visibility problems"],
                    ["Undetermined (Must add reason)", "Undetermined seal condition due to "]
                ];
                sealOptions.forEach(opt => $sealSelect.append(new Option(opt[0], opt[1])));
                $sealDiv.append($sealSelect);

                $sealDiv.append($("<p>", { text: "Yes Seal", class: "yms-button blueButton quickNoteButton" }).click(() => updateSealPresent("Yes seal at CI")));
                $sealDiv.append($("<p>", { text: "No Seal", class: "yms-button blueButton quickNoteButton" }).click(() => updateSealPresent("No seal at CI")));
                $notesDiv.append("<br>");
            }

            // 5. BOL & Blue Flag
            if (settings.ixd_bol == "1") {
                const $bolDiv = $("<div>", { id: "bolStatusDiv", style: "display: flex;" }).appendTo($notesDiv);
                $bolDiv.append($("<p>", { text: "Yes Seal On BOL", class: "yms-button blueButton quickNoteButton" }).click(() => updateSealPresent("BOLWSEAL")));
                $bolDiv.append($("<p>", { text: "No Seal On BOL", class: "yms-button blueButton quickNoteButton" }).click(() => updateSealPresent("BOLWOUTSEAL")));

                if (settings.ixd_blueflag == "1") {
                    $notesDiv.append("<br>");
                    const $bfDiv = $("<div>", { id: "blueFlagStatusDiv", style: "display: flex;" }).appendTo($notesDiv);
                    const bfFlags = ["Mismatch Seal", "Missing Seal", "Tampered Seal"];
                    bfFlags.forEach(f => {
                        $bfDiv.append($("<p>", { text: `Blue Flag - ${f}`, class: "yms-button blueButton quickNoteButton" }).click(() => updateSealPresent(`Blue Flag Trailer\n${f}`)));
                    });
                } else {
                    $bolDiv.append($("<p>", { text: "Blue Flag", class: "yms-button blueButton quickNoteButton" }).click(() => updateSealPresent("Blue Flag Trailer")));
                }
                $notesDiv.append("<br>");
            }

            // 6. Tags & DateTime
            const currentDateTime = new Date().toLocaleString();
            const $tagDiv = $("<div>", { id: "tagStatusDiv", style: "display: flex;" }).appendTo($notesDiv);
            const tagStyles = [
                { text: "Yellow Tag", cls: "yellowButton", val: "YELLOW TAGGED\nCASE NUMBER: \nYELLOW TAGGED BY: \nISSUE: \n" },
                { text: "Red Tag", cls: "redButton", val: "RED TAGGED\nCASE NUMBER: \nRED TAGGED BY: \nISSUE: \n" },
                { text: "Insert Date/time", cls: "whiteButton", val: currentDateTime }
            ];
            tagStyles.forEach(t => {
                $tagDiv.append($("<p>", { text: t.text, class: `yms-button ${t.cls} quickNoteButton` }).click(() => updateTagStatus(t.val)));
            });

            // 7. YMS Codes Dropdown
            $notesDiv.append("<br>");
            const $ymsSelect = $("<select>", { id: "quickNoteSelect", class: "superuserSelect width100 superuserFont" }).on("change", updateYMSNote);
            $ymsSelect.append(new Option("Add YMS Code...", "NA"));

            const ymsData = {
                "Inbound": [
                    ["Inbound Problem Solve", "IBPROBSOLV"], ["Inbound Vendor", "IBVEND"], ["Unsellables", "IBUNSELL"],
                    ["Customer Returns", "IBCRET"], ["Transship", "IBTRANS"], ["Undeliverables", "IBUNDELIV"],
                    ["Misship - Requires Case", "IBMISSHIP\nCase: \n"], ["Rejection - Requires Case", "IBREJECT\nCase: \n"],
                    ["Inbound Found Loaded", "IBFoundLoaded \n"], ["Inbound Donations", "IBDONATE"], ["Loaded Trailer for launch", "FULLPOD"]
                ],
                "Outbound": [
                    ["OB Scheduled - >24hr", "OBSCHED"], ["OB Late - Past SDT", "OBLATE"], ["OB Trailer Hand Off", "OBTHO"],
                    ["OB Vender Returns", "OBVRET"], ["OB Misloaded Trailer", "OBMISLOAD"],
                    ["OB Liq/Don/Rmv", `TOM SDN: OBSCHED\nRELO SDN: HOU3SCHED\nLoad Content Description: RMV-LIQ\nLogin: pefsanch\nDate: ${new Date().toLocaleDateString('en-US')}\nEscalation Needed? (Y/N) N\nEscalation OM Login: \nSIM Link: \nOther Notes: \n`]
                ],
                "Non-Inventory": [
                    ["Empty Go Carts", "NICARTS"], ["Broken Go Carts", "NIBADCARTS"], ["Empty Totes (Yellow)", "NITOTES"],
                    ["Universal Pallets", "NIUPP"], ["Good Wood Pallets", "NIWOOD"], ["Broken Wood Pallets", "NIBADWOOD"],
                    ["Consumables", "NICONSUM"], ["Loaded Recycling", "RMVREC"]
                ],
                "Empty": [
                    ["IB 3P Empty", "IBEMPTY"], ["OB 3P Empty", "OBEMPTY"], ["Non-Inventory Empty", "NIEMPTY"], ["Empty POD", "EMPTYPOD"]
                ]
            };

            Object.keys(ymsData).forEach(groupLabel => {
                const $group = $("<optgroup>", { label: groupLabel });
                ymsData[groupLabel].forEach(opt => $group.append(new Option(opt[0], opt[1])));
                $ymsSelect.append($group);
            });

            if (settings.ixd_notes == "1") {
                const $ixdGroup = $("<optgroup>", { label: "IXD" });
                const ixdOpts = [["OB Scheduled <24hr", "OBRTD"], ["OB Trans-load", "OBTRANSLOAD"], ["OB Departed Action", "OBDEPARTED"]];
                ixdOpts.forEach(opt => $ixdGroup.append(new Option(opt[0], opt[1])));
                $ymsSelect.append($ixdGroup);
            }

            $notesDiv.append($ymsSelect);
        });
    }

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

            // Build everything as a single string for better performance
            let html = '';

            Object.values(settings.dashboardCategories).forEach(cat => {
                // Start the collapsible group
                // Use 'open' attribute if you want them expanded by default
                html += `
        <details class="category-group" style="margin-bottom: 2px;">
            <summary class="itemlistitem category-item"
                     style="padding:8px; background:#00519c; color:white; font-weight:bold; cursor:pointer; list-style:none; outline:none;">
                <span style="margin-right: 5px;">📁</span> ${cat.name}
            </summary>

            <div class="category-content">
                <!-- Action button to edit the category itself -->
                <div onclick="EditTabManager.openCategoryEditor('${cat.id}')"
                     style="padding:5px 8px 5px 25px; background:#e1f0ff; color:#00519c; font-size:11px; cursor:pointer; border-bottom:1px solid #ccc;">
                    ⚙️ Edit Category Name
                </div>`;

                // Add the filters belonging to this category
                Object.values(settings.dashboardFilters)
                    .filter(f => f.category === cat.id)
                    .forEach(filter => {
                    html += `
                <div class="itemlistitem filter-item" onclick="EditTabManager.openEditor('${filter.id}')"
                     style="padding:8px 8px 8px 25px; background:white; color:black; border-bottom:1px solid #eee; cursor:pointer; font-size:12px;">
                    • ${filter.title}
                </div>`;
                });

                html += `
            </div>
        </details>`;
            });

            container.html(html);
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
            <button class="yms-button" onclick="EditTabManager.saveCategory('${id}')">Save Category</button>
            <button class="yms-button-secondary" onclick="EditTabManager.deleteCategory('${id}')">Delete Category</button>
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
                    <button class="yms-button" onclick="EditTabManager.saveFilter('${id}')">Save</button>
                    <button class="yms-button orangeButton" onclick="EditTabManager.addCondition()">+ OR</button>
                    <button class="yms-button-secondary" onclick="EditTabManager.deleteFilter('${id}')">Del</button>
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
            <div class="miniCard">
                <p class="miniCardTitle">${group.name}</p>
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

        schema: { }
    };

    window.EditTabManager = EditTabManager;

    const renderDashboardCards = () => {
        const container = $("#tab-dashboard");
        container.empty();
        Object.entries(settings.dashboardCategories).forEach(([catId, cat]) => {
            const deck = $(`<fieldset class="dashboardDeck"><legend style="font-size: 14px; font-weight: bold">${cat.name}</legend></fieldset>`).appendTo(container);
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
    <div id="superuserHeader" style="display: flex; align-items: center; justify-content: space-between; padding: 5px 10px;">
        <!-- Empty div to balance the flex space so the title stays truly centered -->
        <div style="width: 30px;"></div>
        <span style="flex-grow: 1; text-align: center; font-weight: bold;">
            YMS Superuser v3.0 <div id="superuser-status" class="superuser-loader" style="display:inline-block;"></div>
        </span>
        <button id="closePanel" class="yms-button-secondary" style="width: 30px;">X</button>
    </div>
            <div id="tabsList" style="display:flex; background:#eee; padding:5px; gap:5px; border-bottom:1px solid #000;">
                <div class="super-tab active" data-tab="dashboard">Dashboard</div>
                <div class="super-tab" data-tab="edit">Edit Dashboard</div>
                <div class="super-tab" data-tab="settings">Settings</div>
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
            $("[data-tab]").removeClass("active");
            $(this).addClass("active");
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
                <button class="yms-button" id="openSuperuser">Dashboard <span id="notifBadge" class="notificationsCount" style="display:none">0</span></button>
                <button class="yms-button orangeButton" id="currentFilterBox" style="background: #C7511F"></button>
            </div>
        `).appendTo("body");

        $("#openSuperuser").click(() => $("#superuserPanel").toggle());
        $("#currentFilterBox").hide().click(() => applyFilter("", ""));
    };

    function initializeSettingsTab() {
        // 1. Helper for clean option generation
        const genOptions = (opts) => opts.map(o => `<option value="${o.v}">${o.t}</option>`).join('');

        // 2. Build entire HTML as one string
        const html = `
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:10px;">
        <div class="miniCard">
            <p class="miniCardTitle">Auto-Update Intervals (Changes effective upon page reload)</p>
            <p>It is highly recommended to keep these settings at the default or higher values.</p>
            <div class="settingsInputContainer">
                <p class="superuserHoverTooltip superuserTooltip" title="Notes Compliance Update">Notes Compliance</p>
                <select class="superuserSelect" superUserSetting="refresh_notesCompliance">
                    ${genOptions([{t:"1 Second",v:1000},{t:"5 Seconds",v:5000},{t:"10 Seconds (Default)",v:10000},{t:"30 Seconds",v:30000},{t:"1 Minute",v:60000}])}
                </select>
                <p class="superuserHoverTooltip superuserTooltip" title="Filter Update Speed">Filtered Results</p>
                <select class="superuserSelect" superUserSetting="refresh_filteredResults">
                    ${genOptions([{t:"1 Second",v:1000},{t:"5 Seconds (Default)",v:5000},{t:"1 Minute",v:60000}])}
                </select>
            </div>
        </div>

        <div class="miniCard">
             <p class="miniCardTitle">Misc. Settings</p>
            <div class="settingsInputContainer">
                <p class="superuserHoverTooltip superuserTooltip" id="autoselectYardText" title="Auto-select site">Amazon Account Auto-Select Site</p>
                <input class="superuserSelect" superUserSetting="autoselectYard" type="text">
            </div>
        </div>

        <div class="miniCard">
             <p class="miniCardTitle">IXD Settings</p>
            <div class="settingsInputContainer">
                <p class="superuserHoverTooltip superuserTooltip" title="BOL Verification Buttons">BOL Verification</p>
                <select class="superuserSelect" superUserSetting="ixd_bol"><option value="1">Enabled</option><option value="0">Disabled</option></select>
                <p class="superuserHoverTooltip superuserTooltip" title="Blue Flag Buttons">Blue Flag Trailer Options</p>
                <select class="superuserSelect" superUserSetting="ixd_blueflag"><option value="1">Enabled</option><option value="0">Disabled</option></select>
                <p class="superuserHoverTooltip superuserTooltip" title="IXD YMS Codes">IXD QuickNotes Dropdown</p>
                <select class="superuserSelect" superUserSetting="ixd_notes"><option value="1">Enabled</option><option value="0">Disabled</option></select>
            </div>
        </div>

        <div class="miniCard">
             <p class="miniCardTitle superuserTooltip" title="Notes Compliance">
                Notes Compliance
            </p>
            <div class="settingsInputContainer">
             <p class="miniCardTitle superuserTooltip" title="Enable Seal Notes">
                <input superUserSetting="enable_sealNotes" class="enableFeatureCheckbox" type="checkbox"> Seal Notes
            </p>
            <input superUserSetting="enable_notesCompliance" class="enableFeatureCheckbox" type="checkbox">Enable Notes Compliance
                <p class="superuserHoverTooltip superuserTooltip" title="Hours until red flag">Red Flag Limit</p>
                <select class="superuserSelect" superUserSetting="notesCompliance_redFlagLimit">
                    ${genOptions([{t:"0 Hours",v:0},{t:"4 Hours",v:4},{t:"12 Hours",v:12},{t:"24 Hours",v:24},{t:"48 Hours",v:48},{t:"72 Hours",v:72}])}
                </select>
                <p class="superuserHoverTooltip superuserTooltip" title="Hours until yellow flag">Yellow Flag Limit</p>
                <select class="superuserSelect" superUserSetting="notesCompliance_yellowFlagLimit">
                    ${genOptions([{t:"0 Hours",v:0},{t:"4 Hours",v:4},{t:"12 Hours",v:12},{t:"24 Hours",v:24},{t:"48 Hours",v:48}])}
                </select>
            </div>
        </div>
<div class="miniCard">
     <p class="miniCardTitle">Dock Door Filter Range</p>
    <div class="settingsInputContainer">
                <input superUserSetting="enable_dd_range" class="enableFeatureCheckbox" type="checkbox"><p class="superuserHoverTooltip" title="Enable Range">Enable Dock Door Range</p>
        <p class="superuserHoverTooltip" title="Minimum DD Number">Min DD#</p>
        <input class="superuserSelect" superUserSetting="dd_range_min" type="number" placeholder="1">
        <p class="superuserHoverTooltip" title="Maximum DD Number">Max DD#</p>
        <input class="superuserSelect" superUserSetting="dd_range_max" type="number" placeholder="999">
    </div>
</div>
        <p class="tooltipText" style="display:none;">-</p>
        </div>
    `;

        // 3. Batch Injection
        const $tab = $("#tab-settings").empty().append(html);
        const $inputs = $tab.find("[superUserSetting]");

        // 4. Optimized Value Initialization (No eval)
        $inputs.each(function() {
            const path = $(this).attr("superUserSetting").split('.');
            let val = path.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, settings);

            if ($(this).is(":checkbox")) {
                $(this).prop("checked", !!val);
            } else {
                $(this).val(val);
            }
        });

        // 5. Delegated Event Handling (Cleaner & Faster)
        $tab.on("change", "[superUserSetting]", function() {
            const $el = $(this);
            const path = $el.attr("superUserSetting").split('.');
            const val = $el.is(":checkbox") ? $el.prop("checked") : $el.val();

            // Update nested settings object dynamically
            let target = settings;
            for (let i = 0; i < path.length - 1; i++) {
                if (!target[path[i]]) target[path[i]] = {};
                target = target[path[i]];
            }
            target[path[path.length - 1]] = val;

            saveSettings();
        });

        // 6. Tooltip Logic
        $tab.on("mouseenter mouseleave", "[superuserHoverText]", function(e) {
            const $tip = $(".tooltipText");
            if (e.type === "mouseenter") {
                $tip.text($(this).attr("superuserHoverText")).show();
            } else {
                $tip.hide().text("-");
            }
        });

        // 7. Cleanup: Hide empty fieldsets
        $tab.find("fieldset.settingsFieldset").each(function() {
            if ($(this).find(".settingsInputContainer").children().length === 0 && !$(this).find('input').length) {
                $(this).hide();
            }
        });
    }

    function applyDockDoorFilter() {
        const min = parseInt(settings.dd_range_min) || 1;
        const max = parseInt(settings.dd_range_max) || 999;
        const rangeActive = settings.enable_dd_range;

        $(".masterYardLP tr.ng-scope").each(function() {
            const $row = $(this);
            const ddText = $row.find(".short-name-distinguished a.ng-binding").text().trim();
            // Regex matches "DD" followed by numbers
            const doorMatch  = ddText.match(/DD(\d+)$/);

            if ( rangeActive && doorMatch ) {
                const ddNumber = parseInt(doorMatch [1]);
                //console.debug(rangeActive, min, max, doorMatch[1]);
                if (ddNumber >= min && ddNumber <= max) {
                    $row.show();
                } else {
                    $row.hide();
                }
            } else {
                $row.show();
            }
        });
    }

    // Ensure jQuery and original styles are loaded first
    const init = () => {
        if (!window.jQuery) {
            console.log("Waiting for jQuery...");
            setTimeout(init, 1000);
            return;
        }

        const filterDiv = $("#mainContainer").prepend("<div id='dashboardQuickView' class='flex-container'><div id='filters' class='flex-container'></div></div>");

        // 1. Initialize the original script's setup()
        // This ensures your original Dashboard and Tabs are built first
        if (typeof setup === "function") setup();

        // 2. Overwrite the Edit Tab initializer to use the new High-Performance Manager
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
        initializeSettingsTab();
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
        const targetNode = document.body;

        const observer = new MutationObserver((mutations) => {
            let tableChanged = false;
            let modalOpened = false;

            for (const mutation of mutations) {
                // 1. Check for Table/Row updates (for Dashboard/Categories)
                const hasNewRows = Array.from(mutation.addedNodes).some(node =>
                    node.nodeName === 'TR' || (node.querySelector && node.querySelector('tr'))
                );
                if (hasNewRows) tableChanged = true;

                // 2. Check for Note Modal opening
                const hasNoteForm = Array.from(mutation.addedNodes).some(node =>
                    node.id === 'noteEditForm' || (node.querySelector && node.querySelector('#noteEditForm'))
                );
                if (hasNoteForm) modalOpened = true;
                if (tableChanged && modalOpened) break; // Optimization: stop if both found
            }

            // Task A: Handle Dashboard/Filters
            if (tableChanged) {
                if (!document.getElementById("filters")) {
                    $("#mainContainer").prepend("<div id='dashboardQuickView' class='flex-container'><div id='filters' class='flex-container'></div></div>");
                }
                console.log("YMS Superuser: Table changes detected, updating categories...");
                //console.log( `Current: %c${currentFilter.name}`, "font-weight:bold" );
                if (typeof window.updateCategories === "function") window.updateCategories();

                //if (currentFilter) {
                    //const filter = JSON.parse(currentFilter);
                    //applyFilter(currentFilter.filter, currentFilter.name);
                //}
            }

            // Task B: Handle Notes Modal Refactor
            if (modalOpened || $("#noteEditForm").length > 0) {
                // We check length > 0 as a fallback to ensure we catch it
                updateNotesDisplay();
            }
        });

        observer.observe(targetNode, { childList: true, subtree: true });
        console.log("YMS Superuser: Integrated MutationObserver active.");
    };
    /*
    const startObserver = () => {
        // We observe the body to ensure we don't lose the observer if YMS recreates the table
        const targetNode = document.body;

        const observer = new MutationObserver((mutations) => {
            // Use a flag to avoid triggering multiple times per batch update
            let shouldUpdate = false;

            for (const mutation of mutations) {
                // Check if rows were added to the master yard table
                const addedRows = Array.from(mutation.addedNodes).some(node => node.nodeName === 'TR' || (node.querySelector && node.querySelector('tr')) );

                if (addedRows) {
                    shouldUpdate = true;
                    break;
                }
            }

            if (shouldUpdate) {
                const container = document.getElementById("filters");
                if (!container) {
                    const filterDiv = $("#mainContainer").prepend("<div id='dashboardQuickView' class='flex-container'><div id='filters' class='flex-container'></div></div>");
                }
                console.log("YMS Superuser: Changes detected, scanning...");
                window.updateCategories();
            }
        });

        // CRITICAL: subtree must be true to catch changes inside the table
        observer.observe(targetNode, { childList: true, subtree: true });
        console.log("YMS Superuser: High-level MutationObserver active.");
    };
    */

    // Start
    if (window.jQuery) {
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
