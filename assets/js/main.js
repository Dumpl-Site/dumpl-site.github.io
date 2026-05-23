/* main.js - where the magic happens */

function openInvite() {
  window.open('https://discord.gg/uRfdUZSFq3', '_blank', 'noopener,noreferrer');
}

/* hhhhhaamburgerr */
(function () {
  const hamburger = document.getElementById('nav-hamburger');
  const overlay   = document.getElementById('nav-overlay');
  if (!hamburger || !overlay) return;

  function openMenu() {
    overlay.classList.add('open');
    overlay.removeAttribute('aria-hidden');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  window.closeMenu = closeMenu;

  hamburger.addEventListener('click', function () {
    overlay.classList.contains('open') ? closeMenu() : openMenu();
  });

  overlay.querySelectorAll('.nav-overlay-link').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeMenu();
  });
})();

/* feet */
(function () {
  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var SOCIAL_ICONS = {
    discord: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7c0 0-1.5 0-2.5 1S3 11 3 11s1 1.5 3 2l1-1.5"/><path d="M11 7c0 0 1.5 0 2.5 1S15 11 15 11s-1 1.5-3 2l-1-1.5"/><ellipse cx="6.5" cy="9.5" rx="1" ry="1"/><ellipse cx="11.5" cy="9.5" rx="1" ry="1"/><path d="M6 5.5C6.8 4.5 8 4 9 4s2.2.5 3 1.5"/><path d="M6 12.5C7 13.5 9 14 9 14s2-0.5 3-1.5"/></svg>',
    twitter:  '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h3l3.5 5L13 3h3l-5.5 7L16 15h-3l-3.5-5L5 15H2l5.5-7L2 3z"/></svg>',
    instagram:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="14" height="14" rx="4"/><circle cx="9" cy="9" r="3"/><circle cx="13" cy="5" r="0.5" fill="currentColor"/></svg>',
    youtube:  '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="14" height="10" rx="3"/><path d="M7 7l5 2-5 2V7z" fill="currentColor" stroke="none"/></svg>',
    github:   '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2a7 7 0 0 0-2.21 13.64c.35.06.48-.15.48-.34v-1.2c-1.95.42-2.36-.94-2.36-.94-.32-.81-.78-1.03-.78-1.03-.64-.44.05-.43.05-.43.7.05 1.07.72 1.07.72.62 1.07 1.63.76 2.03.58.06-.45.24-.76.44-.93-1.56-.18-3.2-.78-3.2-3.47 0-.77.27-1.39.72-1.88-.07-.18-.31-.89.07-1.85 0 0 .59-.19 1.92.72A6.67 6.67 0 0 1 9 5.8c.59 0 1.19.08 1.75.23 1.33-.91 1.92-.72 1.92-.72.38.96.14 1.67.07 1.85.45.49.72 1.11.72 1.88 0 2.7-1.64 3.29-3.21 3.46.25.22.48.65.48 1.31v1.94c0 .19.13.4.48.34A7 7 0 0 0 9 2z"/></svg>',
    twitch:   '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2H16v9l-4 4h-3l-2 2v-2H3V2z"/><line x1="7" y1="6" x2="7" y2="10"/><line x1="11" y1="6" x2="11" y2="10"/></svg>',
  };

  var track   = document.getElementById('footer-socials-track');
  var prevBtn = document.getElementById('socials-prev');
  var nextBtn = document.getElementById('socials-next');
  if (!track) return;

  fetch('/assets/data/socials.json')
    .then(function (r) { return r.json(); })
    .catch(function () { return null; })
    .then(function (socials) {
      if (!socials || !socials.length) return;

      socials.forEach(function (s) {
        var a = document.createElement('a');
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'social-btn';
        a.setAttribute('aria-label', s.name);
        if (s.icon) {
          var img = document.createElement('img');
          img.src = '/' + s.icon;
          img.alt = s.name;
          img.width = 18;
          img.height = 18;
          a.appendChild(img);
        } else {
          a.innerHTML = SOCIAL_ICONS[s.name.toLowerCase()] || SOCIAL_ICONS.github;
        }
        track.appendChild(a);
      });

      initCarousel();
    });

  function initCarousel() {
    function checkOverflow() {
      var isOverflowing = track.scrollWidth > track.parentElement.offsetWidth - 80;
      if (isOverflowing) {
        track.style.overflowX = 'auto';
        track.style.scrollBehavior = 'smooth';
        prevBtn && prevBtn.classList.remove('hidden');
        nextBtn && nextBtn.classList.remove('hidden');
        updateArrows();
      } else {
        prevBtn && prevBtn.classList.add('hidden');
        nextBtn && nextBtn.classList.add('hidden');
      }
    }

    function updateArrows() {
      if (!prevBtn || !nextBtn) return;
      prevBtn.classList.toggle('hidden', track.scrollLeft <= 0);
      nextBtn.classList.toggle('hidden', track.scrollLeft + track.clientWidth >= track.scrollWidth - 2);
    }

    if (prevBtn) prevBtn.addEventListener('click', function () {
      track.scrollLeft -= 120;
      setTimeout(updateArrows, 300);
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      track.scrollLeft += 120;
      setTimeout(updateArrows, 300);
    });

    track.addEventListener('scroll', updateArrows);

    var autoTimer = null;
    function startAuto() {
      autoTimer = setInterval(function () {
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) {
          track.scrollLeft = 0;
        } else {
          track.scrollLeft += 1;
        }
        updateArrows();
      }, 30);
    }
    function stopAuto() { clearInterval(autoTimer); }

    track.addEventListener('mouseenter', stopAuto);
    track.addEventListener('mouseleave', startAuto);

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
  }
})();

/* STAAAAATUS */
(function () {
  var onlineEl  = document.getElementById('stat-online');
  var membersEl = document.getElementById('stat-members');
  if (!onlineEl && !membersEl) return;

  fetch('https://discord.com/api/v9/invites/uRfdUZSFq3?with_counts=true')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (onlineEl && data.approximate_presence_count != null) {
        onlineEl.textContent = data.approximate_presence_count.toLocaleString();
      }
      if (membersEl && data.approximate_member_count != null) {
        membersEl.textContent = data.approximate_member_count.toLocaleString();
      }
    })
    .catch(function () {
    });
})();
