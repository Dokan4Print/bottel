/* ================================================================
   0) pv-fixed — تثبيت عمود العرض (الشمال)
================================================================ */
(function () {
  function syncPV() {
    if (!document.body.classList.contains("pv-fixed")) return;

    const pv = document.querySelector(".hero-view");
    if (!pv) return;

    const container =
      pv.closest(".hero-container") ||
      document.querySelector(".hero-container");
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const cs = getComputedStyle(container);
    const root = document.documentElement;
    const rs = getComputedStyle(root);

    let leftPctStr =
      rs.getPropertyValue("--hero-left-w-d").trim() ||
      rs.getPropertyValue("--left-w-d").trim() ||
      "40";
    let pct = parseFloat(leftPctStr);
    if (isNaN(pct)) pct = 40;
    pct = pct / 100;

    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const padRight = parseFloat(cs.paddingRight) || 0;

    const innerWidth = cRect.width - padLeft - padRight;
    const pvWidth = innerWidth * pct;
    const pvLeft = cRect.left + padLeft;

    root.style.setProperty("--hero-pv-left", pvLeft + "px");
    root.style.setProperty("--hero-pv-width", pvWidth + "px");
    root.style.setProperty("--pv-left", pvLeft + "px");
    root.style.setProperty("--pv-width", pvWidth + "px");
  }

  window.addEventListener("load", syncPV, { passive: true });
  window.addEventListener("resize", syncPV, { passive: true });
  window.addEventListener("orientationchange", syncPV, { passive: true });
})();

/* ================================================================
   1) Product Viewer (صور/فيديو) + زووم/سحب
================================================================ */
(function () {
  const thumbsEl = document.getElementById("hero-thumbs");
  const mainImg = document.getElementById("hero-media-main");
  const mainVid = document.getElementById("hero-media-video");
  const frame = document.querySelector(".hero-media-frame");
  if (!thumbsEl || !mainImg || !mainVid || !frame) return;

  mainImg.setAttribute("draggable", "false");
  mainImg.addEventListener("dragstart", (e) => e.preventDefault());
  frame.addEventListener("contextmenu", (e) => e.preventDefault());
  frame.addEventListener("auxclick", (e) => e.preventDefault());

  let scale = 1;
  const HOVER_SCALE = 1.4;
  const TOUCH_SCALE = 1.4;
  let offsetX = 0, offsetY = 0;
  let isPointerDown = false;
  let startX = 0, startY = 0;
  let downTime = 0, downX = 0, downY = 0, moved = false;

  const isDesktopFine = () =>
    window.matchMedia("(min-width: 992px) and (pointer: fine)").matches;

  function applyTransform() {
    mainImg.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  }
  function clampOffsets() {
    const rect = frame.getBoundingClientRect();
    const baseW = rect.width * 0.8;
    const baseH = rect.height * 0.8;
    const scaledW = baseW * scale;
    const scaledH = baseH * scale;
    const maxX = Math.max(0, (scaledW - baseW) / 2);
    const maxY = Math.max(0, (scaledH - baseH) / 2);
    offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
    offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
  }
  function resetZoom(videoOnly = false) {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    if (!videoOnly) applyTransform();
    mainImg.classList.remove("dragging");
  }
  function clearActive() {
    [...thumbsEl.children].forEach((el) => {
      el.classList?.remove("active");
      el.setAttribute?.("aria-selected", "false");
    });
  }
  function markActive(thumbEl) {
    if (!thumbEl) return;
    clearActive();
    thumbEl.classList.add("active");
    thumbEl.setAttribute("aria-selected", "true");
  }
  function showImage(src, thumbEl) {
    try { mainVid.pause(); } catch {}
    mainVid.currentTime = 0;
    mainVid.style.display = "none";
    mainImg.src = src;
    mainImg.style.display = "block";
    markActive(thumbEl);
    resetZoom();
  }
  function showVideo(src, thumbEl) {
    mainImg.style.display = "none";
    mainVid.src = src;
    mainVid.style.display = "block";
    mainVid.play().catch(() => {});
    markActive(thumbEl);
    resetZoom(true);
  }

  thumbsEl.addEventListener("click", (e) => {
    const t = e.target;
    if (!t) return;
    if (t.tagName === "IMG") {
      showImage(t.getAttribute("src"), t);
    } else if (t.tagName === "VIDEO") {
      try { t.pause(); } catch {}
      showVideo(t.getAttribute("src"), t);
    }
  }, { passive: true });

  const firstThumb = thumbsEl.querySelector("img,video");
  if (firstThumb) {
    if (firstThumb.tagName === "IMG")
      showImage(firstThumb.getAttribute("src"), firstThumb);
    else
      showVideo(firstThumb.getAttribute("src"), firstThumb);
  }

  frame.addEventListener("mouseenter", () => {
    if (!isDesktopFine()) return;
    if (mainImg.style.display === "none") return;
    scale = HOVER_SCALE; offsetX = 0; offsetY = 0; applyTransform();
  }, { passive: true });
  frame.addEventListener("mouseleave", () => {
    if (!isDesktopFine()) return;
    if (isPointerDown) return;
    if (mainImg.style.display === "none") return;
    resetZoom();
  }, { passive: true });

  frame.addEventListener("pointerdown", (e) => {
    if (mainImg.style.display === "none") return;
    if (scale <= 1) { scale = TOUCH_SCALE; offsetX = 0; offsetY = 0; applyTransform(); }
    isPointerDown = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    downTime = Date.now();
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    mainImg.classList.add("dragging");
    frame.setPointerCapture?.(e.pointerId);
  });
  frame.addEventListener("pointermove", (e) => {
    if (!isPointerDown) return;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    clampOffsets();
    applyTransform();
    if (e.pointerType !== "mouse" && Math.hypot(e.clientX - downX, e.clientY - downY) > 8) moved = true;
  });
  function endPointer(e) {
    if (!isPointerDown) return;
    isPointerDown = false;
    mainImg.classList.remove("dragging");
    frame.releasePointerCapture?.(e.pointerId);
    if (e.pointerType !== "mouse") {
      const isTap = Date.now() - downTime < 250 && !moved;
      if (isTap) { scale = scale > 1 ? 1 : TOUCH_SCALE; applyTransform(); }
    }
  }
  frame.addEventListener("pointerup", endPointer);
  frame.addEventListener("pointercancel", endPointer);
  frame.addEventListener("pointerleave", endPointer);

  window.addEventListener("resize", () => {
    resetZoom(mainImg.style.display === "none");
  }, { passive: true });

  mainVid.addEventListener("play", () => { mainVid.muted = false; }, { once: true });
})();

/* ================================================================
   2) Accordion (hero-accordion)
================================================================ */
(function () {
  function setupHeroAccordion() {
    const acc = document.querySelector(".hero-accordion");
    if (!acc) return;

    const items = acc.querySelectorAll(".hero-accordion-item");
    const heads = acc.querySelectorAll(".hero-accordion-item .hero-accordion-header");

    items.forEach((it) => it.classList.remove("is-active"));

    function syncAria() {
      items.forEach((item) => {
        const head = item.querySelector(".hero-accordion-header");
        const content = item.querySelector(".hero-accordion-content");
        const isActive = item.classList.contains("is-active");
        head?.setAttribute("aria-expanded", isActive ? "true" : "false");
        content?.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
    }
    syncAria();

    function openOnly(targetItem) {
      items.forEach((i) => { if (i !== targetItem) i.classList.remove("is-active"); });
      targetItem.classList.add("is-active");
      syncAria();
    }

    heads.forEach((head) => {
      head.setAttribute("tabindex", "0");
      head.addEventListener("click", () => {
        const item = head.closest(".hero-accordion-item");
        if (!item) return;
        if (item.classList.contains("is-active")) {
          item.classList.remove("is-active");
          syncAria();
        } else {
          openOnly(item);
        }
      });
      head.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); head.click(); }
      });
    });
  }
  document.addEventListener("DOMContentLoaded", setupHeroAccordion);
})();

