// HTTDesign — shared site behavior: nav, filter, lightbox, contact form
(function () {
  'use strict';

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

  /* Consultation modal ("Nhận tư vấn") */
  var ctaModal = document.querySelector('.cta-modal');
  if (ctaModal) {
    var ctaOpeners = document.querySelectorAll('[data-open-cta]');
    var ctaClose = ctaModal.querySelector('.cta-modal-close');
    ctaOpeners.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        ctaModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
    });
    var ctaForm = ctaModal.querySelector('form');
    var ctaSuccess = ctaModal.querySelector('.cta-success');
    function closeCtaModal() {
      ctaModal.classList.remove('is-open');
      document.body.style.overflow = '';
      if (ctaForm && ctaSuccess) {
        ctaForm.reset();
        ctaForm.style.display = '';
        ctaSuccess.style.display = 'none';
        var titleEl = ctaSuccess.querySelector('.cta-success-title');
        var textEl = ctaSuccess.querySelector('.cta-success-text');
        var mailLink = ctaSuccess.querySelector('.cta-mail-link');
        if (titleEl) titleEl.textContent = 'Đã gửi yêu cầu thành công';
        if (textEl) textEl.textContent = 'Cảm ơn bạn đã liên hệ. HTTDesign đã nhận được thông tin và sẽ phản hồi trong thời gian sớm nhất. Trong lúc chờ, bạn cũng có thể liên hệ trực tiếp:';
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
        var subject = 'Yeu cau tu van - ' + f.firstName.value + ' ' + f.lastName.value;
        var body =
          'Ho: ' + f.firstName.value + '\n' +
          'Ten: ' + f.lastName.value + '\n' +
          'Email: ' + f.email.value + '\n' +
          'Dien thoai: ' + f.phone.value + '\n' +
          'Chu de: ' + f.subject.value + '\n' +
          'Loai tu van: ' + f.consultType.value + '\n\n' +
          'Noi dung:\n' + f.message.value;
        var mailtoUrl =
          'mailto:ktshuathanhtin@gmail.com' +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);

        function showSuccess() {
          ctaForm.style.display = 'none';
          if (ctaSuccess) ctaSuccess.style.display = 'block';
        }
        function showFallback() {
          if (ctaSuccess) {
            var titleEl = ctaSuccess.querySelector('.cta-success-title');
            var textEl = ctaSuccess.querySelector('.cta-success-text');
            var mailLink = ctaSuccess.querySelector('.cta-mail-link');
            if (titleEl) titleEl.textContent = 'Đã ghi nhận yêu cầu của bạn';
            if (textEl) textEl.textContent = 'Không thể gửi tự động, vui lòng bấm nút bên dưới để mở email, hoặc liên hệ trực tiếp:';
            if (mailLink) { mailLink.href = mailtoUrl; mailLink.style.display = ''; }
            ctaForm.style.display = 'none';
            ctaSuccess.style.display = 'block';
          } else {
            window.location.href = mailtoUrl;
          }
        }

        if (ctaSubmitBtn) { ctaSubmitBtn.disabled = true; ctaSubmitBtn.textContent = 'Đang gửi...'; }

        var formData = new FormData(f);
        formData.append('access_key', WEB3FORMS_ACCESS_KEY);
        formData.set('subject', subject);
        formData.append('from_name', 'HTTDesign Website');

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
