const state = document.querySelector('#article-state');
const article = document.querySelector('#article');
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async () => {
  try {
    const response = await fetch(`news.json?story=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error('Briefing unavailable');
    const data = await response.json();
    const story = (data.stories || []).find(s => String(s.id) === new URLSearchParams(location.search).get('id'));
    if (!story) throw new Error('This story is no longer in today’s briefing.');
    const englishTitle = story.englishTitle || (/^english$/i.test(story.language || '') ? story.title : '');
    if (!englishTitle) throw new Error('The English translation is not available yet.');
    const fullEnglishBody = story.englishBody?.trim() || '';
    const englishExcerpt = story.englishSummary?.trim() || '';
    const englishBody = fullEnglishBody || englishExcerpt;
    const translationNote = document.querySelector('#article-translation-note');
    translationNote.textContent = fullEnglishBody
      ? (story.articleTranslationStatus === 'source-english' ? 'Full article text in English.' : 'Full article text translated locally into English.')
      : 'The full article text could not be retrieved or translated. Please click the link below to read the original story.';
    document.title = `${englishTitle} — Belgium Brief`;
    document.querySelector('#article-title').textContent = englishTitle;
    document.querySelector('#article-meta').textContent = `${story.source || 'Belgium Brief'} · ${story.publishedAt ? new Date(story.publishedAt).toLocaleString() : ''}`;
    document.querySelector('#article-body').innerHTML = englishBody ? String(englishBody).split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('') : '';
    const vocabulary = Array.isArray(story.dutchWords) ? story.dutchWords.slice(0, 10) : [];
    document.querySelector('#dutch-vocabulary-list').innerHTML = vocabulary.length
      ? vocabulary.map(({ word, meaning }) => `<div class="vocabulary-entry"><dt>${esc(word || '')}</dt><dd>${esc(meaning || '')}</dd></div>`).join('')
      : '<div class="vocabulary-empty">Dutch vocabulary is not available for this story yet. Run Setup Local Translation.bat and prepare the briefing again.</div>';
    let sourceUrl = ''; try { const u = new URL(story.publisherLink || story.link); if (u.protocol === 'https:') sourceUrl = u.href; } catch {}
    document.querySelector('#original-source').innerHTML = sourceUrl
      ? `<span class="original-label">Original article:</span><a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">Read at ${esc(story.source || 'the publisher')}</a>`
      : '<span class="original-label">Original article:</span><span>Publisher link is unavailable.</span>';
    state.hidden = true; article.hidden = false;
  } catch (error) { state.textContent = error.message || 'Could not load this story.'; }
})();
