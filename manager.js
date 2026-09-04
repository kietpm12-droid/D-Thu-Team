// =====================================================
// QUẢN LÝ DỰ THU - MANAGER.JS
// Phân trang 20 dòng / trang
// Không ảnh hưởng app.js của cán bộ
// =====================================================


// ===============================
// KHỞI TẠO SUPABASE
// ===============================

if (!window.supabase) {
  alert("❌ Không tải được Supabase.");
  throw new Error("Supabase library chưa được tải.");
}

const SUPABASE_URL_VALUE =
  typeof SUPABASE_URL !== "undefined"
    ? SUPABASE_URL
    : window.SUPABASE_URL;

const SUPABASE_KEY_VALUE =
  typeof SUPABASE_ANON_KEY !== "undefined"
    ? SUPABASE_ANON_KEY
    : window.SUPABASE_ANON_KEY;

if (!SUPABASE_URL_VALUE || !SUPABASE_KEY_VALUE) {
  alert("❌ Chưa cấu hình Supabase. Kiểm tra config.js.");
  throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY.");
}

const db = supabase.createClient(
  SUPABASE_URL_VALUE,
  SUPABASE_KEY_VALUE
);


// ===============================
// BIẾN
// ===============================

let allData = [];
let filteredData = [];

let currentPage = 1;

const PAGE_SIZE = 20;


// ===============================
// LẤY ELEMENT
// ===============================

const loginBox = document.getElementById("loginBox");
const managerBox = document.getElementById("managerBox");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const loginMessage = document.getElementById("loginMessage");
const managerMessage = document.getElementById("managerMessage");

const totalCustomers = document.getElementById("totalCustomers");
const totalAmount = document.getElementById("totalAmount");

const filterUser = document.getElementById("filterUser");
const filterDate = document.getElementById("filterDate");

const filterBtn = document.getElementById("filterBtn");
const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");

const tableBody = document.getElementById("tableBody");
const pagination = document.getElementById("pagination");


// ===============================
// KHỞI ĐỘNG
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

  loginBtn?.addEventListener("click", login);

  passwordInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      login();
    }
  });

  logoutBtn?.addEventListener("click", logout);

  filterBtn?.addEventListener("click", () => {
    currentPage = 1;
    applyFilter();
  });

  refreshBtn?.addEventListener("click", async () => {
    currentPage = 1;
    await loadData();
  });

  exportBtn?.addEventListener("click", exportExcel);

  filterUser?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      currentPage = 1;
      applyFilter();
    }
  });

  filterDate?.addEventListener("change", () => {
    currentPage = 1;
    applyFilter();
  });


  // Kiểm tra phiên đăng nhập
  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error(error);
    return;
  }

  if (data?.session) {

    loginBox.style.display = "none";
    managerBox.style.display = "block";

    await loadData();

  } else {

    loginBox.style.display = "block";
    managerBox.style.display = "none";

  }

});


// ===============================
// ĐĂNG NHẬP
// ===============================

async function login() {

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {

    loginMessage.textContent =
      "❌ Vui lòng nhập email và mật khẩu.";

    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "⏳ ĐANG ĐĂNG NHẬP...";

  loginMessage.textContent = "";

  const { data, error } =
    await db.auth.signInWithPassword({
      email,
      password
    });

  loginBtn.disabled = false;
  loginBtn.textContent = "🔐 ĐĂNG NHẬP";


  if (error) {

    console.error(error);

    loginMessage.textContent =
      "❌ Đăng nhập thất bại: " + error.message;

    return;
  }


  if (!data?.session) {

    loginMessage.textContent =
      "❌ Không tạo được phiên đăng nhập.";

    return;
  }


  loginMessage.textContent = "";

  loginBox.style.display = "none";
  managerBox.style.display = "block";

  currentPage = 1;

  await loadData();
}


// ===============================
// ĐĂNG XUẤT
// ===============================

async function logout() {

  await db.auth.signOut();

  allData = [];
  filteredData = [];

  currentPage = 1;

  tableBody.innerHTML = "";
  pagination.innerHTML = "";

  totalCustomers.textContent = "0";
  totalAmount.textContent = "0 đ";

  managerBox.style.display = "none";
  loginBox.style.display = "block";

  passwordInput.value = "";

  loginMessage.textContent = "";
  managerMessage.textContent = "";
}


// ===============================
// TẢI DỮ LIỆU
// ===============================

async function loadData() {

  managerMessage.textContent =
    "⏳ Đang tải dữ liệu...";

  const { data, error } = await db
    .from("du_thu")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    console.error(error);

    managerMessage.textContent =
      "❌ Không tải được dữ liệu: " +
      error.message;

    return;
  }


  allData = data || [];

  currentPage = 1;

  applyFilter();

  managerMessage.textContent =
    `✅ Đã tải ${allData.length.toLocaleString("vi-VN")} dòng dữ liệu.`;
}


