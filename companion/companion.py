import sys
import json
import struct
import win32gui
import win32con
import logging
import os

# 设置日志文件路径到脚本所在目录
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tabfloater.log')
logging.basicConfig(
    filename=log_path,
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def read_message():
    """从标准输入读取消息"""
    try:
        # 读取消息长度（前4个字节）
        length_bytes = sys.stdin.buffer.read(4)
        if not length_bytes:
            logging.error("没有接收到消息长度")
            return None
        
        # 解析消息长度
        message_length = struct.unpack('=I', length_bytes)[0]
        logging.debug(f"接收到消息长度: {message_length}")
        
        # 读取消息内容
        message_bytes = sys.stdin.buffer.read(message_length)
        message = json.loads(message_bytes.decode('utf-8'))
        logging.debug(f"接收到消息: {message}")
        return message
        
    except Exception as e:
        logging.error(f"读取消息时出错: {str(e)}")
        return None

def write_message(message):
    """向标准输出写入消息"""
    try:
        logging.debug(f"发送消息: {message}")
        encoded_message = json.dumps(message).encode('utf-8')
        length_bytes = struct.pack('=I', len(encoded_message))
        
        # 写入消息长度和内容
        sys.stdout.buffer.write(length_bytes)
        sys.stdout.buffer.write(encoded_message)
        sys.stdout.buffer.flush()
        
    except Exception as e:
        logging.error(f"写入消息时出错: {str(e)}")

def find_window_by_title(title):
    """根据标题查找窗口句柄"""
    def callback(hwnd, windows):
        if win32gui.IsWindowVisible(hwnd):
            window_title = win32gui.GetWindowText(hwnd)
            if title.lower() in window_title.lower():
                windows.append(hwnd)
        return True

    windows = []
    win32gui.EnumWindows(callback, windows)
    return windows[0] if windows else None

def make_window_floating(window_title):
    """使窗口始终置顶"""
    try:
        logging.debug(f"尝试将窗口置顶: {window_title}")
        
        # 查找窗口句柄
        hwnd = find_window_by_title(window_title)
        if not hwnd:
            logging.error(f"未找到窗口: {window_title}")
            return False

        # 获取当前窗口样式
        current_style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
        
        # 添加置顶标志
        new_style = current_style | win32con.WS_EX_TOPMOST
        
        # 设置新样式
        win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, new_style)
        
        # 强制窗口置顶
        win32gui.SetWindowPos(
            hwnd,
            win32con.HWND_TOPMOST,
            0, 0, 0, 0,
            win32con.SWP_NOMOVE | win32con.SWP_NOSIZE
        )
        
        logging.debug("窗口置顶设置成功")
        return True
        
    except Exception as e:
        logging.error(f"设置窗口置顶失败: {str(e)}")
        return False

def main():
    """主循环"""
    logging.info("TabFloater Companion 启动")
    
    while True:
        try:
            # 读取消息
            message = read_message()
            if not message:
                logging.error("接收消息失败，退出程序")
                break

            # 处理消息
            if message.get('action') == 'makeWindowFloating':
                window_title = message.get('windowTitle')
                logging.info(f"收到置顶请求: {window_title}")
                
                # 执行置顶操作
                success = make_window_floating(window_title)
                
                # 发送响应
                response = {
                    'success': success,
                    'message': '窗口已设置为浮动' if success else '设置浮动窗口失败'
                }
                write_message(response)
                
            else:
                logging.warning(f"未知的操作: {message.get('action')}")
                
        except Exception as e:
            logging.error(f"处理消息失败: {str(e)}")
            write_message({
                'success': False,
                'error': str(e)
            })

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logging.critical(f"程序崩溃: {str(e)}")
        sys.exit(1) 