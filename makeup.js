// ===============================
//   Part 2 : Makeup Filter (FaceMesh)
//   ✅ Enter 切換濾鏡
//   ✅ 進入後倒數 20 秒自動拍照（只一次）
//   ✅ 移除 Hands（無捏合/YA）更穩
//   ✅ 恢復 腮紅/眼影（眉毛已移除）
// ===============================


// ---------- FPS 控制（Chrome 穩定） ----------
let lastFrameTime = 0;
const FRAME_INTERVAL = 33; // ≈30 FPS
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


// ---------- 避免 onFrame await 疊加 ----------
let fmBusy = false;


// ---------- Enter / 自動拍照狀態 ----------
let isInMakeupMode = false;
let enterBound = false;
let autoShotTimer = null;
let autoShotLocked = false;

const AUTO_SHOT_MS = 20000;


// ---------- 妝容素材 ----------
const faceImg  = new Image();
const lipImg   = new Image();
const browImg  = new Image();   // ✅ 仍保留載入（但不畫）
const eyeImg   = new Image();
const blushImg = new Image();

const makeupFolders = ["makeup/","makeup2/","makeup3/","makeup4/","makeup5/"];
let currentStyleIndex = 0;


// ✅ 眉毛開關：你要刪眉毛，所以 false
const ENABLE_BROW = false;


// ---------- 底部圈圈 UI ----------
function updateNavUI(activeIndex) {
  if (!navImgs || !navImgs.length) return;
  navImgs.forEach((img, i) => {
    img.src = (i === activeIndex) ? "image/red man.png" : "image/bth.png";
  });
}


// ---------- 載入妝容 ----------
function loadMakeupStyle(index) {
  const folder = makeupFolders[index] || makeupFolders[0];

  faceImg.src  = folder + "foundation.png";
  lipImg.src   = folder + "lip.png";

  // ✅ 眉毛檔名容錯：brows.png / brow.png 都可以
  browImg.onerror = () => { browImg.src = folder + "brows.png"; };
  browImg.src = folder + "brow.png";

  eyeImg.src   = folder + "eye.png";
  blushImg.src = folder + "blush.png";

  updateNavUI(index);
  console.log("💄 載入妝容：", folder);
}
loadMakeupStyle(0);


// ===============================
// Enter 事件（只在美妝模式生效）
// ===============================
function bindEnterForMakeup() {
  if (enterBound) return;
  enterBound = true;

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (!isInMakeupMode) return;

    e.preventDefault();
    e.stopPropagation();

    currentStyleIndex = (currentStyleIndex + 1) % makeupFolders.length;
    loadMakeupStyle(currentStyleIndex);
  }, true);
}