// ===============================
// LỌC DỮ LIỆU
// ===============================

function applyFilter() {

  const userKeyword =
    (filterUser.value || "")
      .trim()
      .toLowerCase();

  const date =
    filterDate.value;


  filteredData = allData.filter(row => {

    const userName =
      String(row.user_name || "")
        .toLowerCase();

    const paymentDate =
      String(row.payment_date || "")
        .substring(0, 10);


    const matchUser =
      !userKeyword ||
      userName.includes(userKeyword);


    const matchDate =
      !date ||
      paymentDate === date;


    return matchUser && matchDate;

  });


  const totalPages =
    Math.max(
      1,
      Math.ceil(filteredData.length / PAGE_SIZE)
    );


  if (currentPage > totalPages) {
    currentPage = totalPages;
  }


  render();
}


// ===============================
// HIỂN THỊ BẢNG
// ===============================

function render() {

  const total =
    filteredData.length;


  const totalPages =
    Math.max(
      1,
      Math.ceil(total / PAGE_SIZE)
    );


  if (currentPage > totalPages) {
    currentPage = totalPages;
  }


  const start =
    (currentPage - 1) * PAGE_SIZE;

  const end =
    Math.min(
      start + PAGE_SIZE,
      total
    );


  const pageData =
    filteredData.slice(start, end);


  // -------------------------------
  // THỐNG KÊ
  // -------------------------------

  totalCustomers.textContent =
    total.toLocaleString("vi-VN");


  const amountTotal =
    filteredData.reduce(
      (sum, row) => {

        return sum + getAmount(row);

      },
      0
    );


  totalAmount.textContent =
    formatMoney(amountTotal);


  // -------------------------------
  // XÓA BẢNG CŨ
  // -------------------------------

  tableBody.innerHTML = "";


  // -------------------------------
  // KHÔNG CÓ DỮ LIỆU
  // -------------------------------

  if (pageData.length === 0) {

    const tr =
      document.createElement("tr");

    const td =
      document.createElement("td");

    td.colSpan = 8;

    td.textContent =
      "Không có dữ liệu phù hợp.";

    td.style.textAlign = "center";
    td.style.padding = "25px";
    td.style.color = "#64748b";

    tr.appendChild(td);

    tableBody.appendChild(tr);

  } else {

    pageData.forEach(row => {

      const tr =
        document.createElement("tr");


      // USER
      addCell(
        tr,
        row.user_name
      );


      // CIF
      addCell(
        tr,
        row.cif
      );


      // TÊN KHÁCH HÀNG
      addCell(
        tr,
        row.customer_name
      );


      // SỐ TIỀN
      addCell(
        tr,
        formatMoney(getAmount(row))
      );


      // NGÀY THANH TOÁN
      addCell(
        tr,
        formatDate(row.payment_date)
      );


      // SĐT
      addCell(
        tr,
        row.phone
      );


      // GHI CHÚ
      addCell(
        tr,
        row.note
      );


      // XÓA
      const deleteTd =
        document.createElement("td");

      const deleteBtn =
        document.createElement("button");

      deleteBtn.type = "button";

      deleteBtn.className =
        "delete-btn";

      deleteBtn.textContent =
        "🗑️ Xóa";

      deleteBtn.addEventListener(
        "click",
        () => deleteData(row.id)
      );

      deleteTd.appendChild(deleteBtn);

      tr.appendChild(deleteTd);


      tableBody.appendChild(tr);

    });

  }


  // -------------------------------
  // PHÂN TRANG
  // -------------------------------

  renderPagination(totalPages);

}


