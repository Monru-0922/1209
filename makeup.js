// ===============================
//   Part 2 : Makeup Filter (FaceMesh)
//   Enter 切換濾鏡
//   20 秒倒數 → 自動拍照
//   腮紅 / 眼影保留，眉毛移除
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
// 倒數顯示（美妝 + 文字 共用）
// ===============================
const mkCountdownEl = document.getElementById("mk-countdown");
let mkCountdownTimer = null;

function startMakeupCountdown(seconds) {
  if (!mkCountdownEl) return;

  stopMakeupCountdown();

  let remain = Math.ceil(seconds);
  mkCountdownEl.textContent = remain;
  mkCountdownEl.style.display = "block";

  mkCountdownTimer = setInterval(() => {
    // ✅ 只要在任何濾鏡階段就顯示
    // filterPhase: 1 = 美妝, 2 = 文字
    if (filterPhase !== 1 && filterPhase !== 2) {
      stopMakeupCountdown();
      return;
    }

    remain--;
    if (remain <= 0) {
      mkCountdownEl.textContent = "0";
      stopMakeupCountdown();
      return;
    }

    mkCountdownEl.textContent = remain;
  }, 1000);
}

function stopMakeupCountdown() {
  if (mkCountdownTimer) {
    clearInterval(mkCountdownTimer);
    mkCountdownTimer = null;
  }
  if (mkCountdownEl) mkCountdownEl.style.display = "none";
}

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

  // ✅ 啟動倒數
  startMakeupCountdown(AUTO_SHOT_MS / 1000);

  // ✅ 自動拍照
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
          await faceMesh.send({ image: mkVideo });
          fmBusy = false;
        },
        width: 1080,
        height: 1920
      });
      mkCamera.start();
    });
}


// ===============================
// FaceMesh 畫妝
// ===============================
let fx=0, fy=0, fw=0, lx=0, ly=0, lw=0;
const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});
faceMesh.setOptions({ maxNumFaces:1, refineLandmarks:true });

faceMesh.onResults(res => {
  if (!mkVideo.videoWidth || !res.multiFaceLandmarks?.length) return;

  const w = mkVideo.videoWidth;
  const h = mkVideo.videoHeight;

  mkCanvas.width = mkRawBuffer.width = w;
  mkCanvas.height = mkRawBuffer.height = h;

  mkRawCtx.save();
  mkRawCtx.translate(w,0);
  mkRawCtx.scale(-1,1);
  mkRawCtx.drawImage(mkVideo,0,0,w,h);
  mkRawCtx.restore();

  mkCtx.clearRect(0,0,w,h);
  mkCtx.drawImage(mkRawBuffer,0,0);

  const lm = res.multiFaceLandmarks[0];
  const L = (1-lm[234].x)*w;
  const R = (1-lm[454].x)*w;
  const cx = (L+R)/2;
  const cy = (lm[10].y*h + lm[152].y*h)/2;
  const faceW = Math.abs(R-L)*4.5;

  fx += (cx-fx)*0.25;
  fy += (cy-fy)*0.25;
  fw += (faceW-fw)*0.25;

  mkCtx.drawImage(faceImg, fx-fw/2, fy-fw/2+30, fw, fw);

  const lX=(1-lm[61].x)*w, rX=(1-lm[291].x)*w;
  const lipW=Math.abs(rX-lX)*16.1;
  lx += ((lX+rX)/2-lx)*0.25;
  ly += ((lm[13].y*h+lm[14].y*h)/2-ly)*0.25;
  lw += (lipW-lw)*0.25;

  mkCtx.drawImage(lipImg, lx-lw/2, ly-lw/2, lw, lw);

  const blushSize = fw*0.9;
  mkCtx.globalAlpha=0.85;
  mkCtx.drawImage(blushImg,(1-lm[234].x)*w-blushSize/2-60,lm[250].y*h-blushSize/2+8,blushSize,blushSize);
  mkCtx.drawImage(blushImg,(1-lm[454].x)*w-blushSize/2-44,lm[454].y*h-blushSize/2+35,blushSize,blushSize);
  mkCtx.globalAlpha=1;
});


// ===============================
// 拍照
// ===============================
function takeMakeupPhoto() {
  const photo = mkCanvas.toDataURL("image/png");
  localStorage.setItem("capturedImage", photo);

  uiPhotoFinish.src = photo;
  postImage.src = photo;
  photoFinishOverlay.style.display = "flex";

  isInMakeupMode = false;
  stopMakeupCountdown();
  clearTimeout(autoShotTimer);
  stopMakeupCamera();
}


// ===============================
// 關閉鏡頭
// ===============================
function stopMakeupCamera() {
  if (mkCamera) mkCamera.stop();
  mkCamera = null;

  if (mkVideo.srcObject) {
    mkVideo.srcObject.getTracks().forEach(t=>t.stop());
    mkVideo.srcObject=null;
  }
}