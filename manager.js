"use strict";

// ============================================================

// QUẢN LÝ DỰ THU - MANAGER.JS

// FULL VERSION

// - CHỈNH SỬA

// - XÓA

// - LỌC

// - PHÂN TRANG

// - THỐNG KÊ

// - TỰ XỬ LÝ CIF TRÙNG

// - XUẤT EXCEL KHÔNG STT

// ============================================================

// ============================================================

// SUPABASE

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

// BIẾN

// ============================================================

let allData = [];

let filteredData = [];

let currentPage = 1;

const PAGE_SIZE = 20;

let editingId = null;

// ============================================================

// HTML

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

// THÔNG BÁO LOGIN

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

// THÔNG BÁO MANAGER

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

// FORMAT TIỀN

// ============================================================

function formatAmount(

  amount

) {

  const number =

    Number(amount || 0);

  return number.toLocaleString(

    "en-US"

  );

}

// ============================================================

// CHUYỂN TIỀN NHẬP VỀ NUMBER

// Ví dụ:

// 160,000,000

// 160.000.000

// 160000000

// ============================================================

function parseAmount(

  value

) {

  if (

    value === null ||

    value === undefined

  ) {

    return 0;

  }

  let text =

    String(value)

      .trim();

  if (!text) {

    return 0;

  }

  text =

    text.replace(

      /[^\d-]/g,

      ""

    );

  const number =

    Number(text);

  return Number.isFinite(number)

    ? number

    : 0;

}

// ============================================================

// FORMAT NGÀY

// YYYY-MM-DD -> DD/MM/YYYY

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

// FORMAT DATE INPUT

// ============================================================

function formatDateInput(

  dateValue

) {

  if (!dateValue) {

    return "";

  }

  return String(dateValue)

    .substring(0, 10);

}

// ============================================================

// ESCAPE HTML

// ============================================================

