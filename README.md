## OnlyOneTab 🚀

**Focus on the task, not the clutter.**

OnlyOneTab is a smart Chrome extension that automatically detects and closes duplicate tabs based on custom rules. Whether you need to stop multiple instances of WhatsApp Web from screaming for attention, or you want to consolidate all your GitHub repositories into a single browsing stream, OnlyOneTab handles it for you.

 

## ✨ Features

  * **🎯 Smart De-duplication:** Automatically switches you to an existing tab instead of opening a new one.
  * **⚙️ Granular Control:** You decide which sites are tracked. Use global tracking or define specific rules for high-noise apps.
  * **⚡ Quick Templates:** One-click setup for popular tools like **WhatsApp, Slack, Notion, and Google Workspace**.
  * **🔍 Flexible Pattern Matching:**
      * **Exact Match:** Lock down specific subdomains (e.g., `web.whatsapp.com`).
      * **Wildcards:** manage entire ecosystems (e.g., `*.google.com`).
  * **🧹 Housekeeping Tools:** Instant buttons to "Close All Duplicates" or "Merge All Windows."

-----

## 🧠 Pattern Logic

OnlyOneTab offers powerful logic to determine what counts as a "duplicate."

| Pattern Type | Example Input | Behavior | Best For |
| :--- | :--- | :--- | :--- |
| **Exact Domain** | `web.whatsapp.com` | Matches only this exact URL. | Single Page Apps (WhatsApp, Spotify) |
| **Wildcard** | `*.google.com` | Matches any subdomain (`mail.`, `calendar.`). | Suites like Google Workspace |
| **Base Domain** | `github.com` | Matches the root and all subdomains. | Sites where you browse many areas |

### Grouping Strategies

For every pattern, you can decide how tabs are treated:

1.  **By Subdomain:** `mail.google.com` and `drive.google.com` are treated as **separate** tabs.
2.  **All as One:** All pages under `github.com` (issues, PRs, code) are treated as **one** single tab.

-----

## 📥 Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **"Developer mode"** in the top right corner.
4.  Click **"Load unpacked"**.
5.  Select the `OnlyOneTab` folder.

-----

## 🛠 Configuration Recipes

Here are the most popular ways to configure OnlyOneTab:

### 1\. The "WhatsApp Quiet Mode"

*Prevents having 5 different WhatsApp tabs ringing at once.*

  * **Pattern:** `web.whatsapp.com`
  * **Type:** Exact Domain
  * **Group By:** All as One

### 2\. The "Google Workspace" (Keep Services Separate)

*Allows one Gmail tab, one Calendar tab, and one Drive tab, but no duplicates of each.*

  * **Pattern:** `*.google.com`
  * **Type:** Wildcard
  * **Group By:** Each subdomain separately

### 3\. The "GitHub Focus"

*Forces you to focus on one repository or issue at a time.*

  * **Pattern:** `github.com`
  * **Type:** Base Domain
  * **Group By:** All as One

### 4\. The "Slack/Teams" Manager

*Great for users with multiple workspace URLs.*

  * **Pattern:** `*.slack.com`
  * **Type:** Wildcard
  * **Group By:** Each subdomain separately (One tab per workspace)

-----

## 💻 Development

If you want to contribute or modify the extension, here is the project structure:

```text
OnlyOneTab/
├── background.js      # Core logic (tab listeners & state management)
├── popup/             # The quick-access menu
├── options/           # The full settings dashboard
├── styles/            # Shared CSS
├── manifest.json      # Chrome configuration
└── generate_icons.py  # Python utility for asset generation
```

## 🔒 Privacy

**OnlyOneTab works 100% offline.**

  * No data is sent to external servers.
  * Settings are stored locally using the Chrome Storage API.
  * We only access tab data to perform the de-duplication action.

For complete details, see our [Privacy Policy](PRIVACY.md).

## 📄 License

MIT License. Feel free to fork, modify, and distribute.