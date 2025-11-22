// Current patterns
let patterns = [];

// Theme management
const THEME_KEY = 'onlyonetab-theme';

function getCurrentTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    // Also save to Chrome storage if available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ theme: theme }, () => {
            if (chrome.runtime.lastError) {
                console.warn('Could not save to Chrome storage:', chrome.runtime.lastError);
            }
        });
    }
}

function applyTheme(theme) {
    console.log('Applying theme:', theme);
    const root = document.documentElement;

    if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
    } else {
        root.classList.remove('dark');
        root.classList.add('light');
    }

    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    if (!sunIcon || !moonIcon) {
        console.warn('Theme icons not found');
        return;
    }

    // Clear any inline styles first
    sunIcon.style.display = '';
    moonIcon.style.display = '';

    if (theme === 'dark') {
        // In dark mode, show sun (to switch to light)
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        // In light mode, show moon (to switch to dark)
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }

    console.log(`Icons updated - Sun: ${sunIcon.style.display}, Moon: ${moonIcon.style.display}`);
}

function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    console.log(`Toggling theme: ${currentTheme} -> ${newTheme}`);

    saveTheme(newTheme);
    applyTheme(newTheme);

    return newTheme;
}

function initializeTheme() {
    console.log('Initializing theme system...');

    // Apply saved theme
    const savedTheme = getCurrentTheme();
    console.log('Saved theme:', savedTheme);
    applyTheme(savedTheme);

    // Find and setup the toggle button
    const themeToggle = document.getElementById('theme-toggle');

    if (themeToggle) {
        console.log('Found theme toggle button');

        // Remove all existing listeners by cloning
        const newButton = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(newButton, themeToggle);

        // Add our click handler
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Theme button clicked');
            const newTheme = toggleTheme();
            console.log('Theme changed to:', newTheme);
        });

        // Make sure button is visible and clickable
        newButton.style.opacity = '1';
        newButton.style.pointerEvents = 'auto';
        newButton.style.cursor = 'pointer';

        console.log('Theme toggle initialized successfully');
    } else {
        console.error('Theme toggle button not found!');
    }
}

// Load settings on page load
function loadSettings() {
    chrome.storage.sync.get(['mode', 'domainPatterns'], (data) => {
        // Set mode
        const mode = data.mode || 'specific';
        document.getElementById(`mode-${mode}`).checked = true;

        // Load patterns
        patterns = data.domainPatterns || [];
        displayPatterns();

        // Show/hide patterns section based on mode
        updatePatternsVisibility(mode);
    });
}

// Display patterns
function displayPatterns() {
    const container = document.getElementById('patterns-container');
    container.innerHTML = '';

    if (patterns.length === 0) {
        container.innerHTML = '<div class="empty-message">No patterns configured. Add patterns or use templates below.</div>';
        return;
    }

    patterns.forEach((pattern, index) => {
        const patternElement = document.createElement('div');
        patternElement.className = 'pattern-item';

        const typeLabel = {
            'exact': 'Exact Match',
            'wildcard': 'Wildcard',
            'base': 'Base Domain',
            'regex': 'Regex'
        }[pattern.type] || pattern.type;

        const groupLabel = {
            'subdomain': 'By Subdomain',
            'base': 'All as One',
            'path': 'By Path'
        }[pattern.groupBy] || pattern.groupBy;

        patternElement.innerHTML = `
            <div class="pattern-details">
                <div class="pattern-main">
                    <span class="pattern-text">${pattern.pattern}</span>
                    <span class="pattern-type-badge">${typeLabel}</span>
                    <span class="pattern-group-badge">${groupLabel}</span>
                </div>
                <div class="pattern-description">${getPatternDescription(pattern)}</div>
            </div>
            <button class="remove-pattern" data-index="${index}">Remove</button>
        `;

        container.appendChild(patternElement);
    });
}

// Get human-readable description for a pattern
function getPatternDescription(pattern) {
    if (pattern.type === 'exact') {
        return `Matches only ${pattern.pattern}`;
    } else if (pattern.type === 'wildcard') {
        const base = pattern.pattern.replace('*.', '');
        return `Matches ${base} and all subdomains like app.${base}, www.${base}, etc.`;
    } else if (pattern.type === 'base') {
        return `Matches ${pattern.pattern} and all its subdomains`;
    }
    return 'Custom pattern';
}

// Update visibility of patterns section
function updatePatternsVisibility(mode) {
    const patternsSection = document.getElementById('patterns-section');
    if (mode === 'specific') {
        patternsSection.style.display = 'block';
        patternsSection.style.opacity = '1';
        patternsSection.style.pointerEvents = 'auto';
    } else {
        patternsSection.style.opacity = '0.5';
        patternsSection.style.pointerEvents = 'none';
    }
}

// Update pattern hint based on type
function updatePatternHint(type) {
    const hint = document.getElementById('pattern-hint');
    const input = document.getElementById('pattern-input');

    // Add null checks to prevent errors
    if (!hint || !input) {
        console.warn('Pattern hint or input elements not found');
        return;
    }

    if (type === 'exact') {
        hint.textContent = 'Enter exact domain like: web.whatsapp.com';
        input.placeholder = 'e.g., web.whatsapp.com';
    } else if (type === 'wildcard') {
        hint.textContent = 'Enter pattern like: *.google.com (matches all Google subdomains)';
        input.placeholder = 'e.g., *.google.com';
    } else if (type === 'base') {
        hint.textContent = 'Enter base domain like: github.com (includes www.github.com, gist.github.com, etc.)';
        input.placeholder = 'e.g., github.com';
    }
}

