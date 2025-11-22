// Get domain from URL
function getDomainFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (e) {
        return null;
    }
}

// Load popup data
async function loadPopupData() {
    // Get current tab
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentDomain = getDomainFromUrl(currentTab.url);

    // Display current domain
    if (currentDomain) {
        document.getElementById('current-domain').textContent = currentDomain;

        // Get tracking mode and patterns
        chrome.storage.sync.get(['mode', 'domainPatterns'], async (data) => {
            let mode = data.mode || 'all';
            const patterns = data.domainPatterns || [];

            // Smart fallback: If specific mode but no patterns, switch to all
            if (mode === 'specific' && patterns.length === 0) {
                mode = 'all';
                chrome.storage.sync.set({ mode: 'all' }); // Persist the fix
            }

            // Check if current tab matches any pattern
            const matchedPattern = await getMatchedPattern(currentTab.url, patterns);

            const toggleButton = document.getElementById('toggle-current-domain');
            const domainStatus = document.getElementById('domain-status');

            if (mode === 'all') {
                toggleButton.style.display = 'none';
                document.getElementById('current-mode').textContent = 'Track All Domains';
                domainStatus.textContent = 'Tracked';
                domainStatus.classList.add('tracked');
            } else {
                document.getElementById('current-mode').textContent = 'Custom Patterns';

                if (matchedPattern) {
                    toggleButton.querySelector('.toggle-text').textContent = `Matched: ${matchedPattern.pattern}`;
                    toggleButton.classList.add('btn-primary');
                    toggleButton.classList.remove('btn-outline');
                    toggleButton.disabled = true;
                    domainStatus.textContent = 'Tracked';
                    domainStatus.classList.add('tracked');
                } else {
                    toggleButton.querySelector('.toggle-text').textContent = 'Add Pattern';
                    toggleButton.classList.remove('btn-primary');
                    toggleButton.classList.add('btn-outline');
                    toggleButton.disabled = false;
                    domainStatus.textContent = 'Not Tracked';
                    domainStatus.classList.remove('tracked');
                }
            }
        });
    } else {
        document.getElementById('current-domain').textContent = 'No domain (system page)';
        document.getElementById('toggle-current-domain').style.display = 'none';
    }

    // Get all tabs and count
    const tabs = await chrome.tabs.query({});
    document.getElementById('tab-count').textContent = tabs.length;

    // Get tab groups from background
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        if (response && response.groupCount) {
            displayGroups(response.groupCount, tabs);
        }
    });
}

// Check if URL matches any pattern
async function getMatchedPattern(url, patterns) {
    for (const pattern of patterns) {
        if (matchesPattern(url, pattern)) {
            return pattern;
        }
    }
    return null;
}

// Check if URL matches a pattern (duplicate from background.js logic)
function matchesPattern(url, pattern) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        if (pattern.type === 'exact') {
            return hostname === pattern.pattern;
        } else if (pattern.type === 'wildcard') {
            const baseDomain = pattern.pattern.replace('*.', '');
            return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
        } else if (pattern.type === 'base') {
            return hostname === pattern.pattern || hostname.endsWith('.' + pattern.pattern);
        }
    } catch (e) {
        return false;
    }
}

// Display tab groups
function displayGroups(groupCount, allTabs) {
    const duplicatesList = document.getElementById('duplicate-tabs-list');
    duplicatesList.innerHTML = '';

    const duplicateGroups = Object.entries(groupCount)
        .filter(([group, count]) => count > 1);

    if (duplicateGroups.length === 0) {
        duplicatesList.innerHTML = `
            <div class="empty-state">
                <p class="text-muted-foreground text-sm italic">No duplicate tab groups detected</p>
            </div>
        `;
        return;
    }

    duplicateGroups.forEach(([group, count]) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'duplicate-group';

        // Find actual tabs in this group for more info
        const groupTabs = allTabs.filter(tab => {
            if (!tab.url) return false;
            const domain = getDomainFromUrl(tab.url);
            return domain && (domain === group || domain.includes(group) || group.includes(domain));
        });

        // Get tab titles for display
        const tabTitles = groupTabs.slice(0, 3).map(tab =>
            `<div class="tab-item" title="${tab.title}">${tab.title}</div>`
        ).join('');

        const moreText = groupTabs.length > 3 ? `<div class="tab-item">... and ${groupTabs.length - 3} more</div>` : '';

        groupDiv.innerHTML = `
            <div class="duplicate-domain">
                <span>${group}</span>
                <span class="duplicate-count">${count}</span>
            </div>
            <div class="duplicate-tabs">
                ${tabTitles}
                ${moreText}
            </div>
            <button class="btn btn-sm btn-outline mt-3 w-full close-group-duplicates" data-group="${group}">
                Close ${count - 1} duplicate${count > 2 ? 's' : ''}
            </button>
        `;
        duplicatesList.appendChild(groupDiv);
    });
}

