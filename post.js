// ===============================
//   IG 發文頁：按讚 / 留言 / 結束體驗
// ===============================
let postUIInited = false;

function initPostUI() {
  if (postUIInited) return;
  postUIInited = true;

  const likeBtn      = document.getElementById("likeBtn");
  const likesCountEl = document.getElementById("likesCount");
  const commentInput = document.getElementById("commentInput");
  const commentSend  = document.getElementById("commentSendBtn");
  const commentsList = document.getElementById("commentsList");
  const glitchEl     = document.getElementById("glitchScore");
  const postImageEl  = document.getElementById("postImage");

  // ✅ Debug：缺什麼就印什麼（你一進 IG 看 console 就知道問題）
  const missing = [];
  if (!postImageEl)  missing.push("postImage");
  if (!likeBtn)      missing.push("likeBtn");
  if (!likesCountEl) missing.push("likesCount");
  if (!commentInput) missing.push("commentInput");
  if (!commentSend)  missing.push("commentSendBtn");
  if (!commentsList) missing.push("commentsList");
  if (missing.length) console.warn("⚠️ initPostUI 缺少 DOM：", missing.join(", "));

  // 讀取剛剛存的照片（美妝 or 文字濾鏡）
  const imgData = localStorage.getItem("capturedImage");
  if (postImageEl) postImageEl.src = imgData || "image/評分-08.png";

  // ❤️ 按讚（缺 like DOM 就跳過，但不影響留言）
  let liked = false;
  let likes = 0;

  function updateLikes() {
    if (likesCountEl) likesCountEl.textContent = `${likes} likes`;
  }

  function toggleLike() {
    liked = !liked;
    if (likeBtn) likeBtn.textContent = liked ? "❤️" : "♡";
    likes += liked ? 1 : -1;
    if (likes < 0) likes = 0;
    updateLikes();
  }

  if (likeBtn) likeBtn.addEventListener("click", toggleLike);
  if (postImageEl) {
    postImageEl.addEventListener("dblclick", () => {
      if (!liked) toggleLike();
    });
  }
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

  if (commentSend) commentSend.addEventListener("click", postComment);
  if (commentInput) {
    commentInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        postComment();
      }
    });
  }

  // glitch 特效
  if (glitchEl) {
    let glitchStarted = true;
    function randomGlitch() {
      if (!glitchStarted) return;
      glitchEl.style.opacity = "1";
      setTimeout(() => (glitchEl.style.opacity = "0"), 120 + Math.random() * 200);
      setTimeout(randomGlitch, 600 + Math.random() * 1200);
    }
    randomGlitch();
  }

  // 結束體驗按鈕（你的 endExperience 在 script.js 裡，post.js 可直接呼叫）
  const btnEndPostIg    = document.getElementById("btn-end-post-ig");
  const btnEndPostOuter = document.getElementById("btn-end-post");

  if (btnEndPostIg) btnEndPostIg.addEventListener("click", () => endExperience());
  if (btnEndPostOuter) btnEndPostOuter.addEventListener("click", () => endExperience());
}