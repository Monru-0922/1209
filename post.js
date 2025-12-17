
// ===============================
//   IG 發文頁：按讚 / 留言 / 結束體驗
// ===============================
function initPostUI() {
  if (postUIInited) return;
  postUIInited = true;

  const likeBtn      = document.getElementById("likeBtn");
  const likesCountEl = document.getElementById("likesCount");
  const commentInput = document.getElementById("commentInput");
  const commentSend  = document.getElementById("commentSendBtn");
  const commentsList = document.getElementById("commentsList");
  const glitchEl     = document.getElementById("glitchScore");

 if (!postImage) {
  console.warn("⚠️ 找不到 postImage（#postImage），IG 圖片無法顯示");
  // 不 return：留言仍要能用
 }
if (!likeBtn || !likesCountEl) {
  console.warn("⚠️ likeBtn/likesCount 缺少，按讚功能略過，但留言仍可用");
}
  // 讀取剛剛存的照片（美妝 or 文字濾鏡）
  const imgData = localStorage.getItem("capturedImage");
  if (imgData) {
    postImage.src = imgData;
  } else {
    // 如果沒有，就用一張預設圖
    postImage.src = "image/評分-08.png";
  }

  // ❤️ 按讚數
  let liked = false;
  let likes = 0;

  function updateLikes() {
    likesCountEl.textContent = `${likes} likes`;
  }

  function toggleLike() {
    liked = !liked;
    likeBtn.textContent = liked ? "❤️" : "♡";
    likes += liked ? 1 : -1;
    if (likes < 0) likes = 0;
    updateLikes();
  }

  likeBtn.addEventListener("click", toggleLike);

  // 雙擊圖片也按讚
  postImage.addEventListener("dblclick", () => {
    if (!liked) toggleLike();
  });

  updateLikes();

  // 💬 留言
  function postComment() {
    if (!commentInput || !commentsList) return;
    const text = commentInput.value.trim();
    if (!text) return;

    const p = document.createElement("p");
    p.innerHTML = `<strong>MODEL：</strong> ${text}`;
    commentsList.prepend(p);

    commentInput.value = "";
  }

  if (commentSend) {
    commentSend.addEventListener("click", postComment);
  }

  if (commentInput) {
    commentInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        postComment();
      }
    });
  }

  // 當機特效分數 Glitch
  if (glitchEl) {
    let glitchStarted = true;

    function randomGlitch() {
      if (!glitchStarted) return;

      glitchEl.style.opacity = "1";
      setTimeout(() => {
        glitchEl.style.opacity = "0";
      }, 120 + Math.random() * 200);

      setTimeout(randomGlitch, 600 + Math.random() * 1200);
    }

    randomGlitch();
  }

  // IG 頁面裡的「結束體驗」按鈕
  if (btnEndPostIg) {
    btnEndPostIg.addEventListener("click", () => {
      console.log("⏹ IG 手機框內 結束體驗");
      endExperience();
    });
  }

  // 外層那顆「結束體驗」按鈕
  if (btnEndPostOuter) {
    btnEndPostOuter.addEventListener("click", () => {
      console.log("⏹ IG 外層 結束體驗");
      endExperience();
    });
  }
}
// ✅ 放在檔案最上面或 initPostUI 外面
let postUIInited = false;

window.initPostUI = function initPostUI() {
  if (postUIInited) return;
  postUIInited = true;

  const postImage    = document.getElementById("postImage");
  const likeBtn      = document.getElementById("likeBtn");
  const likesCountEl = document.getElementById("likesCount");
  const commentInput = document.getElementById("commentInput");
  const commentSend  = document.getElementById("commentSendBtn");
  const commentsList = document.getElementById("commentsList");
  const glitchEl     = document.getElementById("glitchScore");

  // 你如果有兩顆結束體驗按鈕，請把 ID 改成你實際用的
  const btnEndPostIg    = document.getElementById("btn-end-post-ig") || document.querySelector(".btn-end-ig");
  const btnEndPostOuter = document.getElementById("btn-end-post") || document.getElementById("btn-end-post-outer");

  // --- 讀取剛剛存的照片 ---
  if (!postImage) {
    console.warn("⚠️ 找不到 postImage（#postImage），IG 圖片無法顯示");
  } else {
    const imgData = localStorage.getItem("capturedImage");
    postImage.src = imgData ? imgData : "image/評分-08.png";
  }

  // --- ❤️ 按讚 ---
  let liked = false;
  let likes = 0;

  function updateLikes() {
    if (!likesCountEl) return;
    likesCountEl.textContent = `${likes} likes`;
  }

  function toggleLike() {
    if (!likeBtn) return;
    liked = !liked;
    likeBtn.textContent = liked ? "❤️" : "♡";
    likeBtn.style.color = liked ? "#ff2d2d" : "#ffffff";
    likes += liked ? 1 : -1;
    if (likes < 0) likes = 0;
    updateLikes();
  }

  if (!likeBtn || !likesCountEl) {
    console.warn("⚠️ likeBtn/likesCount 缺少，按讚功能略過");
  } else {
    likeBtn.addEventListener("click", toggleLike);
    updateLikes();
  }

  // 雙擊圖片也按讚
  if (postImage) {
    postImage.addEventListener("dblclick", () => {
      if (!liked) toggleLike();
    });
  }

  // --- 💬 留言 ---
  function postComment() {
    if (!commentInput || !commentsList) return;
    const text = commentInput.value.trim();
    if (!text) return;

    const p = document.createElement("p");
    p.innerHTML = `<strong>MODEL：</strong> ${text}`;
    commentsList.prepend(p);

    commentInput.value = "";
  }

  if (!commentInput || !commentSend || !commentsList) {
    console.warn("⚠️ commentInput/commentSend/commentsList 缺少，留言功能略過");
  } else {
    commentSend.addEventListener("click", postComment);
    commentInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        postComment();
      }
    });
  }

  // --- 結束體驗 ---
  if (btnEndPostIg) {
    btnEndPostIg.addEventListener("click", () => {
      console.log("⏹ IG 手機框內 結束體驗");
      if (typeof endExperience === "function") endExperience();
      else window.location.reload();
    });
  }

  if (btnEndPostOuter) {
    btnEndPostOuter.addEventListener("click", () => {
      console.log("⏹ IG 外層 結束體驗");
      if (typeof endExperience === "function") endExperience();
      else window.location.reload();
    });
  }
};
