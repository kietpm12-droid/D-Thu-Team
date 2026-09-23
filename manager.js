"use strict";

// ============================================================

// QUẢN LÝ DỰ THU - MANAGER.JS

// FULL VERSION

//

// CHỨC NĂNG:

// - Đăng nhập Supabase

// - Tải dữ liệu

// - Lọc User / ngày

// - Phân trang 20 dòng

// - Thống kê

// - CHỈNH SỬA BẢN GHI

// - XÓA BẢN GHI

// - Tự loại CIF trùng

// - Xuất Excel không có STT

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

    throw new Error(

      "Không tải được thư viện Supabase."

    );

  }

  if (

    !window.SUPABASE_URL ||

    !window.SUPABASE_ANON_KEY

  ) {

    throw new Error(

      "Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong config.js."

    );

  }

  client =

    window.supabase.createClient(

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

  if (!loginMessage) {

    return;

  }

  loginMessage.textContent =

    text;

  loginMessage.style.color =

    color;

}

// ============================================================

// THÔNG BÁO QUẢN LÝ

// ============================================================

function showManagerMessage(

  text,

  color = "#2563eb"

) {

  if (!managerMessage) {

    return;

  }

  managerMessage.textContent =

    text;

  managerMessage.style.color =

    color;

}

// ============================================================

// ĐỊNH DẠNG SỐ TIỀN

// ============================================================

function formatAmount(amount) {

  const number =

    Number(amount || 0);

  return number.toLocaleString(

    "en-US"

  );

}

// ============================================================

// ĐỊNH DẠNG NGÀY VIỆT NAM

// YYYY-MM-DD

