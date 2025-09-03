import os
import threading
from .config import IMAGE_DIR, THUMBNAIL_DIR, ALLOWED_EXTENSIONS
from PIL import Image

def get_safe_filename(filename):
    """获取安全的文件名，移除或替换不安全的字符"""
    # 移除或替换不安全的字符
    unsafe_chars = '<>:"/\\|?*\x00-\x1f'
    for char in unsafe_chars:
        filename = filename.replace(char, '_')
    # 移除控制字符
    filename = ''.join(char for char in filename if ord(char) >= 32)
    # 限制文件名长度
    if len(filename) > 200:
        name, ext = os.path.splitext(filename)
        filename = name[:200-len(ext)] + ext
    return filename.strip() or 'unnamed'

def create_thumbnail(image_path, size=(200, 200)):
    """创建缩略图"""
    try:
        with Image.open(image_path) as img:
            # 转换为RGB模式（如果需要）
            if img.mode in ('RGBA', 'LA', 'P'):
                # 创建白色背景
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            
            # 保持宽高比
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            return img
    except Exception as e:
        print(f"缩略图创建失败: {e}")
        return None

def get_directory_tree(base_path):
    """获取目录树结构"""
    def build_tree(path):
        tree = []
        try:
            if not os.path.exists(path):
                # 目录不存在时返回空列表而不是报错
                return tree
                
            items = os.listdir(path)
            dirs = [item for item in items if os.path.isdir(os.path.join(path, item))]
            dirs.sort()
            
            for dir_name in dirs:
                dir_path = os.path.join(path, dir_name)
                relative_path = os.path.relpath(dir_path, base_path).replace('\\', '/')
                tree.append({
                    'name': dir_name,
                    'path': relative_path,
                    'children': build_tree(dir_path)
                })
        except PermissionError:
            print(f"无权限访问目录: {path}")
        except Exception as e:
            print(f"读取目录时出错: {path}, 错误: {e}")
        return tree
    
    return build_tree(base_path)

def get_files_in_directory(directory_path):
    """获取目录中的文件列表"""
    files = []
    try:
        if not os.path.exists(directory_path):
            # 目录不存在时返回空列表而不是报错
            return files
            
        items = os.listdir(directory_path)
        # 分离文件和目录
        file_items = [item for item in items if os.path.isfile(os.path.join(directory_path, item))]
        # 只处理允许的扩展名的文件
        image_files = [item for item in file_items if os.path.splitext(item)[1].lower() in ALLOWED_EXTENSIONS]
        image_files.sort()
        
        for file_name in image_files:
            name, ext = os.path.splitext(file_name)
            file_path = os.path.join(directory_path, file_name)
            relative_path = os.path.relpath(file_path, IMAGE_DIR).replace('\\', '/')
            
            # 读取对应的txt文件内容
            txt_path = os.path.join(directory_path, f"{name}.txt")
            txt_content = ""
            if os.path.exists(txt_path):
                try:
                    with open(txt_path, 'r', encoding='utf-8') as f:
                        txt_content = f.read().strip()
                except Exception as e:
                    print(f"读取txt文件失败: {e}")
            
            # 获取文件修改时间
            try:
                modified_time = os.path.getmtime(file_path)
            except:
                modified_time = 0
            
            files.append({
                'name': name,
                'path': relative_path,
                'value': txt_content,
                'modified': modified_time
            })
    except PermissionError:
        print(f"无权限访问目录: {directory_path}")
    except Exception as e:
        print(f"读取目录文件时出错: {directory_path}, 错误: {e}")
    
    return files

