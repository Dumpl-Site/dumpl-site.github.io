/* gallery.js - i wonder if ill find any child p- */

(function () {
  'use strict';

  var allItems      = [];
  var filteredItems = [];
  var visibleCount  = 12;
  var PAGE_SIZE     = 12;
  var activeType    = 'all';
  var activeTag     = 'all';

  var lightboxItems = [];
  var lightboxIndex = 0;

  /* one plays at a time */
  var currentAudio  = null;

  /* are you a SUB or a DOM, this here is pretty DOM */
  var gridEl       = document.getElementById('gallery-grid');
  var loadMoreWrap = document.getElementById('gallery-load-more-wrap');
  var loadMoreBtn  = document.getElementById('gallery-load-more');

  /* green lantern */
  var lbBackdrop   = document.getElementById('lightbox-backdrop');
  var lbClose      = document.getElementById('lightbox-close');
  var lbPrev       = document.getElementById('lightbox-prev');
  var lbNext       = document.getElementById('lightbox-next');
  var lbImg        = document.getElementById('lightbox-img');
  var lbCaption    = document.getElementById('lightbox-caption');
  var lbMeta       = document.getElementById('lightbox-meta');
  var lbDownload   = document.getElementById('lightbox-download');

  /* #expansion */
  var expBackdrop  = document.getElementById('gallery-expand-backdrop');
  var expPanel     = document.getElementById('gallery-expand-panel');
  var expContent   = document.getElementById('gallery-expand-content');
  var expClose     = document.getElementById('gallery-expand-close');

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function tagClass(tag) { return 'tag-' + (tag || 'general'); }
  function tagLabel(tag) {
    var m = { milestone: 'Milestone', event: 'Event', notable: 'Notable', funnies: 'Funnies', general: 'General' };
    return m[tag] || tag || 'General';
  }

  function formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    var m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* lay those bricks like a good little mason */
  function buildGrid() {
    gridEl.innerHTML = '';
    lightboxItems = filteredItems.filter(function (it) { return it.type === 'image' || it.type === 'gif'; });

    var toShow = filteredItems.slice(0, visibleCount);

    toShow.forEach(function (item, idx) {
      var card = buildCard(item, idx);
      gridEl.appendChild(card);
    });

    /* GIVE ME YOUR LOAD */
    if (filteredItems.length > visibleCount) {
      loadMoreWrap.style.display = '';
    } else {
      loadMoreWrap.style.display = 'none';
    }
  }

  function buildCard(item, idx) {
    var wrap = document.createElement('div');
    wrap.className = 'gallery-card';

    var mediaHtml = '';

    if (item.type === 'image' || item.type === 'gif') {
      mediaHtml = '<div class="gallery-card-media gallery-card-media--image">'
        + '<img src="' + escHtml(item.src) + '" alt="' + escHtml(item.caption || '') + '" loading="lazy" class="gallery-img-clickable">'
        + '</div>';

    } else if (item.type === 'video') {
      mediaHtml = '<div class="gallery-card-media gallery-card-media--video">'
        + '<video class="gallery-video" src="' + escHtml(item.src) + '" preload="metadata" tabindex="-1"></video>'
        + '<div class="video-controls-overlay">'
        + '<button class="video-play-btn" aria-label="Play video">'
        + '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>'
        + '</button>'
        + '<div class="video-scrubber-wrap">'
        + '<input type="range" class="video-scrubber" min="0" max="100" value="0" step="0.1">'
        + '</div>'
        + '</div>'
        + '</div>';

    } else if (item.type === 'audio') {
      mediaHtml = '<div class="gallery-card-media gallery-card-media--audio">'
        + '<div class="audio-cover-square">'
        + '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="20" cy="20" r="14"/><circle cx="20" cy="20" r="5"/>'
        + '</svg>'
        + '</div>'
        + '<audio class="gallery-audio-el" src="' + escHtml(item.src) + '" preload="metadata"></audio>'
        + '<div class="audio-controls">'
        + '<button class="audio-play-btn" aria-label="Play">'
        + '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>'
        + '</button>'
        + '<div class="audio-scrubber-wrap">'
        + '<input type="range" class="audio-scrubber" min="0" max="100" value="0" step="0.1">'
        + '</div>'
        + '<span class="audio-time">0:00</span>'
        + '</div>'
        + '</div>';

    } else if (item.type === 'file') {
      mediaHtml = '<div class="gallery-card-media gallery-card-media--file">'
        + '<div class="file-icon-box">'
        + '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M5 3h12l6 6v16H5V3z"/><path d="M17 3v6h6"/>'
        + '</svg>'
        + '</div>'
        + '<p class="file-name">' + escHtml(item.filename || '') + '</p>'
        + (item.preview ? '<pre class="file-preview">' + escHtml(item.preview) + '</pre>' : '')
        + '</div>';
    }

    /* tag, youre it (can be an array) */
    var tags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : ['general']);
    var tagsHtml = tags.map(function (t) {
      return '<span class="tag-badge ' + tagClass(t) + '">' + tagLabel(t) + '</span>';
    }).join(' ');

    /* do you like feet? heres a footer */
    var metaHtml = '<div class="gallery-card-footer">'
      + '<p class="gallery-caption">' + escHtml(item.caption || '') + '</p>'
      + '<p class="gallery-meta">by ' + escHtml(item.uploader || 'Unknown') + ' &middot; ' + formatDate(item.date) + '</p>'
      + '<div class="gallery-card-tags">' + tagsHtml + '</div>'
      + '<div class="gallery-card-actions">'
      + '<button class="gallery-expand-btn" aria-label="Expand">'
      + '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M1 5V1h4M10 1h4v4M14 10v4h-4M5 14H1v-4"/>'
      + '</svg>'
      + '</button>'
      + (item.src && item.src !== '#'
          ? '<button class="gallery-download-btn" aria-label="Download">'
            + '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M7.5 2v7M4 6l3.5 3.5L11 6"/><path d="M2 12h11"/>'
            + '</svg>'
            + '</button>'
          : '')
      + '</div>'
      + '</div>';

    wrap.innerHTML = mediaHtml + metaHtml;

    /* kinky */
    bindCardEvents(wrap, item);

    return wrap;
  }

  /* a bit of bondage here and there didnt hurt anyone */
  function bindCardEvents(wrap, item) {
    var imgEl = wrap.querySelector('.gallery-img-clickable');
    if (imgEl) {
      imgEl.style.cursor = 'pointer';
      imgEl.addEventListener('click', function () {
        var lbIdx = lightboxItems.indexOf(item);
        if (lbIdx === -1) lbIdx = 0;
        openLightbox(lbIdx);
      });
    }

    /* no auto-play so no one-handed browsing */
    var videoEl  = wrap.querySelector('.gallery-video');
    var playBtn  = wrap.querySelector('.video-play-btn');
    var scrubber = wrap.querySelector('.video-scrubber');
    if (videoEl && playBtn) {
      playBtn.addEventListener('click', function () {
        if (videoEl.paused) {
          videoEl.play();
          playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><rect x="4" y="3" width="4" height="14"/><rect x="12" y="3" width="4" height="14"/></svg>';
        } else {
          videoEl.pause();
          playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>';
        }
      });
      if (scrubber) {
        videoEl.addEventListener('timeupdate', function () {
          if (videoEl.duration) scrubber.value = (videoEl.currentTime / videoEl.duration) * 100;
        });
        scrubber.addEventListener('input', function () {
          if (videoEl.duration) videoEl.currentTime = (scrubber.value / 100) * videoEl.duration;
        });
      }
    }

    /* audio controls */
    var audioEl    = wrap.querySelector('.gallery-audio-el');
    var aPlayBtn   = wrap.querySelector('.audio-play-btn');
    var aScrubber  = wrap.querySelector('.audio-scrubber');
    var aTimeEl    = wrap.querySelector('.audio-time');
    if (audioEl && aPlayBtn) {
      aPlayBtn.addEventListener('click', function () {
        /* cuck the other audios */
        if (currentAudio && currentAudio !== audioEl) {
          currentAudio.pause();
          var otherPlay = currentAudio.parentElement && currentAudio.parentElement.querySelector('.audio-play-btn');
          if (otherPlay) otherPlay.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>';
        }
        if (audioEl.paused) {
          audioEl.play();
          currentAudio = audioEl;
          aPlayBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><rect x="4" y="3" width="4" height="14"/><rect x="12" y="3" width="4" height="14"/></svg>';
        } else {
          audioEl.pause();
          aPlayBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>';
        }
      });
      if (aScrubber) {
        audioEl.addEventListener('timeupdate', function () {
          if (audioEl.duration) {
            aScrubber.value = (audioEl.currentTime / audioEl.duration) * 100;
            if (aTimeEl) aTimeEl.textContent = formatTime(audioEl.currentTime) + ' / ' + formatTime(audioEl.duration);
          }
        });
        aScrubber.addEventListener('input', function () {
          if (audioEl.duration) audioEl.currentTime = (aScrubber.value / 100) * audioEl.duration;
        });
      }
    }

    /* #expansion 2.0 */
    var expandBtn = wrap.querySelector('.gallery-expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', function () {
        openExpand(item);
      });
    }

    var dlBtn = wrap.querySelector('.gallery-download-btn');
    if (dlBtn && item.src && item.src !== '#') {
      dlBtn.addEventListener('click', function () {
        var filename = item.filename || item.src.split('/').pop().split('?')[0] || 'download';
        fetch(item.src)
          .then(function (r) { return r.blob(); })
          .then(function (blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          })
          .catch(function () { window.open(item.src, '_blank'); });
      });
    }
  }

  /* green lantern intensifies */
  function openLightbox(idx) {
    lightboxIndex = idx;
    renderLightbox();
    lbBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lbBackdrop.hidden = true;
    document.body.style.overflow = '';
  }

  function renderLightbox() {
    var item = lightboxItems[lightboxIndex];
    if (!item) return;
    lbImg.src = item.src;
    lbImg.alt = item.caption || '';
    lbCaption.textContent = item.caption || '';
    lbMeta.textContent = 'by ' + (item.uploader || 'Unknown') + ' · ' + formatDate(item.date);
    if (lbDownload) {
      lbDownload.href = item.src;
    }

    if (lbPrev) lbPrev.style.display = lightboxItems.length > 1 ? '' : 'none';
    if (lbNext) lbNext.style.display = lightboxItems.length > 1 ? '' : 'none';
  }

  if (lbClose)    lbClose.addEventListener('click', closeLightbox);
  if (lbBackdrop) {
    lbBackdrop.addEventListener('click', function (e) {
      if (e.target === lbBackdrop) closeLightbox();
    });
  }
  if (lbPrev) {
    lbPrev.addEventListener('click', function () {
      lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length;
      renderLightbox();
    });
  }
  if (lbNext) {
    lbNext.addEventListener('click', function () {
      lightboxIndex = (lightboxIndex + 1) % lightboxItems.length;
      renderLightbox();
    });
  }

  /* MORE EXPANSION */
  function openExpand(item) {
    var tags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : ['general']);
    var tagsHtml = tags.map(function (t) {
      return '<span class="tag-badge ' + tagClass(t) + '">' + tagLabel(t) + '</span>';
    }).join(' ');

    var mediaHtml = buildExpandMedia(item);

    expContent.innerHTML =
      '<div class="overlay-header">'
      + tagsHtml
      + '<p class="overlay-date">' + escHtml(item.uploader || 'Unknown') + ' &middot; ' + formatDate(item.date) + '</p>'
      + '</div>'
      + (item.caption ? '<h2 class="overlay-title">' + escHtml(item.caption) + '</h2>' : '')
      + '<div class="expand-media-wrap">' + mediaHtml + '</div>';

    var audioEl   = expContent.querySelector('.gallery-audio-el');
    var aPlayBtn  = expContent.querySelector('.audio-play-btn');
    var aScrubber = expContent.querySelector('.audio-scrubber');
    var aTimeEl   = expContent.querySelector('.audio-time');
    if (audioEl && aPlayBtn) {
      aPlayBtn.addEventListener('click', function () {
        if (audioEl.paused) {
          audioEl.play();
          aPlayBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><rect x="4" y="3" width="4" height="14"/><rect x="12" y="3" width="4" height="14"/></svg>';
        } else {
          audioEl.pause();
          aPlayBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>';
        }
      });
      if (aScrubber) {
        audioEl.addEventListener('timeupdate', function () {
          if (audioEl.duration) {
            aScrubber.value = (audioEl.currentTime / audioEl.duration) * 100;
            if (aTimeEl) aTimeEl.textContent = formatTime(audioEl.currentTime) + ' / ' + formatTime(audioEl.duration);
          }
        });
        aScrubber.addEventListener('input', function () {
          if (audioEl.duration) audioEl.currentTime = (aScrubber.value / 100) * audioEl.duration;
        });
      }
    }

    expBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function buildExpandMedia(item) {
    if (item.type === 'image' || item.type === 'gif') {
      return '<img src="' + escHtml(item.src) + '" alt="' + escHtml(item.caption || '') + '" style="width:100%;border-radius:8px;">';
    }
    if (item.type === 'video') {
      return '<video src="' + escHtml(item.src) + '" controls style="width:100%;border-radius:8px;"></video>';
    }
    if (item.type === 'audio') {
      return '<div class="audio-cover-square" style="width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--color-bg);border-radius:8px;margin-bottom:12px;">'
        + '<svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="30" cy="30" r="22"/><circle cx="30" cy="30" r="7"/></svg>'
        + '</div>'
        + '<audio class="gallery-audio-el" src="' + escHtml(item.src) + '" preload="metadata"></audio>'
        + '<div class="audio-controls">'
        + '<button class="audio-play-btn" aria-label="Play">'
        + '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>'
        + '</button>'
        + '<div class="audio-scrubber-wrap"><input type="range" class="audio-scrubber" min="0" max="100" value="0" step="0.1"></div>'
        + '<span class="audio-time">0:00</span>'
        + '</div>';
    }
    if (item.type === 'file') {
      return '<div class="file-icon-box" style="margin-bottom:12px;">'
        + '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 4h16l8 8v20H6V4z"/><path d="M22 4v8h8"/></svg>'
        + '</div>'
        + '<p class="file-name">' + escHtml(item.filename || '') + '</p>'
        + (item.preview ? '<pre class="file-preview" style="max-height:200px;">' + escHtml(item.preview) + '</pre>' : '');
    }
    return '';
  }

  function closeExpand() {
    expBackdrop.hidden = true;
    expContent.innerHTML = '';
    document.body.style.overflow = '';
  }

  if (expClose)    expClose.addEventListener('click', closeExpand);
  if (expBackdrop) {
    expBackdrop.addEventListener('click', function (e) {
      if (e.target === expBackdrop) closeExpand();
    });
  }

  /* keyboard */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!lbBackdrop.hidden) closeLightbox();
      if (!expBackdrop.hidden) closeExpand();
    }
    if (!lbBackdrop.hidden) {
      if (e.key === 'ArrowLeft') {
        lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length;
        renderLightbox();
      }
      if (e.key === 'ArrowRight') {
        lightboxIndex = (lightboxIndex + 1) % lightboxItems.length;
        renderLightbox();
      }
    }
  });

  /* where is the "mommy" tag? */
  function applyFilters() {
    visibleCount = PAGE_SIZE;
    filteredItems = allItems.filter(function (item) {
      var typeMatch = activeType === 'all' || item.type === activeType;
      var tags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : ['general']);
      var tagMatch  = activeTag === 'all' || tags.indexOf(activeTag) !== -1;
      return typeMatch && tagMatch;
    });
    buildGrid();
  }

  document.querySelectorAll('.filter-btn[data-type]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn[data-type]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeType = btn.dataset.type;
      applyFilters();
    });
  });

  document.querySelectorAll('.filter-btn[data-tag]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn[data-tag]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeTag = btn.dataset.tag;
      applyFilters();
    });
  });

  /* I WANT MORE LOADS */
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      visibleCount += PAGE_SIZE;
      buildGrid();
    });
  }

  /*
                                ..,,,,,,,,,..
                      .,;%%%%%%%%%%%%%%%%%%%%;,.
                    %%%%%%%%%%%%%%%%%%%%////%%%%%%, .,;%%;,
              .,;%/,%%%%%/////%%%%%%%%%%%%%%////%%%%,%%//%%%,
          .,;%%%%/,%%%///%%%%%%%%%%%%%%%%%%%%%%%%%%%%,////%%%%;,
      .,%%%%%%//,%%%%%%%%%%%%%%%%@@%a%%%%%%%%%%%%%%%%,%%/%%%%%%%;,
    .,%//%%%%//,%%%%///////%%%%%%%@@@%%%%%%///////%%%%,%%//%%%%%%%%,
  ,%%%%%///%%//,%%//%%%%%///%%%%%@@@%%%%%////%%%%%%%%%,/%%%%%%%%%%%%%
  .%%%%%%%%%////,%%%%%%%//%///%%%%@@@@%%%////%%/////%%%,/;%%%%%%%%/%%%
  %/%%%%%%%/////,%%%%///%%////%%%@@@@@%%%///%%/%%%%%//%,////%%%%//%%%'
  %//%%%%%//////,%/%a`  'a%///%%%@@@@@@%%////a`  'a%%%%,//%///%/%%%%%
  %///%%%%%%///,%%%%@@aa@@%//%%%@@@@S@@@%%///@@aa@@%%%%%,/%////%%%%%
  %%//%%%%%%%//,%%%%%///////%%%@S@@@@SS@@@%%/////%%%%%%%,%////%%%%%'
  %%//%%%%%%%//,%%%%/////%%@%@SS@@@@@@@S@@@@%%%%/////%%%,////%%%%%'
  `%/%%%%//%%//,%%%///%%%%@@@S@@@@@@@@@@@@@@@S%%%%////%%,///%%%%%'
    %%%%//%%%%/,%%%%%%%%@@@@@@@@@@@@@@@@@@@@@SS@%%%%%%%%,//%%%%%'
    `%%%//%%%%/,%%%%@%@@@@@@@@@@@@@@@@@@@@@@@@@S@@%%%%%,/////%%'
    `%%%//%%%/,%%%@@@SS@@SSs@@@@@@@@@@@@@sSS@@@@@@%%%,//%%//%'
      `%%%%%%/  %%S@@SS@@@@@Ss` .,,.    'sS@@@S@@@@%'  ///%/%'
        `%%%/    %SS@@@@SSS@@S.         .S@@SSS@@@@'    //%%'
                /`S@@@@@@SSSSSs,     ,sSSSSS@@@@@'
              %%//`@@@@@@@@@@@@@Ss,sS@@@@@@@@@@@'/
            %%%%@@00`@@@@@@@@@@@@@'@@@@@@@@@@@'//%%
        %%%%%%a%@@@@000aaaaaaaaa00a00aaaaaaa00%@%%%%%
      %%%%%%a%%@@@@@@@@@@000000000000000000@@@%@@%%%@%%%
  %%%%%%a%%@@@%@@@@@@@@@@@00000000000000@@@@@@@@@%@@%%@%%
  %%%aa%@@@@@@@@@@@@@@0000000000000000000000@@@@@@@@%@@@%%%%
  %%@@@@@@@@@@@@@@@00000000000000000000000000000@@@@@@@@@%%%%

  fetch innit */

  fetch('/assets/data/gallery.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      allItems = shuffle(data);
      applyFilters();
    })
    .catch(function (err) {
      console.error('Failed to load gallery.json:', err);
      gridEl.innerHTML = '<p style="color:var(--color-muted);padding:2rem;">Could not load gallery data.</p>';
    });

})();
