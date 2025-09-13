// 守望影神图集案器 v0.1 - 前端应用逻辑

class ImageGalleryApp {
    constructor() {
        // 动态初始化当前路径
        this.currentPath = '';
        this.folderSortType = 'name-asc';  // 文件夹排序类型
        this.contentSortType = 'name-asc'; // 内容排序类型
        this.isCreating = false;
        this.debounceTimer = null;
        // 添加分页相关属性
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
        this.allLoadedFiles = []; // 缓存已加载的文件
        this.isScrollLoading = false; // 防止重复加载
        // 添加图片预加载相关属性
        this.imageObserver = null;
        this.preloadMargin = 600; // 提前加载距离
        // 添加加载状态控制属性
        this.loadingTimeout = null; // 加载状态延迟显示的定时器
        
        // DOM 元素
        this.elements = {
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            treeView: document.getElementById('treeView'),
            cardsGrid: document.getElementById('cardsGrid'),
            currentPath: document.getElementById('currentPath'),
            folderSortSelect: document.getElementById('sortSelect'),
            contentSortSelect: document.getElementById('contentSortSelect'),
            refreshBtn: document.getElementById('refreshBtn'),
            contentArea: document.getElementById('contentArea'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            dropOverlay: document.getElementById('dropOverlay'),
            emptyState: document.getElementById('emptyState'),
            editModal: document.getElementById('editModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalImage: document.getElementById('modalImage'),
            unitNameInput: document.getElementById('unitNameInput'),
            unitValueTextarea: document.getElementById('unitValueTextarea'),
            saveBtn: document.getElementById('saveBtn'),
            // 文件夹相关元素
            newSiblingFolderBtn: document.getElementById('newSiblingFolderBtn'),
            newChildFolderBtn: document.getElementById('newChildFolderBtn'),
            folderModal: document.getElementById('folderModal'),
            folderModalTitle: document.getElementById('folderModalTitle'),
            folderNameInput: document.getElementById('folderNameInput'),
            folderSaveBtn: document.getElementById('folderSaveBtn')
        };

        this.init();
    }

    // 初始化应用
    init() {
        this.bindEvents();
        this.loadStateFromStorage();
        this.setupImageObserver(); // 设置图片观察器
        this.loadData();
        console.log('🎨 守望影神图集案器 v0.1 已启动');
        // 预加载所有缩略图（新功能）
        setTimeout(() => {
            this.preloadAllThumbnails();
        }, 2000); // 延迟2秒执行，避免影响初始加载
    }

    // 从 localStorage 加载状态
    loadStateFromStorage() {
        try {
            const savedState = localStorage.getItem('image-gallery-state');
            if (savedState) {
                const state = JSON.parse(savedState);
                // 动态加载保存的路径
                this.currentPath = state.currentPath || '';
                this.folderSortType = state.folderSortType || 'name-asc';
                this.contentSortType = state.contentSortType || 'name-asc';
                this.elements.folderSortSelect.value = this.folderSortType;
                this.elements.contentSortSelect.value = this.contentSortType;
                if (state.searchQuery) {
                    this.elements.searchInput.value = state.searchQuery;
                }
            }
        } catch (error) {
            console.log('加载状态失败，使用默认设置');
        }
    }

    // 保存状态到 localStorage
    saveStateToStorage() {
        try {
            const state = {
                currentPath: this.currentPath,
                folderSortType: this.folderSortType,
                contentSortType: this.contentSortType,
                searchQuery: this.elements.searchInput.value.trim(),
                expandedPaths: this.getExpandedPaths()
            };
            localStorage.setItem('image-gallery-state', JSON.stringify(state));
        } catch (error) {
            console.log('保存状态失败');
        }
    }

    // 获取当前展开的路径
    getExpandedPaths() {
        const expandedPaths = [];
        document.querySelectorAll('.tree-children:not(.hidden)').forEach(container => {
            const nodeEl = container.previousElementSibling;
            if (nodeEl) {
                const path = nodeEl.querySelector('.tree-node').dataset.path;
                if (path) expandedPaths.push(path);
            }
        });
        return expandedPaths;
    }

    // 绑定所有事件
    bindEvents() {
        // 搜索相关
        this.elements.searchInput.addEventListener('input', () => this.handleSearch());
        this.elements.clearSearch.addEventListener('click', () => this.clearSearch());
        
        // 排序和刷新
        this.elements.folderSortSelect.addEventListener('change', () => this.handleFolderSortChange());
        this.elements.contentSortSelect.addEventListener('change', () => this.handleContentSortChange());
        this.elements.refreshBtn.addEventListener('click', () => this.handleRefresh());
        
        // 文件夹相关按钮
        if (this.elements.newSiblingFolderBtn) {
            this.elements.newSiblingFolderBtn.addEventListener('click', () => this.handleNewSiblingFolder());
        }
        if (this.elements.newChildFolderBtn) {
            this.elements.newChildFolderBtn.addEventListener('click', () => this.handleNewChildFolder());
        }
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        // 模态框事件
        this.elements.editModal.addEventListener('click', (e) => this.handleModalClick(e));
        if (this.elements.folderModal) {
            this.elements.folderModal.addEventListener('click', (e) => this.handleFolderModalClick(e));
        }
    }

    // 设置图片观察器用于懒加载优化
    setupImageObserver() {
        // 创建 IntersectionObserver 实例
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    // 获取图片 URL
                    const imageUrl = img.dataset.src;
                    if (imageUrl) {
                        // 设置图片源
                        img.src = imageUrl;
                        // 移除观察器，避免重复加载
                        this.imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            root: this.elements.contentArea, // 使用内容区域作为根
            rootMargin: `${this.preloadMargin}px` // 提前加载距离
        });
    }

    // 搜索处理（防抖）
    handleSearch() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            const query = this.elements.searchInput.value.trim();
            this.saveStateToStorage();
            if (query) {
                this.performSearch(query);
            } else {
                this.loadData();
                // 搜索为空时也预加载缩略图
                setTimeout(() => {
                    this.preloadAllThumbnails();
                }, 1000);
            }
        }, 300);
    }

    // 清空搜索
    clearSearch() {
        this.elements.searchInput.value = '';
        this.saveStateToStorage();
        this.loadData();
        // 清除搜索结果统计信息
        this.clearSearchResultInfo();
        // 清空搜索时也预加载缩略图
        setTimeout(() => {
            this.preloadAllThumbnails();
        }, 1000);
    }

    // 处理刷新按钮点击
    handleRefresh() {
        // 重置分页相关状态
        this.currentPage = 1;
        this.hasMore = true;
        this.allLoadedFiles = [];
        this.isScrollLoading = false;
        this.loadData();
        // 刷新时也预加载缩略图
        setTimeout(() => {
            this.preloadAllThumbnails();
        }, 1000);
    }

    // 文件夹排序变化
    handleFolderSortChange() {
        this.folderSortType = this.elements.folderSortSelect.value;
        this.saveStateToStorage();
        // 修复：左边排序方式应该只影响左边菜单栏，不影响右边图片
        this.loadTreeData();
        // 排序变化时也预加载缩略图
        setTimeout(() => {
            this.preloadAllThumbnails();
        }, 1000);
    }

    // 内容排序变化
    handleContentSortChange() {
        this.contentSortType = this.elements.contentSortSelect.value;
        this.saveStateToStorage();
        // 修复：右边排序方式应该只影响右边图片，不影响左边菜单栏
        this.loadData();
        // 排序变化时也预加载缩略图
        setTimeout(() => {
            this.preloadAllThumbnails();
        }, 1000);
    }

    // 键盘事件处理
    handleKeydown(e) {
        if (e.key === 'Escape' && !this.elements.editModal.classList.contains('hidden')) {
            this.closeModal();
        }
    }

    // 粘贴事件处理
    async handlePaste(e) {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.openCreateModal(event.target.result, `新图片-${Date.now()}`);
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    }

    // 模态框点击事件
    handleModalClick(e) {
        if (e.target === this.elements.editModal) {
            this.closeModal();
        }
    }

    // 显示/隐藏加载状态
    showLoading(show) {
        // 只在需要时显示加载状态，避免频繁切换
        if (show) {
            // 添加一个微小的延迟，如果很快就完成加载就不显示加载状态
            this.loadingTimeout = setTimeout(() => {
                this.elements.loadingOverlay.classList.remove('hidden');
            }, 100); // 100ms延迟
        } else {
            // 清除延迟显示的定时器
            if (this.loadingTimeout) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = null;
            }
            // 隐藏加载状态
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }

    // 显示通知
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg z-50 transition-all duration-300 ${
            type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    // 修改loadData方法支持分页
    async loadData(page = 1, append = false) {
        if (this.isLoading && !append) return;
        // 如果是滚动加载且正在加载中，则跳过
        if (this.isScrollLoading && append) return;
        
        if (append) {
            this.isScrollLoading = true;
        } else {
            this.isLoading = true;
            // 使用延迟显示加载状态的方式
            this.showLoading(true);
            // 清除搜索结果统计信息
            this.clearSearchResultInfo();
        }
        
        // 立即更新 UI 状态（仅在非追加模式下）
        if (!append) {
            document.querySelectorAll('.tree-node.active').forEach(el => el.classList.remove('active'));
            const activeNode = document.querySelector(`[data-path="${this.currentPath}"]`);
            if (activeNode) {
                activeNode.classList.add('active');
            }
            this.updatePathDisplay();
        }
        
        try {
            // 处理API请求中的路径参数
            const apiPath = this.currentPath;
            // 修复：使用文件夹排序类型来获取目录树数据
            const response = await fetch(`/api/data?path=${encodeURIComponent(apiPath)}&page=${page}&per_page=200&sort=${this.folderSortType}`);
            if (!response.ok) throw new Error('网络请求失败');
            
            const data = await response.json();
            
            // 更新分页信息
            this.currentPage = data.pagination.page;
            this.hasMore = data.pagination.has_more;
            
            if (!append) {
                // 首次加载，渲染树结构和清空卡片
                this.renderTree(data.tree);
                this.elements.cardsGrid.innerHTML = '';
                this.allLoadedFiles = [];
            }
            
            // 添加到已加载文件列表
            this.allLoadedFiles = [...this.allLoadedFiles, ...data.files];
            
            // 渲染卡片
            this.renderCards(data.files, append);
            
            // 绑定滚动事件（仅在首次加载时）
            if (!append) {
                this.bindScrollEvent();
            }
            
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showNotification('加载数据失败，请检查服务器连接', 'error');
        } finally {
            if (append) {
                this.isScrollLoading = false;
            } else {
                this.isLoading = false;
                // 隐藏加载状态
                this.showLoading(false);
            }
        }
    }

    // 专门用于加载树形结构数据的方法
    async loadTreeData() {
        try {
            // 只获取目录树数据，不获取文件数据
            const response = await fetch(`/api/data?path=${encodeURIComponent(this.currentPath)}&page=1&per_page=1&sort=${this.folderSortType}`);
            if (!response.ok) throw new Error('网络请求失败');
            
            const data = await response.json();
            // 只渲染树结构
            this.renderTree(data.tree);
        } catch (error) {
            console.error('加载目录树数据失败:', error);
            this.showNotification('加载目录树数据失败，请检查服务器连接', 'error');
        }
    }

    // 无阻塞的数据加载方法（用于导航优化）
    loadDataWithoutBlocking() {
        // 使用setTimeout将数据加载放到下一个事件循环中，避免阻塞UI
        setTimeout(() => {
            this.loadData();
        }, 0);
    }

    // 预加载所有缩略图到缓存（优化版本）
    async preloadAllThumbnails() {
        try {
            // 获取当前目录下的所有文件
            const response = await fetch(`/api/data?path=${encodeURIComponent(this.currentPath)}&page=1&per_page=1000&sort=${this.contentSortType}`);
            if (!response.ok) throw new Error('网络请求失败');
            
            const data = await response.json();
            const files = data.files;
            
            // 创建预加载图片数组
            const preloadImages = [];
            
            // 限制同时预加载的图片数量，避免过多并发请求
            const maxConcurrent = 20;  // 增加并发数量从10到20
            let loadedCount = 0;
            
            // 分批预加载图片
            for (let i = 0; i < files.length; i += maxConcurrent) {
                const batch = files.slice(i, i + maxConcurrent);
                const batchPromises = batch.map(file => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            loadedCount++;
                            resolve();
                        };
                        img.onerror = () => {
                            loadedCount++;
                            resolve(); // 即使出错也继续
                        };
                        img.src = `/api/thumbnail?path=${encodeURIComponent(file.path)}`;
                    });
                });
                
                // 等待这一批图片加载完成
                await Promise.all(batchPromises);
            }
            
            console.log(`预加载了 ${loadedCount} 张缩略图`);
        } catch (error) {
            console.error('预加载缩略图失败:', error);
        }
    }

    // 修改搜索功能以支持分页
    async performSearch(query) {
        // 搜索时禁用分页，一次性加载所有结果
        this.showLoading(true);
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('搜索请求失败');
            
            const results = await response.json();
            // 搜索结果不分页，直接显示所有匹配的文件
            this.renderCards(results.filter(item => !item.is_dir), false);
            
            // 显示搜索结果统计信息
            const resultCount = results.filter(item => !item.is_dir).length;
            this.showSearchResultInfo(query, resultCount);
        } catch (error) {
            console.error('搜索失败:', error);
            this.showNotification('搜索失败，请稍后重试', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 显示搜索结果统计信息
    showSearchResultInfo(query, count) {
        const toolbar = document.querySelector('.flex.justify-between.items-center.p-4.bg-slate-900.border-b.border-slate-700');
        if (!toolbar) return;
        
        // 移除已存在的统计信息
        const existingInfo = document.getElementById('searchResultInfo');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        // 创建新的统计信息元素
        const infoElement = document.createElement('div');
        infoElement.id = 'searchResultInfo';
        infoElement.className = 'text-sm text-slate-400';
        infoElement.textContent = `与"${query}"相关的图像共计${count}张`;
        
        // 将统计信息插入到排序选择框的左侧
        const sortSelect = document.getElementById('contentSortSelect');
        if (sortSelect && sortSelect.parentNode) {
            sortSelect.parentNode.parentNode.insertBefore(infoElement, sortSelect.parentNode);
        }
    }

    // 清空搜索结果统计信息
    clearSearchResultInfo() {
        const infoElement = document.getElementById('searchResultInfo');
        if (infoElement) {
            infoElement.remove();
        }
    }

    // 修改renderCards方法支持追加
    renderCards(files, append = false) {
        if (!append) {
            this.elements.cardsGrid.innerHTML = '';
        }
        
        if (files.length === 0 && !append) {
            this.elements.emptyState.classList.remove('hidden');
            return;
        }
        
        this.elements.emptyState.classList.add('hidden');
        
        // 排序文件
        files.sort((a, b) => {
            switch (this.contentSortType) {
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                case 'date-desc': return b.modified - a.modified;
                case 'date-asc': return a.modified - b.modified;
                default: return 0;
            }
        });

        // 直接创建包含缩略图的卡片
        const fragment = document.createDocumentFragment();
        files.forEach((file) => {
            const card = this.createCardWithThumbnail(file);
            fragment.appendChild(card);
        });
        this.elements.cardsGrid.appendChild(fragment);
        
        // 观察所有新添加的图片元素
        if (this.imageObserver) {
            this.elements.cardsGrid.querySelectorAll('.unit-image:not([src])').forEach(img => {
                this.imageObserver.observe(img);
            });
        }
    }

    // 编辑单元
    async editUnit(path) {
        this.isCreating = false;
        this.currentEditPath = path; // 保存当前编辑的路径
        try {
            const response = await fetch(`/api/unit?path=${encodeURIComponent(path)}`);
            if (!response.ok) throw new Error('获取单元数据失败');
            
            const data = await response.json();

            this.elements.modalTitle.textContent = '编辑单元';
            this.elements.modalImage.src = `/api/thumbnail?path=${encodeURIComponent(path)}`;
            this.elements.unitNameInput.value = data.name;
            this.elements.unitValueTextarea.value = data.value;
            
            this.elements.saveBtn.onclick = () => this.saveUnit(path);
            this.elements.editModal.classList.remove('hidden');
            
            // 为编辑模态框添加拖拽和粘贴事件监听器
            this.addEditModalEventListeners();
        } catch (error) {
            console.error('编辑单元失败:', error);
            this.showNotification('编辑单元失败', 'error');
        }
    }
    
    // 为编辑模态框添加事件监听器
    addEditModalEventListeners() {
        // 移除之前可能添加的事件监听器，避免重复绑定
        this.elements.modalImage.removeEventListener('dragover', this.handleEditModalDragOver);
        this.elements.modalImage.removeEventListener('drop', this.handleEditModalDrop);
        document.removeEventListener('paste', this.handleEditModalPaste);
        
        // 绑定新的事件监听器
        this.elements.modalImage.addEventListener('dragover', this.handleEditModalDragOver);
        this.elements.modalImage.addEventListener('drop', (e) => this.handleEditModalDrop(e));
        document.addEventListener('paste', (e) => this.handleEditModalPaste(e));
    }
    
    // 处理编辑模态框的拖拽事件
    handleEditModalDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        // 添加视觉反馈
        event.target.classList.add('drag-over');
    }
    
    // 处理编辑模态框的拖放事件
    handleEditModalDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // 移除视觉反馈
        event.target.classList.remove('drag-over');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // 更新模态框中的预览图片
                    app.elements.modalImage.src = e.target.result;
                    // 保存新图片数据，用于保存时更新
                    app.newImageBase64 = e.target.result;
                    app.showNotification('图片已更新，保存后生效');
                };
                reader.readAsDataURL(file);
            } else {
                app.showNotification('请拖放图片文件', 'error');
            }
        }
    }
    
    // 处理编辑模态框的粘贴事件
    handleEditModalPaste(event) {
        // 只在编辑模态框打开时处理粘贴事件
        if (!this.elements.editModal.classList.contains('hidden')) {
            const items = event.clipboardData.items;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        // 更新模态框中的预览图片
                        this.elements.modalImage.src = e.target.result;
                        // 保存新图片数据，用于保存时更新
                        this.newImageBase64 = e.target.result;
                        this.showNotification('图片已更新，保存后生效');
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            }
        }
    }

    // 复制单元内容到剪贴板
    async copyUnit(path) {
        try {
            const response = await fetch(`/api/unit?path=${encodeURIComponent(path)}`);
            if (!response.ok) throw new Error('获取单元数据失败');
            
            const data = await response.json();
            await navigator.clipboard.writeText(data.value);
            this.showNotification('已复制到剪贴板!');
        } catch (error) {
            console.error('复制失败:', error);
            this.showNotification('复制失败', 'error');
        }
    }

    // 删除单元
    async deleteUnit(path) {
        if (!confirm('确定要删除此单元吗？此操作不可逆。')) return;

        this.showLoading(true);
        try {
            const response = await fetch(`/api/unit?path=${encodeURIComponent(path)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('删除成功');
                this.loadData();
            } else {
                const error = await response.json();
                throw new Error(error.error);
            }
        } catch (error) {
            console.error('删除失败:', error);
            this.showNotification('删除失败: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 保存单元
    async saveUnit(oldPath) {
        const newName = this.elements.unitNameInput.value.trim();
        const newValue = this.elements.unitValueTextarea.value.trim();
        
        if (!newName) {
            this.showNotification('单元名不能为空', 'error');
            return;
        }

        this.showLoading(true);
        try {
            let payload;
            
            // 检查是否有新的图片数据需要更新
            if (this.newImageBase64) {
                // 如果有新图片，需要同时更新图片和文本
                payload = {
                    old_path: oldPath,
                    new_name: newName,
                    new_value: newValue,
                    new_image_data: this.newImageBase64.split(',')[1] // 移除data:image前缀
                };
            } else {
                // 如果没有新图片，只更新文本
                payload = {
                    old_path: oldPath,
                    new_name: newName,
                    new_value: newValue
                };
            }

            const response = await fetch('/api/unit-with-image', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                this.showNotification('保存成功');
                this.closeModal();
                // 清除临时图片数据
                this.newImageBase64 = null;
                this.loadData();
            } else {
                const error = await response.json();
                throw new Error(error.error);
            }
        } catch (error) {
            console.error('保存失败:', error);
            this.showNotification('保存失败: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 创建新单元
    async saveNewUnit(base64Image) {
        const newName = this.elements.unitNameInput.value.trim();
        const newValue = this.elements.unitValueTextarea.value.trim();
        
        if (!newName) {
            this.showNotification('单元名不能为空', 'error');
            return;
        }

        this.showLoading(true);
        try {
            const payload = {
                path: this.currentPath,
                name: newName,
                value: newValue,
                image_data: base64Image.split(',')[1] // 移除data:image前缀
            };

            const response = await fetch('/api/unit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                this.showNotification('创建成功');
                this.closeModal();
                this.loadData();
            } else {
                const error = await response.json();
                throw new Error(error.error);
            }
        } catch (error) {
            console.error('创建失败:', error);
            this.showNotification('创建失败: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 打开创建模态框
    openCreateModal(base64Image, initialName) {
        this.isCreating = true;
        this.elements.modalTitle.textContent = '创建新单元';
        this.elements.modalImage.src = base64Image;
        this.elements.unitNameInput.value = initialName;
        this.elements.unitValueTextarea.value = '';
        
        this.elements.saveBtn.onclick = () => this.saveNewUnit(base64Image);
        this.elements.editModal.classList.remove('hidden');
    }

    // 关闭模态框
    closeModal() {
        this.elements.editModal.classList.add('hidden');
    }

    // 渲染目录树
    renderTree(tree) {
        // 保存当前展开状态
        let expandedPaths = new Set();
        
        // 从当前 DOM 获取展开状态
        document.querySelectorAll('.tree-children:not(.hidden)').forEach(container => {
            const nodeEl = container.previousElementSibling;
            if (nodeEl) {
                const path = nodeEl.querySelector('.tree-node').dataset.path;
                if (path) expandedPaths.add(path);
            }
        });
        
        // 如果没有当前展开状态，尝试从 localStorage 获取
        if (expandedPaths.size === 0) {
            try {
                const savedState = localStorage.getItem('image-gallery-state');
                if (savedState) {
                    const state = JSON.parse(savedState);
                    if (state.expandedPaths) {
                        expandedPaths = new Set(state.expandedPaths);
                    }
                }
            } catch (error) {
                console.log('加载展开状态失败');
            }
        }
        
        this.elements.treeView.innerHTML = '';
        tree.forEach(node => {
            this.elements.treeView.appendChild(this.createTreeNode(node, 0));
        });
        
        // 恢复展开状态
        expandedPaths.forEach(path => {
            const nodeEl = document.querySelector(`[data-path="${path}"]`);
            if (nodeEl) {
                const container = nodeEl.closest('.tree-node-container');
                const childContainer = container?.querySelector('.tree-children');
                const arrow = nodeEl.querySelector('.tree-arrow');
                
                if (childContainer) {
                    childContainer.classList.remove('hidden');
                    if (arrow) {
                        arrow.classList.add('expanded');
                    }
                }
            }
        });
        
        // 更新选中状态
        if (this.currentPath) {
            const activeNode = document.querySelector(`[data-path="${this.currentPath}"]`);
            if (activeNode) {
                document.querySelectorAll('.tree-node.active').forEach(el => el.classList.remove('active'));
                activeNode.classList.add('active');
            }
        }
    }

    // 创建树节点
    createTreeNode(node, level) {
        const nodeEl = document.createElement('div');
        const hasChildren = node.children && node.children.length > 0;
        // 动态判断活跃状态
        const isActive = this.currentPath === node.path;
        
        // 创建节点容器
        const nodeContainer = document.createElement('div');
        nodeContainer.className = 'tree-node-container';
        
        nodeEl.innerHTML = `
            <div class="tree-node ${isActive ? 'active' : ''}" 
                 style="padding-left: ${level * 16 + 12}px" 
                 data-path="${node.path}">
                <span class="mr-2">📁</span>
                <span class="text-sm truncate">${this.escapeHtml(node.name)}</span>
            </div>
        `;

        const nodeContent = nodeEl.querySelector('.tree-node');
        
        // 为整个节点添加点击事件（处理展开/收纳和路径导航）
        nodeContent.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 立即更新 UI 状态，给用户反馈
            document.querySelectorAll('.tree-node.active').forEach(el => el.classList.remove('active'));
            nodeContent.classList.add('active');
            
            // 收纳同级别的其他菜单
            this.collapseSiblingMenus(nodeContainer, level);
            
            if (hasChildren) {
                // 查找子菜单容器
                const childContainer = nodeContainer.querySelector('.tree-children');
                
                if (childContainer) {
                    const isExpanded = !childContainer.classList.contains('hidden');
                    
                    // 切换当前菜单的展开/收纳状态
                    if (isExpanded) {
                        // 收纳当前菜单
                        childContainer.classList.add('hidden');
                    } else {
                        // 展开当前菜单
                        childContainer.classList.remove('hidden');
                    }
                    
                    this.saveStateToStorage(); // 保存展开状态
                }
            }
            
            // 更新路径和状态（即使没有子菜单也要更新路径）
            this.currentPath = node.path;
            this.saveStateToStorage();
            
            // 显示加载状态但不阻塞UI
            this.showLoading(false); // 先隐藏可能存在的加载状态
            // 简单直接的数据加载
            this.loadDataWithoutBlocking();
        });

        // 添加双击事件用于重命名（覆盖整个节点区域）
        nodeContent.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.renameFolder(node.path, node.name);
        });
        
        // 添加键盘事件监听器用于删除功能（覆盖整个节点区域）
        nodeContent.addEventListener('keydown', (e) => {
            // 检查是否按下了Delete键
            if (e.key === 'Delete' || e.keyCode === 46) {
                e.preventDefault();
                e.stopPropagation();
                this.deleteFolder(node.path, node.name);
            }
        });
        
        // 让节点可以获得焦点，以便接收键盘事件
        nodeContent.setAttribute('tabindex', '0');
        
        // 添加右键菜单事件（覆盖整个节点区域）
        nodeContent.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, node.path, node.name, hasChildren);
        });
        
        // 添加焦点事件，确保节点在获得焦点时的可见性
        nodeContent.addEventListener('focus', () => {
            nodeContent.classList.add('focused');
        });
        
        nodeContent.addEventListener('blur', () => {
            nodeContent.classList.remove('focused');
        });

        nodeContainer.appendChild(nodeEl);

        // 如果有子节点，创建子节点容器（默认隐藏）
        if (hasChildren) {
            const childContainer = document.createElement('div');
            childContainer.className = 'tree-children hidden';
            
            node.children.forEach(child => {
                childContainer.appendChild(this.createTreeNode(child, level + 1));
            });
            
            nodeContainer.appendChild(childContainer);
        }

        return nodeContainer;
    }

    // 收纳同级别的其他展开菜单
    collapseSiblingMenus(currentContainer, currentLevel) {
        // 获取当前容器的父容器
        const parentContainer = currentContainer.parentElement;
        if (!parentContainer) return;
        
        // 查找所有同级别的节点容器
        const siblingContainers = Array.from(parentContainer.children).filter(child => 
            child.classList.contains('tree-node-container') && child !== currentContainer
        );
        
        // 遍历同级别节点，收纳它们的子菜单
        siblingContainers.forEach(container => {
            const childrenContainer = container.querySelector('.tree-children');
            
            if (childrenContainer && !childrenContainer.classList.contains('hidden')) {
                childrenContainer.classList.add('hidden');
            }
        });
    }

    // 更新路径显示
    updatePathDisplay() {
        // 动态显示当前路径
        const pathParts = this.currentPath ? this.currentPath.split('/') : [];
        let pathHtml = 'images / ';
        
        pathParts.forEach((part, index) => {
            const fullPath = pathParts.slice(0, index + 1).join('/');
            pathHtml += `<a href="#" onclick="app.navigateToPath('${fullPath}')" class="hover:text-blue-400 transition-colors">${this.escapeHtml(part)}</a> / `;
        });

        this.elements.currentPath.innerHTML = pathHtml;
        
        // 添加一个微小的延迟来确保DOM更新完成
        setTimeout(() => {
            // 触发一个自定义事件表示路径显示已更新
            this.elements.currentPath.dispatchEvent(new CustomEvent('pathUpdated'));
        }, 0);
    }

    // 导航到指定路径
    navigateToPath(path) {
        // 动态导航到指定路径
        this.currentPath = path;
        this.saveStateToStorage();
        // 重置分页相关状态
        this.currentPage = 1;
        this.hasMore = true;
        this.allLoadedFiles = [];
        this.isScrollLoading = false;
        
        // 立即更新 UI 状态，给用户反馈
        document.querySelectorAll('.tree-node.active').forEach(el => el.classList.remove('active'));
        const activeNode = document.querySelector(`[data-path="${this.currentPath}"]`);
        if (activeNode) {
            activeNode.classList.add('active');
        }
        this.updatePathDisplay();
        
        // 清空卡片区域但不显示全局加载状态
        this.elements.cardsGrid.innerHTML = '';
        this.allLoadedFiles = [];
        
        // 使用无阻塞方式加载数据
        this.loadDataWithoutBlocking();
        
        // 导航时也预加载缩略图
        setTimeout(() => {
            this.preloadAllThumbnails();
        }, 500); // 缩短延迟时间
    }

    // 创建包含缩略图的卡片
    createCardWithThumbnail(file) {
        const card = document.createElement('div');
        card.className = 'unit-card';
        card.dataset.path = file.path;
        
        // 使用预生成的缩略图 URL
        const thumbnailUrl = `/api/thumbnail?path=${encodeURIComponent(file.path)}`;
        
        card.innerHTML = `
            <div class="unit-name">${this.escapeHtml(file.name)}</div>
            <div class="image-container" style="position: relative; width: 220px; height: 264px; background-color: #1f2937;">
                <img class="unit-image" 
                     data-src="${thumbnailUrl}" 
                     alt="${this.escapeHtml(file.name)}"
                     loading="lazy"
                     decoding="async"
                     style="width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.3s ease;"
                     onload="this.style.opacity='1'; this.nextElementSibling.style.display='none';"
                     onerror="app.handleImageError(this, '${thumbnailUrl}');">
                <div class="error-placeholder" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ef4444; font-size: 12px; background: rgba(239, 68, 68, 0.1); border: 2px dashed rgba(239, 68, 68, 0.3); border-radius: 8px; margin: 4px; display: none;">
                    <svg class="w-8 h-8 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <span class="text-xs text-red-400 mb-2">图片加载失败</span>
                    <button class="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-600/20 rounded hover:bg-blue-600/30 transition-colors" 
                            onclick="app.retryImageLoad(this, '${thumbnailUrl}')">重新加载</button>
                </div>
            </div>
            <div class="unit-value" title="${this.escapeHtml(file.value)}">${this.escapeHtml(file.value)}</div>
            <div class="unit-actions">
                <button class="text-blue-400 hover:text-blue-300 text-xs font-medium" 
                        onclick="app.editUnit('${file.path}')">编辑</button>
                <button class="text-red-400 hover:text-red-300 text-xs font-medium" 
                        onclick="app.deleteUnit('${file.path}')">删除</button>
                <button class="text-green-400 hover:text-green-300 text-xs font-medium" 
                        onclick="app.copyUnit('${file.path}')">复制</button>
                <button class="preview-btn" 
                        onclick="app.openImagePreview('${file.path}')">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                </button>
            </div>
        `;
        return card;
    }

    // 打开图片预览
    openImagePreview(imagePath) {
        // 使用API路径获取原图，而不是缩略图
        const originalImageUrl = `/api/image?path=${encodeURIComponent(imagePath)}`;
        
        // 创建预览模态框
        const previewModal = document.createElement('div');
        previewModal.className = 'preview-modal';
        
        // 创建图片元素并添加加载处理
        const previewImage = document.createElement('img');
        previewImage.className = 'preview-image';
        previewImage.alt = '预览';
        previewImage.style.opacity = '0';
        previewImage.style.transition = 'opacity 0.3s ease';
        
        // 图片加载成功后显示并设置放大效果
        previewImage.onload = () => {
            previewImage.style.opacity = '1';
            // 设置2.5倍放大效果
            previewImage.style.transform = 'scale(2.5)';
        };
        
        // 图片加载失败处理
        previewImage.onerror = () => {
            previewImage.src = `/api/thumbnail?path=${encodeURIComponent(imagePath)}`;
            previewImage.style.transform = 'scale(2.5)';
        };
        
        previewImage.src = originalImageUrl;
        previewModal.appendChild(previewImage);
        
        // 点击关闭预览
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                document.body.removeChild(previewModal);
                document.removeEventListener('keydown', handleEsc);
            }
        });
        
        // ESC键关闭预览
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(previewModal);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        document.body.appendChild(previewModal);
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 获取安全的文件名（移除不安全字符）
    getSafeFilename(filename) {
        // 移除或替换不安全的字符
        let safeName = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        // 移除控制字符
        safeName = safeName.replace(/[\x00-\x1f]/g, '');
        // 限制文件名长度
        if (safeName.length > 100) {
            safeName = safeName.substring(0, 100);
        }
        return safeName.trim() || '未命名文件夹';
    }
    
    // 处理图片加载错误
    handleImageError(imgElement, originalUrl) {
        imgElement.style.display = 'none';
        const errorPlaceholder = imgElement.nextElementSibling;
        if (errorPlaceholder && errorPlaceholder.classList.contains('error-placeholder')) {
            errorPlaceholder.style.display = 'flex';
        }
    }
    
    // 重试图片加载
    retryImageLoad(buttonElement, originalUrl) {
        const errorPlaceholder = buttonElement.closest('.error-placeholder');
        const imgElement = errorPlaceholder.previousElementSibling;
        
        errorPlaceholder.style.display = 'none';
        imgElement.style.display = 'block';
        imgElement.style.opacity = '0';
        
        const newUrl = originalUrl + (originalUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        imgElement.src = newUrl;
    }
    
    // 绑定滚动事件实现无限滚动
    bindScrollEvent() {
        const contentArea = this.elements.contentArea;
        
        // 移除之前可能绑定的事件监听器
        if (this.scrollHandler) {
            contentArea.removeEventListener('scroll', this.scrollHandler);
        }
        
        // 定义新的滚动处理函数
        this.scrollHandler = () => {
            // 检查是否滚动到底部（提前200px开始加载，从100增加到200）
            if (contentArea.scrollTop + contentArea.clientHeight >= contentArea.scrollHeight - 200) {
                if (this.hasMore && !this.isScrollLoading && !this.isLoading) {
                    this.loadData(this.currentPage + 1, true);
                }
            }
        };
        
        // 绑定新的事件监听器
        contentArea.addEventListener('scroll', this.scrollHandler);
    }

    // 处理新建同级文件夹
    handleNewSiblingFolder() {
        // 获取当前路径的父路径
        const parentPath = this.getParentPath(this.currentPath);
        this.openFolderModal('新建同级文件夹', parentPath);
    }

    // 处理新建子级文件夹
    handleNewChildFolder() {
        // 在当前路径下创建子文件夹
        this.openFolderModal('新建子级文件夹', this.currentPath);
    }

    // 获取父路径
    getParentPath(path) {
        if (!path) return '';
        const parts = path.split('/');
        parts.pop();
        return parts.join('/');
    }

    // 打开文件夹模态框
    openFolderModal(title, parentPath) {
        this.folderParentPath = parentPath;
        this.folderMode = 'create';
        this.elements.folderModalTitle.textContent = title;
        this.elements.folderNameInput.value = '';
        this.elements.folderSaveBtn.onclick = () => this.saveFolder();
        this.elements.folderModal.classList.remove('hidden');
        this.elements.folderNameInput.focus();
    }

    // 保存文件夹
    async saveFolder() {
        const folderName = this.elements.folderNameInput.value.trim();
        
        if (!folderName) {
            this.showNotification('文件夹名称不能为空', 'error');
            return;
        }

        // 获取安全的文件名
        const safeFolderName = this.getSafeFilename(folderName);

        this.showLoading(true);
        try {
            // 发送请求创建文件夹
            const response = await fetch('/api/folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parent_path: this.folderParentPath,
                    name: safeFolderName
                })
            });

            // 检查响应是否为JSON格式
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('文件夹创建成功');
                    this.closeFolderModal();
                    this.loadData(); // 重新加载数据
                } else {
                    const error = await response.json();
                    throw new Error(error.error || '创建文件夹失败');
                }
            } else {
                // 如果响应不是JSON格式，可能是服务器错误页面
                const text = await response.text();
                throw new Error(`服务器返回错误: ${text.substring(0, 100)}...`);
            }
        } catch (error) {
            console.error('创建文件夹失败:', error);
            this.showNotification('创建文件夹失败: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 关闭文件夹模态框
    closeFolderModal() {
        this.elements.folderModal.classList.add('hidden');
    }

    // 文件夹模态框点击事件
    handleFolderModalClick(e) {
        if (e.target === this.elements.folderModal) {
            this.closeFolderModal();
        }
    }

    // 重命名文件夹
    renameFolder(path, currentName) {
        this.folderMode = 'rename';
        this.folderOldPath = path;
        this.elements.folderModalTitle.textContent = '重命名文件夹';
        this.elements.folderNameInput.value = currentName;
        this.elements.folderSaveBtn.onclick = () => this.saveFolderRename(path);
        this.elements.folderModal.classList.remove('hidden');
        this.elements.folderNameInput.focus();
    }

    // 删除文件夹
    async deleteFolder(path, name) {
        if (!confirm(`确定要删除文件夹 "${name}" 吗？此操作不可逆，将删除该文件夹及其所有内容。`)) {
            return;
        }

        this.showLoading(true);
        try {
            // 发送请求删除文件夹
            const response = await fetch('/api/folder', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: path
                })
            });

            // 检查响应是否为JSON格式
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('文件夹删除成功');
                    // 如果当前路径是被删除的文件夹或其子文件夹，需要导航到父文件夹
                    if (this.currentPath === path || this.currentPath.startsWith(path + '/')) {
                        // 导航到父文件夹
                        const pathParts = path.split('/');
                        pathParts.pop();
                        this.currentPath = pathParts.join('/');
                    }
                    this.loadData(); // 重新加载数据
                } else {
                    const error = await response.json();
                    throw new Error(error.error || '删除文件夹失败');
                }
            } else {
                // 如果响应不是JSON格式，可能是服务器错误页面
                const text = await response.text();
                throw new Error(`服务器返回错误: ${text.substring(0, 100)}...`);
            }
        } catch (error) {
            console.error('删除文件夹失败:', error);
            this.showNotification('删除文件夹失败: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 保存文件夹重命名
    async saveFolderRename(oldPath) {
        const newName = this.elements.folderNameInput.value.trim();
        
        if (!newName) {
            this.showNotification('文件夹名称不能为空', 'error');
            return;
        }

        // 获取安全的文件名
        const safeNewName = this.getSafeFilename(newName);

        // 获取旧路径的父路径和新路径
        const pathParts = oldPath.split('/');
        const oldName = pathParts.pop();
        const parentPath = pathParts.join('/');
        const newPath = parentPath ? `${parentPath}/${safeNewName}` : safeNewName;

        // 如果名称没有改变，直接关闭模态框
        if (oldName === safeNewName) {
            this.closeFolderModal();
            return;
        }

        this.showLoading(true);
        try {
            // 发送请求重命名文件夹
            const response = await fetch('/api/folder/rename', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    old_path: oldPath,
                    new_path: newPath
                })
            });

            // 检查响应是否为JSON格式
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                if (response.ok) {
                    const result = await response.json();
                    this.showNotification('文件夹重命名成功');
                    this.closeFolderModal();
                    // 如果当前路径是被重命名的文件夹或其子文件夹，需要更新当前路径
                    if (this.currentPath === oldPath || this.currentPath.startsWith(oldPath + '/')) {
                        this.currentPath = this.currentPath.replace(oldPath, newPath);
                    }
                    this.loadData(); // 重新加载数据
                } else {
                    const error = await response.json();
                    throw new Error(error.error || '重命名文件夹失败');
                }
            } else {
                // 如果响应不是JSON格式，可能是服务器错误页面
                const text = await response.text();
                throw new Error(`服务器返回错误: ${text.substring(0, 100)}...`);
            }
        } catch (error) {
            console.error('重命名文件夹失败:', error);
            this.showNotification('重命名文件夹失败: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 显示上下文菜单
    showContextMenu(event, path, name, hasChildren) {
        // 创建上下文菜单
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.position = 'absolute';
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        contextMenu.style.backgroundColor = '#1e293b';
        contextMenu.style.border = '1px solid #334155';
        contextMenu.style.borderRadius = '4px';
        contextMenu.style.padding = '4px 0';
        contextMenu.style.zIndex = '1000';
        contextMenu.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        contextMenu.style.minWidth = '120px';
        
        // 添加重命名选项
        const renameItem = document.createElement('div');
        renameItem.className = 'context-menu-item';
        renameItem.style.padding = '8px 12px';
        renameItem.style.cursor = 'pointer';
        renameItem.style.fontSize = '14px';
        renameItem.textContent = '重命名';
        renameItem.addEventListener('click', () => {
            this.renameFolder(path, name);
            document.body.removeChild(contextMenu);
        });
        renameItem.addEventListener('mouseenter', () => {
            renameItem.style.backgroundColor = '#334155';
        });
        renameItem.addEventListener('mouseleave', () => {
            renameItem.style.backgroundColor = '';
        });
        contextMenu.appendChild(renameItem);
        
        // 添加删除选项
        const deleteItem = document.createElement('div');
        deleteItem.className = 'context-menu-item';
        deleteItem.style.padding = '8px 12px';
        deleteItem.style.cursor = 'pointer';
        deleteItem.style.fontSize = '14px';
        deleteItem.textContent = '删除';
        deleteItem.addEventListener('click', () => {
            this.deleteFolder(path, name);
            document.body.removeChild(contextMenu);
        });
        deleteItem.addEventListener('mouseenter', () => {
            deleteItem.style.backgroundColor = '#334155';
        });
        deleteItem.addEventListener('mouseleave', () => {
            deleteItem.style.backgroundColor = '';
        });
        contextMenu.appendChild(deleteItem);
        
        // 添加新建子文件夹选项（如果有子菜单）
        if (hasChildren) {
            const separator = document.createElement('div');
            separator.style.height = '1px';
            separator.style.backgroundColor = '#334155';
            separator.style.margin = '4px 0';
            contextMenu.appendChild(separator);
            
            const newChildItem = document.createElement('div');
            newChildItem.className = 'context-menu-item';
            newChildItem.style.padding = '8px 12px';
            newChildItem.style.cursor = 'pointer';
            newChildItem.style.fontSize = '14px';
            newChildItem.textContent = '新建子文件夹';
            newChildItem.addEventListener('click', () => {
                this.openFolderModal('新建子级文件夹', path);
                document.body.removeChild(contextMenu);
            });
            newChildItem.addEventListener('mouseenter', () => {
                newChildItem.style.backgroundColor = '#334155';
            });
            newChildItem.addEventListener('mouseleave', () => {
                newChildItem.style.backgroundColor = '';
            });
            contextMenu.appendChild(newChildItem);
        }
        
        // 添加到页面
        document.body.appendChild(contextMenu);
        
        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                document.body.removeChild(contextMenu);
                document.removeEventListener('click', closeMenu);
            }
        };
        
        // 等一帧再添加事件监听器，避免立即触发
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }
}

// 拖拽处理函数
function allowDrop(event) {
    event.preventDefault();
    document.getElementById('dropOverlay').classList.remove('hidden');
    document.getElementById('dropOverlay').classList.add('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    document.getElementById('dropOverlay').classList.add('hidden');
    document.getElementById('dropOverlay').classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                app.openCreateModal(e.target.result, file.name.split('.')[0]);
            };
            reader.readAsDataURL(file);
        } else {
            app.showNotification('请拖放图片文件', 'error');
        }
    }
}

function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        document.getElementById('dropOverlay').classList.add('hidden');
        document.getElementById('dropOverlay').classList.remove('dragover');
    }
}

// 关闭模态框的全局函数
function closeModal() {
    app.closeModal();
}

// 关闭文件夹模态框的全局函数
function closeFolderModal() {
    app.closeFolderModal();
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ImageGalleryApp();
});