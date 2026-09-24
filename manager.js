"use strict";
// ============================================================
// QUẢN LÝ DỰ THU - MANAGER.JS
// BẢN TƯƠNG THÍCH EXCEL MÁY NGÂN HÀNG
//
// - Supabase
// - Đăng nhập
// - Lọc dữ liệu
// - Sửa
// - Xóa
// - Phân trang
// - Tự loại CIF trùng
// - Xuất Excel bằng SheetJS
// - Không có STT
// - 2 sheet: Dự Thu + Tổng Quan
// - Excel ưu tiên tương thích cao
// ============================================================
// ============================================================
// KẾT NỐI SUPABASE
// ============================================================
let client = null;
try {
  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    throw new Error("Không tải được thư viện Supabase.");
  }
  if (
    !window.SUPABASE_URL ||
    !window.SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong config.js."
    );
  }
  client = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
} catch (error) {
  console.error(
    "Lỗi khởi tạo Supabase:",
    error
  );
}
// ============================================================
// BIẾN TOÀN CỤC
// ============================================================
let allData = [];
let filteredData = [];
let currentPage = 1;
const PAGE_SIZE = 20;
let editingRowId = null;
// ============================================================
// LẤY PHẦN TỬ HTML
// ============================================================
const loginBox =
  document.getElementById("loginBox");
const managerBox =
  document.getElementById("managerBox");
const emailInput =
  document.getElementById("email");
const passwordInput =
  document.getElementById("password");
const loginBtn =
  document.getElementById("loginBtn");
const logoutBtn =
  document.getElementById("logoutBtn");
const loginMessage =
  document.getElementById("loginMessage");
const managerMessage =
  document.getElementById("managerMessage");
const totalCustomers =
  document.getElementById("totalCustomers");
const totalAmount =
  document.getElementById("totalAmount");
const filterUser =
  document.getElementById("filterUser");
const filterDate =
  document.getElementById("filterDate");
const filterBtn =
  document.getElementById("filterBtn");
const refreshBtn =
  document.getElementById("refreshBtn");
const exportBtn =
  document.getElementById("exportBtn");
const tableBody =
  document.getElementById("tableBody");
const pagination =
  document.getElementById("pagination");
