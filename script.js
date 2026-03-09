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
                if(evt.status === 'replied' || evt.status === 'closed') colorClass = 'bar-replied';

                let label = '&nbsp;';
                if (isStart) label = `📤 ${evt.target}`;
                else if (isEnd) label = `🎯 期限`;

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
        
        // ★ 新增 UX：防止回覆日設得比送出日還要早
        replyInput.min = dateStr; 

        const submitDateObj = new Date(dateStr);
        submitDateObj.setDate(submitDateObj.getDate() + 7);
        replyInput.value = submitDateObj.toISOString().split('T')[0];

        document.getElementById('modal-day-cases').classList.add('hidden');
        document.getElementById('modal-add').classList.remove('hidden');
    }

    // 5. 開啟該日詳情 Modal
    function openDayModal(dateStr, dayEvents) {
        document.getElementById('day-modal-title').innerText = `📅 ${dateStr} 相關案件`;
        const listContainer = document.getElementById('day-cases-list');
        
        listContainer.innerHTML = dayEvents.map(evt => `
            <div class="case-item">
                <h4>${evt.title}</h4>
                <p><strong>對象:</strong> ${evt.target}</p>
                <p><strong>期間:</strong> ${evt.submitDate} ~ ${evt.expectedReplyDate}</p>
                <p><strong>狀態:</strong> ${evt.status === 'processing' ? '⏳ 處理中' : (evt.status === 'closed' ? '📁 已結案' : '✅ 已回覆')}</p>
                
                <div class="case-text-box">
                    <strong>📝 陳情內容:</strong>
                    <div class="pre-wrap">${evt.content}</div>
                </div>
                
                ${evt.reply ? `
                <div class="case-text-box reply-box">
                    <strong>💬 官方回覆:</strong>
                    <div class="pre-wrap">${evt.reply}</div>
                </div>
                ` : ''}
                
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn-primary" style="background-color: #f39c12; flex: 1;" onclick="openReplyModal('${evt.id}')">✏️ 更新進度</button>
                    <button class="btn-danger" onclick="deleteCase('${evt.id}')">🗑️ 刪除</button>
                </div>
            </div>
        `).join('');
        
        const btnAddHere = document.getElementById('btn-add-on-this-day');
        if(btnAddHere) {
            btnAddHere.onclick = () => openAddModal(dateStr);
        }

        document.getElementById('modal-day-cases').classList.remove('hidden');
    }

    // 刪除案件
    window.deleteCase = function(id) {
        if (confirm('確定要刪除這個案件嗎？這個動作無法復原喔！')) {
            cases = cases.filter(c => c.id !== id);
            localStorage.setItem('civic_cases', JSON.stringify(cases));
            updateStats();
            renderCalendar();
            closeModal('modal-day-cases');
        }
    };

    // 6. Topbar 按鈕：預設帶入今天
    document.getElementById('btn-open-add').addEventListener('click', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        openAddModal(todayStr);
    });

    // 7. 當送出日期改變時，連動更新預估回覆日，並限制最小日期
    document.getElementById('input-submit-date').addEventListener('change', (e) => {
        if(!e.target.value) return;
        const newSubmitDate = new Date(e.target.value);
        
        // ★ 防呆：更新 input-reply-date 的可選最小日期
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

    // 9. 開啟「更新進度」
    window.openReplyModal = function(id) {
        const item = cases.find(c => c.id === id);
        if(!item) return;

        document.getElementById('edit-case-id').value = item.id;
        document.getElementById('edit-status').value = item.status;
        document.getElementById('edit-reply-content').value = item.reply || '';

        document.getElementById('modal-day-cases').classList.add('hidden');
        document.getElementById('modal-reply').classList.remove('hidden');
    };

    // 10. 處理「更新進度」送出
    document.getElementById('form-reply-case').addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const id = document.getElementById('edit-case-id').value;
        const newStatus = document.getElementById('edit-status').value;
        const newReply = document.getElementById('edit-reply-content').value;

        const index = cases.findIndex(c => c.id === id);
        if(index !== -1) {
            cases[index].status = newStatus;
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

    // ★ 新增 UX：點擊 Modal 外圍的灰色半透明區域，自動關閉 Modal
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
});