// ===============================
//   Part 2 : Makeup Filter (FaceMesh)
//   Enter 切換濾鏡
//   20 秒倒數 → 自動拍照
//   腮紅 / 眼影保留，眉毛移除
//   ✅ 倒數交給 script.js 管
// ===============================


// ---------- FPS 控制 ----------
let lastFrameTime = 0;
const FRAME_INTERVAL = 33;
function shouldProcessFrame() {
  const now = performance.now();
  if (now - lastFrameTime < FRAME_INTERVAL) return false;
  lastFrameTime = now;
  return true;
}


// ---------- Canvas ----------
const mkCtx       = mkCanvas.getContext("2d");
const mkRawBuffer = document.createElement("canvas");
const mkRawCtx    = mkRawBuffer.getContext("2d");

let mkCamera = null;
let fmBusy = false;


// ---------- 狀態 ----------
let isInMakeupMode = false;
let enterBound = false;
let autoShotTimer = null;
let autoShotLocked = false;

const AUTO_SHOT_MS = 20000;


// ===============================
// 妝容素材
// ===============================
const faceImg  = new Image();
const lipImg   = new Image();
const eyeImg   = new Image();
const blushImg = new Image();

const makeupFolders = ["makeup/","makeup2/","makeup3/","makeup4/","makeup5/"];
let currentStyleIndex = 0;


// ---------- 底部圈圈 UI ----------
function updateNavUI(activeIndex) {
  if (!navImgs) return;
  navImgs.forEach((img, i) => {
    img.src = (i === activeIndex) ? "image/red man.png" : "image/bth.png";
  });
}


// ---------- 載入妝容 ----------
function loadMakeupStyle(index) {
  const folder = makeupFolders[index] || makeupFolders[0];
  faceImg.src  = folder + "foundation.png";
  lipImg.src   = folder + "lip.png";
  eyeImg.src   = folder + "eye.png";
  blushImg.src = folder + "blush.png";
  updateNavUI(index);
}
loadMakeupStyle(0);


// ===============================
// Enter 切換濾鏡
// ===============================
function bindEnterForMakeup() {
  if (enterBound) return;
  enterBound = true;

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !isInMakeupMode) return;
    e.preventDefault();
    e.stopPropagation();

    currentStyleIndex = (currentStyleIndex + 1) % makeupFolders.length;
    loadMakeupStyle(currentStyleIndex);
  }, true);
}


// ===============================
// 啟動美妝濾鏡
// ===============================
function startMakeupFilter() {
  bindEnterForMakeup();

  mkStage.style.display = "block";
  frameMakeup.style.display = "block";
  frameText.style.display = "none";
  navBar.style.display = "flex";
  filterSelectOverlay.style.display = "flex";

  mkCanvas.style.display = "block";
  mkVideo.style.opacity = 0;

  filterPhase = 1;
  overlayStep = 4;

  isInMakeupMode = true;
  autoShotLocked = false;

  // ✅ 倒數交給 script.js
  if (window.startMakeupCountdown) {
    window.startMakeupCountdown(20);
  }

  if (autoShotTimer) clearTimeout(autoShotTimer);
  autoShotTimer = setTimeout(() => {
    if (isInMakeupMode && !autoShotLocked) {
      autoShotLocked = true;
      takeMakeupPhoto();
    }
  }, AUTO_SHOT_MS);

  if (mkCamera || mkVideo.srcObject) return;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mkVideo.srcObject = stream;

      mkCamera = new Camera(mkVideo, {
        onFrame: async () => {
          if (!mkVideo.videoWidth || fmBusy || !shouldProcessFrame()) return;
          fmBusy = true;
          try {
            await faceMesh.send({ image: mkVideo });
          } finally {
            fmBusy = false;
          }
        },
        width: 1080,
        height: 1920
      });

      mkCamera.start();
    });
}


// ===============================
// FaceMesh 畫妝（粉底 / 唇 / 腮紅 / 眼影）
// ===============================
let fx = 0, fy = 0, fw = 0;
let lx = 0, ly = 0, lw = 0;
let mkInited = false;

const LIP_Y_OFFSET = -0.20;
const FOUNDATION_SCALE = 4.5;

const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