// ============================================================
// THÔNG BÁO ĐĂNG NHẬP
// ============================================================
function showLoginMessage(
  text,
  color = "#dc2626"
) {
  if (!loginMessage) return;
  loginMessage.textContent = text;
  loginMessage.style.color = color;
}
// ============================================================
// THÔNG BÁO QUẢN LÝ
// ============================================================
function showManagerMessage(
  text,
  color = "#2563eb"
) {
  if (!managerMessage) return;
  managerMessage.textContent = text;
  managerMessage.style.color = color;
}
// ============================================================
// ĐĂNG NHẬP
// ============================================================
async function handleLogin(e) {
  if (e) {
    e.preventDefault();
  }
  const email =
    emailInput?.value.trim();
  const password =
    passwordInput?.value.trim();
  if (!email || !password) {
    showLoginMessage(
      "⚠️ Vui lòng nhập đầy đủ Email và Mật khẩu!"
    );
    return;
  }
  if (!client) {
    showLoginMessage(
      "❌ Lỗi kết nối Supabase, vui lòng kiểm tra cấu hình!"
    );
    return;
  }
  try {
    showLoginMessage(
      "⏳ Đang đăng nhập...",
      "#2563eb"
    );
    const {
      error
    } = await client.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (error) {
      throw error;
    }
    showLoginMessage(
      "✅ Đăng nhập thành công!",
      "#16a34a"
    );
    if (loginBox) {
      loginBox.style.display = "none";
    }
    if (managerBox) {
      managerBox.style.display = "block";
    }
    await loadData();
  } catch (error) {
    console.error(
      "Lỗi đăng nhập:",
      error
    );
    showLoginMessage(
      "❌ " +
      (
        error.message ||
        "Sai email hoặc mật khẩu!"
      )
    );
  }
}
// ============================================================
// ĐĂNG XUẤT
// ============================================================
async function handleLogout(e) {
  if (e) {
    e.preventDefault();
  }
  try {
    if (client) {
      await client.auth.signOut();
    }
    if (loginBox) {
      loginBox.style.display = "block";
    }
    if (managerBox) {
      managerBox.style.display = "none";
    }
    if (emailInput) {
      emailInput.value = "";
    }
    if (passwordInput) {
      passwordInput.value = "";
    }
    showLoginMessage(
      "Đã đăng xuất thành công.",
      "#16a34a"
    );
  } catch (error) {
    console.error(
      "Lỗi đăng xuất:",
      error
    );
  }
}
// ============================================================
// ĐỊNH DẠNG SỐ TIỀN
// ============================================================
function formatAmount(amount) {
  const number =
    Number(amount || 0);
  return number.toLocaleString("en-US");
}
// ============================================================
// ĐỊNH DẠNG NGÀY VIỆT NAM
// ============================================================
function formatDateVietnamese(
  dateValue
) {
  if (!dateValue) {
    return "";
  }
  const text =
    String(dateValue)
      .substring(0, 10);
  const parts =
    text.split("-");
  if (parts.length !== 3) {
    return text;
  }
  return (
    parts[2] +
    "/" +
    parts[1] +
    "/" +
    parts[0]
  );
}
// ============================================================
// CHUYỂN NGÀY DATABASE → DATE OBJECT
//
// Dùng để ghi ngày thật vào Excel
// thay vì ghi ngày dạng text.
// ============================================================
function convertToExcelDate(
  dateValue
) {
  if (!dateValue) {
    return null;
  }
  const text =
    String(dateValue)
      .substring(0, 10);
  const parts =
    text.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const year =
    Number(parts[0]);
  const month =
    Number(parts[1]);
  const day =
    Number(parts[2]);
  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }
  // UTC để tránh lệch ngày do timezone
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}
// ============================================================
// ESCAPE HTML
// ============================================================
function escapeHTML(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }
  return String(value)
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
// ============================================================
// SO SÁNH BẢN GHI
// ============================================================
function isNewerRecord(
  newRecord,
  oldRecord
) {
  const newDate =
    String(
      newRecord.payment_date || ""
    );
  const oldDate =
    String(
      oldRecord.payment_date || ""
    );
  if (newDate !== oldDate) {
    return newDate > oldDate;
  }
  const newCreated =
    newRecord.created_at
      ? new Date(
          newRecord.created_at
        ).getTime()
      : 0;
  const oldCreated =
    oldRecord.created_at
      ? new Date(
          oldRecord.created_at
        ).getTime()
      : 0;
  return newCreated > oldCreated;
}
// ============================================================
// LOẠI CIF TRÙNG
// ============================================================
async function removeDuplicateCIF(
  rows
) {
  const latestByCIF =
    new Map();
  const duplicateIds = [];
  for (const row of rows) {
    const cif =
      String(
        row.cif || ""
      ).trim();
    if (!cif) {
      continue;
    }
    const key =
      cif.toUpperCase();
    if (
      !latestByCIF.has(key)
    ) {
      latestByCIF.set(
        key,
        row
      );
      continue;
    }
    const currentLatest =
      latestByCIF.get(key);
    if (
      isNewerRecord(
        row,
        currentLatest
      )
    ) {
      if (currentLatest.id) {
        duplicateIds.push(
          currentLatest.id
        );
      }
      latestByCIF.set(
        key,
        row
      );
    } else {
      if (row.id) {
        duplicateIds.push(
          row.id
        );
      }
    }
  }
  // XÓA CIF TRÙNG TRONG DATABASE
  if (
    duplicateIds.length > 0
  ) {
    try {
      const {
        error
      } = await client
        .from("du_thu")
        .delete()
        .in(
          "id",
          duplicateIds
        );
      if (error) {
        console.warn(
          "Không thể xóa CIF trùng:",
          error.message
        );
      }
    } catch (error) {
      console.warn(
        "Lỗi xóa CIF trùng:",
        error
      );
    }
  }
  return Array.from(
    latestByCIF.values()
  );
}
// ============================================================
// TẢI DỮ LIỆU
// ============================================================
async function loadData() {
  if (!client) {
    showManagerMessage(
      "❌ Supabase chưa được khởi tạo.",
      "#dc2626"
    );
    return;
  }
  showManagerMessage(
    "⏳ Đang tải dữ liệu...",
    "#2563eb"
  );
  try {
    const {
      data,
      error
    } = await client
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
      throw error;
    }
    const rows =
      Array.isArray(data)
        ? data
        : [];
    allData =
      await removeDuplicateCIF(
        rows
      );
    allData.sort(
      function (a, b) {
        const dateA =
          String(
            a.payment_date || ""
          );
        const dateB =
          String(
            b.payment_date || ""
          );
        if (
          dateA !== dateB
        ) {
          return dateB.localeCompare(
            dateA
          );
        }
        const createdA =
          a.created_at
            ? new Date(
                a.created_at
              ).getTime()
            : 0;
        const createdB =
          b.created_at
            ? new Date(
                b.created_at
              ).getTime()
            : 0;
        return createdB - createdA;
      }
    );
    filteredData =
      [...allData];
    currentPage = 1;
    editingRowId = null;
    renderTable();
    renderPagination();
    updateStatistics();
    showManagerMessage(
      `✅ Đã tải ${allData.length} bản ghi.`,
      "#16a34a"
    );
  } catch (error) {
    console.error(
      "Lỗi tải dữ liệu:",
      error
    );
    showManagerMessage(
      "❌ Lỗi tải dữ liệu: " +
      (
        error.message ||
        error
      ),
      "#dc2626"
    );
  }
}
// ============================================================
// LỌC DỮ LIỆU
// ============================================================
function applyFilter() {
  const selectedUser =
    filterUser
      ? filterUser.value
          .trim()
          .toLowerCase()
      : "";
  const selectedDate =
    filterDate
      ? filterDate.value
      : "";
  filteredData =
    allData.filter(
      function (row) {
        const rowUser =
          String(
            row.user_name || ""
          ).toLowerCase();
        const rowDate =
          String(
            row.payment_date || ""
          ).substring(
            0,
            10
          );
        const matchUser =
          !selectedUser ||
          rowUser.includes(
            selectedUser
          );
        const matchDate =
          !selectedDate ||
          rowDate === selectedDate;
        return (
          matchUser &&
          matchDate
        );
      }
    );
  currentPage = 1;
  editingRowId = null;
  renderTable();
  renderPagination();
  updateStatistics();
}
// ============================================================
// NÚT LỌC
// ============================================================
function filterData() {
  applyFilter();
  showManagerMessage(
    `🔎 Đã lọc ${filteredData.length} bản ghi.`,
    "#2563eb"
  );
}
// ============================================================
// HIỂN THỊ BẢNG
// ============================================================
function renderTable() {
  if (!tableBody) {
    return;
  }
  tableBody.innerHTML = "";
  if (
    filteredData.length === 0
  ) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;">
          Không có dữ liệu phù hợp.
        </td>
      </tr>
    `;
    return;
  }
  const startIndex =
    (currentPage - 1) *
    PAGE_SIZE;
  const endIndex =
    startIndex +
    PAGE_SIZE;
  const pageData =
    filteredData.slice(
      startIndex,
      endIndex
    );
  pageData.forEach(
    function (row) {
      const tr =
        document.createElement(
          "tr"
        );
      const isEditing =
        editingRowId === row.id;
      if (isEditing) {
        const rawDate =
          row.payment_date
            ? String(
                row.payment_date
              ).substring(
                0,
                10
              )
            : "";
        tr.className =
          "editing-row";
        tr.innerHTML = `
          <td>
            <input
              type="text"
              id="edit_user_${row.id}"
              value="${escapeHTML(row.user_name || "")}"
              style="width:100%;padding:4px;"
            />
          </td>
          <td>
            <input
              type="text"
              id="edit_cif_${row.id}"
              value="${escapeHTML(row.cif || "")}"
              style="width:100%;padding:4px;"
            />
          </td>
          <td>
            <input
              type="text"
              id="edit_customer_${row.id}"
              value="${escapeHTML(row.customer_name || "")}"
              style="width:100%;padding:4px;"
            />
          </td>
          <td>
            <input
              type="number"
              id="edit_amount_${row.id}"
              value="${Number(row.amount || 0)}"
              style="width:100%;padding:4px;text-align:right;"
            />
          </td>
          <td>
            <input
              type="date"
              id="edit_date_${row.id}"
              value="${rawDate}"
              style="width:100%;padding:4px;"
            />
          </td>
          <td>
            <input
              type="text"
              id="edit_phone_${row.id}"
              value="${escapeHTML(row.phone || "")}"
              style="width:100%;padding:4px;"
            />
          </td>
          <td>
            <input
              type="text"
              id="edit_note_${row.id}"
              value="${escapeHTML(row.note || "")}"
              style="width:100%;padding:4px;"
            />
          </td>
          <td
            style="
              text-align:center;
              white-space:nowrap;
            "
          >
            <button
              type="button"
              class="save-btn"
              data-id="${escapeHTML(row.id)}"
              style="
                background:#16a34a;
                color:#fff;
                border:none;
                padding:4px 8px;
                margin-right:4px;
                border-radius:4px;
                cursor:pointer;
              "
            >
              💾 Lưu
            </button>
            <button
              type="button"
              class="cancel-btn"
              style="
                background:#6b7280;
                color:#fff;
                border:none;
                padding:4px 8px;
                border-radius:4px;
                cursor:pointer;
              "
            >
              ❌ Hủy
            </button>
          </td>
        `;
        const saveBtn =
          tr.querySelector(
            ".save-btn"
          );
        const cancelBtn =
          tr.querySelector(
            ".cancel-btn"
          );
        if (saveBtn) {
          saveBtn.addEventListener(
            "click",
            function () {
              saveEditData(
                row.id
              );
            }
          );
        }
        if (cancelBtn) {
          cancelBtn.addEventListener(
            "click",
            function () {
              editingRowId = null;
              renderTable();
            }
          );
        }
      } else {
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
          <td
            style="text-align:right;"
          >
            ${formatAmount(
              row.amount
            )}
          </td>
          <td>
            ${formatDateVietnamese(
              row.payment_date
            )}
          </td>
          <td>
            ${escapeHTML(
              row.phone || ""
            )}
          </td>
          <td>
            ${escapeHTML(
              row.note || ""
            )}
          </td>
          <td
            style="
              text-align:center;
              white-space:nowrap;
            "
          >
            <button
              type="button"
              class="edit-btn"
              data-id="${escapeHTML(row.id)}"
              style="
                background:#eab308;
                color:#000;
                border:none;
                padding:4px 8px;
                margin-right:4px;
                border-radius:4px;
                cursor:pointer;
                font-weight:bold;
              "
            >
              ✏️ Sửa
            </button>
            <button
              type="button"
              class="delete-btn"
              data-id="${escapeHTML(row.id)}"
              style="
                background:#dc2626;
                color:#fff;
                border:none;
                padding:4px 8px;
                border-radius:4px;
                cursor:pointer;
              "
            >
              🗑️ Xóa
            </button>
          </td>
        `;
        const editBtn =
          tr.querySelector(
            ".edit-btn"
          );
        const deleteBtn =
          tr.querySelector(
            ".delete-btn"
          );
        if (editBtn) {
          editBtn.addEventListener(
            "click",
            function () {
              editingRowId =
                row.id;
              renderTable();
            }
          );
        }
        if (deleteBtn) {
          deleteBtn.addEventListener(
            "click",
            function () {
              deleteData(
                row.id
              );
            }
          );
        }
      }
      tableBody.appendChild(tr);
    }
  );
}
// ============================================================
// LƯU CHỈNH SỬA
// ============================================================
async function saveEditData(id) {
  const user_name =
    document.getElementById(
      `edit_user_${id}`
    )?.value.trim();
  const cif =
    document.getElementById(
      `edit_cif_${id}`
    )?.value.trim();
  const customer_name =
    document.getElementById(
      `edit_customer_${id}`
    )?.value.trim();
  const amountVal =
    document.getElementById(
      `edit_amount_${id}`
    )?.value;
  const payment_date =
    document.getElementById(
      `edit_date_${id}`
    )?.value;
  const phone =
    document.getElementById(
      `edit_phone_${id}`
    )?.value.trim();
  const note =
    document.getElementById(
      `edit_note_${id}`
    )?.value.trim();
  if (!customer_name) {
    alert(
      "Tên khách hàng không được để trống!"
    );
    return;
  }
  const amount =
    Number(
      amountVal || 0
    );
  const updatedFields = {
    user_name,
    cif,
    customer_name,
    amount,
    payment_date:
      payment_date || null,
    phone,
    note
  };
  try {
    showManagerMessage(
      "⏳ Đang lưu thay đổi...",
      "#2563eb"
    );
    const {
      error
    } = await client
      .from("du_thu")
      .update(
        updatedFields
      )
      .eq(
        "id",
        id
      );
    if (error) {
      throw error;
    }
    const targetRow =
      allData.find(
        function (r) {
          return r.id === id;
        }
      );
    if (targetRow) {
      Object.assign(
        targetRow,
        updatedFields
      );
    }
    const filteredRow =
      filteredData.find(
        function (r) {
          return r.id === id;
        }
      );
    if (filteredRow) {
      Object.assign(
        filteredRow,
        updatedFields
      );
    }
    editingRowId = null;
    renderTable();
    updateStatistics();
    showManagerMessage(
      "✅ Cập nhật dữ liệu thành công!",
      "#16a34a"
    );
  } catch (error) {
    console.error(
      "Lỗi cập nhật:",
      error
    );
    showManagerMessage(
      "❌ Cập nhật thất bại: " +
      (
        error.message ||
        error
      ),
      "#dc2626"
    );
  }
}
// ============================================================
// PHÂN TRANG
// ============================================================
function renderPagination() {
  if (!pagination) {
    return;
  }
  pagination.innerHTML = "";
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredData.length /
        PAGE_SIZE
      )
    );
  if (totalPages <= 1) {
    pagination.innerHTML = `
      <button
        type="button"
        disabled
      >
        ‹
      </button>
      <span>
        Trang 1 / 1
      </span>
      <button
        type="button"
        disabled
      >
        ›
      </button>
    `;
    return;
  }
  const previousButton =
    document.createElement(
      "button"
    );
  previousButton.type =
    "button";
  previousButton.textContent =
    "‹";
  previousButton.disabled =
    currentPage === 1;
  previousButton.addEventListener(
    "click",
    function () {
      changePage(
        currentPage - 1
      );
    }
  );
  const pageText =
    document.createElement(
      "span"
    );
  pageText.textContent =
    `Trang ${currentPage} / ${totalPages}`;
  const nextButton =
    document.createElement(
      "button"
    );
  nextButton.type =
    "button";
  nextButton.textContent =
    "›";
  nextButton.disabled =
    currentPage === totalPages;
  nextButton.addEventListener(
    "click",
    function () {
      changePage(
        currentPage + 1
      );
    }
  );
  pagination.appendChild(
    previousButton
  );
  pagination.appendChild(
    pageText
  );
  pagination.appendChild(
    nextButton
  );
}
// ============================================================
// CHUYỂN TRANG
// ============================================================
function changePage(page) {
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredData.length /
        PAGE_SIZE
      )
    );
  if (page < 1) {
    page = 1;
  }
  if (page > totalPages) {
    page = totalPages;
  }
  currentPage = page;
  editingRowId = null;
  renderTable();
  renderPagination();
}
// ============================================================
// THỐNG KÊ
// ============================================================
function updateStatistics() {
  const uniqueCIF =
    new Set();
  let total = 0;
  filteredData.forEach(
    function (row) {
      const cif =
        String(
          row.cif || ""
        ).trim();
      if (cif) {
        uniqueCIF.add(
          cif.toUpperCase()
        );
      }
      total +=
        Number(
          row.amount || 0
        );
    }
  );
  if (totalCustomers) {
    totalCustomers.textContent =
      uniqueCIF.size;
  }
  if (totalAmount) {
    totalAmount.textContent =
      formatAmount(total) +
      " đ";
  }
}
// ============================================================
// XÓA DỮ LIỆU
// ============================================================
async function deleteData(id) {
  const confirmed =
    confirm(
      "Bạn có chắc muốn xóa bản ghi dự thu này không?"
    );
  if (!confirmed) {
    return;
  }
  try {
    showManagerMessage(
      "⏳ Đang xóa...",
      "#2563eb"
    );
    const {
      error
    } = await client
      .from("du_thu")
      .delete()
      .eq(
        "id",
        id
      );
    if (error) {
      throw error;
    }
    showManagerMessage(
      "✅ Đã xóa bản ghi thành công.",
      "#16a34a"
    );
    await loadData();
    applyFilter();
  } catch (error) {
    console.error(
      "Lỗi xóa:",
      error
    );
    showManagerMessage(
      "❌ Xóa thất bại: " +
      (
        error.message ||
        error
      ),
      "#dc2626"
    );
  }
}
// ============================================================
// XUẤT EXCEL
//
// BẢN TỐI ƯU CHO EXCEL MÁY NGÂN HÀNG
//
// Nguyên tắc:
// - XLSX thuần
// - Không công thức
// - Không VBA
// - Không external link
// - Không merge các dòng dữ liệu
// - Ngày là DATE thật của Excel
// - CIF là TEXT
// - SĐT là TEXT
// - Số tiền là NUMBER
// - Có định dạng số tiền
// - Có AutoFilter
// ============================================================
function exportExcel() {
  if (
    !filteredData ||
    filteredData.length === 0
  ) {
    showManagerMessage(
      "⚠️ Không có dữ liệu để xuất Excel.",
      "#d97706"
    );
    return;
  }
  if (
    typeof XLSX === "undefined"
  ) {
    showManagerMessage(
      "❌ Thư viện XLSX chưa tải được. Hãy kiểm tra manager.html.",
      "#dc2626"
    );
    return;
  }
  try {
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.textContent =
        "⏳ ĐANG XUẤT...";
    }
    showManagerMessage(
      "⏳ Đang tạo Excel tương thích...",
      "#2563eb"
    );
    // ========================================================
    // NGÀY XUẤT
    // ========================================================
    const now =
      new Date();
    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );
    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );
    const year =
      now.getFullYear();
    const exportDate =
      `${day}/${month}/${year}`;
    const fileDate =
      `${day}-${month}-${year}`;
    // ========================================================
    // TỔNG TIỀN
    // ========================================================
    const total =
      filteredData.reduce(
        function (
          sum,
          row
        ) {
          return (
            sum +
            Number(
              row.amount || 0
            )
          );
        },
        0
      );
    // ========================================================
    // SHEET 1
    // ========================================================
    const mainData = [];
    // Dòng 1
    mainData.push([
      "BÁO CÁO DỰ THU"
    ]);
    // Dòng 2
    mainData.push([
      `Ngày xuất: ${exportDate}`
    ]);
    // Dòng 3
    mainData.push([
      `Tổng số hồ sơ: ${filteredData.length}`
    ]);
    // Dòng 4 trống
    mainData.push([]);
    // Dòng 5 Header
    mainData.push([
      "User",
      "Số CIF",
      "Tên khách hàng",
      "Số tiền dự thu",
      "Ngày thanh toán",
      "SĐT",
      "Ghi chú"
    ]);
    // ========================================================
    // DỮ LIỆU
    // ========================================================
    filteredData.forEach(
      function (row) {
        const excelDate =
          convertToExcelDate(
            row.payment_date
          );
        mainData.push([
          String(
            row.user_name || ""
          ),
          String(
            row.cif || ""
          ),
          String(
            row.customer_name || ""
          ),
          Number(
            row.amount || 0
          ),
          excelDate,
          String(
            row.phone || ""
          ),
          String(
            row.note || ""
          )
        ]);
      }
    );
    // ========================================================
    // DÒNG TỔNG
    // ========================================================
    mainData.push([
      "",
      "",
      "TỔNG DỰ THU",
      total,
      "",
      "",
      ""
    ]);
    // ========================================================
    // TẠO WORKSHEET
    // ========================================================
    const ws =
      XLSX.utils.aoa_to_sheet(
        mainData
      );
    // ========================================================
    // ĐỘ RỘNG CỘT
    // ========================================================
    ws["!cols"] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 32 },
      { wch: 20 },
      { wch: 18 },
      { wch: 17 },
      { wch: 40 }
    ];
    // ========================================================
    // KHÔNG MERGE
    //
    // Cố tình bỏ merge để tăng khả năng tương thích
    // với Excel trên máy cơ quan/ngân hàng.
    // ========================================================
    // Không tạo ws["!merges"]
    // ========================================================
    // ĐỊNH DẠNG HEADER / TIỀN / NGÀY
    // ========================================================
    const headerRow =
      5;
    // Header A5:G5
    for (
      let col = 0;
      col < 7;
      col++
    ) {
      const address =
        XLSX.utils.encode_cell({
          r: headerRow - 1,
          c: col
        });
      if (ws[address]) {
        // Không sử dụng style phức tạp.
        // Chỉ giữ kiểu dữ liệu chuẩn.
      }
    }
    // ========================================================
    // DỮ LIỆU BẮT ĐẦU TỪ DÒNG 6
    // ========================================================
    const firstDataRow =
      6;
    const lastDataRow =
      firstDataRow +
      filteredData.length -
      1;
    for (
      let rowNumber = firstDataRow;
      rowNumber <= lastDataRow;
      rowNumber++
    ) {
      // ------------------------------
      // CIF = TEXT
      // ------------------------------
      const cifCell =
        ws[
          `B${rowNumber}`
        ];
      if (cifCell) {
        cifCell.t = "s";
        cifCell.v =
          String(
            cifCell.v || ""
          );
      }
      // ------------------------------
      // SỐ TIỀN = NUMBER
      // ------------------------------
      const amountCell =
        ws[
          `D${rowNumber}`
        ];
      if (amountCell) {
        amountCell.t = "n";
        amountCell.v =
          Number(
            amountCell.v || 0
          );
        amountCell.z =
          "#,##0";
      }
      // ------------------------------
      // NGÀY = DATE
      // ------------------------------
      const dateCell =
        ws[
          `E${rowNumber}`
        ];
      if (dateCell) {
        if (
          dateCell.v instanceof Date
        ) {
          dateCell.t = "d";
          dateCell.z =
            "dd/mm/yyyy";
        } else {
          // Nếu không có ngày thì để trống
          dateCell.v = "";
          dateCell.t = "s";
        }
      }
      // ------------------------------
      // SĐT = TEXT
      // ------------------------------
      const phoneCell =
        ws[
          `F${rowNumber}`
        ];
      if (phoneCell) {
        phoneCell.t = "s";
        phoneCell.v =
          String(
            phoneCell.v || ""
          );
      }
    }
    // ========================================================
    // DÒNG TỔNG
    // ========================================================
    const totalRow =
      firstDataRow +
      filteredData.length;
    const totalCell =
      ws[
        `D${totalRow}`
      ];
    if (totalCell) {
      totalCell.t = "n";
      totalCell.v =
        Number(total);
      totalCell.z =
        "#,##0";
    }
    // ========================================================
    // AUTOFILTER
    // ========================================================
    ws["!autofilter"] = {
      ref:
        `A5:G${lastDataRow}`
    };
    // ========================================================
    // FREEZE HEADER
    //
    // Bỏ freeze để tránh tạo thêm cấu trúc không cần thiết.
    // ========================================================
    // ========================================================
    // SHEET 2 - TỔNG QUAN
    // ========================================================
    const summaryData = [];
    summaryData.push([
      "TỔNG QUAN DỰ THU"
    ]);
    summaryData.push([
      `Ngày xuất: ${exportDate}`
    ]);
    summaryData.push([]);
    summaryData.push([
      "CHỈ TIÊU",
      "GIÁ TRỊ"
    ]);
    summaryData.push([
      "Tổng số hồ sơ",
      filteredData.length
    ]);
    summaryData.push([
      "Tổng dự thu",
      total
    ]);
    summaryData.push([]);
    summaryData.push([
      "USER",
      "SỐ HỒ SƠ",
      "TỔNG DỰ THU"
    ]);
    // ========================================================
    // THỐNG KÊ USER
    // ========================================================
    const userMap =
      new Map();
    filteredData.forEach(
      function (row) {
        const user =
          String(
            row.user_name ||
            "Không xác định"
          ).trim();
        const amount =
          Number(
            row.amount || 0
          );
        if (
          !userMap.has(user)
        ) {
          userMap.set(
            user,
            {
              count: 0,
              amount: 0
            }
          );
        }
        const item =
          userMap.get(user);
        item.count++;
        item.amount += amount;
      }
    );
    userMap.forEach(
      function (
        value,
        key
      ) {
        summaryData.push([
          String(key),
          Number(
            value.count
          ),
          Number(
            value.amount
          )
        ]);
      }
    );
    // ========================================================
    // TẠO SHEET TỔNG QUAN
    // ========================================================
    const wsSummary =
      XLSX.utils.aoa_to_sheet(
        summaryData
      );
    wsSummary["!cols"] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 25 }
    ];
    // ========================================================
    // KHÔNG MERGE SHEET TỔNG QUAN
    // ========================================================
    // ========================================================
    // ĐỊNH DẠNG SỐ TIỀN SHEET TỔNG QUAN
    // ========================================================
    if (
      wsSummary["B6"]
    ) {
      wsSummary["B6"].t = "n";
      wsSummary["B6"].v =
        Number(
          wsSummary["B6"].v || 0
        );
      wsSummary["B6"].z =
        "#,##0";
    }
    // Tiền theo User
    const summaryFirstUserRow =
      9;
    for (
      let i = 0;
      i < userMap.size;
      i++
    ) {
      const rowNumber =
        summaryFirstUserRow +
        i;
      const countCell =
        wsSummary[
          `B${rowNumber}`
        ];
      if (countCell) {
        countCell.t = "n";
        countCell.v =
          Number(
            countCell.v || 0
          );
      }
      const amountCell =
        wsSummary[
          `C${rowNumber}`
        ];
      if (amountCell) {
        amountCell.t = "n";
        amountCell.v =
          Number(
            amountCell.v || 0
          );
        amountCell.z =
          "#,##0";
      }
    }
    // ========================================================
    // TẠO WORKBOOK
    // ========================================================
    const workbook =
      XLSX.utils.book_new();
    // Metadata đơn giản
    workbook.Props = {
      Title:
        "Báo cáo dự thu",
      Subject:
        "Báo cáo dự thu",
      Author:
        "Quản lý dự thu",
      CreatedDate:
        new Date()
    };
    XLSX.utils.book_append_sheet(
      workbook,
      ws,
      "Du Thu"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      wsSummary,
      "Tong Quan"
    );
    // ========================================================
    // GHI FILE XLSX
    //
    // Không dùng compression để giảm khả năng lỗi
    // trên một số môi trường Excel cũ.
    // ========================================================
    XLSX.writeFile(
      workbook,
      `Bao_Cao_Du_Thu_${fileDate}.xlsx`,
      {
        bookType: "xlsx",
        compression: false,
        cellDates: true,
        bookSST: false
      }
    );
    showManagerMessage(
      "✅ Xuất Excel thành công! Hãy mở trực tiếp file vừa tải.",
      "#16a34a"
    );
  } catch (error) {
    console.error(
      "Lỗi xuất Excel:",
      error
    );
    showManagerMessage(
      "❌ Lỗi xuất Excel: " +
      (
        error.message ||
        error
      ),
      "#dc2626"
    );
  } finally {
    if (exportBtn) {
      exportBtn.disabled =
        false;
      exportBtn.textContent =
        "📊 XUẤT EXCEL";
    }
  }
}
// ============================================================
// DOM READY
// ============================================================
document.addEventListener(
  "DOMContentLoaded",
  function () {
    // --------------------------------------------------------
    // ĐĂNG NHẬP
    // --------------------------------------------------------
    if (loginBtn) {
      loginBtn.addEventListener(
        "click",
        handleLogin
      );
    }
    const loginForm =
      document.querySelector(
        "#loginBox form"
      ) ||
      loginBtn?.closest(
        "form"
      );
    if (loginForm) {
      loginForm.addEventListener(
        "submit",
        handleLogin
      );
    }
    // --------------------------------------------------------
    // ĐĂNG XUẤT
    // --------------------------------------------------------
    if (logoutBtn) {
      logoutBtn.addEventListener(
        "click",
        handleLogout
      );
    }
    // --------------------------------------------------------
    // ENTER ĐĂNG NHẬP
    // --------------------------------------------------------
    if (passwordInput) {
      passwordInput.addEventListener(
        "keypress",
        function (e) {
          if (
            e.key === "Enter"
          ) {
            handleLogin(e);
          }
        }
      );
    }
    // --------------------------------------------------------
    // LỌC
    // --------------------------------------------------------
    if (filterBtn) {
      filterBtn.addEventListener(
        "click",
        filterData
      );
    }
    // --------------------------------------------------------
    // LÀM MỚI
    // --------------------------------------------------------
    if (refreshBtn) {
      refreshBtn.addEventListener(
        "click",
        loadData
      );
    }
    // --------------------------------------------------------
    // XUẤT EXCEL
    // --------------------------------------------------------
    if (exportBtn) {
      exportBtn.addEventListener(
        "click",
        exportExcel
      );
    }
    // --------------------------------------------------------
    // TẢI DỮ LIỆU NẾU MANAGER ĐANG HIỆN
    // --------------------------------------------------------
    if (
      managerBox &&
      managerBox.style.display !== "none"
    ) {
      loadData();
    }
  }
);

Lưu ý quan trọng: bản này đã bỏ merge và freeze, đồng thời đổi Ngày thanh toán thành ngày Excel thực, còn CIF/SĐT là text và Số tiền là number. Đây là các thay đổi mình ưu tiên để giảm lỗi tương thích khi mở trên máy Excel của ngân hàng.

Bạn chỉ cần thay toàn bộ manager.js hiện tại bằng code trên → GitHub → Vercel deploy lại → tải một file Excel mới và thử mở trực tiếp trên máy ngân hàng.
