# 路录模块
import os
import time
from flask import jsonify, request, send_from_directory, abort
from .config import IMAGE_DIR, THUMBNAIL_DIR, file_lock
from .utils import get_directory_tree, get_files_in_directory, search_all_files, create_thumbnail
from .file_operations import get_unit_details, create_unit, update_unit, delete_unit

def register_routes(app):
    """注册所有路由"""
    
    @app.route('/')
    def index():
        """主页"""
        # 获取项目根目录的绝对路径
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        src_path = os.path.join(project_root, 'src')
        return send_from_directory(src_path, 'index.html')
    
    @app.route('/src/<path:filename>')
    def serve_src_files(filename):
        """提供src目录下的文件服务"""
        # 获取项目根目录的绝对路径
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        src_path = os.path.join(project_root, 'src')
        return send_from_directory(src_path, filename)
    
    @app.route('/api/data')
    def api_data():
        """获取目录树和文件数据（支持分页）"""
        path = request.args.get('path', '').strip('/')
        # 获取页码和每页数量参数，设置默认值
        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 50))
            # 限制每页最大数量
            per_page = min(per_page, 100)
        except ValueError:
            page, per_page = 1, 50
        
        # 获取目录树
        tree = get_directory_tree(IMAGE_DIR)
        
        # 获取当前路径下的文件
        current_dir = os.path.join(IMAGE_DIR, path) if path else IMAGE_DIR
        all_files = get_files_in_directory(current_dir)
        
        # 分页处理
        total = len(all_files)
        start = (page - 1) * per_page
        end = start + per_page
        files = all_files[start:end]
        
        return jsonify({
            'tree': tree,
            'files': files,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'has_more': end < total
            }
        })
    
    @app.route('/api/search')
    def api_search():
        """搜索功能"""
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify([])
        
        results = search_all_files(query)
        return jsonify(results)
    
    @app.route('/api/thumbnail')
    def api_thumbnail():
        """获取缩略图"""
        path = request.args.get('path', '')
        
        if not path:
            return abort(400, '路径参数必需')
        
        try:
            # URL解码路径参数
            from urllib.parse import unquote
            path = unquote(path)
            
            # 规范化路径分隔符，确保在Windows上正确处理
            path = path.replace('/', os.sep).replace('\\', os.sep)
            
            # 构建完整路径
            full_path = os.path.join(IMAGE_DIR, path)
            
            # 规范化完整路径以防止路径遍历攻击
            full_path = os.path.normpath(full_path)
            image_dir_abs = os.path.abspath(IMAGE_DIR)
            
            # 确保请求的文件在IMAGE_DIR目录内（使用相对路径检查）
            try:
                rel_path = os.path.relpath(full_path, image_dir_abs)
                # 检查相对路径是否在上级目录中（防止路径遍历）
                if rel_path.startswith('..'):
                    return abort(400, '无效的路径')
            except ValueError:
                # 当路径在不同驱动器上时会抛出ValueError
                return abort(400, '无效的路径')
            
            if not os.path.exists(full_path):
                return abort(404, f'原始图片文件不存在: {full_path}')
            
            # 缩略图路径
            name, ext = os.path.splitext(path)
            # 确保缩略图文件名安全
            from .utils import get_safe_filename
            thumbnail_name = get_safe_filename(name) + '.jpg'
            thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_name)
            thumbnail_dir = os.path.dirname(thumbnail_path)
            
            # 确保缩略图目录存在
            os.makedirs(thumbnail_dir, exist_ok=True)
            
            # 检查缩略图是否需要重新生成
            if not os.path.exists(thumbnail_path) or os.path.getmtime(full_path) > os.path.getmtime(thumbnail_path):
                with file_lock:
                    # 双重检查，防止并发创建
                    if not os.path.exists(thumbnail_path) or os.path.getmtime(full_path) > os.path.getmtime(thumbnail_path):
                        from .utils import create_thumbnail
                        thumbnail = create_thumbnail(full_path)
                        if thumbnail:
                            thumbnail.save(thumbnail_path, 'JPEG', quality=85)
                            print(f"缩略图已生成: {thumbnail_path}")
                        else:
                            return abort(500, f'缩略图生成失败: {full_path}')
            
            # 确保缩略图文件存在
            if not os.path.exists(thumbnail_path):
                return abort(500, f'缩略图文件不存在: {thumbnail_path}')
            
            # 检查缩略图目录和文件
            thumbnail_dir = os.path.dirname(thumbnail_path)
            if not os.path.exists(thumbnail_dir):
                return abort(500, f'缩略图目录不存在: {thumbnail_dir}')
            
            if not os.path.exists(thumbnail_path):
                return abort(500, f'缩略图文件不存在: {thumbnail_path}')
            
            print(f"发送缩略图: {thumbnail_path}")
            # 添加HTTP缓存头
            response = send_from_directory(os.path.abspath(thumbnail_dir), os.path.basename(thumbnail_path))
            response.headers['Cache-Control'] = 'public, max-age=86400'  # 缓存1天
            response.headers['ETag'] = str(os.path.getmtime(thumbnail_path))
            return response
        except Exception as e:
            print(f"缩略图处理错误: {e}")
            import traceback
            traceback.print_exc()
            return abort(500, f'服务器内部错误: {str(e)}')
    
    @app.route('/api/image')
    def api_image():
        """获取原图"""
        path = request.args.get('path', '')
        
        if not path:
            return abort(400, '路径参数必需')
        
        try:
            # URL解码路径参数
            from urllib.parse import unquote
            path = unquote(path)
            
            # 构建完整路径
            full_path = os.path.join(IMAGE_DIR, path)
            
            # 规范化完整路径以防止路径遍历攻击
            full_path = os.path.normpath(full_path)
            image_dir_abs = os.path.abspath(IMAGE_DIR)
            
            # 确保请求的文件在IMAGE_DIR目录内（使用相对路径检查）
            try:
                rel_path = os.path.relpath(full_path, image_dir_abs)
                # 检查相对路径是否在上级目录中（防止路径遍历）
                if rel_path.startswith('..'):
                    return abort(400, '无效的路径')
            except ValueError:
                # 当路径在不同驱动器上时会抛出ValueError
                return abort(400, '无效的路径')
            
            if not os.path.exists(full_path):
                return abort(404, f'文件不存在: {full_path}')
            
            # 获取文件名和目录
            directory = os.path.dirname(full_path)
            filename = os.path.basename(full_path)
            
            # 添加调试信息
            print(f"原图请求路径: {path}")
            print(f"完整文件路径: {full_path}")
            print(f"目录: {directory}")
            print(f"文件名: {filename}")
            print(f"目录绝对路径: {os.path.abspath(directory)}")
            
            # 添加HTTP缓存头
            response = send_from_directory(os.path.abspath(directory), filename)
            response.headers['Cache-Control'] = 'public, max-age=3600'  # 缓存1小时
            response.headers['ETag'] = str(os.path.getmtime(full_path))
            return response
        except Exception as e:
            print(f"原图处理错误: {e}")
            import traceback
            traceback.print_exc()
            return abort(500, f'服务器内部错误: {str(e)}')
    
    @app.route('/api/unit', methods=['GET'])
    def api_get_unit():
        """获取单个单元详情"""
        path = request.args.get('path', '')
        
        if not path:
            return abort(400, '路径参数必需')
        
        result = get_unit_details(path)
        if result is None:
            return abort(404, '文件不存在')
        
        return jsonify(result)
    
    @app.route('/api/unit', methods=['POST'])
    def api_create_unit():
        """创建新单元"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': '无效的数据格式'}), 400
            
            path = data.get('path', '').strip('/')
            name = data.get('name', '').strip()
            value = data.get('value', '').strip()
            image_data = data.get('image_data', '')
            
            # 验证输入
            if not name or not image_data:
                return jsonify({'error': '单元名和图片数据不能为空'}), 400
            
            # 获取安全的文件名
            from .utils import get_safe_filename
            name = get_safe_filename(name)
            
            # 创建单元
            result, status_code = create_unit(path, name, value, image_data)
            return jsonify(result), status_code
            
        except Exception as e:
            return jsonify({'error': f'创建失败: {str(e)}'}), 500

    @app.route('/api/unit', methods=['PUT'])
    def api_update_unit():
        """更新单元"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': '无效的数据格式'}), 400
            
            old_path = data.get('old_path', '')
            new_name = data.get('new_name', '').strip()
            new_value = data.get('new_value', '').strip()
            
            if not old_path or not new_name:
                return jsonify({'error': '路径和新名称不能为空'}), 400
            
            # 获取安全的文件名
            from .utils import get_safe_filename
            new_name = get_safe_filename(new_name)
            
            # 更新单元
            result, status_code = update_unit(old_path, new_name, new_value)
            return jsonify(result), status_code
            
        except Exception as e:
            return jsonify({'error': f'更新失败: {str(e)}'}), 500
    
    @app.route('/api/unit', methods=['DELETE'])
    def api_delete_unit():
        """删除单元"""
        path = request.args.get('path', '')
        
        if not path:
            return jsonify({'error': '路径参数必需'}), 400
        
        result, status_code = delete_unit(path)
        return jsonify(result), status_code

    @app.route('/api/folder', methods=['POST'])
    def api_create_folder():
        """创建文件夹"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': '无效的数据格式'}), 400
            
            parent_path = data.get('parent_path', '').strip('/')
            name = data.get('name', '').strip()
            
            # 验证输入
            if not name:
                return jsonify({'error': '文件夹名称不能为空'}), 400
            
            # 获取安全的文件名
            from .utils import get_safe_filename
            name = get_safe_filename(name)
            
            # 构建完整路径
            if parent_path:
                full_path = os.path.join(IMAGE_DIR, parent_path, name)
            else:
                full_path = os.path.join(IMAGE_DIR, name)
            
            # 检查文件夹是否已存在
            if os.path.exists(full_path):
                return jsonify({'error': '文件夹已存在'}), 409
            
            # 创建文件夹
            os.makedirs(full_path, exist_ok=True)
            
            return jsonify({'message': '文件夹创建成功'}), 201
            
        except Exception as e:
            # 确保始终返回JSON格式的错误信息
            import traceback
            traceback.print_exc()  # 打印错误堆栈以便调试
            return jsonify({'error': f'创建失败: {str(e)}'}), 500

    @app.route('/api/folder/rename', methods=['PUT'])
    def api_rename_folder():
        """重命名文件夹"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': '无效的数据格式'}), 400
            
            old_path = data.get('old_path', '').strip('/')
            new_path = data.get('new_path', '').strip('/')
            
            # 验证输入
            if not old_path or not new_path:
                return jsonify({'error': '路径不能为空'}), 400
            
            # 构建完整路径
            old_full_path = os.path.join(IMAGE_DIR, old_path)
            new_full_path = os.path.join(IMAGE_DIR, new_path)
            
            # 检查旧文件夹是否存在
            if not os.path.exists(old_full_path):
                return jsonify({'error': '原文件夹不存在'}), 404
            
            # 检查新文件夹是否已存在
            if os.path.exists(new_full_path):
                return jsonify({'error': '目标文件夹已存在'}), 409
            
            # 重命名文件夹
            os.rename(old_full_path, new_full_path)
            
            # 同时重命名缩略图目录中的对应文件夹（如果存在）
            old_thumbnail_path = os.path.join(THUMBNAIL_DIR, old_path)
            new_thumbnail_path = os.path.join(THUMBNAIL_DIR, new_path)
            if os.path.exists(old_thumbnail_path):
                os.rename(old_thumbnail_path, new_thumbnail_path)
            
            return jsonify({'message': '文件夹重命名成功'}), 200
            
        except Exception as e:
            # 确保始终返回JSON格式的错误信息
            import traceback
            traceback.print_exc()  # 打印错误堆栈以便调试
            return jsonify({'error': f'重命名失败: {str(e)}'}), 500
