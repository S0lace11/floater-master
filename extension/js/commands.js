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

            const currentWindow = await chrome.windows.get(tab.windowId, { populate: true });
            const newWindow = await this.windowManager.createFloatingWindow(tab);
            
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
            // 获取当前激活的窗口
            const currentWindow = await chrome.windows.getCurrent();
            
            // 检查当前窗口是否是悬浮窗
            if (!this.floatingWindows.has(currentWindow.id)) {
                console.log("当前窗口不是悬浮窗");
                return;
            }

            const floatingInfo = this.floatingWindows.get(currentWindow.id);
            
            try {
                // 获取悬浮窗中的标签页
                const [tab] = await chrome.tabs.query({
                    windowId: currentWindow.id
                });

                if (!tab) {
                    this.floatingWindows.delete(currentWindow.id);
                    return;
                }

                // 检查原始窗口是否还存在
                let targetWindowId = floatingInfo.originalWindowId;
                const allWindows = await chrome.windows.getAll();
                
                if (!allWindows.some(w => w.id === targetWindowId)) {
                    // 如果原始窗口不存在，使用第一个非悬浮窗口
                    const normalWindow = allWindows.find(w => 
                        !this.floatingWindows.has(w.id));
                    
                    if (normalWindow) {
                        targetWindowId = normalWindow.id;
                    } else {
                        // 如果没有可用的普通窗口，创建一个新窗口
                        const newWindow = await chrome.windows.create({
                            focused: false  // 设置为 false，不自动聚焦新窗口
                        });
                        targetWindowId = newWindow.id;
                    }
                }

                // 移动标签页
                await chrome.tabs.move(tab.id, {
                    windowId: targetWindowId,
                    index: -1 // 添加到末尾
                });

                // 恢复标签页的原始状态
                if (floatingInfo.tabInfo.pinned) {
                    await chrome.tabs.update(tab.id, { pinned: true });
                }
                
                try {
                    if (floatingInfo.tabInfo.groupId > -1) {
                        await chrome.tabs.group({
                            tabIds: tab.id,
                            groupId: floatingInfo.tabInfo.groupId
                        });
                    }
                } catch (groupError) {
                    console.log("无法恢复标签组:", groupError);
                }

                // 关闭悬浮窗
                try {
                    await chrome.windows.remove(currentWindow.id);
                } catch (removeError) {
                    console.log("窗口已自动关闭");
                }

                // 从记录中移除
                this.floatingWindows.delete(currentWindow.id);

            } catch (error) {
                console.error(`处理悬浮窗 ${currentWindow.id} 时发生错误:`, error);
            }
        } catch (error) {
            console.error("还原悬浮窗过程中发生错误:", error);
        }
    }
} 