/* ================================================================
   3) Summary (التصميمات المختارة)
================================================================ */
(function () {
  const sumList = document.getElementById("hero-summary-designs-list");
  const sumQty = document.getElementById("hero-summary-qty");
  const sumTotal = document.getElementById("hero-summary-total");
  if (!sumList || !sumQty || !sumTotal) return;

  function getUnitPrice(q) {
    if (q >= 100) return 220;
    if (q >= 50) return 230;
    if (q >= 25) return 240;
    if (q >= 13) return 250;
    if (q >= 5) return 260;
    if (q >= 3) return 270;
    return 280;
  }
  function getDesignThumb(it) {
    if (!it || !it.designCode) return "";
    const BOY_DIR = window.BOY_DIR || "H";
    const GIRL_DIR = window.GIRL_DIR || "S";
    const folder = String(it.gender).toLowerCase() === "boy" ? BOY_DIR : GIRL_DIR;
    const file = it.designCode.endsWith(".png") ? it.designCode : `${it.designCode}.png`;
    const base = window.BASE_IMAGES || "images";
    return `${base}/${folder}/${file}`;
  }

  function handleDelete(index) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem("designList") || "[]"); } catch {}
    if (!list[index]) return;
    if (!confirm("مسح التصميم ده؟")) return;

    list.splice(index, 1);
    try { localStorage.setItem("designList", JSON.stringify(list)); } catch {}

    renderSummary();
    try { window.renderSummaryPostHook && window.renderSummaryPostHook(); } catch {}
    try { window.heroSyncSummary && window.heroSyncSummary(); } catch {}
    try { window.postMessage({ type: 'refreshList' }, '*'); } catch {}
    try { window.parent && window.parent.postMessage({ type: 'refreshList' }, '*'); } catch {}
  }

  function handleEdit(index) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem("designList") || "[]"); } catch {}
    const item = list[index];
    if (!item) return;

    try {
      localStorage.setItem("D4P_editId", String(item.id ?? ""));
      localStorage.setItem("D4P_editItem", JSON.stringify(item));
    } catch {}

    if (window.HeroDesign?.loadForEdit) {
      window.HeroDesign.loadForEdit(item);
    } else if (typeof window.loadForEdit === "function") {
      window.loadForEdit(item);
    }

    document.getElementById("hero-design-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function createItemRow(it, unitPrice, idx) {
    const li = document.createElement("li");
    li.className = "item";

    const designImg = document.createElement("img");
    designImg.className = "summary-thumb";
    designImg.src = getDesignThumb(it);
    designImg.alt = "تصميم";
    li.appendChild(designImg);

    const name1 = document.createElement("div");
    name1.className = "name-chip";
    name1.textContent = it.childName?.trim() || "—";
    li.appendChild(name1);

    const name2 = document.createElement("div");
    name2.className = "name-chip";
    name2.textContent = it.childName2?.trim() || "—";
    li.appendChild(name2);

    const u1 = document.createElement("img");
    u1.className = "uimg";
    if (it.images?.[0]) u1.src = it.images[0]; else u1.classList.add("is-empty");
    li.appendChild(u1);

    const u2 = document.createElement("img");
    u2.className = "uimg";
    if (it.images?.[1]) u2.src = it.images[1]; else u2.classList.add("is-empty");
    li.appendChild(u2);

    const actions = document.createElement("div");
    actions.className = "action-btns";
    const editBtn = document.createElement("button");
    editBtn.className = "action-btn";
    editBtn.title = "تعديل"; editBtn.type = "button"; editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => handleEdit(idx));
    const delBtn = document.createElement("button");
    delBtn.className = "action-btn danger";
    delBtn.title = "مسح"; delBtn.type = "button"; delBtn.textContent = "🗑️";
    delBtn.addEventListener("click", () => handleDelete(idx));
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(actions);

    return li;
  }

  function renderSummary() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem("designList") || "[]"); } catch {}
    sumList.innerHTML = "";
    if (!list.length) {
      sumList.innerHTML = '<li class="hero-summary-muted">لم يتم اختيار أي تصميم حتى الآن</li>';
      sumQty.textContent = "0";
      sumTotal.textContent = "0 ج.م";
      const oldNote = document.getElementById("hero-summary-unit-note");
      if (oldNote) oldNote.remove();
      return;
    }

    const qty = list.length;
    const unit = getUnitPrice(qty);

    list.forEach((it, idx) => {
      const row = createItemRow(it, unit, idx);
      if (row && row.nodeType === 1) sumList.appendChild(row);
    });

    sumQty.textContent = String(qty);
    sumTotal.textContent = qty * unit + " ج.م";

    let note = document.getElementById("hero-summary-unit-note");
    if (!note) {
      note = document.createElement("div");
      note.id = "hero-summary-unit-note";
      note.className = "hero-summary-note";
      sumList.parentElement.appendChild(note);
    }
    note.textContent = `سعر القطعة حسب الكمية: ${unit} ج.م`;
  }

  document.addEventListener("DOMContentLoaded", renderSummary);
  window.addEventListener("message", (e) => { if (e?.data?.type === "refreshList") renderSummary(); });
  window.addEventListener("storage", (e) => { if (e.key === "designList") renderSummary(); });
})();

