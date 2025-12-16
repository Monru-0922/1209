// ===============================
//   script.js (整理版)
//   Part 1: Intro → Enter → AR → Scan → 05 → 06
//   Part 4: Hands (👍👎 only for 06/08/09)
//   Part 5: 07 → 08 → 動畫2 → 文字濾鏡 → 07 → 09 → IG
//   ✅ 修：動畫2被蓋住 / 倒數被蓋住 or 被 stop
//   ✅ 倒數統一改看 overlayStep：4=美妝、7=文字
// ===============================


// ----------------------------------
// 0) 小工具：安全取 DOM
// ----------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);


// ----------------------------------
// 1) 9:16 scale
// ----------------------------------
function calculateScale() {
  const baseW = 1080;
  const baseH = 1920;
  const scaleX = window.innerWidth / baseW;
  const scaleY = window.innerHeight / baseH;
  const scale = Math.min(scaleX, scaleY);
  document.documentElement.style.setProperty("--scale-factor", scale);
}
calculateScale();
window.addEventListener("resize", calculateScale);


// ----------------------------------
// 2) DOM ELEMENTS
// ----------------------------------

// Root
const viewport = document.getElementById("ar-viewport");

// Intro 1
const introContainer = document.getElementById("intro-container");
const introVideo     = document.getElementById("intro-video");

// AR
const arScene       = document.getElementById("ar-scene");
const cameraOverlay = document.getElementById("camera-overlay");

// Scan
const scanOverlay   = document.getElementById("scan-overlay");
const scanCountdown = document.getElementById("scan-countdown");
const scanBar       = document.getElementById("scan-bar");
const scanBar2      = document.getElementById("scan-bar-2");
const scanBg        = document.getElementById("scan-bg");

// Frames
const frameMakeup = document.querySelector(".frame-makeup");
const frameText   = document.querySelector(".frame-text");

// 04 / 05 / 06
const detectFinishOverlay = document.getElementById("detect-finish-overlay");
const ratingOverlay       = document.getElementById("rating-overlay");
const lowScoreOverlay     = document.getElementById("low-score-overlay");
const btnLowOff           = document.getElementById("btn-off");
const btnLowNext          = document.getElementById("btn-next");

// Bottom nav (makeup)
const navImgs = document.querySelectorAll(".nav img");
const navBar  = document.querySelector("#mk-stage .nav");

// 07 / 08 / 09
const photoFinishOverlay = document.getElementById("photo-finish-overlay");
const uiPhotoFinish      = document.getElementById("ui-photo-finish");

const popup2Overlay   = document.getElementById("popup2-overlay");
const popup3Overlay   = document.getElementById("popup3-overlay");
const btnPopup2Off    = document.getElementById("btn-popup2-off");
const btnPopup2Next   = document.getElementById("btn-popup2-next");
const btnPopup3Off    = document.getElementById("btn-popup3-off");
const btnPopup3Next   = document.getElementById("btn-popup3-next");

// Intro 2
const intro2Container = document.getElementById("intro2-container");
const intro2Video     = document.getElementById("intro2-video");

// Filter UI
const filterSelectOverlay = document.getElementById("filter-select-overlay");
const filterVideo         = document.getElementById("filter-video");
const filterBg            = document.getElementById("filter-bg");
const faceOverlayEl       = document.getElementById("faceOverlay");

// Makeup stage elements (給 Hands 相機用)
const mkVideo  = document.getElementById("mk-video");
const mkCanvas = document.getElementById("mk-canvas");
const mkStage  = document.getElementById("mk-stage");

// IG
const postOverlay = document.getElementById("post-overlay");

// OFF flow
const photoOffOverlay = document.getElementById("photo-off-overlay");
const btnEndOff       = document.getElementById("btn-end-off");


// ----------------------------------
// 3) STATES
// ----------------------------------
let arStarted   = false;
let isScanning  = false;
let hasScanDone = false;

let filterPhase = 0;   // 1 = makeup, 2 = text（保留給你其他檔案用）
let isOffFlow   = false;
let overlayStep = 0;   // ✅ 重要：倒數只靠它判斷：4=美妝、7=文字

