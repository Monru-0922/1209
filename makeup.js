// ===============================
//   Part 2 : Makeup Filter (FaceMesh) ✅ Chrome 穩定版
// ===============================

// Makeup canvas
const mkCtx       = mkCanvas.getContext("2d");
const mkRawBuffer = document.createElement("canvas");
const mkRawCtx    = mkRawBuffer.getContext("2d");

// 給 FaceMesh + Hands 共用的 Camera
let mkCamera = null;

// ✅ 避免 onFrame 內 await 堆積（Chrome 很重要）
let fmBusy = false;
let hdBusy = false;

// ✅ Hands 降頻（150~250ms 都可；想更穩就 200）
let lastHandSend = 0;
const HAND_INTERVAL = 150;

// Image assets (same filename in all folders)
const faceImg  = new Image();
const lipImg   = new Image();
const browImg  = new Image();
const eyeImg   = new Image();
const blushImg = new Image();

// 五組妝容資料夾
const makeupFolders = [
  "makeup/",
  "makeup2/",
  "makeup3/",
  "makeup4/",
  "makeup5/"
];

// 目前濾鏡 index：0~4 對應 1~5 顆圈圈
let currentStyleIndex = 0;

// --- 底部圈圈亮起 UI ---
function updateNavUI(activeIndex) {
  if (!navImgs || !navImgs.length) return;

  navImgs.forEach((img, i) => {
    img.src = (i === activeIndex)
      ? "image/red man.png"
      : "image/bth.png";
  });
}

// ---------------------------
// 載入某一組妝容
// ---------------------------
function loadMakeupStyle(index) {
  const folder = makeupFolders[index] || makeupFolders[0];

  faceImg.src  = folder + "foundation.png";
  lipImg.src   = folder + "lip.png";
  browImg.src  = folder + "brow.png";
  eyeImg.src   = folder + "eye.png";
  blushImg.src = folder + "blush.png";

  updateNavUI(index);
  console.log("💄 加載妝容：", folder);
}

// ---------------------------
// 換濾鏡（揮手用）step = +1 / -1
// ---------------------------
function changeMakeupStyle(step) {
  currentStyleIndex += step;

  if (currentStyleIndex < 0) currentStyleIndex = makeupFolders.length - 1;
  if (currentStyleIndex >= makeupFolders.length) currentStyleIndex = 0;

  loadMakeupStyle(currentStyleIndex);
}

// ---------------------------
// 點底部圓圈直接選濾鏡（HTML onclick="changeStyle(1)"）
// ---------------------------
function changeStyle(n) {
  currentStyleIndex = (n - 1 + makeupFolders.length) % makeupFolders.length;
  loadMakeupStyle(currentStyleIndex);
  console.log("🔘 點選濾鏡：", n);
}

// 初始載入第一組妝容
loadMakeupStyle(0);

// ---------------------------
// Mediapipe FaceMesh 初始化
// ---------------------------
let mkInitialized = false;

// 平滑數值
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

// ---------------------------
// 開啟美妝濾鏡 + FaceMesh + Hands（YA & 揮動）
// ---------------------------
function startMakeupFilter() {
  // ✅ 避免重複開鏡造成 Chrome 卡/手勢失效
  stopMakeupCamera();

  // 先把偵測相關的 overlay 全部關掉（04 / 05 / 06 / camera）
  if (detectFinishOverlay) detectFinishOverlay.style.display = "none";
  if (ratingOverlay)       ratingOverlay.style.display       = "none";
  if (lowScoreOverlay)     lowScoreOverlay.style.display     = "none";
  if (cameraOverlay)       cameraOverlay.style.display       = "none";

  // 顯示美妝用的外框
  if (mkStage)     mkStage.style.display     = "block";
  if (frameMakeup) frameMakeup.style.display = "block";
  if (frameText)   frameText.style.display   = "none";

  // 美妝時要看到底部圈圈
  if (navBar) navBar.style.display = "flex";

  // 狀態標記
  filterPhase = 1; // 第一輪：美妝濾鏡
  overlayStep = 4;

  // 開啟濾鏡一畫面
  if (filterSelectOverlay) filterSelectOverlay.style.display = "flex";
  if (cameraOverlay)       cameraOverlay.style.display       = "none";

  mkCanvas.style.display = "block";
  mkVideo.style.opacity  = 0;

  if (filtersWrapper) filtersWrapper.style.display = "flex";

  // ✅ 進入濾鏡重置平滑狀態（避免切回來抖/飄）
  mkInitialized = false;
  fx = fy = fw = 0;
  lx = ly = lw = 0;

  // ✅ 重置 busy / 計時
  fmBusy = false;
  hdBusy = false;
  lastHandSend = 0;

  // 開鏡頭（FaceMesh + Hands）
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
    .then(stream => {
      mkVideo.srcObject = stream;

      mkCamera = new Camera(mkVideo, {
        onFrame: async () => {
          if (!mkVideo.videoWidth) return;

          // ✅ FaceMesh：避免堆積（不要每幀 await）
          if (!fmBusy) {
            fmBusy = true;
            faceMesh.send({ image: mkVideo })
              .catch(e => console.warn("faceMesh.send error:", e))
              .finally(() => { fmBusy = false; });
          }

          // ✅ Hands：降頻 + 避免堆積（YA / 揮手更穩）
          const now = performance.now();
          if (now - lastHandSend >= HAND_INTERVAL && !hdBusy) {
            lastHandSend = now;
            hdBusy = true;
            hands.send({ image: mkVideo })
              .catch(e => console.warn("hands.send error:", e))
              .finally(() => { hdBusy = false; });
          }
        },
        width: 1080,
        height: 1920
      });

      mkCamera.start();
      console.log("💄 濾鏡一：FaceMesh + Hands（YA & Swipe）已啟動");
    })
    .catch(err => {
      console.error("startMakeupFilter 開鏡頭失敗：", err);
    });
}

