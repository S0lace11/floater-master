export class WindowManager {
    constructor() {
        this.DEFAULT_WINDOW_SETTINGS = {
            width: 800,
            height: 600,
            top: 50,
            left: 50
        };
    }

    async saveWindowSettings(windowInfo) {
        await chrome.storage.local.set({
            lastWindowSettings: {
                width: windowInfo.width,
                height: windowInfo.height,
                top: windowInfo.top,
                left: windowInfo.left
            }
        });
    }

    async getWindowSettings() {
        const data = await chrome.storage.local.get('lastWindowSettings');
        return data.lastWindowSettings || this.DEFAULT_WINDOW_SETTINGS;
    }

    async createFloatingWindow(tab) {
        const settings = await this.getWindowSettings();
        const newWindow = await chrome.windows.create({
            tabId: tab.id,
            type: "popup",
            ...settings,
            focused: true
        });

        if (newWindow) {
            await this.saveWindowSettings(newWindow);
            await this.notifyCompanion(tab.title, newWindow.id);
        }

        return newWindow;
    }

    async notifyCompanion(windowTitle, windowId) {
        try {
            await chrome.runtime.sendNativeMessage(
                "tabfloater_companion",
                {
                    action: "makeWindowFloating",
                    windowTitle,
                    windowId
                }
            );
        } catch (error) {
            console.error("与 Companion 通信失败:", error);
        }
    }
} 