// Close duplicate tabs for a group
async function closeDuplicatesForGroup(group) {
    const tabs = await chrome.tabs.query({});

    // Get tracking info from storage
    const data = await chrome.storage.sync.get(['mode', 'domainPatterns']);
    const mode = data.mode || 'all';

    const groupTabs = [];

    // Find all tabs in this group
    for (const tab of tabs) {
        if (!tab.url) continue;

        if (mode === 'all') {
            // In 'all' mode, group is just the domain
            const domain = getDomainFromUrl(tab.url);
            if (domain === group) {
                groupTabs.push(tab);
            }
        } else {
            // In pattern mode, need to check pattern matching
            // This is a simplified version - ideally would call background script
            const domain = getDomainFromUrl(tab.url);
            if (domain === group || domain.includes(group) || group.includes(domain)) {
                groupTabs.push(tab);
            }
        }
    }

    if (groupTabs.length > 1) {
        // Keep the first tab, close the rest
        const tabsToClose = groupTabs.slice(1).map(tab => tab.id);
        await chrome.tabs.remove(tabsToClose);
        loadPopupData(); // Refresh the display
    }
}

// Close all duplicate tabs
async function closeAllDuplicates() {
    chrome.runtime.sendMessage({ action: 'getStats' }, async (response) => {
        if (!response || !response.groupCount) return;

        const tabs = await chrome.tabs.query({});
        const tabsToClose = [];

        // For each group with duplicates
        Object.entries(response.groupCount)
            .filter(([group, count]) => count > 1)
            .forEach(([group, count]) => {
                // Find tabs in this group
                const groupTabs = tabs.filter(tab => {
                    if (!tab.url) return false;
                    const domain = getDomainFromUrl(tab.url);
                    return domain && (domain === group || domain.includes(group) || group.includes(domain));
                });

                // Mark all but first for closing
                if (groupTabs.length > 1) {
                    tabsToClose.push(...groupTabs.slice(1).map(tab => tab.id));
                }
            });

        if (tabsToClose.length > 0) {
            await chrome.tabs.remove(tabsToClose);
            loadPopupData(); // Refresh the display
        }
    });
}

// Merge all windows
async function mergeAllWindows() {
    const windows = await chrome.windows.getAll({ populate: true });

    if (windows.length > 1) {
        const currentWindow = await chrome.windows.getCurrent();
        const tabsToMove = [];

        windows.forEach(window => {
            if (window.id !== currentWindow.id) {
                window.tabs.forEach(tab => {
                    tabsToMove.push(tab.id);
                });
            }
        });

        if (tabsToMove.length > 0) {
            await chrome.tabs.move(tabsToMove, {
                windowId: currentWindow.id,
                index: -1
            });
        }
    }
}

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('onlyonetab-theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.add('light');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadPopupData();

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Add pattern button logic
    document.getElementById('toggle-current-domain').addEventListener('click', async () => {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentDomain = getDomainFromUrl(currentTab.url);

        if (currentDomain) {
            // Check if we are in specific mode and need to add pattern
            chrome.storage.sync.get(['mode', 'domainPatterns'], (data) => {
                const mode = data.mode || 'all';
                const patterns = data.domainPatterns || [];

                // If in specific mode and not tracked, add pattern
                if (mode === 'specific') {
                    // Check if already exists to be safe
                    const exists = patterns.some(p => p.pattern === currentDomain);

                    if (!exists) {
                        const newPattern = {
                            pattern: currentDomain,
                            type: 'base',
                            groupBy: 'base'
                        };

                        chrome.runtime.sendMessage(
                            { action: 'addPattern', pattern: newPattern },
                            (response) => {
                                if (response.success) {
                                    loadPopupData(); // Refresh UI
                                }
                            }
                        );
                    } else {
                        // If already exists or other action needed, maybe open options
                        chrome.runtime.openOptionsPage();
                    }
                } else {
                    // In 'all' mode, maybe open options or toggle specific mode?
                    // For now, keep original behavior of opening options if not adding pattern
                    chrome.runtime.openOptionsPage();
                }
            });
        }
    });

    // Close duplicates for specific group
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-group-duplicates')) {
            const group = e.target.dataset.group;
            closeDuplicatesForGroup(group);
        }
    });

    // Close all duplicates
    document.getElementById('close-duplicates').addEventListener('click', closeAllDuplicates);

    // Merge windows
    document.getElementById('merge-windows').addEventListener('click', mergeAllWindows);
});