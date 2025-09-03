# 配置模块
import os
from threading import Lock

# 版本信息
VERSION = "v0.1"

# 配置
IMAGE_DIR = 'images'
THUMBNAIL_DIR = 'thumbnails'
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'}

# 确保目录存在
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

# 线程锁，防止并发问题
file_lock = Lock()