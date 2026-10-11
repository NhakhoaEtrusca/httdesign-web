// HTTDesign — shared site behavior: nav, filter, lightbox, contact form
(function () {
  'use strict';

  /* ===== Contact & tracking settings =====
     Paste the Pixel IDs here once the ad accounts exist; leave '' to keep them off. */
  var HOTLINE = '0982741770';
  var HOTLINE_LABEL = '0982 741 770';
  var ZALO_URL = 'https://zalo.me/0982741770';
  var MESSENGER_URL = 'https://m.me/HTTDesign';
  var FB_PIXEL_ID = '';
  var TIKTOK_PIXEL_ID = '';

  if (FB_PIXEL_ID) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  if (TIKTOK_PIXEL_ID) {
    !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; }; ttq.load = function (e, n) { var i = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var o = d.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = i + '?sdkid=' + e + '&lib=' + t; var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a); }; ttq.load(TIKTOK_PIXEL_ID); ttq.page(); }(window, document, 'ttq');
  }

  /* Report a conversion to whichever pixels are on: 'Lead' (form sent) or 'Contact' (call / Zalo / Messenger tap) */
  function track(eventName, channel) {
    try { if (window.fbq) window.fbq('track', eventName, { content_name: channel }); } catch (e) {}
    try { if (window.ttq) window.ttq.track(eventName === 'Lead' ? 'SubmitForm' : 'Contact', { content_name: channel }); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) track('Contact', 'phone');
    else if (href.indexOf('zalo.me') !== -1) track('Contact', 'zalo');
    else if (href.indexOf('m.me/') !== -1) track('Contact', 'messenger');
  });

  var ICON_PHONE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
  var ICON_MESSENGER = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.15.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.98-.87a.8.8 0 0 1 .53-.04c.91.25 1.88.38 2.91.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63z"/></svg>';
  var ICON_FORM = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>';

  /* Floating contact buttons (desktop) + 3-way bottom bar (mobile), on every page */
  (function buildContactBar() {
    var fab = document.createElement('div');
    fab.className = 'contact-fab';
    fab.innerHTML =
      '<a href="' + ZALO_URL + '" target="_blank" rel="noopener" class="contact-fab-btn is-zalo" aria-label="Chat Zalo"><span class="zalo-mark">Zalo</span><span class="contact-fab-tip">Chat Zalo</span></a>' +
      '<a href="' + MESSENGER_URL + '" target="_blank" rel="noopener" class="contact-fab-btn is-messenger" aria-label="Nhắn Messenger">' + ICON_MESSENGER + '<span class="contact-fab-tip">Nhắn Messenger</span></a>' +
      '<a href="tel:' + HOTLINE + '" class="contact-fab-btn is-phone" aria-label="Gọi ' + HOTLINE_LABEL + '">' + ICON_PHONE + '<span class="contact-fab-tip">Gọi ' + HOTLINE_LABEL + '</span></a>' +
      '<a href="#" data-open-cta class="contact-fab-btn is-form" aria-label="Nhận tư vấn">' + ICON_FORM + '<span class="contact-fab-tip">Nhận tư vấn</span></a>';
    document.body.appendChild(fab);

    var sticky = document.querySelector('.sticky-cta .row');
    if (sticky) {
      sticky.classList.add('row--3');
      sticky.innerHTML =
        '<a href="tel:' + HOTLINE + '">Gọi ngay</a>' +
        '<a href="' + ZALO_URL + '" target="_blank" rel="noopener">Zalo</a>' +
        '<a href="#" data-open-cta>Nhận tư vấn</a>';
    }

    /* "Tư vấn dự án tương tự" bands on project pages get the form + Zalo too */
    document.querySelectorAll('.cta-band .hero-actions').forEach(function (box) {
      if (box.querySelector('[data-open-cta]')) return;
      var formBtn = document.createElement('a');
      formBtn.href = '#';
      formBtn.className = 'btn btn--primary';
      formBtn.setAttribute('data-open-cta', '');
      formBtn.textContent = 'Nhận tư vấn miễn phí';
      box.insertBefore(formBtn, box.firstChild);
      var tel = box.querySelector('a[href^="tel:"]');
      if (tel) tel.className = 'btn btn--outline';
      var fb = box.querySelector('a[href*="facebook.com"]');
      var zalo = document.createElement('a');
      zalo.href = ZALO_URL; zalo.target = '_blank'; zalo.rel = 'noopener';
      zalo.className = 'btn btn--outline';
      zalo.textContent = 'Chat Zalo';
      if (fb) box.replaceChild(zalo, fb); else box.appendChild(zalo);
    });
  })();

  /* Homepage hero slideshow — rotates background every 5s */
  var slides = document.querySelectorAll('.hero .hero-slide');
  if (slides.length > 1) {
    var slideIndex = Math.floor(Math.random() * slides.length);
    slides[0].classList.remove('is-active');
    slides[slideIndex].classList.add('is-active');
    setInterval(function () {
      slides[slideIndex].classList.remove('is-active');
      slideIndex = (slideIndex + 1) % slides.length;
      slides[slideIndex].classList.add('is-active');
    }, 5000);
  }

  /* Visit counter — still counted (abacus.jasoncameron.dev/hit/httdesign.art/visits), no longer shown on the page */
  if (/^\/(index\.html)?$/.test(location.pathname)) {
    fetch('https://abacus.jasoncameron.dev/hit/httdesign.art/visits').catch(function () {});
  }

  /* Header scroll state */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  var mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('is-open');
      mobileMenu.classList.toggle('is-open');
      document.body.style.overflow = mobileMenu.classList.contains('is-open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        toggle.classList.remove('is-open');
        mobileMenu.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  /* Consultation modal ("Nhận tư vấn") — built here so every page has the same form */
  (function buildCtaModal() {
    if (document.querySelector('.cta-modal')) return;
    var m = document.createElement('div');
    m.className = 'cta-modal';
    m.innerHTML =
      '<div class="cta-modal-panel">' +
      '<button type="button" class="cta-modal-close" aria-label="Đóng">&times;</button>' +
      '<h2>Nhận tư vấn</h2>' +
      '<p class="sub">Để lại số điện thoại, KTS HTTDesign sẽ gọi lại hoặc nhắn Zalo cho bạn trong giờ làm việc.</p>' +
      '<form>' +
      '<div class="form-row">' +
      '<div class="field"><label for="cta-name">Họ và tên *</label><input type="text" id="cta-name" name="fullName" autocomplete="name" required></div>' +
      '<div class="field"><label for="cta-phone">Số điện thoại / Zalo *</label><input type="tel" id="cta-phone" name="phone" autocomplete="tel" inputmode="tel" pattern="[0-9 +.\\(\\)\\-]{9,15}" title="Nhập số điện thoại 10 số" required></div>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="cta-type">Loại công trình</label><select id="cta-type" name="consultType">' +
      '<option>Biệt thự / nhà phố — xây mới</option>' +
      '<option>Cải tạo nhà, biệt thự</option>' +
      '<option>Văn phòng</option>' +
      '<option>Thương mại / showroom / F&amp;B</option>' +
      '<option>Khách sạn &amp; Resort</option>' +
      '<option>Khai triển bản vẽ kỹ thuật</option>' +
      '<option>Khác</option>' +
      '</select></div>' +
      '<div class="field"><label for="cta-location">Địa điểm công trình</label><input type="text" id="cta-location" name="location" placeholder="VD: Long Xuyên, An Giang"></div>' +
      '</div>' +
      '<div class="field"><label for="cta-email">Email (không bắt buộc)</label><input type="email" id="cta-email" name="email" autocomplete="email"></div>' +
      '<div class="field"><label for="cta-message">Nhu cầu của bạn</label><textarea id="cta-message" name="message" placeholder="Diện tích, ngân sách dự kiến, thời gian muốn khởi công…"></textarea></div>' +
      '<button type="submit" class="btn btn--primary">Gửi yêu cầu</button>' +
      '<p class="note">Thông tin chỉ dùng để HTTDesign liên hệ tư vấn cho bạn.</p>' +
      '</form>' +
      '<div class="cta-success">' +
      '<div class="ic">✓</div>' +
      '<h3 class="cta-success-title">Đã gửi yêu cầu thành công</h3>' +
      '<p class="cta-success-text"></p>' +
      '<a href="#" class="btn btn--primary cta-mail-link" style="display:none">Mở Email để gửi</a>' +
      '<div class="alt-contact">' +
      '<a href="tel:' + HOTLINE + '" class="btn btn--outline" style="color:#fff;border-color:rgba(255,255,255,.55)">Gọi ' + HOTLINE_LABEL + '</a>' +
      '<a href="' + ZALO_URL + '" target="_blank" rel="noopener" class="btn btn--outline" style="color:#fff;border-color:rgba(255,255,255,.55)">Chat Zalo</a>' +
      '</div></div></div>';
    document.body.appendChild(m);
  })();

  var ctaModal = document.querySelector('.cta-modal');
  if (ctaModal) {
    var ctaClose = ctaModal.querySelector('.cta-modal-close');
    var ctaForm = ctaModal.querySelector('form');
    var ctaSuccess = ctaModal.querySelector('.cta-success');
    var SUCCESS_TEXT = 'Cảm ơn bạn. HTTDesign đã nhận được thông tin và sẽ liên hệ lại sớm. Cần gấp, bạn có thể gọi hoặc nhắn Zalo ngay:';

    document.addEventListener('click', function (e) {
      var opener = e.target.closest ? e.target.closest('[data-open-cta]') : null;
      if (!opener) return;
      e.preventDefault();
      ctaModal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      var nameInput = ctaModal.querySelector('#cta-name');
      if (nameInput && ctaForm.style.display !== 'none') setTimeout(function () { nameInput.focus(); }, 50);
    });

    function closeCtaModal() {
      ctaModal.classList.remove('is-open');
      document.body.style.overflow = '';
      if (ctaForm && ctaSuccess) {
        ctaForm.reset();
        ctaForm.style.display = '';
        ctaSuccess.style.display = 'none';
        var titleEl = ctaSuccess.querySelector('.cta-success-title');
        var mailLink = ctaSuccess.querySelector('.cta-mail-link');
        if (titleEl) titleEl.textContent = 'Đã gửi yêu cầu thành công';
        if (mailLink) mailLink.style.display = 'none';
      }
    }
    ctaClose.addEventListener('click', closeCtaModal);
    ctaModal.addEventListener('click', function (e) { if (e.target === ctaModal) closeCtaModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ctaModal.classList.contains('is-open')) closeCtaModal();
    });

    var WEB3FORMS_ACCESS_KEY = 'bb1d2601-8624-4766-8fbd-5471ccdadd8d';

    if (ctaForm) {
      var ctaSubmitBtn = ctaForm.querySelector('button[type="submit"]');
      var ctaSubmitLabel = ctaSubmitBtn ? ctaSubmitBtn.textContent : '';

      ctaForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var f = ctaForm;
        var pageName = document.title.replace(/\s*[—|-]\s*HTTDesign.*$/i, '').trim();
        var subject = 'Yeu cau tu van - ' + f.fullName.value + ' - ' + f.phone.value;
        var body =
          'Ho ten: ' + f.fullName.value + '\n' +
          'Dien thoai / Zalo: ' + f.phone.value + '\n' +
          'Email: ' + (f.email.value || '(khong co)') + '\n' +
          'Loai cong trinh: ' + f.consultType.value + '\n' +
          'Dia diem: ' + f.location.value + '\n' +
          'Gui tu trang: ' + pageName + ' (' + location.pathname + ')\n\n' +
          'Nhu cau:\n' + f.message.value;
        var mailtoUrl =
          'mailto:ktshuathanhtin@gmail.com' +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);

        function showSuccess() {
          var textEl = ctaSuccess.querySelector('.cta-success-text');
          if (textEl) textEl.textContent = SUCCESS_TEXT;
          ctaForm.style.display = 'none';
          ctaSuccess.style.display = 'block';
          track('Lead', f.consultType.value);
        }
        function showFallback() {
          var titleEl = ctaSuccess.querySelector('.cta-success-title');
          var textEl = ctaSuccess.querySelector('.cta-success-text');
          var mailLink = ctaSuccess.querySelector('.cta-mail-link');
          if (titleEl) titleEl.textContent = 'Chưa gửi được tự động';
          if (textEl) textEl.textContent = 'Vui lòng bấm nút bên dưới để gửi qua email, hoặc gọi / nhắn Zalo trực tiếp:';
          if (mailLink) { mailLink.href = mailtoUrl; mailLink.style.display = ''; }
          ctaForm.style.display = 'none';
          ctaSuccess.style.display = 'block';
        }

        if (ctaSubmitBtn) { ctaSubmitBtn.disabled = true; ctaSubmitBtn.textContent = 'Đang gửi...'; }

        var formData = new FormData(f);
        formData.append('access_key', WEB3FORMS_ACCESS_KEY);
        formData.set('subject', subject);
        formData.append('from_name', 'HTTDesign Website');
        formData.append('page', pageName + ' (' + location.pathname + ')');
        if (!f.email.value) formData.delete('email');

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: formData
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data && data.success) showSuccess();
            else showFallback();
          })
          .catch(function () { showFallback(); })
          .finally(function () {
            if (ctaSubmitBtn) { ctaSubmitBtn.disabled = false; ctaSubmitBtn.textContent = ctaSubmitLabel; }
          });
      });
    }
  }

  /* Lightbox gallery (project detail pages) */
  var galleryLinks = document.querySelectorAll('.gallery [data-full]');
  if (galleryLinks.length) {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML =
      '<button class="lightbox-close" aria-label="Đóng">&times;</button>' +
      '<button class="lightbox-prev" aria-label="Ảnh trước">&larr;</button>' +
      '<img src="" alt="">' +
      '<button class="lightbox-next" aria-label="Ảnh sau">&rarr;</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img');
    var items = Array.prototype.slice.call(galleryLinks);
    var idx = 0;

    function show(i) {
      idx = (i + items.length) % items.length;
      lbImg.src = items[idx].getAttribute('data-full');
      lbImg.alt = items[idx].getAttribute('data-caption') || '';
    }
    function open(i) { show(i); lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
    function close() { lb.classList.remove('is-open'); document.body.style.overflow = ''; }

    items.forEach(function (el, i) {
      el.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    });
    lb.querySelector('.lightbox-close').addEventListener('click', close);
    lb.querySelector('.lightbox-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lightbox-next').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }
})();
