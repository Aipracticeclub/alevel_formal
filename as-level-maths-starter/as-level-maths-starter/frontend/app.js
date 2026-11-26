// Frontend behaviour for the IGCSE Computer Science question bank.
// Owned by role D: page structure, search, practice and the local record board.
// Appearance lives in styles.css (role E).

const PAGE_SIZE = 20;
const STORAGE_KEY = "igcse-cs-attempts-v1";
const MAX_ATTEMPTS = 400;
const VIEWS = ["home", "practice", "profile", "ai"];

// ---------- element lookups ----------

const tabs = [...document.querySelectorAll(".tab")];

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const syllabusInput = document.querySelector("#syllabus");
const difficultyInputs = [...document.querySelectorAll('input[name="difficulty"]')];
const clearButton = document.querySelector("#clear-filters");
const resultsList = document.querySelector("#results");
const resultsCount = document.querySelector("#results-count");
const message = document.querySelector("#message");
const pagination = document.querySelector("#pagination");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const pageButtons = document.querySelector("#page-buttons");

const statTotal = document.querySelector('[data-stat="total"]');
const statPositions = document.querySelector('[data-stat="positions"]');
const statAccuracy = document.querySelector('[data-stat="accuracy"]');
const statError = document.querySelector('[data-stat="error"]');

const todaySyllabus = document.querySelector("#today-syllabus");
const todayDifficulty = document.querySelector("#today-difficulty");
const todayQuestion = document.querySelector("#today-question");
const todayPractice = document.querySelector("#today-practice");
const positionChips = document.querySelector("#position-chips");

const accuracyRing = document.querySelector("#accuracy-ring");
const accuracyValue = document.querySelector("#accuracy-value");
const errorRate = document.querySelector("#error-rate");
const recordNote = document.querySelector("#record-note");
const recentAttempts = document.querySelector("#recent-attempts");
const recentEmpty = document.querySelector("#recent-empty");

const practiceSetup = document.querySelector("#practice-setup");
const practiceTopic = document.querySelector("#practice-topic");
const practiceDifficultyInputs = [...document.querySelectorAll('input[name="practice-difficulty"]')];
const practiceCountInputs = [...document.querySelectorAll('input[name="practice-count"]')];
const practiceAvailability = document.querySelector("#practice-availability");
const practiceSession = document.querySelector("#practice-session");
const practiceMessage = document.querySelector("#practice-message");
const sessionProgress = document.querySelector("#session-progress");
const sessionScore = document.querySelector("#session-score");
const sessionSyllabus = document.querySelector("#session-syllabus");
const sessionDifficulty = document.querySelector("#session-difficulty");
const sessionQuestion = document.querySelector("#session-question");
const sessionAnswer = document.querySelector("#session-answer");
const sessionAnswerBox = practiceSession.querySelector(".answer");
const sessionEnd = document.querySelector("#session-end");
const markRight = document.querySelector("#mark-right");
const markWrong = document.querySelector("#mark-wrong");
const markSkip = document.querySelector("#mark-skip");
const practiceSummary = document.querySelector("#practice-summary");
const summaryLine = document.querySelector("#summary-line");
const summaryNote = document.querySelector("#summary-note");
const summaryAgain = document.querySelector("#summary-again");

const profileRing = document.querySelector("#profile-ring");
const profileAccuracy = document.querySelector("#profile-accuracy");
const profileError = document.querySelector("#profile-error");
const profileNote = document.querySelector("#profile-note");
const profileAttempts = document.querySelector("#profile-attempts");
const profileCorrect = document.querySelector("#profile-correct");
const profileWrong = document.querySelector("#profile-wrong");
const profileSeen = document.querySelector("#profile-seen");
const topicList = document.querySelector("#topic-list");
const topicEmpty = document.querySelector("#topic-empty");
const attemptHistory = document.querySelector("#attempt-history");
const historyEmpty = document.querySelector("#history-empty");
const clearHistory = document.querySelector("#clear-history");

