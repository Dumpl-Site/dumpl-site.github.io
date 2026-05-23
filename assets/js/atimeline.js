/* timeline.js - 5dchesswithmultiversetimetravel */

(function () {
  'use strict';

  var allItems       = [];
  var filteredItems  = [];
  var visibleCount   = 6;
  var PAGE_SIZE      = 6;
  var activeFilter   = 'all';

  var overlayItem    = null;
  var carouselIndex  = 0;

  /* we all need DOMs in our lives as SUBs (im actually a dom guys trust me) */
  var listEl        = document.getElementById('timeline-list');
  var loadMoreWrap  = document.getElementById('timeline-load-more-wrap');
  var loadMoreBtn   = document.getElementById('timeline-load-more');
  var filterBtns    = document.querySelectorAll('.timeline-filters .filter-btn');

  var cardBackdrop  = document.getElementById('card-fullscreen-backdrop');
  var cardPanel     = document.getElementById('card-fullscreen-panel');
  var cardContent   = document.getElementById('card-fullscreen-content');
  var cardClose     = document.getElementById('card-fullscreen-close');

  /* mmm raw back */
  var rawBackdrop   = document.getElementById('raw-media-backdrop');

  /* mmm raw inside */
  var rawInner      = document.getElementById('raw-media-inner');

  /* mmm its raw and im close */
  var rawClose      = document.getElementById('raw-media-close');

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function tagClass(tag) {
    return 'tag-' + (tag || 'general');
  }

  function tagLabel(tag) {
    var labels = {
      milestone: 'Milestone',
      event:     'Event',
      notable:   'Notable',
      general:   'General'
    };
    return labels[tag] || tag || 'General';
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function renderMediaSlide(item) {
    var t = item.type;
    if (t === 'image' || t === 'gif') {
      return '<img class="carousel-media-img" src="' + escHtml(item.src) + '" alt="' + escHtml(item.caption || '') + '" loading="lazy">';
    }
    if (t === 'video') {
      return '<video class="carousel-media-video" src="' + escHtml(item.src) + '" controls preload="metadata"></video>';
    }
    if (t === 'audio') {
      return '<div class="carousel-media-audio">'
        + '<audio id="carousel-audio-el" src="' + escHtml(item.src) + '" preload="metadata"></audio>'
        + '<div class="audio-cover-placeholder">'
        + '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="20" cy="20" r="16"/><circle cx="20" cy="20" r="5"/>'
        + '</svg>'
        + '</div>'
        + '<div class="audio-controls">'
        + '<button class="audio-play-btn" id="carousel-audio-play" aria-label="Play">'
        + '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>'
        + '</button>'
        + '<div class="audio-scrubber-wrap">'
        + '<input type="range" class="audio-scrubber" id="carousel-audio-scrubber" min="0" max="100" value="0" step="0.1">'
        + '</div>'
        + '<span class="audio-time" id="carousel-audio-time">0:00</span>'
        + '</div>'
        + '</div>';
    }
    return '<div class="carousel-media-file">'
      + '<div class="file-icon-box">'
      + '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M6 4h14l6 6v18H6V4z"/><path d="M20 4v6h6"/>'
      + '</svg>'
      + '</div>'
      + '<span class="file-name">' + escHtml(item.filename || item.src || 'file') + '</span>'
      + '</div>';
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function openCardOverlay(item) {
    overlayItem   = item;
    carouselIndex = 0;
    renderCardOverlay();
    cardBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    cardClose.focus();
  }

  function closeCardOverlay() {
    cardBackdrop.hidden = true;
    document.body.style.overflow = '';
    overlayItem = null;
  }

  function renderCardOverlay() {
    if (!overlayItem) return;
    var item  = overlayItem;
    var media = item.media || [];
    var hasMedia = media.length > 0;

    var html = '';

    /* no head? here you go */
    html += '<div class="overlay-header">';
    html += '<span class="tag-badge ' + tagClass(item.tag) + '">' + tagLabel(item.tag) + '</span>';
    html += '<p class="overlay-date">' + formatDate(item.date) + '</p>';
    html += '</div>';

    html += '<h2 class="overlay-title">' + escHtml(item.title) + '</h2>';
    html += '<p class="overlay-details">' + escHtml(item.details || item.description || '') + '</p>';

    /* i like carousels */
    if (hasMedia) {
      html += '<div class="carousel-wrap" id="card-carousel">';

      /* slide to the left, slide to the left, slide to the left, slide to the left, slide to the left (we aint ever gonna get to criss-cross), slide to the left... */
      html += '<div class="carousel-slide" id="carousel-slide">';
      html += renderMediaSlide(media[carouselIndex]);
      html += '</div>';

      html += '<p class="carousel-caption" id="carousel-caption">' + escHtml(media[carouselIndex].caption || '') + '</p>';

      html += '<div class="carousel-controls">';

      html += '<button class="carousel-arrow" id="carousel-prev" aria-label="Previous" ' + (media.length <= 1 ? 'disabled' : '') + '>'
        + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="10,3 5,8 10,13"/></svg>'
        + '</button>';

      html += '<span class="carousel-counter" id="carousel-counter">' + (media.length > 1 ? '1 / ' + media.length : '') + '</span>';

      html += '<button class="carousel-arrow" id="carousel-next" aria-label="Next" ' + (media.length <= 1 ? 'disabled' : '') + '>'
        + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6,3 11,8 6,13"/></svg>'
        + '</button>';

      /* i know what kind of man you are dexter morgan... i know you like expansion */
      html += '<button class="carousel-expand-btn" id="carousel-expand" aria-label="Fullscreen">'
        + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>'
        + '</svg>'
        + '</button>';

      html += '<button class="carousel-download-btn" id="carousel-download" aria-label="Download">'
        + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M8 2v8M4 7l4 4 4-4"/><path d="M2 13h12"/>'
        + '</svg>'
        + '</button>';

      html += '</div>';
      html += '</div>';
    }

    cardContent.innerHTML = html;

    if (hasMedia) {
      updateCarouselDownloadLink();
      bindCarouselEvents(media);
      bindAudioControls();
    }
  }

  function updateCarouselDownloadLink() {
    var dlBtn = document.getElementById('carousel-download');
    if (!dlBtn || !overlayItem) return;
    var media = overlayItem.media || [];
    var cur   = media[carouselIndex];

    var newBtn = dlBtn.cloneNode(true);
    dlBtn.parentNode.replaceChild(newBtn, dlBtn);

    if (cur && cur.src && cur.src !== '#') {
      newBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var filename = cur.filename || cur.src.split('/').pop().split('?')[0] || 'download';
        fetch(cur.src)
          .then(function (r) { return r.blob(); })
          .then(function (blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          })
          .catch(function () {
            window.open(cur.src, '_blank');
          });
      });
    }
  }

  function bindCarouselEvents(media) {
    var prevBtn     = document.getElementById('carousel-prev');
    var nextBtn     = document.getElementById('carousel-next');
    var expandBtn   = document.getElementById('carousel-expand');
    var counterEl   = document.getElementById('carousel-counter');
    var slideEl     = document.getElementById('carousel-slide');
    var captionEl   = document.getElementById('carousel-caption');

    function goTo(idx) {
      carouselIndex = (idx + media.length) % media.length;
      slideEl.innerHTML  = renderMediaSlide(media[carouselIndex]);
      captionEl.textContent = media[carouselIndex].caption || '';
      if (counterEl) counterEl.textContent = media.length > 1 ? (carouselIndex + 1) + ' / ' + media.length : '';
      updateCarouselDownloadLink();
      bindAudioControls();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(carouselIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(carouselIndex + 1); });

    if (expandBtn) {
      expandBtn.addEventListener('click', function () {
        openRawMedia(media[carouselIndex]);
      });
    }
  }

  function bindAudioControls() {
    var audioEl    = document.getElementById('carousel-audio-el');
    var playBtn    = document.getElementById('carousel-audio-play');
    var scrubber   = document.getElementById('carousel-audio-scrubber');
    var timeEl     = document.getElementById('carousel-audio-time');
    if (!audioEl) return;

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        if (audioEl.paused) {
          audioEl.play();
          playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><rect x="4" y="3" width="4" height="14"/><rect x="12" y="3" width="4" height="14"/></svg>';
        } else {
          audioEl.pause();
          playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none"><polygon points="5,3 17,10 5,17"/></svg>';
        }
      });
    }
    if (scrubber) {
      audioEl.addEventListener('timeupdate', function () {
        if (audioEl.duration) {
          scrubber.value = (audioEl.currentTime / audioEl.duration) * 100;
          if (timeEl) timeEl.textContent = formatTime(audioEl.currentTime) + ' / ' + formatTime(audioEl.duration);
        }
      });
      scrubber.addEventListener('input', function () {
        if (audioEl.duration) {
          audioEl.currentTime = (scrubber.value / 100) * audioEl.duration;
        }
      });
    }
  }

  /* we all know its better raw */
  function openRawMedia(mediaItem) {
    if (!mediaItem) return;
    var html = '';
    var t = mediaItem.type;
    if (t === 'image' || t === 'gif') {
      html = '<img class="raw-media-img" src="' + escHtml(mediaItem.src) + '" alt="' + escHtml(mediaItem.caption || '') + '">';
    } else if (t === 'video') {
      html = '<video class="raw-media-video" src="' + escHtml(mediaItem.src) + '" controls autoplay></video>';
    } else if (t === 'audio') {
      html = '<audio class="raw-media-audio" src="' + escHtml(mediaItem.src) + '" controls autoplay></audio>';
    }
    if (mediaItem.caption) {
      html += '<p class="raw-media-caption">' + escHtml(mediaItem.caption) + '</p>';
    }
    rawInner.innerHTML = html;
    rawBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeRawMedia() {
    rawBackdrop.classList.remove('open');
    rawInner.innerHTML = '';
    document.body.style.overflow = '';
  }

  if (cardClose)   cardClose.addEventListener('click', closeCardOverlay);
  if (cardBackdrop) {
    cardBackdrop.addEventListener('click', function (e) {
      if (e.target === cardBackdrop) closeCardOverlay();
    });
  }

  /* so close */
  if (rawClose)    rawClose.addEventListener('click', closeRawMedia);
  if (rawBackdrop) {
    rawBackdrop.addEventListener('click', function (e) {
      if (e.target === rawBackdrop) closeRawMedia();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!rawBackdrop.classList.contains('open') && !cardBackdrop.hidden) closeCardOverlay();
      if (rawBackdrop.classList.contains('open')) closeRawMedia();
    }
  });

  function buildList() {
    listEl.innerHTML = '';

    var toShow = filteredItems.slice(0, visibleCount);
    var currentYear = null;
    var visIdx = 0;

    toShow.forEach(function (item, idx) {
      var year = item.date ? item.date.slice(0, 4) : 'Unknown';

      if (year !== currentYear) {
        currentYear = year;
        visIdx = 0;

        var divider = document.createElement('div');
        divider.className = 'year-divider';
        var pill = document.createElement('div');
        pill.className = 'year-pill';
        pill.textContent = year;
        divider.appendChild(pill);
        listEl.appendChild(divider);
      }

      var side = visIdx % 2 === 0 ? 'side-left' : 'side-right';
      visIdx++;

      var li = document.createElement('div');
      li.className = 'timeline-item ' + side;
      li.dataset.tag  = item.tag  || 'general';
      li.dataset.date = item.date || '';

      var card = document.createElement('div');
      card.className = 'timeline-card';
      card.innerHTML =
          '<div class="timeline-card-top">'
        + '<span class="tag-badge ' + tagClass(item.tag) + '">' + tagLabel(item.tag) + '</span>'
        + '<span class="timeline-date">' + formatDate(item.date) + '</span>'
        + '</div>'
        + '<h3 class="timeline-title">' + escHtml(item.title) + '</h3>'
        + '<p class="timeline-desc">' + escHtml(item.description || '') + '</p>'
        + '<button class="timeline-details-btn" aria-label="View details for ' + escHtml(item.title) + '">Details</button>';

      li.appendChild(card);

      (function (capturedItem) {
        li.querySelector('.timeline-details-btn').addEventListener('click', function () {
          openCardOverlay(capturedItem);
        });
      })(item);

      listEl.appendChild(li);
    });

    loadMoreWrap.style.display = filteredItems.length > visibleCount ? '' : 'none';

    /* let the browser paint the cards, then draw the spine on top */
    requestAnimationFrame(function () {
      requestAnimationFrame(drawSpine);
    });
  }

  /*
   * drawSpine — measures real DOM positions and absolutely places:
   *   - a dot centred on each card's vertical midpoint
   *   - segments between consecutive anchors (pill centres and dot centres)
   *     with --tl-gap breathing room at each end
   */
  function drawSpine() {
    /* remove previously drawn spine elements */
    var old = listEl.querySelectorAll('.spine-dot, .spine-seg');
    for (var i = 0; i < old.length; i++) { old[i].parentNode.removeChild(old[i]); }

    var style  = getComputedStyle(listEl);
    var TL_W   = parseFloat(style.getPropertyValue('--tl-w'))        || 4;
    var TL_GAP = parseFloat(style.getPropertyValue('--tl-seg-gap'))  || 20;
    var DOT_R  = parseFloat(style.getPropertyValue('--tl-dot-r'))    || 7;

    var listTop  = listEl.getBoundingClientRect().top + window.scrollY;
    var listRect = listEl.getBoundingClientRect();

    /* derive spine X from the first pill's actual rendered centre —
       this way JS always matches wherever CSS has placed the pill,
       no hardcoded breakpoint values that can drift */
    var spineX = listRect.width / 2; /* fallback: centre */
    var firstPill = listEl.querySelector('.year-pill');
    if (firstPill) {
      var fp = firstPill.getBoundingClientRect();
      spineX = fp.left + fp.width / 2 - listRect.left;
    }

    /* collect ordered anchor points down the spine */
    var anchors = [];
    var children = listEl.children;

    for (var c = 0; c < children.length; c++) {
      var child = children[c];

      if (child.classList.contains('year-divider')) {
        var pill = child.querySelector('.year-pill');
        if (pill) {
          var pr = pill.getBoundingClientRect();
          anchors.push({
            type:   'pill',
            y:      pr.top  + window.scrollY + pr.height / 2, /* centre for dot placement */
            yStart: pr.top  + window.scrollY,                 /* top edge  — segment comes down from here */
            yEnd:   pr.top  + window.scrollY + pr.height      /* bottom edge — segment leaves from here   */
          });
        }
      }

      if (child.classList.contains('timeline-item')) {
        var cardEl = child.querySelector('.timeline-card');
        if (cardEl) {
          var cr = cardEl.getBoundingClientRect();
          var mid = cr.top + window.scrollY + cr.height / 2;
          anchors.push({
            type:   'dot',
            y:      mid,
            yStart: mid - DOT_R,   /* top of dot    */
            yEnd:   mid + DOT_R,   /* bottom of dot */
            cardEl: cardEl
          });
        }
      }
    }

    /* helper: make an absolutely-positioned child of listEl */
    function spineEl(cls) {
      var el = document.createElement('div');
      el.className = cls;
      el.style.position = 'absolute';
      el.style.left     = spineX + 'px';
      el.style.transform = 'translateX(-50%)';
      el.style.zIndex   = '3';
      listEl.appendChild(el);
      return el;
    }

    /* dots */
    for (var a = 0; a < anchors.length; a++) {
      if (anchors[a].type !== 'dot') continue;
      var dot = spineEl('spine-dot');
      dot.style.top    = (anchors[a].y - listTop - DOT_R) + 'px';
      dot.style.width  = (DOT_R * 2) + 'px';
      dot.style.height = (DOT_R * 2) + 'px';

      /* hover effect — bind to the card, update the dot */
      (function (d) {
        anchors[a].cardEl.addEventListener('mouseenter', function () {
          d.style.background = 'var(--color-accent)';
          d.style.transform  = 'translateX(-50%) scale(1.15)';
        });
        anchors[a].cardEl.addEventListener('mouseleave', function () {
          d.style.background = '';
          d.style.transform  = 'translateX(-50%)';
        });
      })(dot);
    }

    /* segments between consecutive anchors — gap measured from anchor surfaces */
    for (var s = 0; s < anchors.length - 1; s++) {
      var from = anchors[s];
      var to   = anchors[s + 1];

      var segTop    = from.yEnd + TL_GAP;
      var segBottom = to.yStart - TL_GAP;
      var segH      = segBottom - segTop;
      if (segH <= 0) continue;

      var seg = spineEl('spine-seg');
      seg.style.top    = (segTop - listTop) + 'px';
      seg.style.width  = TL_W + 'px';
      seg.style.height = segH + 'px';
    }
  }

  /* redraw on resize — use rAF so it tracks the frame, no debounce lag */
  var rafPending = false;
  window.addEventListener('resize', function () {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(function () {
        rafPending = false;
        drawSpine();
      });
    }
  });

  /* no blacked tag? FAH */
  function applyFilter(filter) {
    activeFilter   = filter;
    visibleCount   = PAGE_SIZE;

    if (filter === 'all') {
      filteredItems = allItems.slice();
    } else {
      filteredItems = allItems.filter(function (item) {
        return item.tag === filter;
      });
    }

    buildList();
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyFilter(btn.dataset.filter || 'all');
    });
  });

  /* MORE LOAD PLEASE */
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      visibleCount += PAGE_SIZE;
      buildList();
    });
  }

  /* fetch innit... i cba to find that dog ascii art again */
  fetch('/assets/data/timeline.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      data.sort(function (a, b) {
        return (a.date || '').localeCompare(b.date || '');
      });
      allItems = data.reverse();
      applyFilter('all');
    })
    .catch(function (err) {
      console.error('Failed to load timeline.json:', err);
      listEl.innerHTML = '<p style="color:var(--color-muted);padding:2rem;">Could not load timeline data.</p>';
    });

})();
