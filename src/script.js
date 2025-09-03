// 守望影神图集案器 v0.1 - 前端应用逻辑

class ImageGalleryApp {
    constructor() {
        // 动态初始化当前路径
        this.currentPath = '';
        this.sortType = 'name-asc';
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
        this.preloadMargin = 300; // 提前加载距离
        
        // DOM 元素
        this.elements = {
            searchInput: document.getElementById('searchInput'),
            clearSearch: document.getElementById('clearSearch'),
            treeView: document.getElementById('treeView'),
            cardsGrid: document.getElementById('cardsGrid'),
            currentPath: document.getElementById('currentPath'),
            sortSelect: document.getElementById('sortSelect'),
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
    }

    // 从 localStorage 加载状态
    loadStateFromStorage() {
        try {
            const savedState = localStorage.getItem('image-gallery-state');
            if (savedState) {
                const state = JSON.parse(savedState);
                // 动态加载保存的路径
                this.currentPath = state.currentPath || '';
                this.sortType = state.sortType || 'name-asc';
                this.elements.sortSelect.value = this.sortType;
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
                sortType: this.sortType,
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
        this.elements.sortSelect.addEventListener('change', () => this.handleSortChange());
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
            }
        }, 300);
    }

    // 清空搜索
    clearSearch() {
        this.elements.searchInput.value = '';
        this.saveStateToStorage();
        this.loadData();
    }

    // 处理刷新按钮点击
    handleRefresh() {
        // 重置分页相关状态
        this.currentPage = 1;
        this.hasMore = true;
        this.allLoadedFiles = [];
        this.isScrollLoading = false;
        this.loadData();
    }

    // 排序变化
    handleSortChange() {
        this.sortType = this.elements.sortSelect.value;
        this.saveStateToStorage();
        this.loadData();
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
        this.elements.loadingOverlay.classList.toggle('hidden', !show);
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
            this.showLoading(true);
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
            const response = await fetch(`/api/data?path=${encodeURIComponent(apiPath)}&page=${page}&per_page=50`);
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
                this.showLoading(false);
            }
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
        } catch (error) {
            console.error('搜索失败:', error);
            this.showNotification('搜索失败', 'error');
        } finally {
            this.showLoading(false);
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
            switch (this.sortType) {
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
        } catch (error) {
            console.error('编辑单元失败:', error);
            this.showNotification('编辑单元失败', 'error');
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
            const payload = {
                old_path: oldPath,
                new_name: newName,
                new_value: newValue
            };

            const response = await fetch('/api/unit', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                this.showNotification('保存成功');
                this.closeModal();
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
                ${hasChildren ? 
                    '<svg class="tree-arrow w-3 h-3 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' :
                    '<span class="w-3 h-3 mr-1"></span>'
                }
                <span class="mr-2">📁</span>
                <span class="text-sm truncate">${this.escapeHtml(node.name)}</span>
            </div>
        `;

        const nodeContent = nodeEl.querySelector('.tree-node');
        const arrow = nodeContent.querySelector('.tree-arrow');
        
        // 为箭头添加单独的点击事件（仅处理展开/收纳）
        if (arrow) {
            arrow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const childContainer = nodeContainer.querySelector('.tree-children');
                
                if (childContainer) {
                    const isExpanded = !childContainer.classList.contains('hidden');
                    
                    if (isExpanded) {
                        // 收纳当前菜单
                        childContainer.classList.add('hidden');
                        arrow.classList.remove('expanded');
                    } else {
                        // 先收纳同级别的其他菜单，然后展开当前菜单
                        this.collapseSiblingMenus(nodeContainer, level);
                        childContainer.classList.remove('hidden');
                        arrow.classList.add('expanded');
                    }
                    
                    this.saveStateToStorage(); // 保存展开状态
                }
            });
        }
        
        // 为整个节点添加点击事件（处理路径导航并自动展开子菜单）
        nodeContent.addEventListener('click', (e) => {
            // 如果点击的是箭头，不处理导航
            if (e.target.closest('.tree-arrow')) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            // 立即更新 UI 状态，给用户反馈
            document.querySelectorAll('.tree-node.active').forEach(el => el.classList.remove('active'));
            nodeContent.classList.add('active');
            
            // 先收纳同级别的其他展开菜单
            this.collapseSiblingMenus(nodeContainer, level);
            
            // 如果有子菜单，自动展开
            if (hasChildren) {
                const childContainer = nodeContainer.querySelector('.tree-children');
                if (childContainer && childContainer.classList.contains('hidden')) {
                    childContainer.classList.remove('hidden');
                    if (arrow) {
                        arrow.classList.add('expanded');
                    }
                }
            }
            
            // 更新路径和状态
            this.currentPath = node.path;
            this.saveStateToStorage();
            
            // 简单直接的数据加载
            this.loadData();
        });

        // 添加双击事件用于重命名
        nodeContent.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.renameFolder(node.path, node.name);
        });

        nodeContainer.appendChild(nodeEl);

        // 如果有子节点，创建子节点容器
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
        // 获取父容器
        const parentContainer = currentContainer.parentElement;
        if (!parentContainer) return;
        
        // 查找所有同级别的节点
        const siblingContainers = parentContainer.querySelectorAll(':scope > .tree-node-container');
        
        siblingContainers.forEach(container => {
            if (container !== currentContainer) {
                const childrenContainer = container.querySelector('.tree-children');
                const arrow = container.querySelector('.tree-arrow');
                
                if (childrenContainer && !childrenContainer.classList.contains('hidden')) {
                    childrenContainer.classList.add('hidden');
                    if (arrow) {
                        arrow.classList.remove('expanded');
                    }
                }
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
        this.loadData();
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
            // 检查是否滚动到底部（提前100px开始加载）
            if (contentArea.scrollTop + contentArea.clientHeight >= contentArea.scrollHeight - 100) {
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