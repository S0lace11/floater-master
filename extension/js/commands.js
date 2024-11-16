export class CommandManager {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.floatingWindows = new Map(); // 存储悬浮窗信息
    }

    // 记录悬浮窗信息
    saveFloatingWindow(originalWindow, newWindow) {
        this.floatingWindows.set(newWindow.id, {
            originalWindowId: originalWindow.id,
            tabInfo: {
                index: originalWindow.tabs[0].index,
                pinned: originalWindow.tabs[0].pinned,
                groupId: originalWindow.tabs[0].groupId
            }
        });
    }

    // 将标签页转为悬浮窗
    async floatTab() {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (!tab) return;

            // 获取当前窗口信息
            const currentWindow = await chrome.windows.get(tab.windowId, { populate: true });
            
            // 创建悬浮窗
            const newWindow = await this.windowManager.createFloatingWindow(tab);
            
            // 保存悬浮窗信息
            if (newWindow) {
                this.saveFloatingWindow(currentWindow, newWindow);
            }
        } catch (error) {
            console.error("创建悬浮窗失败:", error);
        }
    }

    // 将悬浮窗还原为标签页
    async unfloatTab() {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (!tab) return;

            const currentWindow = await chrome.windows.get(tab.windowId);
            
            // 检查当前窗口是否是已记录的悬浮窗
            const floatingInfo = this.floatingWindows.get(currentWindow.id);
            if (!floatingInfo) return;

            // 移动标签页回原窗口
            await chrome.tabs.move(tab.id, {
                windowId: floatingInfo.originalWindowId,
                index: floatingInfo.tabInfo.index
            });

            // 恢复标签页的原始状态
            if (floatingInfo.tabInfo.pinned) {
                await chrome.tabs.update(tab.id, { pinned: true });
            }

            if (floatingInfo.tabInfo.groupId > -1) {
                await chrome.tabs.group({
                    tabIds: tab.id,
                    groupId: floatingInfo.tabInfo.groupId
                });
            }

            // 激活标签页
            await chrome.tabs.update(tab.id, { active: true });
            await chrome.windows.update(floatingInfo.originalWindowId, { focused: true });

            // 清理记录
            this.floatingWindows.delete(currentWindow.id);

        } catch (error) {
            console.error("还原标签页失败:", error);
        }
    }
} 