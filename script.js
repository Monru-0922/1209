// ===============================
//   AR INTERACTION FLOW CONTROL
//   Part 1: Intro → Enter → AR → Scan → 05 → 06
// ===============================

// --- 1. 9:16 scale ---
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
// DOM ELEMENTS
// ----------------------------------

// Intro
const introContainer = document.getElementById("intro-container");
const introVideo     = document.getElementById("intro-video");

// AR scene
const arScene        = document.getElementById("ar-scene");
const cameraOverlay  = document.getElementById("camera-overlay");

// Scan
const scanOverlay    = document.getElementById("scan-overlay");
const scanCountdown  = document.getElementById("scan-countdown");
const scanBar        = document.getElementById("scan-bar");
const scanBar2       = document.getElementById("scan-bar-2");
const scanBg         = document.getElementById("scan-bg");

// 濾鏡用框
const frameMakeup = document.querySelector(".frame-makeup"); // imge/frame.png
const frameText   = document.querySelector(".frame-text");   // image/frame2.png

// 04 / 05 / 06
const detectFinishOverlay = document.getElementById("detect-finish-overlay");
const ratingOverlay       = document.getElementById("rating-overlay");
const lowScoreOverlay     = document.getElementById("low-score-overlay");
const btnScoreDone        = document.getElementById("btn-score-done");
const btnLowOff           = document.getElementById("btn-off");
const btnLowNext          = document.getElementById("btn-next");

/* ✅ 底下五顆圈圈 img（美妝濾鏡用） */
const navImgs = document.querySelectorAll(".nav img");
const navBar  = document.querySelector("#mk-stage .nav");

// 07 / 08 / 09
const photoFinishOverlay = document.getElementById("photo-finish-overlay");
const uiPhotoFinish      = document.getElementById("ui-photo-finish");
const btnContinue        = document.getElementById("btn-continue");

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
const filtersWrapper      = document.querySelector("#filter-select-overlay .filters-wrapper");
const filterPhone         = document.querySelector("#filter-select-overlay .phone");
const btnTakePhoto        = document.getElementById("btn-take-photo");

// Makeup Canvas
const mkVideo  = document.getElementById("mk-video");
const mkCanvas = document.getElementById("mk-canvas");
const mkStage  = document.getElementById("mk-stage");

// IG
const postOverlay   = document.getElementById("post-overlay");
const postImage     = document.getElementById("postImage");
const btnEndPost    = document.getElementById("btn-end-post");
const btnEnd        = document.getElementById("btn-end");

// 額外 DOM（Part 5）
const photoOffOverlay = document.getElementById("photo-off-overlay");
const btnEndOff       = document.getElementById("btn-end-off");
const btnEndPostIg    = document.getElementById("btn-end-post-ig");
const btnEndPostOuter = document.getElementById("btn-end-post");

// ----------------------------------
// STATES
// ----------------------------------
let arStarted     = false;
let isScanning    = false;
let hasScanDone   = false;
let filterPhase   = 0;  // 1 = makeup, 2 = text
let isOffFlow     = false;
let overlayStep   = 0;

let gestureEnabled = false; // 手勢 flag

// ----------------------------------
// Intro Loop (第一次進頁面)
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
  introVideo.loop  = false;
  introVideo.muted = false;
  introVideo.currentTime = 0;

  introVideo.play();

  introVideo.onended = () => {
    introVideo.onended = null;
    enterARMode();
  };
}

// Enter key：進 AR
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();

  if (!arStarted) {
    playFinalIntroThenEnterAR();
  }
});

// 進入 AR
function enterARMode() {
  arStarted = true;

  introContainer.style.display = "none";

  arScene.style.display = "block";
  cameraOverlay.style.display = "flex";

  setTimeout(() => {
    startScanSequence();
  }, 2000);
}

// ----------------------------------
// 掃描流程：倒數 → 04 → 05
// ----------------------------------
function startScanSequence() {
  isScanning = true;
  scanOverlay.style.display = "flex";

  let count = 5;
  scanCountdown.textContent = count;

  let t = setInterval(() => {
    count--;
    if (count > 0) {
      scanCountdown.textContent = count;
    } else {
      clearInterval(t);
      scanCountdown.style.display = "none";
      startScanBarAnimation();
    }
  }, 1000);
}

