/**
 * NordOrd · app.js
 * 瑞典语背词 App 主逻辑
 * ─────────────────────────────────────────────
 * 页面：Dashboard / Study / Wrong
 * 数据存储：localStorage
 * 发音：SpeechSynthesisUtterance (sv-SE)
 */

/* ══════════════════════════════════════
   1. 全局状态
══════════════════════════════════════ */
let allWords = [];          // words.json 全部词条
let studyList = [];         // 当前学习队列
let currentIndex = 0;       // 当前卡片索引
let isFlipped = false;      // 卡片是否已翻面
let isPracticeWrong = false; // 是否在练习错题

// localStorage 存储 key
const KEY_KNOWN    = 'nordord_known';    // Set: 已认识单词 id
const KEY_WRONG    = 'nordord_wrong';    // Set: 错题 id
const KEY_LEVEL    = 'nordord_level';    // 当前筛选等级
const KEY_STUDIED  = 'nordord_studied';  // Set: 已学习 id

/* ══════════════════════════════════════
   2. localStorage 工具函数
══════════════════════════════════════ */
function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

function loadLevel() {
  return localStorage.getItem(KEY_LEVEL) || 'all';
}

function saveLevel(level) {
  localStorage.setItem(KEY_LEVEL, level);
}

/* ══════════════════════════════════════
   3. 发音函数
══════════════════════════════════════ */
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // 取消上一条
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'sv-SE';
  utt.rate = 0.9;
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
}

/* ══════════════════════════════════════
   4. 页面切换
══════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════
   5. Dashboard 渲染
══════════════════════════════════════ */
function renderDashboard() {
  const knownSet   = loadSet(KEY_KNOWN);
  const wrongSet   = loadSet(KEY_WRONG);
  const studiedSet = loadSet(KEY_STUDIED);
  const level      = loadLevel();

  // 根据等级筛选
  const filtered = level === 'all' ? allWords : allWords.filter(w => w.level === level);
  const total = filtered.length;
  const known = filtered.filter(w => knownSet.has(w.id)).length;
  const wrongs = wrongSet.size;
  const newWords = filtered.filter(w => !studiedSet.has(w.id)).length;

  document.getElementById('stat-new').textContent    = newWords;
  document.getElementById('stat-review').textContent = wrongs;
  document.getElementById('stat-done').textContent   = known;

  const pct = total > 0 ? Math.round((known / total) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `完成率 ${pct}%`;
  document.getElementById('wrong-badge').textContent   = wrongs;

  // 同步等级按钮选中
  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.level === level);
  });
}

/* ══════════════════════════════════════
   6. 学习逻辑
══════════════════════════════════════ */
function buildStudyList(level) {
  const knownSet = loadSet(KEY_KNOWN);
  let pool = level === 'all' ? allWords : allWords.filter(w => w.level === level);
  // 优先学习未认识的词，打乱顺序
  pool = pool.filter(w => !knownSet.has(w.id));
  if (pool.length === 0) pool = [...allWords]; // 全认识了就全部复习
  return shuffleArray(pool);
}