// ===============================
// 開啟美妝濾鏡（主入口）
// ===============================
function startMakeupFilter() {
  bindEnterForMakeup();

  detectFinishOverlay && (detectFinishOverlay.style.display = "none");
  ratingOverlay       && (ratingOverlay.style.display       = "none");
  lowScoreOverlay     && (lowScoreOverlay.style.display     = "none");
  cameraOverlay       && (cameraOverlay.style.display       = "none");

  mkStage     && (mkStage.style.display     = "block");
  frameMakeup && (frameMakeup.style.display = "block");
  frameText   && (frameText.style.display   = "none");
  navBar      && (navBar.style.display      = "flex");

  filterSelectOverlay && (filterSelectOverlay.style.display = "flex");
  filtersWrapper      && (filtersWrapper.style.display      = "flex");

  mkCanvas.style.display = "block";
  mkVideo.style.opacity  = 0;

  filterPhase = 1;
  overlayStep = 4;

  isInMakeupMode = true;

  // ✅ 每次進入都重新開始 20 秒自動拍照（只拍一次）
  autoShotLocked = false;
  if (autoShotTimer) clearTimeout(autoShotTimer);
  autoShotTimer = setTimeout(() => {
    if (!isInMakeupMode) return;
    if (autoShotLocked) return;
    autoShotLocked = true;
    console.log("⏱️ 20 秒到 → 自動拍照");
    takeMakeupPhoto();
  }, AUTO_SHOT_MS);

  // ✅ 如果鏡頭已經開著，就不要重開
  if (mkCamera || (mkVideo && mkVideo.srcObject)) {
    console.log("💄 美妝鏡頭已在運作，略過重啟");
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mkVideo.srcObject = stream;

      mkCamera = new Camera(mkVideo, {
        onFrame: async () => {
          if (!mkVideo.videoWidth) return;
          if (!shouldProcessFrame()) return;
          if (fmBusy) return;

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
      console.log("💄 美妝 FaceMesh 已啟動（Enter 換濾鏡 / 20 秒自動拍照）");
    })
    .catch(err => console.error("startMakeupFilter 開鏡頭失敗：", err));
}


// ===============================
// Mediapipe FaceMesh 初始化
// ===============================
let mkInitialized = false;
let fx = 0, fy = 0, fw = 0;
let lx = 0, ly = 0, lw = 0;

const LIP_Y_OFFSET     = -0.20;
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


// ===============================
// FaceMesh 結果：畫妝容（粉底/嘴唇/腮紅/眼影，眉毛移除）
// ===============================
faceMesh.onResults((res) => {
  if (!mkVideo.videoWidth) return;

  const w = mkVideo.videoWidth;
  const h = mkVideo.videoHeight;

  mkCanvas.width = mkRawBuffer.width = w;
  mkCanvas.height = mkRawBuffer.height = h;

  // 畫鏡像相機
  mkRawCtx.save();
  mkRawCtx.translate(w, 0);
  mkRawCtx.scale(-1, 1);
  mkRawCtx.drawImage(mkVideo, 0, 0, w, h);
  mkRawCtx.restore();

  mkCtx.clearRect(0, 0, w, h);
  mkCtx.drawImage(mkRawBuffer, 0, 0);

  if (!res.multiFaceLandmarks?.length) return;
  const lm = res.multiFaceLandmarks[0];

  // 臉部大範圍（粉底）
  const L = (1 - lm[234].x) * w;
  const R = (1 - lm[454].x) * w;
  const T = lm[10].y * h;
  const B = lm[152].y * h;

  const cx = (L + R) / 2;
  const cy = (T + B) / 2;
  const faceWidth = Math.abs(R - L) * FOUNDATION_SCALE;

  if (!mkInitialized) {
    fx = cx; fy = cy; fw = faceWidth;
    mkInitialized = true;
  } else {
    fx += (cx - fx) * 0.25;
    fy += (cy - fy) * 0.25;
    fw += (faceWidth - fw) * 0.25;
  }

  const fh = fw * (faceImg.height / faceImg.width);
  mkCtx.drawImage(faceImg, fx - fw / 2, fy - fh / 2 + 30, fw, fh);

  // 嘴唇
  const lX = (1 - lm[61].x) * w;
  const rX = (1 - lm[291].x) * w;
  const tY = lm[13].y * h;
  const bY = lm[14].y * h;

  const lipCX = (lX + rX) / 2;
  const lipCY = ((tY + bY) / 2) + Math.abs(rX - lX) * LIP_Y_OFFSET;
  const lipTargetW = Math.abs(rX - lX) * 16.1;

  if (!lw) {
    lx = lipCX; ly = lipCY; lw = lipTargetW;
  } else {
    lx += (lipCX - lx) * 0.25;
    ly += (lipCY - ly) * 0.25;
    lw += (lipTargetW - lw) * 0.25;
  }

  const lipH = lw * (lipImg.height / lipImg.width);
  mkCtx.drawImage(lipImg, lx - lw / 2, ly - lipH / 2, lw, lipH);

  // ✅ 腮紅（加回來）
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

  // ✅ 眼影/眼線（加回來）
  const eyeW = fw * 0.21;
  const eyeH = eyeW * (eyeImg.height / eyeImg.width);

  mkCtx.drawImage(
    eyeImg,
    (1 - lm[159].x) * w - eyeW / 2 + 2,
    lm[159].y * h - eyeH / 2 + 3,
    eyeW, eyeH
  );

  mkCtx.save();
  mkCtx.translate((1 - lm[386].x) * w + 2, lm[386].y * h + 1.5);
  mkCtx.scale(-1, 1);
  mkCtx.drawImage(eyeImg, -eyeW / 2.1, -eyeH / 2.05, eyeW, eyeH);
  mkCtx.restore();

  // ✅ 眉毛（你要刪掉，所以預設不畫）
  if (ENABLE_BROW) {
    const browW = fw * 1.3;
    const browH = browW * (browImg.height / browImg.width) * 0.7;

    mkCtx.drawImage(
      browImg,
      (1 - lm[70].x) * w - browW / 2 - 50,
      lm[70].y * h - browH / 2 + 70,
      browW, browH
    );

    mkCtx.save();
    mkCtx.translate((1 - lm[300].x) * w + 50, lm[300].y * h + 70);
    mkCtx.scale(-1, 1);
    mkCtx.drawImage(browImg, -browW / 2, -browH / 2, browW, browH);
    mkCtx.restore();
  }
});


// ===============================
// 拍照（20 秒到會呼叫）
// ===============================
function takeMakeupPhoto() {
  const photo = mkCanvas.toDataURL("image/png");

  try { localStorage.setItem("capturedImage", photo); }
  catch (e) { console.warn("⚠️ 無法寫入 localStorage：", e); }

  uiPhotoFinish && (uiPhotoFinish.src = photo);
  postImage     && (postImage.src     = photo);

  filterSelectOverlay && (filterSelectOverlay.style.display = "none");
  photoFinishOverlay  && (photoFinishOverlay.style.display  = "flex");

  overlayStep = 5;

  isInMakeupMode = false;
  if (autoShotTimer) {
    clearTimeout(autoShotTimer);
    autoShotTimer = null;
  }

  stopMakeupCamera();
}


// ===============================
// 關閉鏡頭
// ===============================
function stopMakeupCamera() {
  if (mkCamera) {
    try { mkCamera.stop(); } catch {}
    mkCamera = null;
  }

  if (mkVideo && mkVideo.srcObject) {
    mkVideo.srcObject.getTracks().forEach(t => t.stop());
    mkVideo.srcObject = null;
  }

  fmBusy = false;
  autoShotLocked = true;
}