/* ================================================================
   4) FORM — إنشاء/تعديل تصميم (hero-design-form)
================================================================ */
(function () {
  const $ = (id) => document.getElementById(id);

  const designWrap = $("hero-designs");
  const genderInputs = document.querySelectorAll('input[name="hero-design-gender"]');

  const childName = $("hero-design-name-front");
  const childName2 = $("hero-design-name-back");
  const extraNotes = $("hero-design-notes");

  const photoUpload = $("hero-design-photos");
  const uploadBtn = document.querySelector(".hero-upload-btn");
  function setUploadEnabled(on) {
    if (uploadBtn) { uploadBtn.disabled = !on; uploadBtn.classList.toggle("is-disabled", !on); }
    if (photoUpload) { photoUpload.disabled = !on; }
  }

  const photoPreview = $("hero-design-photos-preview");
  const saveBtn = $("hero-design-save-btn");

  const genderError = $("hero-design-gender-error");
  const designError = $("hero-design-selection-error");
  const nameError = $("hero-design-name-error");
  const photoError = $("hero-design-photos-error");
  const uploadStatus = $("hero-design-upload-status");
  const saveStatus = $("hero-design-save-status");

  if (!designWrap || !genderInputs.length || !saveBtn) return;

  const BASE = window.BASE_IMAGES || "images";
  const BOY_DIR = window.BOY_DIR || "H";
  const GIRL_DIR = window.GIRL_DIR || "S";
  const COUNT_H = window.DESIGN_COUNT_H || 24;
  const COUNT_S = window.DESIGN_COUNT_S || 24;

  let selectedGender = null;
  let selectedDesign = null;
  let uploadedFiles = [];

  function updateUploadStatus() {
    if (!uploadStatus) return;
    uploadStatus.textContent =
      uploadedFiles.length === 0 ? "لم يتم رفع أي صورة"
      : uploadedFiles.length === 1 ? "تم رفع صورة واحدة (1 من 2)"
      : "تم رفع صورتين (2 من 2)";
  }

  function ensurePreviewBelowUpload() {
    const upBtn = document.querySelector(".hero-upload-btn");
    if (!photoPreview || !upBtn) return;
    const p = upBtn.parentElement || document.querySelector(".hero-design-card");
    if (p && upBtn.nextSibling !== photoPreview) {
      try { p.insertBefore(photoPreview, upBtn.nextSibling); }
      catch { document.querySelector(".hero-design-card")?.appendChild(photoPreview); }
    }
    Object.assign(photoPreview.style, {
      display: "block", width: "100%", marginTop: "10px",
      flexBasis: "100%", order: "999", alignSelf: "stretch", clear: "both",
    });
  }
  document.addEventListener("DOMContentLoaded", ensurePreviewBelowUpload);

  function loadDesigns(gender) {
    designWrap.innerHTML = "";
    const isBoy = String(gender).toLowerCase() === "boy";
    const folder = isBoy ? BOY_DIR : GIRL_DIR;
    const count = isBoy ? COUNT_H : COUNT_S;

    for (let i = 1; i <= count; i++) {
      const code = `${folder}-${i.toString().padStart(2, "0")}`;
      const img = document.createElement("img");
      img.src = `${BASE}/${folder}/${code}.png`;
      img.alt = code;
      img.className = "hero-design-option";
      img.dataset.code = code;
      img.addEventListener("click", () => {
        designWrap.querySelectorAll(".hero-design-option").forEach((el) => el.classList.remove("is-selected"));
        img.classList.add("is-selected");
        selectedDesign = code;
        if (designError) { designError.textContent = ""; designError.style.display = "none"; }
      });
      designWrap.appendChild(img);
    }
  }

  genderInputs.forEach((input) => {
    input.addEventListener("change", () => {
      selectedGender = input.value;
      selectedDesign = null;
      loadDesigns(selectedGender);
      if (genderError) { genderError.textContent = ""; genderError.style.display = "none"; }
      if (designError) { designError.textContent = "اختر التصميم"; designError.style.display = "block"; }
    });
  });

  if (photoUpload) {
    photoUpload.addEventListener("change", () => {
      const files = Array.from(photoUpload.files || []);
      if (uploadedFiles.length >= 2) {
        if (photoError) { photoError.textContent = "لا يمكنك رفع أكثر من صورتين فقط"; photoError.style.display = "block"; }
        photoUpload.value = "";
        return;
      }
      const allowed = 2 - uploadedFiles.length;

      files.slice(0, allowed).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target.result;
          const wrap = document.createElement("div");
          wrap.className = "hero-photo-wrap";
          Object.assign(wrap.style, { position: "relative", display: "inline-block", overflow: "visible", margin: "4px" });
          const img = document.createElement("img"); img.src = src;
          const del = document.createElement("button");
          del.type = "button"; del.textContent = "❌"; del.className = "hero-photo-del";
          Object.assign(del.style, { position: "absolute", top: "-8px", right: "-8px", insetInlineEnd: "-8px", zIndex: "5" });
          del.onclick = () => {
            try { photoPreview.removeChild(wrap); } catch {}
            uploadedFiles = uploadedFiles.filter((u) => u !== src);
            updateUploadStatus();
            if (uploadedFiles.length === 0 && photoError) {
              photoError.textContent = "يرجى رفع صورة واحدة على الأقل"; photoError.style.display = "block";
            }
          };
          wrap.appendChild(img); wrap.appendChild(del); photoPreview.appendChild(wrap);
          uploadedFiles.push(src);
          updateUploadStatus();
          if (photoError) { photoError.textContent = ""; photoError.style.display = "none"; }
        };
        reader.readAsDataURL(file);
      });

      if (files.length > allowed && photoError) {
        photoError.textContent = "لا يمكنك رفع أكثر من صورتين فقط"; photoError.style.display = "block";
      }
      photoUpload.value = "";
    });
  }

  function validateBeforeSave() {
    let hasError = false;

    if (!selectedGender) { if (genderError) genderError.textContent = "يجب اختيار النوع"; hasError = true; }
    else if (genderError) genderError.textContent = "";

    if (!selectedDesign) { if (designError) { designError.textContent = "يجب اختيار التصميم"; designError.style.display = "block"; } hasError = true; }
    else if (designError) { designError.textContent = ""; designError.style.display = "none"; }

    if (!childName || !childName.value.trim()) { if (nameError) nameError.textContent = "يرجى إدخال اسم الطفل"; hasError = true; }
    else if (nameError) nameError.textContent = "";

    if (uploadedFiles.length === 0) { if (photoError) { photoError.textContent = "يرجى رفع صورة واحدة على الأقل"; photoError.style.display = "block"; } hasError = true; }
    else if (photoError) { photoError.textContent = ""; photoError.style.display = "none"; }

    return !hasError;
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!validateBeforeSave()) return;

      const editId = saveBtn.dataset.editId || null;

      let list = [];
      try { list = JSON.parse(localStorage.getItem("designList") || "[]"); } catch {}

      if (editId) {
        list = list.map((x) => {
          if (String(x.id) === String(editId)) {
            return {
              ...x,
              gender: selectedGender,
              designCode: selectedDesign,
              childName: childName?.value.trim() || "",
              childName2: childName2?.value.trim() || "",
              notes: extraNotes?.value.trim() || "",
              images: uploadedFiles,
            };
          }
          return x;
        });
        saveBtn.dataset.editId = "";
      } else {
        const designObj = {
          id: Date.now(),
          gender: selectedGender,
          designCode: selectedDesign,
          childName: childName?.value.trim() || "",
          childName2: childName2?.value.trim() || "",
          notes: extraNotes?.value.trim() || "",
          images: uploadedFiles,
        };
        list.push(designObj);
      }

      try { localStorage.setItem("designList", JSON.stringify(list)); } catch {}

      if (saveStatus) {
        saveStatus.innerText = "✅ تم حفظ التصميم بنجاح! أضف تصميم آخر أو عدّل تصميم سابق.";
        setTimeout(() => (saveStatus.innerText = ""), 2000);
      }

      try { window.parent.postMessage({ type: "refreshList" }, "*"); } catch {}
      try { window.postMessage({ type: "refreshList" }, "*"); } catch {}

      genderInputs.forEach((input) => { input.checked = false; });
      designWrap.innerHTML = "";
      selectedGender = null;
      selectedDesign = null;
      if (childName) childName.value = "";
      if (childName2) childName2.value = "";
      if (extraNotes) extraNotes.value = "";
      if (photoPreview) photoPreview.innerHTML = "";
      uploadedFiles = [];
      updateUploadStatus();
      ensurePreviewBelowUpload();
      try { window.updateLeftConfirm && window.updateLeftConfirm(); } catch {}
    });
  }

  function loadForEdit(design) {
    if (!design) return;
    if (design.gender) {
      const g = document.querySelector(`input[name="hero-design-gender"][value="${design.gender}"]`);
      if (g) g.checked = true;
      selectedGender = design.gender;
      loadDesigns(selectedGender);
    }
    selectedDesign = design.designCode || null;
    setTimeout(() => {
      designWrap.querySelectorAll(".hero-design-option").forEach((img) => {
        img.classList.toggle("is-selected", img.dataset.code === selectedDesign);
      });
    }, 50);

    if (childName) childName.value = design.childName || "";
    if (childName2) childName2.value = design.childName2 || "";
    if (extraNotes) extraNotes.value = design.notes || "";

    if (photoPreview) photoPreview.innerHTML = "";
    uploadedFiles = [];
    (design.images || []).slice(0, 2).forEach((imgData) => {
      const wrap = document.createElement("div");
      wrap.className = "hero-photo-wrap";
      Object.assign(wrap.style, { position: "relative", display: "inline-block", overflow: "visible", margin: "4px" });
      const img = document.createElement("img"); img.src = imgData;
      const del = document.createElement("button");
      del.type = "button"; del.textContent = "❌"; del.className = "hero-photo-del";
      Object.assign(del.style, { position: "absolute", top: "-8px", right: "-8px", insetInlineEnd: "-8px", zIndex: "5" });
      del.onclick = () => {
        try { photoPreview.removeChild(wrap); } catch {}
        uploadedFiles = uploadedFiles.filter((f) => f !== imgData);
        updateUploadStatus();
      };
      wrap.appendChild(img); wrap.appendChild(del); photoPreview.appendChild(wrap);
      uploadedFiles.push(imgData);
    });
    updateUploadStatus();
    ensurePreviewBelowUpload();

    saveBtn.dataset.editId = String(design.id);
  }

  window.HeroDesign = Object.assign(window.HeroDesign || {}, { loadForEdit, updateUploadStatus });
  window.loadForEdit = loadForEdit;

  window.addEventListener("message", (e) => {
    if (e?.data?.type === 'resetAll') {
      genderInputs.forEach((input) => { input.checked = false; });
      designWrap.innerHTML = "";
      selectedGender = null;
      selectedDesign = null;
      if (childName) childName.value = "";
      if (childName2) childName2.value = "";
      if (extraNotes) extraNotes.value = "";
      if (photoPreview) photoPreview.innerHTML = "";
      uploadedFiles = [];
      updateUploadStatus();
      ensurePreviewBelowUpload();
      return;
    }

    if (e?.data?.type !== "edit") return;
    const id = e.data.id != null ? String(e.data.id) : null;

    let list = [];
    try { list = JSON.parse(localStorage.getItem("designList") || "[]"); } catch {}
    let design = id ? list.find((x) => String(x.id) === id) : null;

    if (!design) {
      try { design = JSON.parse(localStorage.getItem("D4P_editItem") || "null"); } catch {}
    }
    if (design) loadForEdit(design);
  });

  function getHashEditId() {
    const m = location.hash.match(/edit=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  document.addEventListener("DOMContentLoaded", () => {
    const id = getHashEditId() || localStorage.getItem("D4P_editId");
    if (!id) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem("designList") || "[]"); } catch {}
    let design = list.find((x) => String(x.id) === String(id));
    if (!design) {
      try { design = JSON.parse(localStorage.getItem("D4P_editItem") || "null"); } catch {}
    }
    if (design) loadForEdit(design);
  });
})();

