"use strict";

/* ============================================================
   QUẢN LÝ DỰ THU - MANAGER.JS
   BẢN ỔN ĐỊNH

   - Supabase Auth email/password
   - Đăng nhập
   - Đăng xuất
   - Kiểm tra session
   - Lọc User
   - Lọc ngày
   - Tự loại CIF trùng
   - Giữ bản ghi mới nhất
   - Thống kê
   - Phân trang 20 dòng
   - Sửa
   - Xóa
   - Xuất Excel
============================================================ */


/* ============================================================
   BIẾN TOÀN CỤC
============================================================ */

let client = null;

let currentPage = 1;

const pageSize = 20;

let allData = [];

let filteredData = [];


/* ============================================================
   DOM
============================================================ */

let emailInput = null;
let passwordInput = null;

let loginBtn = null;
let logoutBtn = null;

let loginBox = null;
let managerBox = null;

let loginMessage = null;
let managerMessage = null;

let filterUser = null;
let filterDate = null;

let filterBtn = null;
let refreshBtn = null;
let exportBtn = null;

let tableBody = null;

let totalCustomers = null;
let totalAmount = null;

let prevPageBtn = null;
let nextPageBtn = null;
let pageInfo = null;


/* ============================================================
   HIỂN THỊ THÔNG BÁO LOGIN
============================================================ */

function showLoginMessage(message, type = "error") {

  if (!loginMessage) return;

  loginMessage.textContent = message;

  if (type === "success") {

    loginMessage.style.color = "#15803d";

  } else if (type === "loading") {

    loginMessage.style.color = "#2563eb";

  } else {

    loginMessage.style.color = "#dc2626";

  }
}


/* ============================================================
   HIỂN THỊ THÔNG BÁO MANAGER
============================================================ */

function showManagerMessage(message, type = "success") {

  if (!managerMessage) return;

  managerMessage.textContent = message;

  if (type === "error") {

    managerMessage.style.color = "#dc2626";

  } else if (type === "loading") {

    managerMessage.style.color = "#2563eb";

  } else {

    managerMessage.style.color = "#15803d";

  }
}


/* ============================================================
   KHỞI TẠO DOM
============================================================ */

function initDOM() {

  emailInput =
    document.getElementById("email");

  passwordInput =
    document.getElementById("password");

  loginBtn =
    document.getElementById("loginBtn");

  logoutBtn =
    document.getElementById("logoutBtn");

  loginBox =
    document.getElementById("loginBox");

  managerBox =
    document.getElementById("managerBox");

  loginMessage =
    document.getElementById("loginMessage");

  managerMessage =
    document.getElementById("managerMessage");

  filterUser =
    document.getElementById("filterUser");

  filterDate =
    document.getElementById("filterDate");

  filterBtn =
    document.getElementById("filterBtn");

  refreshBtn =
    document.getElementById("refreshBtn");

  exportBtn =
    document.getElementById("exportBtn");

  tableBody =
    document.getElementById("tableBody");

  totalCustomers =
    document.getElementById("totalCustomers");

  totalAmount =
    document.getElementById("totalAmount");

  prevPageBtn =
    document.getElementById("prevPageBtn");

  nextPageBtn =
    document.getElementById("nextPageBtn");

  pageInfo =
    document.getElementById("pageInfo");


  /* ==========================================================
     KIỂM TRA DOM
  ========================================================== */

  if (!loginBtn) {
    console.error("Không tìm thấy loginBtn");
    return false;
  }

  if (!emailInput) {
    console.error("Không tìm thấy email");
    return false;
  }

  if (!passwordInput) {
    console.error("Không tìm thấy password");
    return false;
  }


  /* ==========================================================
     SỰ KIỆN
  ========================================================== */

  loginBtn.addEventListener(
    "click",
    function () {

      login();

    }
  );


  passwordInput.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Enter") {

        event.preventDefault();

        login();

      }

    }
  );


  if (logoutBtn) {

    logoutBtn.addEventListener(
      "click",
      function () {

        logout();

      }
    );

  }


  if (filterBtn) {

    filterBtn.addEventListener(
      "click",
      function () {

        currentPage = 1;

        applyFilters();

      }
    );

  }


  if (refreshBtn) {

    refreshBtn.addEventListener(
      "click",
      function () {

        refreshData();

      }
    );

  }


  if (exportBtn) {

    exportBtn.addEventListener(
      "click",
      function () {

        exportExcel();

      }
    );

  }


  if (prevPageBtn) {

    prevPageBtn.addEventListener(
      "click",
      function () {

        if (currentPage > 1) {

          currentPage--;

          renderTable();

        }

      }
    );

  }


  if (nextPageBtn) {

    nextPageBtn.addEventListener(
      "click",
      function () {

        const totalPages =
          Math.max(
            1,
            Math.ceil(
              filteredData.length / pageSize
            )
          );

        if (currentPage < totalPages) {

          currentPage++;

          renderTable();

        }

      }
    );

  }


  return true;
}


