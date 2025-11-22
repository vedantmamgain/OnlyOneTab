# OnlyOneTab - Chrome Extension

A Chrome extension that ensures only one tab per domain remains open. Perfect for web applications like WhatsApp, Gmail, or Slack that warn about multiple tabs.

## Features

- **Smart Pattern Matching**: Define how domains and subdomains are tracked
- **Flexible Domain Patterns**:
  - **Exact Match**: Track specific domains only (e.g., `web.whatsapp.com`)
  - **Wildcard Patterns**: Track all subdomains (e.g., `*.google.com`)
  - **Base Domain**: Track domain and all variants (e.g., `github.com` includes `www.github.com`, `gist.github.com`)
- **Grouping Options**: Control how tabs are grouped:
  - **By Subdomain**: Each subdomain gets its own tab (Gmail and Calendar separate)
  - **All as One**: All matching URLs count as one tab (all GitHub pages as one)
- **Quick Actions**:
  - Close all duplicate tabs with one click
  - Merge all Chrome windows
  - View and manage duplicate tab groups
- **Pre-configured Templates**:
  - WhatsApp Web (exact match)
  - Google Workspace (separate tabs for each service)
  - GitHub (all pages as one tab)
  - Slack Workspaces (one tab per workspace)
  - Microsoft Teams
  - Notion (all pages as one)

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `OnlyOneTab` directory containing this extension
5. The extension icon will appear in your Chrome toolbar

## How to Use

### Basic Usage
Once installed, the extension will automatically prevent duplicate tabs based on your settings:
- When you try to open a new tab with the same domain as an existing tab, it will switch to the existing tab instead
- The new duplicate tab will be automatically closed

### Configuration Options

#### Access Settings
- Click the extension icon and then the settings gear (⚙️)
- Or right-click the extension icon and select "Options"

#### Tracking Modes
1. **Track All Domains** (Default)
   - Automatically manages tabs for all websites
   - Each subdomain is tracked separately

2. **Use Custom Patterns**
   - Define specific patterns for domains you want to track
   - Control how tabs are grouped (by subdomain or all as one)
   - Perfect for complex setups like:
     - Keep Gmail and Calendar separate
     - Treat all GitHub pages as one
     - One tab per Slack workspace

#### Pattern Types
- **Exact Domain**: `web.whatsapp.com` - Only matches this exact domain
- **Wildcard**: `*.google.com` - Matches mail.google.com, calendar.google.com, etc.
- **Base Domain**: `github.com` - Matches github.com and all subdomains

#### Grouping Options
- **By Subdomain**: Each subdomain gets its own tab
- **All as One**: All matching URLs share one tab

### Popup Features
Click the extension icon to access:
- **Current Status**: View active mode and tab count
- **Current Domain**: Toggle tracking for the current website
- **Duplicate Tabs**: See all domains with multiple tabs open
- **Quick Actions**:
  - Close All Duplicates: Remove all duplicate tabs at once
  - Merge All Windows: Combine all Chrome windows into one

## Testing the Extension

### Example Use Cases

1. **WhatsApp Web (Your Original Use Case)**:
   - Go to Options → Use Custom Patterns
   - Add pattern: Type=`Exact`, Pattern=`web.whatsapp.com`
   - Now only one WhatsApp tab will remain open
   - Opening WhatsApp from another window will switch to existing tab

2. **Google Workspace (Keep Services Separate)**:
   - Add pattern: Type=`Wildcard`, Pattern=`*.google.com`, Group By=`Subdomain`
   - Gmail, Calendar, and Drive can each have one tab open
   - But no duplicates within each service

3. **GitHub (All Pages as One)**:
   - Add pattern: Type=`Base`, Pattern=`github.com`, Group By=`All as One`
   - All GitHub pages (repos, PRs, issues) share one tab
   - Perfect for avoiding multiple GitHub tabs

4. **Test Pattern Functionality**:
   - Create a pattern for a domain
   - Open multiple tabs of that domain
   - Watch as duplicates are automatically closed
   - Check popup to see grouped tabs

5. **Test Import/Export**:
   - Configure your patterns
   - Export settings to JSON
   - Import on another machine or browser

## File Structure

```
OnlyOneTab/
├── manifest.json          # Extension configuration
├── background.js          # Core tab management logic
├── popup.html            # Popup interface HTML
├── popup.js              # Popup interface logic
├── options.html          # Settings page HTML
├── options.js            # Settings page logic
├── styles.css            # Shared styles
├── icon16.png            # Toolbar icon (16x16)
├── icon48.png            # Extension icon (48x48)
├── icon128.png           # Store icon (128x128)
├── generate_icons.py     # Icon generator script
└── README.md            # This file
```

## Troubleshooting

- **Extension doesn't load**: Make sure Developer Mode is enabled
- **Tabs aren't being managed**: Check if the domain is in your tracked domains list (if using specific mode)
- **Can't see the extension icon**: Click the puzzle piece icon in Chrome toolbar and pin OnlyOneTab

## Privacy

This extension:
- Only runs locally in your browser
- Does not collect or send any data
- Only accesses tab information to perform its functionality
- Stores settings locally using Chrome's storage API

## License

MIT License - Feel free to modify and distribute as needed.

## Support

For issues or feature requests, please open an issue on GitHub.