/* ================================================================
   SHIPPING (hero-shipping-form)
================================================================ */
(function () {
  const $ = (id) => document.getElementById(id);

  function initShipping() {
    const form        = $('hero-shipping-form');
    if (!form) return;

    const recipient   = $('hero-ship-recipient');
    const mobile1     = $('hero-ship-mobile1');
    const mobile2     = $('hero-ship-mobile2');
    const landline    = $('hero-ship-landline');
    const area        = $('hero-ship-area');
    const address     = $('hero-ship-address');
    const notes       = $('hero-ship-notes');

    const errRecipient = $('hero-ship-recipient-error');
    const errMobile1   = $('hero-ship-mobile1-error');
    const errArea      = $('hero-ship-area-error');
    const errAddress   = $('hero-ship-address-error');

    const details     = $('hero-ship-details');
    const statusEl    = $('hero-ship-status');
    const saveBtn     = $('hero-ship-save-btn');

    let editBtn = null;

    const shippingData = {
      "cairo-giza":   { name: "القاهرة والجيزة", price: 60,  duration: "48 ساعة" },
      "alex":         { name: "الإسكندرية",       price: 75,  duration: "من 5 إلى 7 أيام" },
      "ismailia":     { name: "الإسماعيلية",      price: 75,  duration: "من 5 إلى 7 أيام" },
      "sharqia":      { name: "الشرقية",          price: 75,  duration: "من 5 إلى 7 أيام" },
      "dakahlia":     { name: "الدقهلية",         price: 75,  duration: "من 5 إلى 7 أيام" },
      "beheira":      { name: "البحيرة",          price: 75,  duration: "من 5 إلى 7 أيام" },
      "gharbia":      { name: "الغربية",          price: 75,  duration: "من 5 إلى 7 أيام" },
      "qaliubia":     { name: "القليوبية",        price: 75,  duration: "من 5 إلى 7 أيام" },
      "menoufia":     { name: "المنوفية",         price: 75,  duration: "من 5 إلى 7 أيام" },
      "portsaid":     { name: "بورسعيد",          price: 75,  duration: "من 5 إلى 7 أيام" },
      "damietta":     { name: "دمياط",            price: 75,  duration: "من 5 إلى 7 أيام" },
      "kafrelsheikh": { name: "كفر الشيخ",        price: 75,  duration: "من 5 إلى 7 أيام" },
      "mansoura":     { name: "المنصورة",         price: 75,  duration: "من 5 إلى 7 أيام" },
      "bani-suef":    { name: "بني سويف",         price: 85,  duration: "من 7 إلى 10 أيام" },
      "minya":        { name: "المنيا",           price: 85,  duration: "من 7 إلى 10 أيام" },
      "assiut":       { name: "أسيوط",            price: 85,  duration: "من 7 إلى 10 أيام" },
      "qena":         { name: "قنا",              price: 85,  duration: "من 7 إلى 10 أيام" },
      "sohag":        { name: "سوهاج",            price: 85,  duration: "من 7 إلى 10 أيام" },
      "fayoum":       { name: "الفيوم",           price: 85,  duration: "من 7 إلى 10 أيام" },
      "luxor":        { name: "الأقصر",           price: 120, duration: "من 7 إلى 12 يوم" },
      "aswan":        { name: "أسوان",            price: 120, duration: "من 7 إلى 12 يوم" },
      "redsea":       { name: "البحر الأحمر",     price: 120, duration: "من 7 إلى 12 يوم" },
      "matrouh":      { name: "مطروح",            price: 120, duration: "من 7 إلى 12 يوم" },
      "newvalley":    { name: "الوادي الجديد",   price: 120, duration: "من 7 إلى 12 يوم" },
      "sharm":        { name: "شرم الشيخ",        price: 120, duration: "من 7 إلى 12 يوم" },
      "ghardaqa":     { name: "الغردقة",          price: 120, duration: "من 7 إلى 12 يوم" }
    };

    area.addEventListener('change', () => {
      const v = area.value;
      if (shippingData[v]) {
        const d = shippingData[v];
        details.textContent = `السعر: ${d.price}ج | المدة: ${d.duration}`;
        details.style.color = '#216a4b';
        errArea.textContent = '';
      } else {
        details.textContent = '';
      }
    });

    const isValidEGMobile = (s) => /^01[0-9]{9}$/.test(String(s).trim());

    function setReadOnly(on) {
      recipient.readOnly = on;
      mobile1.readOnly   = on;
      mobile2.readOnly   = on;
      landline.readOnly  = on;
      area.disabled      = on;
      address.readOnly   = on;
      notes.readOnly     = on;
    }

    function showEditBtn() {
      if (!editBtn) {
        editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.id   = 'editShippingBtn';
        editBtn.textContent = '✏️ اضغط هنا لتعديل البيانات';
        editBtn.style.cssText = `
          display:block; margin:15px auto 0; background:#ffb900; color:#222;
          font-weight:bold; border:none; border-radius:7px; padding:8px 18px; cursor:pointer; text-align:center;
        `;
        editBtn.addEventListener('click', () => {
          setReadOnly(false);
          saveBtn.style.display = 'inline-block';
          editBtn.style.display = 'none';
        });
        saveBtn.parentNode.appendChild(editBtn);
      }
      editBtn.style.display = 'inline-block';
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      errRecipient.textContent = '';
      errMobile1.textContent   = '';
      errArea.textContent      = '';
      errAddress.textContent   = '';
      details.style.color      = '#216a4b';

      let bad = false;

      if (!recipient.value.trim()) { errRecipient.textContent = 'يرجى إدخال اسم صحيح'; bad = true; }
      if (!isValidEGMobile(mobile1.value)) { errMobile1.textContent = 'يرجى إدخال رقم صحيح'; bad = true; }
      if (!area.value || !shippingData[area.value]) { errArea.textContent = 'يرجى اختيار المحافظة'; details.style.color = '#e91e63'; bad = true; }
      if (!address.value.trim()) { errAddress.textContent = 'يرجى إدخال العنوان بالكامل'; bad = true; }
      if (bad) return;

      const chosen = shippingData[area.value];
      const obj = {
        recipientName: recipient.value.trim(),
        mobile1: mobile1.value.trim(),
        mobile2: mobile2.value.trim(),
        landline: landline.value.trim(),
        areaCode: area.value,
        areaName: chosen.name,
        shippingPrice: chosen.price,
        shippingDuration: chosen.duration,
        address: address.value.trim(),
        notes: notes.value.trim()
      };

      try { localStorage.setItem('shippingInfo', JSON.stringify(obj)); } catch {}

      statusEl.innerText = '✅ تم حفظ بيانات الشحن بنجاح!';
      setReadOnly(true);
      saveBtn.style.display = 'none';
      showEditBtn();
      setTimeout(() => statusEl.innerText = '', 4000);

      try { window.parent.postMessage({ type: 'refreshShipping' }, '*'); } catch {}
      try { window.updateLeftConfirm && window.updateLeftConfirm(); } catch {}
    });

    // resetAll
    window.addEventListener('message', (e) => {
      if (e?.data?.type !== 'resetAll') return;
      localStorage.removeItem('shippingInfo');
      setReadOnly(false);
      saveBtn.style.display = 'inline-block';
      if (editBtn) editBtn.style.display = 'none';

      recipient.value = '';
      mobile1.value   = '';
      mobile2.value   = '';
      landline.value  = '';
      area.value      = '';
      address.value   = '';
      notes.value     = '';
      errRecipient.textContent = '';
      errMobile1.textContent   = '';
      errArea.textContent      = '';
      errAddress.textContent   = '';
      statusEl.innerText       = '';
      details.textContent      = '';
    });

    // تحميل بيانات قديمة إن وجدت
    let data = null;
    try { data = JSON.parse(localStorage.getItem('shippingInfo') || 'null'); } catch {}
    if (data) {
      recipient.value = data.recipientName || '';
      mobile1.value   = data.mobile1 || '';
      mobile2.value   = data.mobile2 || '';
      landline.value  = data.landline || '';
      area.value      = data.areaCode || '';
      address.value   = data.address || '';
      notes.value     = data.notes || '';

      if (data.areaCode && shippingData[data.areaCode]) {
        const d = shippingData[data.areaCode];
        details.textContent = `السعر: ${d.price}ج | المدة: ${d.duration}`;
        details.style.color = '#216a4b';
      }
      setReadOnly(true);
      saveBtn.style.display = 'none';
      showEditBtn();
    } else {
      setReadOnly(false);
      saveBtn.style.display = 'inline-block';
      if (editBtn) editBtn.style.display = 'none';
    }
  } // <-- نهاية initShipping()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShipping);
  } else {
    initShipping();
  }
})();