/* ============================================================
   KHỞI TẠO SUPABASE
============================================================ */

function initSupabase() {

  try {

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {

      console.error(
        "Supabase JS chưa được tải"
      );

      showLoginMessage(
        "❌ Không tải được Supabase. Hãy tải lại trang.",
        "error"
      );

      return false;

    }


    const url =
      window.SUPABASE_URL ||
      window.supabaseUrl ||
      "";


    const key =
      window.SUPABASE_ANON_KEY ||
      window.supabaseAnonKey ||
      window.SUPABASE_PUBLISHABLE_KEY ||
      "";


    if (!url) {

      console.error(
        "Thiếu SUPABASE_URL"
      );

      showLoginMessage(
        "❌ Thiếu SUPABASE_URL trong config.js",
        "error"
      );

      return false;

    }


    if (!key) {

      console.error(
        "Thiếu SUPABASE_ANON_KEY"
      );

      showLoginMessage(
        "❌ Thiếu SUPABASE_ANON_KEY trong config.js",
        "error"
      );

      return false;

    }


    client =
      window.supabase.createClient(
        url,
        key
      );


    console.log(
      "Supabase đã khởi tạo"
    );


    return true;

  } catch (error) {

    console.error(
      "Lỗi init Supabase:",
      error
    );

    showLoginMessage(
      "❌ Không thể kết nối Supabase.",
      "error"
    );

    return false;

  }

}


/* ============================================================
   ĐĂNG NHẬP
============================================================ */

async function login() {

  console.log(
    "Nút ĐĂNG NHẬP đã được bấm"
  );


  if (!emailInput || !passwordInput) {

    showLoginMessage(
      "❌ Không tìm thấy ô đăng nhập.",
      "error"
    );

    return;

  }


  const email =
    String(
      emailInput.value || ""
    ).trim();


  const password =
    String(
      passwordInput.value || ""
    );


  /* ==========================================================
     KIỂM TRA INPUT
  ========================================================== */

  if (!email) {

    showLoginMessage(
      "⚠️ Vui lòng nhập email.",
      "error"
    );

    emailInput.focus();

    return;

  }


  if (!password) {

    showLoginMessage(
      "⚠️ Vui lòng nhập mật khẩu.",
      "error"
    );

    passwordInput.focus();

    return;

  }


  /* ==========================================================
     KHỞI TẠO SUPABASE NẾU CHƯA CÓ
  ========================================================== */

  if (!client) {

    const ok =
      initSupabase();

    if (!ok) {

      return;

    }

  }


  /* ==========================================================
     KHÓA NÚT
  ========================================================== */

  if (loginBtn) {

    loginBtn.disabled = true;

    loginBtn.textContent =
      "⏳ ĐANG ĐĂNG NHẬP...";

  }


  showLoginMessage(
    "⏳ Đang kiểm tra tài khoản...",
    "loading"
  );


  try {

    console.log(
      "Đang đăng nhập:",
      email
    );


    const {
      data,
      error
    } =
      await client.auth.signInWithPassword({

        email: email,

        password: password

      });


    /* ========================================================
       LỖI SUPABASE
    ======================================================== */

    if (error) {

      console.error(
        "Supabase login error:",
        error
      );


      let message =
        error.message ||
        "Đăng nhập thất bại.";


      if (
        message
          .toLowerCase()
          .includes("invalid login credentials")
      ) {

        message =
          "❌ Email hoặc mật khẩu không đúng.";

      }


      if (
        message
          .toLowerCase()
          .includes("email not confirmed")
      ) {

        message =
          "❌ Email chưa được xác nhận trong Supabase Auth.";

      }


      showLoginMessage(
        message,
        "error"
      );


      return;

    }


    /* ========================================================
       KIỂM TRA USER
    ======================================================== */

    if (!data || !data.user) {

      showLoginMessage(
        "❌ Không nhận được thông tin tài khoản.",
        "error"
      );

      return;

    }


    console.log(
      "Đăng nhập thành công:",
      data.user.email
    );


    showLoginMessage(
      "✅ Đăng nhập thành công!",
      "success"
    );


    /* ========================================================
       HIỆN TRANG QUẢN LÝ
    ======================================================== */

    setTimeout(
      function () {

        if (loginBox) {

          loginBox.style.display =
            "none";

        }


        if (managerBox) {

          managerBox.style.display =
            "block";

        }


        currentPage = 1;

        loadData();

      },
      300
    );


  } catch (error) {

    console.error(
      "Login exception:",
      error
    );


    showLoginMessage(
      "❌ Có lỗi khi đăng nhập: " +
      (error.message || error),
      "error"
    );

  } finally {

    if (loginBtn) {

      loginBtn.disabled = false;

      loginBtn.textContent =
        "🔐 ĐĂNG NHẬP";

    }

  }

}


