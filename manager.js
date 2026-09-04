// ========================================
// QUẢN LÝ DỰ THU - PHÂN TRANG
// Không ảnh hưởng trang cán bộ
// ========================================

const db = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const PAGE_SIZE = 20;

let allRows = [];
let currentPage = 1;


// ========================================
// KHỞI ĐỘNG
// ========================================

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("loginForm")?.addEventListener("submit", login);

  document.getElementById("reload")?.addEventListener("click", () => {
    currentPage = 1;
    loadData();
  });

  document.getElementById("logout")?.addEventListener("click", logout);

  document.getElementById("export")?.addEventListener("click", exportExcel);

  document.getElementById("filterUser")?.addEventListener("input", () => {
    currentPage = 1;
    render();
  });

  document.getElementById("filterDate")?.addEventListener("change", () => {
    currentPage = 1;
    render();
  });

});


// ========================================
// ĐĂNG NHẬP
// ========================================

async function login(e) {

  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const msg = document.getElementById("msg");

  if (!email || !password) {
    msg.textContent = "Vui lòng nhập email và mật khẩu.";
    return;
  }

  msg.textContent = "Đang đăng nhập...";

  const { data, error } =
    await db.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    console.error(error);
    msg.textContent = "❌ Đăng nhập thất bại: " + error.message;
    return;
  }

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("dashboard").style.display = "block";

  msg.textContent = "";

  loadData();
}


// ========================================
// TẢI DỮ LIỆU
// ========================================

async function loadData() {

  const tableBody = document.getElementById("tableBody");

  if (tableBody) {
    tableBody.innerHTML =
      `<tr><td colspan="7" style="text-align:center">Đang tải dữ liệu...</td></tr>`;
  }

  const { data, error } = await db
    .from("du_thu")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {

    console.error(error);

    if (tableBody) {
      tableBody.innerHTML =
        `<tr>
          <td colspan="7" style="text-align:center;color:red">
            ❌ Không tải được dữ liệu: ${escapeHTML(error.message)}
          </td>
        </tr>`;
    }

    return;
  }

  allRows = data || [];

  currentPage = 1;

  render();
}


// ========================================
// LỌC DỮ LIỆU
// ========================================

function getFilteredRows() {

  const userInput =
    document.getElementById("filterUser")?.value
      .trim()
      .toLowerCase() || "";

  const dateInput =
    document.getElementById("filterDate")?.value || "";

  return allRows.filter(row => {

    const userName =
      String(row.user_name || "").toLowerCase();

    const userMatch =
      !userInput ||
      userName.includes(userInput);

    let dateMatch = true;

    if (dateInput) {

      const paymentDate =
        String(row.payment_date || "");

      dateMatch =
        paymentDate.substring(0, 10) === dateInput;
    }

    return userMatch && dateMatch;

  });
}


// ========================================
// HIỂN THỊ BẢNG
// ========================================

function render() {

  const tableBody =
    document.getElementById("tableBody");

  const sum =
    document.getElementById("sum");

  if (!tableBody) return;

  const rows = getFilteredRows();

  // Tổng số trang
  const totalPages =
    Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  // Nếu đang ở trang quá lớn
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  // Vị trí bắt đầu
  const start =
    (currentPage - 1) * PAGE_SIZE;

  // Chỉ lấy 20 dòng của trang hiện tại
  const pageRows =
    rows.slice(start, start + PAGE_SIZE);


  // ======================================
  // TÍNH TỔNG TOÀN BỘ DỮ LIỆU ĐÃ LỌC
  // Không chỉ tính 20 dòng hiện tại
  // ======================================

  const totalAmount =
    rows.reduce((total, row) => {

      const value =
        Number(
          String(row.amount || row.du_thu || 0)
            .replace(/,/g, "")
        );

      return total + (isNaN(value) ? 0 : value);

    }, 0);


  // ======================================
  // HIỂN THỊ TỔNG
  // ======================================

  if (sum) {

    sum.innerHTML =
      `Tổng: <b>${formatMoney(totalAmount)}</b>
       &nbsp; | &nbsp;
       ${rows.length} bản ghi
       &nbsp; | &nbsp;
       Trang ${currentPage}/${totalPages}`;
  }


  // ======================================
  // KHÔNG CÓ DỮ LIỆU
  // ======================================

  if (!pageRows.length) {

    tableBody.innerHTML =
      `<tr>
        <td colspan="7" style="text-align:center;padding:20px">
          Không có dữ liệu.
        </td>
      </tr>`;

    renderPagination(0);

    return;
  }


  // ======================================
  // HIỂN THỊ 20 DÒNG
  // ======================================

  tableBody.innerHTML =
    pageRows.map((row, index) => {

      const stt = start + index + 1;

      return `
        <tr>

          <td>${stt}</td>

          <td>
            ${escapeHTML(row.user_name || "")}
          </td>

          <td>
            ${escapeHTML(row.cif || "")}
          </td>

          <td>
            ${escapeHTML(row.customer_name || "")}
          </td>

          <td>
            <b>${formatMoney(
              row.amount || row.du_thu || 0
            )}</b>
          </td>

          <td>
            ${formatDate(row.payment_date)}
          </td>

          <td>
            ${escapeHTML(row.phone || "")}
          </td>

          <td>
            ${escapeHTML(row.note || "")}
          </td>

        </tr>
      `;

    }).join("");


  renderPagination(totalPages);
}


