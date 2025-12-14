// ===============================
//   Part 3 : Text Filter (PNG Overlay)  ✅ Chrome YA 容錯版
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

// ✅ Chrome / 重負載：限制文字濾鏡處理頻率（避免堆幀）
let textLastFrameTime = 0;
const TEXT_FRAME_INTERVAL = 33; // 30fps；不夠順就改 40 或 50

function shouldProcessTextFrame() {
  const now = performance.now();
  if (now - textLastFrameTime < TEXT_FRAME_INTERVAL) return false;
  textLastFrameTime = now;
  return true;
}

// ✅ 避免 onFrame 內 await 疊加造成卡頓
let fdBusy = false;
let handsBusy = false;

// ✅ Hands 可以更慢（文字濾鏡不需要那麼密）
let lastHandsSend = 0;
const TEXT_HAND_INTERVAL = 200; // 200~250 都可以

// ---- 幾何參數：只要調這兩個就好 ----
const FILTER_SCALE_TEXT    = 2.8;
const FILTER_OFFSET_Y_TEXT = 0;

// 上一幀 overlay 在 DOM 裡的位置（給拍照用）
let lastOverlayBox = null;

// ===============================
// ✅ Chrome 容錯：YA(✌️) 手勢判斷（連續幀 + 累積分數 + 冷卻）
// ===============================
const IS_CHROME = /Chrome/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent);

const YA_FIRE_COOLDOWN = 1200;
const YA_HOLD_NEED  = IS_CHROME ? 2 : 3;
const YA_SCORE_NEED = IS_CHROME ? 2.2 : 2.6;

let yaHoldFrames = 0;
let yaScoreAcc   = 0;
let lastYaFireTime = 0;

// 若你全域已經有 gestureLocked，就不會覆蓋；沒有才補上
if (typeof gestureLocked === "undefined") {
  var gestureLocked = false;
}

function fingerExtended(lm, tip, pip) {
  return lm[tip].y < lm[pip].y - 0.02;
}
function fingerCurled(lm, tip, pip) {
  return lm[tip].y > lm[pip].y - 0.01;
}

function yaGestureScore(lm) {
  const idxUp  = fingerExtended(lm, 8, 6);
  const midUp  = fingerExtended(lm, 12, 10);
  const ringDn = fingerCurled(lm, 16, 14);
  const pinDn  = fingerCurled(lm, 20, 18);

  let score = 0;
  if (idxUp)  score += 1.0;
  if (midUp)  score += 1.0;
  if (ringDn) score += 0.8;
  if (pinDn)  score += 0.8;

  const spread = Math.abs(lm[8].x - lm[12].x);
  if (spread > (IS_CHROME ? 0.05 : 0.06)) score += 0.5;

  return score;
}

function detectYAAndFire(lm) {
  const now = performance.now();
  if (now - lastYaFireTime < YA_FIRE_COOLDOWN) return false;

  const score = yaGestureScore(lm);

  if (score >= (IS_CHROME ? 2.0 : 2.2)) {
    yaHoldFrames += 1;
    yaScoreAcc += score;
  } else {
    yaHoldFrames = Math.max(0, yaHoldFrames - 1);
    yaScoreAcc   = Math.max(0, yaScoreAcc - 0.8);
  }

  if (yaHoldFrames >= YA_HOLD_NEED && yaScoreAcc >= YA_SCORE_NEED) {
    lastYaFireTime = now;
    yaHoldFrames = 0;
    yaScoreAcc = 0;
    return true;
  }
  return false;
}

// ===============================
// ✅ 在 hands.onResults 追加：文字濾鏡 YA 觸發拍照
// ===============================
// 你專案應該已經有 hands.onResults 了：
// - 如果你只有一個 hands.onResults：把下面這段「整個 function」合併進你現有的 hands.onResults 裡
// - 如果你還沒寫 hands.onResults：可以直接貼這段（但不要跟別的 hands.onResults 重複宣告）
if (typeof window.__textFilterHandsHooked === "undefined") {
  window.__textFilterHandsHooked = true;

  hands.onResults((results) => {
    const lms = results.multiHandLandmarks;
    if (!lms || !lms.length) return;

    const lm = lms[0];

    // ✅ 文字濾鏡階段：YA → takeTextPhoto()
    if (filterPhase === 2 && overlayStep === 7 && !gestureLocked) {
      if (detectYAAndFire(lm)) {
        console.log("✌️ YA detected (tolerant) → takeTextPhoto()");
        gestureLocked = true;

        takeTextPhoto();

        // ✅ 保底解鎖：避免 Chrome 因 stop camera/換頁導致鎖死
        setTimeout(() => { gestureLocked = false; }, 1500);
      }
    }
  });
}

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

  // 已經啟動過就不要再開一次
  if (filterStarted) {
    console.log("🔤 文字濾鏡已啟動過，略過");
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
      faceOverlayEl.style.opacity = 0;
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

    faceOverlayEl.style.width  = w + "px";
    faceOverlayEl.style.height = h + "px";
    faceOverlayEl.style.left   = x + "px";
    faceOverlayEl.style.top    = y + "px";
    faceOverlayEl.style.opacity = 1;

    lastOverlayBox = { x, y, w, h };
  });

  // Camera：同時餵給 FaceDetection（TextFilter）跟 Hands（YA 手勢）
  filterCam = new Camera(filterVideo, {
    onFrame: async () => {
      if (!filterVideo.videoWidth) return;

      const now = performance.now();

      // 1️⃣ Hands（YA）— 一定要持續送
      if (!handsBusy && now - lastHandsSend >= TEXT_HAND_INTERVAL) {
        lastHandsSend = now;
        handsBusy = true;
        hands.send({ image: filterVideo })
          .catch(e => console.warn("hands.send error:", e))
          .finally(() => { handsBusy = false; });
      }

      // 2️⃣ FaceDetection（可降頻）
      if (!shouldProcessTextFrame()) return;

      if (!fdBusy) {
        fdBusy = true;
        fd.send({ image: filterVideo })
          .catch(e => console.warn("fd.send error:", e))
          .finally(() => { fdBusy = false; });
      }
    },
    width: 1080,
    height: 1920
  });

  filterCam.start();
  console.log("🔤 文字 PNG 濾鏡已啟動");
}

// ===============================
//   停止文字濾鏡鏡頭
// ===============================
function stopTextCamera() {
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
  handsBusy = false;

  console.log("🔤 stopTextCamera：文字濾鏡鏡頭已關閉");
}

// ===============================
//   YA 拍照：文字濾鏡 → 07
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

  // 02 再疊 文字-08
  if (textBgImage.complete) {
    ctx.drawImage(textBgImage, 0, 0, canvas.width, canvas.height);
  } else {
    console.warn("⚠️ 文字-08 還沒載完，背景略過");
  }

  // 03 疊 文字-07 PNG
  if (lastOverlayBox && faceOverlayEl.complete) {
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

  const photo = canvas.toDataURL("image/png");

  try {
    localStorage.setItem("capturedImage", photo);
  } catch (e) {
    console.warn("⚠️ 無法寫入 localStorage：", e);
  }

  if (uiPhotoFinish) uiPhotoFinish.src = photo;
  if (postImage)     postImage.src     = photo;

  if (filterSelectOverlay) filterSelectOverlay.style.display = "none";
  if (photoFinishOverlay)  photoFinishOverlay.style.display  = "flex";

  overlayStep = 5;

  stopTextCamera();

  // ✅ 保底解鎖（Chrome 有時 stop camera 後狀態怪）
  gestureLocked = false;

  console.log("📸 文字濾鏡拍照完成 → 07（已包含 文字-08）");
}