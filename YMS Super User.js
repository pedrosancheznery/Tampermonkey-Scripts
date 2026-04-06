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

// ========== Notes From Nathan ==========
// Please for the love of all things holy,
// do not judge me for all of this terrible
// code. I know some things could be done
// in better ways, and I will likely fix
// or change them in the future, but for
// now, it works good enough. If you find
// anything in particular that can be
// improved, please reach out to me and let
// me know what can be changed.
//
// I also am probably going to go back at
// some point and comment on what each part
// does so it's at least a little bit
// explained and not just a bunch of random
// code that seems to be black magic.
const style = `

#superuserButton {
    position: absolute;
    border-radius: 0;
    border: 2px solid black;
    font-weight: 900;
    z-index: 1000;
    top: 0;
    right: 50%;
    transform: translate(50%, 50%);
}

#superuserButton p {
    margin: 0;
}

p.notificationsCount {
    color: white;
    background-color: red;
    font-size: 8px;
    width: max-content;
    min-width: 14px;
    height: 14px;
    border-radius: 7px;
    padding: 2px;
    text-align: center;
    position: absolute;
    z-index: 100;
    right: -7px;
    top: -7px;
}

#superuserPanel {
    width: 85%;
    //height: 600px;
    //width: 75%;
    height: 800px;
    background-color: #e0e0e0;
    z-index: 1000;
    position: absolute;
    top: 0%; left: 50%;
    transform: translate(-50%, 100px);
    border: 1px solid black;
    box-shadow: 0 0 10px black;
    padding-top: 0;
    color: black;
}

#superuserHeader {
    font-size: 14px;
}

#superuserHeader p {
    padding: 0;
    margin: 0;
}

.superuserButton {
    height: max-content;
    width: max-content;
    border: 1px solid black;
    border-radius: 0;
    cursor: pointer;
    list-style: none;
    float: left;
    padding: 5px;
    margin: 3px;
}

.redButton {
    background-color: #dd2222;
    color: white;
    padding-bottom: 5px;
    padding-top: 5px;
}

.redButton:hover {
    background-color: #fd4242;
}

.orangeButton {
    background-color: #C7511F;
    color: white;
    padding-bottom: 5px;
    padding-top: 5px;
}

.orangeButton:hover {
    background-color: #E7713F;
}

.yellowButton {
    background-color: #ffcc00;
    color: black;
    padding-bottom: 5px;
    padding-top: 5px;
}

.yellowButton:hover {
    background-color: #ffec20;
}

.whiteButton {
    background-color: #FFFFFF;
    color: black;
    padding-bottom: 5px;
    padding-top: 5px;
}

.whiteButton:hover {
    background-color: #00FFFF;
}

.greenButton {
    background-color: #2e6930;
    color: white;
    padding-bottom: 5px;
    padding-top: 5px;
}

.greenButton:hover {
    background-color: #4e8950;
}

.blueButton {
    background-color: #0071bc;
    color: white;
    padding-bottom: 5px;
    padding-top: 5px;
}

.blueButton:hover {
    background-color: #2091dc;
}

.purpleButton {
    background-color: #9900df;
    color: white;
    padding-bottom: 5px;
    padding-top: 5px;
}

.purpleButton:hover {
    background-color: #a920ff;
}

.quickNoteButton {
    margin: 0 0 0 5px;
    padding: 5px;
    width: max-content;
}

.quickNoteButton:first-child {
    margin-left: 0;
}

#clearFiltersButton {
    position: absolute;
    right: 80px;
    top: 5px;
}

.superuserFont {
    font-family: Verdana, sans-serif;
    font-weight: 500;
}

.superuserFont.largefont {
    font-size: 20px;
}

#tabsDiv, #tabsList {
    width: 100%;
    padding-left: 0;
    margin-top: 0;
    margin-bottom: 0;
}

.superuserTab {
    background-color: #0071bc;
    border: 1px solid black;
    list-style: none;
    font-size: 12px;
    float: left;
    padding: 3px;
    margin-right: 3px;
    margin-top: 3px;
}

.superuserTab:hover {
    background-color: #2091dc;
}

.superuserTab.superuserTabActive, .superuserTabActive, .itemlistitem.superuserTabActive {
    background-color: #00519c !important;
}

li.superuserTab {
    color: white;
    text-decoration: none;
    text-align: center;
    cursor: pointer;
}

.superuserFullSizeTab {
    width: 100%;
    height: 710px;
    //height: 510px;
    overflow: scroll;
    padding: 5px;
}

#superuserNotesDiv {
    width: 100%;
    margin-top: 20px;
}

.superuserSelect {
    padding: 5px 20px 5px 5px;
}

.superuserSelect option {
    font-size: 13px;
}

.width100 {
    width: 100%;
}

img.superuserSmallButton {
    width: 20px;
    height: 20px;
    border: 1px solid black;
    border-radius: 2px;
    padding: 2px;
    cursor: pointer;
    background-color: white;
    box-shadow: inset 10px 10px 10px 10px white;
}

fieldset.settingsFieldset {
    border: 2px solid black;
    text-align: left;
}

fieldset.settingsFieldset legend, fieldset.dashboardDeck legend {
    padding: 3px;
}

.enableFeatureCheckbox {
    margin-right: 3px;
}

.settingsInputContainer {
    display: grid;
    justify-items: flex-start;
    grid-template-columns: 1fr 1fr;
    width: max-content;
    gap: 10px;
}

p.tooltipText {
    display: block;
    position: inherit;
    top: 30px;
    right: 10px;
    max-width: 250px;
    background-color: white;
    border: 2px solid black;
    z-index: 100;
}

p.superuserUpdateNoteWarning {
    background-color: red;
    border: 2px solid black;
    padding: 4px;
    color: black;
    font-size: 14px;
}

.dashboardDeck {
    border: 2px solid black;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
}

.dashboardCard {
    width: 140px;
    height: 140px;
    //width: 150px;
    //height: 150px;
    display: grid;
    justify-content: center;
    align-content: center;
    background-color: white;
    color: black;
    border: 2px solid black;
}

.dashboardCard h1 {
    font-size: 12px;
    margin: 0;
    font-weight: 900;
    text-align: center;
}

.dashboardCard p {
    font-size: 45px;
    //font-size: 50px;
    margin: 0;
}

#dashboardEditTab {
    display: grid;
    grid-template-areas:
        'listselector header header header'
        'list editor editor editor';
    grid-template-columns: 25% 25% 25% 25%;
    grid-template-rows: max-content;
}

.tcp-widget #header .header-leftpanel {
    display: flex;
}

#quickViewContainer {
    display: flex;
}

.quickViewFilter {
    width: max-content;
    background-color: white;
    border: 1px solid black;
    border-radius: 0;
    color: black;
    padding: 2px;
    margin: 2px;
}

.quickViewFilter h1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    max-width: 130px;
    overflow: hidden;
    font-size: 10px;
    padding: 0;
}

.quickViewFilter p {
    font-size: 10px;
    font-weight: 900;
}

div.itemlistbox {
    grid-area: list;
    display: block;
    height: 100%;
    overflow-x: hidden;
    overflow-y: scroll;
    border: 2px solid black;
    border-radius: 0;
    padding: 1px;
}

div.itemlistbox .itemlistitem {
    width: 100%;
    font-size: 18px;
    background-color: #0071bc;
    color: white;
    border: 1px solid black;
    border-radius: 0;
    padding: 2px;
    margin: 0 0 1px 0;
    text-align: left;
}

div.itemlistbox .itemlistitem, div.itemlistbox .itemlistitem p {
    cursor: pointer;
}

div.itemlistbox .itemlistitem:hover {
    background-color: #2091dc;
}

div.itemlistbox .itemlistitem[selected] {
    background-color: #00519c;
}

div.itemlistbox .itemlistitem.greenbackground {
    background-color: #55bb55;
}

div.itemlistbox .itemlistitem.greenbackground:hover {
    background-color: #77dd77;
}

.filterCustomizer, .categoryCustomizer, #filterHolder {
    grid-area: editor;
    overflow: scroll;
}

#dashboardEditTab div.selectorBox {
    width: 100%;
    padding: 2px;
    display: flex;
    grid-area: listselector;
    justify-content: center;
}

.filterCustomizer.settingsFieldset {
    margin-bottom: 40px;
}

.filterCustomizer.settingsFieldset:last-child {
    margin-bottom: 0px;
}

.filterCustomizer .settingsFieldset {
    display: grid;
    grid-template-columns: 25% 25% 25% 25%;
    gap: 5px;
}

.filterCustomizer legend {
    display: flex;
    align-items: center;
    gap: 5px;
}

.settingsOption {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
}

.settingsOption p {
    justify-self: right;
}

.settingsOption .superuserSelect {
    justify-self: left;
}

div.filterSaveOptions {
    width: 100%;
    grid-area: header;
    align-items: center;
    justify-items: left;
    display: flex;
    gap: 5px;
}

div.filterSaveOptions button {
    margin: 0 5px 0 3px;
}

#filterNameEdit {
    width: max-content;
}

.masterYardLP>tr[category_hasymsnote='0'][dwell='red'][category_aap='0'] .col11, .masterYardLP>tr[category_hasymsnote='0'][dwell='red'][category_aap='1'][category_empty='0'] .col11 {
    background-color: red;
}
.masterYardLP>tr[category_hasymsnote='0'][dwell='yellow'][category_aap='0'] .col11, .masterYardLP>tr[category_hasymsnote='0'][dwell='yellow'][category_aap='1'][category_empty='0'] .col11 {
    background-color: yellow;
}

.currentFilterBox {
    //position: absolute;
    //left: 35%;
    max-width: 250px;
}

.ui-tooltip {
    background-color: #0071bc;
    color: white;
    border-radius: 0px;
    box-shadow: 0 0 5px black;
}

[enablenotifications='1'] p:not([count='0']) {
    animation: text-pulse-red 1s infinite;
}

.invalid-value {
    animation: box-pulse-red 1s infinite;
}

#headerNav {
    display: grid;
    grid-template-areas: "selector quickview account";
    grid-template-columns: 15% 70% 15%;
}

div.a-section.header-leftpanel {
    grid-area: selector;
}

div.a-section.header-rightpanel {
    grid-area: account;
}

.draggable-handle {
    width: 16px;
    height: 16px;
    margin-right: 5px;
    cursor: move;
}

.is-it-down-stripe {
    display: block;
    position: fixed;
    bottom: 0;
    font-size: 7px;
}

@keyframes text-pulse-red {
    0% {
        text-shadow: 0 0 3px red;
    }
    50% {
        text-shadow: 0 0 8px red;
    }
    100% {
        text-shadow: 0 0 3px red;
    }
}

@keyframes box-pulse-red {
    0% {
        box-shadow: 0 0 3px red;
    }
    50% {
        box-shadow: 0 0 8px red;
    }
    100% {
        box-shadow: 0 0 3px red;
    }
}

.clickhereborder {
  animation: pulse-blue 0.7s infinite;
}

@keyframes pulse-blue {
  0% {
    box-shadow: 0 0 0 2px rgba(52, 172, 224, 1);
  }

  50% {
    box-shadow: 0 0 0 4px rgba(52, 172, 224, 1);
  }

  100% {
    box-shadow: 0 0 0 2px rgba(52, 172, 224, 1);
  }
}

@keyframes fade10sdelay {
    0% {opacity: 100%;}
    95% {opacity: 100%;}
    100% {opacity: 0%; z-index: -1;}
}



`;
// ========== End Of Styling ==========

var appliedFilter = "";

