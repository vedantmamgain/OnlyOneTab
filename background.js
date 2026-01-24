// Store tracked domain patterns and their settings
let domainPatterns = [];
let limitEnabled = true;
let groupEnabled = false;

// Load saved patterns and settings from storage
chrome.storage.sync.get(['domainPatterns', 'limitEnabled', 'groupEnabled'], (data) => {
  if (data.domainPatterns) {
    domainPatterns = data.domainPatterns;
  }
  limitEnabled = data.limitEnabled !== false;
  groupEnabled = data.groupEnabled || false;
});

// Listen for storage changes to update settings
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.domainPatterns) {
      domainPatterns = changes.domainPatterns.newValue || [];
    }
    if (changes.limitEnabled) {
      limitEnabled = changes.limitEnabled.newValue !== false;
    }
    if (changes.groupEnabled) {
      groupEnabled = changes.groupEnabled.newValue || false;
    }
  }
});

// Extract domain from URL
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// Get full URL info (domain + path)
function getUrlInfo(url) {
  try {
    const urlObj = new URL(url);
    return {
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      fullUrl: url
    };
  } catch (e) {
    return null;
  }
}

// Check if URL matches a pattern
function matchesPattern(url, pattern) {
  const urlInfo = getUrlInfo(url);
  if (!urlInfo) return false;

  // Handle different pattern types
  if (pattern.type === 'exact') {
    // Exact domain match
    return urlInfo.hostname === pattern.pattern;
  } else if (pattern.type === 'wildcard') {
    // Wildcard subdomain (*.example.com)
    const baseDomain = pattern.pattern.replace('*.', '');
    return urlInfo.hostname === baseDomain || urlInfo.hostname.endsWith('.' + baseDomain);
  } else if (pattern.type === 'base') {
    // Base domain and all subdomains
    return urlInfo.hostname === pattern.pattern || urlInfo.hostname.endsWith('.' + pattern.pattern);
  } else if (pattern.type === 'regex') {
    // Custom regex pattern
    try {
      const regex = new RegExp(pattern.pattern);
      return regex.test(urlInfo.fullUrl);
    } catch (e) {
      return false;
    }
  }
  return false;
}

// Get the tracking key for a URL based on pattern rules
function getTrackingKey(url) {
  const urlInfo = getUrlInfo(url);
  if (!urlInfo) return null;

  // Check each pattern for a match
  for (const pattern of domainPatterns) {
    if (matchesPattern(url, pattern)) {
      // Return the tracking key based on pattern settings
      if (pattern.groupBy === 'base') {
        // Group all matching URLs together
        return pattern.pattern;
      } else if (pattern.groupBy === 'subdomain') {
        // Group by subdomain
        return urlInfo.hostname;
      } else if (pattern.groupBy === 'path') {
        // Group by domain + path
        return urlInfo.hostname + urlInfo.pathname;
      }
    }
  }

  // Default behavior when no pattern matches
  return null;
}

// Get or create a tab group for the given key in the window
async function getOrCreateTabGroup(key, windowId) {
  if (!chrome.tabGroups) {
    console.warn('Tab Groups API not available.');
    return null;
  }

  try {
    // Query for existing group with the title in this window
    const groups = await chrome.tabGroups.query({ title: key });
    const existingGroup = groups.find(g => g.windowId === windowId);
    if (existingGroup) {
      return existingGroup.id;
    } else {
      // No existing group, return null to indicate creation needed
      return null;
    }
  } catch (error) {
    console.error('Error querying tab groups:', error);
    return null;
  }
}

// Check if a URL should be tracked
async function shouldTrackUrl(url) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['domainPatterns', 'mode'], (data) => {
      let mode = data.mode || 'specific'; // 'all' or 'specific'
      domainPatterns = data.domainPatterns || [];

      // Smart fallback: If specific mode but no patterns, default to all
      if (mode === 'specific' && domainPatterns.length === 0) {
        mode = 'all';
        // We don't auto-save here to avoid side effects in background, 
        // but we treat it as 'all' for logic
      }

      if (mode === 'all') {
        // In 'all' mode, track everything but use default grouping
        resolve({ track: true, key: getDomainFromUrl(url) });
      } else {
        // Check if URL matches any pattern
        const trackingKey = getTrackingKey(url);
        if (trackingKey) {
          resolve({ track: true, key: trackingKey });
        } else {
          resolve({ track: false, key: null });
        }
      }
    });
  });
}

// Find existing tab for the same tracking group
async function findExistingTab(trackingKey, currentTabId) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.id === currentTabId || !tab.url) continue;

    const { track, key } = await shouldTrackUrl(tab.url);
    if (track && key === trackingKey) {
      return tab;
    }
  }
  return null;
}