/* ============================================================
   GẮN LOGIN RA WINDOW

   Quan trọng:
   HTML đang dùng:
   onclick="window.login()"
============================================================ */

window.login = login;


/* ============================================================
   KIỂM TRA SESSION
============================================================ */

async function checkSession() {

  if (!client) {

    return;

  }


  try {

    const {
      data,
      error
    } =
      await client.auth.getSession();


    if (error) {

      console.error(
        "Session error:",
        error
      );

      return;

    }


    const session =
      data?.session;


    if (session) {

      console.log(
        "Đã có session:",
        session.user?.email
      );


      if (loginBox) {

        loginBox.style.display =
          "none";

      }


      if (managerBox) {

        managerBox.style.display =
          "block";

      }


      loadData();

    } else {

      console.log(
        "Chưa có session"
      );

    }

  } catch (error) {

    console.error(
      "Check session error:",
      error
    );

  }

}


/* ============================================================
   ĐĂNG XUẤT
============================================================ */

async function logout() {

  try {

    if (!client) {

      return;

    }


    const {
      error
    } =
      await client.auth.signOut();


    if (error) {

      console.error(
        "Logout error:",
        error
      );

      showManagerMessage(
        "❌ Đăng xuất thất bại.",
        "error"
      );

      return;

    }


    allData = [];

    filteredData = [];

    currentPage = 1;


    if (managerBox) {

      managerBox.style.display =
        "none";

    }


    if (loginBox) {

      loginBox.style.display =
        "block";

    }


    if (passwordInput) {

      passwordInput.value = "";

    }


    if (tableBody) {

      tableBody.innerHTML = "";

    }


    showLoginMessage(
      "✅ Đã đăng xuất.",
      "success"
    );


  } catch (error) {

    console.error(
      "Logout exception:",
      error
    );

  }

}


/* ============================================================
   LOAD DATA
============================================================ */

async function loadData() {

  if (!client) {

    showManagerMessage(
      "❌ Chưa kết nối Supabase.",
      "error"
    );

    return;

  }


  showManagerMessage(
    "⏳ Đang tải dữ liệu...",
    "loading"
  );


  try {

    const {
      data,
      error
    } =
      await client
        .from("du_thu")
        .select("*")
        .order(
          "payment_date",
          {
            ascending: false
          }
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Load data error:",
        error
      );


      showManagerMessage(
        "❌ Không tải được dữ liệu: " +
        error.message,
        "error"
      );

      return;

    }


    allData =
      Array.isArray(data)
        ? data
        : [];


    /* ========================================================
       LOẠI CIF TRÙNG
    ======================================================== */

    allData =
      dedupeByCIF(allData);


    currentPage = 1;


    applyFilters();


    showManagerMessage(
      "✅ Đã cập nhật dữ liệu.",
      "success"
    );


  } catch (error) {

    console.error(
      "Load data exception:",
      error
    );


    showManagerMessage(
      "❌ Có lỗi khi tải dữ liệu.",
      "error"
    );

  }

}