// ========================================
// PHÂN TRANG
// ========================================

function renderPagination(totalPages) {

  const pagination =
    document.getElementById("pagination");

  if (!pagination) return;

  pagination.innerHTML = "";

  pagination.style.display = "flex";
  pagination.style.flexWrap = "wrap";
  pagination.style.justifyContent = "flex-start";
  pagination.style.alignItems = "center";
  pagination.style.marginTop = "15px";
  pagination.style.marginBottom = "15px";


  if (totalPages <= 1) {
    return;
  }


  // Nút trước
  const prev =
    createPageButton("‹", currentPage - 1);

  prev.disabled =
    currentPage === 1;

  pagination.appendChild(prev);


  // ======================================
  // TẠO DANH SÁCH TRANG
  // Ví dụ:
  // 1 2 3 4 5 ... 20
  // ======================================

  const pages = [];

  if (totalPages <= 7) {

    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

  } else {

    pages.push(1);

    if (currentPage > 4) {
      pages.push("...");
    }

    const start =
      Math.max(2, currentPage - 2);

    const end =
      Math.min(totalPages - 1, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages);
  }


  pages.forEach(page => {

    if (page === "...") {

      const dots =
        document.createElement("span");

      dots.textContent = "...";

      dots.style.display = "inline-flex";
      dots.style.width = "30px";
      dots.style.height = "38px";
      dots.style.alignItems = "center";
      dots.style.justifyContent = "center";
      dots.style.color = "#666";

      pagination.appendChild(dots);

      return;
    }


    const button =
      createPageButton(page, page);

    if (page === currentPage) {

      button.style.background = "#1769e0";
      button.style.color = "#fff";
      button.style.borderColor = "#1769e0";

    }

    pagination.appendChild(button);

  });


  // Nút sau
  const next =
    createPageButton("›", currentPage + 1);

  next.disabled =
    currentPage === totalPages;

  pagination.appendChild(next);
}


// ========================================
// TẠO NÚT TRANG
// Không cần sửa CSS
// ========================================

function createPageButton(text, page) {

  const button =
    document.createElement("button");

  button.type = "button";

  button.textContent = text;

  button.style.width = "38px";
  button.style.height = "38px";
  button.style.minWidth = "38px";
  button.style.padding = "0";
  button.style.margin = "0 4px 0 0";
  button.style.border = "1px solid #d5dbe3";
  button.style.borderRadius = "7px";
  button.style.background = "#fff";
  button.style.color = "#1769e0";
  button.style.fontWeight = "bold";
  button.style.fontSize = "14px";
  button.style.cursor = "pointer";

  button.addEventListener("click", () => {

    if (page < 1) return;

    currentPage = page;

    render();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  });

  return button;
}


// ========================================
// XUẤT EXCEL
// Xuất toàn bộ dữ liệu đang lọc
// Không chỉ 20 dòng
// ========================================

function exportExcel() {

  const rows = getFilteredRows();

  if (!rows.length) {
    alert("Không có dữ liệu để xuất.");
    return;
  }

  const exportData =
    rows.map((row, index) => ({

      STT: index + 1,

      USER:
        row.user_name || "",

      CIF:
        row.cif || "",

      "Khách hàng":
        row.customer_name || "",

      "Dự thu":
        Number(row.amount || row.du_thu || 0),

      "Ngày":
        row.payment_date || "",

      "SĐT":
        row.phone || "",

      "Ghi chú":
        row.note || ""

    }));


  const worksheet =
    XLSX.utils.json_to_sheet(exportData);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Dự Thu"
  );

  XLSX.writeFile(
    workbook,
    "du_thu_team.xlsx"
  );
}


// ========================================
// ĐĂNG XUẤT
// ========================================

async function logout() {

  await db.auth.signOut();

  allRows = [];

  currentPage = 1;

  document.getElementById("dashboard").style.display = "none";
  document.getElementById("loginBox").style.display = "block";

  const tableBody =
    document.getElementById("tableBody");

  if (tableBody) {
    tableBody.innerHTML = "";
  }
}


// ========================================
// ĐỊNH DẠNG TIỀN
// ========================================

function formatMoney(value) {

  const number =
    Number(
      String(value ?? 0)
        .replace(/,/g, "")
    );

  if (isNaN(number)) return "0";

  return number.toLocaleString("vi-VN") + " đ";
}


// ========================================
// ĐỊNH DẠNG NGÀY
// ========================================

function formatDate(value) {

  if (!value) return "";

  const date =
    new Date(value);

  if (isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("vi-VN");
}


// ========================================
// CHỐNG HTML
// ========================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