// overlayStep 建議對照：
// 2=05評分表, 3=06視窗, 4=美妝濾鏡, 5=07打卡, 6=08視窗, 7=文字濾鏡, 8=09視窗, 9=IG


// ----------------------------------
// 4) 倒數：統一置中大字（你指定的樣式）
//    ✅ 會自動建立 #mk-countdown，確保看得到
//    ✅ 只在 overlayStep === 4 或 7 顯示
// ----------------------------------
let mkCountdownEl = document.getElementById("mk-countdown");
let mkCountdownTimer = null;

function ensureCountdownEl() {
  if (mkCountdownEl) return;

  mkCountdownEl = document.createElement("div");
  mkCountdownEl.id = "mk-countdown";

  // 你指定的樣式（直接寫在 JS，避免 CSS 沒套到）
  mkCountdownEl.style.position = "absolute";
  mkCountdownEl.style.left = "50%";
  mkCountdownEl.style.top = "50%";
  mkCountdownEl.style.transform = "translate(-50%, -50%)";
  mkCountdownEl.style.fontSize = "180px";
  mkCountdownEl.style.fontWeight = "900";
  mkCountdownEl.style.color = "#ffffff";
  mkCountdownEl.style.textShadow = "0 0 12px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.9)";
  mkCountdownEl.style.letterSpacing = "10px";

  // ✅ 必須比所有 overlay 高，不然你會「以為沒顯示」
  mkCountdownEl.style.zIndex = "9999";
  mkCountdownEl.style.pointerEvents = "none";
  mkCountdownEl.style.display = "none";

  (viewport || document.body).appendChild(mkCountdownEl);
}

function stopCenterCountdown() {
  if (mkCountdownTimer) {
    clearInterval(mkCountdownTimer);
    mkCountdownTimer = null;
  }
  if (mkCountdownEl) mkCountdownEl.style.display = "none";
}

function startCenterCountdown(seconds, onDone) {
  ensureCountdownEl();
  stopCenterCountdown();

  let remain = Math.ceil(seconds);
  mkCountdownEl.textContent = remain;
  mkCountdownEl.style.display = "block";

  mkCountdownTimer = setInterval(() => {
    // ✅ 只在「美妝(4) 或 文字(7)」才允許顯示
    if (overlayStep !== 4 && overlayStep !== 7) {
      stopCenterCountdown();
      return;
    }

    remain--;
    if (remain <= 0) {
      mkCountdownEl.textContent = "0";
      stopCenterCountdown();

      // ✅ 倒數結束 callback
      if (typeof onDone === "function") onDone();
      return;
    }

    mkCountdownEl.textContent = remain;
  }, 1000);
}



window.startMakeupCountdown = (sec, cb) => startCenterCountdown(sec, cb);
window.stopMakeupCountdown  = () => stopCenterCountdown();



// ----------------------------------
// 5) 統一：隱藏所有 overlay（避免互蓋）
// ----------------------------------
function hideAllOverlays() {
  if (cameraOverlay)      cameraOverlay.style.display = "none";
  if (scanOverlay)        scanOverlay.style.display = "none";
  if (detectFinishOverlay)detectFinishOverlay.style.display = "none";
  if (ratingOverlay)      ratingOverlay.style.display = "none";
  if (lowScoreOverlay)    lowScoreOverlay.style.display = "none";

  if (filterSelectOverlay)filterSelectOverlay.style.display = "none";
  if (photoFinishOverlay) photoFinishOverlay.style.display = "none";
  if (photoOffOverlay)    photoOffOverlay.style.display = "none";
  if (popup2Overlay)      popup2Overlay.style.display = "none";
  if (popup3Overlay)      popup3Overlay.style.display = "none";
  if (postOverlay)        postOverlay.style.display = "none";
  if (intro2Container)    intro2Container.style.display = "none";
}


// ----------------------------------
// Audio unlock（放外面，只宣告一次）
// ----------------------------------
let audioUnlocked = false;