/* ============================================================
   LOẠI CIF TRÙNG

   Giữ:
   - payment_date mới nhất
   - nếu cùng ngày thì created_at mới nhất
============================================================ */

function dedupeByCIF(data) {

  const map =
    new Map();


  for (const row of data) {

    const cif =
      String(
        row.cif ?? ""
      ).trim();


    /* Không có CIF thì không gộp */
    if (!cif) {

      const uniqueKey =
        "__NO_CIF__" +
        String(
          row.id ??
          Math.random()
        );

      map.set(
        uniqueKey,
        row
      );

      continue;

    }


    const old =
      map.get(cif);


    if (!old) {

      map.set(
        cif,
        row
      );

      continue;

    }


    const newDate =
      new Date(
        row.payment_date ||
        0
      ).getTime();


    const oldDate =
      new Date(
        old.payment_date ||
        0
      ).getTime();


    if (newDate > oldDate) {

      map.set(
        cif,
        row
      );

      continue;

    }


    if (newDate === oldDate) {

      const newCreated =
        new Date(
          row.created_at ||
          0
        ).getTime();


      const oldCreated =
        new Date(
          old.created_at ||
          0
        ).getTime();


      if (newCreated > oldCreated) {

        map.set(
          cif,
          row
        );

      }

    }

  }


  return Array.from(
    map.values()
  );

}


/* ============================================================
   LỌC DỮ LIỆU
============================================================ */

function applyFilters() {

  const userKeyword =
    String(
      filterUser?.value || ""
    )
      .trim()
      .toLowerCase();


  const selectedDate =
    String(
      filterDate?.value || ""
    ).trim();


  filteredData =
    allData.filter(
      function (row) {

        /* ======================
           LỌC USER
        ====================== */

        if (userKeyword) {

          const user =
            String(
              row.user_name ?? ""
            )
              .trim()
              .toLowerCase();


          if (
            !user.includes(
              userKeyword
            )
          ) {

            return false;

          }

        }


        /* ======================
           LỌC NGÀY
        ====================== */

        if (selectedDate) {

          const rowDate =
            normalizeDate(
              row.payment_date
            );


          if (
            rowDate !== selectedDate
          ) {

            return false;

          }

        }


        return true;

      }
    );


  updateStats();

  renderTable();

}


/* ============================================================
   CHUẨN HÓA NGÀY
============================================================ */

function normalizeDate(value) {

  if (!value) {

    return "";

  }


  const text =
    String(value);


  /*
    Nếu đã là:
    YYYY-MM-DD
  */

  if (
    /^\d{4}-\d{2}-\d{2}$/
      .test(text)
  ) {

    return text;

  }


  /*
    Nếu là timestamp ISO
  */

  if (
    /^\d{4}-\d{2}-\d{2}T/
      .test(text)
  ) {

    return text.substring(
      0,
      10
    );

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");


  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


  return (
    year +
    "-" +
    month +
    "-" +
    day
  );

}


/* ============================================================
   ĐỊNH DẠNG NGÀY DD/MM/YYYY
============================================================ */

function formatDate(value) {

  if (!value) {

    return "";

  }


  const dateText =
    normalizeDate(value);


  if (!dateText) {

    return "";

  }


  const parts =
    dateText.split("-");


  if (parts.length !== 3) {

    return dateText;

  }


  return (
    parts[2] +
    "/" +
    parts[1] +
    "/" +
    parts[0]
  );

}


/* ============================================================
   ĐỊNH DẠNG TIỀN
============================================================ */

function parseAmount(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return 0;

  }


  if (
    typeof value === "number"
  ) {

    return value;

  }


  let text =
    String(value)
      .trim();


  text =
    text.replace(
      /,/g,
      ""
    );


  text =
    text.replace(
      /\./g,
      ""
    );


  text =
    text.replace(
      /[^0-9.-]/g,
      ""
    );


  const number =
    Number(text);


  return Number.isFinite(number)
    ? number
    : 0;

}