function startScanBarAnimation() {
  // 顯示「正在生成評分表」畫面
  detectFinishOverlay.style.display = "flex";

  // 掃描橫桿動畫
  scanOverlay.style.display = "flex";
  scanBg.style.display = "none";

  let pos1 = 20, dir1 = 1;
  let pos2 = 75, dir2 = -1;
  const start = Date.now();
  const DURATION = 5000; // 掃描時間 5 秒

  scanBar.style.opacity  = 1;
  scanBar2.style.opacity = 1;

  let timer = setInterval(() => {
    const elapsed = Date.now() - start;

    // 第一條橫桿
    pos1 += dir1 * 0.8;
    if (pos1 >= 75) dir1 = -1;
    if (pos1 <= 20) dir1 = 1;

    // 第二條橫桿
    pos2 += dir2 * 0.8;
    if (pos2 >= 75) dir2 = -1;
    if (pos2 <= 20) dir2 = 1;

    scanBar.style.top  = pos1 + "%";
    scanBar2.style.top = pos2 + "%";

    // 掃描時間到了
    if (elapsed >= DURATION) {
      clearInterval(timer);

      // 關閉掃描畫面 → 顯示評分表
      scanOverlay.style.display   = "none";
      ratingOverlay.style.display = "flex";

      isScanning  = false;
      hasScanDone = true;
      overlayStep = 2;  // 現在在 05 評分表畫面

      // ⭐ 評分表停留 8 秒後，自動跳 06（覆蓋在上面）
      setTimeout(() => {
        // 確認還停在評分表階段才跳
        if (overlayStep === 2) {
          lowScoreOverlay.style.display = "flex"; // 顯示 06 視窗（蓋在評分表上）
          overlayStep = 3;
          startHandsCamera(); // 啟動手勢，讓 👍 / 👎 可以用
          console.log("⏱️ 評分表停留 8 秒，自動進入 06");
        }
      }, 8000);
    }
  }, 16);
}

// ----------------------------------
// 05 → 06
// ----------------------------------
if (btnScoreDone) {
  btnScoreDone.addEventListener("click", () => {
    lowScoreOverlay.style.display = "flex";
    overlayStep = 3;
    startHandsCamera();
  });
}

// 06 ：OFF / NEXT 共用函式
function goLowScoreNext() {
  stopHandsCamera();
  lowScoreOverlay.style.display = "none";
  ratingOverlay.style.display   = "none";
  cameraOverlay.style.display   = "none";

  filterPhase = 1;   // 第一輪：美妝
  overlayStep = 4;

  startMakeupFilter();
  console.log("🟢 06 NEXT → 美妝濾鏡");
}

function goLowScoreOffTo07_2() {
  stopHandsCamera();
  if (lowScoreOverlay)      lowScoreOverlay.style.display      = "none";
  if (detectFinishOverlay)  detectFinishOverlay.style.display  = "none";

  if (photoOffOverlay) {
    photoOffOverlay.style.display = "flex";
    photoOffOverlay.style.zIndex  = "40";
  }

  isOffFlow   = true;
  overlayStep = 5;

  console.log("🟡 06 OFF → 07-2 覆蓋在 05 評分表上");
}

if (btnLowNext) {
  btnLowNext.addEventListener("click", goLowScoreNext);
}
if (btnLowOff) {
  btnLowOff.addEventListener("click", goLowScoreOffTo07_2);
}

// ===============================
//   Part 4 : Hands - 模型初始化 + 手勢邏輯
// ===============================
const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

// ---------- Swipe / YA / 👍 👎 狀態 ----------
let swipeStartX    = null;
let swipeStartTime = 0;
let lastSwipeTime  = 0;

const SWIPE_MIN_DISTANCE = 0.06;
const SWIPE_MAX_DURATION = 800;
const SWIPE_COOLDOWN     = 700;

// YA 拍照
let yaHoldFrames   = 0;
let lastShotTime   = 0;
const YA_HOLD_NEED     = 8;
const YA_SHOT_COOLDOWN = 2000;

// 👍 / 👎
let thumbUpFrames   = 0;
let thumbDownFrames = 0;
let lastThumbAction = 0;
const THUMB_HOLD_NEED = 2;
const THUMB_COOLDOWN  = 1500;

// ---------- 姿勢判斷 ----------
function isYAGesture(lm) {
  const indexTip   = lm[8];
  const indexPip   = lm[6];
  const middleTip  = lm[12];
  const middlePip  = lm[10];
  const ringTip    = lm[16];
  const ringPip    = lm[14];
  const pinkyTip   = lm[20];
  const pinkyPip   = lm[18];

  const isIndexUp  = indexTip.y  < indexPip.y  - 0.04;
  const isMiddleUp = middleTip.y < middlePip.y - 0.04;
  const isRingFold = ringTip.y   > ringPip.y   - 0.01;
  const isPinkyFold= pinkyTip.y  > pinkyPip.y  - 0.01;

  const dx = indexTip.x - middleTip.x;
  const dy = indexTip.y - middleTip.y;
  const dist = Math.hypot(dx, dy);
  const isVSpace = dist > 0.06;

  return isIndexUp && isMiddleUp && isRingFold && isPinkyFold && isVSpace;
}

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

