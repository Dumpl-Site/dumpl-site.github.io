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
  var currentMediaEl  = null;
  var currentPlayBtn  = null;

  /* gif canvas cache: src -> dataURL of frozen first frame */
  var gifFrameCache = {};

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
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function formatDate(iso) {
    if (!iso) return 'Unknown Date';
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function tagClass(tag) { return 'tag-' + (tag || 'general'); }
  function tagLabel(tag) {
    var m = { milestone:'Milestone', event:'Event', notable:'Notable', funnies:'Funnies', general:'General' };
    return m[tag] || tag || 'General';
  }
  function formatTime(secs) {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
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

  var ICON_PLAY     = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="5,3 17,10 5,17"/></svg>';
  var ICON_PAUSE    = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="none" aria-hidden="true"><rect x="4" y="3" width="4" height="14"/><rect x="12" y="3" width="4" height="14"/></svg>';
  var ICON_VOL      = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6H1v4h2l4 3V3L3 6z"/><path d="M11 5a4 4 0 0 1 0 6"/><path d="M13.5 3a7 7 0 0 1 0 10"/></svg>';
  var ICON_VOL_MUTE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6H1v4h2l4 3V3L3 6z"/><line x1="14" y1="5" x2="9" y2="10"/><line x1="9" y1="5" x2="14" y2="10"/></svg>';
  var ICON_FULLSCR  = '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 5V1h4M10 1h4v4M14 10v4h-4M5 14H1v-4"/></svg>';
  var ICON_DOWNLOAD = '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 2v7M4 6l3.5 3.5L11 6"/><path d="M2 12h11"/></svg>';
  var ICON_EXPAND   = ICON_FULLSCR;

  function stopAllMedia() {
    if (currentMediaEl) {
      currentMediaEl.pause();
      if (currentPlayBtn) {
        currentPlayBtn.innerHTML = ICON_PLAY;
        currentPlayBtn.setAttribute('aria-label', 'Play');
      }
      currentMediaEl = null;
      currentPlayBtn = null;
    }
  }

  function extractAudioCover(src, callback) {
    fetch(src, { headers: { Range: 'bytes=0-262143' } })
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (buf) {
        var bytes = new Uint8Array(buf);
        if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
          callback(null); return;
        }
        var syncsafe = function (b0, b1, b2, b3) {
          return ((b0 & 0x7f) << 21) | ((b1 & 0x7f) << 14) | ((b2 & 0x7f) << 7) | (b3 & 0x7f);
        };
        var tagSize  = syncsafe(bytes[6], bytes[7], bytes[8], bytes[9]);
        var hasFooter = (bytes[5] & 0x10) ? 1 : 0;
        var frameStart = 10 + (bytes[5] & 0x40 ? syncsafe(bytes[10], bytes[11], bytes[12], bytes[13]) + 4 : 0);
        var end = 10 + tagSize;

        while (frameStart + 10 < end) {
          var id = String.fromCharCode(bytes[frameStart], bytes[frameStart+1], bytes[frameStart+2], bytes[frameStart+3]);
          var frameSize = (bytes[frameStart+4] << 24) | (bytes[frameStart+5] << 16) | (bytes[frameStart+6] << 8) | bytes[frameStart+7];
          if (frameSize <= 0) break;
          if (id === 'APIC') {
            var o = frameStart + 10;
            var enc = bytes[o++];
            while (o < end && bytes[o] !== 0) o++;
            o++;
            o++;
            if (enc === 1 || enc === 2) { while (o < end && !(bytes[o] === 0 && bytes[o+1] === 0)) o++; o += 2; }
            else { while (o < end && bytes[o] !== 0) o++; o++; }
            var imgBytes = bytes.slice(o, frameStart + 10 + frameSize);
            var mime = 'image/jpeg';
            if (imgBytes[0] === 0x89 && imgBytes[1] === 0x50) mime = 'image/png';
            else if (imgBytes[0] === 0x47 && imgBytes[1] === 0x49) mime = 'image/gif';
            else if (imgBytes[0] === 0x57 && imgBytes[1] === 0x45) mime = 'image/webp';
            var blob = new Blob([imgBytes], { type: mime });
            callback(URL.createObjectURL(blob));
            return;
          }
          frameStart += 10 + frameSize;
        }
        callback(null);
      })
      .catch(function () { callback(null); });
  }

  function freezeGif(imgEl, src) {
    if (gifFrameCache[src]) {
      imgEl.src = gifFrameCache[src];
      return;
    }
    var tmp = new Image();
    tmp.crossOrigin = 'anonymous';
    tmp.onload = function () {
      var c = document.createElement('canvas');
      c.width = tmp.naturalWidth; c.height = tmp.naturalHeight;
      var ctx = c.getContext('2d');
      ctx.drawImage(tmp, 0, 0);
      try {
        var dataUrl = c.toDataURL('image/png');
        gifFrameCache[src] = dataUrl;
        imgEl.src = dataUrl;
      } catch (e) {
        gifFrameCache[src] = src;
      }
    };
    tmp.src = src;
  }

  function buildVolumeControl(mediaEl) {
    var wrap = document.createElement('div');
    wrap.className = 'volume-wrap';

    var btn = document.createElement('button');
    btn.className = 'media-ctrl-btn volume-btn';
    btn.setAttribute('aria-label', 'Volume');
    btn.innerHTML = ICON_VOL;

    var popup = document.createElement('div');
    popup.className = 'volume-popup';
    popup.setAttribute('aria-hidden', 'true');

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'volume-slider';
    slider.min = '0'; slider.max = '1'; slider.step = '0.02'; slider.value = '1';
    slider.setAttribute('aria-label', 'Volume');

    popup.appendChild(slider);
    wrap.appendChild(btn);
    wrap.appendChild(popup);

    var popupOpen = false;

    function showPopup() {
      popupOpen = true;
      popup.classList.add('open');
      popup.setAttribute('aria-hidden', 'false');
    }
    function hidePopup() {
      popupOpen = false;
      popup.classList.remove('open');
      popup.setAttribute('aria-hidden', 'true');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      popupOpen ? hidePopup() : showPopup();
    });

    document.addEventListener('click', function (e) {
      if (popupOpen && !wrap.contains(e.target)) hidePopup();
    });

    function updateIcon() {
      btn.innerHTML = mediaEl.muted || mediaEl.volume === 0 ? ICON_VOL_MUTE : ICON_VOL;
    }

    slider.addEventListener('input', function () {
      mediaEl.volume = parseFloat(slider.value);
      mediaEl.muted = parseFloat(slider.value) === 0;
      updateIcon();
    });

    mediaEl.addEventListener('volumechange', function () {
      slider.value = mediaEl.muted ? 0 : mediaEl.volume;
      updateIcon();
    });

    return wrap;
  }

  function buildMediaControls(mediaEl, options) {
    options = options || {};

    var bar = document.createElement('div');
    bar.className = 'media-controls-bar';

    var scrubRow = document.createElement('div');
    scrubRow.className = 'media-scrubber-row';

    var scrubTrack = document.createElement('div');
    scrubTrack.className = 'media-scrubber-track';

    var scrubFill = document.createElement('div');
    scrubFill.className = 'media-scrubber-fill';

    var scrubInput = document.createElement('input');
    scrubInput.type = 'range';
    scrubInput.className = 'media-scrubber-input';
    scrubInput.min = '0'; scrubInput.max = '100'; scrubInput.step = '0.1'; scrubInput.value = '0';
    scrubInput.setAttribute('aria-label', 'Seek');

    scrubTrack.appendChild(scrubFill);
    scrubTrack.appendChild(scrubInput);
    scrubRow.appendChild(scrubTrack);
    bar.appendChild(scrubRow);

    var btnsRow = document.createElement('div');
    btnsRow.className = 'media-btns-row';

    var playBtn = document.createElement('button');
    playBtn.className = 'media-ctrl-btn media-play-btn';
    playBtn.setAttribute('aria-label', 'Play');
    playBtn.innerHTML = ICON_PLAY;
    btnsRow.appendChild(playBtn);

    var timeEl = document.createElement('span');
    timeEl.className = 'media-time';
    timeEl.textContent = '0:00';
    btnsRow.appendChild(timeEl);

    var spacer = document.createElement('div');
    spacer.style.flex = '1';
    btnsRow.appendChild(spacer);

    if (options.showVolume) {
      var volWrap = buildVolumeControl(mediaEl);
      btnsRow.appendChild(volWrap);
    }

    if (options.showDownload && options.downloadSrc) {
      var dlBtn = document.createElement('button');
      dlBtn.className = 'media-ctrl-btn';
      dlBtn.setAttribute('aria-label', 'Download');
      dlBtn.innerHTML = ICON_DOWNLOAD;
      dlBtn.addEventListener('click', function () {
        var filename = options.downloadSrc.split('/').pop().split('?')[0] || 'download';
        fetch(options.downloadSrc)
          .then(function (r) { return r.blob(); })
          .then(function (blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          })
          .catch(function () { window.open(options.downloadSrc, '_blank'); });
      });
      btnsRow.appendChild(dlBtn);
    }

    if (options.showExpand && options.onExpand) {
      var expandBtn2 = document.createElement('button');
      expandBtn2.className = 'media-ctrl-btn';
      expandBtn2.setAttribute('aria-label', 'Expand');
      expandBtn2.innerHTML = ICON_EXPAND;
      expandBtn2.addEventListener('click', options.onExpand);
      btnsRow.appendChild(expandBtn2);
    }

    if (options.showFullscreen && options.fullscreenTarget) {
      var fsBtn = document.createElement('button');
      fsBtn.className = 'media-ctrl-btn';
      fsBtn.setAttribute('aria-label', 'Fullscreen');
      fsBtn.innerHTML = ICON_FULLSCR;
      fsBtn.addEventListener('click', function () {
        var target = options.fullscreenTarget;
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          target.requestFullscreen && target.requestFullscreen();
        }
      });
      btnsRow.appendChild(fsBtn);
    }

    bar.appendChild(btnsRow);

    /* scrubber */
    mediaEl.addEventListener('timeupdate', function () {
      if (mediaEl.duration) {
        var pct = (mediaEl.currentTime / mediaEl.duration) * 100;
        scrubInput.value = pct;
        scrubFill.style.width = pct + '%';
        timeEl.textContent = formatTime(mediaEl.currentTime) + ' / ' + formatTime(mediaEl.duration);
      }
    });
    mediaEl.addEventListener('loadedmetadata', function () {
      timeEl.textContent = '0:00 / ' + formatTime(mediaEl.duration);
    });
    scrubInput.addEventListener('input', function () {
      if (mediaEl.duration) {
        mediaEl.currentTime = (parseFloat(scrubInput.value) / 100) * mediaEl.duration;
        scrubFill.style.width = scrubInput.value + '%';
      }
    });

    playBtn.addEventListener('click', function () {
      if (mediaEl.paused) {
        stopAllMedia();
        mediaEl.play();
        currentMediaEl = mediaEl;
        currentPlayBtn = playBtn;
        playBtn.innerHTML = ICON_PAUSE;
        playBtn.setAttribute('aria-label', 'Pause');
      } else {
        mediaEl.pause();
        currentMediaEl = null;
        currentPlayBtn = null;
        playBtn.innerHTML = ICON_PLAY;
        playBtn.setAttribute('aria-label', 'Play');
      }
    });

    mediaEl.addEventListener('ended', function () {
      playBtn.innerHTML = ICON_PLAY;
      playBtn.setAttribute('aria-label', 'Play');
      currentMediaEl = null;
      currentPlayBtn = null;
    });

    bar._playBtn = playBtn;

    return bar;
  }

  /* no auto-play so no one-handed browsing */
  function buildVideoWrap(item, isExpand) {
    var outer = document.createElement('div');
    outer.className = 'gallery-video-wrap';

    var video = document.createElement('video');
    video.className = 'gallery-video';
    video.src = item.src;
    video.preload = 'metadata';
    video.tabIndex = -1;
    if (isExpand) video.style.maxHeight = '420px';
    outer.appendChild(video);

    var ctrlOpts = { showVolume: true };
    if (isExpand) {
      ctrlOpts.showDownload   = true;
      ctrlOpts.downloadSrc    = item.src;
      ctrlOpts.showFullscreen = true;
      ctrlOpts.fullscreenTarget = video;
    }
    var controlsBar = buildMediaControls(video, ctrlOpts);
    outer.appendChild(controlsBar);

    return { outer: outer, video: video, controlsBar: controlsBar };
  }

  function buildAudioWrap(item) {
    var outer = document.createElement('div');
    outer.className = 'gallery-audio-wrap-new';

    var coverBox = document.createElement('div');
    coverBox.className = 'audio-cover-block';

    var placeholderSvg = '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="6"/><line x1="24" y1="8" x2="24" y2="18"/></svg>';
    coverBox.innerHTML = placeholderSvg;

    outer.appendChild(coverBox);

    var audio = document.createElement('audio');
    audio.className = 'gallery-audio-el';
    audio.src = item.src;
    audio.preload = 'metadata';
    outer.appendChild(audio);

    var controlsBar = buildMediaControls(audio, { showVolume: true });
    outer.appendChild(controlsBar);

    /* cuck the other audios */
    extractAudioCover(item.src, function (coverUrl) {
      if (coverUrl) {
        var img = document.createElement('img');
        img.src = coverUrl;
        img.alt = item.caption || 'Cover art';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
        coverBox.innerHTML = '';
        coverBox.appendChild(img);
        coverBox.classList.add('has-cover');
      }
    });

    return { outer: outer, audio: audio, controlsBar: controlsBar };
  }

  function buildCarousel(item, isExpand) {
    var srcs = Array.isArray(item.src) ? item.src : [item.src];
    var captions = Array.isArray(item.captions) ? item.captions : [];
    var idx = 0;

    var wrap = document.createElement('div');
    wrap.className = 'carousel-wrap';

    var slide = document.createElement('div');
    slide.className = 'carousel-slide';
    if (!isExpand) {
      slide.style.cssText = 'overflow:hidden;';
    }

    var mediaEl = document.createElement('img');
    mediaEl.src = srcs[0];
    mediaEl.alt = captions[0] || item.caption || '';
    mediaEl.loading = 'lazy';
    if (isExpand) {
      mediaEl.style.maxHeight = '420px';
    } else {
      mediaEl.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
    }
    slide.appendChild(mediaEl);

    var captionEl = document.createElement('p');
    captionEl.className = 'carousel-caption';
    captionEl.textContent = captions[0] || '';

    var controls = document.createElement('div');
    controls.className = 'carousel-controls';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-arrow';
    prevBtn.setAttribute('aria-label', 'Previous');
    prevBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9,2 4,7 9,12"/></svg>';

    var counter = document.createElement('span');
    counter.className = 'carousel-counter';

    var nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-arrow';
    nextBtn.setAttribute('aria-label', 'Next');
    nextBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="5,2 10,7 5,12"/></svg>';

    var expandBtn = document.createElement('button');
    expandBtn.className = 'carousel-expand-btn';
    expandBtn.setAttribute('aria-label', 'Expand');
    expandBtn.innerHTML = ICON_EXPAND;

    var dlBtn = document.createElement('a');
    dlBtn.className = 'carousel-download-btn';
    dlBtn.setAttribute('aria-label', 'Download');
    dlBtn.innerHTML = ICON_DOWNLOAD;

    controls.appendChild(prevBtn);
    controls.appendChild(counter);
    controls.appendChild(nextBtn);
    controls.appendChild(expandBtn);
    controls.appendChild(dlBtn);

    wrap.appendChild(slide);
    wrap.appendChild(captionEl);
    wrap.appendChild(controls);

    function go(n) {
      idx = (n + srcs.length) % srcs.length;
      mediaEl.src = srcs[idx];
      mediaEl.alt = captions[idx] || item.caption || '';
      captionEl.textContent = captions[idx] || '';
      counter.textContent = (idx + 1) + ' / ' + srcs.length;
      prevBtn.disabled = srcs.length <= 1;
      nextBtn.disabled = srcs.length <= 1;
      dlBtn.href = srcs[idx];
      dlBtn.download = srcs[idx].split('/').pop();
    }

    prevBtn.addEventListener('click', function () { go(idx - 1); });
    nextBtn.addEventListener('click', function () { go(idx + 1); });

    expandBtn.addEventListener('click', function () {
      stopAllMedia();
      lbImg.src = srcs[idx];
      lbImg.alt = captions[idx] || item.caption || '';
      lbCaption.textContent = captions[idx] || item.caption || '';
      lbMeta.textContent = 'by ' + (item.uploader || 'Unknown') + ' · ' + formatDate(item.date);
      if (lbDownload) { lbDownload.href = srcs[idx]; }
      if (lbPrev) lbPrev.style.display = 'none';
      if (lbNext) lbNext.style.display = 'none';
      lbBackdrop.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    });

    go(0);
    return wrap;
  }

  /* lay those bricks like a good little mason */
  function buildCard(item) {
    var wrap = document.createElement('div');
    wrap.className = 'gallery-card';

    var mediaWrap = document.createElement('div');
    mediaWrap.className = 'gallery-card-media';

    if (item.type === 'image' && Array.isArray(item.src)) {
      mediaWrap.classList.add('gallery-card-media--padded');
      var carousel = buildCarousel(item, false);
      mediaWrap.appendChild(carousel);

    } else if (item.type === 'image') {
      mediaWrap.classList.add('gallery-card-media--padded');
      var imgEl = document.createElement('img');
      imgEl.src = item.src;
      imgEl.alt = item.caption || '';
      imgEl.loading = 'lazy';
      mediaWrap.appendChild(imgEl);

    } else if (item.type === 'gif') {
      var gifEl = document.createElement('img');
      gifEl.src = item.src;
      gifEl.alt = item.caption || '';
      gifEl.loading = 'lazy';
      gifEl.className = 'gallery-gif';
      gifEl.addEventListener('load', function () {
        if (gifEl.src === item.src || gifEl.src.endsWith(item.src)) {
          freezeGif(gifEl, item.src);
        }
      });
      if (gifFrameCache[item.src]) gifEl.src = gifFrameCache[item.src];
      gifEl.addEventListener('mouseenter', function () { gifEl.src = item.src; });
      gifEl.addEventListener('mouseleave', function () {
        if (gifFrameCache[item.src]) gifEl.src = gifFrameCache[item.src];
        else freezeGif(gifEl, item.src);
      });
      mediaWrap.appendChild(gifEl);

    } else if (item.type === 'video') {
      mediaWrap.classList.add('gallery-card-media--padded');
      var vResult = buildVideoWrap(item, false);
      mediaWrap.appendChild(vResult.outer);
      wrap._videoResult = vResult;
      wrap._item = item;

    } else if (item.type === 'audio') {
      var aResult = buildAudioWrap(item);
      mediaWrap.appendChild(aResult.outer);

    } else if (item.type === 'file') {
      var fileWrap = document.createElement('div');
      fileWrap.className = 'gallery-file-block';
      var iconBox = document.createElement('div');
      iconBox.className = 'file-icon-box';
      iconBox.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h12l6 6v16H5V3z"/><path d="M17 3v6h6"/></svg>';
      var fileName = document.createElement('p');
      fileName.className = 'file-name';
      fileName.textContent = item.filename || (item.src ? item.src.split('/').pop() : 'File');
      var ext = (item.filename || item.src || '').split('.').pop().toUpperCase();
      var extBadge = document.createElement('span');
      extBadge.className = 'file-ext';
      extBadge.textContent = ext;
      fileWrap.appendChild(iconBox);
      fileWrap.appendChild(fileName);
      fileWrap.appendChild(extBadge);
      if (item.preview) {
        var pre = document.createElement('pre');
        pre.className = 'file-preview';
        pre.textContent = item.preview;
        fileWrap.appendChild(pre);
      }
      mediaWrap.appendChild(fileWrap);
    }

    wrap.appendChild(mediaWrap);

    /* feet */
    var tags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : ['general']);
    var tagsHtml = tags.map(function (t) {
      return '<span class="tag-badge ' + tagClass(t) + '">' + tagLabel(t) + '</span>';
    }).join(' ');

    var footer = document.createElement('div');
    footer.className = 'gallery-card-footer';
    footer.innerHTML =
      '<p class="gallery-caption">' + escHtml(item.caption || '') + '</p>'
      + '<p class="gallery-meta">by ' + escHtml(item.uploader || 'Unknown') + ' &middot; ' + formatDate(item.date) + '</p>'
      + '<div class="gallery-card-tags">' + tagsHtml + '</div>'
      + '<div class="gallery-card-actions"></div>';

    wrap.appendChild(footer);

    var actions = footer.querySelector('.gallery-card-actions');

    /* expansion */
    var expandBtn = document.createElement('button');
    expandBtn.className = 'gallery-expand-btn';
    expandBtn.setAttribute('aria-label', 'Expand');
    expandBtn.innerHTML = ICON_EXPAND;
    expandBtn.addEventListener('click', function () {
      if (item.type === 'image' && !Array.isArray(item.src)) {
        var lbIdx = lightboxItems.indexOf(item);
        if (lbIdx !== -1) openLightbox(lbIdx);
      } else {
        openExpand(item);
      }
    });
    actions.appendChild(expandBtn);

    if (item.src && item.src !== '#' && !Array.isArray(item.src)) {
      var dlBtn = document.createElement('button');
      dlBtn.className = 'gallery-download-btn';
      dlBtn.setAttribute('aria-label', 'Download');
      dlBtn.innerHTML = ICON_DOWNLOAD;
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
      actions.appendChild(dlBtn);
    }

    return wrap;
  }

  function buildGrid() {
    gridEl.innerHTML = '';
    lightboxItems = filteredItems.filter(function (it) { return (it.type === 'image' && !Array.isArray(it.src)) || it.type === 'gif'; });
    var toShow = filteredItems.slice(0, visibleCount);
    toShow.forEach(function (item) {
      gridEl.appendChild(buildCard(item));
    });
    loadMoreWrap.style.display = filteredItems.length > visibleCount ? '' : 'none';
  }

  function openLightbox(idx) {
    lightboxIndex = idx;
    renderLightbox();
    lbBackdrop.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lbBackdrop.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }
  function renderLightbox() {
    var item = lightboxItems[lightboxIndex];
    if (!item) return;
    lbImg.src = item.src;
    lbImg.alt = item.caption || '';
    lbCaption.textContent = item.caption || '';
    lbMeta.textContent = 'by ' + (item.uploader || 'Unknown') + ' · ' + formatDate(item.date);
    if (lbDownload) lbDownload.href = item.src;
    if (lbPrev) lbPrev.style.display = lightboxItems.length > 1 ? '' : 'none';
    if (lbNext) lbNext.style.display = lightboxItems.length > 1 ? '' : 'none';
  }
  if (lbClose)    lbClose.addEventListener('click', closeLightbox);
  if (lbBackdrop) lbBackdrop.addEventListener('click', function (e) { if (e.target === lbBackdrop) closeLightbox(); });
  if (lbPrev)     lbPrev.addEventListener('click',  function () { lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length; renderLightbox(); });
  if (lbNext)     lbNext.addEventListener('click',  function () { lightboxIndex = (lightboxIndex + 1) % lightboxItems.length; renderLightbox(); });

  function openExpand(item) {
    stopAllMedia();

    expContent.innerHTML = '';

    var tags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : ['general']);
    var tagsHtml = tags.map(function (t) {
      return '<span class="tag-badge ' + tagClass(t) + '">' + tagLabel(t) + '</span>';
    }).join(' ');

    var header = document.createElement('div');
    header.className = 'overlay-header';
    header.innerHTML = tagsHtml + '<p class="overlay-date">' + escHtml(item.uploader || 'Unknown') + ' &middot; ' + formatDate(item.date) + '</p>';
    expContent.appendChild(header);

    if (item.caption) {
      var titleEl = document.createElement('h2');
      titleEl.className = 'overlay-title';
      titleEl.textContent = item.caption;
      expContent.appendChild(titleEl);
    }

    var mediaWrap = document.createElement('div');
    mediaWrap.className = 'expand-media-wrap';

    if (item.type === 'image' && Array.isArray(item.src)) {
      var expCarousel = buildCarousel(item, true);
      mediaWrap.appendChild(expCarousel);

    } else if (item.type === 'image') {
      var img = document.createElement('img');
      img.src = item.src;
      img.alt = item.caption || '';
      img.className = 'expand-img-lightbox';
      mediaWrap.appendChild(img);

    } else if (item.type === 'gif') {
      var gifImg = document.createElement('img');
      gifImg.src = item.src;
      gifImg.alt = item.caption || '';
      gifImg.style.cssText = 'width:100%;border-radius:8px;';
      mediaWrap.appendChild(gifImg);

    } else if (item.type === 'video') {
      var vRes = buildVideoWrap(item, true);
      mediaWrap.appendChild(vRes.outer);

    } else if (item.type === 'audio') {
      var aRes = buildAudioWrap(item);
      aRes.outer.classList.add('is-expand');
      mediaWrap.appendChild(aRes.outer);

    } else if (item.type === 'file') {
      var fileDiv = document.createElement('div');
      fileDiv.className = 'expand-file-wrap';
      fileDiv.innerHTML =
        '<div class="file-icon-box file-icon-box--lg">'
        + '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 4h16l8 8v20H6V4z"/><path d="M22 4v8h8"/></svg>'
        + '</div>'
        + '<p class="file-name">' + escHtml(item.filename || (item.src ? item.src.split('/').pop() : 'File')) + '</p>'
        + (item.preview ? '<pre class="file-preview" style="max-height:200px;">' + escHtml(item.preview) + '</pre>' : '');
      mediaWrap.appendChild(fileDiv);
    }

    expContent.appendChild(mediaWrap);
    expBackdrop.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeExpand() {
    stopAllMedia();
    expBackdrop.setAttribute('hidden', '');
    expContent.innerHTML = '';
    document.body.style.overflow = '';
  }

  if (expClose)    expClose.addEventListener('click', closeExpand);
  if (expBackdrop) expBackdrop.addEventListener('click', function (e) { if (e.target === expBackdrop) closeExpand(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lbBackdrop && !lbBackdrop.hidden) closeLightbox();
      else if (expBackdrop && !expBackdrop.hidden) closeExpand();
    }
    if (lbBackdrop && !lbBackdrop.hidden) {
      if (e.key === 'ArrowLeft')  { lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length; renderLightbox(); }
      if (e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % lightboxItems.length; renderLightbox(); }
    }
  });

  function applyFilters() {
    visibleCount = PAGE_SIZE;
    filteredItems = allItems.filter(function (item) {
      var typeForFilter = item.type === 'gif' ? 'video' : item.type;
      var typeMatch = activeType === 'all' || typeForFilter === activeType;
      var tags = Array.isArray(item.tags) ? item.tags : (item.tag ? [item.tag] : ['general']);
      var tagMatch = activeTag === 'all' || tags.indexOf(activeTag) !== -1;
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
      if (gridEl) gridEl.innerHTML = '<p style="color:var(--color-muted);padding:2rem;">Could not load gallery data.</p>';
    });

})();