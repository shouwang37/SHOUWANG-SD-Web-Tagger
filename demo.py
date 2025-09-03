import sys
import os

# 将 backend 目录添加到 Python 路径中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app import create_app

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    # 从后端配置中导入必要的常量
    from backend.config import IMAGE_DIR, THUMBNAIL_DIR
    print("🎨 守望影神图集案器 v0.1 启动中...")
    print(f"📁 图片目录: {os.path.abspath(IMAGE_DIR)}")
    print(f"🖼️ 缩略图目录: {os.path.abspath(THUMBNAIL_DIR)}")
    print("🌐 服务地址: http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)