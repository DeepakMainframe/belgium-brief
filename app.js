const list = document.querySelector('#story-list');
const statusLine = document.querySelector('#feed-status');
const refreshButton = document.querySelector('#refresh-button');
const todayDate = document.querySelector('#today-date');
const genreFilters = document.querySelector('#genre-filters');
const genres = ['Politics', 'Sports', 'Business', 'Weather', 'Culture', 'Society', 'Other'];
let currentStories = [];
let activeGenre = 'All';
const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Brussels' });
todayDate.textContent = dateFormatter.format(new Date()).toUpperCase();

function escapeHtml(value = '') {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function safeStoryLink(value = '') {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const format = dateParts === todayParts
    ? { hour: 'numeric', minute: '2-digit' }
    : { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
  return new Intl.DateTimeFormat(undefined, { ...format, timeZone: 'Europe/Brussels' }).format(date);
}

function isEnglishStory(story) {
  return Boolean(story.englishTitle?.trim()) || /^english$/i.test(story.language || '');
}

function withoutPublisher(text, source) {
  let value = String(text || '').trim();
  const publisher = String(source || '').trim();
  if (publisher && value.toLocaleLowerCase().endsWith(publisher.toLocaleLowerCase())) {
    value = value.slice(0, -publisher.length).trim().replace(/[-–—:]+\s*$/, '').trim();
  }
  return value;
}

function summaryRepeatsHeadline(headline, summary, source) {
  const clean = (text) => withoutPublisher(text, source)
    .toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const headlineWords = new Set(clean(headline).split(/\s+/).filter(Boolean));
  const summaryWords = new Set(clean(summary).split(/\s+/).filter(Boolean));
  if (!headlineWords.size || !summaryWords.size) return false;
  const sharedWords = [...headlineWords].filter((word) => summaryWords.has(word)).length;
  const headlineCoverage = sharedWords / headlineWords.size;
  const relativeLength = summaryWords.size / headlineWords.size;
  return headlineCoverage >= 0.8 && relativeLength <= 1.4;
}

function renderStories(data) {
  const allStories = data.stories || [];
  currentStories = allStories.filter(isEnglishStory);
  const stories = currentStories;
  if (!stories.length) {
    genreFilters.hidden = true;
    const message = !data.updatedAt
      ? "The first daily news file has not been generated yet. Run Start Belgium Brief.bat, then reload this page."
      : allStories.length
        ? (data.translationMessage || "No English headline translations are available. Run Setup Local Translation.bat, then restart Start Belgium Brief.bat.")
        : "No full article text could be retrieved from today’s stories. Try again later.";
    list.innerHTML = `<li class="empty-state">${message}</li>`;
    return stories;
  }
  genreFilters.hidden = false;
  renderGenreFilters();
  renderSelectedStories();
  return stories;
}

function renderGenreFilters() {
  const counts = new Map(genres.map((genre) => [genre, 0]));
  currentStories.forEach((story) => {
    const category = genres.includes(story.category) ? story.category : 'Other';
    counts.set(category, counts.get(category) + 1);
  });
  genreFilters.innerHTML = ['All', ...genres].map((genre) => {
    const count = genre === 'All' ? currentStories.length : counts.get(genre);
    return `<button class="genre-filter${activeGenre === genre ? ' is-active' : ''}" type="button" data-genre="${genre}" aria-pressed="${activeGenre === genre}">${genre}<span class="genre-count">${count}</span></button>`;
  }).join('');
  genreFilters.querySelectorAll('.genre-filter').forEach((button) => {
    button.addEventListener('click', () => {
      activeGenre = button.dataset.genre;
      renderGenreFilters();
      renderSelectedStories();
    });
  });
}

function renderSelectedStories() {
  const stories = activeGenre === 'All'
    ? currentStories
    : currentStories.filter((story) => (genres.includes(story.category) ? story.category : 'Other') === activeGenre);
  if (!stories.length) {
    list.innerHTML = `<li class="empty-state">No readable ${escapeHtml(activeGenre.toLowerCase())} stories are available in the latest briefing.</li>`;
    return;
  }
  list.innerHTML = stories.map((story, index) => {
    const rawTitle = story.englishTitle || story.title || "";
    const title = escapeHtml(rawTitle);
    const summaryText = story.englishSummary?.trim() || "";
    const summaryIsDuplicate = summaryRepeatsHeadline(rawTitle, summaryText, story.source);
    const headline = story.id
      ? `<a class="story-title" href="story.html?id=${encodeURIComponent(story.id)}">${title}</a>`
      : `<span class="story-title">${title}</span>`;
    const summary = summaryText && !summaryIsDuplicate
      ? `<p class="story-summary">${escapeHtml(summaryText)}</p>`
      : "";
    return `
      <li class="story">
        <span class="story-number">${String(index + 1).padStart(2, '0')}</span>
        <div class="story-copy">
          ${headline}${summary}
          <div class="story-meta"><span class="story-source">${escapeHtml(story.source)}</span><span class="category-tag">${escapeHtml(story.category || 'Other')}</span><time class="story-time" datetime="${escapeHtml(story.publishedAt)}">${escapeHtml(relativeTime(story.publishedAt))}</time></div>
        </div>
      </li>`;
  }).join('');
}

async function loadStories() {
  refreshButton.disabled = true;
  statusLine.textContent = 'Loading the latest prepared briefing…';
  list.innerHTML = '';
  try {
    const response = await fetch(`news.json?refresh=${Date.now()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Briefing file returned ${response.status}`);
    const data = await response.json();
    renderStories(data);
    statusLine.textContent = '';
  } catch {
    list.innerHTML = '<li class="empty-state">The briefing file could not be loaded. Keep this page on the local preview server and try again.</li>';
    statusLine.textContent = 'Could not load the prepared briefing';
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener('click', loadStories);
loadStories();