/* ============================================================
   FORMAT TIỀN HIỂN THỊ
============================================================ */

function formatMoney(value) {

  const number =
    parseAmount(value);


  return (
    new Intl.NumberFormat(
      "vi-VN"
    ).format(number) +
    " đ"
  );

}


/* ============================================================
   CẬP NHẬT THỐNG KÊ
============================================================ */

function updateStats() {

  if (totalCustomers) {

    totalCustomers.textContent =
      filteredData.length.toLocaleString(
        "vi-VN"
      );

  }


  const total =
    filteredData.reduce(
      function (sum, row) {

        return (
          sum +
          parseAmount(
            row.amount
          )
        );

      },
      0
    );


  if (totalAmount) {

    totalAmount.textContent =
      formatMoney(total);

  }

}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* ============================================================
   RENDER TABLE
============================================================ */

function renderTable() {

  if (!tableBody) {

    return;

  }


  tableBody.innerHTML = "";


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredData.length /
        pageSize
      )
    );


  if (
    currentPage >
    totalPages
  ) {

    currentPage =
      totalPages;

  }


  const start =
    (currentPage - 1) *
    pageSize;


  const end =
    start + pageSize;


  const pageData =
    filteredData.slice(
      start,
      end
    );


  /* ========================================================
     KHÔNG CÓ DỮ LIỆU
  ======================================================== */

  if (
    pageData.length === 0
  ) {

    const tr =
      document.createElement(
        "tr"
      );


    tr.innerHTML = `
      <td
        colspan="8"
        style="
          text-align:center;
          padding:25px;
          color:#64748b;
        "
      >
        📭 Không có dữ liệu
      </td>
    `;


    tableBody.appendChild(tr);

  }


  /* ========================================================
     HIỂN THỊ DỮ LIỆU
  ======================================================== */

  pageData.forEach(
    function (row) {

      const tr =
        document.createElement(
          "tr"
        );


      const id =
        row.id ?? "";


      tr.innerHTML = `

        <td>
          ${escapeHTML(
            row.user_name
          )}
        </td>

        <td>
          ${escapeHTML(
            row.cif
          )}
        </td>

        <td>
          ${escapeHTML(
            row.customer_name
          )}
        </td>

        <td>
          ${formatMoney(
            row.amount
          )}
        </td>

        <td>
          ${formatDate(
            row.payment_date
          )}
        </td>

        <td>
          ${escapeHTML(
            row.phone
          )}
        </td>

        <td>
          ${escapeHTML(
            row.note
          )}
        </td>

        <td>
          <div class="action-wrap">

            <button
              type="button"
              class="edit-btn"
              data-id="${escapeHTML(id)}"
              title="Sửa"
            >
              ✏️
            </button>

            <button
              type="button"
              class="delete-btn"
              data-id="${escapeHTML(id)}"
              title="Xóa"
            >
              🗑️
            </button>

          </div>
        </td>

      `;


      /* ======================================================
         NÚT SỬA
      ====================================================== */

      const editButton =
        tr.querySelector(
          ".edit-btn"
        );


      if (editButton) {

        editButton.addEventListener(
          "click",
          function () {

            editRow(row);

          }
        );

      }


      /* ======================================================
         NÚT XÓA
      ====================================================== */

      const deleteButton =
        tr.querySelector(
          ".delete-btn"
        );


      if (deleteButton) {

        deleteButton.addEventListener(
          "click",
          function () {

            deleteRow(row);

          }
        );

      }


      tableBody.appendChild(tr);

    }
  );


  updatePagination(
    totalPages
  );

}


/* ============================================================
   PHÂN TRANG
============================================================ */

function updatePagination(
  totalPages
) {

  if (pageInfo) {

    pageInfo.textContent =
      `Trang ${currentPage} / ${totalPages}`;

  }


  if (prevPageBtn) {

    prevPageBtn.disabled =
      currentPage <= 1;

  }


  if (nextPageBtn) {

    nextPageBtn.disabled =
      currentPage >= totalPages;

  }

}


