/* more-info.js - MORE.JIZZ */

(function () {
  'use strict';

  const CATEGORY_ORDER = ['director', 'executive', 'senior', 'icon'];
  const CATEGORY_LABEL = { director: 'Director', executive: 'Executives', senior: 'Seniors', icon: 'Icons' };

  const CHEVRON_DOWN_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3,5 8,11 13,5"/>
  </svg>`;

  async function fetchJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
    return response.json();
  }

  function normaliseImgPath(p) {
    if (!p) return '';
    return p.startsWith('/') ? p : '/' + p;
  }

  function renderRules(rules) {
    const container = document.getElementById('rules-list');
    if (!container) return;
    container.innerHTML = '';
    rules.forEach((rule, index) => {
      const item = document.createElement('li');
      item.className = 'rule-card';
      item.innerHTML = `
        <div class="rule-number">${index + 1}</div>
        <div class="rule-text">${escapeHTML(rule.text)}</div>
      `;
      container.appendChild(item);
    });
  }

  function renderTeam(members) {
    const container = document.getElementById('team-section');
    if (!container) return;

    const grouped = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
    members.forEach(member => {
      const cat = member.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(member);
    });

    container.innerHTML = '';

    CATEGORY_ORDER.forEach(category => {
      const group = grouped[category];
      if (!group || group.length === 0) return;

      const section = document.createElement('div');
      section.className = 'team-category';
      section.innerHTML = `
        <div class="team-category-header">
          <h3 class="team-category-name">${escapeHTML(CATEGORY_LABEL[category] || category)}</h3>
          <hr class="team-category-line"/>
          <span class="team-category-count">${group.length}</span>
        </div>
        <div class="members-grid" data-category="${escapeHTML(category)}"></div>
      `;

      const grid = section.querySelector('.members-grid');
      group.forEach(member => grid.appendChild(buildMemberCard(member)));
      container.appendChild(section);
    });
  }

  function buildMemberCard(member) {
    const card = document.createElement('div');
    card.className = 'member-card';

    const avatarSrc = normaliseImgPath(member.avatar);
    const bannerBg = member.banner
      ? `background-image: url('${escapeAttr(normaliseImgPath(member.banner))}'); background-size: cover; background-position: center;`
      : '';

    card.innerHTML = `
      <div class="member-banner" style="${bannerBg}"></div>
      <div class="member-avatar-wrap">
        <img class="member-avatar" src="${escapeAttr(avatarSrc)}" alt="${escapeAttr(member.name)}" loading="lazy"/>
      </div>
      <div class="member-info">
        <div class="member-name">${escapeHTML(member.name)}</div>
        <div class="member-role">${escapeHTML(member.role || '')}</div>
        ${member.bio_short ? `<p class="member-bio">${escapeHTML(member.bio_short)}</p>` : ''}
        <button class="member-more-btn" tabindex="0">More info</button>
      </div>
    `;

    const btn = card.querySelector('.member-more-btn');
    btn.addEventListener('click', () => openMemberOverlay(member));

    return card;
  }

  function openMemberOverlay(member) {
    const backdrop = document.getElementById('member-overlay-backdrop');
    const content  = document.getElementById('member-overlay-content');
    const closeBtn = document.getElementById('member-overlay-close');
    if (!backdrop || !content) return;

    const avatarSrc = normaliseImgPath(member.avatar);
    const bannerBg = member.banner
      ? `background-image: url('${escapeAttr(normaliseImgPath(member.banner))}'); background-size: cover; background-position: center;`
      : '';

    content.innerHTML = `
      <div class="member-overlay-banner" style="${bannerBg}"></div>
      <div class="member-overlay-avatar-wrap">
        <img class="member-overlay-avatar" src="${escapeAttr(avatarSrc)}" alt="${escapeAttr(member.name)}"/>
      </div>
      <div class="member-overlay-body">
        <div class="member-overlay-name">${escapeHTML(member.name)}</div>
        <div class="member-overlay-role">${escapeHTML(member.role || '')}</div>
        <p class="member-overlay-bio">${escapeHTML(member.bio_long || member.bio_short || '')}</p>
      </div>
    `;

    backdrop.hidden = false;
    document.body.classList.add('overlay-open');
    if (closeBtn) closeBtn.focus();
  }

  function closeMemberOverlay() {
    const backdrop = document.getElementById('member-overlay-backdrop');
    if (!backdrop) return;
    backdrop.hidden = true;
    document.body.classList.remove('overlay-open');
  }

  function initOverlayControls() {
    const backdrop = document.getElementById('member-overlay-backdrop');
    const closeBtn = document.getElementById('member-overlay-close');
    if (!backdrop) return;
    closeBtn && closeBtn.addEventListener('click', closeMemberOverlay);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeMemberOverlay(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !backdrop.hidden) closeMemberOverlay(); });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  async function init() {
    initOverlayControls();
    try {
      const [rules, members] = await Promise.all([
        fetchJSON('/assets/data/rules.json'),
        fetchJSON('/assets/data/members.json'),
      ]);
      renderRules(rules);
      renderTeam(members);
    } catch (err) {
      console.error('[more-info.js] Failed to load data:', err);
      const rulesContainer = document.getElementById('rules-list');
      if (rulesContainer) {
        rulesContainer.innerHTML = '<li class="load-error">Could not load rules. Please try again later.</li>';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