const validFilters = {
    "vehicletype": {
        "id": "vehicletype",
        "name": "Vehicle Type",
        "values": ["Airplane|airplane|yesno", "Tractor|tractor|yesno", "Trailer|trailer|yesno", "Dolly|dolly|yesno", "Pup|pup|yesno", "Intermodal|intermodal|yesno", "Box Truck|boxtruck|yesno", "Swap Body|swapbody|yesno", "Car|car|yesno", "Van|van|yesno", "Person|person|yesno", "Other|otherasset|yesno"]
    },
    "tagstatus": {
        "id": "tagstatus",
        "name": "Tag Status",
        "values": ["Yellow Tag|yellowtagged|yesno", "Red Tag|redtagged|yesno", "Has Tag Note|hastagnote|yesno"]},
    "scac": {
        "id": "scac",
        "name": "SCAC & Operator",
        "values": ["AZNG|azng|yesno", "AZNU|aznu|yesno", "AZNA|azna|yesno", "AAP Fleet|aap|yesno", "3P|3p|yesno", "Custom SCAC|scac|text", "Operator|operator|text"]
    },
    "loadstatus": {
        "id": "loadstatus",
        "name": "Load Status",
        "values": ["Empty|empty|yesno", "Loaded|loaded|yesno", "In Progress|inprogress|yesno"]
    },
    "visitreason": {
        "id": "visitreason",
        "name": "Visit Reason",
        "values": ["Inbound|inbound|yesno", "Outbound|outbound|yesno", "Non-Inventory|noninventory|yesno"]
    },
    "other": {
        "id": "other",
        "name": "Other",
        "values": ["Has VRID|hasVRID|yesno", "Has ISA|hasISA|yesno", "Has YMS Note|hasymsnote|yesno", "Has Seal Note|hassealnote|yesno","Has Good Wood Pallets Note|hasgoodwoodpalletsnote|yesno", "Has Bad Wood Pallets Note|hasbadwoodpalletsnote|yesno","Has Universal Pallets Note|hasuppnote|yesno", "Has Empty Totes Note|hasemptytotesnote|yesno", "Has BOL Note|hasbolnote|yesno", "Blue Flag|blueflag|yesno", "Long Dwell (>72hours)|longdwell|yesno", "Parking Slip|parkingslip|yesno", "Dock Door|dockdoor|yesno", "Off Site|offsite|yesno"]
    }
}

var defaultSettings = {
    enable_notesCompliance : true,
    enable_sealNotes : false,
    enable_DDUDoors: false,
    enable_IXD: false,

    ixd_bol: 0,
    ixd_blueflag: 0,
    ixd_notes: 0,

    dduDoors_showDoorAvailable: 0,
    dduDoors_checkAdjacentDoors: 0,

    refresh_dduDoors: 10000,
    refresh_notesCompliance: 10000,
    refresh_filteredResults: 5000,

    showLicenseCopy: true,
    autoselectYard: "",

    notesCompliance_redFlagLimit: 72,
    notesCompliance_yellowFlagLimit: 12,

    dashboardFilters: {
        "empty_aap": {id: "empty_aap", category: "empties", title: "AAP Fleet Empties", filters: "aap=1 empty=1", enableNotifs: "0", quickView: "0"},
        "empty_azng": {id: "empty_azng", category: "empties", title: "Empty AZNG", filters: "empty=1 azng=1", enableNotifs: "0", quickView: "0"},
        "empty_azng_w_vrid": {id: "empty_azng_w_vrid", category: "empties", title: "Empty AZNG With VRID", filters: "empty=1 azng=1 hasvrid=1", enableNotifs: "0", quickView: "0"},
        "empty_aznu": {id: "empty_aznu", category: "empties", title: "Empty AZNU", filters: "empty=1 aznu=1", enableNotifs: "0", quickView: "0"},
        "empty_3p": {id: "empty_3p", category: "empties", title: "Empty 3P", filters: "empty=1 3p=1 airplane=0 car=0", enableNotifs: "0", quickView: "0"},
        "ymsnote_missing": {id: "ymsnote_missing", category: "notescompliance", title: "Missing YMS Note", filters: "tractor=0 boxtruck=0 aap=0 hasymsnote=0|aap=1 empty=0 hasymsnote=0 longdwell=1", enableNotifs: "1", quickView: "1"},
        "sealnote_missing": {id: "sealnote_missing", category: "notescompliance", title: "Missing Seal Note", filters: "hassealnote=0 inbound=1", enableNotifs: "0", quickView: "0"},
        "alltags": {id: "alltags", category: "tagged", title: "All Tagged Trailers", filters: "yellowtagged=1|redtagged=1", enableNotifs: "0", quickView: "0"},
        "yellowtag": {id: "yellowtag", category: "tagged", title: "Yellow Tagged", filters: "yellowtagged=1", enableNotifs: "0", quickView: "0"},
        "yellowtag_n_note": {id: "yellowtag_n_note", category: "tagged", title: "Yellow Tagged Without Notes", filters: "yellowtagged=1 hastagnote=0", enableNotifs: "0", quickView: "0"},
        "redtag": {id: "redtag", category: "tagged", title: "Red Tagged", filters: "redtagged=1", enableNotifs: "0", quickView: "0"},
        "redtag_n_note": {id: "redtag_n_note", category: "tagged", title: "Red Tagged Without Notes", filters: "redtagged=1 hastagnote=0", enableNotifs: "0", quickView: "0"},
        "tag_released": {id: "tag_released", category: "tagged", title: "Yellow/Red Tag Release", filters: "yellowtagged=0 redtagged=0 hastagnote=1", enableNotifs: "0", quickView: "0"},
        "box_trucks": {id: "box_trucks", category: "power", title: "Box Trucks", filters: "boxtruck=1", enableNotifs: "0", quickView: "0"},
        "tractors": {id: "tractors", category: "power", title: "Tractors", filters: "tractor=1", enableNotifs: "0", quickView: "0"},
        "goodwood": {id: "goodwood", category: "noninv", title: "Good Wood", filters: "hasgoodwoodpalletsnote=1", enableNotifs: "0", quickView: "0"},
        "badwood": {id: "badwood", category: "noninv", title: "Bad Wood", filters: "hasbadwoodpalletsnote=1", enableNotifs: "0", quickView: "0"},
        "upp": {id: "upp", category: "noninv", title: "Universal Pallets (UPP)", filters: "hasuppnote=1", enableNotifs: "0", quickView: "0"},
        "etotes": {id: "etotes", category: "noninv", title: "Empty Totes", filters: "hasemptytotesnote=1", enableNotifs: "0", quickView: "0"}
    },
    dashboardCategories: {
        "empties": {name: "Empties", id: "empties"},
        "notescompliance": {name: "Notes Compliance", id: "notescompliance"},
        "tagged": {name: "Tagged Assets", id: "tagged"},
        "power": {name: "Powered Equipment", id: "power"},
        "noninv": {name: "Non-Inventory (based on notes)", id: "noninv"}
    }
};

const categoryTemplate = {name: "New Category", id: ""};
const filterTemplate = {id: "", category: "NA", title: "New Filter", filters: "", enableNotifs: "0", quickView: "0"};
var settings = {};

function saveSettings() {
    localStorage.setItem("YMSSuperuserSettings", JSON.stringify(settings));
}

//Run on script enable to check for jquery. Add if not already good.
(function() {
    try {
        console.log($().jquery);
        setup();
    } catch (error) {
        (document.head).insertAdjacentHTML('beforeend', "<script src='https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js'></script>");
        (document.head).insertAdjacentHTML('beforeend', "<script src='https://raw.githubusercontent.com/wmh/jquery-scrollbox/master/jquery.scrollbox.js'></script>");
        console.log("Looks like jquery isn't installed... Installing it now...");

        setTimeout(setup, 5000);
    }
})();

function setup() {

    //$(document).tooltip({track: true}); // Old tooltip application, caused floating text when items on page were clicked on when they disappear.
    $(".superuserTooltip").tooltip({track: true});

    console.log("YMS Superuser by Nathan Loppnow - nlloppno@\nRunning Setup...");

    (document.head).insertAdjacentHTML('beforeend', "<link rel='stylesheet' href='https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/themes/smoothness/jquery-ui.css'>");
    //(document.head).insertAdjacentHTML('beforeend', "<link rel='stylesheet' href='https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/themes/smoothness/jquery-ui.css'><script src='https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js'></script>");


    // ========== Getting and setting up settings ==========
    var tempSettings = JSON.parse(localStorage.getItem("YMSSuperuserSettings"));

    if (tempSettings == null) {
        settings = defaultSettings;
        saveSettings();
    }
    else {
        settings = tempSettings;
    }

    for (const prop in defaultSettings) {
        // console.log("Property: " + prop + " defaultSettings: " + defaultSettings[prop] + " settings: " + settings[prop]); //Used for debugging
        if (settings[prop] == undefined || settings[prop] == null) {
            settings[prop] = defaultSettings[prop];
        }
    }

    for (const filter in settings.dashboardFilters) {
        console.log(filter);
        for (const setting in settings.dashboardFilters[filter]) {
            console.log(settings.dashboardFilters[filter][setting]);
        }
    }



    saveSettings();

    initializeIntervals();

    // ========== Begin initial setup of panel ==========
    initializePanel();
    addStyling();
    initializeTabs();


    setTimeout(setYard, 2500);

}

var setYardTries = 0;

function setYard() {
    if (settings.autoselectYard != undefined && settings.autoselectYard != "" && $("div.yard-selector select").length > 0) {
        console.log("Trying to set yard...");
        if ($("div.yard-selector select").has("option[value='string:" + settings.autoselectYard + "']").length > 0) {
            $("div.yard-selector select").val("string:" + settings.autoselectYard);
            $("div.yard-selector select").get(0).dispatchEvent(new Event("change"));
        }
        else {
            console.log("Invalid Yard: " + settings.autoselectYard + " - Maybe the selector isn't loaded yet? I'll retry in 2.5 seconds.");
            setTimeout(setYard, 2500);
        }
    }
    else {
        //$("[superusersetting='autoselectYard']").hide();
        //$("#autoselectYardText").hide();
        if (setYardTries <= 3) {
            setYardTries++;
            setTimeout(setYard, 2500);
        }
    }

}

function initializeIntervals() {
    setInterval(updateDDUDisplay, parseInt(settings.refresh_dduDoors));
    setInterval(updateNotesDisplay, 1500);
    setInterval(updateLicensePlateCopyButtons, 1000);
    //setInterval(updateMissingYMSCode, parseInt(settings.refresh_notesCompliance)); // Removed as it actually did nothing, it was all handled in the updatecategories function lmaooooo
    setTimeout(updateCategories, 5000);
    setInterval(updateCategories, 1000);
    setInterval(updateDashboard, 5000);
    //setInterval(updateFilteredResults, parseInt(settings.refresh_filteredResults));
    //setInterval(checkAutoFilterUpdate, 5000);
}

function checkAutoFilterUpdate() {
    if (!$("tbody.masterYardLP").is("[listenerEvent]")) {
        $("tbody.masterYardLP").attr("listenerEvent", "1");
        $("tbody.masterYardLP").change(function() {});
    }
}

function addStyling() {
    $("body").append($("<style>", {html: style}));
}


// Sets up the button to open the panel, the panel itself, and the header within the panel.
function initializePanel() {
    // Add the button and register the click event
    $("#mainContainer").prepend($("<div>", {id: "dashboardQuickView", class: "flex-container"}));
    $("#dashboardQuickView").append($("<button>", {class: "yms-button yms-button-primary", id: "ymsButton"})).append($("<div>", {id: "filters", class: "flex-container"}));
    $("#ymsButton").append($("<span>", {text: "Dashboard"})).append($("<p>", {class: "notificationsCount", text: "0"})).click(z=>$("#superuserPanel").toggle());
    //$("body").prepend($("<p>", {id: "superuserButton", class: "blueButton superuserButton superuserFont"}).click(function() {
        //$("#superuserPanel").toggle();
    //}));
    //$("#superuserButton").append($("<p>", {text: "YMS Superuser Panel"}));
    //$("#superuserButton").append($("<p>", {class: "notificationsCount", text: "0"}));
    // Add the background of the panel.
    $("body").prepend($("<div>", {id: "superuserPanel"}));
    $("#superuserPanel").hide(); // Should get hidden right away!

    $("#superuserPanel").append($("<div>", {id: "superuserHeader",style: "width: 100%; height: 35px; background-color: #0071bc; color: white; border-bottom: 2px solid black; display: flex;"}));
    $("#superuserHeader").append($("<p>", {class: "superuserFont", style: "padding: 10px;", text: "YMS Superuser Created by Nathan Loppnow (nlloppno@)"}));
    $("#superuserHeader").append($("<p>", {class: "redButton yms-button superuserFont", text: "X", style: "padding: 0; right: 0; width: 25px; height: 25px; transform: translate(-50%, 15%); position: absolute; border-radius: 0; background-color: white; color: #0071bc; border: 2px solid black;"}).click(function() {$("#superuserPanel").toggle();}));
    $("#superuserHeader").append($("<p>", {id: "clearFiltersButton", text: "Clear Filters", class: "orangeButton yms-button"}).click(function() {applyFilter("", "NA")}));
    setTimeout(addCurrentFilterBox, 5000);
}