/* ================================================================
   5) فوتر العمود الشمال + زر “زرارين في زر واحد”
================================================================ */
(function(){
  function getDesigns(){
    try{ return JSON.parse(localStorage.getItem('designList')||'[]'); }catch{return [];}
  }
  function hasShipping(){
    try{
      const s = JSON.parse(localStorage.getItem('shippingInfo')||'null');
      return !!(s && (s.recipientName || s.mobile1 || s.address || s.areaCode));
    }catch{return false;}
  }
  function getShippingPrice(){
    try{
      const s = JSON.parse(localStorage.getItem('shippingInfo')||'null');
      const p = Number(s?.shippingPrice || 0);
      return isNaN(p) ? 0 : p;
    }catch{return 0;}
  }

  function unitPrice(q){
    if (q >= 100) return 220;
    if (q >= 50)  return 230;
    if (q >= 25)  return 240;
    if (q >= 13)  return 250;
    if (q >= 5)   return 260;
    if (q >= 3)   return 270;
    return 280;
  }
  function syncLeftFooter(){
    const list = getDesigns();
    const qty = list.length;
    const total = qty * unitPrice(qty);
    const lq = document.getElementById('left-footer-qty');
    const lt = document.getElementById('left-footer-total');
    if (lq) lq.textContent = qty + ' قطعة';
    if (lt) lt.textContent = total + ' ج.م';
  }
  function scrollToSel(sel){
    const el = document.querySelector(sel);
    if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function resetOrder(){
    try {
      localStorage.removeItem('designList');
      localStorage.removeItem('shippingInfo');
      localStorage.removeItem('D4P_editId');
      localStorage.removeItem('D4P_editItem');
    } catch {}
    try { window.postMessage({ type: 'resetAll' }, '*'); } catch {}
    try { window.postMessage({ type: 'refreshList' }, '*'); } catch {}
    syncLeftFooter();
    updateLeftConfirm();
  }

  function styleDisabled(btn, on){
    if (!btn) return;
    btn.disabled = !!on;
    if (on){
      btn.classList.add('is-disabled');
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
      btn.style.background = '#9e9e9e';
      btn.style.color = '#fff';
    } else {
      btn.classList.remove('is-disabled');
      btn.style.opacity = '';
      btn.style.cursor = '';
      btn.style.background = '';
      btn.style.color = '';
    }
  }
  function styleAddButton(emphasize){
    const addBtn = document.getElementById('left-add');
    if (!addBtn) return;
    if (emphasize){
      addBtn.style.background = '#e53935';
      addBtn.style.color = '#fff';
    } else {
      addBtn.style.background = '';
      addBtn.style.color = '';
    }
  }

  function updateLeftConfirm(){
    const confirmBtn = document.getElementById('left-confirm');
    if (!confirmBtn) return;

    const designsCount = getDesigns().length;
    const shipOk = hasShipping();

    if (!shipOk) {
      styleDisabled(confirmBtn, false);
      confirmBtn.textContent = '📦 املا بيانات الشحن';
      confirmBtn.onclick = () => scrollToSel('#hero-shipping-form');
      styleAddButton(false);
      return;
    }

    confirmBtn.textContent = '✅ أكد الطلب';
    if (designsCount < 1) {
      styleDisabled(confirmBtn, true);
      confirmBtn.onclick = null;
      styleAddButton(true);
    } else {
      styleDisabled(confirmBtn, false);
      styleAddButton(false);
      confirmBtn.onclick = () => {
        if (window.openConfirmModal) { window.openConfirmModal(); }
        else { console.warn('openConfirmModal not ready yet'); }
      };
    }
  }
  window.updateLeftConfirm = updateLeftConfirm;

  function wireLeftFooter(){
    const addBtn = document.getElementById('left-add');
    const confirmBtn  = document.getElementById('left-confirm');

    if(addBtn){
      addBtn.addEventListener('click', () => {
        const target = document.querySelector('#hero-design-form .hero-form-gender-row') || document.querySelector('#hero-design-form');
        if (target) {
          const topPos = target.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: topPos - 20, behavior: 'smooth' });
        }
      }, { passive: true });
    }

    if(confirmBtn){
      updateLeftConfirm();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    wireLeftFooter();
    syncLeftFooter();
    updateLeftConfirm();
  }, {once:true, passive:true});

  window.addEventListener('storage', (e) => {
    if (e.key === 'designList') { syncLeftFooter(); updateLeftConfirm(); }
    if (e.key === 'shippingInfo') { updateLeftConfirm(); }
  });
  window.addEventListener('message', (e) => {
    if (e?.data?.type === 'refreshList') { syncLeftFooter(); updateLeftConfirm(); }
    if (e?.data?.type === 'refreshShipping') { updateLeftConfirm(); }
  });

  window.__heroFooterHelpers = { getDesigns, unitPrice, getShippingPrice, resetOrder };
})();