// Listen for tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  // Wait a bit for the URL to be set
  setTimeout(async () => {
    const updatedTab = await chrome.tabs.get(tab.id);
    if (updatedTab.url && updatedTab.url !== 'chrome://newtab/') {
      handleTabUpdate(updatedTab);
    }
  }, 100);
});

// Listen for tab updates (navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleTabUpdate(tab);
  }
});

// Handle tab update/creation
async function handleTabUpdate(tab) {
  if (!tab.url || tab.url.startsWith('chrome://')) return;

  // Check if we should track this URL and get its tracking key
  const { track, key } = await shouldTrackUrl(tab.url);
  if (!track || !key) return;

  if (groupEnabled) {
    // Group the tab
    const groupId = await getOrCreateTabGroup(key, tab.windowId);
    try {
      if (groupId !== null) {
        await chrome.tabs.group({ tabIds: [tab.id], groupId });
      } else {
        // Create new group
        const newGroupId = await chrome.tabs.group({ tabIds: [tab.id] });
        await chrome.tabGroups.update(newGroupId, { title: key });
      }
    } catch (error) {
      console.error('Error grouping tab:', error);
    }
  }

  if (limitEnabled) {
    // Find existing tab for this tracking group
    const existingTab = await findExistingTab(key, tab.id);

    if (existingTab) {
      // Switch to existing tab
      await chrome.tabs.update(existingTab.id, { active: true });
      await chrome.windows.update(existingTab.windowId, { focused: true });

      // Close the new duplicate tab
      await chrome.tabs.remove(tab.id);

      // Show notification (optional)
      chrome.action.setBadgeText({ text: '1' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 2000);
    }
  }
}

// Listen for tab removal (currently no cleanup needed with new system)
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // Placeholder for any future cleanup logic
});

// Message handler for popup and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.tabs.query({}, async (tabs) => {
      const groupCount = {};

      for (const tab of tabs) {
        if (tab.url) {
          const { track, key } = await shouldTrackUrl(tab.url);
          if (track && key) {
            groupCount[key] = (groupCount[key] || 0) + 1;
          }
        }
      }

      sendResponse({ groupCount });
    });
    return true;
  }

  if (request.action === 'addPattern') {
    chrome.storage.sync.get(['domainPatterns'], (data) => {
      let patterns = data.domainPatterns || [];
      patterns.push(request.pattern);

      chrome.storage.sync.set({ domainPatterns: patterns }, () => {
        domainPatterns = patterns; // Update local cache
        sendResponse({ success: true, patterns });
      });
    });
    return true;
  }

  if (request.action === 'removePattern') {
    chrome.storage.sync.get(['domainPatterns'], (data) => {
      let patterns = data.domainPatterns || [];
      patterns = patterns.filter((p, index) => index !== request.index);

      chrome.storage.sync.set({ domainPatterns: patterns }, () => {
        domainPatterns = patterns; // Update local cache
        sendResponse({ success: true, patterns });
      });
    });
    return true;
  }

  if (request.action === 'getPatterns') {
    chrome.storage.sync.get(['domainPatterns'], (data) => {
      sendResponse({ patterns: data.domainPatterns || [] });
    });
    return true;
  }

  if (request.action === 'groupAllRelatedTabs') {
    chrome.tabs.query({}, async (tabs) => {
      // Group tabs by window first
      const tabsByWindow = {};
      for (const tab of tabs) {
        if (!tabsByWindow[tab.windowId]) tabsByWindow[tab.windowId] = [];
        tabsByWindow[tab.windowId].push(tab);
      }

      // For each window, group tabs by key
      for (const windowId in tabsByWindow) {
        const windowTabs = tabsByWindow[windowId];
        const tabGroups = {};

        for (const tab of windowTabs) {
          if (tab.url) {
            const { track, key } = await shouldTrackUrl(tab.url);
            if (track && key) {
              if (!tabGroups[key]) tabGroups[key] = [];
              tabGroups[key].push(tab);
            }
          }
        }

        for (const [key, tabsForKey] of Object.entries(tabGroups)) {
          if (tabsForKey.length > 1) {
            const groupId = await getOrCreateTabGroup(key, windowId);
            try {
              if (groupId !== null) {
                const tabIds = tabsForKey.map(t => t.id);
                await chrome.tabs.group({ tabIds, groupId });
              } else {
                // Create new group
                const tabIds = tabsForKey.map(t => t.id);
                const newGroupId = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(newGroupId, { title: key });
              }
            } catch (error) {
              console.error('Error grouping tabs for key:', key, error);
            }
          }
        }
      }

      sendResponse({ success: true });
    });
    return true;
  }
});