faceMesh.onResults(res => {
  if (!mkVideo.videoWidth || !res.multiFaceLandmarks?.length) return;

  const w = mkVideo.videoWidth;
  const h = mkVideo.videoHeight;

  mkCanvas.width = mkRawBuffer.width = w;
  mkCanvas.height = mkRawBuffer.height = h;

  mkRawCtx.save();
  mkRawCtx.translate(w, 0);
  mkRawCtx.scale(-1, 1);
  mkRawCtx.drawImage(mkVideo, 0, 0, w, h);
  mkRawCtx.restore();

  mkCtx.clearRect(0, 0, w, h);
  mkCtx.drawImage(mkRawBuffer, 0, 0);

  const lm = res.multiFaceLandmarks[0];

  // 臉
  const L = (1 - lm[234].x) * w;
  const R = (1 - lm[454].x) * w;
  const T = lm[10].y * h;
  const B = lm[152].y * h;

  const cx = (L + R) / 2;
  const cy = (T + B) / 2;
  const faceW = Math.abs(R - L) * FOUNDATION_SCALE;

  if (!mkInited) {
    fx = cx; fy = cy; fw = faceW;
    mkInited = true;
  } else {
    fx += (cx - fx) * 0.25;
    fy += (cy - fy) * 0.25;
    fw += (faceW - fw) * 0.25;
  }

  const faceH = fw * (faceImg.height / faceImg.width || 1);
  mkCtx.drawImage(faceImg, fx - fw / 2, fy - faceH / 2 + 30, fw, faceH);

  // 唇
  const lX = (1 - lm[61].x) * w;
  const rX = (1 - lm[291].x) * w;
  const tY = lm[13].y * h;
  const bY = lm[14].y * h;

  const lipCX = (lX + rX) / 2;
  const lipCY = ((tY + bY) / 2) + Math.abs(rX - lX) * LIP_Y_OFFSET;
  const lipW  = Math.abs(rX - lX) * 16.1;

  lx += (lipCX - lx) * 0.25;
  ly += (lipCY - ly) * 0.25;
  lw += (lipW  - lw) * 0.25;

  const lipH = lw * (lipImg.height / lipImg.width || 1);
  mkCtx.drawImage(lipImg, lx - lw / 2, ly - lipH / 2, lw, lipH);

  // 腮紅
  const blushSize = fw * 0.9;
  mkCtx.save();
  mkCtx.globalAlpha = 0.85;

  mkCtx.drawImage(
    blushImg,
    (1 - lm[234].x) * w - blushSize / 2 - 60,
    lm[250].y * h - blushSize / 2 + 8,
    blushSize, blushSize
  );

  mkCtx.drawImage(
    blushImg,
    (1 - lm[454].x) * w - blushSize / 2 - 44,
    lm[454].y * h - blushSize / 2 + 35,
    blushSize, blushSize
  );

  mkCtx.restore();

  // 眼影 / 眼線
  const eyeW = fw * 0.22;
  const eyeH = eyeW * (eyeImg.height / eyeImg.width || 1);

  mkCtx.drawImage(
    eyeImg,
    (1 - lm[159].x) * w - eyeW / 2 + 2,
    lm[159].y * h - eyeH / 2 + 3,
    eyeW, eyeH
  );

  mkCtx.save();
  mkCtx.translate((1 - lm[386].x) * w + 2, lm[386].y * h + 1.5);
  mkCtx.scale(-1, 1);
  mkCtx.drawImage(eyeImg, -eyeW / 2, -eyeH / 2, eyeW, eyeH);
  mkCtx.restore();
});


// ===============================
// 拍照
// ===============================
function takeMakeupPhoto() {
  const photo = mkCanvas.toDataURL("image/png");
  try { localStorage.setItem("capturedImage", photo); } catch {}

  uiPhotoFinish.src = photo;
  postImage.src = photo;

  // ✅ 先顯示 07（打卡畫面）
  photoFinishOverlay.style.display = "flex";

  isInMakeupMode = false;
  stopMakeupCountdown();

  if (autoShotTimer) clearTimeout(autoShotTimer);
  autoShotTimer = null;

  stopMakeupCamera();

  // ✅✅✅ 新增：讓 07 出現後跑 8 秒 → Window2
  runAutoFrom07();
}


// ===============================
// 關閉鏡頭
// ===============================
function stopMakeupCamera() {
  if (mkCamera) {
    try { mkCamera.stop(); } catch {}
  }
  mkCamera = null;

  if (mkVideo.srcObject) {
    mkVideo.srcObject.getTracks().forEach(t => t.stop());
    mkVideo.srcObject = null;
  }

  fmBusy = false;
}
// ===============================
// 美妝倒數結束 → 自動拍照 → 跳 07
// 給 script.js 呼叫用
// ===============================
window.makeupAutoCapture = function () {
  try {
    // 1) 先把美妝選單/框暫時隱藏（避免截到選單畫面）
    setMakeupUIVisible(false);

    // 2) 等 2 幀：讓你的 mkCanvas 有機會畫出「只有臉+妝」的最後一刻
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {

        // ✅ 建議：把 mkCanvas 當下畫面「拷貝」到 offscreen，避免後面停掉循環時畫面被改掉
        const snap = document.createElement("canvas");
        snap.width = mkCanvas.width;
        snap.height = mkCanvas.height;
        snap.getContext("2d").drawImage(mkCanvas, 0, 0);

        // 3) 塞進 07 的 img
        const img = document.getElementById("ui-photo-finish");
        if (img) img.src = snap.toDataURL("image/jpeg", 0.92);

        // 4) 顯示 07（打卡框），並關掉美妝頁
        const mkStageEl = document.getElementById("mk-stage");
        const photoFinishOverlay = document.getElementById("photo-finish-overlay");

        if (mkStageEl) mkStageEl.style.display = "none";
        if (photoFinishOverlay) photoFinishOverlay.style.display = "flex";

        // 5) 回復 UI（其實 mkStage 已 hidden，回不回都行，但保險起見）
        setMakeupUIVisible(true);

        // 6) 更新狀態，跑你原本 07 → 08 的計時流程
        window.overlayStep = 5;
        if (typeof window.runAutoFrom07 === "function") window.runAutoFrom07();

        // 7) 最後再停掉美妝 loop/camera（避免你停太早導致截到的是「選單那一幀」）
        if (typeof window.stopMakeupFilter === "function") window.stopMakeupFilter();

        console.log("✅ 美妝拍照：已保留最後妝容並跳到 07");
      });
    });

  } catch (e) {
    console.error("❌ makeupAutoCapture 失敗：", e);
    // 失敗也要把 UI 放回來，避免卡死
    try { setMakeupUIVisible(true); } catch {}
  }
};