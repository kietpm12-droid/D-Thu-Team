"use strict";

// ============================================================

// KẾT NỐI SUPABASE

// ============================================================

const client = window.supabase.createClient(

  window.SUPABASE_URL,

  window.SUPABASE_ANON_KEY

);

// ============================================================

// BIẾN TOÀN CỤC

// ============================================================

let allData = [];

let filteredData = [];

let currentPage = 1;

const PAGE_SIZE = 20;

// ============================================================

// LẤY CÁC PHẦN TỬ HTML

// ============================================================

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

// ============================================================

// HIỂN THỊ THÔNG BÁO

// ============================================================

function showLoginMessage(text, color = "#dc2626") {

  loginMessage.textContent = text;

  loginMessage.style.color = color;

}

function showManagerMessage(text, color = "#2563eb") {

  managerMessage.textContent = text;

  managerMessage.style.color = color;

}

// ============================================================

// ĐỊNH DẠNG SỐ TIỀN

// ============================================================

function formatAmount(amount) {

  const number = Number(amount || 0);

  return number.toLocaleString("en-US");

}

// ============================================================

// ĐỊNH DẠNG NGÀY VIỆT NAM

// YYYY-MM-DD -> DD/MM/YYYY

// ============================================================

function formatDateVietnamese(dateValue) {

  if (!dateValue) {

    return "";

  }

  const dateText = String(dateValue).substring(0, 10);

  const parts = dateText.split("-");

  if (parts.length !== 3) {

    return dateText;

  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;

}

// ============================================================

// CHỐNG LỖI HTML

// ============================================================

function escapeHTML(value) {

  if (value === null || value === undefined) {

    return "";

  }

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}

// ============================================================

// SO SÁNH BẢN GHI

// ============================================================

function isNewerRecord(newRecord, oldRecord) {

  const newDate = String(newRecord.payment_date || "");

  const oldDate = String(oldRecord.payment_date || "");

  if (newDate !== oldDate) {

    return newDate > oldDate;

  }

  const newCreated = newRecord.created_at

    ? new Date(newRecord.created_at).getTime()

    : 0;

  const oldCreated = oldRecord.created_at

    ? new Date(oldRecord.created_at).getTime()

    : 0;

  return newCreated > oldCreated;

}

// ============================================================

// LOẠI BỎ CIF TRÙNG

// ============================================================

async function removeDuplicateCIF(rows) {

  const latestByCIF = new Map();

  const duplicateIds = [];

  for (const row of rows) {

    const cif = String(row.cif || "").trim();

    if (!cif) {

      continue;

    }

    const key = cif.toUpperCase();

    if (!latestByCIF.has(key)) {

      latestByCIF.set(key, row);

      continue;

    }

    const currentLatest = latestByCIF.get(key);

    if (isNewerRecord(row, currentLatest)) {

      if (currentLatest.id) {

        duplicateIds.push(currentLatest.id);

      }

      latestByCIF.set(key, row);

    } else {

      if (row.id) {

        duplicateIds.push(row.id);

      }

    }

  }

  // ==========================================================

  // XÓA CIF TRÙNG TRONG DATABASE

  // ==========================================================

  if (duplicateIds.length > 0) {

    const { error } = await client

      .from("du_thu")

      .delete()

      .in("id", duplicateIds);

    if (error) {

      console.warn(

        "Không thể xóa bản ghi CIF trùng:",

        error.message

      );

    }

  }

  return Array.from(latestByCIF.values());

}

// ============================================================

// TẢI DỮ LIỆU

// ============================================================

async function loadData() {

  showManagerMessage(

    "⏳ Đang tải dữ liệu...",

    "#2563eb"

  );

  const { data, error } = await client

    .from("du_thu")

    .select("*")

    .order("payment_date", {

      ascending: false

    })

    .order("created_at", {

      ascending: false

    });

  if (error) {

    throw error;

  }

  const rows = Array.isArray(data)

    ? data

    : [];

  allData = await removeDuplicateCIF(rows);

  // ==========================================================

  // SẮP XẾP

  // ==========================================================

  allData.sort(function (a, b) {

    const dateA = String(a.payment_date || "");

    const dateB = String(b.payment_date || "");

    if (dateA !== dateB) {

      return dateB.localeCompare(dateA);

    }

    const createdA = a.created_at

      ? new Date(a.created_at).getTime()

      : 0;

    const createdB = b.created_at

      ? new Date(b.created_at).getTime()

      : 0;

    return createdB - createdA;

  });

  filteredData = [...allData];

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

// LỌC

// ============================================================

function applyFilter() {

  const selectedUser =

    filterUser.value.trim().toLowerCase();

  const selectedDate =

    filterDate.value;

  filteredData = allData.filter(function (row) {

    const rowUser =

      String(row.user_name || "").toLowerCase();

    const rowDate =

      String(row.payment_date || "").substring(0, 10);

    const matchUser =

      !selectedUser ||

      rowUser.includes(selectedUser);

    const matchDate =

      !selectedDate ||

      rowDate === selectedDate;

    return matchUser && matchDate;

  });

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

  tableBody.innerHTML = "";

  if (filteredData.length === 0) {

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

    (currentPage - 1) * PAGE_SIZE;

  const endIndex =

    startIndex + PAGE_SIZE;

  const pageData =

    filteredData.slice(

      startIndex,

      endIndex

    );

  pageData.forEach(function (row) {

    const tr =

      document.createElement("tr");

    tr.innerHTML = `

      <td>

        ${escapeHTML(row.user_name)}

      </td>

      <td>

        ${escapeHTML(row.cif)}

      </td>

      <td>

        ${escapeHTML(row.customer_name)}

      </td>

      <td style="text-align:right;">

        ${formatAmount(row.amount)}

      </td>

      <td>

        ${formatDateVietnamese(row.payment_date)}

      </td>

      <td>

        ${escapeHTML(row.phone || "")}

      </td>

      <td>

        ${escapeHTML(row.note || "")}

      </td>

      <td style="text-align:center;">

        <button

          type="button"

          class="delete-btn"

          data-id="${escapeHTML(row.id)}">

          🗑️ Xóa

        </button>

      </td>

    `;

    const deleteButton =

      tr.querySelector(".delete-btn");

    deleteButton.addEventListener(

      "click",

      function () {

        deleteData(row.id);

      }

    );

    tableBody.appendChild(tr);

  });

}

// ============================================================

// PHÂN TRANG

// ============================================================

function renderPagination() {

  pagination.innerHTML = "";

  const totalPages =

    Math.ceil(

      filteredData.length / PAGE_SIZE

    );

  if (totalPages <= 1) {

    pagination.innerHTML = `

      <button type="button" disabled>‹</button>

      <span>Trang 1 / 1</span>

      <button type="button" disabled>›</button>

    `;

    return;

  }

  const previousButton =

    document.createElement("button");

  previousButton.type = "button";

  previousButton.textContent = "‹";

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

    document.createElement("span");

  pageText.textContent =

    `Trang ${currentPage} / ${totalPages}`;

  const nextButton =

    document.createElement("button");

  nextButton.type = "button";

  nextButton.textContent = "›";

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

  totalCustomers.textContent =

    uniqueCIF.size;

  totalAmount.textContent =

    formatAmount(total);

}

// ============================================================

// XÓA

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

    const { error } =

      await client

        .from("du_thu")

        .delete()

        .eq("id", id);

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

      error.message,

      "#dc2626"

    );

  }

}