function addCurrentFilterBox() {
    $("#dashboardQuickView").append($("<button>", {class: "currentFilterBox yms-button orangeButton superuserTooltip", text: "NA", title: "Click to clear filter"}).click(function() {applyFilter("", "NA")}));
    //$("#top-section #title-block").append($("<p>", {class: "currentFilterBox superuserButton orangeButton superuserTooltip", text: "NA", title: "Click to clear filter"}).click(function() {applyFilter("", "NA")}));
    $(".currentFilterBox").hide();
    $("#clearFiltersButton").hide();
}

// ============================
// Tab Initialization Functions
// ============================

function initializeTabs() {

    $("#superuserPanel").append($("<div>", {id: "tabsDiv", style: "height: 40px;"}));
    $("#tabsDiv").append($("<ul>", {id: "tabsList", style: "display: inline-block; height: 40px; list-style: none; margin-left: 5px;"}));
    $("#tabsList").append($("<li>", {buttonFor: "dashboardTab", class: "superuserTab superuserTabActive", text: "Dashboard"}));
    $("#tabsList").append($("<li>", {buttonFor: "dashboardEditTab", class: "superuserTab", text: "Edit Dashboard"}));
    $("#tabsList").append($("<li>", {buttonFor: "settingsTab", class: "superuserTab", text: "Settings"}));
    $("#tabsList").append($("<li>", {buttonFor: "dduDoorsTab", class: "superuserTab", text: "DDU Doors"})); // Future Release
    $("#tabsList").append($("<li>", {buttonFor: "changeLogTab", class: "superuserTab", text: "Change Log"})); // No longer used. Caused lag due to Wiki being loaded in background.
    $("#tabsList").append($("<li>", {buttonFor: "helpTab", class: "superuserTab", text: "Help"}));
    $("#tabsList").append($("<li>", {buttonFor: "newTab", class: "superuserTab", text: "New Tab"})); //Template for adding future buttons

    $("#tabsDiv").append($("<div>", {id: "dashboardTab", class: "superuserFullSizeTab"}));
    $("#tabsDiv").append($("<div>", {id: "dashboardEditTab", class: "superuserFullSizeTab"}));
    $("#tabsDiv").append($("<div>", {id: "settingsTab", class: "superuserFullSizeTab"}));
    $("#tabsDiv").append($("<div>", {id: "dduDoorsTab", class: "superuserFullSizeTab"})); // Future Release
    $("#tabsDiv").append($("<div>", {id: "changeLogTab", class: "superuserFullSizeTab"})); // No longer used. Caused lag due to Wiki being loaded in background.
    $("#tabsDiv").append($("<div>", {id: "helpTab", class: "superuserFullSizeTab"}));
    $("#tabsDiv").append($("<div>", {id: "newTab", class: "superuserFullSizeTab"})); //Template for adding future tabs

    $(".superuserTab").click(function() {
        $(this).siblings(".superuserTab").removeClass("superuserTabActive");
        $(this).addClass("superuserTabActive");
        activateTab($(this).attr("buttonFor"));
    });

    initializeSettingsTab();
    initializeDashboardTab();
    initializeDashboardEditTab();
    //initializeDDUDoorsTab();
    //initializeChangeLogTab();
    //$("#changeLogTab").append($("<iframe>", {src: "https://w.amazon.com/bin/view/Users/nlloppno/NathanLoppnowTools/YMSSuperuser/Changelog", width: "100%", height: "95%"}));
    //$("#helpTab").append($("<iframe>", {src: "https://w.amazon.com/bin/view/Users/nlloppno/NathanLoppnowTools/YMSSuperuser", width: "100%", height: "95%"}));
    initializeHelpTab();

    activateTab("dashboardTab");
    $("#superuserPanel").hide();
}

function activateTab(tabName) {
    $("#" + tabName).siblings("div").hide();
    $("#" + tabName).show();
    $("#superuserPanel").show();
}

function initializeSettingsTab() {
    $("#settingsTab")
        .append($("<fieldset>", {class: "settingsFieldset"}) // Notes Compliance Section
            .append($("<legend>", {text: "Auto-Update Intervals (Changes effective upon page reload)"}))
            .append($("<p>", {text: "It is highly recommended to keep these settings at the default or higher values. Changing these to a lower value may cause the page to become slow and/or unresponsive."}))
            .append($("<div>", {class: "settingsInputContainer"})
                /*.append($("<p>", {text: "DDU Doors", class: "superuserHoverTooltip superuserTooltip", title: "How often to update DDU door display"}))
                .append($("<select>", {class: "superuserSelect", superuserSetting: "refresh_dduDoors"})
                    .append($("<option>", {text: "1 Second", value: 1000}))
                    .append($("<option>", {text: "5 Seconds", value: 5000}))
                    .append($("<option>", {text: "10 Seconds (Default)", value: 10000}))
                    .append($("<option>", {text: "15 Seconds", value: 15000}))
                    .append($("<option>", {text: "30 Seconds", value: 30000}))
                    .append($("<option>", {text: "1 Minute", value: 60000}))
                )*/
                .append($("<p>", {text: "Notes Compliance", class: "superuserHoverTooltip superuserTooltip", title: "How often to update the Notes Compliance display"}))
                .append($("<select>", {class: "superuserSelect", superuserSetting: "refresh_notesCompliance"})
                    .append($("<option>", {text: "1 Second", value: 1000}))
                    .append($("<option>", {text: "5 Seconds", value: 5000}))
                    .append($("<option>", {text: "10 Seconds (Default)", value: 10000}))
                    .append($("<option>", {text: "15 Seconds", value: 15000}))
                    .append($("<option>", {text: "30 Seconds", value: 30000}))
                    .append($("<option>", {text: "1 Minute", value: 60000}))
                )
                .append($("<p>", {text: "Filtered Results", class: "superuserHoverTooltip superuserTooltip", title: "How often to hide non-filtered results from the dashboard. Only effects it when using the dashboard filters."}))
                .append($("<select>", {class: "superuserSelect", superuserSetting: "refresh_filteredResults"})
                    .append($("<option>", {text: "1 Second", value: 1000}))
                    .append($("<option>", {text: "2.5 Seconds", value: 2500}))
                    .append($("<option>", {text: "5 Seconds (Default)", value: 5000}))
                    .append($("<option>", {text: "10 Seconds", value: 10000}))
                    .append($("<option>", {text: "15 Seconds", value: 15000}))
                    .append($("<option>", {text: "30 Seconds", value: 30000}))
                    .append($("<option>", {text: "1 Minute", value: 60000}))
                )
            )
            .append())
        .append($("<fieldset>", {class: "settingsFieldset"}) // Notes Compliance Section
            .append($("<legend>", {text: "Misc. Settings"}))
            //.append($("<p>", {text: "It is highly recommended to keep these settings at the default or higher values. Changing these to a lower value may cause the page to become slow and/or unresponsive."}))
            .append($("<div>", {class: "settingsInputContainer"})
                .append($("<p>", {text: "Amazon Account Auto-Select Site", class: "superuserHoverTooltip superuserTooltip", title: "If on the Amazon account, what site should it automatically select?", id: "autoselectYardText"}))
                .append($("<input>", {class: "superuserSelect", superuserSetting: "autoselectYard", type: "text"}))
            )
        )
        .append($("<fieldset>", {class: "settingsFieldset"})
            .append($("<legend>", {text: "IXD Settings"})
                //.prepend($("<input>", {superUserSetting:"enable_IXD", class: "enableFeatureCheckbox", type: "checkbox"}))
            )
            .append($("<div>", {class: "settingsInputContainer"})
                .append($("<p>", {text: "BOL Verification", class: "superuserHoverTooltip superuserTooltip", title: "Enables the BOL verification buttons for notes."}))
                .append($("<select>", {class: "superuserSelect", superuserSetting: "ixd_bol"})
                    .append($("<option>", {text: "Enabled", value: 1}))
                    .append($("<option>", {text: "Disabled", value: 0}))
                )
                .append($("<p>", {text: "Blue Flag Trailer Advanced Options", class: "superuserHoverTooltip superuserTooltip", title: "Enables advanced Blue Flag Trailer buttons for notes"}))
                .append($("<select>", {class: "superuserSelect", superuserSetting: "ixd_blueflag"})
                    .append($("<option>", {text: "Enabled", value: 1}))
                    .append($("<option>", {text: "Disabled", value: 0}))
                )
                .append($("<p>", {text: "IXD QuickNotes Dropdown", class: "superuserHoverTooltip superuserTooltip", title: "Enables the IXD YMS Codes dropdown for notes."}))
                .append($("<select>", {class: "superuserSelect", superuserSetting: "ixd_notes"})
                    .append($("<option>", {text: "Enabled", value: 1}))
                    .append($("<option>", {text: "Disabled", value: 0}))
                )
            )
        )
        .append($("<fieldset>", {class: "settingsFieldset"}) // Seal Notes Section
            .append($("<legend>", {class: "superuserTooltip", text: "Seal Notes", title: "Enable/Disable the Seal Notes"})
                .prepend($("<input>", {superUserSetting:"enable_sealNotes", class: "enableFeatureCheckbox", type: "checkbox"}))
            )
                .append($("<div>", {class: "settingsInputContainer"})
                        )
        )
        .append($("<fieldset>", {class: "settingsFieldset"}) // Notes Compliance Section
            .append($("<legend>", {class: "superuserTooltip", text: "Notes Compliance", title: "Enable/Disable the notes compliance display. Only effects the display, filters can still be used."})
                .prepend($("<input>", {superUserSetting:"enable_notesCompliance", class: "enableFeatureCheckbox", type: "checkbox"}))
            )

            .append($("<div>", {class: "settingsInputContainer"})
                .append($("<p>", {text: "Red Flag Limit", class: "superuserHoverTooltip superuserTooltip", title: "The number of hours a trailer can go without proper YMS notes until it flags with a red color."}))
                .append($("<select>", {class: "superuserSelect", superuserSetting: "notesCompliance_redFlagLimit"})
                    .append($("<option>", {text: "0 Hours (Always Show)", value: 0}))
                    .append($("<option>", {text: "4 Hours", value: 4}))
                    .append($("<option>", {text: "12 Hours", value: 12}))
                    .append($("<option>", {text: "24 Hours", value: 24}))
                    .append($("<option>", {text: "48 Hours", value: 48}))
                    .append($("<option>", {text: "72 Hours", value: 72}))
                )
                .append($("<p>", {text: "Yellow Flag Limit", class: "superuserHoverTooltip superuserTooltip", title: "The number of hours a trailer can go without proper YMS notes until it flags with a yellow color."}))
                .append($("<select>", {class: "superuserSelect", superuserSetting: "notesCompliance_yellowFlagLimit"})
                    .append($("<option>", {text: "0 Hours (Always Show)", value: 0}))
                    .append($("<option>", {text: "4 Hours", value: 4}))
                    .append($("<option>", {text: "12 Hours", value: 12}))
                    .append($("<option>", {text: "24 Hours", value: 24}))
                    .append($("<option>", {text: "48 Hours", value: 48}))
                )
            )
        )
        /*
        .append($("<p>", {class: "superuserButton purpleButton", text: "Export Settings"}).click(function() {
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings));
            var dlAnchorElem = document.getElementById('downloadAnchorElem');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", "yms-superuser-settings.json");
            dlAnchorElem.click();
        }))
        .append($("<input>", {class: "superuserButton purpleButton", text: "Import Settings", type: "file"}).change(function() {
            console.log($(this).val());
        }))
        .append($("<a>", {style: "display: none;", id: "downloadAnchorElem"}))
        */

        // This setting (DDU Doors/Dock Door assignments is going to be released in the future. Does nothing right now.
        /*.append($("<fieldset>", {class: "settingsFieldset"})
            .append($("<legend>", {text: "DDU Doors"})
                .prepend($("<input>", {superUserSetting:"enable_DDUDoors", class: "enableFeatureCheckbox", type: "checkbox"}))
            )
            .append($("<div>", {class: "settingsInputContainer"})
                .append($("<p>", {text: "Color Door Availability", class: "superuserHoverTooltip superuserTooltip", title: "If Show DDU Doors is turned on, this will also check if the destination door is available, and will color it green if that door is available."}))
                .append($("<select>", {class: "superuserSelect", superUserSetting: "dduDoors_showDoorAvailable"})
                     .append($("<option>", {text: "Yes", value: 1}))
                     .append($("<option>", {text: "No", value: 0}))
                )
                .append($("<p>", {text: "Check Adjacent Doors", class: "superuserHoverTooltip superuserTooltip", title: "If Color Door Availability is turned on, this will also check the door before it an after it. If one of those is available, but the destination is not available, it will color the destination yellow."}))
                .append($("<select>", {class: "superuserSelect", superUserSetting: "dduDoors_checkAdjacentDoors"})
                     .append($("<option>", {text: "Yes", value: 1}))
                     .append($("<option>", {text: "No", value: 0}))
                )
            )
        )*/;
    $("[superUserSetting]").each(function () {
        try {
            var property = $(this).attr("superUserSetting");
            var value = eval("settings." + property);
            if ($(this).is("select, input[type=text]")) {
                $(this).val(value);
            }
            else if ($(this).is("input[type=checkbox]")) {
                //value ? $(this).prop("checked", true) : $(this).prop("checked", false);
                $(this).prop("checked", value);
            }
        }
        catch (e) {
            console.log("Error! " + e);
        }
    });
    $("[superUserSetting]").change(function () {
        var setting = $(this).attr("superUserSetting");
        var subSettings = setting.split(".");
        var value;
        if ($(this).is("select, input[type=text]")) {
            value = $(this).val();
        }
        else if ($(this).is("input[type=checkbox")) {
            value = $(this).prop("checked");
        }
        console.log("Setting " + setting + " to " + value);
        if (subSettings.length == 1) {
            settings[subSettings[0]] = value;
        }
        else if (subSettings.length == 2) {
            settings[subSettings[0]][subSettings[1]] = value;
        }
        else if (subSettings.length == 3) {
            settings[subSettings[0][subSettings[1]]][subSettings[2]] = value;
        }
        saveSettings();
    });

    $("[superuserHoverText]").on("mouseenter", function() {
        var tooltipText = $(this).attr("superuserHoverText");
        //$(this).append($("<p>", {class: "tooltipText", text: tooltipText}));
        $("p.tooltipText").show();
        $("p.tooltipText").text(tooltipText);
    }).on("mouseleave", function() {
        $("p.tooltipText").hide();
        $("p.tooltipText").text("-");
    });

    $("#superuserPanel").append($("<p>", {class: "tooltipText", text: "-"}));
    $("p.tooltipText").hide();

    $("#settingsTab fieldset.settingsFieldset").each(function() { // Go through each fieldset. If it has no settings in it, hide it.
        if ($(this).children().length <= 1) { // 1 for the legend.
            $(this).hide();
        }
    });
}