/* ================================================================
   6) نقل الملخص تحت الفورم على الموبايل + أكورديون الأسئلة v2 + سلايدر الريفيو
================================================================ */
(function(){
  const summary = document.getElementById('hero-summary');
  const form    = document.getElementById('hero-design-form');
  if(!summary || !form) return;

  const home = document.createElement('div');
  home.id = 'hero-summary-home';
  summary.parentNode.insertBefore(home, summary);

  function place(){
    const isMobile = window.matchMedia('(max-width:700px)').matches;
    if(isMobile){
      const card = form.closest('.hero-design-card') || form;
      if(card && summary.previousElementSibling !== card){
        card.after(summary);
      }
    }else{
      if(home.parentNode && home.nextSibling !== summary){
        home.parentNode.insertBefore(summary, home.nextSibling);
      }
    }
  }

  window.addEventListener('load', place, {passive:true});
  window.addEventListener('resize', () => requestAnimationFrame(place), {passive:true});
})();

document.addEventListener("DOMContentLoaded", function () {
  const items = document.querySelectorAll(".hero-accordion-item1");
  items.forEach((el) => el.classList.remove("is-active"));
  items.forEach((item) => {
    const header = item.querySelector(".hero-accordion-header1");
    if (!header) return;
    header.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-active");
      items.forEach((el) => el.classList.remove("is-active"));
      if (!isOpen) item.classList.add("is-active");
    });
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const wrap = document.getElementById('heroReviewSlider');
  if (!wrap) return;

  const TOTAL = 30;
  const basePath = 'images/review';
  let currentIndex = 0;

  function renderBatch() {
    wrap.style.opacity = 0;
    setTimeout(() => {
      wrap.innerHTML = '';
      const batchSize = window.innerWidth <= 767 ? 1 : 3;
      for (let i = 0; i < batchSize; i++) {
        const idx = (currentIndex + i) % TOTAL + 1;
        const card = document.createElement('div');
        card.className = 'hero-review-slide';

        const img = document.createElement('img');
        img.src = `${basePath}/r-${idx}.png`;
        img.alt = `مراجعة ${idx}`;
        img.loading = 'lazy';

        card.appendChild(img);
        wrap.appendChild(card);
      }
      wrap.style.opacity = 1;
    }, 400);
  }

  renderBatch();
  setInterval(() => {
    currentIndex = (currentIndex + 3) % TOTAL;
    renderBatch();
  }, 5000);
});