/* ============================================================
   XÓA DỮ LIỆU
============================================================ */

async function deleteRow(row) {

  if (!client) {

    return;

  }


  const customerName =
    row.customer_name ||
    "khách hàng";


  const confirmed =
    confirm(
      "Bạn có chắc muốn xóa dự thu của:\n\n" +
      customerName +
      "\n\nCIF: " +
      (row.cif || "") +
      "\n\nKhông thể hoàn tác."
    );


  if (!confirmed) {

    return;

  }


  showManagerMessage(
    "⏳ Đang xóa dữ liệu...",
    "loading"
  );


  try {

    const {
      error
    } =
      await client
        .from("du_thu")
        .delete()
        .eq(
          "id",
          row.id
        );


    if (error) {

      console.error(
        "Delete error:",
        error
      );


      showManagerMessage(
        "❌ Xóa thất bại: " +
        error.message,
        "error"
      );

      return;

    }


    showManagerMessage(
      "✅ Đã xóa dữ liệu.",
      "success"
    );


    await loadData();


  } catch (error) {

    console.error(
      "Delete exception:",
      error
    );


    showManagerMessage(
      "❌ Có lỗi khi xóa dữ liệu.",
      "error"
    );

  }

}


/* ============================================================
   SỬA DỮ LIỆU
============================================================ */

async function editRow(row) {

  if (!client) {

    return;

  }


  const customerName =
    prompt(
      "Tên khách hàng:",
      row.customer_name || ""
    );


  if (customerName === null) {

    return;

  }


  const amountText =
    prompt(
      "Số tiền dự thu:",
      formatNumberForInput(
        row.amount
      )
    );


  if (amountText === null) {

    return;

  }


  const paymentDate =
    prompt(
      "Ngày thanh toán (YYYY-MM-DD):",
      normalizeDate(
        row.payment_date
      )
    );


  if (paymentDate === null) {

    return;

  }


  const phone =
    prompt(
      "Số điện thoại:",
      row.phone || ""
    );


  if (phone === null) {

    return;

  }


  const note =
    prompt(
      "Ghi chú:",
      row.note || ""
    );


  if (note === null) {

    return;

  }


  const amount =
    parseAmount(
      amountText
    );


  if (!Number.isFinite(amount)) {

    alert(
      "Số tiền không hợp lệ."
    );

    return;

  }


  if (
    paymentDate &&
    !/^\d{4}-\d{2}-\d{2}$/
      .test(paymentDate)
  ) {

    alert(
      "Ngày phải có dạng YYYY-MM-DD."
    );

    return;

  }


  showManagerMessage(
    "⏳ Đang cập nhật...",
    "loading"
  );


  try {

    const {
      error
    } =
      await client
        .from("du_thu")
        .update({

          customer_name:
            customerName.trim(),

          amount:
            amount,

          payment_date:
            paymentDate || null,

          phone:
            phone.trim(),

          note:
            note.trim()

        })
        .eq(
          "id",
          row.id
        );


    if (error) {

      console.error(
        "Update error:",
        error
      );


      showManagerMessage(
        "❌ Cập nhật thất bại: " +
        error.message,
        "error"
      );

      return;

    }


    showManagerMessage(
      "✅ Cập nhật thành công.",
      "success"
    );


    await loadData();


  } catch (error) {

    console.error(
      "Update exception:",
      error
    );


    showManagerMessage(
      "❌ Có lỗi khi cập nhật.",
      "error"
    );

  }

}


/* ============================================================
   FORMAT SỐ ĐỂ HIỂN THỊ TRONG PROMPT
============================================================ */

function formatNumberForInput(
  value
) {

  const number =
    parseAmount(value);


  return String(
    number
  );

}


/* ============================================================
   LÀM MỚI
============================================================ */

async function refreshData() {

  if (filterUser) {

    filterUser.value = "";

  }


  if (filterDate) {

    filterDate.value = "";

  }


  currentPage = 1;


  await loadData();

}


/* ============================================================
   XUẤT EXCEL
============================================================ */