// ---------------------------
// FaceMesh 結果：畫妝容
// ---------------------------
faceMesh.onResults((res) => {
  if (!mkVideo.videoWidth) return;

  const w = mkVideo.videoWidth;
  const h = mkVideo.videoHeight;

  // ✅ Chrome 超關鍵：只在尺寸變動時才重設 canvas
  if (mkCanvas.width !== w || mkCanvas.height !== h) {
    mkCanvas.width  = w;
    mkCanvas.height = h;
    mkRawBuffer.width  = w;
    mkRawBuffer.height = h;
  }

  // 先把鏡頭畫到 buffer（鏡像）
  mkRawCtx.save();
  mkRawCtx.translate(w, 0);
  mkRawCtx.scale(-1, 1);
  mkRawCtx.drawImage(mkVideo, 0, 0, w, h);
  mkRawCtx.restore();

  mkCtx.clearRect(0, 0, w, h);
  mkCtx.drawImage(mkRawBuffer, 0, 0);

  if (!res.multiFaceLandmarks || !res.multiFaceLandmarks.length) return;
  const lm = res.multiFaceLandmarks[0];

  // 臉部大範圍
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

  // 粉底
  const fh = fw * (faceImg.height / faceImg.width);
  if (faceImg.complete && faceImg.width) {
    mkCtx.drawImage(faceImg, fx - fw / 2, fy - fh / 2 + 30, fw, fh);
  }

  // 嘴唇
  const lX = (1 - lm[61].x) * w;
  const rX = (1 - lm[291].x) * w;
  const tY = lm[13].y * h;
  const bY = lm[14].y * h;

  const lipCX = (lX + rX) / 2;
  const lipCY = ((tY + bY) / 2) + Math.abs(rX - lX) * LIP_Y_OFFSET;

  const lipRealW   = Math.abs(rX - lX);
  const lipTargetW = lipRealW * 16.1;

  if (!lw) {
    lx = lipCX; ly = lipCY; lw = lipTargetW;
  } else {
    lx += (lipCX - lx) * 0.25;
    ly += (lipCY - ly) * 0.25;
    lw += (lipTargetW - lw) * 0.25;
  }

  if (lipImg.complete && lipImg.width) {
    const lipH = lw * (lipImg.height / lipImg.width);
    mkCtx.drawImage(lipImg, lx - lw / 2, ly - lipH / 2, lw, lipH);
  }

  // 腮紅
  if (blushImg.complete && blushImg.width) {
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
  }

  // 眉毛
  if (browImg.complete && browImg.width) {
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

  // 眼影 / 眼線
  if (eyeImg.complete && eyeImg.width) {
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
  }
});

// ----------------------------------
// 濾鏡一 拍照（供 YA 手勢也使用）
// ----------------------------------
function takeMakeupPhoto() {
  console.log("📸 濾鏡一：開始擷取 mkCanvas 影像");

  const photo = mkCanvas.toDataURL("image/png");
  console.log("photo length =", photo.length);

  try {
    localStorage.setItem("capturedImage", photo);
  } catch (e) {
    console.warn("⚠️ 無法寫入 localStorage：", e);
  }

  if (uiPhotoFinish) uiPhotoFinish.src = photo;
  if (postImage)     postImage.src     = photo;

  if (filterSelectOverlay) filterSelectOverlay.style.display = "none";
  if (photoFinishOverlay)  photoFinishOverlay.style.display  = "flex";

  if (detectFinishOverlay) detectFinishOverlay.style.display = "none";
  if (ratingOverlay)       ratingOverlay.style.display       = "none";
  if (lowScoreOverlay)     lowScoreOverlay.style.display     = "none";

  overlayStep = 5;
  console.log("✅ 濾鏡一拍照完成 → 顯示 07 打卡畫面，overlayStep =", overlayStep);

  stopMakeupCamera();
}

function stopMakeupCamera() {
  if (mkCamera) {
    try {
      mkCamera.stop();
    } catch (e) {
      console.warn("stopMakeupCamera stop() 失敗：", e);
    }
    mkCamera = null;
  }

  if (mkVideo && mkVideo.srcObject) {
    mkVideo.srcObject.getTracks().forEach(t => t.stop());
    mkVideo.srcObject = null;
  }

  // ✅ 清 busy 狀態（避免下次啟動卡住）
  fmBusy = false;
  hdBusy = false;

  console.log("💄 stopMakeupCamera：濾鏡一鏡頭已關閉");
}