function initializeHelpTab() {
    $("#helpTab").append($("<a>", {href: "https://w.amazon.com/bin/view/Users/nlloppno/NathanLoppnowTools/YMSSuperuser/", target: "_blank"})
        .append($("<p>", {class: "yms-button blueButton largefont superuserFont superuserTooltip", title: "Opens WIKI in new tab", text: "Wiki"})));
    $("#helpTab").append($("<a>", {href: "https://issues.amazon.com/issues/create?template=20d9d000-e230-4011-bb9f-a862549aff64", target: "_blank"})
        .append($("<p>", {class: "yms-button blueButton largefont superuserFont superuserTooltip", title: "Opens SIM in new tab", text: "Open A Ticket"})));
    $("#helpTab").append($("<a>", {href: "mailto:nlloppno@amazon.com?subject=YMS Superuser Help"})
        .append($("<p>", {class: "yms-button blueButton largefont superuserFont superuserTooltip", title: "Opens email client", text: "Email"})));
    $("#helpTab").append($("<a>", {href: "https://w.amazon.com/bin/view/Users/nlloppno/NathanLoppnowTools/YMSSuperuser/Changelog", target: "_blank"})
        .append($("<p>", {class: "yms-button blueButton largefont superuserFont superuserTooltip", title: "Opens Changelog in new tab", text: "Changelog"})));
    $("#helpTab").append($("<br>", {}));
    $("#helpTab").append($("<br>", {}));
    $("#helpTab").append($("<br>", {}));
    $("#helpTab").append($("<br>", {}));
    $("#helpTab").append($("<p>", {class: "superuserFont largefont", text: "Before reaching out, please make sure you review the Wiki to see if your question is already explained there."}));
    $("#helpTab").append($("<p>", {class: "superuserFont largefont", text: "If your question is not answered from the Wiki, please open a ticket. This allows me to easily organize all questions/bug reports and get to them in the order they came in. Please make sure you set the severity properly. A spelling error is no severity. A bug that spams assets on your page is a SEV3. Nothing is a SEV2 or SEV1."}));
}

function initializeDashboardTab() {

    $("#dashboardTab").children().each(function() {$(this).remove();});
    //$("#quickViewContainer").each(function() {$(this).remove();});
    $("#filters").empty();
    //$("#dashboardQuickView").append($("<div>", {id: "filters", style: "list-style: table"}));

    //$("#headerNav").append($("<div>", {id: "quickViewContainer"}));


    //$("<div>", {id: "quickViewContainer"}).insertAfter("div.a-section.header-leftpanel");

    for (var cat in settings.dashboardCategories) {
        var catID = settings.dashboardCategories[cat].id;
        var catName = settings.dashboardCategories[cat].name;
        $("#dashboardTab")
            .append($("<fieldset>", {class: "dashboardDeck", category: catID})
                .append($("<legend>", {text: catName}))
            );
    }

    for (var card in settings.dashboardFilters) {
        var category = settings.dashboardFilters[card].category;
        var title = settings.dashboardFilters[card].title;
        var filters = settings.dashboardFilters[card].filters;
        var filterID = settings.dashboardFilters[card].id;
        var enableNotifications = settings.dashboardFilters[card].enableNotifs;
        var quickView = settings.dashboardFilters[card].quickView;

        if (quickView == undefined) {
            quickView = 0;
            settings.dashboardFilters[card].quickView = 0;
            saveSettings();
        }
        if (category == "" || category == "NA" || category == null) {
            console.log("Filter " + card + " does not have a category set. Skipping...");
            continue;
        }
        else if (settings.dashboardCategories[category] == undefined) {
            console.log("Category " + category + " does not exist. Was it deleted?");
            //settings.dashboardFilters[card].category = "";
            //saveSettings();
            continue;
        }
        if ($("#dashboardTab fieldset[category='" + category + "']").length == 0) { // If the category isn't already listed in the dashboard, add it.
            var categoryName = settings.dashboardCategories[category].name;
            $("#dashboardTab")
                .append($("<fieldset>", {class: "dashboardDeck", category: category})
                    .append($("<legend>", {text: categoryName}))
                );
        }
        $("#dashboardTab fieldset[category='" + category + "']")
            .append($("<div>", {class: "dashboardCard", filterid: filterID, enablenotifications: enableNotifications})
                .append($("<h1>", {text: title}))
                .append($("<p>", {text: "...", filters: filters, count: "0"}))
            );
        if (quickView == 1) {
            //console.debug(`${title} added to QuickView`);
            //$("#quickViewContainer").append(
                //$("<div>", {class: "quickViewFilter"})
                    //.append($("<h1>", {text: title}))
                    //.append($("<p>", {filters: filters, text: "..."}))
                    //.click(function() {
                        //var filter = $(this).find("p").attr("filters");
                        //var filterName = $(this).find("h1").text();
                        //applyFilter(filter, filterName);
                    //})
            //);
            $("#filters").append(
                $("<div>", {class: "quickViewFilter"})
                    .append($("<h1>", {text: title}))
                    .append($("<p>", {filters: filters, text: "..."}))
                    .click(function() {
                        let filter = $(this).find("p").attr("filters");
                        let filterName = $(this).find("h1").text();
                        applyFilter(filter, filterName);
                    })
            );
        }
    }

    $("div.dashboardCard").click(function() {
        var filter = $(this).find("span").attr("filters");
        var filterName = $(this).find("h1").text();
        $("#superuserPanel").toggle();
        applyFilter(filter, filterName);
    });

    $("fieldset.dashboardDeck").each(function() {
        if ($(this).find("div.dashboardCard").length == 0) {
            $(this).hide();
        }
    });
}

function initializeDDUDoorsTab() {
    // TODO
}

function initializeDashboardEditTab() {
    $("#dashboardEditTab").append($("<div>", {class: "selectorBox"})
        .append($("<p>", {class: "yms-button blueButton superuserTabActive", text: "Filters", id: "filtersTabButton"}).click(function() {fillDashboardEditTabWithFilters(); $(this).addClass("superuserTabActive"); $("#categoriesTabButton").removeClass("superuserTabActive");}))
        .append($("<p>", {class: "yms-button blueButton", text: "Categories", id: "categoriesTabButton"}).click(function() {fillDashboardEditTabWithCategories(); $(this).addClass("superuserTabActive"); $("#filtersTabButton").removeClass("superuserTabActive");}))
    );
    $("#dashboardEditTab").append($("<div>", {class: "itemlistbox"}));
    fillDashboardEditTabWithFilters();


    $("#dashboardEditTab div.itemlistbox");


}

// This function will iterate over all the filters and fill them into
// the filter editor tab. Creates the buttons and event listeners for
// clicks. Also makes the list draggable using jQuery UI.
function fillDashboardEditTabWithFilters() {
    $("#dashboardEditTab div.itemlistbox").children().each(function() {$(this).remove();});
    $(".categoryCustomizer, #filterHolder, div.filterSaveOptions").each(function() {$(this).remove();});

    // Iterate over all of the categories and add holders for them.
    for (var cat in settings.dashboardCategories) {
        var thisCat = settings.dashboardCategories[cat];
        $("#dashboardEditTab .itemlistbox").append($("<fieldset>", {class: "settingsFieldset", categoryID: thisCat.id}).append($("<legend>", {text: thisCat.name})));
    }

    // Add the "No Category" option. These filters still can be edited, but will not show up in the dashboard.
    $("#dashboardEditTab .itemlistbox").append($("<fieldset>", {class: "settingsFieldset", categoryID: "NA"}).append($("<legend>", {text: "No Category"})));


    // Initalize the sortable UI for the filters.
    $("#dashboardEditTab .itemlistbox [categoryID]").sortable({connectWith: "[categoryID]", items: ".itemlistitem", handle: ".draggable-handle"});

    // Listen for changes (Any time it gets sorted) and save the order.
    $("#dashboardEditTab .itemlistbox [categoryID]").on("sortupdate", function(event, ui) {
        if ($("#dashboardEditTab .itemlistbox p[filtername]").length < 1) {
            console.log("Nothing found for sortable items!");
            return;
        }
        var tempFiltersObj = {};
        $("#dashboardEditTab .itemlistbox [categoryID] .itemlistitem").each(function() {
            var currentCategory = $(this).parent().attr("categoryid");
            console.log($(this).attr("filtername"));
            var currentFilterName = $(this).attr("filtername");
            var currentFilter = settings.dashboardFilters[currentFilterName];
            if (currentFilter == undefined) {
                return;
            }
            currentFilter.category = currentCategory;
            tempFiltersObj[currentFilterName] = currentFilter;
        });
        //console.log(JSON.stringify(tempFiltersObj));
        settings.dashboardFilters = tempFiltersObj;
        saveSettings();
        initializeDashboardTab();
    });


    for (var filter in settings.dashboardFilters) {
        var category = settings.dashboardFilters[filter].category;
        if ($("#dashboardEditTab .itemlistbox [categoryID='" + category + "']").length == 0) {
            category = "NA";
        }
        var title = settings.dashboardFilters[filter].title;
        var filters = settings.dashboardFilters[filter].filters;
        //$("#dashboardEditTab .itemlistbox")
        $("#dashboardEditTab .itemlistbox [categoryID='" + category + "']").append($("<p>", {class: "itemlistitem superuserFont", text: title, filtername: filter, filters: filters}).click(function() {
            $("#dashboardEditTab .itemlistbox .itemlistitem").each(function() {
                $(this).removeClass("superuserTabActive");
            });
            $(this).addClass("superuserTabActive");
            $("#dashboardEditTab .filterCustomizer, #dashboardEditTab .categoryCustomizer, div.filterSaveOptions").each(function() {$(this).remove();});

            $("#dashboardEditTab").append($(getFilterCustomizerSaveOptions($(this).attr("filtername"))));

            $(this).attr("filters").split("|").forEach(filter => {
                $("#dashboardEditTab #filterHolder").append(getFilterCustomizer(filter));
            });
            //$("#dashboardEditTab").append(getFilterCustomizer($(this).attr("filtername")));
        })
        .prepend($("<img>", {src: "https://nathanloppnowtools.s3.us-east-2.amazonaws.com/YMSSuperuser/fourarrows.png", class: "draggable-handle"})));
    }
    if ($("#dashboardEditTab #filterHolder").length == 0) {
        $("#dashboardEditTab").append($("<div>", {id: "filterHolder"}));
    }
    $("#dashboardEditTab .itemlistbox [categoryID='NA']").append($("<p>", {class: "greenbackground itemlistitem superuserFont", text: "New Filter"}).click(function() {
        var newUUID = crypto.randomUUID();
        var newFilter = JSON.parse(JSON.stringify(filterTemplate));
        newFilter.id = newUUID;
        settings.dashboardFilters[newUUID] = newFilter;
        saveSettings();
        fillDashboardEditTabWithFilters();
        $("#dashboardEditTab .itemlistbox [filtername='" + newUUID + "']").click();
    }));
}