// ===============================
// THÊM CELL AN TOÀN
// ===============================

function addCell(tr, value) {

  const td =
    document.createElement("td");

  td.textContent =
    value ?? "";

  tr.appendChild(td);
}


// ===============================
// PHÂN TRANG
// ===============================

function renderPagination(totalPages) {

  pagination.innerHTML = "";


  // Chỉ có 1 trang thì không hiện
  if (totalPages <= 1) {
    return;
  }


  const wrapper =
    document.createElement("div");

  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "flex-start";
  wrapper.style.gap = "5px";
  wrapper.style.flexWrap = "wrap";


  // -------------------------------
  // NÚT TẠO
  // -------------------------------

  function createPageButton(
    text,
    page,
    active = false,
    disabled = false
  ) {

    const btn =
      document.createElement("button");

    btn.type = "button";

    btn.textContent = text;

    btn.disabled = disabled;


    btn.style.width = "36px";
    btn.style.height = "36px";
    btn.style.padding = "0";

    btn.style.border =
      "1px solid #cbd5e1";

    btn.style.borderRadius = "7px";

    btn.style.background =
      active ? "#2563eb" : "#ffffff";

    btn.style.color =
      active ? "#ffffff" : "#334155";

    btn.style.fontWeight =
      active ? "bold" : "normal";

    btn.style.cursor =
      disabled ? "not-allowed" : "pointer";

    btn.style.fontSize = "14px";


    if (text === "‹" || text === "›") {

      btn.style.fontSize = "20px";
      btn.style.fontWeight = "bold";

    }


    btn.addEventListener(
      "click",
      () => {

        if (disabled) return;

        currentPage = page;

        render();

        // Cuộn nhẹ về bảng
        const table =
          document.querySelector(".table-wrap");

        if (table) {

          table.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }

      }
    );


    return btn;
  }


  // -------------------------------
  // TRANG TRƯỚC
  // -------------------------------

  wrapper.appendChild(
    createPageButton(
      "‹",
      currentPage - 1,
      false,
      currentPage === 1
    )
  );


  // -------------------------------
  // TÍNH TRANG HIỂN THỊ
  // -------------------------------

  let pages = [];


  if (totalPages <= 7) {

    for (
      let i = 1;
      i <= totalPages;
      i++
    ) {

      pages.push(i);

    }

  } else {

    pages.push(1);


    if (currentPage > 4) {
      pages.push("...");
    }


    let start =
      Math.max(
        2,
        currentPage - 1
      );

    let end =
      Math.min(
        totalPages - 1,
        currentPage + 1
      );


    if (currentPage <= 3) {
      start = 2;
      end = 4;
    }


    if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
      end = totalPages - 1;
    }


    for (
      let i = start;
      i <= end;
      i++
    ) {

      pages.push(i);

    }


    if (currentPage < totalPages - 3) {
      pages.push("...");
    }


    pages.push(totalPages);

  }


  // -------------------------------
  // NÚT TRANG
  // -------------------------------

  pages.forEach(page => {

    if (page === "...") {

      const dots =
        document.createElement("span");

      dots.textContent = "…";

      dots.style.padding =
        "0 3px";

      dots.style.color =
        "#64748b";

      wrapper.appendChild(dots);

      return;
    }


    wrapper.appendChild(
      createPageButton(
        String(page),
        page,
        page === currentPage
      )
    );

  });


  // -------------------------------
  // TRANG SAU
  // -------------------------------

  wrapper.appendChild(
    createPageButton(
      "›",
      currentPage + 1,
      false,
      currentPage === totalPages
    )
  );


  pagination.appendChild(wrapper);
}


