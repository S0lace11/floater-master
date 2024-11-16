import { WindowManager } from './floater.js';
import { CommandManager } from './commands.js';

const windowManager = new WindowManager();
const commandManager = new CommandManager(windowManager);

// 监听扩展图标点击
chrome.action.onClicked.addListener(async () => {
    await commandManager.floatTab();
});

// 监听窗口变化
chrome.windows.onBoundsChanged.addListener(async (window) => {
    if (window.type === "popup") {
        await windowManager.saveWindowSettings(window);
    }
});

// 监听快捷键
chrome.commands.onCommand.addListener(async (command) => {
    switch (command) {
        case 'float-tab':
            await commandManager.floatTab();
            break;
        case 'unfloat-tab':
            await commandManager.unfloatTab();
            break;
    }
}); 