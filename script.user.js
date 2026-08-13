// ==UserScript==
// @name         Echo360+
// @version      1.95
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

    // Seek all synchronized media by five seconds with the left and right arrow keys.
    document.addEventListener('keydown', (event) => {
        if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
            event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }

        const target = event.target;
        if (target && (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
            return;
        }

        const mediaElements = Array.from(document.querySelectorAll('video, audio'))
            .filter((item) => Number.isFinite(item.currentTime));
        const master = mediaElements.find((item) => !item.paused && !item.ended) ||
            mediaElements[0];
        if (!master) {
            return;
        }

        const offset = event.key === 'ArrowRight' ? 5 : -5;
        const targetTime = Math.max(0, master.currentTime + offset);

        mediaElements.forEach((item) => {
            const endTime = Number.isFinite(item.duration) ? item.duration : Infinity;
            item.currentTime = Math.min(endTime, targetTime);
        });

        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);

    // Add a next-lecture control beside the native skip-forward button.
    const nextLectureButtonId = 'echo360-plus-next-lecture-btn';

    const collectLessons = (items, lessons = []) => {
        items.forEach((item) => {
            if (item?.lesson?.lesson?.id) {
                lessons.push(item.lesson);
            } else if (Array.isArray(item?.lessons)) {
                collectLessons(item.lessons, lessons);
            }
        });
        return lessons;
    };

    const getNextLecture = async () => {
        const match = window.location.pathname.match(/\/lesson\/([^/]+)/);
        if (!match) {
            return null;
        }

        const currentLessonId = decodeURIComponent(match[1]);
        const mediaResponse = await fetch(
            `/lesson/${encodeURIComponent(currentLessonId)}/media`,
            { credentials: 'same-origin' }
        );
        if (!mediaResponse.ok) {
            return null;
        }

        const mediaData = await mediaResponse.json();
        const sectionId = mediaData?.data?.[0]?.lesson?.sectionId;
        if (!sectionId) {
            return null;
        }

        const syllabusResponse = await fetch(
            `/section/${encodeURIComponent(sectionId)}/syllabus`,
            { credentials: 'same-origin' }
        );
        if (!syllabusResponse.ok) {
            return null;
        }

        const syllabusData = await syllabusResponse.json();
        const lessons = collectLessons(syllabusData?.data || []);
        const currentIndex = lessons.findIndex(
            (lesson) => lesson.lesson.id === currentLessonId
        );
        const nextLesson = lessons[currentIndex + 1];

        if (currentIndex < 0 || !nextLesson || nextLesson.isPast === false ||
            nextLesson.hasContent === false || nextLesson.hasVideo === false ||
            nextLesson.hasAvailableVideo === false) {
            return null;
        }

        return {
            id: nextLesson.lesson.id,
            name: nextLesson.lesson.name || 'Next lecture'
        };
    };

    const findSkipForwardButton = () => document.querySelector(
        '#video-1-forward-btn, button[aria-label="Skip forward 10 seconds"], ' +
        'button[title="Skip forward 10 seconds"]'
    );

    const insertNextLectureButton = (nextLecture) => {
        if (document.getElementById(nextLectureButtonId)) {
            return;
        }

        const skipForwardButton = findSkipForwardButton();
        if (!skipForwardButton) {
            return;
        }

        const button = skipForwardButton.cloneNode(true);
        button.id = nextLectureButtonId;
        button.type = 'button';
        button.setAttribute('aria-label', 'Next lecture');
        button.setAttribute('title', `Next lecture: ${nextLecture.name}`);
        button.removeAttribute('aria-describedby');
        button.removeAttribute('data-testid');
        button.querySelectorAll('[id], [data-testid]').forEach((element) => {
            element.removeAttribute('id');
            element.removeAttribute('data-testid');
        });
        button.innerHTML = `
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path fill="currentColor" d="M6 5v14l10-7L6 5zm11 0h2v14h-2V5z"></path>
            </svg>
        `;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.location.assign(
                `/lesson/${encodeURIComponent(nextLecture.id)}/classroom?focus=Video`
            );
        });

        skipForwardButton.after(button);
    };

    getNextLecture().then((nextLecture) => {
        if (!nextLecture) {
            return;
        }

        insertNextLectureButton(nextLecture);
        new MutationObserver(() => insertNextLectureButton(nextLecture)).observe(
            document.body,
            { childList: true, subtree: true }
        );
    }).catch(() => {
        // Leave the player unchanged if Echo360's metadata is unavailable.
    });

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