function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // ✅ 解鎖動畫2（intro2Video）的聲音
  if (!intro2Video) return;

  intro2Video.muted = true;
  const p = intro2Video.play();

  if (p && typeof p.then === "function") {
    p.then(() => {
      intro2Video.pause();
      intro2Video.currentTime = 0;
      intro2Video.muted = false;
    }).catch(() => {
      intro2Video.muted = false;
    });
  } else {
    // fallback
    try {
      intro2Video.pause();
      intro2Video.currentTime = 0;
      intro2Video.muted = false;
    } catch {}
  }
}


// ----------------------------------
// 6) Intro 1 (loop)
// ----------------------------------
function startIntroLoop() {
  if (!introVideo) return;
  introVideo.loop  = true;
  introVideo.muted = true;
  introVideo.currentTime = 0;

  if (introContainer) introContainer.style.display = "block";
  introVideo.play().catch(e => console.log("Intro loop fail", e));
}

// 播完整 Intro → 進 AR
function playFinalIntroThenEnterAR() {
  if (!introVideo) return;

  introVideo.loop  = false;
  introVideo.muted = false;
  introVideo.currentTime = 0;

  introVideo.play().catch(()=>{});

  introVideo.onended = () => {
    introVideo.onended = null;
    enterARMode();
  };
}

// Enter key：先解鎖音效 → 再進 AR
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();

  unlockAudioOnce(); // ✅ 一定要在「使用者手勢」裡

  if (!arStarted) playFinalIntroThenEnterAR();
});


// ----------------------------------
// 7) 進入 AR
// ----------------------------------
function enterARMode() {
  arStarted = true;

  if (introContainer) introContainer.style.display = "none";

  if (arScene) arScene.style.display = "block";
  if (cameraOverlay) cameraOverlay.style.display = "flex";

  setTimeout(() => startScanSequence(), 2000);
}


// ----------------------------------
// 8) 掃描流程：倒數 → 04 → 05 → 06
// ----------------------------------
function startScanSequence() {
  isScanning = true;
  if (scanOverlay) scanOverlay.style.display = "flex";

  let count = 5;
  if (scanCountdown) {
    scanCountdown.style.display = "block";
    scanCountdown.textContent = count;
  }

  const t = setInterval(() => {
    count--;
    if (count > 0) {
      if (scanCountdown) scanCountdown.textContent = count;
    } else {
      clearInterval(t);
      if (scanCountdown) scanCountdown.style.display = "none";
      startScanBarAnimation();
    }
  }, 1000);
}

function startScanBarAnimation() {
  if (detectFinishOverlay) detectFinishOverlay.style.display = "flex";

  if (scanOverlay) scanOverlay.style.display = "flex";
  if (scanBg) scanBg.style.display = "none";

  let pos1 = 20, dir1 = 1;
  let pos2 = 75, dir2 = -1;
  const start = Date.now();
  const DURATION = 5000;

  if (scanBar)  scanBar.style.opacity  = 1;
  if (scanBar2) scanBar2.style.opacity = 1;

  const timer = setInterval(() => {
    const elapsed = Date.now() - start;

    pos1 += dir1 * 0.8;
    if (pos1 >= 75) dir1 = -1;
    if (pos1 <= 20) dir1 = 1;

    pos2 += dir2 * 0.8;
    if (pos2 >= 75) dir2 = -1;
    if (pos2 <= 20) dir2 = 1;

    if (scanBar)  scanBar.style.top  = pos1 + "%";
    if (scanBar2) scanBar2.style.top = pos2 + "%";

    if (elapsed >= DURATION) {
      clearInterval(timer);

      if (scanOverlay)   scanOverlay.style.display   = "none";
      if (ratingOverlay) ratingOverlay.style.display = "flex";

      isScanning  = false;
      hasScanDone = true;
      overlayStep = 2;

      // 05 停留 8 秒 → 自動顯示 06
      setTimeout(() => {
        if (overlayStep === 2) {
          if (lowScoreOverlay) lowScoreOverlay.style.display = "flex";
          overlayStep = 3;
          startHandsCamera();
          console.log("⏱️ 評分表停留 8 秒，自動進入 06");
        }
      }, 8000);
    }
  }, 16);
}


