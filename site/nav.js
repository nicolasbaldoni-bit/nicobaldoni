function initNav() {
  const burger = document.getElementById('burger');
  const panel = document.getElementById('nav-panel');
  const overlay = document.getElementById('nav-overlay');
  if (!burger || !panel || !overlay) return;

  const open = () => {
    burger.classList.add('open');
    panel.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('nav-open');
    // iOS scroll lock
    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  };
  const close = () => {
    const scrollY = document.body.style.top;
    burger.classList.remove('open');
    panel.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('nav-open');
    // Restore iOS scroll
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
  };

  burger.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Close panel on nav link tap (mobile)
  panel.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', close);
  });
}

// Inner page burger (top-nav-burger) — same panel/overlay as home
function initTopNavBurger() {
  const burger = document.querySelector('.top-nav-burger');
  const panel = document.getElementById('nav-panel');
  const overlay = document.getElementById('nav-overlay');
  if (!burger || !panel || !overlay) return;

  const open = () => {
    burger.classList.add('open');
    panel.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('nav-open');
    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  };
  const close = () => {
    const scrollY = document.body.style.top;
    burger.classList.remove('open');
    panel.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('nav-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
  };

  burger.addEventListener('click', () => panel.classList.contains('open') ? close() : open());
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  panel.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', close);
  });
}

function getMeasuredValue(cssVar) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;visibility:hidden;width:var(' + cssVar + ')';
  document.body.appendChild(el);
  const px = el.offsetWidth;
  document.body.removeChild(el);
  return px;
}

function initGalleryRows() {
  // Fullscreen on video click (with iOS fallback)
  document.querySelectorAll('.g-video').forEach(wrapper => {
    const video = wrapper.querySelector('video');
    if (!video) return;
    wrapper.addEventListener('click', () => {
      if (video.requestFullscreen) video.requestFullscreen();
      else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else if (video.mozRequestFullScreen) video.mozRequestFullScreen();
      else if (video.msRequestFullscreen) video.msRequestFullscreen();
    });
  });

  // Assign data-row-index and data-row-group to each item at page load
  document.querySelectorAll('.gallery-row').forEach((row, rowIdx) => {
    const imageItems = Array.from(row.querySelectorAll('.g-item'));
    const videoItem = row.querySelector('.g-video');
    const allItems = videoItem ? [...imageItems, videoItem] : [...imageItems];

    allItems.forEach((item, i) => {
      item.dataset.galleryRow = rowIdx;
      item.dataset.galleryGroup = Math.floor(i / 3);
      item.dataset.galleryIndex = i;
    });
  });

  // Track loaded state per item
  const loaded = new Set();

  function onItemReady(item) {
    loaded.add(item);
    const rowIdx = item.dataset.galleryRow;
    const groupIdx = item.dataset.galleryGroup;

    // Find all siblings in the same row group
    const siblings = Array.from(
      document.querySelectorAll(`[data-gallery-row="${rowIdx}"][data-gallery-group="${groupIdx}"]`)
    );

    // Check if all siblings in this group are ready
    const allReady = siblings.every(sib => {
      if (sib.classList.contains('g-video')) return true; // video handled separately
      const img = sib.querySelector('img');
      return img && img.naturalWidth > 0;
    });

    if (allReady) {
      applyRowGroup(rowIdx, groupIdx, siblings);
    }
  }

  // Listen per image
  document.querySelectorAll('.g-item img').forEach(img => {
    const item = img.closest('.g-item');
    if (img.complete && img.naturalWidth > 0) {
      onItemReady(item);
    } else {
      img.addEventListener('load', () => onItemReady(item));
      img.addEventListener('error', () => onItemReady(item));
    }
  });

  // Video metadata
  document.querySelectorAll('.g-video video').forEach(video => {
    const wrapper = video.closest('.g-video');
    const ready = () => {
      const rowIdx = wrapper.dataset.galleryRow;
      const groupIdx = wrapper.dataset.galleryGroup;
      const siblings = Array.from(
        document.querySelectorAll(`[data-gallery-row="${rowIdx}"][data-gallery-group="${groupIdx}"]`)
      );
      applyRowGroup(rowIdx, groupIdx, siblings);
    };
    if (video.readyState >= 1) ready();
    else {
      video.addEventListener('loadedmetadata', ready);
      setTimeout(ready, 3000);
    }
  });

  // Full recalculate on resize and orientation change
  let resizeTimer;
  const recalc = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyGalleryLayout, 150);
  };
  window.addEventListener('resize', recalc);
  window.addEventListener('orientationchange', () => setTimeout(applyGalleryLayout, 300));
}

