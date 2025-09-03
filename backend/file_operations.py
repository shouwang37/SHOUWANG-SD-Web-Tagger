# 文件操作模块
import os
import base64
from .config import IMAGE_DIR, THUMBNAIL_DIR, file_lock
from .utils import get_safe_filename, create_thumbnail

def get_unit_details(path):
    """获取单个单元详情"""
    full_path = os.path.join(IMAGE_DIR, path)
    
    if not os.path.exists(full_path):
        return None
    
    # 获取文件名和txt内容
    name = os.path.splitext(os.path.basename(path))[0]
    txt_path = os.path.join(os.path.dirname(full_path), f"{name}.txt")
    txt_content = ""
    
    if os.path.exists(txt_path):
        try:
            with open(txt_path, 'r', encoding='utf-8') as f:
                txt_content = f.read().strip()
        except Exception as e:
            print(f"读取txt文件失败: {e}")
    
    return {
        'name': name,
        'path': path,
        'value': txt_content
    }

def create_unit(path, name, value, image_data):
    """创建新单元"""
    # 确定保存目录
    save_dir = os.path.join(IMAGE_DIR, path) if path else IMAGE_DIR
    os.makedirs(save_dir, exist_ok=True)
    
    # 文件路径
    image_path = os.path.join(save_dir, f"{name}.png")
    txt_path = os.path.join(save_dir, f"{name}.txt")
    
    # 检查文件是否已存在
    if os.path.exists(image_path):
        return {'error': '同名文件已存在'}, 409
    
    with file_lock:
        # 保存图片
        try:
            image_bytes = base64.b64decode(image_data)
            with open(image_path, 'wb') as f:
                f.write(image_bytes)
        except Exception as e:
            return {'error': f'图片保存失败: {str(e)}'}, 500
        
        # 保存txt文件
        try:
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(value)
        except Exception as e:
            # 如果txt保存失败，删除已保存的图片
            if os.path.exists(image_path):
                os.remove(image_path)
            return {'error': f'文本文件保存失败: {str(e)}'}, 500
    
    return {'message': '单元创建成功'}, 201

def update_unit(old_path, new_name, new_value):
    """更新单元"""
    old_full_path = os.path.join(IMAGE_DIR, old_path)
    
    if not os.path.exists(old_full_path):
        return {'error': '原文件不存在'}, 404
    
    # 获取目录和文件信息
    directory = os.path.dirname(old_full_path)
    old_name, ext = os.path.splitext(os.path.basename(old_full_path))
    
    # 新文件路径
    new_image_path = os.path.join(directory, f"{new_name}{ext}")
    new_txt_path = os.path.join(directory, f"{new_name}.txt")
    old_txt_path = os.path.join(directory, f"{old_name}.txt")
    
    # 只有当名称真正改变且新名称对应的文件已存在时才检查名称冲突
    # 排除同名保存的情况（new_image_path == old_full_path）
    if new_name != old_name and os.path.exists(new_image_path) and new_image_path != old_full_path:
        return {'error': '新名称已存在'}, 409
    
    with file_lock:
        try:
            # 重命名文件（仅当名称改变时）
            if new_name != old_name:
                os.rename(old_full_path, new_image_path)
                
                # 重命名txt文件
                if os.path.exists(old_txt_path):
                    os.rename(old_txt_path, new_txt_path)
                
                # 删除旧缩略图
                old_thumbnail = os.path.join(THUMBNAIL_DIR, old_path.replace(ext, '.jpg'))
                if os.path.exists(old_thumbnail):
                    os.remove(old_thumbnail)
            
            # 更新txt内容
            # 使用新的路径或旧的路径来保存txt文件
            txt_path_to_use = new_txt_path if new_name != old_name else old_txt_path
            with open(txt_path_to_use, 'w', encoding='utf-8') as f:
                f.write(new_value)
            
        except Exception as e:
            return {'error': f'更新失败: {str(e)}'}, 500
    
    return {'message': '单元更新成功'}, 200

def delete_unit(path):
    """删除单元"""
    full_path = os.path.join(IMAGE_DIR, path)
    
    if not os.path.exists(full_path):
        return {'error': '文件不存在'}, 404
    
    try:
        with file_lock:
            # 删除图片文件
            os.remove(full_path)
            
            # 删除对应的txt文件
            name = os.path.splitext(os.path.basename(full_path))[0]
            txt_path = os.path.join(os.path.dirname(full_path), f"{name}.txt")
            if os.path.exists(txt_path):
                os.remove(txt_path)
            
            # 删除缩略图
            thumbnail_path = os.path.join(THUMBNAIL_DIR, path.replace(os.path.splitext(path)[1], '.jpg'))
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
        
        return {'message': '单元删除成功'}, 200
        
    except Exception as e:
        return {'error': f'删除失败: {str(e)}'}, 500