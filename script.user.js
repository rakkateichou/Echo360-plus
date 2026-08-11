// ==UserScript==
// @name         Echo360+
// @version      1.92
// @description  Echo360 enhanced
// @author       rakkateichou
// @match        *://*.echo360.net.au/lesson/*
// @updateURL    https://raw.githubusercontent.com/rakkateichou/Echo360-plus/refs/heads/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/rakkateichou/Echo360-plus/refs/heads/main/script.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. Inject the custom CSS
    const style = document.createElement('style');
    style.textContent = `
    ::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    ::-webkit-scrollbar-track {
      background: black;
    }
    ::-webkit-scrollbar-thumb {
      background: ghostwhite;
      border-radius: 6px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: white;
    }
    body {
        background-color: black !important;
    }
    video {
        width: 110% !important;
    }
    #timeline-progress-bar {
        border: none;
    }
    [aria-label="Player controls"] {
        height: 4.5rem !important;
        div {
            background-color: black;
        }
        button[data-testid="layout-button"] {
            display: none;
        }
        button[data-testid="transcript-button"] {
            display: none;
        }
        button[data-testid="confusion-flag-button"] {
            display: none;
        }
        #bookmark-menu-menu-toggle-btn {
            display: none;
        }
        #sidePanel-toggle-btn {
            display: none;
        }
    }
    [aria-label="Player title"] {
        height: 0px !important;
        overflow: hidden !important;
    }
    div[aria-label="Media Player"] {
        border: 0;
    }
    [aria-label="Player title"] + div {
        background-color: black;
    }
    #main-circle-btn-wrapper + div {
        box-shadow: none;
        padding: 0 1rem;
        z-index: 1;
        margin-bottom: -1rem;
    }
    #main-circle-btn-wrapper + div::before {
        box-shadow: none;
    }
    .recharts-curve.recharts-area-area {
        fill-opacity: 0;
     }
    .header {
        background-color: black !important;
        border-bottom-color: black !important;
        color: whitesmoke !important;
        a[title="Home"] {
            display: none;
        }
        button[aria-label="Back"] {
            background-color: black;
            color: whitesmoke;
            border-color: whitesmoke;
        }
        img[alt="institution"] {
            display: none;
        }
    }
    .sidebar {
        margin-top: -3.5rem;
        height: calc(100vh + 3.5rem) !important;
        background-color: black;
        button {
            background-color: black;
            border: 0;
            color: ghostwhite;
        }
        button[role="tab"] {
            display: none;
        }
        div {
            color: ghostwhite;
            border-color: black;
        }
        input {
            background-color: black;
            color: ghostwhite;
        }
        input::placeholder {
            color: ghostwhite;
        }
        svg {
            color: whitesmoke;
        }
        div:hover {
            background-color: black;
        }
        span {
            color: ghostwhite;
        }
    }
    div[data-test-id="layout-display-container"] {
        padding: 0;
    }
    `;
    document.head.append(style);

    // Trackers so we don't click things multiple times
    let heatmapDone = false;
    let transcriptDone = false;
    let fullscreenDone = false;
    let isCheckingHeatmap = false; 
    let attempts = 0;
    const maxAttempts = 50; // 50 attempts * 200ms = 10 second timeout
    const heatmapMenuTimeout = 1000;

    const intervalId = setInterval(() => {
        attempts++;

        // 2. Transcript Tab Logic
        if (!transcriptDone) {
            const transcriptTab = document.getElementById('transcripts-tab');
            if (transcriptTab) {
                transcriptTab.click();
                transcriptDone = true;
            }
        }

        // 3. Fullscreen Button Logic
        if (!fullscreenDone) {
            const fullscreenBtn = document.getElementById('video-1-fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.click();
                fullscreenDone = true;
            }
        }

        // 4. Heatmap Ghost Click Logic
        if (!heatmapDone && !isCheckingHeatmap) {
            const settingsBtn = document.querySelector('#settings-menu-toggle-btn, .settings-menu-toggle-btn, [data-test-id="settings-menu-toggle-btn"]');
            
            if (settingsBtn) {
                isCheckingHeatmap = true; // Prevent overlapping clicks
                settingsBtn.click(); // Open the menu

                const startedAt = Date.now();

                // Keep this menu open while it renders, but only make one bounded attempt.
                const checkHeatmapToggle = () => {
                    const toggleBtn = document.getElementById('heatmap-toggle-btn_input');
                    if (toggleBtn) {
                        if (toggleBtn.getAttribute('aria-checked') === 'false') {
                            toggleBtn.click();
                        }
                    } else if (Date.now() - startedAt < heatmapMenuTimeout) {
                        setTimeout(checkHeatmapToggle, 50);
                        return;
                    }

                    // Whether the option exists or not, close once and do not retry.
                    heatmapDone = true;
                    settingsBtn.click(); // Close the menu
                    isCheckingHeatmap = false;
                };

                setTimeout(checkHeatmapToggle, 50);
            }
        }

        // 5. Cleanup: Stop checking if everything is done, or if we hit the 10-second limit
        if ((heatmapDone && transcriptDone && fullscreenDone) || attempts >= maxAttempts) {
            clearInterval(intervalId);
        }

    }, 200); 

})();
