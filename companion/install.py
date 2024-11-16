import os
import sys
import json
import winreg
import argparse

def get_python_path():
    """获取Python解释器路径"""
    return sys.executable

def get_script_path():
    """获取companion.py的完整路径"""
    return os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        "companion.py"
    ))

def create_batch_wrapper():
    """创建批处理文件来启动Python脚本"""
    batch_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        "run_companion.bat"
    ))
    
    with open(batch_path, 'w') as f:
        f.write(f'@echo off\n"{get_python_path()}" "{get_script_path()}" %*')
    
    return batch_path

def create_manifest(extension_id):
    """创建Native Messaging manifest"""
    manifest = {
        "name": "tabfloater_companion",
        "description": "TabFloater Companion Application",
        "path": create_batch_wrapper(),
        "type": "stdio",
        "allowed_origins": [
            f"chrome-extension://{extension_id}/"
        ]
    }
    
    manifest_dir = os.path.join(os.path.dirname(__file__), "manifest")
    os.makedirs(manifest_dir, exist_ok=True)
    
    manifest_path = os.path.join(manifest_dir, "tabfloater_companion.json")
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=4)
    
    return manifest_path

def install_native_messaging_host(extension_id):
    """安装Native Messaging Host"""
    try:
        manifest_path = create_manifest(extension_id)
        
        # 创建注册表项
        registry_key = winreg.CreateKey(
            winreg.HKEY_CURRENT_USER,
            "Software\\Google\\Chrome\\NativeMessagingHosts\\tabfloater_companion"
        )
        
        # 设置注册表值
        manifest_path = os.path.abspath(manifest_path)
        winreg.SetValue(registry_key, "", winreg.REG_SZ, manifest_path)
        winreg.CloseKey(registry_key)
        
        print(f"Native Messaging Host 安装成功！")
        print(f"清单文件位置: {manifest_path}")
        return True
        
    except Exception as e:
        print(f"安装失败: {str(e)}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='安装 TabFloater Companion')
    parser.add_argument('--extension-id', required=True, 
                      help='Chrome扩展ID (不要包含@chrome)')
    
    args = parser.parse_args()
    install_native_messaging_host(args.extension_id)