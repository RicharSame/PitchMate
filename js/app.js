// ===========================
// モード管理
// ===========================

let currentMode = 'pitch';

function selectMode(mode) {
    currentMode = mode;

    // ボタンの見た目を切り替え
    ['pitch', 'interview', 'presentation'].forEach(m => {
        const btn = document.getElementById(`mode-${m}`);
        if (m === mode) {
            btn.style.border = '2px solid #0080ff';
            btn.style.background = '#eff6ff';
            btn.style.color = '#0080ff';
        } else {
            btn.style.border = '2px solid #ddd';
            btn.style.background = 'white';
            btn.style.color = '#333';
        }
    });

    // 入力フォームを切り替え
    document.getElementById('input-pitch').style.display = mode === 'pitch' ? 'block' : 'none';
    document.getElementById('input-interview').style.display = mode === 'interview' ? 'block' : 'none';
    document.getElementById('input-presentation').style.display = mode === 'presentation' ? 'block' : 'none';
}

// ===== 状態管理 =====
let questions = [];
let currentQA = [];

// ===== ユーティリティ =====
function $(id) { return document.getElementById(id); }
function show(id) { $(id).style.display = 'block'; }
function hide(id) { $(id).style.display = 'none'; }

function markdownToHtml(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

// ===== API通信 =====
async function callApi(payload) {
    const res = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return res.json();
}

// ===== 履歴・セッション管理 =====
function saveSession(sessionName, pitch, difficulty, score) {
    const sessions = JSON.parse(localStorage.getItem('pitchSessions') || '[]');
    sessions.unshift({
        id: Date.now(),
        name: sessionName || '無題',
        pitch: pitch.slice(0, 100),
        difficulty,
        score,
        mode: currentMode,
        date: new Date().toLocaleDateString('ja-JP')
    });
    localStorage.setItem('pitchSessions', JSON.stringify(sessions));
}

function showHistory() {
    const sessions = JSON.parse(localStorage.getItem('pitchSessions') || '[]');
    const list = $('historyList');

    if (sessions.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:24px;">まだ練習履歴がありません</p>';
    } else {
        list.innerHTML = sessions.map(s => `
            <div class="session-item">
                <div class="flex-center">
                    <strong>${s.name}</strong>
                    <span class="score-badge">${s.score}点</span>
                </div>
                <div class="text-xs text-gray mt-4">${s.date} ・ 難易度：${s.difficulty}</div>
                <div class="text-sm mt-4" style="color:#64748b;">${s.pitch}...</div>
            </div>
        `).join('');
    }

    $('historyModal').style.display = 'block';
}

function closeHistory() {
    $('historyModal').style.display = 'none';
}

// ===== サイドバー（分析） =====
let currentSidebarTab = 'pitch';

function openSidebar() {
    switchSidebarTab(currentSidebarTab);
    hide('sidebarDetail');
    show('sidebarSessionList');
    $('analysisSidebar').classList.add('open');
    $('sidebarOverlay').classList.add('open');
}

function switchSidebarTab(tab) {
    currentSidebarTab = tab;

    // タブの見た目を切り替え
    ['pitch', 'interview', 'presentation'].forEach(m => {
        const btn = $(`tab-${m}`);
        if (m === tab) {
            btn.style.background = '#eff6ff';
            btn.style.color = '#0080ff';
            btn.style.borderBottom = '2px solid #0080ff';
        } else {
            btn.style.background = 'white';
            btn.style.color = '#888';
            btn.style.borderBottom = '2px solid transparent';
        }
    });

    // そのタブのセッション一覧を表示
    const sessions = JSON.parse(localStorage.getItem('pitchSessions') || '[]');
    const list = $('sidebarSessionList');

    // モードでフィルタ（modeが未記録の古いデータはpitchとして扱う）
    const filtered = sessions.filter(s => (s.mode || 'pitch') === tab);

    const groups = {};
    filtered.forEach(s => {
        const name = s.name || '無題';
        if (!groups[name]) groups[name] = [];
        groups[name].push(s);
    });

    if (Object.keys(groups).length === 0) {
        list.innerHTML = '<p style="padding:20px;color:#94a3b8;font-size:14px;">まだ練習履歴がありません</p>';
    } else {
        list.innerHTML = Object.entries(groups).map(([name, records]) => `
            <button class="session-btn" onclick="showSessionDetail('${encodeURIComponent(name)}')">
                <div class="text-bold">${name}</div>
                <div class="text-xs text-gray mt-4">
                    練習回数：${records.length}回 ・ 最新スコア：${records[0].score}点
                </div>
            </button>
        `).join('');
    }

    hide('sidebarDetail');
    show('sidebarSessionList');
}

function closeSidebar() {
    $('analysisSidebar').classList.remove('open');
    $('sidebarOverlay').classList.remove('open');
}

function backToList() {
    hide('sidebarDetail');
    show('sidebarSessionList');
}

function showSessionDetail(encodedName) {
    const name = decodeURIComponent(encodedName);
    const sessions = JSON.parse(localStorage.getItem('pitchSessions') || '[]');
    const records = sessions.filter(s => (s.name || '無題') === name).reverse();

    const bars = records.map((r, i) => {
        const score = parseInt(r.score) || 0;
        const height = Math.max(4, (score / 100) * 120);
        return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div style="font-size:11px;font-weight:700;color:#0080ff;">${r.score}点</div>
                <div class="chart-bar" style="width:32px;height:${height}px;"></div>
                <div style="font-size:10px;color:#94a3b8;">${i + 1}回目</div>
            </div>
        `;
    }).join('');

    const avgScore = records.length > 0
        ? Math.round(records.reduce((sum, r) => sum + (parseInt(r.score) || 0), 0) / records.length)
        : 0;

    $('sessionDetailContent').innerHTML = `
        <div class="text-bold mt-4" style="font-size:16px;margin-bottom:16px;">${name}</div>
        <div style="display:flex;gap:10px;margin-bottom:20px;">
            <div style="flex:1;background:#f8fafc;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:26px;font-weight:700;color:#0080ff;">${records.length}</div>
                <div class="text-xs text-gray mt-4">練習回数</div>
            </div>
            <div style="flex:1;background:#f8fafc;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:26px;font-weight:700;color:#22c55e;">${avgScore}</div>
                <div class="text-xs text-gray mt-4">平均スコア</div>
            </div>
            <div style="flex:1;background:#f8fafc;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:26px;font-weight:700;color:#f59e0b;">${records[records.length - 1]?.score || 0}</div>
                <div class="text-xs text-gray mt-4">最新スコア</div>
            </div>
        </div>
        <div class="text-bold mb-8">スコア推移</div>
        <div style="display:flex;align-items:flex-end;gap:8px;padding:14px;background:#f8fafc;border-radius:10px;min-height:160px;">
            ${bars || '<p class="text-sm text-gray">データがありません</p>'}
        </div>
        <div class="mt-16">
            <div class="text-bold mb-8">練習履歴</div>
            ${records.map((r, i) => `
                <div class="flex-center" style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
                    <span class="text-gray">${i + 1}回目 ・ ${r.date} ・ ${r.difficulty}</span>
                    <span style="font-weight:700;color:#0080ff;">${r.score}点</span>
                </div>
            `).join('')}
        </div>
    `;

    $('sidebarSessionList').style.display = 'none';
    show('sidebarDetail');
}

// ===== 練習フロー =====
async function generateQuestions() {
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;

    // モードごとに入力を取得
    let pitch = '';
    let industry = '';

    if (currentMode === 'pitch') {
        pitch = document.getElementById('pitchInput').value.trim();
        if (!pitch) { alert('発表内容を入力してください'); return; }

    } else if (currentMode === 'interview') {
        industry = document.getElementById('industryInput').value.trim();
        pitch = document.getElementById('interviewInput').value.trim();
        if (!industry) { alert('志望業界・業種を入力してください'); return; }
        if (!pitch) { alert('志望理由・自己PR・ガクチカを入力してください'); return; }

    } else if (currentMode === 'presentation') {
        pitch = document.getElementById('presentationInput').value.trim();
        if (!pitch) { alert('発表内容を入力してください'); return; }
    }

    document.getElementById('startBtn').disabled = true;
    document.getElementById('loading1').style.display = 'block';

    const res = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_questions', pitch, difficulty, mode: currentMode, industry })
    });
    const data = await res.json();

    questions = data.text.split('\n').filter(q => q.trim().match(/^\d+\./));

    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    questions.forEach((q, i) => {
        container.innerHTML += `
            <div style="margin-bottom:20px;">
                <p class="question">${q}</p>
                <textarea id="answer${i}" rows="3" placeholder="回答を入力..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;"></textarea>
            </div>
        `;
    });

    // pitchをグローバルに保存（総合評価で使う）
    window.currentPitch = pitch;

    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('loading1').style.display = 'none';
}

async function showSummary() {
    hide('branchContainer');
    show('loading2');

    const pitch = window.currentPitch;
    const data = await callApi({ action: 'get_summary', pitch, qa: currentQA });

    $('summaryContainer').innerHTML = `
        <div class="summary-box">
            <strong style="font-size:15px;">総合評価</strong><br><br>
            ${markdownToHtml(data.text)}
        </div>
    `;

    const scoreMatch = data.text.match(/(\d+)点/);
    const score = scoreMatch ? scoreMatch[1] : '?';
    const sessionName = $('sessionName').value.trim();
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    saveSession(sessionName, pitch, difficulty, score);

    hide('loading2');
    show('retryBtn');
}

async function startFollowup() {
    hide('branchContainer');
    show('loading2');

    const pitch = window.currentPitch;
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;

    const data = await callApi({ action: 'get_followup', pitch, qa: currentQA, difficulty });
    const followupQuestions = data.text.split('\n').filter(q => q.trim().match(/^\d+\./));

    let html = '<div class="mt-24"><strong style="font-size:15px;">追加質問</strong></div>';
    followupQuestions.forEach((q, i) => {
        html += `
            <div class="mt-16">
                <p style="font-weight:700;margin-bottom:8px;">${q}</p>
                <textarea id="followup${i}" rows="3" placeholder="回答を入力..."></textarea>
            </div>
        `;
    });

    $('followupContainer').innerHTML = html;
    hide('loading2');

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'フィードバックをもらう';
    submitBtn.className = 'mt-16';
    submitBtn.onclick = async () => {
        submitBtn.disabled = true;

        for (let i = 0; i < followupQuestions.length; i++) {
            const answer = $(`followup${i}`).value.trim();
            if (!answer) continue;

            const fbData = await callApi({
                action: 'get_feedback',
                question: followupQuestions[i],
                answer
            });

            const div = document.createElement('div');
            div.className = 'feedback';
            div.innerHTML = markdownToHtml(fbData.text);
            $(`followup${i}`).after(div);

            currentQA.push({ question: followupQuestions[i], answer });
        }

        submitBtn.style.display = 'none';

        const summaryBtn = document.createElement('button');
        summaryBtn.textContent = '全体評価を見る';
        summaryBtn.className = 'btn-green mt-16';
        summaryBtn.onclick = showSummary;
        $('followupContainer').appendChild(summaryBtn);
    };

    $('followupContainer').appendChild(submitBtn);
}

async function getFeedback() {
    $('feedbackBtn').disabled = true;
    show('loading2');

    currentQA = [];

    for (let i = 0; i < questions.length; i++) {
        const answerEl = document.getElementById(`answer${i}`);
        const answer = answerEl.value.trim();
        if (!answer) continue;

        const data = await callApi({
            action: 'get_feedback',
            question: questions[i],
            answer
        });

        const div = document.createElement('div');
        div.className = 'feedback';
        div.innerHTML = markdownToHtml(data.text);
        answerEl.after(div);

        currentQA.push({ question: questions[i], answer });
    }

    hide('loading2');
    hide('feedbackBtn');
    show('branchContainer');
}


function retry() {
    $('questionsContainer').innerHTML = '';
    $('summaryContainer').innerHTML = '';
    $('followupContainer').innerHTML = '';
    $('feedbackBtn').style.display = 'block';
    $('feedbackBtn').disabled = false;
    $('retryBtn').style.display = 'none';
    $('branchContainer').style.display = 'none';
    hide('step2');
    show('step1');
    $('startBtn').disabled = false;
    hide('loading1');
    hide('loading2');
    currentQA = [];
    questions = [];
}