// HTTDesign — Admin tool (client-side, File System Access API)
// Only works in Chromium browsers (Chrome / Edge) on desktop.
(function () {
  'use strict';

  var rootHandle = null;

  var CATEGORY_PAGES = {
    'biet-thu':   { file: 'nha-o-biet-thu.html',    label: 'Nhà ở, Biệt thự' },
    'thuong-mai': { file: 'thuong-mai.html',        label: 'Thương mại' },
    'van-phong':  { file: 'van-phong.html',         label: 'Văn phòng' },
    'khach-san':  { file: 'khach-san-resort.html',  label: 'Khách sạn & Resort' },
    'cad':        { file: 'cad.html',               label: 'Khai triển bản vẽ kỹ thuật' }
  };

  var GALLERY_CLASSES = ['g-wide', 'g-tall', 'g-third', 'g-third', 'g-half', 'g-third', 'g-third'];

  /* ---------- Utilities ---------- */
  function slugify(str) {
    str = str.toLowerCase().trim();
    var from = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
    var to   = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
    for (var i = 0; i < from.length; i++) str = str.split(from[i]).join(to[i]);
    return str.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function pad3(n) { return String(n).padStart(3, '0'); }

  function log(el, msg) {
    el.classList.add('show');
    el.textContent += msg + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function imageToWebpBlob(file, maxW) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var scale = Math.min(1, maxW / img.width);
        var w = Math.round(img.width * scale);
        var h = Math.round(img.height * scale);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob); else reject(new Error('Không chuyển đổi được ảnh'));
        }, 'image/webp', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Không đọc được file ảnh')); };
      img.src = url;
    });
  }

  async function getDir(path, create) {
    var parts = path.split('/').filter(Boolean);
    var dir = rootHandle;
    for (var i = 0; i < parts.length; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: !!create });
    }
    return dir;
  }

  async function readTextFile(path) {
    var parts = path.split('/');
    var fileName = parts.pop();
    var dir = parts.length ? await getDir(parts.join('/'), false) : rootHandle;
    var handle = await dir.getFileHandle(fileName);
    var file = await handle.getFile();
    return file.text();
  }

  async function writeTextFile(path, content) {
    var parts = path.split('/');
    var fileName = parts.pop();
    var dir = parts.length ? await getDir(parts.join('/'), true) : rootHandle;
    var handle = await dir.getFileHandle(fileName, { create: true });
    var writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async function writeBinaryFile(path, blob) {
    var parts = path.split('/');
    var fileName = parts.pop();
    var dir = parts.length ? await getDir(parts.join('/'), true) : rootHandle;
    var handle = await dir.getFileHandle(fileName, { create: true });
    var writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  /* ---------- Connect folder ---------- */
  var btnConnect = document.getElementById('btnConnect');
  var connStatus = document.getElementById('connStatus');
  var connText = document.getElementById('connText');
  var mainTools = document.getElementById('mainTools');

  if (!window.showDirectoryPicker) {
    document.getElementById('unsupportedWarn').style.display = 'block';
    btnConnect.disabled = true;
  }

  btnConnect.addEventListener('click', async function () {
    try {
      var handle = await window.showDirectoryPicker();
      // sanity check: expect an index.html and a du-an folder
      var hasIndex = false, hasDuAn = false;
      try { await handle.getFileHandle('index.html'); hasIndex = true; } catch (e) {}
      try { await handle.getDirectoryHandle('du-an'); hasDuAn = true; } catch (e) {}
      if (!hasIndex || !hasDuAn) {
        alert('Thư mục này không giống thư mục website HTTDesign (thiếu index.html hoặc thư mục du-an). Vui lòng chọn đúng thư mục gốc.');
        return;
      }
      rootHandle = handle;
      connStatus.classList.remove('off');
      connStatus.classList.add('on');
      connText.textContent = 'Đã kết nối: ' + handle.name;
      mainTools.style.display = 'block';
      refreshProjectList();
    } catch (e) {
      if (e.name !== 'AbortError') alert('Không thể kết nối thư mục: ' + e.message);
    }
  });

  /* ---------- Tabs ---------- */
  document.querySelectorAll('.admin-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.admin-tab-btn').forEach(function (b) { b.classList.remove('is-active'); });
      document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('is-active'); });
      btn.classList.add('is-active');
      document.getElementById('panel-' + btn.getAttribute('data-tab')).classList.add('is-active');
    });
  });

  /* ---------- Settings ---------- */
  var autoHeroToggle = document.getElementById('autoHeroToggle');
  autoHeroToggle.checked = localStorage.getItem('htt_auto_hero') === '1';
  autoHeroToggle.addEventListener('change', function () {
    localStorage.setItem('htt_auto_hero', autoHeroToggle.checked ? '1' : '0');
  });

  /* ---------- Drop zone / uploader ---------- */
  function bindUploader(zoneId, inputId, thumbsId, store) {
    var zone = document.getElementById(zoneId);
    var input = document.getElementById(inputId);
    var thumbs = document.getElementById(thumbsId);

    function render() {
      thumbs.innerHTML = '';
      store.forEach(function (f, i) {
        var d = document.createElement('div');
        d.className = 'thumb';
        var img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '×';
        btn.addEventListener('click', function () { store.splice(i, 1); render(); });
        d.appendChild(img); d.appendChild(btn);
        thumbs.appendChild(d);
      });
    }
    function addFiles(list) {
      Array.prototype.forEach.call(list, function (f) {
        if (f.type.indexOf('image/') === 0) store.push(f);
      });
      render();
    }
    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('drag'); });
    zone.addEventListener('drop', function (e) { e.preventDefault(); zone.classList.remove('drag'); addFiles(e.dataTransfer.files); });
    input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
  }

  var newProjectFiles = [];
  bindUploader('pDropZone', 'pFileInput', 'pThumbs', newProjectFiles);

  var heroFiles = [];
  bindUploader('hDropZone', 'hFileInput', 'hThumbs', heroFiles);

  /* ---------- Project page template ---------- */
  function buildProjectHtml(data) {
    var storyParas = data.story.split(/\n\s*\n/).filter(Boolean)
      .map(function (p) { return '        <p>' + p.trim() + '</p>'; }).join('\n');
    if (!storyParas) storyParas = '        <p>' + data.name + ' là dự án do HTTDesign thiết kế &amp; thi công.</p>';

    var metaItems = [];
    if (data.location) metaItems.push('      <div class="meta-item"><span>Địa điểm</span><b>' + data.location + '</b></div>');
    metaItems.push('      <div class="meta-item"><span>Loại hình</span><b>' + CATEGORY_PAGES[data.category].label + '</b></div>');
    if (data.year) metaItems.push('      <div class="meta-item"><span>Năm hoàn thành</span><b>' + data.year + '</b></div>');

    var galleryFigs = data.images.slice(1).map(function (_, i) {
      var idx = i + 1;
      var cls = GALLERY_CLASSES[i % GALLERY_CLASSES.length];
      var src = '../assets/img/projects/' + data.slug + '/' + pad3(idx) + '.webp';
      return '      <figure class="' + cls + '"><a href="#" data-full="' + src + '" data-caption="' + data.name + '"><img src="' + src + '" alt="' + data.name + '" loading="lazy"></a></figure>';
    }).join('\n');

    var heroImg = '../assets/img/projects/' + data.slug + '/000.webp';

    return '<!DOCTYPE html>\n<html lang="vi">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<title>' + data.name + ' | Dự án HTTDesign</title>\n' +
      '<meta name="description" content="' + data.name + ' — dự án do HTTDesign thiết kế &amp; thi công.">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="../assets/css/style.css">\n</head>\n<body>\n\n' +
      '<header class="site-header is-solid">\n  <div class="container">\n    <a href="../index.html" class="brand"><img src="../assets/img/brand/logo-white.webp" alt="HTTDesign"></a>\n' +
      '    <nav class="nav">\n      <ul class="nav-links">\n        <li><a href="index.html" class="active">Dự án</a></li>\n        <li><a href="../gioi-thieu.html">Giới thiệu</a></li>\n        <li><a href="https://www.facebook.com/HTTDesign" target="_blank" rel="noopener">Fanpage</a></li>\n      </ul>\n      <button class="nav-toggle" aria-label="Menu"><span></span></button>\n    </nav>\n  </div>\n</header>\n\n' +
      '<div class="mobile-menu">\n  <a href="index.html">Dự án</a>\n  <a href="../gioi-thieu.html">Giới thiệu</a>\n  <a href="https://www.facebook.com/HTTDesign" target="_blank" rel="noopener">Fanpage</a>\n  <a href="tel:0982741770" class="hotline">0982 741 770</a>\n</div>\n\n' +
      '<section class="page-hero" style="background-image:url(\'' + heroImg + '\')">\n  <div class="page-hero-inner">\n    <div class="breadcrumb"><a href="../index.html">Trang chủ</a> / <a href="index.html">Dự án</a> / ' + data.name + '</div>\n    <h1>' + data.name + '</h1>\n  </div>\n</section>\n\n' +
      '<section class="section">\n  <div class="container">\n    <div class="meta-bar">\n' + metaItems.join('\n') + '\n    </div>\n\n' +
      '    <div class="story">\n      <div>\n        <div class="eyebrow">Câu chuyện thiết kế</div>\n        <h2>' + (data.storyTitle || data.name) + '</h2>\n      </div>\n      <div>\n' + storyParas + '\n      </div>\n    </div>\n\n' +
      '    <div class="gallery">\n' + galleryFigs + '\n    </div>\n\n' +
      '    <div class="cta-band">\n      <h2>Tư vấn dự án tương tự</h2>\n      <div class="hero-actions">\n        <a href="tel:0982741770" class="btn btn--primary">Gọi ngay 0982 741 770</a>\n        <a href="https://www.facebook.com/HTTDesign" target="_blank" rel="noopener" class="btn btn--outline">Fanpage</a>\n      </div>\n    </div>\n  </div>\n</section>\n\n' +
      '<footer class="site-footer">\n  <div class="container">\n    <div class="footer-grid">\n      <div class="footer-brand">\n        <img src="../assets/img/brand/logo-white.webp" alt="HTTDesign" style="height:32px;margin-bottom:18px">\n        <p>Công ty TNHH Thiết Kế HTT — Design &amp; Build biệt thự, nhà phố, văn phòng và công trình thương mại từ 2014.</p>\n        <div class="footer-social">\n          <a href="https://www.facebook.com/HTTDesign" target="_blank" rel="noopener" aria-label="Facebook">f</a>\n          <a href="mailto:ktshuathanhtin@gmail.com" aria-label="Email">@</a>\n        </div>\n      </div>\n' +
      '      <div><h4>Điều hướng</h4><ul>\n        <li><a href="../index.html">Trang chủ</a></li>\n        <li><a href="index.html">Dự án</a></li>\n        <li><a href="../gioi-thieu.html">Giới thiệu</a></li>\n        <li><a href="https://www.facebook.com/HTTDesign" target="_blank" rel="noopener">Fanpage</a></li>\n      </ul></div>\n' +
      '      <div><h4>Dịch vụ</h4><ul>\n        <li><a href="../gioi-thieu.html">Thiết kế</a></li>\n        <li><a href="../gioi-thieu.html">Thi công</a></li>\n        <li><a href="../gioi-thieu.html">Design &amp; Build</a></li>\n      </ul></div>\n' +
      '      <div><h4>Liên hệ</h4><ul>\n        <li>82 Đường số 3, Lavila Nam Sài Gòn,<br>Xã Phước Kiển, Nhà Bè, TP.HCM</li>\n        <li><a href="tel:0982741770">0982 741 770</a></li>\n        <li><a href="mailto:ktshuathanhtin@gmail.com">ktshuathanhtin@gmail.com</a></li>\n      </ul></div>\n    </div>\n' +
      '    <div class="footer-bottom">\n      <span>© 2026 HTTDesign Co., Ltd Vietnam.</span>\n      <span>Design &amp; Build</span>\n    </div>\n  </div>\n</footer>\n\n' +
      '<div class="sticky-cta">\n  <div class="row">\n    <a href="tel:0982741770">Hotline</a>\n    <a href="https://www.facebook.com/HTTDesign" target="_blank" rel="noopener">Fanpage</a>\n  </div>\n</div>\n\n' +
      '<script src="../assets/js/main.js"></script>\n</body>\n</html>\n';
  }

  function buildTileHtml(data, withCategoryAttr) {
    var heroImg = 'assets/img/projects/' + data.slug + '/000.webp';
    var catAttr = withCategoryAttr ? (' data-category="' + data.category + '"') : '';
    return '      <a class="masonry-tile"' + catAttr + ' href="' + data.slug + '.html">\n' +
      '        <img src="' + heroImg + '" alt="' + data.name + '" loading="lazy">\n' +
      '        <div class="mt-overlay"><div><span class="tag">' + (data.location || CATEGORY_PAGES[data.category].label) + '</span><h4>' + data.name + '</h4></div></div>\n' +
      '      </a>\n';
  }

  /* ---------- Add project ---------- */
  var addLog = document.getElementById('addProjectLog');
  document.getElementById('btnAddProject').addEventListener('click', async function () {
    addLog.textContent = '';
    var name = document.getElementById('pName').value.trim();
    var category = document.getElementById('pCategory').value;
    var location = document.getElementById('pLocation').value.trim();
    var year = document.getElementById('pYear').value.trim();
    var storyTitle = document.getElementById('pStoryTitle').value.trim();
    var story = document.getElementById('pStory').value.trim();

    if (!rootHandle) { alert('Vui lòng kết nối thư mục website trước.'); return; }
    if (!name) { alert('Vui lòng nhập tên dự án.'); return; }
    if (!newProjectFiles.length) { alert('Vui lòng tải lên ít nhất 1 ảnh.'); return; }

    var slug = slugify(name);
    var data = { name: name, slug: slug, category: category, location: location, year: year, storyTitle: storyTitle, story: story, images: newProjectFiles };

    try {
      log(addLog, 'Đang xử lý ' + newProjectFiles.length + ' ảnh...');
      for (var i = 0; i < newProjectFiles.length; i++) {
        var blob = await imageToWebpBlob(newProjectFiles[i], 2200);
        await writeBinaryFile('assets/img/projects/' + slug + '/' + pad3(i) + '.webp', blob);
        log(addLog, '  ✓ Ảnh ' + (i + 1) + '/' + newProjectFiles.length + ' đã lưu');
      }

      log(addLog, 'Đang tạo trang dự án...');
      var pageHtml = buildProjectHtml(data);
      await writeTextFile('du-an/' + slug + '.html', pageHtml);
      log(addLog, '  ✓ Đã tạo du-an/' + slug + '.html');

      log(addLog, 'Đang thêm vào danh mục "' + CATEGORY_PAGES[category].label + '"...');
      var catFile = 'du-an/' + CATEGORY_PAGES[category].file;
      var catContent = await readTextFile(catFile);
      var catTile = buildTileHtml(data, false);
      if (catContent.indexOf('<div class="masonry">') !== -1) {
        catContent = catContent.replace('<div class="masonry">', '<div class="masonry">\n' + catTile);
        await writeTextFile(catFile, catContent);
        log(addLog, '  ✓ Đã thêm vào ' + catFile);
      } else {
        log(addLog, '  ⚠ Không tìm thấy vị trí lưới ảnh trong ' + catFile);
      }

      log(addLog, 'Đang thêm vào trang "Toàn bộ dự án"...');
      var allContent = await readTextFile('du-an/index.html');
      var allTile = buildTileHtml(data, true);
      if (allContent.indexOf('<div class="masonry">') !== -1) {
        allContent = allContent.replace('<div class="masonry">', '<div class="masonry">\n' + allTile);
        await writeTextFile('du-an/index.html', allContent);
        log(addLog, '  ✓ Đã thêm vào du-an/index.html');
      }

      if (autoHeroToggle.checked && category !== 'cad') {
        log(addLog, 'Đang thêm ảnh vào vòng xoay ảnh nền (tự động)...');
        var slideDiv = '  <div class="hero-slide" style="background-image:url(\'assets/img/projects/' + slug + '/000.webp\')"></div>\n';
        var homeContent = await readTextFile('index.html');
        homeContent = insertHeroSlide(homeContent, slideDiv);
        await writeTextFile('index.html', homeContent);

        var slideDivRel = slideDiv.replace("url('assets/", "url('../assets/");
        var projContent = await readTextFile('du-an/index.html');
        projContent = insertHeroSlide(projContent, slideDivRel);
        await writeTextFile('du-an/index.html', projContent);
        log(addLog, '  ✓ Đã thêm ảnh nền');
      }

      log(addLog, '');
      log(addLog, '✅ Hoàn tất! Dự án "' + name + '" đã được thêm vào website.');
      log(addLog, 'Nếu website đã đưa lên GitHub Pages, nhớ đồng bộ (commit & push) để cập nhật bản thật.');

      document.getElementById('pName').value = '';
      document.getElementById('pLocation').value = '';
      document.getElementById('pYear').value = '';
      document.getElementById('pStoryTitle').value = '';
      document.getElementById('pStory').value = '';
      newProjectFiles.length = 0;
      document.getElementById('pThumbs').innerHTML = '';
      refreshProjectList();
    } catch (e) {
      log(addLog, '❌ Lỗi: ' + e.message);
    }
  });

  function insertHeroSlide(content, slideDiv) {
    var marker = '<div class="hero-inner">';
    var idx = content.indexOf(marker);
    if (idx === -1) return content;
    return content.slice(0, idx) + slideDiv + content.slice(idx);
  }

  /* ---------- Hero images ---------- */
  var heroLog = document.getElementById('heroLog');
  document.getElementById('btnAddHero').addEventListener('click', async function () {
    heroLog.textContent = '';
    if (!rootHandle) { alert('Vui lòng kết nối thư mục website trước.'); return; }
    if (!heroFiles.length) { alert('Vui lòng chọn ít nhất 1 ảnh.'); return; }
    var target = document.getElementById('hTarget').value;

    try {
      var savedPaths = [];
      for (var i = 0; i < heroFiles.length; i++) {
        var blob = await imageToWebpBlob(heroFiles[i], 2200);
        var stamp = Date.now() + '-' + i;
        var relPath = 'assets/img/hero/custom-' + stamp + '.webp';
        await writeBinaryFile(relPath, blob);
        savedPaths.push(relPath);
        log(heroLog, '✓ Đã lưu ảnh ' + (i + 1) + '/' + heroFiles.length);
      }

      if (target === 'home' || target === 'both') {
        var homeContent = await readTextFile('index.html');
        savedPaths.forEach(function (p) {
          homeContent = insertHeroSlide(homeContent, '  <div class="hero-slide" style="background-image:url(\'' + p + '\')"></div>\n');
        });
        await writeTextFile('index.html', homeContent);
        log(heroLog, '✓ Đã thêm vào ảnh nền Trang chủ');
      }
      if (target === 'projects' || target === 'both') {
        var projContent = await readTextFile('du-an/index.html');
        savedPaths.forEach(function (p) {
          projContent = insertHeroSlide(projContent, '  <div class="hero-slide" style="background-image:url(\'../' + p + '\')"></div>\n');
        });
        await writeTextFile('du-an/index.html', projContent);
        log(heroLog, '✓ Đã thêm vào ảnh nền trang Dự án');
      }
      log(heroLog, '');
      log(heroLog, '✅ Hoàn tất!');
      heroFiles.length = 0;
      document.getElementById('hThumbs').innerHTML = '';
    } catch (e) {
      log(heroLog, '❌ Lỗi: ' + e.message);
    }
  });

  /* ---------- Project list ---------- */
  async function refreshProjectList() {
    var listEl = document.getElementById('projectList');
    if (!rootHandle) return;
    try {
      var content = await readTextFile('du-an/index.html');
      var re = /<a class="masonry-tile"[^>]*href="([^"]+)"[\s\S]*?<span class="tag">([^<]*)<\/span><h4>([^<]*)<\/h4>/g;
      var match, rows = [];
      while ((match = re.exec(content)) !== null) {
        rows.push({ href: match[1], tag: match[2], name: match[3] });
      }
      if (!rows.length) { listEl.innerHTML = '<div class="p-row">Chưa đọc được danh sách dự án.</div>'; return; }
      listEl.innerHTML = rows.map(function (r) {
        return '<div class="p-row"><span>' + r.name + '</span><span class="cat">' + r.tag + '</span></div>';
      }).join('');
    } catch (e) {
      listEl.innerHTML = '<div class="p-row">Không đọc được danh sách (' + e.message + ')</div>';
    }
  }
  document.getElementById('btnRefreshList').addEventListener('click', refreshProjectList);
})();