// ----------------------------------
// 9) 06：OFF / NEXT
// ----------------------------------
function goLowScoreNext() {
  stopHandsCamera();
  if (lowScoreOverlay) lowScoreOverlay.style.display = "none";
  if (ratingOverlay)   ratingOverlay.style.display   = "none";
  if (cameraOverlay)   cameraOverlay.style.display   = "none";

  filterPhase = 1;
  overlayStep = 4;


 // ✅ 倒數 20 秒 → 結束就自動拍照 + 跳 07
 startCenterCountdown(20, () => {
  if (overlayStep !== 4) return;

  // 交給 makeup.js 做「截圖 + 顯示 07」
  if (typeof window.makeupAutoCapture === "function") {
    window.makeupAutoCapture();
  } else {
    console.warn("⚠️ makeupAutoCapture 尚未定義（請在 makeup.js 補上）");
  }
 });


  // ✅ 交給 makeup.js 開始真正濾鏡
  if (typeof startMakeupFilter === "function") {
    startMakeupFilter();
  } else if (typeof window.startMakeupFilter === "function") {
    window.startMakeupFilter();
  } else {
    console.warn("⚠️ startMakeupFilter 尚未定義（請確認 makeup.js 有載入）");
  }

  console.log("🟢 06 NEXT → 美妝濾鏡");
}

function goLowScoreOffTo07_2() {
  stopHandsCamera();

  if (lowScoreOverlay)     lowScoreOverlay.style.display     = "none";
  if (detectFinishOverlay) detectFinishOverlay.style.display = "none";

  if (photoOffOverlay) {
    photoOffOverlay.style.display = "flex";
    photoOffOverlay.style.zIndex  = "50";
  }

  isOffFlow   = true;
  overlayStep = 5;

  stopCenterCountdown();

  console.log("🟡 06 OFF → 07-2 覆蓋在 05 評分表上");
}

if (btnLowNext) btnLowNext.addEventListener("click", goLowScoreNext);
if (btnLowOff)  btnLowOff.addEventListener("click", goLowScoreOffTo07_2);


// ----------------------------------
// 10) Hands - 👍👎 only (06 / 08 / 09)
// ----------------------------------
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

let thumbUpFrames = 0;
let thumbDownFrames = 0;
let lastThumbAction = 0;

const THUMB_HOLD_NEED = 2;
const THUMB_COOLDOWN  = 1500;

function isThumbUp(lm) {
  const thumbTip = lm[4];
  const indexMcp = lm[5];
  return thumbTip.y < indexMcp.y - 0.02;
}
function isThumbDown(lm) {
  const thumbTip = lm[4];
  const indexMcp = lm[5];
  return thumbTip.y > indexMcp.y + 0.02;
}

