# 守望影神图集案器 v0.1 🎨

[![Python](https://img.shields.io/badge/Python-3.7%2B-blue)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0%2B-green)](https://palletsprojects.com/p/flask/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey)](https://www.microsoft.com/windows/)
[![Version](https://img.shields.io/badge/Version-v0.1-orange)](https://github.com/shouwnag/image-gallery-manager)

专为 Stable Diffusion 等 AI 绘图工具设计的本地图集管理桌面应用，帮助 AI 绘图创作者高效管理作品与提示词。

<p align="center">
  <img src="src/SHOUWANG-SD-Web-Tagger0.1.png" alt="界面预览" width="1280">
</p>


## 📌 版本信息

> ⚠️ **注意：当前版本为 v0.1（初始版本）**
> 
> 这是守望影神图集案器的第一个公开发布版本，功能完整但仍在持续开发中。
> 
> **版本状态：** ![Stable](https://img.shields.io/badge/Status-Beta-yellow) ![Build](https://img.shields.io/badge/Build-Passing-brightgreen)

## 🌟 功能特性

- **📁 数据单元组管理**：图片与 txt 文件自动配对，一键管理提示词
- **🔍 智能搜索**：支持按文件名、文件夹名、提示词内容搜索，优先搜索单元名
- **📂 分层导航**：树形文件夹结构，支持无限层级嵌套
- **⚡ 批量操作**：支持拖拽上传、复制、编辑、删除
- **🌙 深色主题界面**：适合长时间使用
- **📱 响应式布局**：每行 7 张卡片，9:16 比例
- **🚀 图片优化**：懒加载与缩略图优化
- **📋 便捷操作**：即时预览、Ctrl+V 粘贴创建、状态保持
- **🎮 一键启动**：双击 bat 文件即可启动
- **🔄 文件夹管理**：支持创建、重命名、删除文件夹
- **🔁 无限滚动加载**：自动加载更多图片，提升浏览体验
- **🖼️ 图片预览**：支持原图查看，可放大显示
- **📥 粘贴创建**：支持从剪贴板粘贴图片创建新单元
- **📤 复制提示词**：一键复制提示词到剪贴板
- **🔄 排序功能**：支持按名称、修改时间等多种排序方式
- **🔁 刷新功能**：实时刷新数据，同步文件系统变化

## 🏗️ 技术架构

- **前端**：HTML5 + CSS3 + JavaScript (ES6) + [Tailwind CSS](https://tailwindcss.com/)
- **后端**：[Python](https://www.python.org/) + [Flask](https://palletsprojects.com/p/flask/)
- **图像处理**：[PIL (Pillow)](https://python-pillow.org/)
- **数据存储**：文件系统（图片 + txt 配对）

## 📁 目录结构

```
守望影神图集案器/
├── backend/              # 后端模块化代码
│   ├── app.py            # Flask 应用创建
│   ├── config.py         # 配置模块
│   ├── file_operations.py # 文件操作模块
│   ├── routes.py         # 路由模块
│   └── utils.py          # 工具函数模块
├── src/                  # 前端源码目录
│   ├── index.html        # 前端界面
│   ├── script.js         # 前端逻辑
│   └── styles.css        # 样式文件
├── images/               # 图片存储目录
├── thumbnails/           # 缩略图缓存目录
├── app.py              # Flask 后端服务入口
├── requirements.txt     # 依赖包说明
├── 启动守望影神图集案器.bat  # 完整启动脚本
```

## 🚀 安装与运行

### 环境要求

- Windows 10/11
- Python 3.7+

### 安装步骤

1. 克隆项目或下载项目压缩包
2. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
   或手动安装：
   ```bash
   pip install flask>=2.0.0 pillow>=8.0.0
   ```

### 启动应用

#### 方法一：一键启动（推荐） ⭐
双击运行 `启动守望影神图集案器.bat`

#### 方法二：命令行启动
```bash
python app.py
```

启动成功后，应用将在 http://127.0.0.1:3737 提供服务。

## 📖 使用说明

### 1. 创建单元
- 拖拽图片到内容区域
- 使用 `Ctrl+V` 粘贴剪贴板中的图片
- 在弹出的编辑框中输入单元名和提示词

### 2. 浏览图片
- 左侧文件夹导航栏可切换不同文件夹
- 右侧网格显示图片单元
- 支持无限滚动加载

### 3. 搜索功能
- 顶部搜索框支持按文件名、文件夹名、提示词内容搜索
- 优先搜索单元名

### 4. 编辑单元
- 点击卡片上的"编辑"按钮
- 修改单元名或提示词内容
- 保存更改

### 5. 删除单元
- 点击卡片上的"删除"按钮
- 确认删除操作

### 6. 复制提示词
- 点击卡片上的"复制"按钮
- 提示词将复制到剪贴板

### 7. 预览原图
- 点击卡片上的"预览"按钮
- 可查看原图

### 8. 文件夹管理
- 点击左侧"同级"或"子级"按钮创建新文件夹
- 双击文件夹名称可重命名
- 右键点击文件夹可进行重命名或删除操作

### 9. 排序功能
- 左侧文件夹导航支持按名称、修改时间排序
- 右侧内容区域支持按名称、修改时间排序

### 10. 刷新功能
- 点击刷新按钮可同步文件系统变化

## 🛠️ 开发指南

### 项目结构说明

- `backend/`：后端 Python 代码
  - `app.py`：Flask 应用初始化
  - `config.py`：全局配置
  - `routes.py`：API 路由定义
  - `utils.py`：工具函数
  - `file_operations.py`：文件操作相关函数
- `src/`：前端静态资源
  - `index.html`：主页面
  - `script.js`：前端 JavaScript 逻辑
  - `styles.css`：样式表
- `app.py`：应用入口文件
- `images/`：用户图片存储目录
- `thumbnails/`：系统自动生成的缩略图缓存目录

### API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 主页 |
| `/api/data` | GET | 获取目录树和文件数据 |
| `/api/search` | GET | 搜索功能 |
| `/api/thumbnail` | GET | 获取缩略图 |
| `/api/image` | GET | 获取原图 |
| `/api/unit` | GET | 获取单个单元详情 |
| `/api/unit` | POST | 创建新单元 |
| `/api/unit` | PUT | 更新单元 |
| `/api/unit` | DELETE | 删除单元 |
| `/api/unit-with-image` | PUT | 更新单元（包含图片） |
| `/api/folder` | POST | 创建文件夹 |
| `/api/folder/rename` | PUT | 重命名文件夹 |
| `/api/folder` | DELETE | 删除文件夹 |
| `/api/health` | GET | 健康检查 |
| `/api/version` | GET | 版本信息 |

## 📈 版本更新

### v0.1 (当前版本)
- ✅ 基础功能实现
- ✅ 文件夹管理
- ✅ 图片单元管理
- ✅ 搜索功能
- ✅ 拖拽上传
- ✅ 粘贴创建
- ✅ 无限滚动加载
- ✅ 图片预览功能
- ✅ 排序功能
- ✅ 刷新功能

## 🎯 计划功能

- 🏷️ 标签系统
- ☁️ 云端同步
- 🔍 更高级的搜索功能
- 📦 批量操作优化

## 👨‍💻 作者

👤 **守望**

- Bilibili: [@苍穹殿殿主守望](https://space.bilibili.com/1284158907)
- GitHub: [@shouwang37](https://github.com/shouwang37)
- QQ: [@苍穹殿殿主守望](3356478515)

**特别感谢：**

​	群U：@[index](3568659032)和[@BillBum](1584099650) 提供的帮助

## 📄 许可证

本项目仅供个人学习和研究使用。

---