// This function will iterate over all the valid categories and fill them
// all into the Categories tab. Creates buttons and event listeners.
function fillDashboardEditTabWithCategories() {
    $("#dashboardEditTab div.itemlistbox").children().each(function() { // Remove all current options in the list box.
        $(this).remove();
    });
    $("div.filterSaveOptions, #filterHolder").each(function() {$(this).remove()}); // Remove anything that may be left over from editing filters.
    for (var category in settings.dashboardCategories) { // Iterate over all categories
        console.log(category);
        var name = settings.dashboardCategories[category].name; // Get the current category name from settings
        $("#dashboardEditTab .itemlistbox").append($("<p>", {class: "itemlistitem superuserfont", text: name, categoryname: category}) // Append a new box to the list box with the categorys information
            .click(function() { // Register click listener
            $("#dashboardEditTab .itemlistbox .itemlistitem").each(function() { // On click, set everything to not active
                $(this).removeClass("superuserTabActive");
            });
            $(this).addClass("superuserTabActive"); // Then set this one as active
            $("#dashboardEditTab .categoryCustomizer, #dashboardEditTab .filterCustomizer, #filterHolder").each(function() {$(this).remove();}); // Remove everything that may be left over from editing the last category
            $("#dashboardEditTab").append(getCategoryCustomizer($(this).attr("categoryname"))); // Get the new category customizer and add it.
            $("#dashboardEditTab").append(getCategoryCustomizerSaveOptions($(this).attr("categoryname"))); // Get the category's save options and add them
        })
        .prepend($("<img>", {src: "https://nathanloppnowtools.s3.us-east-2.amazonaws.com/YMSSuperuser/fourarrows.png", class: "draggable-handle"}))); // Draggable handle
    }
    $("#dashboardEditTab .itemlistbox").append($("<p>", {class: "greenbackground itemlistitem superuserfont", text: "New Category"}).click(function() {
        var newUUID = crypto.randomUUID();
        var newCategory = JSON.parse(JSON.stringify(categoryTemplate));
        newCategory.id = newUUID;
        settings.dashboardCategories[newUUID] = newCategory;
        saveSettings();
        fillDashboardEditTabWithCategories();
    }));

    $("#dashboardEditTab .itemlistbox").sortable({items: ".itemlistitem:not(.greenbackground)", handle: ".draggable-handle"});

    // Listen for changes (Any time it gets sorted) and save the order.
    $("#dashboardEditTab .itemlistbox").on("sortupdate", function(event, ui) {
        if ($("#dashboardEditTab .itemlistbox p[categoryname]").length < 1) {
            console.log("Nothing found for sortable items!");
            return;
        }
        var tempCategoriesObj = {};
        $("#dashboardEditTab .itemlistbox .itemlistitem").each(function() {
            console.log($(this).attr("categoryname"));
            var currentCategoryName = $(this).attr("categoryname");
            var currentCategory = settings.dashboardCategories[currentCategoryName];
            if (currentCategory == undefined) {
                return;
            }
            tempCategoriesObj[currentCategoryName] = currentCategory;
        });
        settings.dashboardCategories = tempCategoriesObj;
        saveSettings();
        initializeDashboardTab();
    });

}


// This function will intake a filter in its raw format (anzg=1 empty=1)
// and then will return the customizer for that filter. This should be
// called for each sub-filter in a filterset.
function getFilterCustomizer(filter) {

    // This is the base selector that is used several times for all the different yes/no/- options for the specific filters.
    var baseFilterSelector = $("<select>", {class: "superuserselect"})
        .append($("<option>", {class: "", value: "NA", text: "-", selected: true}))
        .append($("<option>", {class: "", value: "1", text: "Yes"}))
        .append($("<option>", {class: "", value: "0", text: "No"}));

    var thisID = crypto.randomUUID(); //Get a new UUID for easy differentiation of objects.
    var thisFilterCustomizer = $("<fieldset>", {class: "filterCustomizer settingsFieldset", filterTempID: thisID}) // Initialize the filter customizer.
                .append($("<legend>", {class: "flex-container", text: "Filter"})
                    .append($("<span>", {class: "orangeButton yms-button yms-button-primary", text: "Remove"}).click(function() {$(this).parent().parent().remove()})) // When the remove button is clicked, delete self.
                    .append($("<span>", {class: "blueButton yms-button", text: "Add Another"}).click(function() {$("#filterHolder").append($(getFilterCustomizer("new=1")))})) // When the new button is clicked, add new filter from filter "new=1" which does literally nothing lmfao
                );
    for (var validFilterCategory in validFilters) { // Iterate over all of the valid filter categories and add their selectors to the filter customizer.
        var validFilterCategoryObject = validFilters[validFilterCategory]; // Get the valid filter category
        var categoryName = validFilterCategoryObject.name; // Get its name
        $(thisFilterCustomizer).append($("<fieldset>", {class: "settingsFieldset"}) // Append a new fieldset as the filter category
            .append($("<legend>", {class: "", text: categoryName, id: validFilterCategoryObject.id})));
        for (var validFilter in validFilterCategoryObject.values) { // Iterate over all the valid filters in this category
            var filterPieces = validFilterCategoryObject.values[validFilter].split("|"); // Split the filter pieces up
            if (filterPieces.length != 3) { // If the filter is not exactly 3 pieces, someone did something wrong. Ignore it.
                console.log("Unknown Filter " + validFilterCategoryObject.values[validFilter]);
                continue;
            }
            var divID = crypto.randomUUID(); // Get a new UUID because why not lol
            $(thisFilterCustomizer).find("#" + validFilterCategoryObject.id).parent().append($("<div>", {class: "settingsOption", id: "div_" + divID})); // Find the category fieldset and add a new div for this filters buttons
            var filterDisplayName = filterPieces[0];
            var filterName = filterPieces[1];
            var filterType = filterPieces[2];

            var additionSelector = "[filterTempID='" + thisID + "'] #" + validFilterCategoryObject.id;

            $(thisFilterCustomizer).find("#div_" + divID).append($("<p>", {class: "", text: filterDisplayName}));

            // Switch by the type of filter, and add it's object to the selector.
            switch (filterType) {
                case "yesno":
                    var thisSelector = $(baseFilterSelector).clone();
                    $(thisSelector).attr("filtername", filterName);
                    $(thisFilterCustomizer).find("#div_" + divID).append($(thisSelector));
                    break;
                case "text":
                    $(thisFilterCustomizer).find("#div_" + divID).append($("<input>", {type: "text", filterName: filterName}));
                    break;
                default:
                    console.log("Unknown Filter Type \"" + filterType + "\" - Skipping...");
                    break;
            }
        }
    }

    // Finally, iterate over the inputtededed filter and set all the values in the customizer.
    filter.split(" ").forEach(filterPart => {
        var filterName = filterPart.split("=")[0];
        var filterValue = filterPart.split("=")[1];
        $(thisFilterCustomizer).find("[filtername='" + filterName + "']").val(filterValue);
    });

    return thisFilterCustomizer;
}

function getFilterCustomizerSaveOptions(id) {

    var filterObject = settings.dashboardFilters[id]; // Get the filter from settings as an object.
    //console.info(`ID: ${id}`);
    //console.info(settings.dashboardFilters);
    //console.debug("Current: ");console.debug(filterObject);

    var saveOptionsRow = $("<div>", {class: "filterSaveOptions"})
        //.append($("<button>", {class: "yms-button yms-button=secondary", text: "Copy"}).click(function() {
            //let newUUID = crypto.randomUUID(); //Get a new UUID for easy differentiation of objects.
            //let filterCopy = filterObject;
            //filterCopy.id = newUUID;
            //filterCopy.title = "Copy of " + filterCopy.title;
            //$("#filterNameEdit").val(filterCopy.title);
            //console.debug("Copy: ");console.debug(filterCopy);
            //settings.dashboardFilters.push(filterCopy);
            //saveSettings();
            //fillDashboardEditTabWithFilters();
            //initializeDashboardTab()
        //}))
        .append($("<p>", {class: "redButton yms-button", text: "Delete"}).click(function() {
            delete settings.dashboardFilters[id];
            saveSettings();
            fillDashboardEditTabWithFilters(); // Reset the edit tab
            initializeDashboardTab(); // Reset the dashboard
        }))
        .append($("<p>", {class: "blueButton yms-button", text: "Save"}).click(function() { // Save button
            var fullFilter = "";
            $("[filtertempid]").each(function() { // Go through and find all of the separate sub-filters that are in the editor.
                var thisFilterID = $(this).attr("filtertempid");
                $(this).find("[filtername]").each(function() { // Go through and get all of the specific filters that are set in each sub-filter
                    if (!($(this).val() == "NA" || $(this).val().length == 0)) {
                        if (fullFilter.length != 0 && !fullFilter.endsWith("|")) {
                            fullFilter += " ";
                        }
                        fullFilter += $(this).attr("filtername") + "=" + $(this).val();
                    }
                });
                fullFilter += "|"; // After each top-level filter is added, add a pipe to indicate "or", then continue adding the other sub-filters on
            });
            fullFilter = fullFilter.substring(0, fullFilter.lastIndexOf("|")); // Cut down the filter, else it will just look for anything lol
            settings.dashboardFilters[id].filters = fullFilter;
            settings.dashboardFilters[id].title = $("#filterNameEdit").val(); // Set the name to settings
            //settings.dashboardFilters[id].category = $("#filterCategorySelector").val(); // Set the category to settings
            settings.dashboardFilters[id].enableNotifs = $("#enableNotifsSelect").val(); // Set whether or not to show notifications
            settings.dashboardFilters[id].quickView = $("#enableQuickViewSelect").val();
            saveSettings(); // Save settings to localStorage
            fillDashboardEditTabWithFilters(); // Reset the edit tab
            $(".itemlistitem[filtername='" + id + "']").click(); // Simulate a click on the item in the itemlist so it selects it and fills in the editor with the updated information (Nothing really should change, but just a way to make it look nice)
            initializeDashboardTab();
        }))
        .append($("<p>", {text: "Name"}))
        .append($("<input>", {type: "text", value: "...", id: "filterNameEdit"})) // Name input
        //.append($("<p>", {text: "Category"}))
        //.append($("<select>", {class: "superuserSelect", id: "filterCategorySelector"}) // Category selector
        //    .append($("<option>", {text: "Select a category...", value: ""}))
        //)
        .append($("<p>", {text: "Notifications"})) // Notifications selector
        .append($("<select>", {class: "superuserSelect superuserFont", id: "enableNotifsSelect"})
            .append($("<option>", {text: "Disabled", value: "0"}))
            .append($("<option>", {text: "Enabled", value: "1"}))
        )
        .append($("<p>", {text: "QuickView"}))
        .append($("<select>", {class: "superuserSelect superuserFont", id: "enableQuickViewSelect"})
            .append($("<option>", {text: "Disabled", value: "0"}))
            .append($("<option>", {text: "Enabled", value: "1"}))
        )

    // Iterate through categories and add an option to the drop down for each category.
    //for (var category in settings.dashboardCategories) {
    //    $(saveOptionsRow).find("#filterCategorySelector").append($("<option>", {text: settings.dashboardCategories[category].name, value: settings.dashboardCategories[category].id}));
    //}

    // Set the values of all the inputs.
    $(saveOptionsRow).find("#filterNameEdit").val(filterObject.title);
    //$(saveOptionsRow).find("#filterCategorySelector").val(filterObject.category); // Category selector removed in lieu of drag-n-drop option.
    $(saveOptionsRow).find("#enableNotifsSelect").val(filterObject.enableNotifs);
    $(saveOptionsRow).find("#enableQuickViewSelect").val(filterObject.quickView);

    return saveOptionsRow;
}