// ===============================
// XÓA DỮ LIỆU
// ===============================

async function deleteData(id) {

  const row =
    allData.find(
      x => String(x.id) === String(id)
    );


  if (!row) {
    alert("❌ Không tìm thấy dữ liệu.");
    return;
  }


  const customerName =
    row.customer_name || "";


  const confirmed =
    confirm(
      `Bạn có chắc muốn xóa dữ liệu của khách hàng:\n\n${customerName}\n\nKhông thể hoàn tác.`
    );


  if (!confirmed) return;


  managerMessage.textContent =
    "⏳ Đang xóa dữ liệu...";


  const { error } =
    await db
      .from("du_thu")
      .delete()
      .eq("id", id);


  if (error) {

    console.error(error);

    managerMessage.textContent =
      "❌ Xóa thất bại: " +
      error.message;

    return;
  }


  // Xóa khỏi dữ liệu hiện tại
  allData =
    allData.filter(
      x => String(x.id) !== String(id)
    );


  // Tính lại trang
  const newTotal =
    getFilteredRows().length;


  const newTotalPages =
    Math.max(
      1,
      Math.ceil(
        newTotal / PAGE_SIZE
      )
    );


  if (currentPage > newTotalPages) {
    currentPage = newTotalPages;
  }


  applyFilter();


  managerMessage.textContent =
    "✅ Đã xóa dữ liệu.";
}


// ===============================
// LẤY DỮ LIỆU ĐANG LỌC
// ===============================

function getFilteredRows() {

  const userKeyword =
    (filterUser.value || "")
      .trim()
      .toLowerCase();


  const date =
    filterDate.value;


  return allData.filter(row => {

    const userName =
      String(row.user_name || "")
        .toLowerCase();


    const paymentDate =
      String(row.payment_date || "")
        .substring(0, 10);


    return (
      (!userKeyword ||
        userName.includes(userKeyword)) &&
      (!date ||
        paymentDate === date)
    );

  });

}


// ===============================
// XUẤT EXCEL
// ===============================

function exportExcel() {

  const data =
    getFilteredRows();


  if (!data.length) {

    alert(
      "❌ Không có dữ liệu để xuất Excel."
    );

    return;
  }


  if (!window.XLSX) {

    alert(
      "❌ Chưa tải được thư viện Excel."
    );

    return;
  }


  const output =
    data.map(row => ({

      "User":
        row.user_name || "",

      "Số CIF":
        row.cif || "",

      "Tên Khách hàng":
        row.customer_name || "",

      "Số tiền dự thu":
        getAmount(row),

      "Ngày thanh toán":
        row.payment_date || "",

      "SĐT":
        row.phone || "",

      "Ghi chú":
        row.note || "",

      "Thời gian nhập":
        row.created_at || ""

    }));


  const worksheet =
    XLSX.utils.json_to_sheet(output);


  const workbook =
    XLSX.utils.book_new();


  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Dự thu"
  );


  XLSX.writeFile(
    workbook,
    "du_thu_team.xlsx"
  );


  managerMessage.textContent =
    `✅ Đã xuất ${data.length.toLocaleString("vi-VN")} dòng ra Excel.`;
}


// ===============================
// LẤY SỐ TIỀN
// ===============================

function getAmount(row) {

  const value =
    Number(row?.amount);


  if (
    Number.isFinite(value)
  ) {
    return value;
  }


  return 0;
}


// ===============================
// FORMAT TIỀN
// ===============================

function formatMoney(value) {

  return Number(value || 0)
    .toLocaleString("vi-VN") + " đ";

}


// ===============================
// FORMAT NGÀY
// ===============================

function formatDate(value) {

  if (!value) return "";


  const text =
    String(value).substring(0, 10);


  const parts =
    text.split("-");


  if (parts.length === 3) {

    return (
      parts[2] +
      "/" +
      parts[1] +
      "/" +
      parts[0]
    );

  }


  return value;
}