function handleHandsResults(results) {
  if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
    thumbUpFrames = 0;
    thumbDownFrames = 0;
    return;
  }

  // ✅ 只在 06/08/09 使用 👍👎
  if (overlayStep !== 3 && overlayStep !== 6 && overlayStep !== 8) return;

  const lm = results.multiHandLandmarks[0];
  const now = performance.now();

  const up = isThumbUp(lm);
  const down = isThumbDown(lm);

  if (up) {
    thumbUpFrames++;
    thumbDownFrames = 0;
  } else if (down) {
    thumbDownFrames++;
    thumbUpFrames = 0;
  } else {
    thumbUpFrames = 0;
    thumbDownFrames = 0;
  }

  if (now - lastThumbAction <= THUMB_COOLDOWN) return;

  // 👍 YES / NEXT
  if (thumbUpFrames >= THUMB_HOLD_NEED) {
    lastThumbAction = now;
    thumbUpFrames = 0;
    thumbDownFrames = 0;

    console.log("👍 偵測到比讚，overlayStep =", overlayStep);

    if (overlayStep === 3) {
      goLowScoreNext();
    } else if (overlayStep === 6 && btnPopup2Next) {
      stopHandsCamera();
      overlayStep = 7;
      btnPopup2Next.click();
    } else if (overlayStep === 8 && btnPopup3Next) {
      stopHandsCamera();
      btnPopup3Next.click();
    }
    return;
  }

  // 👎 NO / OFF
  if (thumbDownFrames >= THUMB_HOLD_NEED) {
    lastThumbAction = now;
    thumbUpFrames = 0;
    thumbDownFrames = 0;

    console.log("👎 偵測到倒讚，overlayStep =", overlayStep);

    if (overlayStep === 3) {
      goLowScoreOffTo07_2();
    } else if (overlayStep === 6) {
      stopHandsCamera();
      if (popup2Overlay) popup2Overlay.style.display = "none";
      if (photoOffOverlay) {
        photoOffOverlay.style.display = "flex";
        photoOffOverlay.style.zIndex  = "50";
      }
      overlayStep = 5;
    } else if (overlayStep === 8) {
      stopHandsCamera();
      if (popup3Overlay) popup3Overlay.style.display = "none";
      if (photoFinishOverlay) photoFinishOverlay.style.display = "flex";
      if (photoOffOverlay) {
        photoOffOverlay.style.display = "flex";
        photoOffOverlay.style.zIndex  = "50";
      }
      overlayStep = 5;
    }
  }
}
hands.onResults(handleHandsResults);


// Hands camera（只用 mkVideo 當來源）
let handsCamera = null;
let handsCameraStarted = false;

function startHandsCamera() {
  if (handsCameraStarted) return;
  handsCameraStarted = true;

  if (!mkVideo) {
    console.warn("⚠️ 找不到 mkVideo，無法啟動 Hands 鏡頭");
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      mkVideo.srcObject = stream;

      handsCamera = new Camera(mkVideo, {
        onFrame: async () => {
          if (!mkVideo.videoWidth) return;
          await hands.send({ image: mkVideo });
        },
        width: 1080,
        height: 1920
      });

      handsCamera.start();
    })
    .catch(err => console.error("❌ startHandsCamera 失敗：", err));
}

function stopHandsCamera() {
  if (!handsCameraStarted) return;
  handsCameraStarted = false;

  if (handsCamera) {
    try { handsCamera.stop(); } catch {}
    handsCamera = null;
  }

  if (mkVideo && mkVideo.srcObject) {
    mkVideo.srcObject.getTracks().forEach(t => t.stop());
    mkVideo.srcObject = null;
  }
}


// ----------------------------------
// 11) Part 5 : 07 → 08 → 09 → IG
// ----------------------------------
function endExperience() {
  window.location.reload();
}

// 07：停 8 秒 → 自動跳
let autoFrom07Timer = null;

function runAutoFrom07() {
  if (autoFrom07Timer) clearTimeout(autoFrom07Timer);

  autoFrom07Timer = setTimeout(() => {
    console.log("⏱ 07 停留 8 秒，自動跳下一頁");

    if (isOffFlow) {
      endExperience();
      return;
    }

    if (filterPhase === 1) {
      if (popup2Overlay) popup2Overlay.style.display = "flex";
      overlayStep = 6;
      startHandsCamera();
      return;
    }

    if (filterPhase === 2) {
      if (popup3Overlay) popup3Overlay.style.display = "flex";
      overlayStep = 8;
      startHandsCamera();
      return;
    }
  }, 8000);
}

function stopAutoFrom07() {
  if (autoFrom07Timer) {
    clearTimeout(autoFrom07Timer);
    autoFrom07Timer = null;
  }
}

// 08：OFF
if (btnPopup2Off) {
  btnPopup2Off.addEventListener("click", () => {
    if (popup2Overlay) popup2Overlay.style.display = "none";
    if (photoOffOverlay) {
      photoOffOverlay.style.display = "flex";
      photoOffOverlay.style.zIndex  = "50";
    }
    overlayStep = 5;
  });
}

// 07-2：結束
if (btnEndOff) {
  btnEndOff.addEventListener("click", () => endExperience());
}