const aiForm = document.querySelector("#ai-form");
const aiInput = document.querySelector("#ai-input");
const aiStatus = document.querySelector("#ai-status");
const aiResult = document.querySelector("#ai-result");
const aiQuestion = document.querySelector("#ai-question");
const aiAnswer = document.querySelector("#ai-answer");
const aiClear = document.querySelector("#ai-clear");

// ---------- state ----------

const state = { query: "", syllabus: "", difficulty: "", offset: 0 };
let bank = [];            // up to 100 questions, used for topics, the day card and matching
let activeRequest;
let debounceTimer;
let session = null;       // { items, index, correct, wrong }
let todayTopic = "";

// ---------- storage ----------

// The project has no login and no write API, so the record lives in this browser.
function readAttempts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((entry) => entry && typeof entry.id === "string") : [];
  } catch {
    return [];
  }
}

function writeAttempts(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_ATTEMPTS)));
  } catch {
    /* storage disabled or full: the page still works, it just forgets */
  }
}

function addAttempt(entry) {
  const list = readAttempts();
  list.push(entry);
  writeAttempts(list);
  renderRecord();
  renderProfile();
}

function summarise(list) {
  const total = list.length;
  const correct = list.filter((entry) => entry.correct).length;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
  return {
    total,
    correct,
    wrong: total - correct,
    accuracy,
    error: total === 0 ? 0 : 100 - accuracy,
    seen: new Set(list.map((entry) => entry.id)).size,
  };
}

// ---------- routing ----------

function currentView() {
  const name = window.location.hash.replace("#", "").split("?")[0];
  return VIEWS.includes(name) ? name : "home";
}

function showView(view) {
  for (const name of VIEWS) {
    const element = document.querySelector(`#view-${name}`);
    if (element) element.hidden = name !== view;
  }
  for (const tab of tabs) {
    if (tab.dataset.tab === view) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  if (view === "profile") renderProfile();
  if (view === "practice") updateAvailability();
}

function handleRoute() {
  const view = currentView();
  showView(view);
  const name = window.location.hash.replace("#", "");
  // In-page anchors such as #questions are handled by the browser itself.
  if (VIEWS.includes(name)) window.scrollTo(0, 0);
}

// ---------- shared helpers ----------

function difficultyLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function makeTag(text, className) {
  const tag = document.createElement("span");
  tag.className = className;
  tag.textContent = text;
  return tag;
}

// Highlighting builds text nodes rather than assigning innerHTML, so question
// text from the database can never become markup.
function highlightedText(text, needle) {
  const fragment = document.createDocumentFragment();
  if (!needle) {
    fragment.append(document.createTextNode(text));
    return fragment;
  }
  const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) fragment.append(document.createTextNode(text.slice(cursor, match.index)));
    const mark = document.createElement("mark");
    mark.textContent = match[0];
    fragment.append(mark);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
  return fragment;
}

function showMessage(text, kind, target = message) {
  target.textContent = text;
  target.className = `message${kind ? ` is-${kind}` : ""}`;
}

function shortDate(iso) {
  const date = new Date(iso);
  // Fixed locale keeps the dates consistent with the English interface.
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

// ---------- home: search ----------

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  state.query = (params.get("q") || "").slice(0, 200);
  state.syllabus = (params.get("syllabus") || "").slice(0, 120);
  const difficulty = params.get("difficulty") || "";
  state.difficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "";
  const offset = Number(params.get("offset"));
  state.offset = Number.isInteger(offset) && offset > 0 ? offset : 0;
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.syllabus) params.set("syllabus", state.syllabus);
  if (state.difficulty) params.set("difficulty", state.difficulty);
  if (state.offset > 0) params.set("offset", String(state.offset));
  const search = params.toString();
  const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== currentUrl) window.history.replaceState(null, "", next);
}

function syncInputsFromState() {
  queryInput.value = state.query;
  syllabusInput.value = state.syllabus;
  for (const input of difficultyInputs) input.checked = input.value === state.difficulty;
}