def search_all_files(query):
    """全局搜索文件名和内容"""
    from .config import ALLOWED_EXTENSIONS, IMAGE_DIR
    
    results = []
    query_lower = query.lower()
    
    # 存储匹配的文件夹路径
    matched_folders = set()  # 使用set避免重复
    
    # 第一步：优先搜索单元名（文件名）
    for root, dirs, files in os.walk(IMAGE_DIR):
        # 检查当前目录是否存在
        if not os.path.exists(root):
            continue
            
        for file in files:
            name, ext = os.path.splitext(file)
            if ext.lower() in ALLOWED_EXTENSIONS:
                # 模糊搜索文件名
                if query_lower in name.lower():
                    file_path = os.path.join(root, file)
                    txt_path = os.path.join(root, f"{name}.txt")
                    txt_content = ""
                    
                    if os.path.exists(txt_path):
                        try:
                            with open(txt_path, 'r', encoding='utf-8') as f:
                                txt_content = f.read().strip()
                        except:
                            pass
                    
                    try:
                        modified_time = os.path.getmtime(file_path)
                    except:
                        modified_time = 0
                    
                    relative_path = os.path.relpath(file_path, IMAGE_DIR).replace('\\', '/')
                    
                    results.append({
                        'name': name,
                        'path': relative_path,
                        'value': txt_content,
                        'modified': modified_time,
                        'is_dir': False
                    })
    
    # 第二步：搜索菜单名（文件夹名）
    for root, dirs, files in os.walk(IMAGE_DIR):
        # 检查当前目录是否存在
        if not os.path.exists(root):
            continue
            
        for dir_name in dirs:
            # 模糊搜索文件夹名
            if query_lower in dir_name.lower():
                dir_path = os.path.join(root, dir_name)
                relative_path = os.path.relpath(dir_path, IMAGE_DIR).replace('\\', '/')
                matched_folders.add(dir_path)  # 添加到匹配的文件夹集合
                
                results.append({
                    'name': dir_name,
                    'path': relative_path,
                    'value': '📁 文件夹匹配',
                    'modified': 0,
                    'is_dir': True
                })
    
    # 第三步：如果搜索词匹配了某个文件夹，展示该文件夹下的所有单元
    for folder_path in matched_folders:
        try:
            if not os.path.exists(folder_path):
                continue
                
            folder_files = os.listdir(folder_path)
            for file in folder_files:
                name, ext = os.path.splitext(file)
                if ext.lower() in ALLOWED_EXTENSIONS:
                    file_path = os.path.join(folder_path, file)
                    txt_path = os.path.join(folder_path, f"{name}.txt")
                    txt_content = ""
                    
                    if os.path.exists(txt_path):
                        try:
                            with open(txt_path, 'r', encoding='utf-8') as f:
                                txt_content = f.read().strip()
                        except:
                            pass
                    
                    try:
                        modified_time = os.path.getmtime(file_path)
                    except:
                        modified_time = 0
                    
                    relative_path = os.path.relpath(file_path, IMAGE_DIR).replace('\\', '/')
                    
                    # 避免重复添加（检查路径是否已存在）
                    if not any(item['path'] == relative_path for item in results):
                        results.append({
                            'name': name,
                            'path': relative_path,
                            'value': txt_content,
                            'modified': modified_time,
                            'is_dir': False
                        })
        except PermissionError:
            print(f"无权限访问目录: {folder_path}")
        except Exception as e:
            print(f"搜索文件夹内容时出错: {folder_path}, 错误: {e}")
    
    # 按照是否为文件夹和修改时间排序，文件夹在前，然后按修改时间倒序排列
    results.sort(key=lambda x: (not x['is_dir'], -x['modified']))
    
    return results

def generate_all_thumbnails():
    """批量生成所有图片的缩略图（后台线程执行）"""
    print("开始批量生成缩略图...")
    count = 0
    for root, dirs, files in os.walk(IMAGE_DIR):
        for file in files:
            name, ext = os.path.splitext(file)
            if ext.lower() in ALLOWED_EXTENSIONS:
                try:
                    image_path = os.path.join(root, file)
                    relative_path = os.path.relpath(image_path, IMAGE_DIR).replace('\\', '/')
                    thumbnail_name = get_safe_filename(name) + '.jpg'
                    thumbnail_path = os.path.join(THUMBNAIL_DIR, relative_path.replace(ext, '.jpg'))
                    thumbnail_dir = os.path.dirname(thumbnail_path)
                    
                    # 确保缩略图目录存在
                    os.makedirs(thumbnail_dir, exist_ok=True)
                    
                    # 检查缩略图是否需要重新生成
                    if not os.path.exists(thumbnail_path) or os.path.getmtime(image_path) > os.path.getmtime(thumbnail_path):
                        thumbnail = create_thumbnail(image_path)
                        if thumbnail:
                            thumbnail.save(thumbnail_path, 'JPEG', quality=85)
                            count += 1
                            if count % 50 == 0:
                                print(f"已生成 {count} 张缩略图...")
                except Exception as e:
                    print(f"生成缩略图失败: {image_path}, 错误: {e}")
    
    print(f"缩略图生成完成，共生成 {count} 张缩略图")