function exportExcel() {

  if (
    typeof XLSX === "undefined"
  ) {

    alert(
      "❌ Thư viện Excel chưa được tải."
    );

    return;

  }


  if (
    filteredData.length === 0
  ) {

    alert(
      "Không có dữ liệu để xuất Excel."
    );

    return;

  }


  try {

    /* ========================================================
       SHEET DỮ LIỆU
    ======================================================== */

    const excelData =
      filteredData.map(
        function (row) {

          return {

            "User":
              row.user_name || "",

            "Số CIF":
              row.cif || "",

            "Tên Khách hàng":
              row.customer_name || "",

            "Số tiền dự thu":
              parseAmount(
                row.amount
              ),

            "Ngày thanh toán":
              formatDate(
                row.payment_date
              ),

            "SĐT":
              row.phone || "",

            "Ghi chú":
              row.note || ""

          };

        }
      );


    /* ========================================================
       TẠO WORKBOOK
    ======================================================== */

    const workbook =
      XLSX.utils.book_new();


    /* ========================================================
       SHEET 1
    ======================================================== */

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );


    /* ========================================================
       ĐỘ RỘNG CỘT
    ======================================================== */

    worksheet["!cols"] = [

      {
        wch: 18
      },

      {
        wch: 16
      },

      {
        wch: 30
      },

      {
        wch: 20
      },

      {
        wch: 18
      },

      {
        wch: 16
      },

      {
        wch: 40
      }

    ];


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Du Thu"
    );


    /* ========================================================
       SHEET TỔNG QUAN
    ======================================================== */

    const total =
      filteredData.reduce(
        function (sum, row) {

          return (
            sum +
            parseAmount(
              row.amount
            )
          );

        },
        0
      );


    const summaryData = [

      [
        "BÁO CÁO DỰ THU"
      ],

      [],

      [
        "Tổng khách hàng",
        filteredData.length
      ],

      [
        "Tổng dự thu",
        total
      ],

      [],

      [
        "Ngày xuất",
        formatDate(
          new Date()
        )
      ]

    ];


    const summarySheet =
      XLSX.utils.aoa_to_sheet(
        summaryData
      );


    summarySheet["!cols"] = [

      {
        wch: 25
      },

      {
        wch: 25
      }

    ];


    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Tong Quan"
    );


    /* ========================================================
       TÊN FILE
    ======================================================== */

    const today =
      new Date();


    const year =
      today.getFullYear();


    const month =
      String(
        today.getMonth() + 1
      ).padStart(2, "0");


    const day =
      String(
        today.getDate()
      ).padStart(2, "0");


    const filename =
      `Bao_Cao_Du_Thu_${day}-${month}-${year}.xlsx`;


    /* ========================================================
       XUẤT FILE
    ======================================================== */

    XLSX.writeFile(
      workbook,
      filename,
      {
        bookType: "xlsx",
        compression: false,
        bookSST: false
      }
    );


    showManagerMessage(
      "✅ Đã xuất Excel thành công.",
      "success"
    );


  } catch (error) {

    console.error(
      "Export Excel error:",
      error
    );


    alert(
      "❌ Xuất Excel thất bại:\n" +
      error.message
    );

  }

}


/* ============================================================
   KHỞI ĐỘNG APP
============================================================ */

async function startApp() {

  console.log(
    "🚀 Bắt đầu khởi động Quản Lý Dự Thu..."
  );


  /* ==========================================================
     1. DOM
  ========================================================== */

  const domOK =
    initDOM();


  if (!domOK) {

    console.error(
      "❌ DOM không đầy đủ."
    );

    return;

  }


  /* ==========================================================
     2. SUPABASE
  ========================================================== */

  const supabaseOK =
    initSupabase();


  if (!supabaseOK) {

    return;

  }


  /* ==========================================================
     3. SESSION
  ========================================================== */

  await checkSession();


  console.log(
    "✅ App đã khởi động xong."
  );

}


/* ============================================================
   CHẠY APP

   Vì manager.js đang dùng DEFER nên DOM đã sẵn sàng.
============================================================ */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );

} else {

  startApp();

}
