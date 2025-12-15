// ===============================
//   Part 3 : Text Filter (PNG Overlay)
//   ✅ 刪除手勢
//   ✅ 進入後 10 秒自動拍攝（只一次）
// ===============================

// 文字濾鏡用的兩張圖
const TEXT_BG_SRC      = "image/text2.png"; // 背景
const TEXT_OVERLAY_SRC = "image/text1.png"; // 臉上 PNG

// 預先載入背景，給拍照用
const textBgImage = new Image();
textBgImage.src = TEXT_BG_SRC;

// MediaPipe FaceDetection
let fd = null;
let filterCam = null;
let filterStarted = false;

// ---- 幾何參數：只要調這兩個就好 ----
const FILTER_SCALE_TEXT    = 2.8;
const FILTER_OFFSET_Y_TEXT = 0;

// 上一幀 overlay 在 DOM 裡的位置（給拍照用）
let lastOverlayBox = null;

// ✅ 自動拍照控制
const AUTO_TEXT_SHOT_MS = 10000;
let autoTextShotTimer = null;
let autoTextShotLocked = false;

// ✅ 避免 onFrame await 堆積
let fdBusy = false;


// ===============================
//   啟動文字濾鏡
// ===============================
function startTextFilter() {
  console.log("🔤 startTextFilter() 啟動");

  // 換框：只顯示文字用的 frame
  if (frameMakeup) frameMakeup.style.display = "none";
  if (frameText)   frameText.style.display   = "block";

  // 打開濾鏡外層
  if (filterSelectOverlay) filterSelectOverlay.style.display = "flex";

  // 關掉美妝那組 canvas / video
  if (mkCanvas) mkCanvas.style.display = "none";
  if (mkVideo)  mkVideo.style.display  = "none";

  // 底下五顆圈圈 nav 關掉
  const mkNav = document.querySelector("#mk-stage .nav");
  if (mkNav) mkNav.style.display = "none";

  // 背景：文字-08
  if (filterBg) {
    filterBg.style.display = "block";
    filterBg.src = TEXT_BG_SRC;
  }

  // 鏡頭畫面（鏡像）
  if (filterVideo) {
    filterVideo.style.display  = "block";
    filterVideo.style.transform = "scaleX(-1)";
  }

  // 臉上的 PNG：文字-07
  if (faceOverlayEl) {
    faceOverlayEl.style.display = "block";
    faceOverlayEl.src = TEXT_OVERLAY_SRC;
  }

  filterPhase = 2;
  overlayStep = 7;

  // ✅ 進入文字濾鏡就開始 10 秒倒數自動拍照（每次進來都重設）
  autoTextShotLocked = false;
  if (autoTextShotTimer) clearTimeout(autoTextShotTimer);
  autoTextShotTimer = setTimeout(() => {
    if (autoTextShotLocked) return;
    autoTextShotLocked = true;
    console.log("⏱️ 文字濾鏡 10 秒到 → 自動拍照");
    takeTextPhoto();
  }, AUTO_TEXT_SHOT_MS);

  // 已經啟動過就不要再開一次（但倒數已重設）
  if (filterStarted) {
    console.log("🔤 文字濾鏡已啟動過，略過重新初始化");
    return;
  }
  filterStarted = true;

  // 打開鏡頭（給 filterVideo）
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
    .then(stream => {
      filterVideo.srcObject = stream;
    })
    .catch(err => {
      console.error("startTextFilter 開鏡頭失敗：", err);
    });

  // FaceDetection 初始化
  fd = new FaceDetection({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}`
  });

  fd.setOptions({
    model: "short",
    minDetectionConfidence: 0.6
  });

  // 每一幀臉的結果 → 算出 PNG 要貼在哪裡（預覽用）
  fd.onResults((results) => {
    if (!results.detections || !results.detections.length) {
      if (faceOverlayEl) faceOverlayEl.style.opacity = 0;
      lastOverlayBox = null;
      return;
    }

    const bbox = results.detections[0].boundingBox;

    // 用「目前畫面上實際尺寸」來算，預覽才會準
    const vw = filterVideo.clientWidth;
    const vh = filterVideo.clientHeight;

    const cx = (1 - bbox.xCenter) * vw; // 鏡像
    const cy = bbox.yCenter * vh;

    const fw = bbox.width  * vw;
    const fh = bbox.height * vh;

    const w = fw * FILTER_SCALE_TEXT;
    const h = fh * FILTER_SCALE_TEXT;

    const x = cx - w / 2;
    const y = cy - h / 2 + FILTER_OFFSET_Y_TEXT * vh;

    faceOverlayEl.style.width   = w + "px";
    faceOverlayEl.style.height  = h + "px";
    faceOverlayEl.style.left    = x + "px";
    faceOverlayEl.style.top     = y + "px";
    faceOverlayEl.style.opacity = 1;

    lastOverlayBox = { x, y, w, h };
  });

  // Camera：只餵 FaceDetection（✅ 不再餵 hands）
  filterCam = new Camera(filterVideo, {
    onFrame: async () => {
      if (!filterVideo.videoWidth) return;

      if (fdBusy) return;
      fdBusy = true;
      try {
        await fd.send({ image: filterVideo });
      } finally {
        fdBusy = false;
      }
    },
    width: 1080,
    height: 1920
  });

  filterCam.start();
  console.log("🔤 文字 PNG 濾鏡已啟動（10 秒自動拍照 / 無手勢）");
}


// ===============================
//   停止文字濾鏡鏡頭
// ===============================
function stopTextCamera() {
  // ✅ 清掉自動拍照 timer（避免離開後還觸發）
  if (autoTextShotTimer) {
    clearTimeout(autoTextShotTimer);
    autoTextShotTimer = null;
  }
  autoTextShotLocked = true;

  if (filterCam) {
    try { filterCam.stop(); }
    catch (e) { console.warn("stopTextCamera stop() 失敗：", e); }
    filterCam = null;
  }

  if (filterVideo && filterVideo.srcObject) {
    filterVideo.srcObject.getTracks().forEach(t => t.stop());
    filterVideo.srcObject = null;
  }

  fdBusy = false;

  console.log("🔤 stopTextCamera：文字濾鏡鏡頭已關閉");
}


// ===============================
//   自動拍照：文字濾鏡 → 07（後面邏輯不變）
// ===============================
function takeTextPhoto() {
  const vw = filterVideo.videoWidth;
  const vh = filterVideo.videoHeight;

  if (!vw || !vh) {
    console.warn("⚠️ filterVideo 尚未抓到解析度");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width  = vw;
  canvas.height = vh;
  const ctx = canvas.getContext("2d");

  // 01 先畫鏡頭畫面（鏡像）
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(filterVideo, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 02 再疊 文字-08（overlay）
  if (textBgImage.complete) {
    ctx.drawImage(textBgImage, 0, 0, canvas.width, canvas.height);
  } else {
    console.warn("⚠️ 文字-08 還沒載完，背景略過");
  }

  // 03 疊 文字-07 PNG
  if (lastOverlayBox && faceOverlayEl && faceOverlayEl.complete) {
    const domW = filterVideo.clientWidth;
    const domH = filterVideo.clientHeight;

    const sx = lastOverlayBox.x / domW;
    const sy = lastOverlayBox.y / domH;
    const sw = lastOverlayBox.w / domW;
    const sh = lastOverlayBox.h / domH;

    const dx = sx * canvas.width;
    const dy = sy * canvas.height;
    const dw = sw * canvas.width;
    const dh = sh * canvas.height;

    ctx.drawImage(faceOverlayEl, dx, dy, dw, dh);
  }

  // 04 存成圖片，丟去 07 / IG
  const photo = canvas.toDataURL("image/png");

  try { localStorage.setItem("capturedImage", photo); }
  catch (e) { console.warn("⚠️ 無法寫入 localStorage：", e); }

  if (uiPhotoFinish) uiPhotoFinish.src = photo;
  if (postImage)     postImage.src     = photo;

  if (filterSelectOverlay) filterSelectOverlay.style.display = "none";
  if (photoFinishOverlay)  photoFinishOverlay.style.display  = "flex";

  overlayStep = 5;

  stopTextCamera();

  console.log("📸 文字濾鏡拍照完成 → 07（已包含 文字-08）");
}