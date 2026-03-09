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
        for (let day = 1; day <= lastDayDate; day++) {
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const dayEvents = cases.filter(c => c.submitDate === cellDateStr || c.expectedReplyDate === cellDateStr);
            
            let tagsHTML = '';
            dayEvents.forEach(evt => {
                if (evt.submitDate === cellDateStr) {
                    tagsHTML += `<div class="event-tag tag-submit">📤 送出: ${evt.target}</div>`;
                }
                if (evt.expectedReplyDate === cellDateStr && evt.status === 'processing') {
                    tagsHTML += `<div class="event-tag tag-deadline">⏰ 期限: ${evt.target}</div>`;
                }
            });

            const isToday = (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) ? 'today' : '';
            
            const cell = document.createElement('div');
            cell.className = `day-cell ${isToday}`;
            cell.innerHTML = `<span class="day-number">${day}</span>${tagsHTML}`;
            
            // 判斷當天有沒有案件，決定點擊的行為
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
        
        // 自動加 7 天
        const submitDateObj = new Date(dateStr);
        submitDateObj.setDate(submitDateObj.getDate() + 7);
        replyInput.value = submitDateObj.toISOString().split('T')[0];

        document.getElementById('modal-day-cases').classList.add('hidden');
        document.getElementById('modal-add').classList.remove('hidden');
    }

    // 5. 開啟該日詳情 Modal
    function openDayModal(dateStr, dayEvents) {
        document.getElementById('day-modal-title').innerText = `📅 ${dateStr} 案件紀錄`;
        const listContainer = document.getElementById('day-cases-list');
        
        listContainer.innerHTML = dayEvents.map(evt => `
            <div class="case-item">
                <h4>${evt.title}</h4>
                <p><strong>對象:</strong> ${evt.target}</p>
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
                
                <button class="btn-primary" style="margin-top: 15px; font-size: 0.85rem; padding: 6px 12px; background-color: #f39c12;" onclick="openReplyModal('${evt.id}')">✏️ 更新進度 / 填寫回覆</button>
            </div>
        `).join('');
        
        const btnAddHere = document.getElementById('btn-add-on-this-day');
        if(btnAddHere) {
            btnAddHere.onclick = () => openAddModal(dateStr);
        }

        document.getElementById('modal-day-cases').classList.remove('hidden');
    }

    // 6. Topbar 按鈕：預設帶入今天
    document.getElementById('btn-open-add').addEventListener('click', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        openAddModal(todayStr);
    });

    // 7. 當送出日期被手動更改時，連動更新預估回覆日 (+7天)
    document.getElementById('input-submit-date').addEventListener('change', (e) => {
        if(!e.target.value) return;
        const newSubmitDate = new Date(e.target.value);
        newSubmitDate.setDate(newSubmitDate.getDate() + 7);
        document.getElementById('input-reply-date').value = newSubmitDate.toISOString().split('T')[0];
    });

    // 8. 表單送出事件 (新增案件)
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
        alert('案件新增成功！');
    });

    // 9. 開啟「更新進度」的 Modal
    window.openReplyModal = function(id) {
        const item = cases.find(c => c.id === id);
        if(!item) return;

        document.getElementById('edit-case-id').value = item.id;
        document.getElementById('edit-status').value = item.status;
        document.getElementById('edit-reply-content').value = item.reply || '';

        document.getElementById('modal-day-cases').classList.add('hidden');
        document.getElementById('modal-reply').classList.remove('hidden');
    };

    // 10. 處理「更新進度」的表單送出
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
            alert('🎉 案件狀態更新成功！');
        }
    });

    // 關閉 Modal
    window.closeModal = function(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    };
});
