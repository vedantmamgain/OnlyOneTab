// Store tracked domain patterns and their settings
let domainPatterns = [];

// Load saved patterns from storage
chrome.storage.sync.get(['domainPatterns'], (data) => {
  if (data.domainPatterns) {
    domainPatterns = data.domainPatterns;
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

// Check if a URL should be tracked
async function shouldTrackUrl(url) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['domainPatterns', 'mode'], (data) => {
      const mode = data.mode || 'specific'; // 'all' or 'specific'
      domainPatterns = data.domainPatterns || [];

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
});