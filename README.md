# Tampermonkey-Scripts

A collection of useful Tampermonkey userscripts by Pedro Sanchez (pefsanch), including "Extract Scannable IDs in FCResearch" which extracts scannable container IDs from a table and copies them to the clipboard.

## Repository
https://github.com/pedrosancheznery/Tampermonkey-Scripts

## Contents
- **Extract Scannable IDs in FCResearch** — copies container Scannable IDs (optionally only those with quantity > 0) to clipboard via a floating button.  
- Other utility userscripts (add more as you create them).

## Features
- Adds a floating **Copy Scannable IDs** button to the FCResearch page.  
- Uses the Navigator Clipboard API with a textarea fallback.  
- Option to filter containers by quantity > 0.  
- Lightweight, no external dependencies.  
- Works with modern Chromium-based browsers and Firefox (clipboard writes require a user click).

## Installation
1. Install Tampermonkey in your browser.  
2. Open the desired script file in this repo (raw view).  
3. Click "Install" in Tampermonkey or copy the script into a new Tampermonkey script and save.

## Usage
1. Visit the FCResearch page matching the script's `@match` patterns.  
2. Wait until the container hierarchy table loads.  
3. Click the **Copy Scannable IDs** button (bottom-right). IDs will be copied to clipboard; the button shows brief feedback.

## Configuration
- Ensure the script's quantity column selector matches the table layout (e.g., `td:nth-child(3)`) and update if needed.  
- Set `@homepage` and `@updateURL` in the script metadata to point to this repository or your preferred URL.

## Example (script metadata snippet)
```text
// @name         Extract Scannable IDs in FCResearch (Copy to Clipboard)
// @version      1.2
// @match        https://qi-fcresearch-na.corp.amazon.com/HOU3/*
// @match        https://fcresearch-na.aka.amazon.com/*
// @homepage     https://github.com/pedrosancheznery/Tampermonkey-Scripts
// @updateURL    https://github.com/pedrosancheznery/Tampermonkey-Scripts/raw/main/extract-scannable-ids.user.js
```

## Development
- Fork the repo, modify or add scripts, and open a pull request.  
- Keep scripts self-contained and avoid external hosts for critical functionality.  
- Test clipboard behavior across browsers; clipboard writes require a user gesture.

## Troubleshooting
- If nothing copies: verify the table selector (`#table-container-hierarchy`) and the quantity column selector.  
- If `navigator.clipboard.writeText` fails, the script falls back to a textarea + `document.execCommand('copy')`.  
- Clipboard operations require a user interaction (click) due to browser security restrictions.

## License
Choose a license (e.g., MIT) and add a LICENSE file to the repository.

## Contact
Pedro Sanchez — pefsanch (use GitHub issues or PRs for feedback).

Would you like me to create a downloadable README.md file now?