function makeCard(item, needle) {
  const card = document.createElement("li");
  card.className = "question-card";

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.append(
    makeTag(item.syllabus, "tag tag-syllabus"),
    makeTag(difficultyLabel(item.difficulty), `tag tag-${item.difficulty}`),
  );

  const text = document.createElement("h3");
  text.className = "question-text";
  text.append(highlightedText(item.question, needle));

  const details = document.createElement("details");
  details.className = "answer";
  const summary = document.createElement("summary");
  summary.textContent = "Show answer";
  const answer = document.createElement("p");
  answer.className = "answer-text";
  answer.textContent = item.answer;
  details.append(summary, answer);

  card.append(meta, text, details);
  return card;
}

function pageNumbers(current, pages) {
  const wanted = new Set([1, pages, current - 1, current, current + 1]);
  const sorted = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous && n - previous > 1) out.push("gap");
    out.push(n);
    previous = n;
  }
  return out;
}

function goToPage(page) {
  state.offset = (page - 1) * PAGE_SIZE;
  loadQuestions();
}

function updatePagination(total) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.floor(state.offset / PAGE_SIZE) + 1;
  pagination.hidden = total <= PAGE_SIZE;
  previousButton.disabled = current <= 1;
  nextButton.disabled = current >= pages;

  pageButtons.replaceChildren(...pageNumbers(current, pages).map((entry) => {
    if (entry === "gap") {
      const gap = document.createElement("span");
      gap.className = "page-gap";
      gap.textContent = "…";
      return gap;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-num";
    button.textContent = String(entry);
    if (entry === current) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => goToPage(entry));
    return button;
  }));
}