// Validate pattern
function validatePattern(pattern, type) {
    if (!pattern) return false;

    if (type === 'wildcard') {
        // Should start with *.
        return pattern.startsWith('*.') && pattern.length > 2;
    }

    // For exact and base, just check it's a valid domain-like string
    return /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/.test(pattern);
}

// Add pattern
function addPattern(pattern, type, groupBy) {
    if (!validatePattern(pattern, type)) {
        showStatus('Invalid pattern format', 'error');
        return;
    }

    // Check for duplicates
    const exists = patterns.some(p =>
        p.pattern === pattern && p.type === type
    );

    if (exists) {
        showStatus('This pattern already exists', 'error');
        return;
    }

    const newPattern = {
        pattern: pattern,
        type: type,
        groupBy: groupBy
    };

    chrome.runtime.sendMessage(
        { action: 'addPattern', pattern: newPattern },
        (response) => {
            if (response.success) {
                patterns = response.patterns;
                displayPatterns();

                // Clear form
                document.getElementById('pattern-input').value = '';

                showStatus('Pattern added successfully');
            }
        }
    );
}

// Remove pattern
function removePattern(index) {
    chrome.runtime.sendMessage(
        { action: 'removePattern', index: index },
        (response) => {
            if (response.success) {
                patterns = response.patterns;
                displayPatterns();
                showStatus('Pattern removed');
            }
        }
    );
}

// Show toast notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Toast container not found, message:', message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${type === 'success'
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
            }
        </svg>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.2s ease-in';
        setTimeout(() => {
            if (container && toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 200);
    }, 3000);
}

// Legacy function for compatibility
function showStatus(message, type = 'success') {
    showToast(message, type);
}

// Export settings
function exportSettings() {
    chrome.storage.sync.get(['mode', 'domainPatterns'], (data) => {
        const settings = {
            mode: data.mode || 'all',
            patterns: data.domainPatterns || []
        };

        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'onlyonetab-settings.json';
        a.click();
        URL.revokeObjectURL(url);

        showStatus('Settings exported');
    });
}

// Import settings
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const settings = JSON.parse(event.target.result);

                if (settings.patterns && Array.isArray(settings.patterns)) {
                    chrome.storage.sync.set({
                        mode: settings.mode || 'specific',
                        domainPatterns: settings.patterns
                    }, () => {
                        loadSettings();
                        showStatus('Settings imported successfully');
                    });
                } else {
                    showStatus('Invalid settings file', 'error');
                }
            } catch (error) {
                showStatus('Failed to import settings', 'error');
            }
        };

        reader.readAsText(file);
    });

    input.click();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme first
    initializeTheme();

    loadSettings();

    // Mode change
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updatePatternsVisibility(e.target.value);
        });
    });

    // Pattern type change
    const patternType = document.getElementById('pattern-type');
    if (patternType) {
        patternType.addEventListener('change', (e) => {
            updatePatternHint(e.target.value);
        });
    }

    // Add pattern button
    const addPatternBtn = document.getElementById('add-pattern');
    if (addPatternBtn) {
        addPatternBtn.addEventListener('click', () => {
            const patternInput = document.getElementById('pattern-input');
            const patternType = document.getElementById('pattern-type');
            const groupBy = document.getElementById('group-by');

            if (patternInput && patternType && groupBy) {
                const pattern = patternInput.value.trim().toLowerCase();
                const type = patternType.value;
                const groupByValue = groupBy.value;

                if (pattern) {
                    addPattern(pattern, type, groupByValue);
                }
            }
        });
    }

    // Enter key on pattern input
    const patternInput = document.getElementById('pattern-input');
    if (patternInput) {
        patternInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const pattern = e.target.value.trim().toLowerCase();
                const patternType = document.getElementById('pattern-type');
                const groupBy = document.getElementById('group-by');

                if (pattern && patternType && groupBy) {
                    addPattern(pattern, patternType.value, groupBy.value);
                }
            }
        });
    }

    // Remove pattern buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-pattern')) {
            const index = parseInt(e.target.dataset.index);
            removePattern(index);
        }
    });

    // Template buttons
    document.querySelectorAll('.template-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const pattern = e.target.dataset.pattern;
            const type = e.target.dataset.type;
            const groupBy = e.target.dataset.group;

            addPattern(pattern, type, groupBy);
        });
    });

    // Save settings button
    const saveBtn = document.getElementById('save-settings');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const modeInput = document.querySelector('input[name="mode"]:checked');
            if (modeInput) {
                const mode = modeInput.value;
                chrome.storage.sync.set({ mode }, () => {
                    showStatus('Settings saved!');
                });
            }
        });
    }

    // Export settings button
    const exportBtn = document.getElementById('export-settings');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportSettings);
    }

    // Import settings button
    const importBtn = document.getElementById('import-settings');
    if (importBtn) {
        importBtn.addEventListener('click', importSettings);
    }
});