function getCategoryCustomizer(id) {
    var category = settings.dashboardCategories[id];
    console.log("Getting category: " + category.name);
    if (category == undefined) {
        return $("<p>", {text: "Unexpected Error. Please try again."});
    }
    var title = "Editing Category " + category.name;
    var categoryCustomizer = $("<fieldset>", {class: "categoryCustomizer settingsFieldset"})
        .append($("<legend>", {text: title}))
        .append($("<p>", {text: "Category settings will probably be merged into the same panel as filter settings in the future. There, you will be able to view everything in a much better and more clear way."}))
        //.append($("<input>", {type: "text", maxlength: 32}))
    ;

    return categoryCustomizer;

}

function getCategoryCustomizerSaveOptions(id) {
    var categoryObject = settings.dashboardCategories[id]; // Get the filter from settings as an object.

    var saveOptionsRow = $("<div>", {class: "filterSaveOptions"})
        .append($("<p>", {class: "redButton yms-button", text: "Delete"}).click(function() {
            delete settings.dashboardCategories[id];
            saveSettings();
            fillDashboardEditTabWithCategories(); // Reset the edit tab
            initializeDashboardTab(); // Reset the dashboard
        }))
        .append($("<p>", {class: "blueButton yms-button", text: "Save"}).click(function() { // Save button
            settings.dashboardCategories[id].name = $("#filterNameEdit").val(); // Set the name to settings
            saveSettings(); // Save settings to localStorage
            fillDashboardEditTabWithCategories(); // Reset the edit tab
            $(".itemlistitem[filtername='" + id + "']").click(); // Simulate a click on the item in the itemlist so it selects it and fills in the editor with the updated information (Nothing really should change, but just a way to make it look nice)
            initializeDashboardTab();
        }))
        .append($("<p>", {text: "Name"}))
        .append($("<input>", {type: "text", value: "...", id: "filterNameEdit"})) // Name input

    // Set the name and category to the inputs
    $(saveOptionsRow).find("#filterNameEdit").val(categoryObject.name);
    //$(saveOptionsRow).find("#filterCategorySelector").val(filterObject.category);
    //$(saveOptionsRow).find("#enableNotifsSelect").val(filterObject.enableNotifs);

    return saveOptionsRow;
}

function applyFilter(filter, filterName) {
    appliedFilter = filter;
    if (appliedFilter == "") {
        $("tbody.masterYardLP>tr").each(function() {
            $(this).show();
        });
        $(".currentFilterBox").hide();
        $("#clearFiltersButton").hide();
    }
    else {
        $(".currentFilterBox").show();
        $("#clearFiltersButton").show();
    }
    $("a>div.ui-refresh-icon").click();
    $(".currentFilterBox").text("Current Filter: " + filterName);
}

function updateSealPresent(status = $("#sealPresentSelect").val()) {
    var currentNotes = $("#noteTextArea").val();
    //var status = $("#sealPresentSelect").val(); // Old version, used before I set the status in the function header.

    if (status != "NA") {
        $("#noteTextArea").val(status + "\n" + currentNotes);
    }
    $("#noteTextArea").get(0).dispatchEvent(new Event("change"));
}

function updateTagStatus(status = $("#tagStatusSelect").val()) {
    var currentNotes = $("#noteTextArea").val();
    //var status = $("#tagStatusSelect").val();

    var lines = currentNotes.split("\n");

    var properNoteFound = false;
    var linesToSkip = 0;

    $("#quickNoteSelect option").each(function () {
        if ($(this).val().split("\n")[0] == lines[0]) {
            linesToSkip = $(this).val().split("\n").length;
        }
    });
    var newNotes = "";
    for (var i = 0; i < linesToSkip; i++) {
        newNotes += lines.shift() + "\n";
    }
    if (linesToSkip > 0) {
        newNotes += "\n";
    }
    newNotes += status + "\n";
    for (var j = 0; j < lines.length; j++) {
        newNotes += lines[j] + "\n";
    }

    if (status != "NA") {
        $("#noteTextArea").val(newNotes);
    }
    $("#noteTextArea").get(0).dispatchEvent(new Event("change"));
}

function updateYMSNote() {
    var currentNotes = $("#noteTextArea").val();
    var status = $("#quickNoteSelect").val();

    if (status != "NA") {
        $("#noteTextArea").val(status + "\n" + currentNotes);
        $("#quickNoteSelect option[value='NA']").prop("selected", "true");
        $("#noteTextArea").get(0).dispatchEvent(new Event("change"));
    }
}

// =========================
// Automatic functions that
// alter the page appearance
// =========================

function updateFilteredResults(force = false) {
    if (appliedFilter.length == 0) {
        return;
    }

    var itemsInThisSpot = 0;
    var spotName = "";
    var currentSpot = "";
    var currentSpotMatches = false;
    var selectorString = "tbody.masterYardLP>tr[categoriesApplied]:not([filteredTo='" + appliedFilter + "'])";

    if (force) {
        selectorString = "tbody.masterYardLP>tr";
        console.log("Forcing update of filtered results.");
    }
    console.info(`SelectorString: ${selectorString}`);
    $(selectorString).each(function() {
        $(this).attr("filteredTo", appliedFilter);
        spotName = $(this).attr("id");
        if ($(this).find(".col1").length > 0 /*&& !$(this).is(getFilter(appliedFilter))*/) {
            currentSpot = spotName;
            currentSpotMatches = false;
            itemsInThisSpot = 0;
        }
        if ($(this).is(getFilter(appliedFilter))) {
            $(this).show();
            if ($(this).find(".col1").length > 0) {
                itemsInThisSpot = 1;
                currentSpotMatches = true;
            }
            else {
                itemsInThisSpot += 1;
                $("#" + spotName + " .col1").prop("rowspan", itemsInThisSpot);
            }
        }
        else {
            $(this).hide();
        }
        if (!currentSpotMatches && itemsInThisSpot > 0) {
            console.log("Bruh. Laggy af if this is running.");
            $("#" + currentSpot + ">:not('.col1')").each(function() {$(this).hide()});
            $("#" + currentSpot).show();
            $("#" + currentSpot + " .col1").prop("rowspan", itemsInThisSpot + 1);
        }
        else if (itemsInThisSpot > 0) {
            $("#" + currentSpot + " .col1").prop("rowspan", itemsInThisSpot);
        }
        $("#" + spotName + " .col2").prop("rowspan", "1");
    });
}

function getFilter(filter) {
    var filterString = "";
    filter.split("|").forEach(thisFilter => {
        var filters = thisFilter.split(" ");
        for (var f in filters) {
            filterString += "[category_" + filters[f] + "]";
        }
        filterString += ", ";
    });
    filterString = filterString.substring(0, filterString.lastIndexOf(","));

    return filterString;
}