async function loadQuestions() {
  if (activeRequest) activeRequest.abort();
  const controller = new AbortController();
  activeRequest = controller;

  const params = new URLSearchParams({
    q: state.query,
    syllabus: state.syllabus,
    difficulty: state.difficulty,
    limit: String(PAGE_SIZE),
    offset: String(state.offset),
  });

  showMessage("Loading questions…", "loading");
  resultsList.replaceChildren();
  pagination.hidden = true;

  try {
    const response = await fetch(`/api/questions?${params}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (controller.signal.aborted || activeRequest !== controller) return;
    if (!response.ok) throw new Error(data?.error?.message || "Questions could not be loaded.");
    if (!Array.isArray(data.items) || typeof data.total !== "number") {
      throw new Error("The server returned an unexpected response.");
    }

    resultsCount.textContent = data.total === 0
      ? "no matches"
      : `${data.total} ${data.total === 1 ? "question" : "questions"}`;

    if (data.items.length === 0) {
      showMessage(state.query || state.syllabus || state.difficulty
        ? "Nothing matched those filters. Try a shorter keyword or reset the filters."
        : "The bank is empty. Import questions first.", "");
      writeStateToUrl();
      return;
    }

    showMessage("", "");
    resultsList.replaceChildren(...data.items.map((item) => makeCard(item, state.query)));
    updatePagination(data.total);
    writeStateToUrl();
  } catch (error) {
    if (error.name === "AbortError" || controller.signal.aborted || activeRequest !== controller) return;
    resultsCount.textContent = "";
    showMessage(error.message || "A network error occurred. Please try again.", "error");
  } finally {
    if (activeRequest === controller) activeRequest = undefined;
  }
}

// ---------- home: bank overview, day card, topic chips ----------

async function loadBank() {
  try {
    const response = await fetch("/api/questions?limit=100&offset=0", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data.items) || typeof data.total !== "number") return;
    bank = data.items;

    const topics = [...new Set(bank.map((item) => item.syllabus))];
    statTotal.textContent = String(data.total);
    statPositions.textContent = data.total > bank.length ? `${topics.length}+` : String(topics.length);

    renderToday();
    renderPositions();
    fillTopicSelect(topics);
    practiceAvailability.textContent = `${data.total} questions available`;
  } catch {
    statTotal.textContent = "—";
    statPositions.textContent = "—";
    practiceAvailability.textContent = "The bank could not be loaded.";
  }
}

// Deterministic daily rotation: same question for everyone on a given day.
function renderToday() {
  if (bank.length === 0) {
    todayQuestion.textContent = "No questions in the bank yet.";
    return;
  }
  const dayIndex = Math.floor(Date.now() / 86400000) % bank.length;
  const item = bank[dayIndex];
  todayTopic = item.syllabus;
  todaySyllabus.textContent = item.syllabus;
  todayDifficulty.className = `tag tag-${item.difficulty}`;
  todayDifficulty.textContent = difficultyLabel(item.difficulty);
  todayQuestion.textContent = item.question;
}

function renderPositions() {
  const counts = new Map();
  for (const item of bank) counts.set(item.syllabus, (counts.get(item.syllabus) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);

  positionChips.replaceChildren(...top.map(([name]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "position-chip";
    button.textContent = name;
    button.addEventListener("click", () => applySyllabusFilter(name));
    return button;
  }));
}

function applySyllabusFilter(name) {
  state.query = "";
  state.syllabus = name;
  state.difficulty = "";
  state.offset = 0;
  syncInputsFromState();
  loadQuestions();
  document.querySelector("#questions")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- home: record board ----------

function attemptRow(entry, { withTopic = true } = {}) {
  const row = document.createElement("li");
  row.className = "attempt";
  row.dataset.result = entry.correct ? "correct" : "wrong";

  const head = document.createElement("div");
  head.className = "attempt-head";
  head.append(
    makeTag(entry.correct ? "Correct" : "Wrong", `tag ${entry.correct ? "tag-easy" : "tag-hard"}`),
  );
  if (withTopic) head.append(makeTag(entry.syllabus, "tag tag-syllabus"));
  const date = document.createElement("span");
  date.className = "attempt-date";
  date.textContent = shortDate(entry.at);
  head.append(date);

  const text = document.createElement("p");
  text.className = "attempt-text";
  text.textContent = entry.question;

  row.append(head, text);
  return row;
}

function renderRecord() {
  const list = readAttempts();
  const stats = summarise(list);

  accuracyValue.textContent = `${stats.accuracy}%`;
  accuracyRing.style.setProperty("--value", String(stats.accuracy));
  errorRate.textContent = `Error rate ${stats.error}%`;
  statAccuracy.textContent = stats.total === 0 ? "—" : `${stats.accuracy}%`;
  statError.textContent = stats.total === 0 ? "—" : `${stats.error}%`;

  recordNote.textContent = stats.total === 0
    ? "No attempts yet. Start a practice set to build your record."
    : `${stats.correct} correct out of ${stats.total} attempts across ${stats.seen} different questions.`;

  const recent = [...list].reverse().slice(0, 4);
  recentAttempts.replaceChildren(...recent.map((entry) => attemptRow(entry)));
  recentEmpty.hidden = recent.length > 0;
}

// ---------- practice ----------

function fillTopicSelect(topics) {
  const current = practiceTopic.value;
  practiceTopic.replaceChildren(
    new Option("All topics", ""),
    ...topics.map((name) => new Option(name, name)),
  );
  practiceTopic.value = topics.includes(current) ? current : "";
}

function checkedValue(inputs) {
  return inputs.find((input) => input.checked)?.value || "";
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function updateAvailability() {
  if (bank.length === 0) return;
  const topic = practiceTopic.value;
  const difficulty = checkedValue(practiceDifficultyInputs);
  const count = bank.filter((item) => (!topic || item.syllabus === topic)
    && (!difficulty || item.difficulty === difficulty)).length;
  practiceAvailability.textContent = count === 0
    ? "No questions match those filters."
    : `${count} question${count === 1 ? "" : "s"} match — a set is drawn at random.`;
}

async function startSet(event) {
  event.preventDefault();
  const topic = practiceTopic.value;
  const difficulty = checkedValue(practiceDifficultyInputs);
  const wanted = Number(checkedValue(practiceCountInputs) || "10");

  const pool = bank.filter((item) => (!topic || item.syllabus === topic)
    && (!difficulty || item.difficulty === difficulty));

  if (pool.length === 0) {
    showMessage("No questions match those filters. Try another topic or difficulty.", "error", practiceMessage);
    return;
  }

  showMessage("", "", practiceMessage);
  session = { items: shuffle(pool).slice(0, Math.min(wanted, pool.length)), index: 0, correct: 0, wrong: 0 };

  practiceSetup.hidden = true;
  practiceSummary.hidden = true;
  practiceSession.hidden = false;
  renderSession();
}

function renderSession() {
  if (!session) return;
  const item = session.items[session.index];
  sessionAnswerBox.open = false;
  sessionSyllabus.textContent = item.syllabus;
  sessionDifficulty.className = `tag tag-${item.difficulty}`;
  sessionDifficulty.textContent = difficultyLabel(item.difficulty);
  sessionQuestion.textContent = item.question;
  sessionAnswer.textContent = item.answer;
  sessionProgress.textContent = `Question ${session.index + 1} of ${session.items.length}`;
  sessionScore.textContent = `${session.correct} correct · ${session.wrong} wrong`;
}

function markCurrent(correct) {
  if (!session) return;
  const item = session.items[session.index];
  addAttempt({
    id: item.id,
    syllabus: item.syllabus,
    difficulty: item.difficulty,
    question: item.question,
    correct,
    at: new Date().toISOString(),
  });

  if (correct) session.correct += 1;
  else session.wrong += 1;

  session.index += 1;
  if (session.index >= session.items.length) finishSession();
  else renderSession();
}

function finishSession() {
  if (!session) return;
  practiceSession.hidden = true;
  practiceSummary.hidden = false;
  const answered = session.correct + session.wrong;
  summaryLine.textContent = `${session.correct} of ${answered} correct`;
  summaryNote.textContent = answered === 0
    ? "You ended the set before marking any questions."
    : `Error rate for this set: ${Math.round((session.wrong / answered) * 100)}%.`;
  session = null;
}

function resetPractice() {
  session = null;
  practiceSession.hidden = true;
  practiceSummary.hidden = true;
  practiceSetup.hidden = false;
  updateAvailability();
}

// ---------- profile ----------

function renderProfile() {
  const list = readAttempts();
  const stats = summarise(list);

  profileAccuracy.textContent = `${stats.accuracy}%`;
  profileRing.style.setProperty("--value", String(stats.accuracy));
  profileError.textContent = `Error rate ${stats.error}%`;
  profileNote.textContent = stats.total === 0
    ? "No attempts yet. Practise a set and this page fills in."
    : `${stats.correct} correct of ${stats.total} attempts.`;
  profileAttempts.textContent = String(stats.total);
  profileCorrect.textContent = String(stats.correct);
  profileWrong.textContent = String(stats.wrong);
  profileSeen.textContent = String(stats.seen);

  const byTopic = new Map();
  for (const entry of list) {
    const row = byTopic.get(entry.syllabus) || { correct: 0, total: 0 };
    row.total += 1;
    if (entry.correct) row.correct += 1;
    byTopic.set(entry.syllabus, row);
  }

  const rows = [...byTopic.entries()]
    .map(([name, row]) => ({
      name,
      total: row.total,
      accuracy: Math.round((row.correct / row.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);

  topicList.replaceChildren(...rows.map((row) => {
    const item = document.createElement("li");
    item.className = "topic-row";

    const label = document.createElement("span");
    label.className = "topic-name";
    label.textContent = row.name;

    const bar = document.createElement("span");
    bar.className = "topic-bar";
    const fill = document.createElement("i");
    fill.style.width = `${row.accuracy}%`;
    fill.dataset.level = row.accuracy < 50 ? "low" : row.accuracy < 80 ? "mid" : "high";
    bar.append(fill);

    const value = document.createElement("span");
    value.className = "topic-value";
    value.textContent = `${row.accuracy}% · ${row.total}`;

    item.append(label, bar, value);
    return item;
  }));
  topicEmpty.hidden = rows.length > 0;

  const history = [...list].reverse().slice(0, 12);
  attemptHistory.replaceChildren(...history.map((entry) => attemptRow(entry)));
  historyEmpty.hidden = history.length > 0;
  clearHistory.disabled = list.length === 0;
}

// ---------- AI panel ----------

// No model is called from the browser: matching against the bank is the honest
// stand-in until a server endpoint holds the key.
function findClosestQuestion(text) {
  const words = new Set((text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => word.length > 2));
  if (words.size === 0) return null;

  let best = null;
  let bestScore = 0;
  for (const item of bank) {
    const itemWords = new Set((item.question.toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) => word.length > 2));
    let hits = 0;
    for (const word of words) if (itemWords.has(word)) hits += 1;
    const score = hits / words.size;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= 0.45 ? best : null;
}

function handleAiSubmit(event) {
  event.preventDefault();
  const text = aiInput.value.trim();
  if (!text) {
    aiStatus.textContent = "Type a question first.";
    aiResult.hidden = true;
    return;
  }

  const match = findClosestQuestion(text);
  if (!match) {
    aiStatus.textContent = "No close match in the bank. Live model answers are not connected yet.";
    aiResult.hidden = true;
    return;
  }

  aiStatus.textContent = `Closest question in the bank: ${match.syllabus} · ${difficultyLabel(match.difficulty)}.`;
  aiQuestion.textContent = match.question;
  aiAnswer.textContent = match.answer;
  aiResult.hidden = false;
}

// ---------- events ----------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(debounceTimer);
  state.query = queryInput.value.trim();
  state.syllabus = syllabusInput.value.trim();
  state.difficulty = checkedValue(difficultyInputs);
  state.offset = 0;
  loadQuestions();
});

queryInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.query = queryInput.value.trim();
    state.offset = 0;
    loadQuestions();
  }, 280);
});

syllabusInput.addEventListener("change", () => {
  state.syllabus = syllabusInput.value.trim();
  state.offset = 0;
  loadQuestions();
});

for (const input of difficultyInputs) {
  input.addEventListener("change", () => {
    state.difficulty = input.value;
    state.offset = 0;
    loadQuestions();
  });
}

clearButton.addEventListener("click", () => {
  state.query = "";
  state.syllabus = "";
  state.difficulty = "";
  state.offset = 0;
  syncInputsFromState();
  loadQuestions();
});

previousButton.addEventListener("click", () => goToPage(Math.max(1, Math.floor(state.offset / PAGE_SIZE))));
nextButton.addEventListener("click", () => goToPage(Math.floor(state.offset / PAGE_SIZE) + 2));

todayPractice.addEventListener("click", () => {
  if (todayTopic) {
    window.location.hash = "#home";
    applySyllabusFilter(todayTopic);
  }
});

practiceTopic.addEventListener("change", updateAvailability);
for (const input of [...practiceDifficultyInputs, ...practiceCountInputs]) {
  input.addEventListener("change", updateAvailability);
}

practiceSetup.addEventListener("submit", startSet);
markRight.addEventListener("click", () => markCurrent(true));
markWrong.addEventListener("click", () => markCurrent(false));
markSkip.addEventListener("click", () => {
  if (!session) return;
  session.index += 1;
  if (session.index >= session.items.length) finishSession();
  else renderSession();
});
sessionEnd.addEventListener("click", finishSession);
summaryAgain.addEventListener("click", resetPractice);

clearHistory.addEventListener("click", () => {
  if (!window.confirm("Clear every attempt stored in this browser?")) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
  renderRecord();
  renderProfile();
});

aiForm.addEventListener("submit", handleAiSubmit);
aiClear.addEventListener("click", () => {
  aiInput.value = "";
  aiStatus.textContent = "";
  aiResult.hidden = true;
});

window.addEventListener("hashchange", handleRoute);
window.addEventListener("popstate", () => {
  readStateFromUrl();
  syncInputsFromState();
  loadQuestions();
});

// ---------- start ----------

readStateFromUrl();
syncInputsFromState();
handleRoute();
renderRecord();
renderProfile();
loadBank();
loadQuestions();