// ---------- 手勢結果處理 ----------
function handleHandsResults(results) {
  if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
    swipeStartX     = null;
    yaHoldFrames    = 0;
    thumbUpFrames   = 0;
    thumbDownFrames = 0;
    return;
  }

  const lm  = results.multiHandLandmarks[0];
  const now = performance.now();

  // ===============================
  //  06 / 08 / 09 頁面：用 👍 / 👎
  //   06：overlayStep === 3
  //   08：overlayStep === 6
  //   09：overlayStep === 8
  // ===============================
  if (overlayStep === 3 || overlayStep === 6 || overlayStep === 8) {
    const up   = isThumbUp(lm);
    const down = isThumbDown(lm);

    if (up) {
      thumbUpFrames++;
      thumbDownFrames = 0;
    } else if (down) {
      thumbDownFrames++;
      thumbUpFrames = 0;
    } else {
      thumbUpFrames   = 0;
      thumbDownFrames = 0;
    }

    if (now - lastThumbAction > THUMB_COOLDOWN) {
      // 👍 YES / NEXT
      if (thumbUpFrames >= THUMB_HOLD_NEED) {
        lastThumbAction = now;
        thumbUpFrames   = 0;
        thumbDownFrames = 0;

        console.log("👍 偵測到比讚，overlayStep =", overlayStep);

        if (overlayStep === 3) {
          // 06 NEXT → 美妝濾鏡
          if (typeof goLowScoreNext === "function") {
            goLowScoreNext();
          } else if (btnLowNext) {
            btnLowNext.click();
          }

        } else if (overlayStep === 6 && btnPopup2Next) {
          // 08 NEXT → 動畫2 / 濾鏡二
          stopHandsCamera();
          overlayStep = 7;
          btnPopup2Next.click();

        } else if (overlayStep === 8 && btnPopup3Next) {
          // 09 NEXT → IG 頁面
          stopHandsCamera();
          btnPopup3Next.click();
        }

        return;
      }

      // 👎 NO / OFF
      if (thumbDownFrames >= THUMB_HOLD_NEED) {
        lastThumbAction = now;
        thumbUpFrames   = 0;
        thumbDownFrames = 0;

        console.log("👎 偵測到倒讚，overlayStep =", overlayStep);

        if (overlayStep === 3) {
          // 06 OFF → 07-2 OFF 結束體驗路線
          if (typeof goLowScoreOffTo07_2 === "function") {
            goLowScoreOffTo07_2();
          } else if (btnLowOff) {
            btnLowOff.click();
          }

        } else if (overlayStep === 6) {
          // 👎 08 OFF → 07-2 覆蓋在濾鏡一拍照畫面上
          console.log("👎 08 OFF → 07-2 覆蓋在濾鏡一拍照畫面上");

          stopHandsCamera();

          if (popup2Overlay) popup2Overlay.style.display = "none";

          if (photoOffOverlay) {
            photoOffOverlay.style.display = "flex";
            photoOffOverlay.style.zIndex  = "50";
          }

          overlayStep = 5;
          return;

        } else if (overlayStep === 8) {
          // 👎 09 OFF → 07-2 覆蓋在 07 打卡畫面上
          console.log("👎 09 OFF → 07-2 覆蓋在 07 打卡畫面上");

          stopHandsCamera();

          if (popup3Overlay) popup3Overlay.style.display = "none";

          if (photoFinishOverlay) {
            photoFinishOverlay.style.display = "flex";
          }

          if (photoOffOverlay) {
            photoOffOverlay.style.display = "flex";
            photoOffOverlay.style.zIndex  = "50";
          }

          overlayStep = 5;
          return;
        }

        return;
      }
    }

    // 在 06 / 08 / 09 頁面時，不用再做 YA / 揮動
    return;
  }

  // ===============================
  //  濾鏡階段：
  //   filterPhase = 1 → 美妝濾鏡（揮動 + YA）
  //   filterPhase = 2 → 文字濾鏡（只要 YA 拍照）
  // ===============================
  if (filterPhase !== 1 && filterPhase !== 2) {
    swipeStartX  = null;
    yaHoldFrames = 0;
    return;
  }

  const wrist = lm[0];

  // ------ Swipe 揮動換濾鏡（只在濾鏡一啟用） ------
  if (filterPhase === 1) {
    if (swipeStartX === null) {
      swipeStartX    = wrist.x;
      swipeStartTime = now;
    } else {
      const dx = wrist.x - swipeStartX;
      const dt = now - swipeStartTime;

      if ((now - lastSwipeTime) >= SWIPE_COOLDOWN) {
        if (dt <= SWIPE_MAX_DURATION && Math.abs(dx) > SWIPE_MIN_DISTANCE) {
          if (dx > 0) {
            changeMakeupStyle(+1);
            console.log("👉 揮動：下一個濾鏡");
          } else {
            changeMakeupStyle(-1);
            console.log("👈 揮動：上一個濾鏡");
          }

          lastSwipeTime  = now;
          swipeStartX    = null;
          swipeStartTime = now;
        }

        if (dt > SWIPE_MAX_DURATION) {
          swipeStartX    = wrist.x;
          swipeStartTime = now;
        }
      }
    }
  } else {
    // 濾鏡二不需要 swipe
    swipeStartX = null;
  }

  // ------ YA 拍照（濾鏡一 + 濾鏡二 共用） ------
  if (isYAGesture(lm)) {
    yaHoldFrames++;
  } else {
    yaHoldFrames = 0;
  }

  if (
    yaHoldFrames >= YA_HOLD_NEED &&
    (now - lastShotTime) > YA_SHOT_COOLDOWN
  ) {
    lastShotTime = now;
    yaHoldFrames = 0;

    console.log("✌️ YA 拍照，filterPhase =", filterPhase);

    if (filterPhase === 1) {
      takeMakeupPhoto();   // 濾鏡一：美妝 → 07
    } else if (filterPhase === 2) {
      takeTextPhoto();     // 濾鏡二：文字 → 07
    }
  }
}