function updateCategories(force = false) {
    var spotType = "";
    var hasTractor = false;
    var lastTractorID = "";
    var lastTractorIcon = null;
    var selectorString = "tbody.masterYardLP>tr:not([categoriesApplied])";
    var hasBeenChanged = false;


    if (force) {
        selectorString = "tbody.masterYardLP>tr";
        console.log("Forcing update of categories...");
    }
    $(selectorString).each(function () {
        hasBeenChanged = true;
        var owneropField = $(this).children(".col8").find(".ownerOperatorCodeGroup span").text().split(" ");
        var scac = "";
        var operator = "";

        if (owneropField.length > 1) {
            scac = owneropField[0];
            operator = owneropField[1].replaceAll(/[\(\)]/g, "");
        }

        let offsite = $(this).children(".col1").text().includes("OSY");
        var empty = $(this).children(".col2").find(".yardasset-empty").length > 0;
        var loaded = $(this).children(".col2").find(".yardasset-full").length > 0;
        var inprogress = $(this).children(".col2").find(".yardasset-in-progress").length > 0;
        //var hasVRID = $(this).children(".col9").find("div.load-identifiers").children().length > 0;
        var hasVRID = $(this).children(".col9").find("div.load-identifiers").children().text().includes("VRID ");
        var hasISA = $(this).children(".col9").find("div.load-identifiers").children().text().includes("ISA ");
        var occupied = $(this).is(":not(.empty-location)");
        var note = $(this).find("div#noteContainer p").text().toLowerCase();
        var hasTagNote = note.includes(" tagged");
        var hasSealNote = note.includes("yes seal at ci") || note.includes("no seal at ci") || note.includes("undetermined seal condition due to");
        var hasBolNote = note.includes("bolwseal") || note.includes("bolwoutseal") || note.includes("blue flag");
        var hasGoodWoodPalletNote = note.includes("niwood");
        var hasBadWoodPalletNote = note.includes("nibadwood");
        //var hasbadWoodPalletNote = note.includes("nibadwood"); // only god knows why the code wont work without this and i dont belive in god
        var hasUPPNote = note.includes("niupp");
        var hasTotesNote = note.includes("nitotes");
        var blueFlag = note.includes("blue flag");
        var visitReason = $(this).find(".col5>div").text();
        var categories = {"azng": 0, "aznu": 0, "azna": 0, "aap": 0, "3p": 0, "empty": 0, "loaded": 0, "inprogress": 0, "hasVRID": 0, "hasISA": 0, "airplane": 0, "tractor": 0, "trailer": 0, "swapbody": 0, "dolly": 0, "pup": 0, "intermodal": 0, "boxtruck": 0, "car": 0, "van": 0, "person": 0, "otherasset": 0, "yellowtagged": 0, "redtagged": 0, "hastagnote": 0, "hassealnote": 0, "hasbolnote": 0, "blueflag": 0, "hasymsnote": 1, "hasgoodwoodpalletsnote": 0, "hasbadwoodpalletsnote": 0, "hasuppnote": 0, "hasemptytotesnote": 0, "inbound": 0, "outbound": 0, "noninventory": 0, "longdwell": 0, "parkingslip": 0, "dockdoor": 0, "offsite": 0};
        //if ($(this).find(".yard-asset-icon-AIRPLANE").length > 0) {
        //    categories.airplane = 1;
        //}
        $(this).attr("category_scac", scac);
        $(this).attr("category_operator", operator);

        if (scac == "AZNG") {
            categories.azng = 1;
            categories.aap = 1;
        }
        else if (scac == "AZNU") {
            categories.aznu = 1;
            categories.aap = 1;
        }
        else if (scac == "AZNA") {
            categories.azna = 1;
            categories.aap = 1;
        }
        else {
            categories["3p"] = 1;
        }

        visitReason = visitReason.replaceAll(/[^a-zA-Z0-9]/g, "");

        switch (visitReason.toLowerCase()) {
            case "inbound":
                categories.inbound = 1;
                break;
            case "outbound":
                categories.outbound = 1;
                break;
            case "noninventory":
                categories.noninventory = 1;
                break;
        }

        if ($(this).find(".yard-asset-icon-TRAILER, .yard-asset-icon-TRAILER_SKIRTED, .yard-asset-icon-TRAILER_INTERMODAL, .yard-asset-icon-TRAILER_REFRIGERATED, .yard-asset-icon-TRAILER_BOX_TRUCK, .yard-asset-icon-TRAILER_PUP, .yard-asset-icon-TRAILER_PUP_SKIRT, .yard-asset-icon-TRAILER_PUP_INTERMODAL, .yard-asset-icon-TRAILER_DOUBLE, .yard-asset-icon-TRAILER_SOFT, .yard-asset-icon-TRAILER_FLATBED").length > 0) {
            categories.trailer = 1;
        }
        if ($(this).find(".yard-asset-icon-TRAILER_INTERMODAL").length > 0) {
            categories.intermodal = 1;
        }
        if ($(this).find(".yard-asset-icon-TRAILER_PUP, .yard-asset-icon-TRAILER_PUP_SKIRT, .yard-asset-icon-TRAILER_PUP_INTERMODAL").length > 0) {
            categories.pup = 1;
        }
        if ($(this).find(".yard-asset-icon-SWAP_BODY").length > 0) {
            categories.swapbody = 1;
        }
        if ($(this).find(".yard-asset-icon-TRACTOR, .yard-asset-icon-TRACTOR_FLATBED").length > 0 && (categories.trailer == 1 || categories.intermodal == 1 || categories.pup == 1)) {
            //categories.tractor = 1;
            hasTractor = true;
        }
        else if ($(this).find(".yard-asset-icon-TRACTOR, .yard-asset-icon-TRACTOR_FLATBED").length > 0) {
            categories.tractor = 1;
        }
        else {
            if (hasTractor) {
                categories.tractor = 1;
            }
            hasTractor = false;
        }
        if ($(this).find(".yard-asset-icon-BOX_TRUCK, .yard-asset-icon-BOX_TRUCK_2T, .yard-asset-icon-BOX_TRUCK_4T, .yard-asset-icon-BOX_TRUCK_10T").length > 0) {
            categories.boxtruck = 1;
        }
        if ($(this).find(".yard-asset-icon-AIRPLANE").length > 0) {
            categories.airplane = 1;
        }
        if ($(this).find(".yard-asset-icon-CAR").length > 0) {
            categories.car = 1;
        }
        if ($(this).find(".yard-asset-icon-PERSON").length > 0) {
            categories.person = 1;
        }
        if ($(this).find(".yard-asset-icon-SPRINTER_VAN").length > 0) {
            categories.van = 1;
        }
        if ($(this).find(".yard-asset-icon-MOTORCYCLE, .yard-asset-icon-THREE_WHEELER").length > 0) {
            categories.otherasset = 1;
        }

        if ($(this).find("div.yard-asset-yellow").length > 0) {
            categories.yellowtagged = 1;
        }
        if ($(this).find("div.yard-asset-red").length > 0) {
            categories.redtagged = 1;
        }

        if (offsite) {
            categories.offsite = 1;
        }
        if (empty) {
            categories.empty = 1;
        }
        else if (loaded) {
            categories.loaded = 1;
        }
        else if (inprogress) {
            categories.inprogress = 1;
        }
        if (hasVRID) {
            categories.hasVRID = 1;
        }
        if (hasISA) {
            categories.hasISA = 1;
        }
        if (hasTagNote) {
            categories.hastagnote = 1;
        }
        if (hasSealNote) {
            categories.hassealnote = 1;
        }
        if (hasBolNote) {
            categories.hasbolnote = 1;
        }
        if (blueFlag) {
            categories.blueflag = 1;
        }

        var YMSCodes = ["IBVEND", "IBUNSELL", "IBPROBSOLV", "IBCRET", "IBTRANS", "IBUNDELIV", "IBMISSHIP", "IBREJECT","FULLPOD", "EMPTYPOD", "IBFoundLoaded", "IBDONATE", "RMVLIQEMPTY", "RMVRECEMPTY", "RMVLTLEMPTY", "RMVDONEMPTY", "RMVLIQ", "RMVREC", "RMVLTL", "RMVDON", "OBSCHED", "OBLATE", "OBVRET", "OBTHO", "OBRTD", "OBTRANSLOAD", "OBDEPARTED", "OBRECOVERY", "LNCHPOD", "WASTE", "APSTORAGE", "NONAPSTORAGE", "LEGALHOLD", "NIEMPTY", "OBEMPTY","OBMISLOAD", "IBEMPTY", "NICONSUM", "NIBADWOOD", "NIWOOD", "NIAMXL", "NIUSPS", "NIBADUPP", "NIUPP", "NIBADTOTES", "NITOTES", "NIBADCARTS", "NICARTS","NIRECY", "NISTORAGE", "NIFRESHGUPP"];

        var valid = YMSCodes.some(thiscode => note.includes(thiscode.toLowerCase()));
        var inbound = $(this).find(".col5>div").text().toLowerCase().includes("inbound");
        var dwellTime = $(this).find("td.col4 span").text();
        var redFlagLimit = settings.notesCompliance_redFlagLimit;
        var yellowFlagLimit = settings.notesCompliance_yellowFlagLimit;

        if (!valid && occupied) {
            categories.hasymsnote = 0;
        }

        if (isMoreThanHours(dwellTime, 72)) {
            categories.longdwell = 1;
        }
        if (hasGoodWoodPalletNote){
            categories.hasgoodwoodpalletsnote = 1;
        }
        if (hasBadWoodPalletNote){
            categories.hasbadwoodpalletsnote = 1;
        }
        if (hasUPPNote){
            categories.hasuppnote = 1;
        }
        if (hasTotesNote){
            categories.hasemptytotesnote = 1;
        }

        //console.log(`Occupied: ${occupied}`);

        if (isMoreThanHours(dwellTime, redFlagLimit) && settings.enable_notesCompliance) {
            $(this).attr("dwell", "red");
        }
        else if (isMoreThanHours(dwellTime, yellowFlagLimit) && settings.enable_notesCompliance) {
            $(this).attr("dwell", "yellow");
        }
        else {
            $(this).removeAttr("dwell");
        }

        if ($(this).find(".col1 div.location-type-ParkingLocation").length > 0) {
            spotType = "parkingslip";
        }
        else if ($(this).find(".col1 div.location-type-ProcessingLocation").length > 0) {
            spotType = "dockdoor";
        }

        categories[spotType] = 1;

        for (var cat in categories) {
            $(this).attr("category_" + cat, categories[cat]);
        }

        $(this).attr("categoriesApplied", "1");

    });

    if (hasBeenChanged) {
        updateFilteredResults();
        updateDashboard();
        console.log("updateCategories() triggered updateFilteredResults() and updateDashboard()");
    }

    console.log("updateCategories() complete.");

}

