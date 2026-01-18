class ThreeColumnBookmarkManager {
    constructor() {
        this.bookmarks = [];
        this.selectedItems = new Set();
        this.currentFolder = 'root';
        this.folderMap = new Map(); // id -> folder data
        this.linkMap = new Map();   // id -> link data
        this.isCtrlPressed = false;
        this.isShiftPressed = false;
        this.lastSelectedItem = null;
        this.dragState = {
            isDragging: false,
            startX: 0,
            startY: 0,
            draggedItem: null
        };
        this.moveTargetFolder = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragAndDrop();
        this.loadSampleData();
        this.renderFolderTree();
        this.renderLinks();
        this.updateStats();
        this.updateBreadcrumb();
        this.updateTargetFolderSelect();
        this.updateStatusMessage('就绪');
    }

    bindEvents() {
        // 文件导入导出
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.importBookmarks(e.target.files[0]);
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportBookmarks();
        });

        // 新建操作
        document.getElementById('newFolderBtn').addEventListener('click', () => {
            this.createNewFolder();
        });

        document.getElementById('quickNewFolder').addEventListener('click', () => {
            this.createNewFolder(this.currentFolder);
        });

        document.getElementById('quickNewLink').addEventListener('click', () => {
            this.showNewLinkModal();
        });

        document.getElementById('addFirstLink').addEventListener('click', () => {
            this.showNewLinkModal();
        });

        // 搜索功能
        document.getElementById('searchLinks').addEventListener('input', (e) => {
            this.searchLinks(e.target.value);
        });

        document.getElementById('clearLinkSearch').addEventListener('click', () => {
            document.getElementById('searchLinks').value = '';
            this.searchLinks('');
        });

        // 选择操作
        document.getElementById('cancelSelectionBtn').addEventListener('click', () => {
            this.clearSelection();
        });

        document.getElementById('moveSelectedBtn').addEventListener('click', () => {
            this.showMoveModal();
        });

        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            this.deleteSelectedItems();
        });

        // 移动操作
        document.getElementById('moveToFolderBtn').addEventListener('click', () => {
            const targetFolder = document.getElementById('targetFolderSelect').value;
            if (targetFolder) {
                this.moveSelectedToFolder(targetFolder);
            }
        });

        // 模态框关闭
        document.querySelectorAll('.close-modal, .close-new-link-modal, .close-move-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAllModals();
            });
        });

        // 新建链接
        document.getElementById('createLinkBtn').addEventListener('click', () => {
            this.createNewLink();
        });

        // 移动确认
        document.getElementById('confirmMoveBtn').addEventListener('click', () => {
            if (this.moveTargetFolder) {
                this.moveSelectedToFolder(this.moveTargetFolder);
            } else {
                this.updateStatusMessage('请先选择目标文件夹', 'error');
            }
        });

        // 折叠所有文件夹
        document.getElementById('collapseAllFolders').addEventListener('click', () => {
            this.collapseAllFolders();
        });

        // 刷新
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshView();
        });

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('visible');
                }
            });
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            this.isCtrlPressed = e.ctrlKey || e.metaKey;
            this.isShiftPressed = e.shiftKey;

            // Ctrl+A: 全选当前文件夹中的链接
            if (e.key === 'a' && this.isCtrlPressed) {
                e.preventDefault();
                this.selectAllLinks();
            }

            // Delete: 删除选中项
            if (e.key === 'Delete' && this.selectedItems.size > 0) {
                e.preventDefault();
                this.deleteSelectedItems();
            }

            // Escape: 取消选择
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (!e.ctrlKey && !e.metaKey) this.isCtrlPressed = false;
            if (!e.shiftKey) this.isShiftPressed = false;
        });
    }

    setupDragAndDrop() {
        const linksContainer = document.getElementById('linksGrid');
        
        if (linksContainer) {
            linksContainer.addEventListener('dragstart', (e) => {
                if (!e.target.closest('.link-card')) return;
                
                const linkCard = e.target.closest('.link-card');
                const linkId = linkCard.dataset.id;
                
                if (!this.selectedItems.has(linkId)) {
                    this.clearSelection();
                    this.selectItem(linkId);
                }
                
                this.dragState.isDragging = true;
                this.dragState.draggedItem = linkId;
                
                // 设置拖拽图像
                const dragImage = document.createElement('div');
                dragImage.textContent = `移动 ${this.selectedItems.size} 个项目`;
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 0, 0);
                setTimeout(() => document.body.removeChild(dragImage), 0);
                
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', linkId);
            });

            linksContainer.addEventListener('dragend', () => {
                this.dragState.isDragging = false;
                this.dragState.draggedItem = null;
                document.querySelectorAll('.link-card.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });
        }
    }

    loadSampleData() {
        // 创建一些示例数据
        this.bookmarks = [
            {
                id: 'folder_1',
                type: 'folder',
                name: '常用网站',
                parent: 'root',
                expanded: true,
                children: [
                    {
                        id: 'link_1',
                        type: 'link',
                        title: 'GitHub',
                        url: 'https://github.com',
                        icon: 'fab fa-github',
                        parent: 'folder_1'
                    },
                    {
                        id: 'link_2',
                        type: 'link',
                        title: 'Stack Overflow',
                        url: 'https://stackoverflow.com',
                        icon: 'fab fa-stack-overflow',
                        parent: 'folder_1'
                    }
                ]
            },
            {
                id: 'folder_2',
                type: 'folder',
                name: '社交媒体',
                parent: 'root',
                expanded: false,
                children: [
                    {
                        id: 'link_3',
                        type: 'link',
                        title: 'Twitter',
                        url: 'https://twitter.com',
                        icon: 'fab fa-twitter',
                        parent: 'folder_2'
                    }
                ]
            },
            {
                id: 'link_4',
                type: 'link',
                title: 'Google',
                url: 'https://google.com',
                icon: 'fab fa-google',
                parent: 'root'
            }
        ];

        // 构建映射表
        this.buildMaps();
    }

    buildMaps() {
        this.folderMap.clear();
        this.linkMap.clear();
        
        const processItems = (items, parent = 'root') => {
            items.forEach(item => {
                if (item.type === 'folder') {
                    this.folderMap.set(item.id, {
                        ...item,
                        parent: parent
                    });
                    
                    if (item.children) {
                        processItems(item.children, item.id);
                    }
                } else if (item.type === 'link') {
                    this.linkMap.set(item.id, {
                        ...item,
                        parent: parent
                    });
                }
            });
        };
        
        processItems(this.bookmarks);
    }

    renderFolderTree() {
        const folderTree = document.getElementById('folderTree');
        if (!folderTree) return;
        
        folderTree.innerHTML = '';
        
        // 添加"所有收藏夹"项
        const allBookmarksItem = this.createAllBookmarksItem();
        folderTree.appendChild(allBookmarksItem);
        
        // 递归渲染文件夹
        const renderFolders = (folders, level = 0) => {
            folders.forEach(folder => {
                if (folder.type !== 'folder') return;
                
                const folderElement = this.createFolderElement(folder, level);
                folderTree.appendChild(folderElement);
                
                // 递归渲染子文件夹
                if (folder.expanded && folder.children) {
                    const childFolders = folder.children.filter(item => item.type === 'folder');
                    if (childFolders.length > 0) {
                        const childrenContainer = document.createElement('div');
                        childrenContainer.className = 'folder-children';
                        childrenContainer.style.marginLeft = `${level * 24}px`;
                        renderFolders(childFolders, level + 1).forEach(child => {
                            childrenContainer.appendChild(child);
                        });
                        folderTree.appendChild(childrenContainer);
                    }
                }
            });
        };
        
        const rootFolders = this.bookmarks.filter(item => item.type === 'folder');
        renderFolders(rootFolders, 1);
        
        this.updateFolderStats();
    }

    createFolderElement(folder, level) {
        const div = document.createElement('div');
        div.className = 'folder-item';
        if (this.currentFolder === folder.id) {
            div.classList.add('active');
        }
        div.dataset.id = folder.id;
        
        const children = folder.children || [];
        const linkCount = children.filter(item => item.type === 'link').length;
        const folderCount = children.filter(item => item.type === 'folder').length;
        const totalCount = linkCount + folderCount;
        
        div.innerHTML = `
            <span class="folder-toggle ${folder.expanded ? 'expanded' : ''}">
                <i class="fas fa-chevron-right"></i>
            </span>
            <span class="folder-icon">
                <i class="fas fa-folder${this.currentFolder === folder.id ? '-open' : ''}"></i>
            </span>
            <span class="folder-name">${folder.name}</span>
            <span class="folder-count">${totalCount}</span>
        `;
        
        div.style.paddingLeft = `${level * 24 + 12}px`;
        
        // 添加事件监听器
        div.addEventListener('click', (e) => {
            if (e.target.closest('.folder-toggle')) {
                e.stopPropagation();
                this.toggleFolderExpansion(folder.id);
            } else {
                this.selectFolder(folder.id);
            }
        });
        
        // 拖拽事件
        div.addEventListener('dragover', (e) => {
            if (this.dragState.isDragging && this.selectedItems.size > 0) {
                e.preventDefault();
                div.classList.add('drag-over');
            }
        });

        div.addEventListener('dragleave', () => {
            div.classList.remove('drag-over');
        });

        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('drag-over');
            if (this.dragState.isDragging && this.selectedItems.size > 0) {
                this.moveSelectedToFolder(folder.id);
            }
        });
        
        return div;
    }

    createAllBookmarksItem() {
        const div = document.createElement('div');
        div.className = 'folder-item';
        if (this.currentFolder === 'root') {
            div.classList.add('active');
        }
        div.dataset.id = 'root';
        
        const totalLinks = this.linkMap.size;
        
        div.innerHTML = `
            <span class="folder-icon">
                <i class="fas fa-bookmark"></i>
            </span>
            <span class="folder-name">所有收藏夹</span>
            <span class="folder-count">${totalLinks}</span>
        `;
        
        div.addEventListener('click', () => {
            this.selectFolder('root');
        });
        
        // 拖拽事件
        div.addEventListener('dragover', (e) => {
            if (this.dragState.isDragging && this.selectedItems.size > 0) {
                e.preventDefault();
                div.classList.add('drag-over');
            }
        });

        div.addEventListener('dragleave', () => {
            div.classList.remove('drag-over');
        });

        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('drag-over');
            if (this.dragState.isDragging && this.selectedItems.size > 0) {
                this.moveSelectedToFolder('root');
            }
        });
        
        return div;
    }

    selectFolder(folderId) {
        this.currentFolder = folderId;
        
        // 更新文件夹选中状态
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedFolder = document.querySelector(`.folder-item[data-id="${folderId}"]`);
        if (selectedFolder) {
            selectedFolder.classList.add('active');
        }
        
        // 更新标题和面包屑
        this.updateBreadcrumb();
        
        // 渲染链接
        this.renderLinks();
        
        // 清空选择
        this.clearSelection();
        
        this.updateStatusMessage(`已切换到: ${folderId === 'root' ? '所有收藏夹' : this.folderMap.get(folderId)?.name || '文件夹'}`);
    }

    renderLinks() {
        const linksGrid = document.getElementById('linksGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!linksGrid || !emptyState) return;
        
        // 获取当前文件夹中的链接
        let links = [];
        if (this.currentFolder === 'root') {
            // 根目录显示所有链接
            links = Array.from(this.linkMap.values());
        } else {
            // 显示特定文件夹中的链接
            links = Array.from(this.linkMap.values()).filter(link => link.parent === this.currentFolder);
        }
        
        // 应用搜索过滤
        const searchTerm = document.getElementById('searchLinks').value.toLowerCase();
        if (searchTerm) {
            links = links.filter(link => 
                link.title.toLowerCase().includes(searchTerm) ||
                link.url.toLowerCase().includes(searchTerm)
            );
        }
        
        if (links.length === 0) {
            linksGrid.style.display = 'none';
            emptyState.classList.add('visible');
            
            if (searchTerm) {
                emptyState.innerHTML = `
                    <div class="empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3>未找到匹配的链接</h3>
                    <p>没有找到与"${searchTerm}"匹配的链接</p>
                    <button id="clearSearchBtn" class="btn">
                        <i class="fas fa-times"></i> 清除搜索
                    </button>
                `;
                
                document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
                    document.getElementById('searchLinks').value = '';
                    this.searchLinks('');
                });
            }
        } else {
            linksGrid.style.display = 'grid';
            emptyState.classList.remove('visible');
            
            linksGrid.innerHTML = '';
            links.forEach(link => {
                const linkCard = this.createLinkCard(link);
                linksGrid.appendChild(linkCard);
            });
        }
        
        // 更新链接计数
        document.getElementById('linkCount').textContent = `${links.length} 个项目`;
        
        // 更新选择工具栏
        this.updateSelectionToolbar();
    }

    createLinkCard(link) {
        const div = document.createElement('div');
        div.className = 'link-card';
        if (this.selectedItems.has(link.id)) {
            div.classList.add('selected');
        }
        div.dataset.id = link.id;
        div.draggable = true;
        
        // 解析图标
        let iconHtml = `<i class="fas fa-link link-icon"></i>`;
        if (link.icon) {
            if (link.icon.startsWith('fab fa-') || link.icon.startsWith('fas fa-')) {
                iconHtml = `<i class="${link.icon} link-icon"></i>`;
            } else if (link.icon.startsWith('data:image')) {
                iconHtml = `<img src="${link.icon}" alt="${link.title}" class="link-icon" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-link link-icon\\'></i>'">`;
            } else if (link.icon.startsWith('http')) {
                iconHtml = `<img src="${link.icon}" alt="${link.title}" class="link-icon" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-link link-icon\\'></i>'">`;
            }
        }
        
        const isSelected = this.selectedItems.has(link.id);
        
        div.innerHTML = `
            <div class="link-checkbox">
                <input type="checkbox" ${isSelected ? 'checked' : ''}>
            </div>
            <div class="link-card-header">
                ${iconHtml}
                <div class="link-title">${link.title}</div>
            </div>
            <div class="link-url">${this.truncateUrl(link.url, 40)}</div>
            <div class="link-meta">
                <span>${this.getDomainFromUrl(link.url)}</span>
            </div>
        `;
        
        // 添加事件监听器
        const checkbox = div.querySelector('.link-checkbox input');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleItemSelection(link.id, e);
        });
        
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.link-checkbox')) {
                this.handleItemSelection(link.id, e);
            }
        });
        
        div.addEventListener('dblclick', () => {
            window.open(link.url, '_blank');
        });
        
        return div;
    }

    handleItemSelection(itemId, event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (this.isShiftPressed && this.lastSelectedItem) {
            // Shift+点击：选择连续的项目
            this.selectRange(itemId);
        } else if (this.isCtrlPressed) {
            // Ctrl+点击：切换选择状态
            this.toggleItemSelection(itemId);
        } else {
            // 普通点击：单选
            this.clearSelection();
            this.selectItem(itemId);
        }
        
        this.lastSelectedItem = itemId;
        this.updateSelectionToolbar();
    }

    selectItem(itemId) {
        this.selectedItems.add(itemId);
        this.updateItemSelectionUI(itemId, true);
    }

    toggleItemSelection(itemId) {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
            this.updateItemSelectionUI(itemId, false);
        } else {
            this.selectedItems.add(itemId);
            this.updateItemSelectionUI(itemId, true);
        }
    }

    selectRange(toItemId) {
        // 获取所有可见链接的ID
        const visibleLinks = Array.from(document.querySelectorAll('.link-card[data-id]'))
            .map(card => card.dataset.id);
        
        const fromIndex = visibleLinks.indexOf(this.lastSelectedItem);
        const toIndex = visibleLinks.indexOf(toItemId);
        
        if (fromIndex === -1 || toIndex === -1) return;
        
        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        
        // 清除当前选择
        this.clearSelection();
        
        // 选择范围内的所有项目
        for (let i = start; i <= end; i++) {
            this.selectItem(visibleLinks[i]);
        }
    }

    selectAllLinks() {
        const currentLinks = Array.from(document.querySelectorAll('.link-card[data-id]'))
            .map(card => card.dataset.id);
        
        currentLinks.forEach(id => {
            this.selectedItems.add(id);
            this.updateItemSelectionUI(id, true);
        });
        
        this.updateSelectionToolbar();
        this.updateStatusMessage(`已选择 ${this.selectedItems.size} 个项目`);
    }

    clearSelection() {
        this.selectedItems.forEach(id => {
            this.updateItemSelectionUI(id, false);
        });
        this.selectedItems.clear();
        this.updateSelectionToolbar();
    }

    updateItemSelectionUI(itemId, selected) {
        const itemElement = document.querySelector(`.link-card[data-id="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.toggle('selected', selected);
            const checkbox = itemElement.querySelector('.link-checkbox input');
            if (checkbox) {
                checkbox.checked = selected;
            }
        }
    }

    updateSelectionToolbar() {
        const selectionToolbar = document.getElementById('selectionToolbar');
        const selectedCount = document.getElementById('selectedCount');
        const moveSelectedBtn = document.getElementById('moveSelectedBtn');
        const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        const moveToFolderBtn = document.getElementById('moveToFolderBtn');
        const renameItemBtn = document.getElementById('renameItem');
        
        if (!selectionToolbar || !selectedCount || !moveSelectedBtn || !deleteSelectedBtn) return;
        
        selectedCount.textContent = `已选择 ${this.selectedItems.size} 个项目`;
        
        if (this.selectedItems.size > 0) {
            selectionToolbar.classList.remove('hidden');
            selectionToolbar.classList.add('visible');
            moveSelectedBtn.disabled = false;
            deleteSelectedBtn.disabled = false;
            if (moveToFolderBtn) moveToFolderBtn.disabled = false;
            if (renameItemBtn) renameItemBtn.disabled = false;
        } else {
            selectionToolbar.classList.remove('visible');
            selectionToolbar.classList.add('hidden');
            moveSelectedBtn.disabled = true;
            deleteSelectedBtn.disabled = true;
            if (moveToFolderBtn) moveToFolderBtn.disabled = true;
            if (renameItemBtn) renameItemBtn.disabled = true;
        }
        
        // 更新统计信息
        const selectedLinkCount = document.getElementById('selectedLinkCount');
        if (selectedLinkCount) {
            selectedLinkCount.textContent = this.selectedItems.size;
        }
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const currentFolderTitle = document.getElementById('currentFolderTitle');
        
        if (!breadcrumb || !currentFolderTitle) return;
        
        if (this.currentFolder === 'root') {
            breadcrumb.innerHTML = '<span class="breadcrumb-item">全部收藏夹</span>';
            currentFolderTitle.textContent = '所有链接';
        } else {
            const folder = this.folderMap.get(this.currentFolder);
            if (folder) {
                breadcrumb.innerHTML = `
                    <span class="breadcrumb-item" data-id="root">全部收藏夹</span>
                    <span class="breadcrumb-item">${folder.name}</span>
                `;
                currentFolderTitle.textContent = folder.name;
            }
        }
        
        // 为面包屑项添加点击事件
        document.querySelectorAll('.breadcrumb-item[data-id]').forEach(item => {
            item.addEventListener('click', () => {
                const folderId = item.dataset.id;
                this.selectFolder(folderId);
            });
        });
    }

    updateStats() {
        const totalFolders = this.folderMap.size;
        const totalLinks = this.linkMap.size;
        
        const totalFolderCount = document.getElementById('totalFolderCount');
        const totalLinkCount = document.getElementById('totalLinkCount');
        const totalItems = document.getElementById('totalItems');
        const lastUpdated = document.getElementById('lastUpdated');
        
        if (totalFolderCount) totalFolderCount.textContent = totalFolders;
        if (totalLinkCount) totalLinkCount.textContent = totalLinks;
        if (totalItems) totalItems.textContent = `${totalLinks} 个项目`;
        if (lastUpdated) {
            lastUpdated.textContent = new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    }

    updateFolderStats() {
        const folderCount = this.folderMap.size;
        const folderCountElement = document.getElementById('folderCount');
        if (folderCountElement) {
            folderCountElement.textContent = `${folderCount} 个文件夹`;
        }
    }

    async importBookmarks(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            // 清空现有数据
            this.bookmarks = [];
            this.folderMap.clear();
            this.linkMap.clear();
            this.selectedItems.clear();
            this.currentFolder = 'root';
            
            // 解析HTML文件
            this.parseBookmarksFile(doc);
            
            // 重新渲染
            this.renderFolderTree();
            this.renderLinks();
            this.updateStats();
            this.updateBreadcrumb();
            this.updateTargetFolderSelect();
            
            this.updateStatusMessage(`成功导入收藏夹，共 ${this.linkMap.size} 个链接`, 'success');
        } catch (error) {
            console.error('导入失败:', error);
            this.updateStatusMessage('导入失败，请检查文件格式', 'error');
        }
    }

    parseBookmarksFile(doc) {
        const processDL = (dlElement, parentId = 'root') => {
            if (!dlElement) return [];
            
            const items = [];
            let currentItem = null;
            
            Array.from(dlElement.children).forEach(child => {
                if (child.tagName === 'DT') {
                    const content = child.firstElementChild;
                    
                    if (content && content.tagName === 'H3') {
                        // 文件夹
                        const folderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        const folder = {
                            id: folderId,
                            type: 'folder',
                            name: content.textContent.trim(),
                            parent: parentId,
                            expanded: false,
                            children: []
                        };
                        
                        const nestedDL = child.querySelector('dl');
                        if (nestedDL) {
                            folder.children = processDL(nestedDL, folderId);
                        }
                        
                        items.push(folder);
                        currentItem = folder;
                    } else if (content && content.tagName === 'A') {
                        // 链接
                        const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        const link = {
                            id: linkId,
                            type: 'link',
                            title: content.textContent.trim(),
                            url: content.getAttribute('HREF') || '#',
                            icon: content.getAttribute('ICON'),
                            parent: parentId
                        };
                        
                        items.push(link);
                        currentItem = link;
                    }
                } else if (child.tagName === 'DL' && currentItem && currentItem.type === 'folder') {
                    // 嵌套的文件夹内容
                    currentItem.children = processDL(child, currentItem.id);
                }
            });
            
            return items;
        };
        
        const mainDL = doc.querySelector('DL');
        if (mainDL) {
            this.bookmarks = processDL(mainDL);
            this.buildMaps();
        }
    }

    exportBookmarks() {
        if (this.bookmarks.length === 0) {
            this.updateStatusMessage('没有可导出的收藏夹', 'warning');
            return;
        }
        
        const html = this.generateExportHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateStatusMessage(`收藏夹导出成功，共 ${this.linkMap.size} 个链接`, 'success');
    }

    generateExportHTML(items = this.bookmarks, depth = 0) {
        let html = '';
        const indent = '    '.repeat(depth);
        
        items.forEach(item => {
            if (item.type === 'folder') {
                html += `${indent}<DT><H3>${item.name}</H3>\n`;
                if (item.children && item.children.length > 0) {
                    html += `${indent}<DL><p>\n`;
                    html += this.generateExportHTML(item.children, depth + 1);
                    html += `${indent}</DL><p>\n`;
                }
            } else {
                html += `${indent}<DT><A HREF="${item.url || '#'}"`;
                if (item.icon && item.icon.startsWith('data:image')) {
                    html += ` ICON="${item.icon}"`;
                }
                html += `>${item.title}</A>\n`;
            }
        });
        
        return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${html}</DL><p>`;
    }

    createNewFolder(parentId = 'root') {
        const folderName = prompt('请输入文件夹名称:', '新建文件夹');
        if (!folderName || folderName.trim() === '') return;
        
        const folderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newFolder = {
            id: folderId,
            type: 'folder',
            name: folderName.trim(),
            parent: parentId,
            expanded: false,
            children: []
        };
        
        if (parentId === 'root') {
            this.bookmarks.push(newFolder);
        } else {
            const parentFolder = this.findItemById(this.bookmarks, parentId);
            if (parentFolder) {
                parentFolder.children = parentFolder.children || [];
                parentFolder.children.push(newFolder);
            } else {
                // 如果父文件夹不存在，添加到根目录
                this.bookmarks.push(newFolder);
                newFolder.parent = 'root';
            }
        }
        
        this.folderMap.set(folderId, { ...newFolder });
        this.renderFolderTree();
        this.updateStats();
        this.updateTargetFolderSelect();
        
        this.updateStatusMessage(`文件夹 "${folderName}" 创建成功`, 'success');
    }

    showNewLinkModal() {
        // 更新文件夹选项
        const folderSelect = document.getElementById('newLinkFolder');
        if (!folderSelect) return;
        
        folderSelect.innerHTML = '<option value="root">根目录</option>';
        
        // 递归添加文件夹选项
        const addOptions = (folders, prefix = '') => {
            folders.forEach(folder => {
                if (folder.type === 'folder') {
                    const option = document.createElement('option');
                    option.value = folder.id;
                    option.textContent = prefix + folder.name;
                    option.selected = folder.id === this.currentFolder;
                    folderSelect.appendChild(option);
                    
                    if (folder.children && folder.children.length > 0) {
                        const childFolders = folder.children.filter(item => item.type === 'folder');
                        if (childFolders.length > 0) {
                            addOptions(childFolders, prefix + '-- ');
                        }
                    }
                }
            });
        };
        
        const folders = this.bookmarks.filter(item => item.type === 'folder');
        addOptions(folders);
        
        // 清空表单
        document.getElementById('newLinkTitle').value = '';
        document.getElementById('newLinkUrl').value = '';
        document.getElementById('newLinkIcon').value = '';
        
        // 显示模态框
        document.getElementById('newLinkModal').classList.add('visible');
    }

    createNewLink() {
        const titleInput = document.getElementById('newLinkTitle');
        const urlInput = document.getElementById('newLinkUrl');
        const iconInput = document.getElementById('newLinkIcon');
        const folderSelect = document.getElementById('newLinkFolder');
        
        if (!titleInput || !urlInput || !folderSelect) return;
        
        const title = titleInput.value.trim();
        const url = urlInput.value.trim();
        const icon = iconInput.value.trim();
        const parentId = folderSelect.value;
        
        if (!title || !url) {
            alert('标题和URL不能为空');
            return;
        }
        
        // 验证URL格式
        try {
            new URL(url);
        } catch {
            alert('请输入有效的URL');
            return;
        }
        
        const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newLink = {
            id: linkId,
            type: 'link',
            title: title,
            url: url,
            icon: icon || undefined,
            parent: parentId
        };
        
        if (parentId === 'root') {
            this.bookmarks.push(newLink);
        } else {
            const parentFolder = this.findItemById(this.bookmarks, parentId);
            if (parentFolder) {
                parentFolder.children = parentFolder.children || [];
                parentFolder.children.push(newLink);
            } else {
                // 如果父文件夹不存在，添加到根目录
                this.bookmarks.push(newLink);
                newLink.parent = 'root';
            }
        }
        
        this.linkMap.set(linkId, { ...newLink });
        
        // 隐藏模态框
        this.hideAllModals();
        
        // 更新显示
        this.buildMaps(); // 重新构建映射
        this.renderFolderTree();
        this.renderLinks();
        this.updateStats();
        this.updateTargetFolderSelect();
        
        // 如果当前文件夹是目标文件夹，更新显示
        if (this.currentFolder === parentId || (parentId === 'root' && this.currentFolder === 'root')) {
            this.renderLinks();
        }
        
        this.updateStatusMessage(`链接 "${title}" 添加成功`, 'success');
    }

    showMoveModal() {
        if (this.selectedItems.size === 0) {
            this.updateStatusMessage('请先选择要移动的项目', 'warning');
            return;
        }

        // 更新移动项目计数
        const moveItemCount = document.getElementById('moveItemCount');
        if (moveItemCount) {
            moveItemCount.textContent = this.selectedItems.size;
        }
        
        // 重置目标文件夹
        this.moveTargetFolder = null;
        
        // 构建移动用的文件夹树
        const moveFolderTree = document.getElementById('moveFolderTree');
        if (moveFolderTree) {
            moveFolderTree.innerHTML = this.createMoveFolderTree();
            
            // 为文件夹项添加点击事件
            const folderItems = moveFolderTree.querySelectorAll('.move-folder-item');
            folderItems.forEach(item => {
                item.addEventListener('click', () => {
                    // 移除所有选中状态
                    folderItems.forEach(el => el.classList.remove('selected'));
                    
                    // 添加当前选中状态
                    item.classList.add('selected');
                    
                    // 更新目标文件夹
                    this.moveTargetFolder = item.dataset.id;
                    
                    // 更新文件夹图标
                    const icon = item.querySelector('.move-folder-icon i');
                    if (icon) {
                        icon.className = `fas fa-${item.dataset.id === 'root' ? 'bookmark' : 'folder-open'}`;
                    }
                });
            });
        }
        
        // 显示模态框
        document.getElementById('moveModal').classList.add('visible');
    }

    createMoveFolderTree() {
        let html = '';
        
        // 添加"根目录"选项
        html += `
            <div class="move-folder-item ${this.moveTargetFolder === 'root' ? 'selected' : ''}" 
                 data-id="root">
                <span class="move-folder-icon">
                    <i class="fas fa-bookmark"></i>
                </span>
                <span class="move-folder-name">根目录</span>
            </div>
        `;
        
        // 递归添加所有文件夹
        const addFolders = (folders, depth = 0) => {
            folders.forEach(folder => {
                if (folder.type !== 'folder') return;
                
                // 检查是否在选中的项目中（不能移动到自身）
                if (this.selectedItems.has(folder.id)) return;
                
                const indent = depth * 20;
                const isSelected = this.moveTargetFolder === folder.id;
                
                html += `
                    <div class="move-folder-item ${isSelected ? 'selected' : ''}" 
                         data-id="${folder.id}"
                         style="padding-left: ${indent}px">
                        <span class="move-folder-icon">
                            <i class="fas fa-folder${isSelected ? '-open' : ''}"></i>
                        </span>
                        <span class="move-folder-name">${folder.name}</span>
                        <span class="folder-count">${this.getFolderItemCount(folder)}</span>
                    </div>
                `;
                
                // 递归添加子文件夹
                if (folder.children && folder.children.length > 0) {
                    addFolders(folder.children, depth + 1);
                }
            });
        };
        
        // 获取所有文件夹
        const folders = this.bookmarks.filter(item => item.type === 'folder');
        addFolders(folders);
        
        return html;
    }

    getFolderItemCount(folder) {
        let count = 0;
        
        const countItems = (items) => {
            items.forEach(item => {
                if (item.type === 'link') {
                    count++;
                } else if (item.type === 'folder' && item.children) {
                    countItems(item.children);
                }
            });
        };
        
        if (folder.children) {
            countItems(folder.children);
        }
        
        return count;
    }

    moveSelectedToFolder(targetFolderId) {
        if (this.selectedItems.size === 0) {
            this.updateStatusMessage('没有选中的项目', 'error');
            return;
        }

        // 验证目标文件夹
        if (targetFolderId === 'root') {
            // 根目录
            if (!confirm(`确定要将 ${this.selectedItems.size} 个项目移动到根目录吗？`)) {
                return;
            }
        } else {
            const targetFolder = this.findItemById(this.bookmarks, targetFolderId);
            if (!targetFolder) {
                this.updateStatusMessage('目标文件夹不存在', 'error');
                return;
            }
            
            // 检查是否试图将文件夹移动到其自身或其子文件夹中
            const isInvalidMove = this.checkInvalidMove(targetFolderId);
            if (isInvalidMove) {
                this.updateStatusMessage('不能将文件夹移动到其自身或其子文件夹中', 'error');
                return;
            }
            
            if (!confirm(`确定要将 ${this.selectedItems.size} 个项目移动到 "${targetFolder.name}" 吗？`)) {
                return;
            }
        }

        // 移动每个选中的项目
        let movedCount = 0;
        const itemsToMove = [];
        
        // 收集要移动的项目
        this.selectedItems.forEach(itemId => {
            const item = this.findItemById(this.bookmarks, itemId);
            if (item) {
                itemsToMove.push({ id: itemId, data: item });
            }
        });

        // 执行移动
        itemsToMove.forEach(({ id, data }) => {
            // 从原位置移除
            const removed = this.removeItemFromParent(id, data.parent);
            if (removed) {
                // 更新父级引用
                data.parent = targetFolderId;
                
                // 添加到新位置
                if (targetFolderId === 'root') {
                    this.bookmarks.push(data);
                } else {
                    const targetFolder = this.findItemById(this.bookmarks, targetFolderId);
                    if (targetFolder) {
                        targetFolder.children = targetFolder.children || [];
                        targetFolder.children.push(data);
                    } else {
                        // 如果目标文件夹不存在，添加到根目录
                        this.bookmarks.push(data);
                        data.parent = 'root';
                    }
                }
                movedCount++;
            }
        });

        // 重新构建映射并更新UI
        this.buildMaps();
        this.renderFolderTree();
        this.renderLinks();
        this.updateStats();
        this.updateTargetFolderSelect();
        
        // 清空选择
        this.clearSelection();
        
        // 隐藏移动模态框
        this.hideMoveModal();
        
        this.updateStatusMessage(`成功移动 ${movedCount} 个项目`, 'success');
    }

    checkInvalidMove(targetFolderId) {
        // 检查是否有选中的文件夹试图移动到其自身或其子文件夹中
        for (const itemId of this.selectedItems) {
            if (itemId === targetFolderId) {
                return true; // 不能移动到自身
            }
            
            // 检查是否试图移动到子文件夹
            const isChild = this.isChildFolder(itemId, targetFolderId);
            if (isChild) {
                return true;
            }
        }
        return false;
    }

    isChildFolder(folderId, potentialParentId) {
        // 检查 folderId 是否是 potentialParentId 的子文件夹
        const folder = this.findItemById(this.bookmarks, potentialParentId);
        if (!folder) return false;
        
        const checkChildren = (parentId, targetId) => {
            const parent = this.findItemById(this.bookmarks, parentId);
            if (!parent || !parent.children) return false;
            
            for (const child of parent.children) {
                if (child.id === targetId) return true;
                if (child.type === 'folder' && checkChildren(child.id, targetId)) {
                    return true;
                }
            }
            return false;
        };
        
        return checkChildren(potentialParentId, folderId);
    }

    removeItemFromParent(itemId, parentId) {
        const removeFromArray = (array, id) => {
            const index = array.findIndex(item => item.id === id);
            if (index !== -1) {
                array.splice(index, 1);
                return true;
            }
            return false;
        };

        if (parentId === 'root') {
            return removeFromArray(this.bookmarks, itemId);
        } else {
            const parent = this.findItemById(this.bookmarks, parentId);
            if (parent && parent.children) {
                return removeFromArray(parent.children, itemId);
            }
        }
        return false;
    }

    updateTargetFolderSelect() {
        const select = document.getElementById('targetFolderSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- 选择目标文件夹 --</option>';
        select.innerHTML += '<option value="root">根目录</option>';
        
        // 递归添加文件夹选项
        const addOptions = (folders, prefix = '') => {
            folders.forEach(folder => {
                if (folder.type === 'folder') {
                    const option = document.createElement('option');
                    option.value = folder.id;
                    option.textContent = prefix + folder.name;
                    select.appendChild(option);
                    
                    if (folder.children && folder.children.length > 0) {
                        const childFolders = folder.children.filter(item => item.type === 'folder');
                        if (childFolders.length > 0) {
                            addOptions(childFolders, prefix + '-- ');
                        }
                    }
                }
            });
        };
        
        const folders = this.bookmarks.filter(item => item.type === 'folder');
        addOptions(folders);
    }

    deleteSelectedItems() {
        if (this.selectedItems.size === 0) {
            this.updateStatusMessage('没有选中的项目', 'warning');
            return;
        }
        
        const confirmMessage = `确定要删除 ${this.selectedItems.size} 个项目吗？此操作无法撤销。`;
        if (!confirm(confirmMessage)) return;
        
        this.selectedItems.forEach(itemId => {
            const item = this.linkMap.get(itemId) || this.folderMap.get(itemId);
            if (item) {
                this.removeItemFromParent(item.id, item.parent);
                this.linkMap.delete(itemId);
                this.folderMap.delete(itemId);
            }
        });
        
        // 更新UI
        this.buildMaps(); // 重新构建映射，因为数据结构可能已改变
        this.renderFolderTree();
        this.renderLinks();
        this.updateStats();
        this.updateTargetFolderSelect();
        this.clearSelection();
        
        this.updateStatusMessage(`成功删除 ${this.selectedItems.size} 个项目`, 'success');
    }

    searchLinks(searchTerm) {
        this.renderLinks(); // 重新渲染会应用搜索过滤
    }

    toggleFolderExpansion(folderId) {
        const folder = this.folderMap.get(folderId);
        if (folder) {
            folder.expanded = !folder.expanded;
            this.renderFolderTree();
        }
    }

    collapseAllFolders() {
        this.folderMap.forEach(folder => {
            folder.expanded = false;
        });
        this.renderFolderTree();
        this.updateStatusMessage('已折叠所有文件夹');
    }

    refreshView() {
        this.renderFolderTree();
        this.renderLinks();
        this.updateStats();
        this.updateTargetFolderSelect();
        this.updateStatusMessage('已刷新');
    }

    findItemById(items, id) {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) {
                const found = this.findItemById(item.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    hideAllModals() {
        document.querySelectorAll('.modal.visible').forEach(modal => {
            modal.classList.remove('visible');
        });
    }

    updateStatusMessage(message, type = 'info') {
        const statusMessage = document.getElementById('statusMessage');
        if (!statusMessage) return;
        
        statusMessage.textContent = message;
        statusMessage.className = `message-${type}`;
        
        // 3秒后恢复默认状态
        setTimeout(() => {
            statusMessage.textContent = '就绪';
            statusMessage.className = '';
        }, 3000);
    }

    // 工具方法
    truncateUrl(url, maxLength = 40) {
        if (!url) return '';
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }

    getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return 'unknown';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.bookmarkManager = new ThreeColumnBookmarkManager();
});