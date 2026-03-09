document.addEventListener('DOMContentLoaded', () => {
    let cases = [];
    let currentDate = new Date();

    // ★ 主題切換邏輯
    const themeToggle = document.getElementById('theme-toggle');
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    
    // 從 localStorage 讀取主題，預設為淺色
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        let newTheme = theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        if(theme === 'dark') {
            iconSun.classList.remove('hidden');
            iconMoon.classList.add('hidden');
        } else {
            iconSun.classList.add('hidden');
            iconMoon.classList.remove('hidden');
        }
    }

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
                console.log('無法讀取 data.json，以空陣列啟動');
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
        document.getElementById('day-modal-title').innerText = `📅 ${dateStr} 紀錄`;
        const listContainer = document.getElementById('day-cases-list');
        
        listContainer.innerHTML = dayEvents.map(evt => {
            let statusText = evt.status === 'processing' ? '⏳ 處理中' : (evt.status === 'replied' ? '✅ 已回覆' : '📁 已結案');
            let statusClass = evt.status === 'processing' ? 'processing' : 'replied';

            return `
            <div class="case-card">
                <div class="case-card-header">
                    <h4 class="case-title">${evt.title}</h4>
                    <span class="status-pill ${statusClass}">${statusText}</span>
                </div>
                <div class="case-meta">
                    <p>🎯 對象：${evt.target}</p>
                    <p>⏱️ 期間：${evt.submitDate} ➔ ${evt.expectedReplyDate}</p>
                </div>
                
                <div class="case-text-box">
                    <div class="pre-wrap">${evt.content}</div>
                </div>
                
                ${evt.reply ? `
                <div class="case-text-box reply-box">
                    <strong>💬 官方回覆：</strong>
                    <div class="pre-wrap" style="margin-top:8px;">${evt.reply}</div>
                </div>
                ` : ''}
                
                <div class="case-actions">
                    <button class="btn-secondary flex-1" onclick="openReplyModal('${evt.id}')">📝 更新</button>
                    <button class="btn-danger" onclick="deleteCase('${evt.id}')">刪除</button>
                </div>
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
        if (confirm('確定要移除此紀錄嗎？')) {
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

    // 7. 新增案件連動日期
    document.getElementById('input-submit-date').addEventListener('change', (e) => {
        if(!e.target.value) return;
        const newSubmitDate = new Date(e.target.value);
        document.getElementById('input-reply-date').min = e.target.value;
        newSubmitDate.setDate(newSubmitDate.getDate() + 7);
        document.getElementById('input-reply-date').value = newSubmitDate.toISOString().split('T')[0];
    });

    // 8. 表單送出 (新增)
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

    // 9. 開啟「更新進度」
    window.openReplyModal = function(id) {
        const item = cases.find(c => c.id === id);
        if(!item) return;

        document.getElementById('edit-case-id').value = item.id;
        document.getElementById('edit-status').value = item.status;
        document.getElementById('edit-reply-content').value = item.reply || '';
        
        const editDateInput = document.getElementById('edit-reply-date');
        editDateInput.value = item.expectedReplyDate;
        editDateInput.min = item.submitDate;

        document.getElementById('modal-day-cases').classList.add('hidden');
        document.getElementById('modal-reply').classList.remove('hidden');
    };

    // 10. 表單送出 (更新)
    document.getElementById('form-reply-case').addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const id = document.getElementById('edit-case-id').value;
        const newStatus = document.getElementById('edit-status').value;
        const newReplyDate = document.getElementById('edit-reply-date').value;
        const newReply = document.getElementById('edit-reply-content').value;

        const index = cases.findIndex(c => c.id === id);
        if(index !== -1) {
            cases[index].status = newStatus;
            cases[index].expectedReplyDate = newReplyDate;
            cases[index].reply = newReply;
            
            localStorage.setItem('civic_cases', JSON.stringify(cases));
            updateStats();
            renderCalendar();
            closeModal('modal-reply');
        }
    });

    // 11. 關閉 Modal
    window.closeModal = function(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    };

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
            e.target.parentElement.classList.add('hidden');
        }
    });
});