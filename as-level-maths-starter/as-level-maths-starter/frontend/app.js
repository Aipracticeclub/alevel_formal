// D owns frontend behavior; E owns the visual styling in styles.css.
const PAGE_SIZE = 20;

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const syllabusInput = document.querySelector("#syllabus");
const difficultySelect = document.querySelector("#difficulty");
const resultsList = document.querySelector("#results");
const resultsCount = document.querySelector("#results-count");
const message = document.querySelector("#message");
const pagination = document.querySelector("#pagination");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const pageIndicator = document.querySelector("#page-indicator");

let currentOffset = 0;
let activeRequest;
let submittedQuery = "";
let submittedSyllabus = "";
let submittedDifficulty = "";

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submittedQuery = queryInput.value.trim();
  submittedSyllabus = syllabusInput.value.trim();
  submittedDifficulty = difficultySelect.value;
  currentOffset = 0;
  loadQuestions();
});

previousButton.addEventListener("click", () => {
  currentOffset = Math.max(0, currentOffset - PAGE_SIZE);
  loadQuestions();
});

nextButton.addEventListener("click", () => {
  currentOffset += PAGE_SIZE;
  loadQuestions();
});

function makeQuestionCard(question) {
  const item = document.createElement("li");
  item.className = "question-card";
  const metadata = document.createElement("p");
  metadata.className = "question-meta";
  metadata.textContent = `${question.syllabus} · ${question.difficulty}`;
  const heading = document.createElement("h2");
  heading.className = "question-text";
  heading.textContent = question.question;
  const answer = document.createElement("details");
  answer.className = "answer-details";
  const summary = document.createElement("summary");
  summary.textContent = "Show answer";
  const answerText = document.createElement("p");
  answerText.className = "answer-text";
  answerText.textContent = question.answer;
  answer.append(summary, answerText);
  item.append(metadata, heading, answer);
  return item;
}

async function loadQuestions() {
  if (activeRequest) activeRequest.abort();
  const controller = new AbortController();
  activeRequest = controller;
  const params = new URLSearchParams({
    q: submittedQuery,
    syllabus: submittedSyllabus,
    difficulty: submittedDifficulty,
    limit: String(PAGE_SIZE),
    offset: String(currentOffset),
  });

  resultsList.replaceChildren();
  resultsCount.textContent = "";
  message.className = "message is-loading";
  message.textContent = "Loading questions…";
  pagination.hidden = true;

  try {
    const response = await fetch(`/api/questions?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (controller.signal.aborted || activeRequest !== controller) return;
    if (!response.ok) {
      throw new Error(data?.error?.message || "Questions could not be loaded.");
    }
    if (!Array.isArray(data.items) || typeof data.total !== "number") {
      throw new Error("The server returned an unexpected response.");
    }

    resultsCount.textContent = `${data.total} ${data.total === 1 ? "question" : "questions"}`;
    if (data.items.length === 0) {
      message.className = "message";
      message.textContent = "No questions found. Try another search.";
      return;
    }

    message.className = "message";
    message.textContent = "";
    resultsList.replaceChildren(...data.items.map(makeQuestionCard));
    const lastOffset = Math.max(0, Math.ceil(data.total / PAGE_SIZE) - 1) * PAGE_SIZE;
    pagination.hidden = data.total <= PAGE_SIZE;
    previousButton.disabled = currentOffset <= 0;
    nextButton.disabled = currentOffset >= lastOffset;
    pageIndicator.textContent = `Page ${Math.floor(currentOffset / PAGE_SIZE) + 1} of ${Math.max(1, Math.ceil(data.total / PAGE_SIZE))}`;
  } catch (error) {
    if (error.name === "AbortError" || controller.signal.aborted || activeRequest !== controller) return;
    resultsCount.textContent = "";
    message.className = "message is-error";
    message.textContent = error.message || "A network error occurred. Please try again.";
  } finally {
    if (activeRequest === controller) activeRequest = undefined;
  }
}

loadQuestions();