/* ===== Confirm Modal (build via JS only) — stage1 + stage2 ===== */
(function(){
  const byId = (id) => document.getElementById(id);

  function unitPrice(q){
    if (q >= 100) return 220;
    if (q >= 50)  return 230;
    if (q >= 25)  return 240;
    if (q >= 13)  return 250;
    if (q >= 5)   return 260;
    if (q >= 3)   return 270;
    return 280;
  }
  function designThumb(it){
    const BOY_DIR = window.BOY_DIR || "H";
    const GIRL_DIR = window.GIRL_DIR || "S";
    const folder = String(it.gender).toLowerCase()==="boy" ? BOY_DIR : GIRL_DIR;
    const file = it.designCode?.endsWith(".png") ? it.designCode : `${it.designCode}.png`;
    const base = window.BASE_IMAGES || "images";
    return `${base}/${folder}/${file}`;
  }
  function getShippingInfo(){
    try{ return JSON.parse(localStorage.getItem('shippingInfo')||'null') || null; }catch{return null;}
  }
  function addKV(container, label, value){
    const val = (value==null ? "" : String(value).trim());
    if(!val) return;
    const k = document.createElement('div'); k.className='k'; k.textContent = label;
    const v = document.createElement('div'); v.className='v'; v.textContent = val;
    container.appendChild(k); container.appendChild(v);
  }
  function buildDesignRowOneLine(it){
    const row = document.createElement('div');
    row.className = 'hero-modal__design hero-modal__design--row';
    const left = document.createElement('div');
    const img = document.createElement('img'); img.className='hero-modal__thumb'; img.src = designThumb(it); img.alt='تصميم';
    left.appendChild(img);
    const mid = document.createElement('div'); mid.className='d-mid';
    if (it.childName?.trim())  { const c=document.createElement('span'); c.className='hero-chip'; c.textContent=it.childName.trim();  mid.appendChild(c); }
    if (it.childName2?.trim()) { const c=document.createElement('span'); c.className='hero-chip'; c.textContent=it.childName2.trim(); mid.appendChild(c); }
    const right = document.createElement('div'); right.className='d-right';
    const u1 = document.createElement('img'); u1.className='hero-uimg';
    const u2 = document.createElement('img'); u2.className='hero-uimg';
    if (it.images?.[0]) u1.src = it.images[0]; else u1.classList.add('is-empty');
    if (it.images?.[1]) u2.src = it.images[1]; else u2.classList.add('is-empty');
    if (!u1.classList.contains('is-empty')) right.appendChild(u1);
    if (!u2.classList.contains('is-empty')) right.appendChild(u2);
    row.appendChild(left); row.appendChild(mid); row.appendChild(right);
    return row;
  }

  /* ========= سيستم التكويد الشهري =========
     مفتاح التخزين: D4P_seq = { y: 25, m: 8, seq: 10 }
     - يتصفر أول كل شهر (عند تغير m).
     - التاريخ في الكود بدون أصفار بادئة (YYM D).
     - السيكونس 3 أرقام padded.
  */
  const SEQ_KEY = 'D4P_seq';
  function readSeq(){
    try{ return JSON.parse(localStorage.getItem(SEQ_KEY)||'null') || null; }catch{return null;}
  }
  function writeSeq(obj){
    try{ localStorage.setItem(SEQ_KEY, JSON.stringify(obj)); }catch{}
  }
  function pad3(n){ return String(n).padStart(3,'0'); }
  function prefixToday(){
    const d = new Date();
    const yy = d.getFullYear() % 100; // 25
    const mm = d.getMonth() + 1;      // 8 .. 12
    const dd = d.getDate();           // 1..31
    return { yy, mm, dd, str: `${yy}${mm}${dd}` }; // مثال: 25817
  }
  // عرض الكود القادم بدون حفظ
  function previewNextInvoiceCode(){
    const {yy, mm, dd, str} = prefixToday();
    const st = readSeq();
    const nextSeq = (!st || st.y!==yy || st.m!==mm) ? 1 : (Number(st.seq)||0)+1;
    return `${str}-${pad3(nextSeq)}`;
  }
  // حجز الكود وزيادة السيكونس (يُستدعى عند التأكيد)
  function claimNextInvoiceCode(){
    const {yy, mm, dd, str} = prefixToday();
    const st = readSeq();
    let nextSeq;
    if (!st || st.y!==yy || st.m!==mm){
      nextSeq = 1; // بداية شهر جديد
    } else {
      nextSeq = (Number(st.seq)||0) + 1;
    }
    writeSeq({ y: yy, m: mm, seq: nextSeq });
    return `${str}-${pad3(nextSeq)}`;
  }

  // ===== بناء لينك صفحة الملخص على اللوكل
  function buildSummaryURL(code){
    if (window.SUMMARY_URL) {
      return window.SUMMARY_URL.replace('{code}', encodeURIComponent(code));
    }
    const base   = window.SUMMARY_PAGE || '/invoice.html';
    const origin = location.origin || (location.protocol + '//' + location.host);
    return origin + base + '?code=' + encodeURIComponent(code);
  }

  const ICON_BASE = window.ICON_BASE || 'images/icon';
  const HERO_LOGO = window.HERO_LOGO || `images/Logo.png`;
  const ICON_INSTAPAY = `${ICON_BASE}/instapay.png`;
  const ICON_VF       = `${ICON_BASE}/vodafone.png`;

  function openConfirmModal(){
    // === cart data
    let designs = [];
    try{ designs = JSON.parse(localStorage.getItem('designList')||'[]'); }catch{}
    const qty = designs.length;
    const u = unitPrice(qty);
    const productsTotal = qty * u;

    const ship = getShippingInfo();
    const shippingPrice = Number(ship?.shippingPrice || 0);
    const grandTotal = productsTotal + (Number.isFinite(shippingPrice) ? shippingPrice : 0);
    const shipPriceTxt = Number.isFinite(shippingPrice)&&shippingPrice>0 ? `${shippingPrice} ج.م` : '';

    const previewCode = previewNextInvoiceCode(); // نعرض المتوقع فقط هنا

    // === modal shell
    const bd = document.createElement('div'); bd.className='hero-modal-backdrop';
    const box = document.createElement('div'); box.className='hero-modal'; bd.appendChild(box);

    // HEAD
    const head = document.createElement('div'); head.className='hero-modal__head';
    head.innerHTML = `
      <img class="hero-modal__logo" src="${HERO_LOGO}" alt="Dokan4Print">
      <h3 class="hero-modal__title">
        مرحلة تأكيد الطلب رقم : <span class="hero-order-code">${previewCode}</span>
      </h3>
    `;
    box.appendChild(head);

    const logoEl = head.querySelector('.hero-modal__logo');
    const headReflow = () => {
      const h = (logoEl?.getBoundingClientRect().height || 44) + 24;
      head.style.setProperty('--hero-logo-space', `${h}px`);
    };
    headReflow();
    window.addEventListener('resize', headReflow, { passive: true });

    // BODY
    const body = document.createElement('div'); body.className='hero-modal__body';

    // designs
    const s1 = document.createElement('div'); s1.className='hero-modal__section';
    s1.innerHTML = `<div class="hero-modal__label">عرض ملخص التصميم (بدون تعديل أو حذف)</div>`;
    const dWrap = document.createElement('div'); dWrap.className='hero-modal__designs hero-modal__designs--rows';
    if (designs.length){ designs.forEach(it => dWrap.appendChild(buildDesignRowOneLine(it))); }
    else{ const empty=document.createElement('div'); empty.className='hero-summary-muted'; empty.textContent='لا توجد تصميمات'; dWrap.appendChild(empty); }
    s1.appendChild(dWrap); body.appendChild(s1);

    // qty & unit
    const s2 = document.createElement('div'); s2.className='hero-modal__section';
    const kv2 = document.createElement('div'); kv2.className = 'hero-modal__kv';
    addKV(kv2, 'عدد', qty); addKV(kv2, 'سعر القطعة', u ? `${u} ج.م` : '');
    s2.innerHTML = `<div class="hero-modal__label">الكمية والتسعير</div>`;
    s2.appendChild(kv2); body.appendChild(s2);

    // shipping
    const s3 = document.createElement('div'); s3.className='hero-modal__section';
    s3.innerHTML = `<div class="hero-modal__label">بيانات الشحن</div>`;
    const kv3 = document.createElement('div'); kv3.className = 'hero-modal__kv';
    if (ship){
      addKV(kv3, 'اسم المستلم', ship.recipientName);
      addKV(kv3, 'رقم التليفون', ship.mobile1);
      addKV(kv3, 'رقم 2',        ship.mobile2);
      addKV(kv3, 'رقم أرضي',     ship.landline);
      addKV(kv3, 'محافظة',       ship.areaName);
      addKV(kv3, 'عنوان',        ship.address);
      addKV(kv3, 'ملاحظات تسليم',ship.notes);
      addKV(kv3, 'سعر الشحن',    shipPriceTxt);
    }
    if (kv3.children.length){ s3.appendChild(kv3); } else { const p=document.createElement('div'); p.className='hero-summary-muted'; p.textContent='لا توجد بيانات شحن'; s3.appendChild(p); }
    body.appendChild(s3);

    // totals
    const s4 = document.createElement('div'); s4.className='hero-modal__section';
    s4.innerHTML = `<div class="hero-modal__label">الإجمالي</div>`;
    const totals = document.createElement('div'); totals.className='hero-modal__totals';
    const r1 = document.createElement('div'); r1.className='hero-kv-inline';
    r1.innerHTML = `<span class="k">إجمالي المنتجات</span><span class="v">${productsTotal} ج.م</span>`;
    totals.appendChild(r1);
    if (shipPriceTxt){
      const r2 = document.createElement('div'); r2.className='hero-kv-inline';
      r2.innerHTML = `<span class="k">سعر الشحن</span><span class="v">${shipPriceTxt}</span>`;
      totals.appendChild(r2);
    }
    const r3 = document.createElement('div'); r3.className='hero-kv-inline';
    r3.innerHTML = `<span class="k">إجمالي السعر</span><span class="v">${grandTotal} ج.م</span>`;
    totals.appendChild(r3);
    s4.appendChild(totals); body.appendChild(s4);

    box.appendChild(body);

    // FOOT
    const foot = document.createElement('div'); foot.className='hero-modal__foot';
    const cancelBtn = document.createElement('button');
    cancelBtn.type='button'; cancelBtn.className='hero-btn hero-btn--danger'; cancelBtn.textContent='إغلاق';
    const confirmBtn = document.createElement('button');
    confirmBtn.type='button'; confirmBtn.className='hero-btn hero-btn--primary'; confirmBtn.textContent='تأكيد';
    foot.appendChild(cancelBtn); foot.appendChild(confirmBtn);
    box.appendChild(foot);

    function close(){ document.body.classList.remove('body--lock'); bd.remove(); }
    bd.addEventListener('click', (e)=>{ if(e.target===bd) close(); });
    cancelBtn.addEventListener('click', close);
    document.addEventListener('keydown', function onEsc(ev){ if(ev.key==='Escape'){ document.removeEventListener('keydown', onEsc); close(); } });

    /* ===== Stage 2 (التأكيد) ===== */
    confirmBtn.addEventListener('click', () => {
      // حجز الكود الفعلي وزيادة السيكونس الشهري
      const orderCode = claimNextInvoiceCode();

      // حفظ الطلب في اللوكل
      try{
        const arr = JSON.parse(localStorage.getItem('D4P_orders') || '[]');
        arr.push({
          code: orderCode, createdAt: Date.now(),
          designs, shipping: ship||null,
          totals:{productsTotal, shippingPrice:Number.isFinite(shippingPrice)?shippingPrice:0, grandTotal},
          status:'pending'
        });
        localStorage.setItem('D4P_orders', JSON.stringify(arr));
      }catch{}

      // تجهيز رسالة الواتساب مع لينك الملخص
      const n = (window.WHATSAPP_NUMBER || '').replace(/[^0-9]/g,'') || '201234567890';
      const summaryURL = buildSummaryURL(orderCode);
      const msg = [
        `يرجى تاكيد طلب الفاتوره كود ${orderCode}`,
        `تفاصيل الطلب لينك الملخص الفاتوره كامله بالتصميمات`,
        summaryURL,
        `سيتم ارسال صوره من التحويل للتاكيد`
      ].join('\n');
      const waURL = `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;

      // UI المرحلة الثانية
      box.innerHTML = `
        <div class="hero-modal__head">
          <img class="hero-modal__logo" src="${HERO_LOGO}" alt="Dokan4Print">
          <h3 class="hero-modal__title">شكراً لتجربة دكان فور برنت</h3>
        </div>
        <div class="hero-modal__body">
          <div class="hero-modal__section" style="text-align:center">
            <div class="hero-kv-inline">
              <span class="k">كود الفاتورة</span>
              <span class="v hero-order-code">${orderCode}</span>
            </div>
            <div class="hero-kv-inline" style="margin-bottom:10px">
              <span class="k">إجمالي السعر</span>
              <span class="v">${grandTotal} ج.م</span>
            </div>

            <div class="hero-pay-box">
              <div class="hero-pay-note">
                يتم الدفع من خلال الوسيلة الأنسب لك على نفس الرقم<br>اضغط على الرقم للنسخ
              </div>
              <div class="hero-pay-icons">
                <img src="${ICON_INSTAPAY}" alt="Instapay">
                <img src="${ICON_VF}" alt="Vodafone Cash">
              </div>
              <div id="payNumber" class="hero-pay-number">01022100662</div>
              <div class="hero-pay-hint">قم بالدفع، ثم ارسل صورة التحويل على واتساب لتأكيد الطلب</div>
            </div>

            <a href="${waURL}" target="_blank" rel="noopener"
               class="hero-btn hero-btn--primary" style="display:inline-block">
              راسلنا على واتساب للتأكيد
            </a>
          </div>
        </div>
        <div class="hero-modal__foot" style="justify-content:center">
          <button type="button" id="done" class="hero-btn hero-btn--danger">إغلاق</button>
        </div>
      `;

      const head2 = box.querySelector('.hero-modal__head');
      const logo2 = head2?.querySelector('.hero-modal__logo');
      const headReflow2 = () => {
        const h2 = (logo2?.getBoundingClientRect().height || 44) + 24;
        head2?.style.setProperty('--hero-logo-space', `${h2}px`);
      };
      headReflow2();
      window.addEventListener('resize', headReflow2, { passive: true });

      // copy number
      const payEl = box.querySelector('#payNumber');
      if (payEl){
        payEl.addEventListener('click', async () => {
          try{
            await navigator.clipboard.writeText(payEl.textContent.trim());
            const old = payEl.textContent; payEl.textContent = 'تم النسخ ✅ 01022100662';
            setTimeout(()=>payEl.textContent=old, 1200);
          }catch{}
        });
      }

      // تفريغ السلة بعد التأكيد
      try{
        localStorage.removeItem('designList');
        localStorage.removeItem('shippingInfo');
        localStorage.removeItem('D4P_editId');
        localStorage.removeItem('D4P_editItem');
      }catch{}
      try { window.postMessage({ type:'resetAll' }, '*'); } catch {}
      try { window.postMessage({ type:'refreshList' }, '*'); } catch {}

      // close
      box.querySelector('#done').addEventListener('click', ()=>{ document.body.classList.remove('body--lock'); bd.remove(); });
    });

    // open
    document.body.classList.add('body--lock');
    document.body.appendChild(bd);
  }

  window.openConfirmModal = openConfirmModal;
})();


//=================== فيديو  ===================

(function(){
  const wrap = document.getElementById('hero-video-prv');
  if(!wrap) return;
  const v = wrap.querySelector('video');
  if(!v) return;

  v.setAttribute('playsinline','');
  v.setAttribute('preload','metadata');
  v.setAttribute('muted','');
  v.muted = true;
  v.loop = true;

  // زر الصوت (أيقونة بس)
  const btn = document.createElement('button');
  btn.type='button';
  btn.className='hero-v-btn';
  const ic = document.createElement('i');
  ic.className='hero-v-ic sound-off';
  btn.appendChild(ic);
  wrap.appendChild(btn);

  function syncBtn(){
    ic.className = v.muted ? 'hero-v-ic sound-off' : 'hero-v-ic sound-on';
  }
  btn.addEventListener('click', ()=>{
    v.muted = !v.muted;
    syncBtn();
    if(v.paused) v.play().catch(()=>{});
  });

  // Overlay Play
  const overlay = document.createElement('div');
  overlay.className='hero-v-play';
  overlay.innerHTML='<div class="circle"><div class="tri"></div></div>';
  wrap.appendChild(overlay);

  wrap.addEventListener('click',(e)=>{
    if(e.target===btn || btn.contains(e.target)) return;
    if(v.paused){
      v.play().catch(()=>{});
      overlay.style.opacity='0';
    }else{
      v.pause();
      overlay.style.opacity='1';
    }
  });

  // auto play لما يبقى ظاهر
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver((ents)=>{
      ents.forEach(ent=>{
        if(ent.isIntersecting){ v.play().catch(()=>{}); }
        else{ v.pause(); }
      });
    },{threshold:.4});
    io.observe(wrap);
  }else{
    v.play().catch(()=>{});
  }

  v.addEventListener('volumechange', syncBtn);
  v.addEventListener('play', ()=> overlay.style.opacity='0');
  v.addEventListener('pause',()=> overlay.style.opacity='1');

  syncBtn();
})();

