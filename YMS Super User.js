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

    let settings = {};
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

    // ========== CSS Injection ==========
    const injectStyles = () => {
        const style = `
            #superuserPanel { width: 85%; height: 800px; background: #e0e0e0; z-index: 2000; position: fixed; top: 50px; left: 50%; transform: translateX(-50%); border: 1px solid black; box-shadow: 0 0 10px black; color: black; display: none; overflow: hidden; font-family: Verdana, sans-serif; }
            #superuserHeader { background: #0071bc; color: white; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
            .dashboardDeck { border: 2px solid black; display: flex; flex-wrap: wrap; gap: 10px; margin: 10px; padding: 10px; }
            .dashboardCard { width: 140px; height: 140px; background: white; border: 2px solid black; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; }
            .dashboardCard h1 { font-size: 12px; margin: 0; text-align: center; }
            .dashboardCard p { font-size: 40px; margin: 0; font-weight: bold; }
            .notificationsCount { background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 10px; position: absolute; top: -5px; right: -5px; }
            .yms-button { cursor: pointer; padding: 5px 10px; border: 1px solid black; font-weight: bold; }
            .blueButton { background: #0071bc; color: white; }
            .orangeButton { background: #C7511F; color: white; }
            .redButton { background: #dd2222; color: white; }
            .superuserTabActive { background: #00519c !important; }
            [dwell='red'] .col11 { background-color: #ffcccc !important; border: 2px solid red !important; }
            [dwell='yellow'] .col11 { background-color: #fff9c4 !important; border: 2px solid orange !important; }
        `;
        $("<style>").html(style).appendTo("head");
    };

    // ========== Utility Functions ==========
    const saveSettings = () => localStorage.setItem("YMSSuperuserSettings", JSON.stringify(settings));

    const parseDwell = (text) => {
        const hoursMatch = text.match(/(\d+):(\d+)/);
        if (hoursMatch) return parseInt(hoursMatch[1]) + (parseInt(hoursMatch[2]) / 60);
        if (text.includes("days")) return parseInt(text) * 24;
        return 0;
    };

    const getCSSSelectorFromFilter = (filterStr) => {
        return filterStr.split("|").map(group => {
            return group.split(" ").map(f => {
                const [key, val] = f.split("=");
                return `[category_${key}='${val}']`;
            }).join("");
        }).join(", ");
    };

    // ========== Core Engine ==========
    const updateCategories = (force = false) => {
        const rows = document.querySelectorAll(`tbody.masterYardLP > tr${force ? '' : ':not([categoriesApplied])'}`);
        if (!rows.length) return;

        rows.forEach(row => {
            const cells = row.cells;
            if (!cells || cells.length < 10) return;

            const noteText = (row.querySelector("#noteContainer p")?.textContent || "").toLowerCase();
            const dwellText = cells[3]?.textContent || "";
            const dwellHours = parseDwell(dwellText);

            // Fast Category Mapping
            const cats = {
                empty: row.querySelector(".yardasset-empty") ? 1 : 0,
                loaded: row.querySelector(".yardasset-full") ? 1 : 0,
                yellowtagged: row.querySelector(".yard-asset-yellow") ? 1 : 0,
                redtagged: row.querySelector(".yard-asset-red") ? 1 : 0,
                hasymsnote: [...CONFIG.YMS_CODES].some(code => noteText.includes(code.toLowerCase())) ? 1 : 0,
                longdwell: dwellHours > 72 ? 1 : 0,
                inbound: cells[4]?.textContent.toLowerCase().includes("inbound") ? 1 : 0
            };

            // Apply as attributes for CSS filtering
            Object.entries(cats).forEach(([k, v]) => row.setAttribute(`category_${k}`, v));
            
            // Dwell Coloring
            if (dwellHours > settings.notesCompliance_redFlagLimit) row.setAttribute("dwell", "red");
            else if (dwellHours > settings.notesCompliance_yellowFlagLimit) row.setAttribute("dwell", "yellow");
            else row.removeAttribute("dwell");

            row.setAttribute("categoriesApplied", "1");
        });

        updateDashboardValues();
    };

    const updateDashboardValues = () => {
        document.querySelectorAll(".dashboardCard, .quickViewFilter").forEach(card => {
            const filter = card.getAttribute("data-filter");
            if (!filter) return;
            const count = document.querySelectorAll(`tbody.masterYardLP > tr${getCSSSelectorFromFilter(filter)}`).length;
            const p = card.querySelector("p");
            if (p) p.textContent = count;
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
    const initPanel = () => {
        const panelHtml = `
            <div id="superuserPanel">
                <div id="superuserHeader">
                    <span>YMS Superuser v2.0</span>
                    <button class="redButton yms-button" id="closePanel">X</button>
                </div>
                <div id="tabsList" style="display:flex; background:#eee; padding:5px; gap:5px;">
                    <div class="yms-button blueButton active-tab" data-tab="dashboard">Dashboard</div>
                    <div class="yms-button blueButton" data-tab="settings">Settings</div>
                </div>
                <div id="panelContent" style="padding:10px; overflow-y:auto; height:calc(100% - 100px);">
                    <div id="tab-dashboard"></div>
                    <div id="tab-settings" style="display:none;"></div>
                </div>
            </div>
        `;
        $("body").prepend(panelHtml);

        // Build Dashboard Cards
        const dashContainer = $("#tab-dashboard");
        Object.entries(settings.dashboardCategories).forEach(([id, cat]) => {
            const deck = $(`<fieldset class="dashboardDeck"><legend>${cat.name}</legend></fieldset>`).appendTo(dashContainer);
            Object.values(settings.dashboardFilters).filter(f => f.category === id).forEach(filter => {
                $(`<div class="dashboardCard" data-filter="${filter.filters}">
                    <h1>${filter.title}</h1>
                    <p>0</p>
                   </div>`).on('click', () => { 
                       applyFilter(filter.filters, filter.title);
                       $("#superuserPanel").hide();
                   }).appendTo(deck);
            });
        });

        // Event Handlers
        $("#closePanel").click(() => $("#superuserPanel").hide());
        $("[data-tab]").click(function() {
            const target = $(this).data('tab');
            $("#panelContent > div").hide();
            $(`#tab-${target}`).show();
        });
    };

    const initLaunchButton = () => {
        const btn = $(`
            <div style="position:fixed; top:10px; right:50%; transform:translateX(50%); z-index:9999; display:flex; gap:10px;">
                <button class="yms-button blueButton" id="openSuperuser">Dashboard <span id="notifBadge" class="notificationsCount" style="display:none">0</span></button>
                <div class="currentFilterBox yms-button orangeButton" style="display:none"></div>
            </div>
        `).appendTo("body");

        $("#openSuperuser").click(() => $("#superuserPanel").toggle());
        $(".currentFilterBox").click(() => applyFilter("", ""));
    };

    // ========== Main Loop ==========
    const setup = () => {
        const saved = localStorage.getItem("YMSSuperuserSettings");
        settings = saved ? JSON.parse(saved) : defaultSettings;
        
        injectStyles();
        initPanel();
        initLaunchButton();

        // Optimized Unified Interval
        setInterval(() => {
            updateCategories();
            // Handle auto-select yard if needed
            if (settings.autoselectYard && $("div.yard-selector select").val() === "") {
                // ... selection logic
            }
        }, 2000);

        // UI Refresh Observer (to handle native YMS pagination/refresh)
        const observer = new MutationObserver(() => updateCategories(true));
        observer.observe(document.querySelector('tbody.masterYardLP') || document.body, { childList: true, subtree: false });
    };

    // Start
    if (window.jQuery) setup();
    else {
        const script = document.createElement('script');
        script.src = "https://googleapis.com";
        script.onload = setup;
        document.head.appendChild(script);
    }

})
();