function escapeHTML(

  value

) {

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

// SO SÁNH RECORD

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

// XỬ LÝ CIF TRÙNG

// ============================================================

async function removeDuplicateCIF(

  rows

) {

  const latestByCIF =

    new Map();

  const duplicateIds =

    [];

  for (

    const row of rows

  ) {

    const cif =

      String(

        row.cif || ""

      ).trim();

    // Không có CIF thì giữ nguyên

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

  // XÓA RECORD TRÙNG

  // ==========================================================

  if (

    duplicateIds.length > 0

  ) {

    try {

      const result =

        await client

          .from("du_thu")

          .delete()

          .in(

            "id",

            duplicateIds

          );

      if (

        result &&

        result.error

      ) {

        console.warn(

          "Không xóa được CIF trùng:",

          result.error.message

        );

      }

    } catch (error) {

      console.warn(

        "Lỗi xử lý CIF trùng:",

        error

      );

    }

  }

  // ==========================================================

  // RECORD KHÔNG CÓ CIF

  // ==========================================================

  for (

    const row of rows

  ) {

    const cif =

      String(

        row.cif || ""

      ).trim();

    if (!cif) {

      // Nếu không có CIF thì thêm vào kết quả

      const alreadyExists =

        latestByCIF.has(

          "__NO_CIF__" + row.id

        );

      if (!alreadyExists) {

        latestByCIF.set(

          "__NO_CIF__" + row.id,

          row

        );

      }

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

  try {

    const result =

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

    if (

      result.error

    ) {

      throw result.error;

    }

    const rows =

      Array.isArray(result.data)

        ? result.data

        : [];

    // ========================================================

    // XỬ LÝ CIF TRÙNG

    // ========================================================

    allData =

      await removeDuplicateCIF(

        rows

      );

    // ========================================================

    // SẮP XẾP

    // ========================================================

    allData.sort(

      function (

        a,

        b

      ) {

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

    // ========================================================

    // RESET

    // ========================================================

    currentPage = 1;

    filteredData =

      [...allData];

    renderTable();

    renderPagination();

    updateStatistics();

    showManagerMessage(

      `✅ Đã tải ${allData.length} bản ghi.`,

      "#16a34a"

    );

    return true;

  } catch (error) {

    console.error(

      "LOAD DATA ERROR:",

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

    throw error;

  }

}

// ============================================================

// LỌC

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

      function (

        row

      ) {

        const rowUser =

          String(

            row.user_name || ""

          )

            .toLowerCase();

        const rowDate =

          String(

            row.payment_date || ""

          )

            .substring(

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

          colspan="9"

          style="

            text-align:center;

            padding:25px;

          ">

          Không có dữ liệu phù hợp.

        </td>

      </tr>

    `;

    return;

  }

  const startIndex =

    (

      currentPage -

      1

    ) *

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

    function (

      row

    ) {

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

          style="

            text-align:right;

            white-space:nowrap;

          ">

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

            )}"

            style="

              border:none;

              background:#2563eb;

              color:white;

              padding:8px 12px;

              border-radius:7px;

              cursor:pointer;

              margin-right:5px;

              font-weight:600;

            ">

            ✏️ Sửa

          </button>

          <button

            type="button"

            class="delete-btn"

            data-id="${escapeHTML(

              row.id

            )}"

            style="

              border:none;

              background:#dc3545;

              color:white;

              padding:8px 12px;

              border-radius:7px;

              cursor:pointer;

              font-weight:600;

            ">

            🗑️ Xóa

          </button>

        </td>

      `;

      // ======================================================

      // NÚT SỬA

      // ======================================================

      const editButton =

        tr.querySelector(

          ".edit-btn"

        );

      if (editButton) {

        editButton.addEventListener(

          "click",

          function () {

            openEditModal(

              row.id

            );

          }

        );

      }

      // ======================================================

      // NÚT XÓA

      // ======================================================

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

// TẠO MODAL CHỈNH SỬA

// Không cần sửa manager.html

// ============================================================

function createEditModal() {

  if (

    document.getElementById(

      "editDataModal"

    )

  ) {

    return;

  }

  const modal =

    document.createElement(

      "div"

    );

  modal.id =

    "editDataModal";

  modal.style.cssText = `

    position:fixed;

    inset:0;

    background:rgba(0,0,0,0.55);

    display:none;

    align-items:center;

    justify-content:center;

    z-index:99999;

    padding:20px;

    box-sizing:border-box;

  `;

  modal.innerHTML = `

    <div

      style="

        width:100%;

        max-width:550px;

        max-height:90vh;

        overflow-y:auto;

        background:white;

        border-radius:15px;

        box-shadow:0 20px 60px rgba(0,0,0,.3);

        padding:22px;

        box-sizing:border-box;

      ">

      <div

        style="

          display:flex;

          justify-content:space-between;

          align-items:center;

          margin-bottom:20px;

        ">

        <h2

          style="

            margin:0;

            color:#1d4ed8;

            font-size:21px;

          ">

          ✏️ CHỈNH SỬA DỰ THU

        </h2>

        <button

          type="button"

          id="editCloseBtn"

          style="

            border:none;

            background:#f1f5f9;

            width:35px;

            height:35px;

            border-radius:50%;

            font-size:20px;

            cursor:pointer;

          ">

          ✕

        </button>

      </div>

      <div

        style="

          display:grid;

          gap:14px;

        ">

        <div>

          <label

            style="

              display:block;

              margin-bottom:6px;

              font-weight:600;

            ">

            User

          </label>

          <input

            id="editUser"

            type="text"

            style="

              width:100%;

              box-sizing:border-box;

              padding:11px;

              border:1px solid #d1d5db;

              border-radius:8px;

            "

          >

        </div>

        <div>

          <label

            style="

              display:block;

              margin-bottom:6px;

              font-weight:600;

            ">

            Số CIF

          </label>

          <input

            id="editCIF"

            type="text"

            style="

              width:100%;

              box-sizing:border-box;

              padding:11px;

              border:1px solid #d1d5db;

              border-radius:8px;

            "

          >

        </div>

        <div>

          <label

            style="

              display:block;

              margin-bottom:6px;

              font-weight:600;

            ">

            Tên khách hàng

          </label>

          <input

            id="editCustomer"

            type="text"

            style="

              width:100%;

              box-sizing:border-box;

              padding:11px;

              border:1px solid #d1d5db;

              border-radius:8px;

            "

          >

        </div>

        <div>

          <label

            style="

              display:block;

              margin-bottom:6px;

              font-weight:600;

            ">

            Số tiền dự thu

          </label>

          <input

            id="editAmount"

            type="text"

            inputmode="numeric"

            placeholder="Ví dụ: 160,000,000"

            style="

              width:100%;

              box-sizing:border-box;

              padding:11px;

              border:1px solid #d1d5db;

              border-radius:8px;

            "

          >

        </div>

        <div>

          <label

            style="

              display:block;

              margin-bottom:6px;

              font-weight:600;

            ">

            Ngày thanh toán

          </label>

          <input

            id="editPaymentDate"

            type="date"

            style="

              width:100%;

              box-sizing:border-box;

              padding:11px;

              border:1px solid #d1d5db;

              border-radius:8px;

            "

          >

        </div>

        <div>

          <label

            style="

              display:block;

              margin-bottom:6px;

              font-weight:600;

            ">

            SĐT

          </label>

          <input

            id="editPhone"

            type="text"

            inputmode="tel"

            style="

              width:100%;

              box-sizing:border-box;

              padding:11px;

              border:1px solid #d1d5db;

              border-radius:8px;

            "

          >

        </div>

        <div>

          <label

            style="

              display:block;

              margin-bottom:6px;

              font-weight:600;

            ">

            Ghi chú

          </label>

          <textarea

            id="editNote"

            rows="4"

            style="

              width:100%;

              box-sizing:border-box;

              padding:11px;

              border:1px solid #d1d5db;

              border-radius:8px;

              resize:vertical;

            "

          ></textarea>

        </div>

      </div>

      <div

        style="

          display:flex;

          gap:10px;

          justify-content:flex-end;

          margin-top:22px;

        ">

        <button

          type="button"

          id="editCancelBtn"

          style="

            border:none;

            background:#6b7280;

            color:white;

            padding:11px 18px;

            border-radius:8px;

            cursor:pointer;

            font-weight:600;

          ">

          Hủy

        </button>

        <button

          type="button"

          id="editSaveBtn"

          style="

            border:none;

            background:#16a34a;

            color:white;

            padding:11px 18px;

            border-radius:8px;

            cursor:pointer;

            font-weight:600;

          ">

          💾 Lưu thay đổi

        </button>

      </div>

      <div

        id="editMessage"

        style="

          margin-top:12px;

          text-align:center;

          font-weight:600;

        ">

      </div>

    </div>

  `;

  document.body.appendChild(

    modal

  );

  // ==========================================================

  // NÚT ĐÓNG

  // ==========================================================

  document

    .getElementById(

      "editCloseBtn"

    )

    .addEventListener(

      "click",

      closeEditModal

    );

  document

    .getElementById(

      "editCancelBtn"

    )

    .addEventListener(

      "click",

      closeEditModal

    );

  document

    .getElementById(

      "editSaveBtn"

    )

    .addEventListener(

      "click",

      saveEditData

    );

  // Click nền để đóng

  modal.addEventListener(

    "click",

    function (

      event

    ) {

      if (

        event.target === modal

      ) {

        closeEditModal();

      }

    }

  );

}

// ============================================================

// MỞ FORM SỬA

// ============================================================

function openEditModal(

  id

) {

  createEditModal();

  const row =

    allData.find(

      function (

        item

      ) {

        return (

          String(item.id) ===

          String(id)

        );

      }

    );

  if (!row) {

    showManagerMessage(

      "❌ Không tìm thấy bản ghi cần sửa.",

      "#dc2626"

    );

    return;

  }

  editingId =

    id;

  document.getElementById(

    "editUser"

  ).value =

    row.user_name || "";

  document.getElementById(

    "editCIF"

  ).value =

    row.cif || "";

  document.getElementById(

    "editCustomer"

  ).value =

    row.customer_name || "";

  document.getElementById(

    "editAmount"

  ).value =

    formatAmount(

      row.amount

    );

  document.getElementById(

    "editPaymentDate"

  ).value =

    formatDateInput(

      row.payment_date

    );

  document.getElementById(

    "editPhone"

  ).value =

    row.phone || "";

  document.getElementById(

    "editNote"

  ).value =

    row.note || "";

  document.getElementById(

    "editMessage"

  ).textContent =

    "";

  document.getElementById(

    "editDataModal"

  ).style.display =

    "flex";

}

// ============================================================

// ĐÓNG FORM SỬA

// ============================================================

function closeEditModal() {

  const modal =

    document.getElementById(

      "editDataModal"

    );

  if (modal) {

    modal.style.display =

      "none";

  }

  editingId =

    null;

}

// ============================================================

// LƯU CHỈNH SỬA

// ============================================================

async function saveEditData() {

  if (!editingId) {

    return;

  }

  const saveButton =

    document.getElementById(

      "editSaveBtn"

    );

  const editMessage =

    document.getElementById(

      "editMessage"

    );

  const user =

    document.getElementById(

      "editUser"

    ).value.trim();

  const cif =

    document.getElementById(

      "editCIF"

    ).value.trim();

  const customer =

    document.getElementById(

      "editCustomer"

    ).value.trim();

  const amount =

    parseAmount(

      document.getElementById(

        "editAmount"

      ).value

    );

  const paymentDate =

    document.getElementById(

      "editPaymentDate"

    ).value;

  const phone =

    document.getElementById(

      "editPhone"

    ).value.trim();

  const note =

    document.getElementById(

      "editNote"

    ).value.trim();

  // ==========================================================

  // KIỂM TRA

  // ==========================================================

  if (!user) {

    editMessage.textContent =

      "⚠️ Vui lòng nhập User.";

    editMessage.style.color =

      "#dc2626";

    return;

  }

  if (!cif) {

    editMessage.textContent =

      "⚠️ Vui lòng nhập Số CIF.";

    editMessage.style.color =

      "#dc2626";

    return;

  }

  if (!customer) {

    editMessage.textContent =

      "⚠️ Vui lòng nhập Tên khách hàng.";

    editMessage.style.color =

      "#dc2626";

    return;

  }

  if (

    !paymentDate

  ) {

    editMessage.textContent =

      "⚠️ Vui lòng chọn Ngày thanh toán.";

    editMessage.style.color =

      "#dc2626";

    return;

  }

  if (

    saveButton

  ) {

    saveButton.disabled =

      true;

    saveButton.textContent =

      "⏳ ĐANG LƯU...";

  }

  editMessage.textContent =

    "⏳ Đang lưu...";

  editMessage.style.color =

    "#2563eb";

  try {

    const updateData = {

      user_name:

        user,

      cif:

        cif,

      customer_name:

        customer,

      amount:

        amount,

      payment_date:

        paymentDate,

      phone:

        phone,

      note:

        note

    };

    const result =

      await client

        .from("du_thu")

        .update(

          updateData

        )

        .eq(

          "id",

          editingId

        )

        .select();

    if (

      result.error

    ) {

      throw result.error;

    }

    editMessage.textContent =

      "✅ Đã lưu thay đổi.";

    editMessage.style.color =

      "#16a34a";

    showManagerMessage(

      "✅ Đã cập nhật bản ghi.",

      "#16a34a"

    );

    // ========================================================

    // Đóng sau một chút

    // ========================================================

    setTimeout(

      async function () {

        closeEditModal();

        try {

          await loadData();

          applyFilter();

        } catch (error) {

          console.error(

            "Lỗi tải lại sau khi sửa:",

            error

          );

        }

      },

      500

    );

  } catch (error) {

    console.error(

      "Lỗi cập nhật:",

      error

    );

    editMessage.textContent =

      "❌ Lưu thất bại: " +

      (

        error.message ||

        error

      );

    editMessage.style.color =

      "#dc2626";

    showManagerMessage(

      "❌ Cập nhật thất bại: " +

      (

        error.message ||

        error

      ),

      "#dc2626"

    );

  } finally {

    if (

      saveButton

    ) {

      saveButton.disabled =

        false;

      saveButton.textContent =

        "💾 Lưu thay đổi";

    }

  }

}

// ============================================================

// XÓA

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

    const result =

      await client

        .from("du_thu")

        .delete()

        .eq(

          "id",

          id

        );

    if (

      result.error

    ) {

      throw result.error;

    }

    // ========================================================

    // XÓA LOCAL NGAY

    // ========================================================

    allData =

      allData.filter(

        function (

          row

        ) {

          return (

            String(row.id) !==

            String(id)

          );

        }

      );

    applyFilter();

    showManagerMessage(

      "✅ Đã xóa bản ghi thành công.",

      "#16a34a"

    );

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

    currentPage ===

    totalPages;

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

function changePage(

  page

) {

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

  if (

    page > totalPages

  ) {

    page =

      totalPages;

  }

  currentPage =

    page;

  renderTable();

  renderPagination();

}

// ============================================================

// THỐNG KÊ

// ============================================================

function updateStatistics() {

  const uniqueCIF =

    new Set();

  let total =

    0;

  filteredData.forEach(

    function (

      row

    ) {

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

  if (

    totalCustomers

  ) {

    totalCustomers.textContent =

      uniqueCIF.size;

  }

  if (

    totalAmount

  ) {

    totalAmount.textContent =

      formatAmount(

        total

      ) +

      " đ";

  }

}

// ============================================================

// XUẤT EXCEL

// ============================================================

async function exportExcel() {

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

    typeof ExcelJS ===

    "undefined"

  ) {

    showManagerMessage(

      "❌ Thư viện Excel chưa tải được.",

      "#dc2626"

    );

    return;

  }

  try {

    if (

      exportBtn

    ) {

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

      function (

        cell

      ) {

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

    filteredData.forEach(

      function (

        row

      ) {

        const excelRow =

          worksheet.addRow([

            row.user_name || "",

            row.cif || "",

            row.customer_name || "",

            Number(

              row.amount || 0

            ),

            formatDateVietnamese(

              row.payment_date

            ),

            row.phone || "",

            row.note || ""

          ]);

        excelRow.eachCell(

          function (

            cell

          ) {

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

          7

        ).alignment = {

          horizontal: "left",

          vertical: "middle",

          wrapText: true

        };

      }

    );

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

      function (

        cell

      ) {

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

        cell.border =

          thinBorder;

      }

    );

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

    // TỔNG QUAN

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

      function (

        cell

      ) {

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

        function (

          row

        ) {

          row.eachCell(

            function (

              cell

            ) {

              cell.border =

                thinBorder;

              cell.font = {

                name: "Arial",

                size: 10

              };

            }

          );

        }

      );

    amountRow.getCell(

      2

    ).numFmt =

      "#,##0";

    summarySheet.addRow([]);

    const userHeader =

      summarySheet.addRow([

        "USER",

        "SỐ HỒ SƠ",

        "TỔNG DỰ THU"

      ]);

    userHeader.eachCell(

      function (

        cell

      ) {

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

    const userMap =

      new Map();

    filteredData.forEach(

      function (

        row

      ) {

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

          function (

            cell

          ) {

            cell.font = {

              name: "Arial",

              size: 10

            };

            cell.border =

              thinBorder;

          }

        );

        row.getCell(

          3

        ).numFmt =

          "#,##0";

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

        [buffer],

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

      "✅ Đã xuất Excel thành công.",

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

    if (

      exportBtn

    ) {

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

  if (

    loginBtn

  ) {

    loginBtn.disabled =

      true;

    loginBtn.textContent =

      "⏳ ĐANG ĐĂNG NHẬP...";

  }

  try {

    const result =

      await client.auth

        .signInWithPassword({

          email:

            email,

          password:

            password

        });

    if (

      result.error

    ) {

      throw result.error;

    }

    if (

      loginBox

    ) {

      loginBox.style.display =

        "none";

    }

    if (

      managerBox

    ) {

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

    if (

      loginBtn

    ) {

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

    const result =

      await client.auth.signOut();

    if (

      result.error

    ) {

      throw result.error;

    }

    if (

      managerBox

    ) {

      managerBox.style.display =

        "none";

    }

    if (

      loginBox

    ) {

      loginBox.style.display =

        "block";

    }

    if (

      passwordInput

    ) {

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

    const result =

      await client.auth.getSession();

    if (

      result.error

    ) {

      throw result.error;

    }

    const session =

      result.data

        ? result.data.session

        : null;

    if (session) {

      if (

        loginBox

      ) {

        loginBox.style.display =

          "none";

      }

      if (

        managerBox

      ) {

        managerBox.style.display =

          "block";

      }

      try {

        await loadData();

      } catch (error) {

        console.error(

          "Không tải được dữ liệu:",

          error

        );

      }

    } else {

      if (

        loginBox

      ) {

        loginBox.style.display =

          "block";

      }

      if (

        managerBox

      ) {

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

// SỰ KIỆN LOGIN

// ============================================================

if (

  loginBtn

) {

  loginBtn.addEventListener(

    "click",

    login

  );

}

// ============================================================

// ENTER ĐỂ ĐĂNG NHẬP

// ============================================================

if (

  passwordInput

) {

  passwordInput.addEventListener(

    "keydown",

    function (

      event

    ) {

      if (

        event.key ===

        "Enter"

      ) {

        login();

      }

    }

  );

}

// ============================================================

// LOGOUT

// ============================================================

if (

  logoutBtn

) {

  logoutBtn.addEventListener(

    "click",

    logout

  );

}

// ============================================================

// FILTER

// ============================================================

if (

  filterBtn

) {

  filterBtn.addEventListener(

    "click",

    filterData

  );

}

// ============================================================

// REFRESH

// ============================================================

if (

  refreshBtn

) {

  refreshBtn.addEventListener(

    "click",

    async function () {

      // Không cho bấm liên tục

      if (

        refreshBtn.disabled

      ) {

        return;

      }

      refreshBtn.disabled =

        true;

      const oldText =

        refreshBtn.textContent;

      refreshBtn.textContent =

        "⏳ ĐANG TẢI...";

      try {

        await loadData();

        applyFilter();

        showManagerMessage(

          "✅ Đã làm mới dữ liệu.",

          "#16a34a"

        );

      } catch (error) {

        console.error(

          "REFRESH ERROR:",

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

      } finally {

        refreshBtn.disabled =

          false;

        refreshBtn.textContent =

          oldText ||

          "🔄 LÀM MỚI";

      }

    }

  );

}

// ============================================================

// EXPORT

// ============================================================

if (

  exportBtn

) {

  exportBtn.addEventListener(

    "click",

    function (

      event

    ) {

      event.preventDefault();

      exportExcel();

    }

  );

}

// ============================================================

// TẠO MODAL

// ============================================================

createEditModal();

// ============================================================

// KHỞI ĐỘNG

// ============================================================

checkSession();
