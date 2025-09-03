# 守望影神图集案器 v0.1 - 后端服务
import os
import threading
import logging
from flask import Flask
from .config import IMAGE_DIR, THUMBNAIL_DIR
from .routes import register_routes
from .utils import generate_all_thumbnails

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 禁用Flask的访问日志
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    # 注册路由
    register_routes(app)
    
    # 添加全局错误处理，确保API端点始终返回JSON
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'API端点不存在'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': '服务器内部错误'}, 500
    
    # 启动时后台生成所有缩略图
    def start_thumbnail_generation():
        # 在后台线程中生成缩略图
        thumbnail_thread = threading.Thread(target=generate_all_thumbnails, daemon=True)
        thumbnail_thread.start()
    
    # 使用 app.before_first_request 的兼容方式
    @app.before_request
    def before_first_request():
        if not hasattr(app, 'thumbnail_generation_started'):
            app.thumbnail_generation_started = True
            start_thumbnail_generation()
    
    return app

if __name__ == '__main__':
    app = create_app()
    print("🎨 守望影神图集案器 v0.1 启动中...")
    print(f"📁 图片目录: {os.path.abspath(IMAGE_DIR)}")
    print(f"🖼️ 缩略图目录: {os.path.abspath(THUMBNAIL_DIR)}")
    print("🌐 服务地址: http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False, threaded=True)