// -> DD/MM/YYYY

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

  if (

    parts.length !== 3

  ) {

    return text;

  }

  return (

    `${parts[2]}/${parts[1]}/${parts[0]}`

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

  if (

    newDate !== oldDate

  ) {

    return (

      newDate > oldDate

    );

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

  return (

    newCreated >

    oldCreated

  );

}

// ============================================================

// LOẠI BỎ CIF TRÙNG

// ============================================================

async function removeDuplicateCIF(

  rows

) {

  const latestByCIF =

    new Map();

  const duplicateIds = [];

  for (

    const row of rows

  ) {

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

      if (

        currentLatest.id

      ) {

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

  // ==========================================================

  // XÓA CIF TRÙNG TRONG DATABASE

  // ==========================================================

  if (

    duplicateIds.length > 0

  ) {

    try {

      const {

        error

      } =

        await client

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

    throw new Error(

      "Supabase chưa được khởi tạo."

    );

  }

  showManagerMessage(

    "⏳ Đang tải dữ liệu...",

    "#2563eb"

  );

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

  // ==========================================================

  // SẮP XẾP

  // ==========================================================

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

      return (

        createdB -

        createdA

      );

    }

  );

  filteredData =

    [...allData];

  currentPage = 1;

  renderTable();

  renderPagination();

  updateStatistics();

  showManagerMessage(

    `✅ Đã tải ${allData.length} bản ghi.`,

    "#16a34a"

  );

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

          ).substring(0, 10);

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

        <td

          colspan="8"

          style="text-align:center;">

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

          style="text-align:right;">

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

          ">

          <button

            type="button"

            class="edit-btn"

            data-id="${escapeHTML(

              row.id

            )}">

            ✏️ Sửa

          </button>

          <button

            type="button"

            class="delete-btn"

            data-id="${escapeHTML(

              row.id

            )}">

            🗑️ Xóa

          </button>

        </td>

      `;

      // ========================================================

      // NÚT SỬA

      // ========================================================

      const editButton =

        tr.querySelector(

          ".edit-btn"

        );

      if (editButton) {

        editButton.addEventListener(

          "click",

          function () {

            editData(row);

          }

        );

      }

      // ========================================================

      // NÚT XÓA

      // ========================================================

      const deleteButton =

        tr.querySelector(

          ".delete-btn"

        );

      if (deleteButton) {

        deleteButton.addEventListener(

          "click",

          function () {

            deleteData(

              row.id

            );

          }

        );

      }

      tableBody.appendChild(

        tr

      );

    }

  );

}

// ============================================================

// TẠO FORM CHỈNH SỬA

// ============================================================

function createEditModal() {

  if (

    document.getElementById(

      "editModal"

    )

  ) {

    return;

  }

  const modal =

    document.createElement(

      "div"

    );

  modal.id =

    "editModal";

  modal.innerHTML = `

    <div

      class="edit-modal-overlay">

      <div

        class="edit-modal-box">

        <div

          class="edit-modal-header">

          <h2>

            ✏️ CHỈNH SỬA DỰ THU

          </h2>

          <button

            type="button"

            id="closeEditModal"

            class="edit-close-btn">

            ✕

          </button>

        </div>

        <div

          class="edit-modal-body">

          <input

            type="hidden"

            id="editId"

          >

          <div

            class="edit-form-group">

            <label>

              User cán bộ

            </label>

            <input

              type="text"

              id="editUser"

              placeholder="Nhập User cán bộ"

            >

          </div>

          <div

            class="edit-form-group">

            <label>

              Số CIF

            </label>

            <input

              type="text"

              id="editCif"

              placeholder="Nhập số CIF"

            >

          </div>

          <div

            class="edit-form-group">

            <label>

              Tên khách hàng

            </label>

            <input

              type="text"

              id="editCustomerName"

              placeholder="Nhập tên khách hàng"

            >

          </div>

          <div

            class="edit-form-group">

            <label>

              Số tiền dự thu

            </label>

            <input

              type="text"

              id="editAmount"

              inputmode="numeric"

              placeholder="Nhập số tiền"

            >

          </div>

          <div

            class="edit-form-group">

            <label>

              Ngày thanh toán

            </label>

            <input

              type="date"

              id="editPaymentDate"

            >

          </div>

          <div

            class="edit-form-group">

            <label>

              SĐT

            </label>

            <input

              type="text"

              id="editPhone"

              inputmode="tel"

              placeholder="Nhập số điện thoại"

            >

          </div>

          <div

            class="edit-form-group">

            <label>

              Ghi chú

            </label>

            <textarea

              id="editNote"

              rows="4"

              placeholder="Nhập ghi chú"></textarea>

          </div>

        </div>

        <div

          class="edit-modal-footer">

          <button

            type="button"

            id="cancelEditBtn"

            class="edit-cancel-btn">

            Hủy

          </button>

          <button

            type="button"

            id="saveEditBtn"

            class="edit-save-btn">

            💾 LƯU THAY ĐỔI

          </button>

        </div>

      </div>

    </div>

  `;

  document.body.appendChild(

    modal

  );

  // ==========================================================

  // ĐÓNG

  // ==========================================================

  const closeButton =

    document.getElementById(

      "closeEditModal"

    );

  const cancelButton =

    document.getElementById(

      "cancelEditBtn"

    );

  if (closeButton) {

    closeButton.addEventListener(

      "click",

      closeEditModal

    );

  }

  if (cancelButton) {

    cancelButton.addEventListener(

      "click",

      closeEditModal

    );

  }

  // ==========================================================

  // LƯU

  // ==========================================================

  const saveButton =

    document.getElementById(

      "saveEditBtn"

    );

  if (saveButton) {

    saveButton.addEventListener(

      "click",

      saveEditData

    );

  }

  // ==========================================================

  // FORMAT TIỀN

  // ==========================================================

  const amountInput =

    document.getElementById(

      "editAmount"

    );

  if (amountInput) {

    amountInput.addEventListener(

      "input",

      function () {

        let value =

          this.value.replace(

            /[^0-9]/g,

            ""

          );

        if (!value) {

          this.value = "";

          return;

        }

        this.value =

          Number(

            value

          ).toLocaleString(

            "en-US"

          );

      }

    );

  }

  // ==========================================================

  // CLICK RA NGOÀI

  // ==========================================================

  const overlay =

    modal.querySelector(

      ".edit-modal-overlay"

    );

  if (overlay) {

    overlay.addEventListener(

      "click",

      function (event) {

        if (

          event.target === overlay

        ) {

          closeEditModal();

        }

      }

    );

  }

}

// ============================================================

// MỞ FORM CHỈNH SỬA

// ============================================================

function editData(row) {

  createEditModal();

  const editId =

    document.getElementById(

      "editId"

    );

  const editUser =

    document.getElementById(

      "editUser"

    );

  const editCif =

    document.getElementById(

      "editCif"

    );

  const editCustomerName =

    document.getElementById(

      "editCustomerName"

    );

  const editAmount =

    document.getElementById(

      "editAmount"

    );

  const editPaymentDate =

    document.getElementById(

      "editPaymentDate"

    );

  const editPhone =

    document.getElementById(

      "editPhone"

    );

  const editNote =

    document.getElementById(

      "editNote"

    );

  if (editId) {

    editId.value =

      row.id || "";

  }

  if (editUser) {

    editUser.value =

      row.user_name || "";

  }

  if (editCif) {

    editCif.value =

      row.cif || "";

  }

  if (editCustomerName) {

    editCustomerName.value =

      row.customer_name || "";

  }

  if (editAmount) {

    editAmount.value =

      formatAmount(

        row.amount || 0

      );

  }

  if (editPaymentDate) {

    editPaymentDate.value =

      String(

        row.payment_date || ""

      ).substring(

        0,

        10

      );

  }

  if (editPhone) {

    editPhone.value =

      row.phone || "";

  }

  if (editNote) {

    editNote.value =

      row.note || "";

  }

  const modal =

    document.getElementById(

      "editModal"

    );

  if (modal) {

    modal.style.display =

      "flex";

  }

}

// ============================================================

// ĐÓNG FORM CHỈNH SỬA

// ============================================================

function closeEditModal() {

  const modal =

    document.getElementById(

      "editModal"

    );

  if (modal) {

    modal.style.display =

      "none";

  }

}

// ============================================================

// LƯU DỮ LIỆU CHỈNH SỬA

// ============================================================

async function saveEditData() {

  const editId =

    document.getElementById(

      "editId"

    );

  const editUser =

    document.getElementById(

      "editUser"

    );

  const editCif =

    document.getElementById(

      "editCif"

    );

  const editCustomerName =

    document.getElementById(

      "editCustomerName"

    );

  const editAmount =

    document.getElementById(

      "editAmount"

    );

  const editPaymentDate =

    document.getElementById(

      "editPaymentDate"

    );

  const editPhone =

    document.getElementById(

      "editPhone"

    );

  const editNote =

    document.getElementById(

      "editNote"

    );

  const saveButton =

    document.getElementById(

      "saveEditBtn"

    );

  const id =

    editId

      ? editId.value.trim()

      : "";

  const userName =

    editUser

      ? editUser.value.trim()

      : "";

  const cif =

    editCif

      ? editCif.value.trim()

      : "";

  const customerName =

    editCustomerName

      ? editCustomerName.value.trim()

      : "";

  const amountText =

    editAmount

      ? editAmount.value

          .replace(

            /,/g,

            ""

          )

          .trim()

      : "";

  const amount =

    Number(

      amountText || 0

    );

  const paymentDate =

    editPaymentDate

      ? editPaymentDate.value

      : "";

  const phone =

    editPhone

      ? editPhone.value.trim()

      : "";

  const note =

    editNote

      ? editNote.value.trim()

      : "";

  // ==========================================================

  // KIỂM TRA

  // ==========================================================

  if (!id) {

    alert(

      "Không xác định được bản ghi cần sửa."

    );

    return;

  }

  if (!cif) {

    alert(

      "Vui lòng nhập Số CIF."

    );

    if (editCif) {

      editCif.focus();

    }

    return;

  }

  if (!customerName) {

    alert(

      "Vui lòng nhập tên khách hàng."

    );

    if (editCustomerName) {

      editCustomerName.focus();

    }

    return;

  }

  if (amount <= 0) {

    alert(

      "Số tiền dự thu phải lớn hơn 0."

    );

    if (editAmount) {

      editAmount.focus();

    }

    return;

  }

  if (!paymentDate) {

    alert(

      "Vui lòng chọn ngày thanh toán."

    );

    if (editPaymentDate) {

      editPaymentDate.focus();

    }

    return;

  }

  // ==========================================================

  // KHÓA NÚT

  // ==========================================================

  if (saveButton) {

    saveButton.disabled =

      true;

    saveButton.textContent =

      "⏳ ĐANG LƯU...";

  }

  try {

    showManagerMessage(

      "⏳ Đang cập nhật dữ liệu...",

      "#2563eb"

    );

    const {

      data,

      error

    } =

      await client

        .from("du_thu")

        .update({

          user_name:

            userName,

          cif:

            cif,

          customer_name:

            customerName,

          amount:

            amount,

          payment_date:

            paymentDate,

          phone:

            phone,

          note:

            note

        })

        .eq(

          "id",

          id

        )

        .select()

        .single();

    if (error) {

      throw error;

    }

    console.log(

      "Đã cập nhật:",

      data

    );

    closeEditModal();

    await loadData();

    applyFilter();

    showManagerMessage(

      "✅ Đã cập nhật bản ghi thành công.",

      "#16a34a"

    );

  } catch (error) {

    console.error(

      "Lỗi cập nhật dữ liệu:",

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

    alert(

      "Không thể cập nhật dữ liệu:\n\n" +

      (

        error.message ||

        error

      )

    );

  } finally {

    if (saveButton) {

      saveButton.disabled =

        false;

      saveButton.textContent =

        "💾 LƯU THAY ĐỔI";

    }

  }

}

// ============================================================

// XÓA BẢN GHI

// ============================================================

async function deleteData(

  id

) {

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

    } =

      await client

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

      "Lỗi xóa dữ liệu:",

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

// XUẤT EXCEL - EXCELJS

// KHÔNG CÓ STT

// ============================================================

async function exportExcel() {

  console.log(

    "Đã bấm nút XUẤT EXCEL - BẢN KHÔNG STT"

  );

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

    typeof ExcelJS === "undefined"

  ) {

    showManagerMessage(

      "❌ Thư viện Excel chưa tải được. Hãy kiểm tra Internet/CDN.",

      "#dc2626"

    );

    console.error(

      "ExcelJS không tồn tại."

    );

    return;

  }

  try {

    if (exportBtn) {

      exportBtn.disabled =

        true;

      exportBtn.textContent =

        "⏳ ĐANG XUẤT...";

    }

    showManagerMessage(

      "⏳ Đang tạo file Excel...",

      "#2563eb"

    );

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

    const BLUE =

      "FF2563EB";

    const GREEN =

      "FF16A34A";

    const WHITE =

      "FFFFFFFF";

    const LIGHT_BLUE =

      "FFE0F2FE";

    const BORDER =

      "FFD1D5DB";

    const thinBorder = {

      top: {

        style: "thin",

        color: {

          argb: BORDER

        }

      },

      bottom: {

        style: "thin",

        color: {

          argb: BORDER

        }

      },

      left: {

        style: "thin",

        color: {

          argb: BORDER

        }

      },

      right: {

        style: "thin",

        color: {

          argb: BORDER

        }

      }

    };

    // ========================================================

    // WORKBOOK

    // ========================================================

    const workbook =

      new ExcelJS.Workbook();

    workbook.creator =

      "Quản Lý Dự Thu";

    workbook.created =

      new Date();

    // ========================================================

    // SHEET DỰ THU

    // ========================================================

    const worksheet =

      workbook.addWorksheet(

        "Dự Thu"

      );

    worksheet.columns = [

      {

        header: "User",

        key: "user",

        width: 18

      },

      {

        header: "Số CIF",

        key: "cif",

        width: 18

      },

      {

        header: "Tên khách hàng",

        key: "customer",

        width: 30

      },

      {

        header: "Số tiền dự thu",

        key: "amount",

        width: 20

      },

      {

        header: "Ngày thanh toán",

        key: "paymentDate",

        width: 18

      },

      {

        header: "SĐT",

        key: "phone",

        width: 17

      },

      {

        header: "Ghi chú",

        key: "note",

        width: 40

      }

    ];

    // ========================================================

    // TIÊU ĐỀ

    // ========================================================

    worksheet.mergeCells(

      "A1:G1"

    );

    worksheet.getCell(

      "A1"

    ).value =

      "BÁO CÁO DỰ THU";

    worksheet.getCell(

      "A1"

    ).font = {

      name: "Arial",

      size: 18,

      bold: true

    };

    worksheet.getCell(

      "A1"

    ).alignment = {

      horizontal: "center",

      vertical: "middle"

    };

    worksheet.getRow(1).height =

      30;

    // ========================================================

    // NGÀY XUẤT

    // ========================================================

    worksheet.mergeCells(

      "A2:G2"

    );

    worksheet.getCell(

      "A2"

    ).value =

      `Ngày xuất: ${exportDate}`;

    worksheet.getCell(

      "A2"

    ).font = {

      name: "Arial",

      size: 11,

      italic: true

    };

    worksheet.getCell(

      "A2"

    ).alignment = {

      horizontal: "center",

      vertical: "middle"

    };

    // ========================================================

    // TỔNG HỒ SƠ

    // ========================================================

    worksheet.mergeCells(

      "A3:G3"

    );

    worksheet.getCell(

      "A3"

    ).value =

      `Tổng số hồ sơ: ${filteredData.length}`;

    worksheet.getCell(

      "A3"

    ).font = {

      name: "Arial",

      size: 11,

      bold: true

    };

    worksheet.getCell(

      "A3"

    ).alignment = {

      horizontal: "center",

      vertical: "middle"

    };

    worksheet.addRow([]);

    // ========================================================

    // HEADER

    // ========================================================

    const headerRow =

      worksheet.addRow([

        "User",

        "Số CIF",

        "Tên khách hàng",

        "Số tiền dự thu",

        "Ngày thanh toán",

        "SĐT",

        "Ghi chú"

      ]);

    headerRow.height =

      28;

    headerRow.eachCell(

      function (cell) {

        cell.font = {

          name: "Arial",

          size: 11,

          bold: true,

          color: {

            argb: WHITE

          }

        };

        cell.fill = {

          type: "pattern",

          pattern: "solid",

          fgColor: {

            argb: BLUE

          }

        };

        cell.alignment = {

          horizontal: "center",

          vertical: "middle",

          wrapText: true

        };

        cell.border =

          thinBorder;

      }

    );

    // ========================================================

    // DỮ LIỆU

    // ========================================================

    filteredData.forEach(

      function (row) {

        const excelRow =

          worksheet.addRow([

            row.user_name ||

              "",

            row.cif ||

              "",

            row.customer_name ||

              "",

            Number(

              row.amount || 0

            ),

            formatDateVietnamese(

              row.payment_date

            ),

            row.phone ||

              "",

            row.note ||

              ""

          ]);

        excelRow.eachCell(

          function (cell) {

            cell.font = {

              name: "Arial",

              size: 10

            };

            cell.border =

              thinBorder;

            cell.alignment = {

              vertical: "middle"

            };

          }

        );

        excelRow.getCell(

          1

        ).alignment = {

          horizontal: "left",

          vertical: "middle"

        };

        excelRow.getCell(

          2

        ).alignment = {

          horizontal: "center",

          vertical: "middle"

        };

        excelRow.getCell(

          3

        ).alignment = {

          horizontal: "left",

          vertical: "middle",

          wrapText: true

        };

        excelRow.getCell(

          4

        ).numFmt =

          "#,##0";

        excelRow.getCell(

          4

        ).alignment = {

          horizontal: "right",

          vertical: "middle"

        };

        excelRow.getCell(

          5

        ).alignment = {

          horizontal: "center",

          vertical: "middle"

        };

        excelRow.getCell(

          6

        ).alignment = {

          horizontal: "center",

          vertical: "middle"

        };

        excelRow.getCell(

          7

        ).alignment = {

          horizontal: "left",

          vertical: "middle",

          wrapText: true

        };

      }

    );

    // ========================================================

    // DÒNG TỔNG

    // ========================================================

    const totalRow =

      worksheet.addRow([

        "",

        "",

        "TỔNG DỰ THU",

        total,

        "",

        "",

        ""

      ]);

    totalRow.eachCell(

      function (cell) {

        cell.font = {

          name: "Arial",

          size: 11,

          bold: true

        };

        cell.fill = {

          type: "pattern",

          pattern: "solid",

          fgColor: {

            argb: LIGHT_BLUE

          }

        };

        cell.border = {

          top: {

            style: "medium",

            color: {

              argb: BLUE

            }

          },

          bottom: {

            style: "medium",

            color: {

              argb: BLUE

            }

          },

          left: {

            style: "thin",

            color: {

              argb: BORDER

            }

          },

          right: {

            style: "thin",

            color: {

              argb: BORDER

            }

          }

        };

      }

    );

    totalRow.getCell(

      3

    ).alignment = {

      horizontal: "right",

      vertical: "middle"

    };

    totalRow.getCell(

      4

    ).numFmt =

      "#,##0";

    totalRow.getCell(

      4

    ).alignment = {

      horizontal: "right",

      vertical: "middle"

    };

    // ========================================================

    // AUTO FILTER

    // ========================================================

    worksheet.autoFilter = {

      from: "A5",

      to:

        `G${5 + filteredData.length}`

    };

    worksheet.views = [

      {

        state: "frozen",

        ySplit: 5

      }

    ];

    // ========================================================

    // SHEET TỔNG QUAN

    // ========================================================

    const summarySheet =

      workbook.addWorksheet(

        "Tổng Quan"

      );

    summarySheet.columns = [

      {

        width: 30

      },

      {

        width: 20

      },

      {

        width: 25

      }

    ];

    summarySheet.mergeCells(

      "A1:C1"

    );

    summarySheet.getCell(

      "A1"

    ).value =

      "TỔNG QUAN DỰ THU";

    summarySheet.getCell(

      "A1"

    ).font = {

      name: "Arial",

      size: 18,

      bold: true

    };

    summarySheet.getCell(

      "A1"

    ).alignment = {

      horizontal: "center",

      vertical: "middle"

    };

    summarySheet.getRow(1).height =

      30;

    summarySheet.mergeCells(

      "A2:C2"

    );

    summarySheet.getCell(

      "A2"

    ).value =

      `Ngày xuất: ${exportDate}`;

    summarySheet.getCell(

      "A2"

    ).font = {

      name: "Arial",

      size: 11,

      italic: true

    };

    summarySheet.getCell(

      "A2"

    ).alignment = {

      horizontal: "center",

      vertical: "middle"

    };

    summarySheet.addRow([]);

    const indicatorHeader =

      summarySheet.addRow([

        "CHỈ TIÊU",

        "GIÁ TRỊ"

      ]);

    indicatorHeader.eachCell(

      function (cell) {

        cell.font = {

          name: "Arial",

          size: 11,

          bold: true,

          color: {

            argb: WHITE

          }

        };

        cell.fill = {

          type: "pattern",

          pattern: "solid",

          fgColor: {

            argb: BLUE

          }

        };

        cell.alignment = {

          horizontal: "center",

          vertical: "middle"

        };

        cell.border =

          thinBorder;

      }

    );

    const countRow =

      summarySheet.addRow([

        "Tổng số hồ sơ",

        filteredData.length

      ]);

    const amountRow =

      summarySheet.addRow([

        "Tổng dự thu",

        total

      ]);

    [countRow, amountRow]

      .forEach(

        function (row) {

          row.eachCell(

            function (cell) {

              cell.font = {

                name: "Arial",

                size: 10

              };

              cell.border =

                thinBorder;

              cell.alignment = {

                vertical: "middle"

              };

            }

          );

        }

      );

    amountRow.getCell(

      2

    ).numFmt =

      "#,##0";

    amountRow.getCell(

      2

    ).alignment = {

      horizontal: "right",

      vertical: "middle"

    };

    summarySheet.addRow([]);

    const userHeader =

      summarySheet.addRow([

        "USER",

        "SỐ HỒ SƠ",

        "TỔNG DỰ THU"

      ]);

    userHeader.eachCell(

      function (cell) {

        cell.font = {

          name: "Arial",

          size: 11,

          bold: true,

          color: {

            argb: WHITE

          }

        };

        cell.fill = {

          type: "pattern",

          pattern: "solid",

          fgColor: {

            argb: GREEN

          }

        };

        cell.alignment = {

          horizontal: "center",

          vertical: "middle"

        };

        cell.border =

          thinBorder;

      }

    );

    // ========================================================

    // GROUP THEO USER

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

        item.amount +=

          amount;

      }

    );

    const userEntries =

      Array.from(

        userMap.entries()

      ).sort(

        function (

          a,

          b

        ) {

          return (

            b[1].amount -

            a[1].amount

          );

        }

      );

    userEntries.forEach(

      function (

        [user, value]

      ) {

        const row =

          summarySheet.addRow([

            user,

            value.count,

            value.amount

          ]);

        row.eachCell(

          function (cell) {

            cell.font = {

              name: "Arial",

              size: 10

            };

            cell.border =

              thinBorder;

            cell.alignment = {

              vertical: "middle"

            };

          }

        );

        row.getCell(

          2

        ).alignment = {

          horizontal: "center",

          vertical: "middle"

        };

        row.getCell(

          3

        ).numFmt =

          "#,##0";

        row.getCell(

          3

        ).alignment = {

          horizontal: "right",

          vertical: "middle"

        };

      }

    );

    summarySheet.views = [

      {

        state: "frozen",

        ySplit: 8

      }

    ];

    // ========================================================

    // TẠO FILE

    // ========================================================

    const buffer =

      await workbook.xlsx.writeBuffer();

    const blob =

      new Blob(

        [

          buffer

        ],

        {

          type:

            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        }

      );

    const url =

      window.URL.createObjectURL(

        blob

      );

    const link =

      document.createElement(

        "a"

      );

    link.href =

      url;

    link.download =

      `DU_THU_${fileDate}.xlsx`;

    link.style.display =

      "none";

    document.body.appendChild(

      link

    );

    link.click();

    document.body.removeChild(

      link

    );

    setTimeout(

      function () {

        window.URL.revokeObjectURL(

          url

        );

      },

      1000

    );

    showManagerMessage(

      "✅ Đã xuất Excel thành công - không có cột STT.",

      "#16a34a"

    );

  } catch (error) {

    console.error(

      "Lỗi xuất Excel:",

      error

    );

    showManagerMessage(

      "❌ Xuất Excel thất bại: " +

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

        "📥 XUẤT EXCEL";

    }

  }

}

// ============================================================

// ĐĂNG NHẬP

// ============================================================

async function login() {

  if (!client) {

    showLoginMessage(

      "❌ Supabase chưa được kết nối."

    );

    return;

  }

  const email =

    emailInput

      ? emailInput.value.trim()

      : "";

  const password =

    passwordInput

      ? passwordInput.value

      : "";

  if (

    !email ||

    !password

  ) {

    showLoginMessage(

      "⚠️ Vui lòng nhập email và mật khẩu."

    );

    return;

  }

  if (loginBtn) {

    loginBtn.disabled =

      true;

    loginBtn.textContent =

      "⏳ ĐANG ĐĂNG NHẬP...";

  }

  showLoginMessage(

    "",

    "#2563eb"

  );

  try {

    const {

      error

    } =

      await client.auth

        .signInWithPassword({

          email:

            email,

          password:

            password

        });

    if (error) {

      throw error;

    }

    if (loginBox) {

      loginBox.style.display =

        "none";

    }

    if (managerBox) {

      managerBox.style.display =

        "block";

    }

    await loadData();

  } catch (error) {

    console.error(

      "Lỗi đăng nhập:",

      error

    );

    showLoginMessage(

      "❌ Đăng nhập thất bại: " +

      (

        error.message ||

        error

      )

    );

  } finally {

    if (loginBtn) {

      loginBtn.disabled =

        false;

      loginBtn.textContent =

        "🔐 ĐĂNG NHẬP";

    }

  }

}

// ============================================================

// ĐĂNG XUẤT

// ============================================================

async function logout() {

  if (!client) {

    return;

  }

  try {

    const {

      error

    } =

      await client.auth.signOut();

    if (error) {

      throw error;

    }

    if (managerBox) {

      managerBox.style.display =

        "none";

    }

    if (loginBox) {

      loginBox.style.display =

        "block";

    }

    if (passwordInput) {

      passwordInput.value =

        "";

    }

    showLoginMessage(

      "✅ Đã đăng xuất.",

      "#16a34a"

    );

  } catch (error) {

    console.error(

      "Lỗi đăng xuất:",

      error

    );

    showManagerMessage(

      "❌ Đăng xuất thất bại: " +

      (

        error.message ||

        error

      ),

      "#dc2626"

    );

  }

}

// ============================================================

// KIỂM TRA SESSION

// ============================================================

async function checkSession() {

  if (!client) {

    showLoginMessage(

      "❌ Không thể kết nối Supabase."

    );

    return;

  }

  try {

    const {

      data,

      error

    } =

      await client.auth.getSession();

    if (error) {

      throw error;

    }

    const session =

      data

        ? data.session

        : null;

    if (session) {

      if (loginBox) {

        loginBox.style.display =

          "none";

      }

      if (managerBox) {

        managerBox.style.display =

          "block";

      }

      try {

        await loadData();

      } catch (error) {

        console.error(

          error

        );

        showManagerMessage(

          "❌ Không thể tải dữ liệu: " +

          (

            error.message ||

            error

          ),

          "#dc2626"

        );

      }

    } else {

      if (loginBox) {

        loginBox.style.display =

          "block";

      }

      if (managerBox) {

        managerBox.style.display =

          "none";

      }

    }

  } catch (error) {

    console.error(

      "Lỗi kiểm tra session:",

      error

    );

    showLoginMessage(

      "❌ Không thể kiểm tra đăng nhập: " +

      (

        error.message ||

        error

      )

    );

  }

}

// ============================================================

// GẮN SỰ KIỆN

// ============================================================

if (loginBtn) {

  loginBtn.addEventListener(

    "click",

    login

  );

}

if (logoutBtn) {

  logoutBtn.addEventListener(

    "click",

    logout

  );

}

if (filterBtn) {

  filterBtn.addEventListener(

    "click",

    filterData

  );

}

if (refreshBtn) {

  refreshBtn.addEventListener(

    "click",

    async function () {

      try {

        await loadData();

        applyFilter();

      } catch (error) {

        console.error(

          "Lỗi làm mới:",

          error

        );

        showManagerMessage(

          "❌ Làm mới thất bại: " +

          (

            error.message ||

            error

          ),

          "#dc2626"

        );

      }

    }

  );

}

if (exportBtn) {

  exportBtn.addEventListener(

    "click",

    function (event) {

      event.preventDefault();

      exportExcel();

    }

  );

}

// ============================================================

// KHỞI ĐỘNG

// ============================================================

checkSession();