function applyRowGroup(rowIdx, groupIdx, items) {
  const gapPx = getMeasuredValue('--gap');
  const rowHStr = getComputedStyle(document.documentElement).getPropertyValue('--row-h').trim();
  const rowHPx = (parseFloat(rowHStr) / 100) * window.innerHeight;
  const mobile = isMobile();

  // Find the parent gallery-row
  const row = items[0].closest('.gallery-row');
  const rowStyle = getComputedStyle(row);
  const availableWidth = row.clientWidth - parseFloat(rowStyle.paddingLeft) - parseFloat(rowStyle.paddingRight);

  // Insert row-break before this group if not first group (desktop only)
  if (!mobile && parseInt(groupIdx) > 0) {
    // Check if break already inserted
    const firstItem = items[0];
    const prev = firstItem.previousElementSibling;
    if (!prev || !prev.classList.contains('row-break')) {
      const br = document.createElement('div');
      br.className = 'row-break';
      br.style.cssText = 'flex-basis:100%;height:0;margin:0;padding:0;';
      firstItem.insertAdjacentElement('beforebegin', br);
    }
  }

  if (mobile) {
    items.forEach((item, i) => {
      const isVideo = item.classList.contains('g-video');
      let naturalW, naturalH;
      if (isVideo) {
        const video = item.querySelector('video');
        naturalW = video && video.videoWidth > 0 ? video.videoWidth : 16;
        naturalH = video && video.videoHeight > 0 ? video.videoHeight : 9;
      } else {
        const img = item.querySelector('img');
        naturalW = img.naturalWidth || 1;
        naturalH = img.naturalHeight || 1;
      }
      const w = availableWidth;
      const h = (naturalH / naturalW) * w;
      item.style.width = w + 'px';
      item.style.height = h + 'px';
      item.style.marginTop = (parseInt(groupIdx) > 0 || i > 0) ? gapPx + 'px' : '0';

      const img = item.querySelector('img');
      if (img) { img.style.height = '100%'; img.style.width = '100%'; img.style.objectFit = 'contain'; }
      const video = item.querySelector('video');
      if (video) { video.style.height = '100%'; video.style.width = '100%'; video.style.objectFit = 'contain'; }
    });
  } else {
    // Reset mobile styles
    items.forEach(item => {
      item.style.height = '';
      const img = item.querySelector('img');
      if (img) { img.style.height = ''; img.style.width = ''; img.style.objectFit = ''; }
      const video = item.querySelector('video');
      if (video) { video.style.height = ''; video.style.width = ''; video.style.objectFit = ''; }
    });

    const naturalWidths = items.map(item => {
      if (item.classList.contains('g-video')) {
        const video = item.querySelector('video');
        const vw = video && video.videoWidth > 0 ? video.videoWidth : 16;
        const vh = video && video.videoHeight > 0 ? video.videoHeight : 9;
        return (vw / vh) * rowHPx;
      } else {
        const img = item.querySelector('img');
        const nw = img.naturalWidth || 1;
        const nh = img.naturalHeight || 1;
        return (nw / nh) * rowHPx;
      }
    });

    items.forEach((item, i) => {
      item.style.width = Math.floor(naturalWidths[i]) + 'px';
      item.style.marginTop = parseInt(groupIdx) > 0 ? gapPx + 'px' : '0';
    });
  }
}

function applyGalleryLayout() {
  // Full recalculate — used on resize/orientation change
  document.querySelectorAll('.gallery-row').forEach(row => {
    // Remove existing row-breaks
    row.querySelectorAll('.row-break').forEach(br => br.remove());

    const imageItems = Array.from(row.querySelectorAll('.g-item'));
    const videoItem = row.querySelector('.g-video');
    const allItems = videoItem ? [...imageItems, videoItem] : [...imageItems];

    // Group into rows of 3 and recalculate each
    for (let i = 0; i < allItems.length; i += 3) {
      const group = allItems.slice(i, i + 3);
      const rowIdx = group[0].dataset.galleryRow;
      const groupIdx = group[0].dataset.galleryGroup;
      applyRowGroup(rowIdx, groupIdx, group);
    }
  });
}

function isMobile() {
  return window.innerWidth <= 768;
}

function initLightboxSwipe() {
  const lb = document.getElementById('lb');
  if (!lb) return;
  let touchStartX = 0;
  lb.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  lb.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      if (typeof shiftLb === 'function') shiftLb(diff > 0 ? 1 : -1);
    }
  }, { passive: true });
}

// ── LANGUAGE AUTO-DETECT (first visit only) ──
function initLangRedirect(currentLang) {
  const hasChosenLang = localStorage.getItem('langChoice');
  if (hasChosenLang) return; // user already made a choice manually

  const browserLang = navigator.language || navigator.userLanguage || '';
  const prefersSpanish = browserLang.toLowerCase().startsWith('es');

  const path = window.location.pathname;
  const isSpanishPage = path.includes('-es.html') || path.endsWith('-es');

  if (prefersSpanish && !isSpanishPage && currentLang === 'en') {
    localStorage.setItem('langChoice', 'auto');
    const esPath = path.replace('.html', '-es.html').replace(/^\/$/, '/index-es.html');
    if (path === '/' || path.endsWith('/index.html') || path === '') {
      window.location.replace('index-es.html');
    } else {
      window.location.replace(esPath);
    }
  }
}

// Call when user manually clicks a language toggle link
function setLangChoice() {
  localStorage.setItem('langChoice', 'manual');
}