// ✅ 動畫2：保證在最上層顯示
function showIntro2ThenStartText() {
  stopCenterCountdown();        // 動畫2 不顯示倒數
  stopHandsCamera();            // 進入文字前先停手勢

  // 先關掉所有可能擋住的東西
  if (popup2Overlay) popup2Overlay.style.display = "none";
  if (photoFinishOverlay) photoFinishOverlay.style.display = "none";
  if (filterSelectOverlay) filterSelectOverlay.style.display = "none";

  if (!intro2Container || !intro2Video) {
    console.warn("⚠️ intro2Container / intro2Video 不存在");
    // 直接進文字濾鏡
    filterPhase = 2;
    overlayStep = 7;
    startCenterCountdown(10);
    if (typeof startTextFilter === "function") startTextFilter();
    else if (typeof window.startTextFilter === "function") window.startTextFilter();
    return;
  }

  // ✅ 強制顯示到最上層
  intro2Container.style.display = "flex";
  intro2Container.style.zIndex  = "9998";
  intro2Container.style.position = "fixed";
  intro2Container.style.left = "0";
  intro2Container.style.top  = "0";
  intro2Container.style.width = "100%";
  intro2Container.style.height = "100%";

  intro2Video.currentTime = 0;
  intro2Video.muted = false;
  intro2Video.volume = 1;

  const p = intro2Video.play();
  if (p && typeof p.catch === "function") {
    p.catch(err => console.error("待機動畫2 播放失敗：", err));
  }

  intro2Video.onended = () => {
    intro2Video.onended = null;
    intro2Container.style.display = "none";

    // 進入文字濾鏡
    filterPhase = 2;
    overlayStep = 7;

    // ✅ 文字濾鏡倒數 10 秒（你 textFilter.js 也會 setTimeout 拍照）
    startCenterCountdown(10);

    if (typeof startTextFilter === "function") {
      startTextFilter();
    } else if (typeof window.startTextFilter === "function") {
      window.startTextFilter();
    } else {
      console.warn("⚠️ startTextFilter 尚未定義（請確認 textFilter.js 有載入）");
    }
  };
}

// 08：NEXT → 動畫2 → 文字
if (btnPopup2Next) {
  btnPopup2Next.addEventListener("click", () => {
    console.log("▶ 08 NEXT → 動畫2 → 文字濾鏡");
    overlayStep = 7;
    showIntro2ThenStartText();
  });
}

// 09：OFF
if (btnPopup3Off) {
  btnPopup3Off.addEventListener("click", () => {
    if (popup3Overlay) popup3Overlay.style.display = "none";
    if (photoFinishOverlay) photoFinishOverlay.style.display = "flex";
    overlayStep = 10;
  });
}

// 09：NEXT → IG
if (btnPopup3Next) {
  btnPopup3Next.addEventListener("click", () => {
    if (popup3Overlay) popup3Overlay.style.display = "none";
    if (postOverlay) postOverlay.style.display = "flex";
    if (arScene) arScene.style.display = "none";

    stopCenterCountdown();
    stopHandsCamera();

    if (typeof initPostUI === "function") initPostUI();
    else if (typeof window.initPostUI === "function") window.initPostUI();

    overlayStep = 9;
  });
}


// ----------------------------------
// 12) DOMContentLoaded 初始化
// ----------------------------------
window.addEventListener("DOMContentLoaded", () => {
  hideAllOverlays();

  if (arScene) arScene.style.display = "none";

  // 監聽 07 出現 → 8 秒自動跳
  if (photoFinishOverlay) {
    const obs = new MutationObserver(() => {
      const visible = window.getComputedStyle(photoFinishOverlay).display !== "none";
      if (visible) {
        overlayStep = 5;
        runAutoFrom07();
      } else {
        stopAutoFrom07();
      }
    });
    obs.observe(photoFinishOverlay, { attributes: true, attributeFilter: ["style", "class"] });
  }

  // 開場動畫
  if (introContainer) {
    introContainer.style.display = "block";
    startIntroLoop();
  }

  // 確保倒數元素存在（避免你說「怎麼都沒出現」）
  ensureCountdownEl();

  console.log("✅ script.js 初始化完成");
});

