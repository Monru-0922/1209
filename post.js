
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

  if (!likeBtn || !likesCountEl || !postImage) return;

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
