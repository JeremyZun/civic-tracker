document.addEventListener('DOMContentLoaded', () => {
    let cases = [];
    let currentDate = new Date();

    // 1. 初始化資料
    const storedData = localStorage.getItem('civic_cases');
    if (storedData) {
        cases = JSON.parse(storedData);
        initApp();
    } else {
        fetch('data.json')
            .then(res => res.json())
            .then(data => {
                cases = data;
                localStorage.setItem('civic_cases', JSON.stringify(cases));
                initApp();
            })
            .catch(err => {
                console.log('無法讀取 data.json，以空陣列啟動', err);
                initApp();
            });
    }

    function initApp() {
        updateStats();
        renderCalendar();
    }

    // 2. 更新 Topbar 統計
    function updateStats() {
        document.getElementById('stat-total').innerText = cases.length;
        document.getElementById('stat-processing').innerText = cases.filter(c => c.status === 'processing').length;
    }

    // 3. 渲染日曆
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); 
        
        document.getElementById('current-month-year').innerText = `${year}年 ${month + 1}月`;
        
        const firstDayIndex = new Date(year, month, 1).getDay();
        const lastDayDate = new Date(year, month + 1, 0).getDate();
        
        const daysGrid = document.getElementById('calendar-days');
        daysGrid.innerHTML = ''; 

        for (let i = 0; i < firstDayIndex; i++) {
            daysGrid.innerHTML += `<div class="day-cell empty"></div>`;
        }

        const today = new Date();
        const sortedCases = cases.slice().sort((a, b) => a.submitDate.localeCompare(b.submitDate));

        for (let day = 1; day <= lastDayDate; day++) {
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const dayEvents = sortedCases.filter(c => cellDateStr >= c.submitDate && cellDateStr <= c.expectedReplyDate);
            
            let tagsHTML = '';
            dayEvents.forEach(evt => {
                const isStart = (cellDateStr === evt.submitDate);
                const isEnd = (cellDateStr === evt.expectedReplyDate);
                
                let barClass = 'event-bar ';
                if (isStart && isEnd) barClass += 'bar-single';
                else if (isStart) barClass += 'bar-start';
                else if (isEnd) barClass += 'bar-end';
                else barClass += 'bar-middle';
                
                let colorClass = 'bar-processing';
                if(evt.status === 'replied') colorClass = 'bar-replied';
                if(evt.status === 'closed') colorClass = 'bar-closed';

                let label = '&nbsp;';
                if (isStart) label = `${evt.target}`;

                tagsHTML += `
                <div class="event-bar-wrapper">
                    <div class="${barClass} ${colorClass}" title="${evt.title}">${label}</div>
                </div>`;
            });

            const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) ? 'today' : '';
            
            const cell = document.createElement('div');
            cell.className = `day-cell ${isToday}`;
            cell.innerHTML = `<span class="day-number">${day}</span>${tagsHTML}`;
            
            cell.addEventListener('click', () => {
                if (dayEvents.length === 0) {
                    openAddModal(cellDateStr);
                } else {
                    openDayModal(cellDateStr, dayEvents);
                }
            });
            
            daysGrid.appendChild(cell);
        }
    }

    // 日曆翻頁
    document.getElementById('btn-prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('btn-next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // 4. 開啟新增案件彈窗
    window.openAddModal = function(dateStr) {
        const submitInput = document.getElementById('input-submit-date');
        const replyInput = document.getElementById('input-reply-date');
        
        submitInput.value = dateStr;
        replyInput.min = dateStr; 

        const submitDateObj = new Date(dateStr);
        submitDateObj.setDate(submitDateObj.getDate() + 7);
        replyInput.value = submitDateObj.toISOString().split('T')[0];

        document.getElementById('modal-day-cases').classList.add('hidden');
        document.getElementById('modal-add').classList.remove('hidden');
    }

    // 5. 開啟該日詳情 Modal
    function openDayModal(dateStr, dayEvents) {
        document.getElementById('day-modal-title').innerText = `${dateStr} 專案紀錄`;
        const listContainer = document.getElementById('day-cases-list');
        
        listContainer.innerHTML = dayEvents.map(evt => {
            let statusBadge = '';
            if(evt.status === 'processing') statusBadge = '<span class="status-badge badge-warning">進行中</span>';
            else if(evt.status === 'replied') statusBadge = '<span class="status-badge badge-success">已回覆</span>';
            else statusBadge = '<span class="status-badge badge-neutral">已結案</span>';

            return `
            <div class="case-card">
                <div class="case-card-header">
                    <h4 class="case-title">${evt.title}</h4>
                    <div class="case-actions">
                        <button class="icon-btn text-primary" onclick="openReplyModal('${evt.id}')" title="更新進度"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        <button class="icon-btn text-danger" onclick="deleteCase('${evt.id}')" title="刪除案件"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                </div>
                <div class="case-meta">
                    <span><strong>負責單位:</strong> ${evt.target}</span>
                    <span><strong>排程:</strong> ${evt.submitDate} ➔ ${evt.expectedReplyDate}</span>
                    <span><strong>狀態:</strong> ${statusBadge}</span>
                </div>
                
                <div class="case-text-box">
                    <div class="box-title">專案內容描述</div>
                    <div class="pre-wrap">${evt.content}</div>
                </div>
                
                ${evt.reply ? `
                <div class="case-text-box reply-box">
                    <div class="box-title text-success">官方回覆 / 執行紀錄</div>
                    <div class="pre-wrap">${evt.reply}</div>
                </div>
                ` : ''}
            </div>
        `}).join('');
        
        const btnAddHere = document.getElementById('btn-add-on-this-day');
        if(btnAddHere) {
            btnAddHere.onclick = () => openAddModal(dateStr);
        }

        document.getElementById('modal-day-cases').classList.remove('hidden');
    }

    // 刪除案件
    window.deleteCase = function(id) {
        if (confirm('確定要移除此專案紀錄嗎？操作無法復原。')) {
            cases = cases.filter(c => c.id !== id);
            localStorage.setItem('civic_cases', JSON.stringify(cases));
            updateStats();
            renderCalendar();
            closeModal('modal-day-cases');
        }
    };

    // 6. Topbar 按鈕
    document.getElementById('btn-open-add').addEventListener('click', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        openAddModal(todayStr);
    });

    // 7. 新增案件：連動更新預估回覆日
    document.getElementById('input-submit-date').addEventListener('change', (e) => {
        if(!e.target.value) return;
        const newSubmitDate = new Date(e.target.value);
        document.getElementById('input-reply-date').min = e.target.value;
        newSubmitDate.setDate(newSubmitDate.getDate() + 7);
        document.getElementById('input-reply-date').value = newSubmitDate.toISOString().split('T')[0];
    });

    // 8. 表單送出事件 (新增)
    document.getElementById('form-add-case').addEventListener('submit', (e) => {
        e.preventDefault();
        const newCase = {
            id: 'CASE-' + Date.now(),
            title: document.getElementById('input-title').value,
            target: document.getElementById('input-target').value,
            submitDate: document.getElementById('input-submit-date').value,
            expectedReplyDate: document.getElementById('input-reply-date').value,
            status: 'processing',
            content: document.getElementById('input-content').value,
            reply: ""
        };
        cases.push(newCase);
        localStorage.setItem('civic_cases', JSON.stringify(cases));
        updateStats();
        renderCalendar();
        closeModal('modal-add');
        e.target.reset();
    });

    // 9. 開啟「更新進度」 (★ 核心變更：帶入並允許修改預期回覆日)
    window.openReplyModal = function(id) {
        const item = cases.find(c => c.id === id);
        if(!item) return;

        document.getElementById('edit-case-id').value = item.id;
        document.getElementById('edit-status').value = item.status;
        document.getElementById('edit-reply-content').value = item.reply || '';
        
        // 帶入舊的預估日期，並設定最小值為立案日期，防止時空錯亂
        const editDateInput = document.getElementById('edit-reply-date');
        editDateInput.value = item.expectedReplyDate;
        editDateInput.min = item.submitDate;

        document.getElementById('modal-day-cases').classList.add('hidden');
        document.getElementById('modal-reply').classList.remove('hidden');
    };

    // 10. 處理「更新進度」送出 (★ 核心變更：儲存新的預期回覆日)
    document.getElementById('form-reply-case').addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const id = document.getElementById('edit-case-id').value;
        const newStatus = document.getElementById('edit-status').value;
        const newReplyDate = document.getElementById('edit-reply-date').value;
        const newReply = document.getElementById('edit-reply-content').value;

        const index = cases.findIndex(c => c.id === id);
        if(index !== -1) {
            cases[index].status = newStatus;
            cases[index].expectedReplyDate = newReplyDate; // 更新展延日期
            cases[index].reply = newReply;
            
            localStorage.setItem('civic_cases', JSON.stringify(cases));
            updateStats();
            renderCalendar();
            closeModal('modal-reply');
        }
    });

    // 11. 關閉 Modal 的函數
    window.closeModal = function(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    };

    // 點擊 Modal 背景自動關閉
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            e.target.parentElement.classList.add('hidden');
        }
    });
});