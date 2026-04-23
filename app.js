let allWords = [];
let queue = [];
let currentIndex = 0;

const wordEl = document.getElementById("word");
const zhEl = document.getElementById("zh");
const frEl = document.getElementById("fr");
const themeBadge = document.getElementById("theme-badge");
const typeBadge = document.getElementById("type-badge");
const answer = document.getElementById("answer");
const showBtn = document.getElementById("show-btn");
const speakBtn = document.getElementById("speak-btn");
const knownBtn = document.getElementById("known-btn");
const unknownBtn = document.getElementById("unknown-btn");
const progressText = document.getElementById("progress-text");
const barFill = document.getElementById("bar-fill");
const totalCount = document.getElementById("total-count");
const doneCount = document.getElementById("done-count");
const wrongCount = document.getElementById("wrong-count");
const sessionGoalCount = document.getElementById("session-goal-count");
const goalSelect = document.getElementById("goal-select");
const themeSelect = document.getElementById("theme-select");
const searchInput = document.getElementById("search-input");
const startBtn = document.getElementById("start-btn");
const wrongPracticeBtn = document.getElementById("wrong-practice-btn");
const wrongList = document.getElementById("wrong-list");
const clearWrongBtn = document.getElementById("clear-wrong-btn");
const resetBtn = document.getElementById("reset-btn");
const exportBtn = document.getElementById("export-btn");
const noteBox = document.getElementById("note-box");
const exampleBox = document.getElementById("example-box");
const exSv = document.getElementById("ex-sv");
const exZh = document.getElementById("ex-zh");
const exFr = document.getElementById("ex-fr");

function getArray(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function setArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadWords() {
  const response = await fetch("words.json");
  allWords = await response.json();

  totalCount.textContent = allWords.length;
  buildThemeOptions();
  buildQueue();
  updateWrongList();
}

function buildThemeOptions() {
  const themes = [...new Set(allWords.map(w => w.theme || "other"))].sort();
  themes.forEach(theme => {
    const option = document.createElement("option");
    option.value = theme;
    option.textContent = theme;
    themeSelect.appendChild(option);
  });
}

function filteredWords() {
  const theme = themeSelect.value;
  const keyword = searchInput.value.trim().toLowerCase();

  return allWords.filter(w => {
    const themeOk = theme === "all" || w.theme === theme;
    const text = `${w.sv} ${w.zh} ${w.fr} ${w.type} ${w.theme}`.toLowerCase();
    const searchOk = keyword === "" || text.includes(keyword);
    return themeOk && searchOk;
  });
}

function buildQueue() {
  const goal = goalSelect.value;
  const base = shuffle(filteredWords());
  queue = goal === "all" ? base : base.slice(0, Number(goal));
  currentIndex = 0;
  sessionGoalCount.textContent = queue.length;
  showCurrent();
  updateStats();
}

function showCurrent() {
  if (queue.length === 0) {
    wordEl.textContent = "没有匹配词条";
    zhEl.textContent = "";
    frEl.textContent = "";
    themeBadge.textContent = "-";
    typeBadge.textContent = "-";
    answer.classList.add("hidden");
    progressText.textContent = "0 / 0";
    barFill.style.width = "0%";
    return;
  }

  if (currentIndex >= queue.length) {
    wordEl.textContent = "本轮完成";
    answer.classList.add("hidden");
    progressText.textContent = `${queue.length} / ${queue.length}`;
    barFill.style.width = "100%";
    updateStats();
    return;
  }

  const w = queue[currentIndex];
  wordEl.textContent = w.sv;
  zhEl.textContent = w.zh;
  frEl.textContent = w.fr;
  themeBadge.textContent = w.theme || "general";
  typeBadge.textContent = w.type || "词条";

  if (w.note) {
    noteBox.textContent = w.note;
    noteBox.classList.remove("hidden");
  } else {
    noteBox.classList.add("hidden");
  }

  if (w.example_sv || w.example_zh || w.example_fr) {
    exSv.textContent = w.example_sv || "";
    exZh.textContent = w.example_zh || "";
    exFr.textContent = w.example_fr || "";
    exampleBox.classList.remove("hidden");
  } else {
    exampleBox.classList.add("hidden");
  }

  answer.classList.add("hidden");
  const done = currentIndex;
  progressText.textContent = `${currentIndex + 1} / ${queue.length}`;
  barFill.style.width = `${(done / queue.length) * 100}%`;
  updateStats();
}

function updateStats() {
  doneCount.textContent = Math.min(currentIndex, queue.length);
  wrongCount.textContent = getArray("nordordMixWrong").length;
}

function showAnswer() {
  answer.classList.remove("hidden");
}

function speak(text) {
  if (!window.speechSynthesis) {
    alert("当前浏览器不支持语音朗读。");
    return;
  }

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "sv-SE";
  u.rate = 0.86;
  speechSynthesis.speak(u);
}

function markKnown() {
  if (currentIndex >= queue.length) return;
  const w = queue[currentIndex];
  const known = getArray("nordordMixKnown");
  if (!known.includes(w.id)) {
    known.push(w.id);
    setArray("nordordMixKnown", known);
  }
  currentIndex++;
  showCurrent();
}

function markUnknown() {
  if (currentIndex >= queue.length) return;
  const w = queue[currentIndex];
  const wrong = getArray("nordordMixWrong");
  if (!wrong.includes(w.id)) {
    wrong.push(w.id);
    setArray("nordordMixWrong", wrong);
  }
  currentIndex++;
  updateWrongList();
  showCurrent();
}

function updateWrongList() {
  const wrongIds = getArray("nordordMixWrong");
  const wrongWords = allWords.filter(w => wrongIds.includes(w.id));
  wrongCount.textContent = wrongWords.length;

  if (wrongWords.length === 0) {
    wrongList.className = "list empty";
    wrongList.textContent = "还没有错题。";
    return;
  }

  wrongList.className = "list";
  wrongList.innerHTML = "";
  wrongWords.slice(-80).reverse().forEach(w => {
    const item = document.createElement("div");
    item.className = "wrong-item";
    item.innerHTML = `<strong>${w.sv}</strong><span>${w.zh} / ${w.fr}</span>`;
    wrongList.appendChild(item);
  });
}

function practiceWrong() {
  const wrongIds = getArray("nordordMixWrong");
  queue = shuffle(allWords.filter(w => wrongIds.includes(w.id)));
  currentIndex = 0;
  sessionGoalCount.textContent = queue.length;
  showCurrent();
}

function clearWrong() {
  localStorage.removeItem("nordordMixWrong");
  updateWrongList();
  updateStats();
}

function resetAll() {
  if (!confirm("确定要重置所有学习进度和错题本吗？")) return;
  localStorage.removeItem("nordordMixKnown");
  localStorage.removeItem("nordordMixWrong");
  buildQueue();
  updateWrongList();
}

function exportProgress() {
  const data = {
    known: getArray("nordordMixKnown"),
    wrong: getArray("nordordMixWrong"),
    exported_at: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nordord-progress.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

showBtn.addEventListener("click", showAnswer);
speakBtn.addEventListener("click", () => {
  if (currentIndex < queue.length) speak(queue[currentIndex].sv);
});
knownBtn.addEventListener("click", markKnown);
unknownBtn.addEventListener("click", markUnknown);
startBtn.addEventListener("click", buildQueue);
wrongPracticeBtn.addEventListener("click", practiceWrong);
clearWrongBtn.addEventListener("click", clearWrong);
resetBtn.addEventListener("click", resetAll);
exportBtn.addEventListener("click", exportProgress);
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") buildQueue();
});

loadWords();
