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

  async function listDirFiles(path) {
    var dir;
    try { dir = await getDir(path, false); } catch (e) { return []; }
    var files = [];
    for await (var entry of dir.values()) {
      if (entry.kind === 'file') files.push(entry.name);
    }
    files.sort();
    return files;
  }

  async function deleteLocalFile(path) {
    var parts = path.split('/');
    var fileName = parts.pop();
    var dir = parts.length ? await getDir(parts.join('/'), false) : rootHandle;
    await dir.removeEntry(fileName);
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

  /* ---------- GitHub auto-push ---------- */
  function ghSettings() {
    return {
      owner: localStorage.getItem('htt_gh_owner') || 'NhakhoaEtrusca',
      repo: localStorage.getItem('htt_gh_repo') || 'httdesign-web',
      branch: localStorage.getItem('htt_gh_branch') || 'master',
      token: localStorage.getItem('htt_gh_token') || '',
      auto: localStorage.getItem('htt_gh_auto') === '1'
    };
  }

  function blobToBase64(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var binary = '';
      var chunk = 0x8000;
      for (var i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      return btoa(binary);
    });
  }

  function textToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function ghPushFile(path, base64Content, message) {
    var s = ghSettings();
    if (!s.token) throw new Error('Chưa cài Token GitHub trong tab Cài đặt');
    var api = 'https://api.github.com/repos/' + s.owner + '/' + s.repo + '/contents/' + path;
    var sha = null;
    var getRes = await fetch(api + '?ref=' + s.branch, {
      headers: { 'Authorization': 'Bearer ' + s.token, 'Accept': 'application/vnd.github+json' }
    });
    if (getRes.ok) { var j = await getRes.json(); sha = j.sha; }
    else if (getRes.status !== 404) {
      var e1 = await getRes.json().catch(function () { return {}; });
      throw new Error('Lỗi kiểm tra ' + path + ': ' + (e1.message || getRes.status));
    }
    var body = { message: message, content: base64Content, branch: s.branch };
    if (sha) body.sha = sha;
    var putRes = await fetch(api, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + s.token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!putRes.ok) {
      var err = await putRes.json().catch(function () { return {}; });
      throw new Error('Lỗi đẩy ' + path + ': ' + (err.message || putRes.status));
    }
  }

  async function ghPushBinary(path, blob, message) {
    var b64 = await blobToBase64(blob);
    return ghPushFile(path, b64, message);
  }

  async function ghPushText(path, text, message) {
    var b64 = textToBase64(text);
    return ghPushFile(path, b64, message);
  }

  async function ghListDir(path) {
    var s = ghSettings();
    if (!s.token) return [];
    var api = 'https://api.github.com/repos/' + s.owner + '/' + s.repo + '/contents/' + path + '?ref=' + s.branch;
    var res = await fetch(api, { headers: { 'Authorization': 'Bearer ' + s.token, 'Accept': 'application/vnd.github+json' } });
    if (!res.ok) return [];
    return res.json();
  }

  async function ghDeleteFile(path, sha, message) {
    var s = ghSettings();
    var api = 'https://api.github.com/repos/' + s.owner + '/' + s.repo + '/contents/' + path;
    var res = await fetch(api, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + s.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, sha: sha, branch: s.branch })
    });
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error('Lỗi xóa ' + path + ': ' + (err.message || res.status));
    }
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
      populateEditSelect();
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
  var ghOwnerEl = document.getElementById('ghOwner');
  var ghRepoEl = document.getElementById('ghRepo');
  var ghBranchEl = document.getElementById('ghBranch');
  var ghTokenEl = document.getElementById('ghToken');
  var ghAutoEl = document.getElementById('ghAuto');
  var ghSaveStatus = document.getElementById('ghSaveStatus');

  (function initGhSettings() {
    var s = ghSettings();
    ghOwnerEl.value = s.owner;
    ghRepoEl.value = s.repo;
    ghBranchEl.value = s.branch;
    ghTokenEl.value = s.token;
    ghAutoEl.checked = s.auto;
  })();

  document.getElementById('btnSaveGh').addEventListener('click', function () {
    localStorage.setItem('htt_gh_owner', ghOwnerEl.value.trim());
    localStorage.setItem('htt_gh_repo', ghRepoEl.value.trim());
    localStorage.setItem('htt_gh_branch', ghBranchEl.value.trim());
    localStorage.setItem('htt_gh_token', ghTokenEl.value.trim());
    localStorage.setItem('htt_gh_auto', ghAutoEl.checked ? '1' : '0');
    ghSaveStatus.textContent = '✓ Đã lưu cài đặt GitHub';
    ghSaveStatus.style.display = 'inline';
    setTimeout(function () { ghSaveStatus.style.display = 'none'; }, 2500);
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
      var pushedBlobs = [];

      log(addLog, 'Đang xử lý ' + newProjectFiles.length + ' ảnh...');
      for (var i = 0; i < newProjectFiles.length; i++) {
        var blob = await imageToWebpBlob(newProjectFiles[i], 2200);
        var imgPath = 'assets/img/projects/' + slug + '/' + pad3(i) + '.webp';
        await writeBinaryFile(imgPath, blob);
        pushedBlobs.push({ path: imgPath, blob: blob });
        log(addLog, '  ✓ Ảnh ' + (i + 1) + '/' + newProjectFiles.length + ' đã lưu');
      }

      log(addLog, 'Đang tạo trang dự án...');
      var pageHtml = buildProjectHtml(data);
      var pagePath = 'du-an/' + slug + '.html';
      await writeTextFile(pagePath, pageHtml);
      log(addLog, '  ✓ Đã tạo ' + pagePath);

      log(addLog, 'Đang thêm vào danh mục "' + CATEGORY_PAGES[category].label + '"...');
      var catFile = 'du-an/' + CATEGORY_PAGES[category].file;
      var catContent = await readTextFile(catFile);
      var catTile = buildTileHtml(data, false);
      var catUpdated = false;
      if (catContent.indexOf('<div class="masonry">') !== -1) {
        catContent = catContent.replace('<div class="masonry">', '<div class="masonry">\n' + catTile);
        await writeTextFile(catFile, catContent);
        catUpdated = true;
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

      var homeContent = null;

      log(addLog, '');
      log(addLog, '✅ Hoàn tất (đã lưu trên máy)! Dự án "' + name + '" đã được thêm vào website.');

      if (ghSettings().auto) {
        log(addLog, '');
        log(addLog, 'Đang đẩy lên GitHub...');
        try {
          for (var k = 0; k < pushedBlobs.length; k++) {
            await ghPushBinary(pushedBlobs[k].path, pushedBlobs[k].blob, 'Add project image (' + name + ')');
            log(addLog, '  ✓ Đã đẩy ' + pushedBlobs[k].path);
          }
          await ghPushText(pagePath, pageHtml, 'Add project page: ' + name);
          log(addLog, '  ✓ Đã đẩy ' + pagePath);
          if (catUpdated) {
            await ghPushText(catFile, catContent, 'Add "' + name + '" to ' + CATEGORY_PAGES[category].label);
            log(addLog, '  ✓ Đã đẩy ' + catFile);
          }
          await ghPushText('du-an/index.html', allContent, 'Add "' + name + '" to all-projects page');
          log(addLog, '  ✓ Đã đẩy du-an/index.html');
          if (homeContent !== null) {
            await ghPushText('index.html', homeContent, 'Add "' + name + '" hero image to homepage');
            log(addLog, '  ✓ Đã đẩy index.html');
          }
          log(addLog, '✅ Đã đẩy lên GitHub — web thật sẽ cập nhật sau 1-2 phút.');
        } catch (ghErr) {
          log(addLog, '❌ Lỗi đẩy GitHub: ' + ghErr.message);
          log(addLog, '   (File đã lưu an toàn trên máy, bạn có thể nhờ đẩy lại sau)');
        }
      }

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
      var savedBlobs = [];
      for (var i = 0; i < heroFiles.length; i++) {
        var blob = await imageToWebpBlob(heroFiles[i], 2200);
        var stamp = Date.now() + '-' + i;
        var relPath = 'assets/img/hero/custom-' + stamp + '.webp';
        await writeBinaryFile(relPath, blob);
        savedPaths.push(relPath);
        savedBlobs.push(blob);
        log(heroLog, '✓ Đã lưu ảnh ' + (i + 1) + '/' + heroFiles.length);
      }

      var homeContent = null, projContent = null;
      if (target === 'home' || target === 'both') {
        homeContent = await readTextFile('index.html');
        savedPaths.forEach(function (p) {
          homeContent = insertHeroSlide(homeContent, '  <div class="hero-slide" style="background-image:url(\'' + p + '\')"></div>\n');
        });
        await writeTextFile('index.html', homeContent);
        log(heroLog, '✓ Đã thêm vào ảnh nền Trang chủ');
      }
      if (target === 'projects' || target === 'both') {
        projContent = await readTextFile('du-an/index.html');
        savedPaths.forEach(function (p) {
          projContent = insertHeroSlide(projContent, '  <div class="hero-slide" style="background-image:url(\'../' + p + '\')"></div>\n');
        });
        await writeTextFile('du-an/index.html', projContent);
        log(heroLog, '✓ Đã thêm vào ảnh nền trang Dự án');
      }
      log(heroLog, '');
      log(heroLog, '✅ Hoàn tất (đã lưu trên máy)!');

      if (ghSettings().auto) {
        log(heroLog, '');
        log(heroLog, 'Đang đẩy lên GitHub...');
        try {
          for (var j = 0; j < savedPaths.length; j++) {
            await ghPushBinary(savedPaths[j], savedBlobs[j], 'Add hero image via admin (' + savedPaths[j] + ')');
            log(heroLog, '  ✓ Đã đẩy ' + savedPaths[j]);
          }
          if (homeContent !== null) {
            await ghPushText('index.html', homeContent, 'Update homepage hero slides via admin');
            log(heroLog, '  ✓ Đã đẩy index.html');
          }
          if (projContent !== null) {
            await ghPushText('du-an/index.html', projContent, 'Update projects page hero slides via admin');
            log(heroLog, '  ✓ Đã đẩy du-an/index.html');
          }
          log(heroLog, '✅ Đã đẩy lên GitHub — web thật sẽ cập nhật sau 1-2 phút.');
        } catch (ghErr) {
          log(heroLog, '❌ Lỗi đẩy GitHub: ' + ghErr.message);
          log(heroLog, '   (File đã lưu an toàn trên máy, bạn có thể nhờ đẩy lại sau)');
        }
      }

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

  /* ---------- Edit project ---------- */
  function replaceTile(content, slug, newTile) {
    var re = new RegExp('<a class="masonry-tile"[^>]*href="' + slug + '\\.html"[\\s\\S]*?<\\/a>\\n?');
    if (!re.test(content)) return null;
    return content.replace(re, newTile);
  }

  async function populateEditSelect() {
    eProjectSelect.innerHTML = '<option value="">— Chọn dự án —</option>';
    if (!rootHandle) return;
    try {
      var content = await readTextFile('du-an/index.html');
      var re = /<a class="masonry-tile" data-category="([^"]*)" href="([^"]+)"[\s\S]*?<h4>([^<]*)<\/h4>/g;
      var m;
      while ((m = re.exec(content)) !== null) {
        var category = m[1], slug = m[2].replace(/\.html$/, ''), name = m[3];
        var opt = document.createElement('option');
        opt.value = slug;
        opt.dataset.category = category;
        opt.textContent = name;
        eProjectSelect.appendChild(opt);
      }
    } catch (e) {}
  }

  var eProjectSelect = document.getElementById('eProjectSelect');
  var eEditArea = document.getElementById('eEditArea');
  var eExistingThumbs = document.getElementById('eExistingThumbs');
  var eName = document.getElementById('eName');
  var eLocation = document.getElementById('eLocation');
  var eYear = document.getElementById('eYear');
  var eStoryTitle = document.getElementById('eStoryTitle');
  var eStory = document.getElementById('eStory');
  var editLog = document.getElementById('editLog');
  var editState = null;

  document.querySelector('[data-tab="edit-project"]').addEventListener('click', populateEditSelect);

  function renderExistingThumbs() {
    eExistingThumbs.innerHTML = '';
    editState.existingFiles.forEach(function (fname) {
      if (editState.removed.indexOf(fname) !== -1) return;
      var d = document.createElement('div');
      d.className = 'thumb';
      var img = document.createElement('img');
      img.src = editState.imgDirPath + '/' + fname;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '×';
      btn.addEventListener('click', function () {
        editState.removed.push(fname);
        renderExistingThumbs();
      });
      d.appendChild(img); d.appendChild(btn);
      eExistingThumbs.appendChild(d);
    });
  }

  var eNewFiles = [];
  bindUploader('eDropZone', 'eFileInput', 'eNewThumbs', eNewFiles);

  eProjectSelect.addEventListener('change', async function () {
    editLog.textContent = '';
    editLog.classList.remove('show');
    var slug = eProjectSelect.value;
    if (!slug) { eEditArea.style.display = 'none'; editState = null; return; }
    var opt = eProjectSelect.options[eProjectSelect.selectedIndex];
    var category = opt.dataset.category;

    try {
      var pagePath = 'du-an/' + slug + '.html';
      var html = await readTextFile(pagePath);

      var titleM = /<h1>([^<]*)<\/h1>/.exec(html);
      var locM = /<span>Địa điểm<\/span><b>([^<]*)<\/b>/.exec(html);
      var yearM = /<span>Năm hoàn thành<\/span><b>([^<]*)<\/b>/.exec(html);
      var storyBlockM = /<div class="story">[\s\S]*?<h2>([^<]*)<\/h2>\s*<\/div>\s*<div>\s*([\s\S]*?)\s*<\/div>\s*<\/div>/.exec(html);

      if (!titleM || !storyBlockM) {
        alert('Trang dự án này có định dạng khác với chuẩn admin tool, chưa hỗ trợ sửa tự động. Vui lòng sửa file HTML trực tiếp.');
        eEditArea.style.display = 'none';
        return;
      }

      eName.value = titleM[1];
      eLocation.value = locM ? locM[1] : '';
      eYear.value = yearM ? yearM[1] : '';
      eStoryTitle.value = storyBlockM[1];
      var paras = [];
      var pRe = /<p>([\s\S]*?)<\/p>/g, pm;
      while ((pm = pRe.exec(storyBlockM[2])) !== null) paras.push(pm[1].trim());
      eStory.value = paras.join('\n\n');

      var imgDir = 'assets/img/projects/' + slug;
      var existingFiles = await listDirFiles(imgDir);
      existingFiles = existingFiles.filter(function (f) { return /\.webp$/i.test(f); });

      editState = { slug: slug, category: category, imgDir: imgDir, imgDirPath: '../' + imgDir, pagePath: pagePath, existingFiles: existingFiles, removed: [] };
      eNewFiles.length = 0;
      document.getElementById('eNewThumbs').innerHTML = '';
      renderExistingThumbs();
      eEditArea.style.display = 'block';
    } catch (e) {
      alert('Không đọc được dự án: ' + e.message);
    }
  });

  document.getElementById('btnSaveEdit').addEventListener('click', async function () {
    if (!editState) return;
    editLog.textContent = '';
    var name = eName.value.trim();
    if (!name) { alert('Vui lòng nhập tên dự án.'); return; }
    var keepFiles = editState.existingFiles.filter(function (f) { return editState.removed.indexOf(f) === -1; });
    if (!keepFiles.length && !eNewFiles.length) { alert('Dự án phải có ít nhất 1 ảnh.'); return; }

    try {
      log(editLog, 'Đang đọc lại ảnh hiện có...');
      var keptBlobs = [];
      for (var i = 0; i < keepFiles.length; i++) {
        var fh = await (await getDir(editState.imgDir, false)).getFileHandle(keepFiles[i]);
        keptBlobs.push(await fh.getFile());
      }
      log(editLog, 'Đang chuyển đổi ' + eNewFiles.length + ' ảnh mới...');
      var newBlobs = [];
      for (var j = 0; j < eNewFiles.length; j++) {
        newBlobs.push(await imageToWebpBlob(eNewFiles[j], 2200));
      }

      var finalBlobs = keptBlobs.concat(newBlobs);
      var oldCount = editState.existingFiles.length;

      log(editLog, 'Đang xóa ảnh cũ trên máy...');
      for (var k = 0; k < editState.existingFiles.length; k++) {
        await deleteLocalFile(editState.imgDir + '/' + editState.existingFiles[k]);
      }
      log(editLog, 'Đang lưu ' + finalBlobs.length + ' ảnh...');
      for (var n = 0; n < finalBlobs.length; n++) {
        await writeBinaryFile(editState.imgDir + '/' + pad3(n) + '.webp', finalBlobs[n]);
      }

      var data = {
        name: name, slug: editState.slug, category: editState.category,
        location: eLocation.value.trim(), year: eYear.value.trim(),
        storyTitle: eStoryTitle.value.trim(), story: eStory.value.trim(),
        images: finalBlobs
      };

      log(editLog, 'Đang cập nhật trang dự án...');
      var pageHtml = buildProjectHtml(data);
      await writeTextFile(editState.pagePath, pageHtml);

      log(editLog, 'Đang cập nhật danh mục...');
      var catFile = 'du-an/' + CATEGORY_PAGES[editState.category].file;
      var catContent = await readTextFile(catFile);
      var catNew = replaceTile(catContent, editState.slug, buildTileHtml(data, false));
      if (catNew !== null) { catContent = catNew; await writeTextFile(catFile, catContent); }

      var allContent = await readTextFile('du-an/index.html');
      var allNew = replaceTile(allContent, editState.slug, buildTileHtml(data, true));
      if (allNew !== null) { allContent = allNew; await writeTextFile('du-an/index.html', allContent); }

      log(editLog, '');
      log(editLog, '✅ Hoàn tất (đã lưu trên máy)!');

      if (ghSettings().auto) {
        log(editLog, '');
        log(editLog, 'Đang đẩy lên GitHub...');
        try {
          for (var p = 0; p < finalBlobs.length; p++) {
            await ghPushBinary(editState.imgDir + '/' + pad3(p) + '.webp', finalBlobs[p], 'Update project image (' + name + ')');
          }
          if (finalBlobs.length < oldCount) {
            var ghFiles = await ghListDir(editState.imgDir);
            for (var q = 0; q < ghFiles.length; q++) {
              var gm = /^(\d+)\.webp$/.exec(ghFiles[q].name);
              if (gm && parseInt(gm[1], 10) >= finalBlobs.length) {
                await ghDeleteFile(ghFiles[q].path, ghFiles[q].sha, 'Remove unused project image (' + name + ')');
              }
            }
          }
          log(editLog, '  ✓ Đã đẩy ảnh');
          await ghPushText(editState.pagePath, pageHtml, 'Update project page: ' + name);
          log(editLog, '  ✓ Đã đẩy ' + editState.pagePath);
          if (catNew !== null) {
            await ghPushText(catFile, catContent, 'Update "' + name + '" in ' + CATEGORY_PAGES[editState.category].label);
            log(editLog, '  ✓ Đã đẩy ' + catFile);
          }
          if (allNew !== null) {
            await ghPushText('du-an/index.html', allContent, 'Update "' + name + '" in all-projects page');
            log(editLog, '  ✓ Đã đẩy du-an/index.html');
          }
          log(editLog, '✅ Đã đẩy lên GitHub — web thật sẽ cập nhật sau 1-2 phút.');
        } catch (ghErr) {
          log(editLog, '❌ Lỗi đẩy GitHub: ' + ghErr.message);
          log(editLog, '   (File đã lưu an toàn trên máy, bạn có thể nhờ đẩy lại sau)');
        }
      }

      eProjectSelect.value = '';
      eEditArea.style.display = 'none';
      editState = null;
      refreshProjectList();
    } catch (e) {
      log(editLog, '❌ Lỗi: ' + e.message);
    }
  });
})();
