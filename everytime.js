// =========== STORAGE HELPERS ===========
const LS = {
  get: (k) => {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch {
      return null;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

const MBTI_COLORS = {
  INTJ: "#5c6bc0",
  INTP: "#7e57c2",
  ENTJ: "#283593",
  ENTP: "#1565c0",
  INFJ: "#ad1457",
  INFP: "#c2185b",
  ENFJ: "#6a1b9a",
  ENFP: "#8e24aa",
  ISTJ: "#2e7d32",
  ISFJ: "#388e3c",
  ESTJ: "#558b2f",
  ESFJ: "#33691e",
  ISTP: "#e65100",
  ISFP: "#bf360c",
  ESTP: "#f57f17",
  ESFP: "#ff6f00",
};

// =========== AUTH ===========
let currentUser = null;

function authTab(t) {
  document
    .querySelectorAll(".auth-tab")
    .forEach((el, i) =>
      el.classList.toggle(
        "on",
        (i === 0 && t === "login") || (i === 1 && t === "register"),
      ),
    );
  document.getElementById("loginForm").classList.toggle("on", t === "login");
  document.getElementById("regForm").classList.toggle("on", t === "register");
}

let _toastTimer = null;
function showToast(msg, color) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = color || "#222";
  clearTimeout(_toastTimer);
  t.classList.add("show");
  _toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

function doLogin(e) {
  e.preventDefault();
  const id = document.getElementById("loginId").value.trim();
  const pw = document.getElementById("loginPw").value;
  if (!id) {
    document.getElementById("loginErr").textContent = "아이디를 입력하세요.";
    return;
  }
  const users = LS.get("et_users") || {};
  // 존재하는 계정이면 비번 확인, 없으면 자동 가입
  if (users[id]) {
    if (users[id].pw !== pw) {
      document.getElementById("loginErr").textContent =
        "비밀번호가 틀렸습니다.";
      return;
    }
  } else {
    const name =
      "익명의 " +
      [
        "판다",
        "코알라",
        "수달",
        "너구리",
        "고양이",
        "강아지",
        "토끼",
        "햄스터",
      ][Math.floor(Math.random() * 8)];
    users[id] = { pw, name, school: "", dept: "", year: "", mbti: "" };
    LS.set("et_users", users);
  }
  currentUser = { id, ...users[id] };
  onLogin("login");
}

function doRegister(e) {
  e.preventDefault();
  const id = document.getElementById("regId").value.trim();
  const pw = document.getElementById("regPw").value;
  if (!id || !pw) {
    document.getElementById("regErr").textContent =
      "아이디와 비밀번호를 입력하세요.";
    return;
  }
  const users = LS.get("et_users") || {};
  if (users[id]) {
    document.getElementById("regErr").textContent =
      "이미 사용 중인 아이디입니다.";
    return;
  }
  const rawName = document.getElementById("regName").value.trim();
  const animals = [
    "판다",
    "코알라",
    "수달",
    "너구리",
    "고양이",
    "강아지",
    "토끼",
    "햄스터",
    "여우",
    "곰",
  ];
  const name =
    rawName || "익명의 " + animals[Math.floor(Math.random() * animals.length)];
  const school = document.getElementById("regSchool").value;
  const dept = document.getElementById("regDept").value;
  const year = document.getElementById("regYear").value;
  const mbti = document.getElementById("regMbti").value;
  users[id] = { pw, name, school, dept, year, mbti };
  LS.set("et_users", users);
  currentUser = { id, pw, name, school, dept, year, mbti };
  onLogin("register");
}

function onLogin(type) {
  document.getElementById("authOverlay").style.display = "none";
  document.getElementById("app").classList.add("show");
  document.getElementById("topName").textContent = currentUser.name;
  document.getElementById("topAvatar").textContent = currentUser.name[0];
  document.getElementById("sideSchool").textContent =
    currentUser.school || "학교 미설정";
  document.getElementById("sideDept").textContent =
    currentUser.dept || currentUser.mbti || "";
  renderBoard();
  renderReviews();
  renderMarket();
  renderMsgList();
  updateMsgBadge();
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById("screen-tt").classList.add("active");
  const ttNav = document.querySelector(".nav-item[onclick*=\"'tt'\"]");
  if (ttNav) ttNav.classList.add("active");
  buildTT();
  if (type === "register") {
    showToast("✅ 회원가입이 완료되었습니다!", "#2e7d32");
  } else {
    showToast("👋 로그인되었습니다. 환영합니다!", "#1565c0");
  }
}

function doLogout() {
  currentUser = null;
  document.getElementById("app").classList.remove("show");
  document.getElementById("authOverlay").style.display = "flex";
  document.getElementById("loginId").value = "";
  document.getElementById("loginPw").value = "";
  document.getElementById("loginErr").textContent = "";
}

function resetDB() {
  if (
    !confirm(
      "⚠️ 모든 데이터(게시글, 댓글, 쪽지, 강의평가, 중고책, 시간표)가 삭제됩니다.\n계정 정보는 유지됩니다. 계속하시겠습니까?",
    )
  )
    return;
  const keys = ["et_posts", "et_reviews", "et_msgs", "et_books"];
  keys.forEach((k) => localStorage.removeItem(k));
  // 현재 유저의 모든 학기 시간표 삭제
  for (let i = 0; i < 4; i++)
    localStorage.removeItem(`et_tt_${currentUser.id}_${i}`);
  showToast("🗑 데이터베이스가 초기화되었습니다.", "#c62828");
  renderBoard("list");
  renderReviews();
  renderMarket();
  renderMsgList();
  updateMsgBadge();
  buildTT();
}

// =========== TIMETABLE ===========
const DAYS = ["월", "화", "수", "목", "금"];
const COLORS = [
  "#3a86ff",
  "#ff6b6b",
  "#06d6a0",
  "#8338ec",
  "#fb8500",
  "#e54459",
  "#2ec4b6",
  "#ff9f1c",
  "#4361ee",
];
let ttSemIdx = 0;
const SEMS = ["2025년 1학기", "2024년 2학기", "2024년 1학기", "2023년 2학기"];
let editingClassId = null;
let selectedColor = COLORS[0];
const START_H = 9,
  SLOTS = 13,
  SLOT_H = 60;

function getTTKey() {
  return `et_tt_${currentUser.id}_${ttSemIdx}`;
}
function getClasses() {
  return LS.get(getTTKey()) || [];
}
function saveClasses(arr) {
  LS.set(getTTKey(), arr);
}

function changeSem(d) {
  ttSemIdx = Math.max(0, Math.min(SEMS.length - 1, ttSemIdx + d));
  buildTT();
}

function buildTT() {
  document.getElementById("ttSemLabel").textContent = SEMS[ttSemIdx];
  const tc = document.getElementById("ttTimeCells");
  tc.innerHTML = "";
  for (let i = 0; i < SLOTS; i++) {
    const d = document.createElement("div");
    d.className = "tt-time-cell";
    d.textContent = START_H + i;
    tc.appendChild(d);
  }
  const dc = document.getElementById("ttDayCols");
  dc.innerHTML = "";
  const todayDay = new Date().getDay(); // 1=Mon
  const classes = getClasses();
  DAYS.forEach((day, di) => {
    const col = document.createElement("div");
    col.className = "tt-day-col";
    const head = document.createElement("div");
    head.className = "tt-day-head" + (todayDay === di + 1 ? " today" : "");
    head.textContent = day;
    col.appendChild(head);
    const body = document.createElement("div");
    body.className = "tt-day-body";
    body.style.height = SLOTS * SLOT_H + "px";
    for (let s = 0; s < SLOTS; s++) {
      const slot = document.createElement("div");
      slot.className = "tt-slot";
      body.appendChild(slot);
    }
    classes
      .filter((c) => c.day == di)
      .forEach((c) => {
        const top = (c.start - START_H) * SLOT_H;
        const height = c.duration * SLOT_H;
        if (top < 0 || top >= SLOTS * SLOT_H) return;
        const el = document.createElement("div");
        el.className = "tt-class-block";
        el.style.cssText = `background:${c.color};top:${top}px;height:${height - 2}px`;
        el.innerHTML = `${c.name}<span>${c.room}</span>`;
        el.onclick = () => openEditClass(c.id);
        body.appendChild(el);
      });
    col.appendChild(body);
    dc.appendChild(col);
  });
  updateTTStats();
}

function updateTTStats() {
  const classes = getClasses();
  const credits = classes.reduce((s, c) => s + (c.credit || 3), 0);
  document.getElementById("ttStats").textContent =
    `총 ${classes.length}개 강의 · ${credits}학점`;
}

function buildColorPicker(sel) {
  const cp = document.getElementById("colorPicker");
  cp.innerHTML = "";
  COLORS.forEach((c) => {
    const s = document.createElement("div");
    s.className = "color-swatch" + (c === sel ? " sel" : "");
    s.style.background = c;
    s.onclick = () => {
      selectedColor = c;
      buildColorPicker(c);
    };
    cp.appendChild(s);
  });
}

function buildTimeSelects(startVal, endVal) {
  const cs = document.getElementById("cs");
  const ce = document.getElementById("ce");
  cs.innerHTML = "";
  ce.innerHTML = "";
  for (let h = START_H; h < START_H + SLOTS; h++) {
    for (let m = 0; m < 60; m += 30) {
      const label = `${h}:${m === 0 ? "00" : "30"}`;
      const val = h + m / 60;
      const o1 = new Option(label, val);
      const o2 = new Option(label, val);
      if (val == startVal) o1.selected = true;
      if (val == endVal) o2.selected = true;
      cs.appendChild(o1);
      ce.appendChild(o2);
    }
  }
}

function openAddClass() {
  editingClassId = null;
  document.getElementById("classModalTitle").textContent = "강의 추가";
  document.getElementById("classDeleteBtn").style.display = "none";
  document.getElementById("cn").value = "";
  document.getElementById("cp").value = "";
  document.getElementById("cr").value = "";
  document.getElementById("cd").value = "0";
  document.getElementById("ccredit").value = "3";
  selectedColor = COLORS[0];
  buildColorPicker(COLORS[0]);
  buildTimeSelects(9, 10.5);
  openModal("classModal");
}

function openEditClass(id) {
  const c = getClasses().find((x) => x.id === id);
  if (!c) return;
  editingClassId = id;
  document.getElementById("classModalTitle").textContent = "강의 수정";
  document.getElementById("classDeleteBtn").style.display = "block";
  document.getElementById("cn").value = c.name;
  document.getElementById("cp").value = c.prof || "";
  document.getElementById("cr").value = c.room;
  document.getElementById("cd").value = c.day;
  document.getElementById("ccredit").value = c.credit || 3;
  selectedColor = c.color;
  buildColorPicker(c.color);
  buildTimeSelects(c.start, c.start + c.duration);
  openModal("classModal");
}

function saveClass() {
  const name = document.getElementById("cn").value.trim();
  if (!name) {
    alert("강의명을 입력하세요");
    return;
  }
  const start = parseFloat(document.getElementById("cs").value);
  const end = parseFloat(document.getElementById("ce").value);
  if (end <= start) {
    alert("종료 시간이 시작 시간보다 늦어야 합니다");
    return;
  }
  const classes = getClasses();
  const obj = {
    id: editingClassId || Date.now().toString(),
    name,
    prof: document.getElementById("cp").value.trim(),
    room: document.getElementById("cr").value.trim(),
    day: parseInt(document.getElementById("cd").value),
    start,
    duration: end - start,
    credit: parseInt(document.getElementById("ccredit").value),
    color: selectedColor,
  };
  if (editingClassId) {
    const idx = classes.findIndex((x) => x.id === editingClassId);
    classes[idx] = obj;
  } else {
    classes.push(obj);
  }
  saveClasses(classes);
  closeModal("classModal");
  buildTT();
}

function deleteClass() {
  if (!editingClassId) return;
  const classes = getClasses().filter((x) => x.id !== editingClassId);
  saveClasses(classes);
  closeModal("classModal");
  buildTT();
}

// =========== BOARD ===========
const BOARDS = [
  "자유게시판",
  "비밀게시판",
  "새내기게시판",
  "취업·진로",
  "학술",
  "홍보",
  "MBTI",
];
// '전체' | board name | '내가쓴글' | '내가댓글쓴글'
let currentBoard = "전체";
let currentPostId = null;
let postImgData = null;

function getPosts() {
  return LS.get("et_posts") || getDefaultPosts();
}
function savePosts(arr) {
  LS.set("et_posts", arr);
}

function getDefaultPosts() {
  const posts = [
    {
      id: "p1",
      board: "자유게시판",
      author: "익명",
      title: "기말고사 스터디 구해요",
      body: "컴공 기말 같이 공부하실 분 있나요?\n알고리즘이랑 OS 위주로 하려고 합니다.\n댓글이나 쪽지 주세요!",
      time: Date.now() - 3600000,
      likes: [],
      views: 312,
      comments: [
        {
          author: "익명",
          mbti: "INFP",
          text: "저 참여하고 싶어요!",
          time: Date.now() - 3500000,
        },
        {
          author: "익명2",
          mbti: "ISTJ",
          text: "저도요!",
          time: Date.now() - 3400000,
        },
      ],
      img: null,
    },
    {
      id: "p2",
      board: "비밀게시판",
      author: "익명",
      title: "교수님 수업 너무 어렵지 않나요",
      body: "운영체제 수업인데 진짜 따라가기가 너무 벅차네요.\n다들 어떻게 공부하시나요?",
      time: Date.now() - 7200000,
      likes: [],
      views: 891,
      comments: [
        {
          author: "익명",
          mbti: "ENTP",
          text: "유튜브에 강의 많아요!",
          time: Date.now() - 7000000,
        },
      ],
      img: null,
    },
    {
      id: "p3",
      board: "취업·진로",
      author: "익명",
      title: "카카오 인턴 후기 공유합니다",
      body: "이번에 카카오 하계 인턴 지원했는데 코테 통과하고 면접까지 봤어요.\n코테는 백준 골드 수준이었고, 면접은 CS 기초 + 프로젝트 위주였어요.",
      time: Date.now() - 18000000,
      likes: [],
      views: 2843,
      comments: [],
      img: null,
    },
    {
      id: "p4",
      board: "자유게시판",
      author: "익명",
      title: "학식 오늘 뭐 맛있었나요",
      body: "오늘 점심 늦게 먹으러 갔더니 메뉴가 얼마 없었어요 ㅠㅠ",
      time: Date.now() - 86400000,
      likes: [],
      views: 201,
      comments: [],
      img: null,
    },
    {
      id: "p5",
      board: "새내기게시판",
      author: "익명",
      title: "수강신청 꿀팁 알려드려요",
      body: "1. 수강신청 전날 미리 장바구니 담기\n2. 인터넷 속도 좋은 곳에서 접속\n3. 예비 과목 2-3개 준비\n4. 오픈 시간 30분 전부터 대기\n\n새내기분들 파이팅!",
      time: Date.now() - 172800000,
      likes: [],
      views: 1520,
      comments: [],
      img: null,
    },
    {
      id: "p6",
      board: "MBTI",
      author: "익명",
      title: "MBTI별 공부 스타일 어때요?",
      body: "저는 INTJ인데 혼자 조용히 공부하는 게 제일 잘 돼요.\n다들 MBTI별로 공부 스타일이 다른가요?",
      time: Date.now() - 5400000,
      likes: [],
      views: 445,
      comments: [
        {
          author: "익명A",
          mbti: "ENFP",
          text: "저는 ENFP라 카페에서 사람들 있을 때 더 집중돼요 ㅋㅋ",
          time: Date.now() - 5000000,
        },
        {
          author: "익명B",
          mbti: "ISTJ",
          text: "ISTJ는 계획표 짜서 칸칸이 채워야 함",
          time: Date.now() - 4800000,
        },
        {
          author: "익명C",
          mbti: "INTP",
          text: "INTP인데 벼락치기 밖에 안 됨...",
          time: Date.now() - 4600000,
        },
      ],
      img: null,
    },
    {
      id: "p7",
      board: "MBTI",
      author: "익명",
      title: "T와 F의 차이 체감한 순간",
      body: "친구가 힘들다고 했을 때 T는 해결책 먼저 말하고 F는 공감 먼저 하더라고요 ㅋㅋ\n본인은 어느 쪽인가요?",
      time: Date.now() - 10800000,
      likes: [],
      views: 782,
      comments: [
        {
          author: "익명D",
          mbti: "ENTJ",
          text: "T는 맞는데 요즘 공감도 연습 중...",
          time: Date.now() - 10000000,
        },
        {
          author: "익명E",
          mbti: "INFJ",
          text: "F인데 논리적 해결책도 중요하다 생각해요",
          time: Date.now() - 9500000,
        },
      ],
      img: null,
    },
  ];
  savePosts(posts);
  return posts;
}

function renderBoard(view) {
  const container = document.getElementById("boardView");
  if (view === "list" || !view) {
    currentPostId = null;
    const posts = getPosts();
    let filtered;
    if (currentBoard === "전체") {
      filtered = posts;
    } else if (currentBoard === "내가쓴글") {
      filtered = posts.filter((p) => p.author === currentUser.name);
    } else if (currentBoard === "내가댓글쓴글") {
      filtered = posts.filter((p) =>
        p.comments.some((c) => c.author === currentUser.name),
      );
    } else {
      filtered = posts.filter((p) => p.board === currentBoard);
    }
    const sorted = [...filtered].sort((a, b) => b.time - a.time);
    const myPostCount = posts.filter(
      (p) => p.author === currentUser.name,
    ).length;
    const myCommentCount = posts.filter((p) =>
      p.comments.some((c) => c.author === currentUser.name),
    ).length;
    const labelMap = {
      전체: "전체글보기",
      내가쓴글: `내가 쓴 글 (${myPostCount})`,
      내가댓글쓴글: `댓글 단 글 (${myCommentCount})`,
    };
    container.innerHTML = `
      <div class="board-layout">
        <div class="board-side">
          <div class="board-side-item ${currentBoard === "전체" ? "on" : ""}" onclick="setBoard('전체')">전체글보기</div>
          ${BOARDS.map((b) => `<div class="board-side-item ${currentBoard === b ? "on" : ""}" onclick="setBoard('${b}')">${b}</div>`).join("")}
          <div class="board-side-divider"></div>
          <div class="board-side-item my ${currentBoard === "내가쓴글" ? "on" : ""}" onclick="setBoard('내가쓴글')">📝 내가 쓴 글 <small style="color:#bbb;font-size:11px">${myPostCount}</small></div>
          <div class="board-side-item my ${currentBoard === "내가댓글쓴글" ? "on" : ""}" onclick="setBoard('내가댓글쓴글')">💬 댓글 단 글 <small style="color:#bbb;font-size:11px">${myCommentCount}</small></div>
        </div>
        <div class="board-content">
          <div class="board-top">
            <h2>${labelMap[currentBoard] || currentBoard}</h2>
            <button class="btn-red" onclick="openWritePost()">+ 글쓰기</button>
          </div>
          <div class="post-list">
            ${sorted.length ? sorted.map((p) => postItemHTML(p, currentBoard === "내가댓글쓴글")).join("") : '<div style="padding:40px;text-align:center;color:#aaa">게시글이 없습니다</div>'}
          </div>
        </div>
      </div>
    `;
  } else if (view === "detail") {
    const post = getPosts().find((p) => p.id === currentPostId);
    if (!post) {
      renderBoard("list");
      return;
    }
    post.views++;
    savePosts(getPosts().map((p) => (p.id === post.id ? post : p)));
    const liked = post.likes.includes(currentUser.id);
    const isMyPost =
      post.authorReal === currentUser.name || post.author === currentUser.name;
    container.innerHTML = `
      <button class="post-detail-back" onclick="renderBoard('list')">← 목록으로</button>
      <div class="post-detail">
        <div class="pd-board">${post.board}</div>
        <div class="pd-title">${escH(post.title)}</div>
        <div class="pd-meta">
          <span>${post.author}</span>
          <span>${timeAgo(post.time)}</span>
          <span>조회 ${post.views}</span>
          <span>댓글 ${post.comments.length}</span>
        </div>
        ${post.img ? `<img src="${post.img}" style="max-width:100%;border-radius:8px;margin-bottom:16px">` : ""}
        <div class="pd-body">${escH(post.body)}</div>
        <div class="pd-actions">
          <button class="pd-action ${liked ? "liked" : ""}" onclick="likePost('${post.id}')">
            ❤ 공감 ${post.likes.length}
          </button>
          <button class="pd-action" onclick="openComposeModal('${post.authorId || ""}')">✉ 쪽지 보내기</button>
          <button class="pd-action">🔖 스크랩</button>
          ${
            isMyPost
              ? `
            <button class="pd-action" style="margin-left:auto" onclick="openEditPost('${post.id}')">✏️ 수정</button>
            <button class="pd-action" style="color:#e54459" onclick="deletePost('${post.id}')">🗑 삭제</button>
          `
              : ""
          }
        </div>
        <div class="comments-section">
          <h4>댓글 ${post.comments.length}개</h4>
          ${post.board === "MBTI" && post.comments.length ? mbtiCommentStats(post.comments) : ""}
          ${post.comments
            .map((c, ci) => {
              const isMine =
                c.authorReal === currentUser.name ||
                c.author === currentUser.name;
              return `<div class="comment-item" id="citem-${ci}">
              <div class="c-head">
                <span class="c-name" style="${isMine ? "color:var(--red)" : ""}">${c.author}${isMine ? " (나)" : ""}</span>
                ${c.mbti ? `<span style="font-size:11px;font-weight:700;padding:1px 7px;border-radius:10px;background:#f0f0f0;color:#555">${c.mbti}</span>` : ""}
                <span class="c-time">${timeAgo(c.time)}</span>
                ${
                  isMine
                    ? `
                  <button onclick="startEditComment('${post.id}',${ci})" style="margin-left:auto;background:none;border:none;font-size:12px;color:var(--sub);cursor:pointer;padding:2px 6px">수정</button>
                  <button onclick="deleteComment('${post.id}',${ci})" style="background:none;border:none;font-size:12px;color:#bbb;cursor:pointer;padding:2px 6px">삭제</button>
                `
                    : ""
                }
              </div>
              <div class="c-text" id="ctext-${ci}">${escH(c.text)}</div>
            </div>`;
            })
            .join("")}
          <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font-size:13px;color:var(--sub)">댓글 작성자:</span>
              <button id="cAnonBtn" class="author-toggle on" onclick="setCmtAnon(true)">익명</button>
              <button id="cNickBtn" class="author-toggle" onclick="setCmtAnon(false)">${currentUser.name}</button>
            </div>
            <div class="c-input-row">
              <input type="text" id="commentInput" placeholder="댓글을 입력하세요">
              <button onclick="submitComment('${post.id}')">등록</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function postItemHTML(p, showMyComment) {
  const myCommentCount = showMyComment
    ? p.comments.filter((c) => c.author === currentUser.name).length
    : 0;
  // MBTI 게시판 글에서 댓글 MBTI 분포 미리보기
  const mbtiPreview =
    p.board === "MBTI" && p.comments.length
      ? (() => {
          const counts = {};
          p.comments.forEach((c) => {
            if (c.mbti) counts[c.mbti] = (counts[c.mbti] || 0) + 1;
          });
          return Object.entries(counts)
            .slice(0, 4)
            .map(
              ([m]) =>
                `<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;background:${MBTI_COLORS[m] || "#888"};color:#fff">${m}</span>`,
            )
            .join("");
        })()
      : "";
  return `<div class="post-item" onclick="viewPost('${p.id}')">
    <div class="post-item-main">
      <div class="post-item-head">
        <span class="post-board-tag">${p.board}</span>
        <span class="post-anon">${p.author}</span>
        ${p.likes.length > 20 ? '<span class="hot-badge">HOT</span>' : ""}
        ${myCommentCount ? `<span style="font-size:11px;color:var(--red);background:#fff5f6;padding:2px 7px;border-radius:4px">내 댓글 ${myCommentCount}</span>` : ""}
        <span class="post-date">${timeAgo(p.time)}</span>
      </div>
      <div class="post-title">${escH(p.title)}</div>
      <div class="post-preview">${escH(p.body)}</div>
      <div class="post-footer">
        <span class="post-stat">❤ ${p.likes.length}</span>
        <span class="post-stat">💬 ${p.comments.length}</span>
        <span class="post-stat">👁 ${p.views}</span>
        ${mbtiPreview ? `<span style="margin-left:auto;display:flex;gap:4px;align-items:center">${mbtiPreview}</span>` : ""}
      </div>
    </div>
    ${p.img ? `<img class="post-img-thumb" src="${p.img}">` : ""}
  </div>`;
}

function deleteComment(postId, commentIdx) {
  if (!confirm("댓글을 삭제하시겠습니까?")) return;
  const posts = getPosts();
  const p = posts.find((x) => x.id === postId);
  const c = p.comments[commentIdx];
  if (
    !c ||
    (c.authorReal !== currentUser.name && c.author !== currentUser.name)
  )
    return;
  p.comments.splice(commentIdx, 1);
  savePosts(posts);
  renderBoard("detail");
}

let cmtAsAnon = true;
function setCmtAnon(anon) {
  cmtAsAnon = anon;
  const ab = document.getElementById("cAnonBtn");
  const nb = document.getElementById("cNickBtn");
  if (ab) ab.classList.toggle("on", anon);
  if (nb) nb.classList.toggle("on", !anon);
}

function startEditComment(postId, ci) {
  const posts = getPosts();
  const p = posts.find((x) => x.id === postId);
  const c = p.comments[ci];
  const textEl = document.getElementById("ctext-" + ci);
  const itemEl = document.getElementById("citem-" + ci);
  if (!textEl) return;
  textEl.innerHTML = `
    <div style="display:flex;gap:8px;margin-top:6px">
      <textarea id="cedit-${ci}" style="flex:1;border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:14px;resize:none;min-height:60px">${c.text}</textarea>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button onclick="submitEditComment('${postId}',${ci})" style="background:var(--red);color:#fff;border:none;border-radius:7px;padding:6px 12px;font-size:12px;cursor:pointer;font-weight:600">저장</button>
        <button onclick="renderBoard('detail')" style="background:#f5f5f5;color:var(--text);border:1px solid var(--border);border-radius:7px;padding:6px 12px;font-size:12px;cursor:pointer">취소</button>
      </div>
    </div>
  `;
}

function submitEditComment(postId, ci) {
  const val = document.getElementById("cedit-" + ci);
  if (!val) return;
  const text = val.value.trim();
  if (!text) return;
  const posts = getPosts();
  const p = posts.find((x) => x.id === postId);
  p.comments[ci].text = text;
  savePosts(posts);
  renderBoard("detail");
}

function submitComment(postId) {
  const input = document.getElementById("commentInput");
  const text = input.value.trim();
  if (!text) return;
  const author = cmtAsAnon ? "익명" : currentUser.name;
  const posts = getPosts();
  const p = posts.find((x) => x.id === postId);
  p.comments.push({
    author,
    authorReal: currentUser.name,
    mbti: currentUser.mbti || "",
    text,
    time: Date.now(),
  });
  savePosts(posts);
  currentPostId = postId;
  renderBoard("detail");
}

function mbtiCommentStats(comments) {
  const counts = {};
  comments.forEach((c) => {
    if (c.mbti) counts[c.mbti] = (counts[c.mbti] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "";
  return `<div style="background:#fafafa;border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
    <span style="font-size:12px;color:#888;font-weight:600;margin-right:4px">MBTI별 의견</span>
    ${entries.map(([m, n]) => `<span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;background:${MBTI_COLORS[m] || "#888"};color:#fff">${m} <span style="opacity:.8;font-weight:400">${n}</span></span>`).join("")}
  </div>`;
}

// =========== 시간표 대입 ===========
const IMPORT_COURSES = [
  {
    name: "알고리즘",
    prof: "김철수",
    room: "공학관 301",
    day: 0,
    start: 9,
    duration: 1.5,
    credit: 3,
    color: "#3a86ff",
  },
  {
    name: "운영체제",
    prof: "이영희",
    room: "공학관 302",
    day: 1,
    start: 10.5,
    duration: 1.5,
    credit: 3,
    color: "#ff6b6b",
  },
  {
    name: "데이터베이스",
    prof: "박민준",
    room: "정보관 201",
    day: 2,
    start: 13,
    duration: 1.5,
    credit: 3,
    color: "#06d6a0",
  },
  {
    name: "컴퓨터네트워크",
    prof: "최수진",
    room: "공학관 401",
    day: 3,
    start: 9,
    duration: 1.5,
    credit: 3,
    color: "#8338ec",
  },
  {
    name: "소프트웨어공학",
    prof: "정재원",
    room: "정보관 301",
    day: 4,
    start: 14,
    duration: 1.5,
    credit: 3,
    color: "#fb8500",
  },
  {
    name: "선형대수",
    prof: "강민서",
    room: "이학관 101",
    day: 0,
    start: 13,
    duration: 1.5,
    credit: 3,
    color: "#2ec4b6",
  },
  {
    name: "확률과통계",
    prof: "윤지혜",
    room: "이학관 201",
    day: 2,
    start: 10.5,
    duration: 1.5,
    credit: 3,
    color: "#e54459",
  },
  {
    name: "영어회화",
    prof: "John Smith",
    room: "인문관 102",
    day: 1,
    start: 15,
    duration: 1,
    credit: 2,
    color: "#4361ee",
  },
  {
    name: "미적분학",
    prof: "홍길동",
    room: "이학관 105",
    day: 3,
    start: 13,
    duration: 1.5,
    credit: 3,
    color: "#ff9f1c",
  },
  {
    name: "경제학원론",
    prof: "김경제",
    room: "경영관 201",
    day: 4,
    start: 10.5,
    duration: 1.5,
    credit: 3,
    color: "#5c6bc0",
  },
];
let importSelected = new Set();

function openImportTT() {
  importSelected = new Set();
  const existing = getClasses();
  const list = document.getElementById("importTTList");
  list.innerHTML = IMPORT_COURSES.map((c, i) => {
    const conflict = existing.some(
      (e) =>
        e.day === c.day &&
        !(c.start + c.duration <= e.start || c.start >= e.start + e.duration),
    );
    return `<label style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid #e0e0e0;border-radius:8px;cursor:${conflict ? "not-allowed" : "pointer"};opacity:${conflict ? ".45" : "1"};background:#fff">
      <input type="checkbox" data-i="${i}" ${conflict ? "disabled" : ""} onchange="toggleImport(this,${i})" style="width:16px;height:16px;accent-color:var(--red)">
      <span style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0"></span>
      <span style="flex:1;font-size:14px;font-weight:600">${c.name}</span>
      <span style="font-size:12px;color:#888">${["월", "화", "수", "목", "금"][c.day]} ${c.start}:00</span>
      <span style="font-size:12px;color:#888">${c.credit}학점</span>
      ${conflict ? '<span style="font-size:11px;color:#e54459">시간 충돌</span>' : ""}
    </label>`;
  }).join("");
  document.getElementById("importSelCount").textContent = "0개 선택";
  openModal("importTTModal");
}

function toggleImport(el, i) {
  if (el.checked) importSelected.add(i);
  else importSelected.delete(i);
  document.getElementById("importSelCount").textContent =
    importSelected.size + "개 선택";
}

function confirmImportTT() {
  if (!importSelected.size) {
    alert("강의를 선택하세요");
    return;
  }
  const classes = getClasses();
  importSelected.forEach((i) => {
    const c = IMPORT_COURSES[i];
    classes.push({ id: Date.now().toString() + i, ...c });
  });
  saveClasses(classes);
  closeModal("importTTModal");
  buildTT();
}

function setBoard(b) {
  currentBoard = b;
  renderBoard("list");
}
function viewPost(id) {
  currentPostId = id;
  renderBoard("detail");
}
function likePost(id) {
  const posts = getPosts();
  const p = posts.find((x) => x.id === id);
  const idx = p.likes.indexOf(currentUser.id);
  if (idx === -1) p.likes.push(currentUser.id);
  else p.likes.splice(idx, 1);
  savePosts(posts);
  renderBoard("detail");
}
function deletePost(id) {
  if (!confirm("삭제하시겠습니까?")) return;
  savePosts(getPosts().filter((p) => p.id !== id));
  renderBoard("list");
}

let writeSelectedBoard = BOARDS[0];
let writeAsAnon = true;
let editingPostId = null;

function setWriteAnon(anon) {
  writeAsAnon = anon;
  document.getElementById("anonBtn").classList.toggle("on", anon);
  document.getElementById("nickBtn").classList.toggle("on", !anon);
}

function openWritePost() {
  editingPostId = null;
  postImgData = null;
  writeAsAnon = true;
  document.getElementById("writeModalTitle").textContent = "게시글 작성";
  document.getElementById("postTitle").value = "";
  document.getElementById("postBody").value = "";
  document.getElementById("postImgZone").innerHTML =
    `<input type="file" id="postImg" accept="image/*" style="display:none" onchange="previewPostImg(this)"><span>📷 클릭하여 이미지 첨부</span>`;
  document.getElementById("writeBoardSel").style.display = "";
  const sel = document.getElementById("writeBoardSel");
  writeSelectedBoard = BOARDS[0];
  sel.innerHTML = BOARDS.map(
    (b) =>
      `<div class="write-board-chip ${b === writeSelectedBoard ? "on" : ""}" onclick="selWriteBoard(this,'${b}')">${b}</div>`,
  ).join("");
  document.getElementById("nickBtn").textContent = currentUser.name;
  setWriteAnon(true);
  openModal("writeModal");
}

function openEditPost(id) {
  const p = getPosts().find((x) => x.id === id);
  if (!p) return;
  editingPostId = id;
  writeAsAnon = p.authorReal ? false : p.author === "익명";
  postImgData = p.img || null;
  document.getElementById("writeModalTitle").textContent = "게시글 수정";
  document.getElementById("postTitle").value = p.title;
  document.getElementById("postBody").value = p.body;
  // hide board selector in edit mode
  document.getElementById("writeBoardSel").style.display = "none";
  writeSelectedBoard = p.board;
  document.getElementById("nickBtn").textContent = currentUser.name;
  setWriteAnon(p.author === "익명");
  if (p.img) {
    document.getElementById("postImgZone").innerHTML =
      `<img class="img-preview" src="${p.img}"><input type="file" id="postImg" accept="image/*" onchange="previewPostImg(this)" style="position:absolute;inset:0;opacity:0;cursor:pointer">`;
  } else {
    document.getElementById("postImgZone").innerHTML =
      `<input type="file" id="postImg" accept="image/*" style="display:none" onchange="previewPostImg(this)"><span>📷 클릭하여 이미지 첨부</span>`;
  }
  openModal("writeModal");
}

function selWriteBoard(el, b) {
  writeSelectedBoard = b;
  document
    .querySelectorAll(".write-board-chip")
    .forEach((c) => c.classList.remove("on"));
  el.classList.add("on");
}
function previewPostImg(input) {
  if (!input.files[0]) return;
  const r = new FileReader();
  r.onload = (e) => {
    postImgData = e.target.result;
    document.getElementById("postImgZone").innerHTML =
      `<img class="img-preview" src="${postImgData}"><input type="file" id="postImg" accept="image/*" onchange="previewPostImg(this)" style="position:absolute;inset:0;opacity:0;cursor:pointer">`;
  };
  r.readAsDataURL(input.files[0]);
}
function submitPost() {
  const title = document.getElementById("postTitle").value.trim();
  const body = document.getElementById("postBody").value.trim();
  if (!title || !body) {
    alert("제목과 내용을 입력하세요");
    return;
  }
  const author = writeAsAnon ? "익명" : currentUser.name;
  const posts = getPosts();
  if (editingPostId) {
    const p = posts.find((x) => x.id === editingPostId);
    p.title = title;
    p.body = body;
    p.author = author;
    p.img = postImgData;
    savePosts(posts);
    closeModal("writeModal");
    currentPostId = editingPostId;
    renderBoard("detail");
  } else {
    posts.unshift({
      id: Date.now().toString(),
      board: writeSelectedBoard,
      author,
      authorReal: currentUser.name,
      authorId: currentUser.id,
      title,
      body,
      time: Date.now(),
      likes: [],
      views: 0,
      comments: [],
      img: postImgData,
    });
    savePosts(posts);
    closeModal("writeModal");
    renderBoard("list");
  }
}

// =========== REVIEWS ===========
let reviewStar = 0;
let currentReviewId = null;

function getReviews() {
  return LS.get("et_reviews") || getDefaultReviews();
}
function saveReviews(arr) {
  LS.set("et_reviews", arr);
}

function getDefaultReviews() {
  const reviews = [
    {
      id: "r1",
      name: "자료구조",
      prof: "김철수",
      dept: "컴퓨터공학부",
      reviews: [
        {
          author: "익명",
          sem: "2025년 1학기",
          score: 4,
          text: "내용이 탄탄하고 교수님이 열정적이에요. 시험은 어렵지만 배울 게 많습니다.",
          exam: "어려움",
          hw: "많음",
          time: Date.now() - 86400000,
        },
        {
          author: "익명",
          sem: "2024년 2학기",
          score: 5,
          text: "최고의 강의입니다!",
          exam: "어려움",
          hw: "보통",
          time: Date.now() - 172800000,
        },
      ],
    },
    {
      id: "r2",
      name: "운영체제",
      prof: "이영희",
      dept: "컴퓨터공학부",
      reviews: [
        {
          author: "익명",
          sem: "2025년 1학기",
          score: 4,
          text: "강의 자료가 잘 정리되어 있어요.",
          exam: "보통",
          hw: "보통",
          time: Date.now() - 100000000,
        },
      ],
    },
    {
      id: "r3",
      name: "미적분학",
      prof: "박민준",
      dept: "수학과",
      reviews: [
        {
          author: "익명",
          sem: "2024년 2학기",
          score: 5,
          text: "시험이 쉽고 성적도 잘 줍니다.",
          exam: "쉬움",
          hw: "적음",
          time: Date.now() - 200000000,
        },
      ],
    },
    {
      id: "r4",
      name: "영어회화",
      prof: "John Smith",
      dept: "교양",
      reviews: [
        {
          author: "익명",
          sem: "2025년 1학기",
          score: 5,
          text: "꿀강의입니다. 출석만 해도 A 받아요.",
          exam: "매우 쉬움",
          hw: "없음",
          time: Date.now() - 300000000,
        },
      ],
    },
  ];
  saveReviews(reviews);
  return reviews;
}

function avgScore(reviews) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.score, 0) / reviews.length;
}

function starsHTML(score) {
  let h = "";
  for (let i = 1; i <= 5; i++)
    h += `<span class="${i <= Math.round(score) ? "star" : "star e"}">★</span>`;
  return `<div class="star-row">${h}</div>`;
}

function setStar(v) {
  reviewStar = v;
  document
    .querySelectorAll(".star-input .si")
    .forEach((el) => el.classList.toggle("on", el.dataset.v <= v));
}

function renderReviews(view) {
  const container = document.getElementById("reviewView");
  if (view === "detail") {
    const rv = getReviews().find((r) => r.id === currentReviewId);
    if (!rv) {
      renderReviews();
      return;
    }
    const avg = avgScore(rv.reviews);
    container.innerHTML = `
      <button class="rv-back" onclick="renderReviews()">← 목록으로</button>
      <div class="rv-detail">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px">
          <div>
            <div style="font-size:22px;font-weight:700;margin-bottom:4px">${rv.name}</div>
            <div style="font-size:14px;color:var(--sub);margin-bottom:14px">${rv.prof} · ${rv.dept}</div>
            <div class="rc-stars">${starsHTML(avg)}<span class="rc-score">${avg.toFixed(1)}</span><span class="rc-cnt">(${rv.reviews.length}개)</span></div>
          </div>
          <button class="btn-red" onclick="openReviewModal('${rv.id}')">+ 평가 작성</button>
        </div>
        <div>
          ${
            rv.reviews.length
              ? rv.reviews
                  .map(
                    (r) => `
            <div class="rv-item">
              <div class="rv-item-head">
                ${starsHTML(r.score)}<span style="font-size:14px;font-weight:600;margin-left:6px">${r.score}.0</span>
                <span class="rv-semester">${r.sem}</span>
              </div>
              <div class="rv-text">${escH(r.text)}</div>
              <div class="rv-diffs">
                <span class="rv-diff">시험 <span>${r.exam}</span></span>
                <span class="rv-diff">과제 <span>${r.hw}</span></span>
              </div>
            </div>
          `,
                  )
                  .join("")
              : '<div style="padding:40px;text-align:center;color:#aaa">아직 평가가 없습니다</div>'
          }
        </div>
      </div>
    `;
    return;
  }
  const reviews = getReviews();
  container.innerHTML = `
    <div class="review-layout">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
        <h2 class="page-title" style="margin:0">강의평가</h2>
        <button class="btn-red" style="margin-left:auto" onclick="openReviewModal()">+ 강의평가 작성</button>
      </div>
      <div class="review-filters">
        ${["전체", "컴퓨터공학부", "경영학과", "경제학과", "수학과", "교양"]
          .map(
            (f) => `
          <div class="rf-chip ${f === "전체" ? "on" : ""}" onclick="filterReview(this,'${f}')">${f}</div>
        `,
          )
          .join("")}
      </div>
      <div class="review-grid">
        ${reviews
          .map((r) => {
            const avg = avgScore(r.reviews);
            return `<div class="review-card" onclick="viewReview('${r.id}')">
            <div class="rc-name">${r.name}</div>
            <div class="rc-prof">${r.prof} · ${r.dept}</div>
            <div class="rc-stars">${starsHTML(avg)}<span class="rc-score">${avg.toFixed(1)}</span><span class="rc-cnt">(${r.reviews.length})</span></div>
          </div>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function viewReview(id) {
  currentReviewId = id;
  renderReviews("detail");
}

function filterReview(el, f) {
  document
    .querySelectorAll(".rf-chip")
    .forEach((c) => c.classList.remove("on"));
  el.classList.add("on");
  const reviews = getReviews();
  const filtered = f === "전체" ? reviews : reviews.filter((r) => r.dept === f);
  const grid = document.querySelector(".review-grid");
  if (!grid) return;
  grid.innerHTML = filtered
    .map((r) => {
      const avg = avgScore(r.reviews);
      return `<div class="review-card" onclick="viewReview('${r.id}')">
      <div class="rc-name">${r.name}</div>
      <div class="rc-prof">${r.prof} · ${r.dept}</div>
      <div class="rc-stars">${starsHTML(avg)}<span class="rc-score">${avg.toFixed(1)}</span><span class="rc-cnt">(${r.reviews.length})</span></div>
    </div>`;
    })
    .join("");
}

let reviewTargetId = null;
function openReviewModal(id) {
  reviewTargetId = id || null;
  reviewStar = 0;
  document
    .querySelectorAll(".star-input .si")
    .forEach((el) => el.classList.remove("on"));
  document.getElementById("rvCourse").value = "";
  document.getElementById("rvProf").value = "";
  document.getElementById("rvText").value = "";
  if (id) {
    const rv = getReviews().find((r) => r.id === id);
    if (rv) {
      document.getElementById("rvCourse").value = rv.name;
      document.getElementById("rvProf").value = rv.prof;
      document.getElementById("rvCourse").readOnly = true;
      document.getElementById("rvProf").readOnly = true;
    }
  } else {
    document.getElementById("rvCourse").readOnly = false;
    document.getElementById("rvProf").readOnly = false;
  }
  openModal("reviewModal");
}

function submitReview() {
  if (!reviewStar) {
    alert("별점을 선택하세요");
    return;
  }
  const course = document.getElementById("rvCourse").value.trim();
  const prof = document.getElementById("rvProf").value.trim();
  const text = document.getElementById("rvText").value.trim();
  if (!course || !prof || !text) {
    alert("모든 항목을 입력하세요");
    return;
  }
  const reviews = getReviews();
  const entry = {
    author: currentUser.name,
    sem: document.getElementById("rvSem").value,
    score: reviewStar,
    text,
    exam: document.getElementById("rvExam").value,
    hw: document.getElementById("rvHw").value,
    time: Date.now(),
  };
  if (reviewTargetId) {
    const rv = reviews.find((r) => r.id === reviewTargetId);
    rv.reviews.push(entry);
  } else {
    const existing = reviews.find((r) => r.name === course && r.prof === prof);
    if (existing) {
      existing.reviews.push(entry);
    } else {
      reviews.push({
        id: Date.now().toString(),
        name: course,
        prof,
        dept: document.getElementById("rvDept").value,
        reviews: [entry],
      });
    }
  }
  saveReviews(reviews);
  closeModal("reviewModal");
  if (currentReviewId) renderReviews("detail");
  else renderReviews();
}

// =========== MESSAGES ===========
// 메시지 스키마: { id, from(userId), fromName, to(userId), text, time, read, anon }
let activeMsgThread = null; // 상대방 userId
let msgSendAnon = false;

function getMsgs() {
  return LS.get("et_msgs") || [];
}
function saveMsgs(arr) {
  LS.set("et_msgs", arr);
}

function getThreads() {
  const me = currentUser.id;
  const msgs = getMsgs().filter((m) => m.from === me || m.to === me);
  const threads = {};
  msgs.forEach((m) => {
    const other = m.from === me ? m.to : m.from;
    if (!threads[other]) threads[other] = [];
    threads[other].push(m);
  });
  // 시간순 정렬
  Object.values(threads).forEach((arr) => arr.sort((a, b) => a.time - b.time));
  return threads;
}

function updateMsgBadge() {
  const count = getMsgs().filter(
    (m) => m.to === currentUser.id && !m.read,
  ).length;
  const b = document.getElementById("msgBadge");
  b.style.display = count ? "" : "none";
  b.textContent = count;
}

function setMsgAnon(anon) {
  msgSendAnon = anon;
  document.getElementById("msgAnonOff").classList.toggle("on", !anon);
  document.getElementById("msgAnonOn").classList.toggle("on", anon);
}

// 발신자 표시명: 익명이고 내가 수신자면 "익명", 그 외에는 실명
function senderLabel(m) {
  if (m.anon && m.from !== currentUser.id) return "익명";
  return m.fromName || m.from;
}

function renderMsgList() {
  const threads = getThreads();
  const list = document.getElementById("msgListItems");
  const emojis = ["👤", "📚", "🎮", "📝", "💬", "🎓", "🐼", "🦊"];
  const entries = Object.entries(threads);
  if (!entries.length) {
    list.innerHTML =
      '<div style="padding:30px;text-align:center;color:#ccc;font-size:14px">받은 쪽지가 없습니다</div>';
    return;
  }
  // 마지막 메시지 기준 내림차순
  entries.sort(
    (a, b) => b[1][b[1].length - 1].time - a[1][a[1].length - 1].time,
  );
  list.innerHTML = entries
    .map(([otherId, msgs], i) => {
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter(
        (m) => m.to === currentUser.id && !m.read,
      ).length;
      // 항상 상대방 userId를 기준으로 표시 (이름 중복 방지)
      // 익명 쪽지도 목록에선 userId만 노출 (수신자가 실제 발신자 확인 불가)
      const isSentByMe = last.from === currentUser.id;
      const displayName = isSentByMe
        ? `@${otherId}`
        : last.anon
          ? "익명"
          : `@${otherId}`;
      return `<div class="msg-list-item ${activeMsgThread === otherId ? "active" : ""}" onclick="openThread('${otherId}')">
      <div class="msg-avatar">${emojis[i % emojis.length]}</div>
      <div class="msg-list-info">
        <div class="msg-list-name">${escH(displayName)}</div>
        <div class="msg-list-preview">${escH(last.text)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
        <span class="msg-list-time">${timeAgo(last.time)}</span>
        ${unread ? `<div class="msg-unread-dot"></div>` : ""}
      </div>
    </div>`;
    })
    .join("");
}

function openThread(otherId) {
  activeMsgThread = otherId;
  const msgs = getMsgs();
  msgs
    .filter((m) => m.to === currentUser.id && m.from === otherId)
    .forEach((m) => (m.read = true));
  saveMsgs(msgs);
  renderMsgList();
  updateMsgBadge();

  const thread = getMsgs()
    .filter(
      (m) =>
        (m.from === currentUser.id && m.to === otherId) ||
        (m.from === otherId && m.to === currentUser.id),
    )
    .sort((a, b) => a.time - b.time);

  const received = thread.filter((m) => m.from === otherId);

  // 스레드 헤더: 항상 상대방 userId 기준
  const headerName = otherId;
  const headerAnonNote = received.some((m) => m.anon)
    ? ' <span style="font-size:11px;color:#aaa">(일부 익명)</span>'
    : "";

  const main = document.getElementById("msgMain");
  main.innerHTML = `
    <div class="msg-chat-head">
      <div class="msg-avatar" style="width:36px;height:36px;font-size:16px">👤</div>
      <h4>@${escH(headerName)}${headerAnonNote}</h4>
    </div>
    <div class="msg-chat-body" id="msgChatBody">
      ${thread
        .map((m) => {
          const isMe = m.from === currentUser.id;
          // 수신자 입장: 익명이면 '익명', 아니면 발신자 userId 표시
          const label = isMe ? "나" : m.anon ? "익명" : `@${m.from}`;
          return `<div class="msg-bubble-row ${isMe ? "me" : "other"}">
          ${!isMe ? `<span class="msg-bubble-name">${escH(label)}</span>` : ""}
          <div class="msg-bubble">${escH(m.text)}</div>
          <span class="msg-bubble-time">${timeAgo(m.time)}</span>
        </div>`;
        })
        .join("")}
    </div>
    <div class="msg-input-row">
      <input type="text" id="chatInput" placeholder="메시지를 입력하세요" onkeydown="if(event.key==='Enter')sendChatMsg()">
      <button onclick="sendChatMsg()">전송</button>
    </div>
  `;
  document.getElementById("msgChatBody").scrollTop = 99999;
}

function openComposeModal(toId) {
  msgSendAnon = false;
  document.getElementById("msgTo").value = toId || "";
  document.getElementById("msgContent").value = "";
  // 버튼이 DOM에 있을 때만 조작
  const off = document.getElementById("msgAnonOff");
  const on = document.getElementById("msgAnonOn");
  if (off) {
    off.classList.add("on");
    on.classList.remove("on");
  }
  openModal("composeModal");
}

function sendMsg() {
  const toId = document.getElementById("msgTo").value.trim();
  const text = document.getElementById("msgContent").value.trim();
  if (!toId || !text) {
    alert("받는 사람 아이디와 내용을 입력하세요");
    return;
  }
  // 수신자 존재 확인
  const users = LS.get("et_users") || {};
  if (!users[toId]) {
    alert(`아이디 "${toId}"인 사용자가 없습니다`);
    return;
  }
  if (toId === currentUser.id) {
    alert("자신에게는 쪽지를 보낼 수 없습니다");
    return;
  }
  const msgs = getMsgs();
  msgs.push({
    id: Date.now().toString(),
    from: currentUser.id,
    fromName: currentUser.name,
    to: toId,
    text,
    time: Date.now(),
    read: false,
    anon: msgSendAnon,
  });
  saveMsgs(msgs);
  closeModal("composeModal");
  renderMsgList();
  if (activeMsgThread === toId) openThread(toId);
  showToast("✉ 쪽지를 보냈습니다", "#1565c0");
}

function sendChatMsg() {
  if (!activeMsgThread) return;
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;
  const msgs = getMsgs();
  // 채팅창에서 보내는 건 항상 실명
  msgs.push({
    id: Date.now().toString(),
    from: currentUser.id,
    fromName: currentUser.name,
    to: activeMsgThread,
    text,
    time: Date.now(),
    read: false,
    anon: false,
  });
  saveMsgs(msgs);
  input.value = "";
  openThread(activeMsgThread);
}

// =========== BOOK MARKET ===========
let bookImgData = null;
let selectedCond = "S";
let currentBookId = null;

function getBooks() {
  return LS.get("et_books") || getDefaultBooks();
}
function saveBooks(arr) {
  LS.set("et_books", arr);
}

function getDefaultBooks() {
  const books = [
    {
      id: "b1",
      title: "Introduction to Algorithms",
      author: "CLRS / MIT Press",
      price: 25000,
      origPrice: 48000,
      cond: "A",
      seller: "익명의 판다",
      desc: "필기 거의 없음. 깨끗한 편.",
      img: null,
      sold: false,
      time: Date.now() - 86400000,
    },
    {
      id: "b2",
      title: "컴퓨터 구조와 원리",
      author: "백종문 / 한빛아카데미",
      price: 15000,
      origPrice: 32000,
      cond: "S",
      seller: "익명의 코뿔소",
      desc: "새 책처럼 깨끗합니다.",
      img: null,
      sold: false,
      time: Date.now() - 172800000,
    },
    {
      id: "b3",
      title: "운영체제",
      author: "Abraham Silberschatz / 퍼스트북",
      price: 18000,
      origPrice: 38000,
      cond: "B",
      seller: "익명의 호랑이",
      desc: "필기 있음. 중요한 부분 마킹됨.",
      img: null,
      sold: false,
      time: Date.now() - 259200000,
    },
    {
      id: "b4",
      title: "경제학원론",
      author: "맨큐 / 시그마프레스",
      price: 22000,
      origPrice: 45000,
      cond: "A",
      seller: "익명의 여우",
      desc: "깨끗합니다. 연습문제집도 같이 팝니다.",
      img: null,
      sold: false,
      time: Date.now() - 345600000,
    },
  ];
  saveBooks(books);
  return books;
}

const COND_COLORS = { S: "s", A: "a", B: "b", C: "c" };
const COND_LABELS = { S: "S(최상)", A: "A(상)", B: "B(중)", C: "C(하)" };

function renderMarket(view) {
  const container = document.getElementById("marketView");
  if (view === "detail") {
    const book = getBooks().find((b) => b.id === currentBookId);
    if (!book) {
      renderMarket();
      return;
    }
    const savings = book.origPrice - book.price;
    const savePct = Math.round((savings / book.origPrice) * 100);
    container.innerHTML = `
      <button class="bd-back" onclick="renderMarket()">← 목록으로</button>
      <div class="book-detail">
        <div class="bd-layout">
          <div>
            <div class="bd-img">${book.img ? `<img src="${book.img}">` : "📚"}</div>
            ${book.sold ? '<div style="text-align:center;margin-top:10px;color:var(--sub);font-weight:600">판매완료</div>' : ""}
          </div>
          <div class="bd-info">
            <h2>${escH(book.title)}</h2>
            <div class="bd-author">${escH(book.author)}</div>
            <div class="bd-price-row">
              <span class="bd-price">${book.price.toLocaleString()}원</span>
              <span class="bd-orig">${book.origPrice.toLocaleString()}원</span>
              <span style="font-size:13px;color:var(--red);font-weight:600">${savePct}% 할인</span>
            </div>
            <div class="bd-details">
              <div class="bd-row"><span class="bd-row-label">상태</span><span class="badge-cond book-cond ${COND_COLORS[book.cond]}">${COND_LABELS[book.cond]}</span></div>
              <div class="bd-row"><span class="bd-row-label">판매자</span><span>${book.seller}</span></div>
              <div class="bd-row"><span class="bd-row-label">등록일</span><span>${timeAgo(book.time)}</span></div>
              <div class="bd-row"><span class="bd-row-label">설명</span><span>${escH(book.desc)}</span></div>
            </div>
            <div class="bd-actions">
              ${!book.sold ? `<button class="btn-red" onclick="openComposeModal('${book.seller}')">✉ 쪽지 보내기</button>` : ""}
              ${book.seller === currentUser.name && !book.sold ? `<button class="btn-outline" onclick="markSold('${book.id}')">판매완료 처리</button>` : ""}
              ${book.seller === currentUser.name ? `<button class="btn-gray" onclick="deleteBook('${book.id}')">삭제</button>` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }
  const books = getBooks();
  container.innerHTML = `
    <div class="market-layout">
      <div class="market-top">
        <h2>중고책 마켓</h2>
        <button class="btn-red" onclick="openBookModal()">+ 책 판매하기</button>
      </div>
      <div class="market-filters">
        ${["전체", "판매중", "판매완료"].map((f) => `<div class="mf-chip ${f === "전체" ? "on" : ""}" onclick="filterMarket(this,'${f}')">${f}</div>`).join("")}
      </div>
      <div class="book-grid" id="bookGrid">
        ${renderBookGrid(books)}
      </div>
    </div>
  `;
}

function renderBookGrid(books) {
  return (
    books
      .map(
        (b) => `
    <div class="book-card" style="position:relative" onclick="viewBook('${b.id}')">
      <div class="book-img">${b.img ? `<img src="${b.img}">` : "📚"}</div>
      ${b.sold ? '<div class="book-sold">판매완료</div>' : ""}
      <div class="book-body">
        <div class="book-title">${escH(b.title)}</div>
        <div class="book-author">${escH(b.author)}</div>
        <div><span class="book-price">${b.price.toLocaleString()}원</span><span class="book-orig">${b.origPrice.toLocaleString()}원</span></div>
        <div class="book-meta">
          <span class="book-cond ${COND_COLORS[b.cond]}">${COND_LABELS[b.cond]}</span>
          <span class="book-seller">${b.seller}</span>
        </div>
      </div>
    </div>
  `,
      )
      .join("") ||
    '<div style="padding:40px;text-align:center;color:#aaa;grid-column:1/-1">등록된 책이 없습니다</div>'
  );
}

function filterMarket(el, f) {
  document
    .querySelectorAll(".mf-chip")
    .forEach((c) => c.classList.remove("on"));
  el.classList.add("on");
  let books = getBooks();
  if (f === "판매중") books = books.filter((b) => !b.sold);
  else if (f === "판매완료") books = books.filter((b) => b.sold);
  document.getElementById("bookGrid").innerHTML = renderBookGrid(books);
}

function viewBook(id) {
  currentBookId = id;
  renderMarket("detail");
}
function markSold(id) {
  const books = getBooks();
  books.find((b) => b.id === id).sold = true;
  saveBooks(books);
  renderMarket("detail");
}
function deleteBook(id) {
  if (!confirm("삭제하시겠습니까?")) return;
  saveBooks(getBooks().filter((b) => b.id !== id));
  renderMarket();
}

function setCond(el) {
  selectedCond = el.dataset.c;
  document
    .querySelectorAll(".cond-btn")
    .forEach((b) => b.classList.toggle("on", b.dataset.c === selectedCond));
}

function openBookModal() {
  bookImgData = null;
  selectedCond = "S";
  document
    .querySelectorAll(".cond-btn")
    .forEach((b) => b.classList.toggle("on", b.dataset.c === "S"));
  ["bTitle", "bAuthor", "bDesc"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("bPrice").value = "";
  document.getElementById("bOrigPrice").value = "";
  document.getElementById("bookImgZone").innerHTML =
    `<input type="file" id="bookImg" accept="image/*" onchange="previewBookImg(this)"><span>📚 클릭하여 사진 추가</span>`;
  openModal("bookModal");
}

function previewBookImg(input) {
  if (!input.files[0]) return;
  const r = new FileReader();
  r.onload = (e) => {
    bookImgData = e.target.result;
    document.getElementById("bookImgZone").innerHTML =
      `<img class="img-preview" src="${bookImgData}"><input type="file" id="bookImg" accept="image/*" onchange="previewBookImg(this)" style="position:absolute;inset:0;opacity:0;cursor:pointer">`;
  };
  r.readAsDataURL(input.files[0]);
}

function submitBook() {
  const title = document.getElementById("bTitle").value.trim();
  const author = document.getElementById("bAuthor").value.trim();
  const price = parseInt(document.getElementById("bPrice").value);
  const origPrice = parseInt(document.getElementById("bOrigPrice").value);
  if (!title || !author || !price || !origPrice) {
    alert("필수 항목을 입력하세요");
    return;
  }
  if (price > origPrice) {
    alert("판매가가 정가보다 높습니다");
    return;
  }
  const books = getBooks();
  books.unshift({
    id: Date.now().toString(),
    title,
    author,
    price,
    origPrice,
    cond: selectedCond,
    seller: currentUser.name,
    desc: document.getElementById("bDesc").value.trim(),
    img: bookImgData,
    sold: false,
    time: Date.now(),
  });
  saveBooks(books);
  closeModal("bookModal");
  renderMarket();
}

function renderProfile() {
  const posts = getPosts().filter((p) => p.author === currentUser.name).length;
  const commented = getPosts().filter((p) =>
    p.comments.some((c) => c.author === currentUser.name),
  ).length;
  const reviews = getReviews()
    .flatMap((r) => r.reviews)
    .filter((r) => r.author === currentUser.name).length;
  const books = getBooks().filter((b) => b.seller === currentUser.name).length;
  document.getElementById("profileView").innerHTML = `
    <div class="profile-layout">
      <div class="profile-card">
        <div class="profile-avatar">${currentUser.name[0]}</div>
        <div class="profile-name">${currentUser.name}</div>
        <div class="profile-school">${currentUser.school} · ${currentUser.dept} · ${currentUser.year || ""}</div>
        <div class="profile-stats">
          <div class="ps-item"><div class="ps-num">${posts}</div><div class="ps-label">게시글</div></div>
          <div class="ps-item"><div class="ps-num">${commented}</div><div class="ps-label">댓글</div></div>
          <div class="ps-item"><div class="ps-num">${reviews}</div><div class="ps-label">강의평가</div></div>
          <div class="ps-item"><div class="ps-num">${books}</div><div class="ps-label">판매글</div></div>
        </div>
        <button class="btn-red" style="width:100%;margin-top:8px" onclick="openProfileEdit()">프로필 수정</button>
      </div>
      <div class="profile-right">
        <div class="profile-section">
          <h3>내 정보</h3>
          <div class="setting-row"><span class="setting-label">아이디</span><span class="setting-val">${currentUser.id}</span></div>
          <div class="setting-row"><span class="setting-label">닉네임</span><span class="setting-val">${currentUser.name}</span><button class="setting-edit-btn" onclick="openProfileEdit()">수정</button></div>
          <div class="setting-row"><span class="setting-label">학교</span><span class="setting-val">${currentUser.school}</span></div>
          <div class="setting-row"><span class="setting-label">학과</span><span class="setting-val">${currentUser.dept}</span><button class="setting-edit-btn" onclick="openProfileEdit()">수정</button></div>
          <div class="setting-row"><span class="setting-label">학번</span><span class="setting-val">${currentUser.year || "-"}</span></div>
          <div class="setting-row"><span class="setting-label">MBTI</span><span class="setting-val">${currentUser.mbti ? `<span style="font-weight:700;padding:2px 10px;border-radius:10px;background:${MBTI_COLORS[currentUser.mbti] || "#888"};color:#fff">${currentUser.mbti}</span>` : "-"}</span><button class="setting-edit-btn" onclick="openProfileEdit()">수정</button></div>
        </div>
        <div class="profile-section">
          <h3>내 활동</h3>
          <div class="setting-row" style="cursor:pointer" onclick="goScreen('board');setBoard('내가쓴글')"><span class="setting-label">📝 내가 쓴 글</span><span class="setting-val">${posts}개</span><span>›</span></div>
          <div class="setting-row" style="cursor:pointer" onclick="goScreen('board');setBoard('내가댓글쓴글')"><span class="setting-label">💬 댓글 단 글</span><span class="setting-val">${commented}개</span><span>›</span></div>
          <div class="setting-row" style="cursor:pointer" onclick="goScreen('review')"><span class="setting-label">⭐ 강의평가</span><span class="setting-val">${reviews}개</span><span>›</span></div>
          <div class="setting-row" style="cursor:pointer" onclick="goScreen('market')"><span class="setting-label">📚 판매중인 책</span><span class="setting-val">${books}개</span><span>›</span></div>
        </div>
      </div>
    </div>
  `;
}

function openProfileEdit() {
  document.getElementById("editName").value = currentUser.name;
  document.getElementById("editPw").value = "";
  document.getElementById("editDept").value = currentUser.dept || "";
  document.getElementById("editYear").value = currentUser.year || "";
  document.getElementById("editMbti").value = currentUser.mbti || "";
  openModal("profileModal");
}

function saveProfile() {
  const name = document.getElementById("editName").value.trim();
  const pw = document.getElementById("editPw").value;
  const mbti = document.getElementById("editMbti").value;
  const dept = document.getElementById("editDept").value;
  const year = document.getElementById("editYear").value;
  if (!name) {
    alert("닉네임을 입력하세요");
    return;
  }
  const users = LS.get("et_users") || {};
  users[currentUser.id].name = name;
  users[currentUser.id].mbti = mbti;
  users[currentUser.id].dept = dept;
  users[currentUser.id].year = year;
  if (pw) users[currentUser.id].pw = pw;
  LS.set("et_users", users);
  currentUser.name = name;
  currentUser.mbti = mbti;
  currentUser.dept = dept;
  currentUser.year = year;
  if (pw) currentUser.pw = pw;
  document.getElementById("topName").textContent = name;
  document.getElementById("topAvatar").textContent = name[0];
  document.getElementById("sideDept").textContent = dept || mbti || "";
  closeModal("profileModal");
  renderProfile();
}

// =========== NAV ===========
const screenRenderMap = {
  board: () => renderBoard("list"),
  review: () => renderReviews(),
  msg: () => {
    renderMsgList();
    activeMsgThread = null;
    document.getElementById("msgMain").innerHTML =
      `<div class="msg-empty-state"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><p>쪽지를 선택하세요</p></div>`;
  },
  market: () => renderMarket(),
  profile: () => renderProfile(),
  tt: () => buildTT(),
};

function goScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((n) => {
    if (
      n.getAttribute("onclick") &&
      n.getAttribute("onclick").includes(`'${id}'`)
    )
      n.classList.add("active");
  });
  if (screenRenderMap[id]) screenRenderMap[id]();
}

// =========== MODAL ===========
function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}
document.querySelectorAll(".modal-bg").forEach((m) =>
  m.addEventListener("click", (e) => {
    if (e.target === m) m.classList.remove("open");
  }),
);

// =========== UTILS ===========
function escH(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function timeAgo(t) {
  const diff = Date.now() - t;
  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return Math.floor(diff / 60000) + "분 전";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "시간 전";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "일 전";
  return new Date(t).toLocaleDateString("ko-KR");
}

// Init time selects on load
buildTimeSelects(9, 10.5);