// Updates the popup that shows when editing a note. This is what adds the drop downs for quick notes.
function updateNotesDisplay() {
    $("#noteEditForm").each(function () {
        if ($("#superuserNotesDiv").length < 1) {
            var thisCarrier = $("#yms-annotation-modal-body #noteValues :nth-child(2)").text();
            var thisID = $("#yms-annotation-modal-body #noteValues :nth-child(3)").text();

            $(this).prepend($("<div>", {id: "notesButtonsHolder", style: "width: 80%;"}));
            if (thisCarrier == "AZNG" || thisCarrier == "AZNU" || thisCarrier == "AZNA") {
                $("#notesButtonsHolder").prepend("<br>", {});
                $("#notesButtonsHolder").prepend($("<a>", {target: "_blank", href: "https://aap-na.corp.amazon.com/page/891a81dc-538d-4f10-be93-441545840a24"})
                    .append($("<p>", {class: "yms-button blueButton superuserTooltip", text: "New Unplanned Service", title: "Opens Relay Garage in a new tab and copies the vehicle ID to the clipboard"}).click(function() {navigator.clipboard.writeText(thisID);})));
                $("#notesButtonsHolder").prepend($("<a>", {target: "_blank", href: "https://aap-na.corp.amazon.com/page/817ca098-8441-4329-a71e-6768f9d7e6c5?ids=" + thisID})
                    .append($("<p>", {class: "yms-button blueButton superuserTooltip", text: "View Planned Services", title: "Opens Relay Garage in a new tab"})));
                $("#notesButtonsHolder").prepend($("<a>", {target: "_blank", href: "https://aap-na.corp.amazon.com/page/817ca098-8441-4329-a71e-6768f9d7e6c5?tab=Unplanned&ids=" + thisID})
                    .append($("<p>", {class: "yms-button blueButton superuserTooltip", text: "View Unplanned Services", title: "Opens Relay Garage in a new tab"})));

                if ($(this).find("#noteTextArea").val().toLowerCase().includes("tagged")) {
                    $("#notesButtonsHolder").append($("<a>", {target: "_blank", href: "https://sim.amazon.com/issues/create?template=f2ed0984-e318-4e4e-84b3-a898f2ad23d4"})
                        .append($("<p>", {class: "yms-button greenButton superuserTooltip", text: "Open Flip SIM", title: "Opens the flip SIM template"})));
                }
            }
            var httpRegexG = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;

            var matches = $(this).find("#noteTextArea").val().match(httpRegexG);
            if (matches != null) {
                matches.forEach(link => {
                    var linkText = "Open Link";
                    if (link.includes("sim.amazon.com") || link.includes("t.corp.amazon.com") || link.includes("issues.amazon.com")) {
                        linkText = "Open SIM";
                    }
                    else if (link.includes("aap-na.corp.amazon.com")) {
                        linkText = "Open AAP";
                    }
                    else if (link.includes("paragon-na.amazon.com")) {
                        linkText = "Open Paragon";
                    }
                    $("#notesButtonsHolder").append($("<a>", {target: "_blank", href: link})
                        .append($("<p>", {class: "yms-button blueButton superuserTooltip", text: linkText, title: "Opens " + link})));
                });
            }


            //Add the notes div
            $(this).append($("<div>", {id: "superuserNotesDiv", style: "display: inline-block;"}));
            //Seal present
            $("#superuserNotesDiv").append($("<div>", {id: "sealStatusDiv", style: "display: flex;"}));
            //Removed seal verification notes due to having a different process now
            if (settings.enable_sealNotes){
           $("#sealStatusDiv").append(
                $("<select>", {id: "sealPresentSelect", class: "superuserSelect superuserFont"})
                    .append($("<option>", {text: "Seal Status", value: "NA"}))
                    .append($("<option>", {text: "Yes", value: "Yes seal at CI"}))
                    .append($("<option>", {text: "No", value: "No seal at CI"}))
                    .append($("<option>", {text: "Undetermined - CI Miss", value: "Undetermined seal condition due to check-in miss"}))
                    .append($("<option>", {text: "Undetermined - Weather", value: "Undetermined seal condition due to weather conditions"}))
                    .append($("<option>", {text: "Undetermined - Camera", value: "Undetermined seal condition due to camera issues"}))
                    .append($("<option>", {text: "Undetermined - Visibility", value: "Undetermined seal condition due to visibility problems"}))
                    .append($("<option>", {text: "Undetermined (Must add reason)", value: "Undetermined seal condition due to "}))
                    .on("change", function() {updateSealPresent()})
            );
            $("#sealStatusDiv").append($("<p>", {text: "Yes Seal", class: "yms-button blueButton quickNoteButton"}).click(function(){updateSealPresent("Yes seal at CI")}));
            $("#sealStatusDiv").append($("<p>", {text: "No Seal", class: "yms-button blueButton quickNoteButton"}).click(function(){updateSealPresent("No seal at CI")}));
            $("#superuserNotesDiv").append($("<br>"));
            // BOL dropdown
            if (settings.ixd_bol == "1") {
                $("#superuserNotesDiv").append($("<div>", {id: "bolStatusDiv", style: "display: flex;"}));
                $("#bolStatusDiv").append($("<p>", {text: "Yes Seal On BOL", class: "yms-button blueButton quickNoteButton"}).click(function(){updateSealPresent("BOLWSEAL")}));
                $("#bolStatusDiv").append($("<p>", {text: "No Seal On BOL", class: "yms-button blueButton quickNoteButton"}).click(function(){updateSealPresent("BOLWOUTSEAL")}));
                if (settings.ixd_blueflag == "1") {
                    $("#superuserNotesDiv").append($("<br>", {}));
                    $("#superuserNotesDiv").append($("<div>", {id: "blueFlagStatusDiv", style: "display: flex;"}));
                    $("#blueFlagStatusDiv").append($("<p>", {text: "Blue Flag - Mismatch Seal", class: "yms-button blueButton quickNoteButton"}).click(function(){updateSealPresent("Blue Flag Trailer\nMismatch Seal")}));
                    $("#blueFlagStatusDiv").append($("<p>", {text: "Blue Flag - Missing Seal", class: "yms-button blueButton quickNoteButton"}).click(function(){updateSealPresent("Blue Flag Trailer\nMissing Seal")}));
                    $("#blueFlagStatusDiv").append($("<p>", {text: "Blue Flag - Tampered Seal", class: "yms-button blueButton quickNoteButton"}).click(function(){updateSealPresent("Blue Flag Trailer\nTampered Seal")}));
                }
                else {
                    $("#bolStatusDiv").append($("<p>", {text: "Blue Flag", class: "yms-button blueButton quickNoteButton"}).click(function(){updateSealPresent("Blue Flag Trailer")}));
                }
                $("#superuserNotesDiv").append($("<br>"));
            }
            }
            const now = new Date();
            const currentDateTime = now.toLocaleString();
            //Red/yellow tag options
            $("#superuserNotesDiv").append($("<div>", {id: "tagStatusDiv", style: "display: flex;"}));
            $("#tagStatusDiv").append($("<p>", {text: "Yellow Tag", class: "yms-button yellowButton quickNoteButton"}).click(function(){updateTagStatus("YELLOW TAGGED\nCASE NUMBER: \nYELLOW TAGGED BY: \nISSUE: \n")}));
            $("#tagStatusDiv").append($("<p>", {text: "Red Tag", class: "yms-button redButton quickNoteButton"}).click(function(){updateTagStatus("RED TAGGED\nCASE NUMBER: \nRED TAGGED BY: \nISSUE: \n")}));
            $("#tagStatusDiv").append($("<p>", {text: "Insert Date/time", class: "yms-button whiteButton quickNoteButton"}).click(function(){updateTagStatus(currentDateTime)}));
            /* // Old drop-down style of selector
            $("#superuserNotesDiv").append(
                $("<select>", {id: "tagStatusSelect", class: "superuserSelect superuserFont"})
                    .append($("<option>", {text: "Yellow/Red Tag Notes", value: "NA"}))
                    .append($("<option>", {text: "Yellow", value: "YELLOW TAGGED\nCASE NUMBER: \nYELLOW TAGGED BY: \nISSUE: \n"}))
                    .append($("<option>", {text: "Red", value: "RED TAGGED\nCASE NUMBER: \nRED TAGGED BY: \nISSUE: \n"}))
                    .on("change", function() {updateTagStatus()})
            );*/
            $("#superuserNotesDiv").append($("<br>"));
            //YMS codes drop downs.
            $("#superuserNotesDiv").append(
                $("<select>", {id: "quickNoteSelect", class: "superuserSelect width100 superuserFont"})
                    .append($("<option>", {text: "Add YMS Code...", value: "NA"}))
                    .append($("<optgroup>", {label: "Inbound"})
                        .append($("<option>", {text: "Inbound Problem Solve", value: "IBPROBSOLV"}))
                        .append($("<option>", {text: "Inbound Vendor", value: "IBVEND"}))
                        .append($("<option>", {text: "Unsellables", value: "IBUNSELL"}))
                        .append($("<option>", {text: "Customer Returns", value: "IBCRET"}))
                        .append($("<option>", {text: "Transship", value: "IBTRANS"}))
                        .append($("<option>", {text: "Undeliverables", value: "IBUNDELIV"}))
                        .append($("<option>", {text: "Misship - Requires 'Case xxxx' documented in notes", value: "IBMISSHIP\nCase: \n"}))
                        .append($("<option>", {text: "Rejection - Requires 'Case xxxx' documented in notes", value: "IBREJECT\nCase: \n"}))
                        .append($("<option>", {text: "Inbound Found Loaded", value: "IBFoundLoaded \n"}))
                        .append($("<option>", {text: "Inbound Donations", value: "IBDONATE"}))
                        .append($("<option>", {text: "Loaded Trailer for launch site", value: "FULLPOD"}))
                    )
                    .append($("<optgroup>", {label: "Outbound"})
                        .append($("<option>", {text: "OB Scheduled - >24 Hours from SDT", value: "OBSCHED"}))
                        .append($("<option>", {text: "OB Late - In Yard Past SDT", value: "OBLATE"}))
                        .append($("<option>", {text: "OB Trailer Hand Off", value: "OBTHO"}))
                        .append($("<option>", {text: "OB Vender Returns", value: "OBVRET"}))
                        .append($("<option>", {text: "OB Misloaded Trailer", value: "OBMISLOAD"}))
                    )
                    .append($("<optgroup>", {label: "Non-Inventory"})
                        .append($("<option>", {text: "Empty Go Carts", value: "NICARTS"}))
                        .append($("<option>", {text: "Broken Go Carts", value: "NIBADCARTS"}))
                        .append($("<option>", {text: "Empty Totes (Yellow)", value: "NITOTES"}))
                        .append($("<option>", {text: "Broken Totes (Yellow)", value: "NIBADTOTES"}))
                        .append($("<option>", {text: "Universal Pallets (Blue)", value: "NIUPP"}))
                        .append($("<option>", {text: "Bad Universal Pallets (Blue)", value: "NIBADUPP"}))
                        .append($("<option>", {text: "USPS Pallets", value: "NIUSPS"}))
                        .append($("<option>", {text: "Oversized Pallets (AMXL)", value: "NIAMXL"}))
                        .append($("<option>", {text: "Good Wood Pallets", value: "NIWOOD"}))
                        .append($("<option>", {text: "Broken Wood Pallets", value: "NIBADWOOD"}))
                        .append($("<option>", {text: "Consumables", value: "NICONSUM"}))
                        .append($("<option>", {text: "Empty Recycling Removal Drop Trailer", value: "RMVRECEMPTY"}))
                        .append($("<option>", {text: "Good Wood Pallets", value: "NIWOOD"}))
                        .append($("<option>", {text: "Loaded Recycling Trailer", value: "RMVREC"}))
                        .append($("<option>", {text: "Scrap metal, Recyclable Equipment", value: "NIRECY"}))
                        .append($("<option>", {text: "Non Inventory UTR equipment.", value: "NISTORAGE"}))
                        .append($("<option>", {text: "Grocery Universal Plastic Pallets", value: "NIFRESHGUPP"}))
                    )
                    .append($("<optgroup>", {label: "Empty"})
                        .append($("<option>", {text: "IB 3P Empty (>72 hours)", value: "IBEMPTY"}))
                        .append($("<option>", {text: "OB 3P Empty (>72 hours)", value: "OBEMPTY"}))
                        .append($("<option>", {text: "Non-Inventory Empty", value: "NIEMPTY"}))
                        .append($("<option>", {text: "Empty Trailer For Launch Site", value: "EMPTYPOD"}))
                    )
                    .append($("<optgroup>", {label: "AMXL"})
                            .append($("<option>", {text: "Empty Liquidation Removal Trailer", value: "RMVLIQEMPTY"}))
                            .append($("<option>", {text: "Loaded Liquidations Removal Trailer", value: "RMVLIQ"}))
                            .append($("<option>", {text: "Empty LTL Drop Trailer", value: "RMVLTLEMPTY"}))
                            .append($("<option>", {text: "Loaded LTL Trailer", value: "RMVLTL"}))
                            )
                    .append($("<optgroup>", {label: "Misc"})
                        .append($("<option>", {text: "Approved Storage (No AZNG)", value: "APSTORAGE"}))
                        .append($("<option>", {text: "NON Approved Storage - AZNG/AZNU trailer that is loaded with storage that needs to be transloaded and or offloaded by the site.", value: "NONAPSTORAGE"}))
                        .append($("<option>", {text: "Waste Management", value: "WASTE"}))
                        .append($("<option>", {text: "Launch Trailer", value: "LNCHPOD"}))
                        .append($("<option>", {text: "Empty Donation Drop Trailer", value: "RMVDONEEMPTY"}))
                        .append($("<option>", {text: "Loaded Donation Removal", value: "RMVDON"}))
                        .append($("<option>", {text: "Legal Hold - On hold for legal resolution, FBI hold", value: "LEGALHOLD"}))

                    )
                    .on("change", updateYMSNote)
            );
            if (settings.ixd_notes == "1") {
                $("#quickNoteSelect").append($("<optgroup>", {label: "IXD"})
                        .append($("<option>", {text: "Outbound Scheduled <24hr From Completion", value: "OBRTD"}))
                        .append($("<option>", {text: "Outbound loads needing to be trans-loaded", value: "OBTRANSLOAD"}))
                        .append($("<option>", {text: "Outbound loads virtually departed but need action", value: "OBDEPARTED"}))
                        .append($("<option>", {text: "Outbound loads booked and waiting to depart the yard", value: "OBRECOVERY"}))
                    )
            }
        }
    });
}

// Updates the "Dashboard" tab in the superuser panel.
function updateDashboard() {

    if ($("#quickViewContainer").length < 1) {
        initializeDashboardTab();
    }

    //Updates the values of each of the individual cards
    $("div.dashboardCard p[filters], div.quickViewFilter p[filters]").each(function() {
        var filterString = getFilter($(this).attr("filters"));
        $(this).text($(filterString).length);
        $(this).attr("count", $(filterString).length);
    });

    var notificationCount = 0;
    $(".dashboardCard[enablenotifications='1'] p").each(function() {
        notificationCount += parseInt($(this).attr("count"));
    });
    //var notificationCount = $("[superuserNotification]").length;
    if (notificationCount == 0) {
        $("p.notificationsCount").text("0");
        $("p.notificationsCount").hide();
    }
    else {
        $("p.notificationsCount").text("" + notificationCount);
        $("p.notificationsCount").show();
    }

}

function updateDDUDisplay() {
    if (!settings.enable_DDUDoors) {
        return;
    }
    $('table#ship-clerk-dashboard-table>tbody>tr').each(function () {
        var fullRoute = $(this).find(".col9 .load-identifiers [ng-if='yardAsset.hasLane']").attr("title");
        if (fullRoute != undefined) {
            if (fullRoute.includes("DDU-")) {
                var routeNum = fullRoute.substring(fullRoute.lastIndexOf("-") + 1);
                //console.log(fullRoute + " --> " + routeNum);
            }
        }
    });
}

function updateLicensePlateCopyButtons() {
    if (!settings.showLicenseCopy) {
        return;
    }
    //adds button to copy Trailer id from move list
    $("span[ng-if='yardAsset.vehicleNumber'], span[ng-if='yardAsset.licensePlateIdentifier && yardAsset.licensePlateIdentifier.registrationIdentifier'] ,div[ng-show='move.yardAssets[0].vehicleNumber']").each(function() {
        var number = $(this).html().split("<br>")[0];
        if ($(this).parent().parent().find("img.superuserSmallButton").length < 1) {
            $(this).parent().parent()
                .append($("<img>", {class: "superuserSmallButton superuserTooltip", title: "Copy to clipboard", src: "https://nathanloppnowtools.s3.us-east-2.amazonaws.com/WhosThatDriver/copy.png"}).click(function() {
                    navigator.clipboard.writeText(number.split(" ")[0]);
                    console.log(number);
                    $(this).attr("src", "https://nathanloppnowtools.s3.us-east-2.amazonaws.com/WhosThatDriver/check.png");
                    let ref = $(this);
                    setTimeout(function() {
                        $(ref).attr("src", "https://nathanloppnowtools.s3.us-east-2.amazonaws.com/WhosThatDriver/copy.png");
                    }, 3000);
                }));
        }
    });
}

function updateMissingYMSCode() {
    // Removed. Code was already moved to another location.
}

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

function isMoreThan72(inputText) {return getDwellTime(inputText) > 72 * 60 * 60;}

function isMoreThanHours(inputText, hours) {return getDwellTime(inputText) > parseInt(hours) * 60 * 60;}