// ============================================================

// XUẤT EXCEL - BẢN ĐẸP

// ============================================================

function exportExcel() {

  if (filteredData.length === 0) {

    showManagerMessage(

      "⚠️ Không có dữ liệu để xuất Excel.",

      "#d97706"

    );

    return;

  }

  try {

    // ========================================================

    // NGÀY XUẤT

    // ========================================================

    const now =

      new Date();

    const exportDate =

      now.toLocaleDateString(

        "vi-VN"

      );

    const fileDate =

      [

        String(now.getDate()).padStart(2, "0"),

        String(now.getMonth() + 1).padStart(2, "0"),

        now.getFullYear()

      ].join("-");

    // ========================================================

    // DỮ LIỆU CHÍNH

    // ========================================================

    const exportData =

      filteredData.map(

        function (row, index) {

          return {

            "STT":

              index + 1,

            "User":

              row.user_name || "",

            "Số CIF":

              row.cif || "",

            "Tên khách hàng":

              row.customer_name || "",

            "Số tiền dự thu":

              Number(

                row.amount || 0

              ),

            "Ngày thanh toán":

              formatDateVietnamese(

                row.payment_date

              ),

            "SĐT":

              row.phone || "",

            "Ghi chú":

              row.note || ""

          };

        }

      );

    // ========================================================

    // TẠO SHEET DỰ THU

    // ========================================================

    const worksheet =

      XLSX.utils.json_to_sheet(

        exportData,

        {

          origin: "A4"

        }

      );

    // ========================================================

    // TIÊU ĐỀ

    // ========================================================

    XLSX.utils.sheet_add_aoa(

      worksheet,

      [

        [

          "BÁO CÁO DỰ THU"

        ],

        [

          `Ngày xuất: ${exportDate}`

        ],

        [

          `Tổng số hồ sơ: ${filteredData.length}`

        ]

      ],

      {

        origin: "A1"

      }

    );

    // ========================================================

    // MERGE TIÊU ĐỀ

    // ========================================================

    worksheet["!merges"] = [

      {

        s: {

          r: 0,

          c: 0

        },

        e: {

          r: 0,

          c: 7

        }

      },

      {

        s: {

          r: 1,

          c: 0

        },

        e: {

          r: 1,

          c: 7

        }

      },

      {

        s: {

          r: 2,

          c: 0

        },

        e: {

          r: 2,

          c: 7

        }

      }

    ];

    // ========================================================

    // ĐỘ RỘNG CỘT

    // ========================================================

    worksheet["!cols"] = [

      {

        wch: 7

      },

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

    // ========================================================

    // ĐỊNH DẠNG TIỀN

    // ========================================================

    for (

      let rowIndex = 4;

      rowIndex < 4 + exportData.length;

      rowIndex++

    ) {

      const cell =

        worksheet[

          `E${rowIndex + 1}`

        ];

      if (cell) {

        cell.z =

          '#,##0';

      }

    }

    // ========================================================

    // DÒNG TỔNG

    // ========================================================

    const totalRow =

      exportData.length + 5;

    const total =

      filteredData.reduce(

        function (sum, row) {

          return sum +

            Number(

              row.amount || 0

            );

        },

        0

      );

    XLSX.utils.sheet_add_aoa(

      worksheet,

      [

        [

          "",

          "",

          "",

          "TỔNG DỰ THU",

          total,

          "",

          "",

          ""

        ]

      ],

      {

        origin: `A${totalRow}`

      }

    );

    const totalCell =

      worksheet[

        `E${totalRow}`

      ];

    if (totalCell) {

      totalCell.z =

        '#,##0';

    }

    // ========================================================

    // AUTO FILTER

    // ========================================================

    worksheet["!autofilter"] = {

      ref:

        `A4:H${exportData.length + 4}`

    };

    // ========================================================

    // CỐ ĐỊNH HEADER

    // ========================================================

    worksheet["!freeze"] = {

      xSplit: 0,

      ySplit: 4

    };

    // ========================================================

    // SHEET TỔNG QUAN

    // ========================================================

    const summaryRows = [];

    summaryRows.push(

      [

        "TỔNG QUAN DỰ THU"

      ]

    );

    summaryRows.push(

      [

        `Ngày xuất: ${exportDate}`

      ]

    );

    summaryRows.push(

      []

    );

    summaryRows.push(

      [

        "Chỉ tiêu",

        "Giá trị"

      ]

    );

    summaryRows.push(

      [

        "Tổng số hồ sơ",

        filteredData.length

      ]

    );

    summaryRows.push(

      [

        "Tổng dự thu",

        total

      ]

    );

    summaryRows.push(

      []

    );

    summaryRows.push(

      [

        "USER",

        "SỐ HỒ SƠ",

        "TỔNG DỰ THU"

      ]

    );

    // ========================================================

    // THỐNG KÊ THEO USER

    // ========================================================

    const userMap =

      new Map();

    filteredData.forEach(

      function (row) {

        const user =

          String(

            row.user_name || "Không xác định"

          ).trim();

        const amount =

          Number(

            row.amount || 0

          );

        if (!userMap.has(user)) {

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

    Array.from(

      userMap.entries()

    )

      .sort(

        function (a, b) {

          return b[1].amount -

            a[1].amount;

        }

      )

      .forEach(

        function ([user, value]) {

          summaryRows.push(

            [

              user,

              value.count,

              value.amount

            ]

          );

        }

      );

    const summarySheet =

      XLSX.utils.aoa_to_sheet(

        summaryRows

      );

    // ========================================================

    // ĐỘ RỘNG SHEET TỔNG QUAN

    // ========================================================

    summarySheet["!cols"] = [

      {

        wch: 28

      },

      {

        wch: 18

      },

      {

        wch: 22

      }

    ];

    // ========================================================

    // FORMAT TIỀN TRONG TỔNG QUAN

    // ========================================================

    if (summarySheet["B6"]) {

      summarySheet["B6"].z =

        '#,##0';

    }

    for (

      let i = 8;

      i < summaryRows.length;

      i++

    ) {

      const cell =

        summarySheet[

          `C${i + 1}`

        ];

      if (cell) {

        cell.z =

          '#,##0';

      }

    }

    // ========================================================

    // TẠO WORKBOOK

    // ========================================================

    const workbook =

      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(

      workbook,

      worksheet,

      "Dự Thu"

    );

    XLSX.utils.book_append_sheet(

      workbook,

      summarySheet,

      "Tổng Quan"

    );

    // ========================================================

    // GHI FILE

    // ========================================================

    XLSX.writeFile(

      workbook,

      `DU_THU_${fileDate}.xlsx`

    );

    showManagerMessage(

      "✅ Đã xuất Excel đẹp thành công.",

      "#16a34a"

    );

  } catch (error) {

    console.error(

      "Lỗi xuất Excel:",

      error

    );

    showManagerMessage(

      "❌ Xuất Excel thất bại: " +

      error.message,

      "#dc2626"

    );

  }

}

// ============================================================

// ĐĂNG NHẬP

// ============================================================

async function login() {

  const email =

    emailInput.value.trim();

  const password =

    passwordInput.value;

  if (!email || !password) {

    showLoginMessage(

      "⚠️ Vui lòng nhập email và mật khẩu."

    );

    return;

  }

  loginBtn.disabled = true;

  loginBtn.textContent =

    "⏳ ĐANG ĐĂNG NHẬP...";

  showLoginMessage(

    "",

    "#2563eb"

  );

  try {

    const { error } =

      await client.auth

        .signInWithPassword({

          email: email,

          password: password

        });

    if (error) {

      throw error;

    }

    loginBox.style.display =

      "none";

    managerBox.style.display =

      "block";

    await loadData();

  } catch (error) {

    console.error(

      "Lỗi đăng nhập:",

      error

    );

    showLoginMessage(

      "❌ Đăng nhập thất bại: " +

      error.message

    );

  }

  loginBtn.disabled = false;

  loginBtn.textContent =

    "ĐĂNG NHẬP";

}

// ============================================================

// ĐĂNG XUẤT

// ============================================================

async function logout() {

  const { error } =

    await client.auth.signOut();

  if (error) {

    showManagerMessage(

      "❌ Đăng xuất thất bại: " +

      error.message,

      "#dc2626"

    );

    return;

  }

  managerBox.style.display =

    "none";

  loginBox.style.display =

    "block";

  passwordInput.value = "";

  showLoginMessage(

    "✅ Đã đăng xuất.",

    "#16a34a"

  );

}

// ============================================================

// KIỂM TRA SESSION

// ============================================================

async function checkSession() {

  const { data, error } =

    await client.auth.getSession();

  if (error) {

    console.error(

      "Lỗi kiểm tra phiên:",

      error

    );

    return;

  }

  const session =

    data.session;

  if (session) {

    loginBox.style.display =

      "none";

    managerBox.style.display =

      "block";

    try {

      await loadData();

    } catch (error) {

      console.error(error);

      showManagerMessage(

        "❌ Không thể tải dữ liệu: " +

        error.message,

        "#dc2626"

      );

    }

  } else {

    loginBox.style.display =

      "block";

    managerBox.style.display =

      "none";

  }

}

// ============================================================

// GẮN SỰ KIỆN

// ============================================================

loginBtn.addEventListener(

  "click",

  login

);

logoutBtn.addEventListener(

  "click",

  logout

);

filterBtn.addEventListener(

  "click",

  filterData

);

refreshBtn.addEventListener(

  "click",

  async function () {

    try {

      await loadData();

      applyFilter();

    } catch (error) {

      console.error(error);

      showManagerMessage(

        "❌ Làm mới thất bại: " +

        error.message,

        "#dc2626"

      );

    }

  }

);

exportBtn.addEventListener(

  "click",

  exportExcel

);

// ============================================================

// KHỞI ĐỘNG

// ============================================================

checkSession();