// Hands 綁上結果處理（一定要在函式定義後）
hands.onResults(handleHandsResults);

// ===============================
//  啟動 / 停止 Hands 專用 Camera
// ===============================
let handsCamera        = null;
let handsCameraStarted = false;

function startHandsCamera() {
  if (handsCameraStarted) {
    console.log("✋ startHandsCamera 已啟動，略過");
    return;
  }
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
          await hands.send({ image: mkVideo });   // 只送給 Hands
        },
        width: 1080,
        height: 1920
      });

      handsCamera.start();
      console.log("✅ startHandsCamera 啟動完成");
    })
    .catch(err => {
      console.error("❌ startHandsCamera 失敗：", err);
    });
}

function stopHandsCamera() {
  if (!handsCameraStarted) return;
  handsCameraStarted = false;

  if (handsCamera) {
    try {
      handsCamera.stop();
    } catch (e) {
      console.warn("stopHandsCamera stop() 失敗：", e);
    }
    handsCamera = null;
  }

  if (mkVideo && mkVideo.srcObject) {
    mkVideo.srcObject.getTracks().forEach(t => t.stop());
    mkVideo.srcObject = null;
  }

  console.log("✋ stopHandsCamera 已停止");
}

// ===============================
//   Part 5 : 07 → 08 → 09 → IG & 結束體驗
// ===============================

// 統一結束體驗：重新整理頁面
function endExperience() {
  console.log("🔁 結束體驗 → 重新整理頁面");
  window.location.reload();
}

// 07：靜待 8 秒 → 自動跳下一頁（不顯示倒數）
let autoFrom07Timer = null;

