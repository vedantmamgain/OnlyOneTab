// Current patterns
let patterns = [];

// Load settings on page load
function loadSettings() {
    chrome.storage.sync.get(['mode', 'domainPatterns'], (data) => {
        // Set mode
        const mode = data.mode || 'all';
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
            container.removeChild(toast);
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
    loadSettings();

    // Mode change
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updatePatternsVisibility(e.target.value);
        });
    });

    // Pattern type change
    document.getElementById('pattern-type').addEventListener('change', (e) => {
        updatePatternHint(e.target.value);
    });

    // Add pattern button
    document.getElementById('add-pattern').addEventListener('click', () => {
        const pattern = document.getElementById('pattern-input').value.trim().toLowerCase();
        const type = document.getElementById('pattern-type').value;
        const groupBy = document.getElementById('group-by').value;

        if (pattern) {
            addPattern(pattern, type, groupBy);
        }
    });

    // Enter key on pattern input
    document.getElementById('pattern-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const pattern = e.target.value.trim().toLowerCase();
            const type = document.getElementById('pattern-type').value;
            const groupBy = document.getElementById('group-by').value;

            if (pattern) {
                addPattern(pattern, type, groupBy);
            }
        }
    });

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
    document.getElementById('save-settings').addEventListener('click', () => {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        chrome.storage.sync.set({ mode }, () => {
            showStatus('Settings saved!');
        });
    });

    // Export settings button
    document.getElementById('export-settings').addEventListener('click', exportSettings);

    // Import settings button
    document.getElementById('import-settings').addEventListener('click', importSettings);
});