function buildWrongList() {
  const wrongSet = loadSet(KEY_WRONG);
  return allWords.filter(w => wrongSet.has(w.id));
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 渲染当前卡片
function renderCard() {
  if (currentIndex >= studyList.length) {
    showFinish();
    return;
  }

  const word = studyList[currentIndex];
  isFlipped = false;

  // 重置翻转状态
  const inner = document.getElementById('flip-card-inner');
  inner.classList.remove('flipped');

  // 进度标签
  document.getElementById('study-progress-label').textContent =
    `${currentIndex + 1} / ${studyList.length}`;

  // 正面
  document.getElementById('card-level-tag').textContent = word.level;
  document.getElementById('card-type-tag').textContent  = word.type;
  document.getElementById('card-word').textContent      = word.sv;

  // 背面
  document.getElementById('card-level-tag-back').textContent = word.level;
  document.getElementById('card-type-tag-back').textContent  = word.type;
  document.getElementById('card-word-back').textContent      = word.sv;
  document.getElementById('answer-zh').textContent           = word.zh;
  document.getElementById('answer-fr').textContent           = word.fr;
  document.getElementById('example-sv').textContent          = word.example_sv;
  document.getElementById('example-zh').textContent          = word.example_zh;
  document.getElementById('example-fr').textContent          = word.example_fr;

  // 隐藏判断按钮
  document.getElementById('judge-btns').classList.remove('visible');
}

// 翻牌
function revealCard() {
  const word = studyList[currentIndex];
  const inner = document.getElementById('flip-card-inner');
  inner.classList.add('flipped');
  isFlipped = true;

  // 标记为已学习
  const studiedSet = loadSet(KEY_STUDIED);
  studiedSet.add(word.id);
  saveSet(KEY_STUDIED, studiedSet);

  // 显示判断按钮
  setTimeout(() => {
    document.getElementById('judge-btns').classList.add('visible');
  }, 300);
}

// 用户选择"认识"
function handleKnow() {
  const word = studyList[currentIndex];
  const knownSet = loadSet(KEY_KNOWN);
  const wrongSet = loadSet(KEY_WRONG);
  knownSet.add(word.id);
  wrongSet.delete(word.id); // 从错题中移除
  saveSet(KEY_KNOWN, knownSet);
  saveSet(KEY_WRONG, wrongSet);
  nextCard();
}

// 用户选择"不认识"
function handleDontKnow() {
  const word = studyList[currentIndex];
  const wrongSet = loadSet(KEY_WRONG);
  wrongSet.add(word.id);
  saveSet(KEY_WRONG, wrongSet);
  nextCard();
}

// 前进下一张
function nextCard() {
  currentIndex++;
  renderCard();
}

// 显示完成页
function showFinish() {
  const cardArea = document.querySelector('.card-area');
  const judgeArea = document.getElementById('judge-btns');
  judgeArea.classList.remove('visible');

  const wrong = loadSet(KEY_WRONG).size;
  const known = loadSet(KEY_KNOWN).size;

  cardArea.innerHTML = `
    <div class="finish-card card">
      <div class="finish-emoji">🎉</div>
      <div class="finish-title">本轮学习完成！</div>
      <div class="finish-sub">已掌握 ${known} 个词 · 错题本有 ${wrong} 个词</div>
      <button class="btn-primary" onclick="backToDashboard()" style="margin-bottom:10px">返回首页</button>
      ${wrong > 0 ? `<button class="btn-secondary" onclick="startPracticeWrong()">练习错题 (${wrong})</button>` : ''}
    </div>`;
}

/* ══════════════════════════════════════
   7. 错题本
══════════════════════════════════════ */
function renderWrongPage() {
  const wrongSet  = loadSet(KEY_WRONG);
  const wrongWords = allWords.filter(w => wrongSet.has(w.id));
  const list = document.getElementById('wrong-list');
  const empty = document.getElementById('wrong-empty');
  const practiceWrap = document.getElementById('wrong-practice-wrap');

  list.innerHTML = '';

  if (wrongWords.length === 0) {
    empty.style.display = 'block';
    practiceWrap.style.display = 'none';
  } else {
    empty.style.display = 'none';
    practiceWrap.style.display = 'block';

    wrongWords.forEach(word => {
      const li = document.createElement('li');
      li.className = 'wrong-item';
      li.innerHTML = `
        <div class="wrong-item-left">
          <div class="wrong-sv">${word.sv}</div>
          <div class="wrong-zh">${word.zh}</div>
        </div>
        <div class="wrong-item-tags">
          <span class="tag tag-level">${word.level}</span>
          <span class="tag tag-type">${word.type}</span>
        </div>`;
      list.appendChild(li);
    });
  }
}

function clearWrong() {
  if (!confirm('确定清空错题本吗？')) return;
  saveSet(KEY_WRONG, new Set());
  renderWrongPage();
  renderDashboard();
}

/* ══════════════════════════════════════
   8. 页面跳转快捷函数
══════════════════════════════════════ */
function backToDashboard() {
  renderDashboard();
  showPage('page-dashboard');
}

function startStudy() {
  const level = loadLevel();
  isPracticeWrong = false;
  studyList = buildStudyList(level);
  currentIndex = 0;

  if (studyList.length === 0) {
    alert('该等级暂无单词，请选择其他等级。');
    return;
  }

  // 重置卡片区域（防止上次 finish 覆盖）
  resetCardArea();
  document.getElementById('study-mode-label').textContent = level === 'all' ? '全部' : level;
  showPage('page-study');
  renderCard();
}

function startPracticeWrong() {
  isPracticeWrong = true;
  studyList = buildWrongList();
  currentIndex = 0;

  if (studyList.length === 0) {
    alert('错题本为空！');
    return;
  }

  resetCardArea();
  document.getElementById('study-mode-label').textContent = '错题练习';
  showPage('page-study');
  renderCard();
}

function resetCardArea() {
  // 恢复卡片 HTML（以防被 showFinish 替换）
  const cardArea = document.querySelector('.card-area');
  cardArea.innerHTML = `
    <div class="flip-card" id="flip-card">
      <div class="flip-card-inner" id="flip-card-inner">
        <div class="flip-front card">
          <div class="card-tags">
            <span class="tag tag-level" id="card-level-tag">A1</span>
            <span class="tag tag-type" id="card-type-tag">名词</span>
          </div>
          <div class="card-word" id="card-word"></div>
          <button class="btn-speak" id="btn-speak-word" title="朗读单词">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            朗读
          </button>
          <button class="btn-reveal" id="btn-reveal">显示答案 ↓</button>
        </div>
        <div class="flip-back card">
          <div class="card-tags">
            <span class="tag tag-level" id="card-level-tag-back">A1</span>
            <span class="tag tag-type" id="card-type-tag-back">名词</span>
          </div>
          <div class="card-word-back" id="card-word-back"></div>
          <div class="answer-block">
            <div class="answer-zh" id="answer-zh"></div>
            <div class="answer-fr" id="answer-fr"></div>
          </div>
          <div class="example-block">
            <div class="example-row">
              <button class="btn-speak-sm" id="btn-speak-example">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </button>
              <p class="example-sv" id="example-sv"></p>
            </div>
            <p class="example-zh" id="example-zh"></p>
            <p class="example-fr" id="example-fr"></p>
          </div>
        </div>
      </div>
    </div>`;

  // 重新绑定卡片内按钮事件
  bindCardEvents();
}

/* ══════════════════════════════════════
   9. 事件绑定
══════════════════════════════════════ */
function bindCardEvents() {
  document.getElementById('btn-reveal')?.addEventListener('click', () => {
    if (!isFlipped) revealCard();
  });
  document.getElementById('btn-speak-word')?.addEventListener('click', () => {
    const w = studyList[currentIndex];
    if (w) speak(w.sv);
  });
  document.getElementById('btn-speak-example')?.addEventListener('click', () => {
    const w = studyList[currentIndex];
    if (w) speak(w.example_sv);
  });
}

function bindAllEvents() {
  // Dashboard 按钮
  document.getElementById('btn-start').addEventListener('click', startStudy);
  document.getElementById('btn-wrong').addEventListener('click', () => {
    renderWrongPage();
    showPage('page-wrong');
  });

  // 等级筛选
  document.getElementById('level-pills').addEventListener('click', e => {
    if (e.target.classList.contains('pill')) {
      saveLevel(e.target.dataset.level);
      renderDashboard();
    }
  });

  // 学习页返回
  document.getElementById('btn-back-study').addEventListener('click', backToDashboard);

  // 判断按钮
  document.getElementById('btn-know').addEventListener('click', handleKnow);
  document.getElementById('btn-dont-know').addEventListener('click', handleDontKnow);

  // 错题本页
  document.getElementById('btn-back-wrong').addEventListener('click', () => {
    renderDashboard();
    showPage('page-dashboard');
  });
  document.getElementById('btn-clear-wrong').addEventListener('click', clearWrong);
  document.getElementById('btn-practice-wrong').addEventListener('click', startPracticeWrong);

  // 卡片内按钮（初始绑定）
  bindCardEvents();
}

/* ══════════════════════════════════════
   10. 初始化：加载 words.json
══════════════════════════════════════ */
async function init() {
  try {
    const resp = await fetch('words.json');
    if (!resp.ok) throw new Error('无法加载 words.json');
    allWords = await resp.json();
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `<div style="padding:40px;text-align:center;color:#c0392b">
      <h2>❌ 加载失败</h2>
      <p>请确保 words.json 与 index.html 在同一目录，并通过本地服务器（如 Live Server）打开。</p>
    </div>`;
    return;
  }

  bindAllEvents();
  renderDashboard();
  showPage('page-dashboard');
}

// 启动
init();