function runAutoFrom07() {
  if (autoFrom07Timer) clearTimeout(autoFrom07Timer);

  autoFrom07Timer = setTimeout(() => {
    console.log("⏱ 07 停留 8 秒，自動跳下一頁");

    // OFF 路線：結束體驗
    if (isOffFlow) {
      endExperience();
      return;
    }

    // 第一輪濾鏡 → 自動跳 08
    if (filterPhase === 1) {
      if (popup2Overlay) popup2Overlay.style.display = "flex";
      overlayStep = 6;
      startHandsCamera();
      return;
    }

    // 第二輪濾鏡 → 自動跳 09
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

// 08 跳出視窗2：OFF / NEXT
if (btnPopup2Off) {
  btnPopup2Off.addEventListener("click", () => {
    console.log("🟡 按鈕：08 OFF → 07-2 覆蓋在 07 上");

    if (popup2Overlay) popup2Overlay.style.display = "none";

    if (photoOffOverlay) {
      photoOffOverlay.style.display = "flex";
      photoOffOverlay.style.zIndex  = "50";
    }

    overlayStep = 5;
  });
}

if (btnEndOff && photoOffOverlay) {
  btnEndOff.addEventListener("click", () => {
    console.log("⏹ 07-2 OFF 結束體驗");
    endExperience();
  });
}

// 08 NEXT → 動畫2 → 濾鏡二
if (btnPopup2Next) {
  btnPopup2Next.addEventListener("click", () => {
    console.log("▶ 08 NEXT → 播放待機動畫2 → 濾鏡二（文字）");

    popup2Overlay.style.display     = "none";
    photoFinishOverlay.style.display = "none";

    if (intro2Container && intro2Video) {
      intro2Container.style.display = "flex";
      intro2Video.currentTime = 0;

      intro2Video.play().catch(err => {
        console.error("待機動畫2 播放失敗：", err);
      });

      intro2Video.onended = () => {
        intro2Video.onended = null;
        intro2Container.style.display = "none";

        filterPhase = 2;
        overlayStep = 7;

        if (typeof startTextFilter === "function") {
          startTextFilter();
        } else if (typeof window !== "undefined" && typeof window.startTextFilter === "function") {
          window.startTextFilter();
        } else {
          console.warn("⚠️ startTextFilter 尚未定義，請確認 textFilter.js 是否有載入成功");
        }
      };
    } else {
      filterPhase = 2;
      overlayStep = 7;

      if (typeof startTextFilter === "function") {
        startTextFilter();
      } else if (typeof window !== "undefined" && typeof window.startTextFilter === "function") {
        window.startTextFilter();
      } else {
        console.warn("⚠️ startTextFilter 尚未定義，請確認 textFilter.js 是否有載入成功");
      }
    }
  });
}

// 09 跳出視窗3：OFF / NEXT → IG
if (btnPopup3Off) {
  btnPopup3Off.addEventListener("click", () => {
    console.log("🟡 09 OFF → 回到 07 打卡畫面 / OFF 流程");

    popup3Overlay.style.display = "none";

    if (photoFinishOverlay) {
      photoFinishOverlay.style.display = "flex";
    }

    overlayStep = 10;
  });
}

if (btnPopup3Next) {
  btnPopup3Next.addEventListener("click", () => {
    console.log("🟢 09 NEXT → 進入 IG 發文頁");

    popup3Overlay.style.display = "none";

    if (postOverlay) {
      postOverlay.style.display = "flex";
    }
    if (arScene) {
      arScene.style.display = "none";
    }

    initPostUI();
    overlayStep = 9;
  });
}

// ===============================
//   DOMContentLoaded：初始顯示狀態
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  if (arScene)            arScene.style.display            = "none";
  if (cameraOverlay)      cameraOverlay.style.display      = "none";
  if (scanOverlay)        scanOverlay.style.display        = "none";
  if (detectFinishOverlay)detectFinishOverlay.style.display= "none";
  if (ratingOverlay)      ratingOverlay.style.display      = "none";
  if (lowScoreOverlay)    lowScoreOverlay.style.display    = "none";
  if (filterSelectOverlay)filterSelectOverlay.style.display= "none";
  if (photoFinishOverlay) photoFinishOverlay.style.display = "none";
  if (photoOffOverlay)    photoOffOverlay.style.display    = "none";
  if (popup2Overlay)      popup2Overlay.style.display      = "none";
  if (popup3Overlay)      popup3Overlay.style.display      = "none";
  if (postOverlay)        postOverlay.style.display        = "none";
  if (intro2Container)    intro2Container.style.display    = "none";

  // 隱藏 07 的「繼續體驗」按鈕
  if (btnContinue) btnContinue.style.display = "none";

  // 偵測 07 何時出現 → 啟動 / 停止 8 秒計時
  if (photoFinishOverlay) {
    const obs = new MutationObserver(() => {
      const visible = window.getComputedStyle(photoFinishOverlay).display !== "none";
      if (visible) {
        console.log("📸 07 顯示 → 啟動 8 秒自動跳轉");
        runAutoFrom07();
      } else {
        stopAutoFrom07();
      }
    });

    obs.observe(photoFinishOverlay, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });
  }

  // 開場動畫 1
  if (introContainer) {
    introContainer.style.display = "block";
    startIntroLoop();
  }

  console.log("✅ DOMContentLoaded：初始化完成，待機動畫開始");
});
