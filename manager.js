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

// KIỂM TRA PHẦN TỬ HTML

// ============================================================

if (!loginBtn) {

  console.error("Không tìm thấy #loginBtn");

}

if (!logoutBtn) {

  console.error("Không tìm thấy #logoutBtn");

}

if (!filterBtn) {

  console.error("Không tìm thấy #filterBtn");

}

if (!refreshBtn) {

  console.error("Không tìm thấy #refreshBtn");

}

if (!exportBtn) {

  console.error("Không tìm thấy #exportBtn");

}

// ============================================================

// HIỂN THỊ THÔNG BÁO ĐĂNG NHẬP

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

// HIỂN THỊ THÔNG BÁO QUẢN LÝ

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

// → DD/MM/YYYY

// ============================================================

function formatDateVietnamese(

  dateValue

) {

  if (!dateValue) {

    return "";

  }

  const dateText =

    String(dateValue)

      .substring(0, 10);

  const parts =

    dateText.split("-");

  if (parts.length !== 3) {

    return dateText;

  }

  return (

    `${parts[2]}/${parts[1]}/${parts[0]}`

  );

}

// ============================================================

// CHUYỂN NGÀY THÀNH DATE

// ============================================================

function convertToExcelDate(

  dateValue

) {

  if (!dateValue) {

    return null;

  }

  const dateText =

    String(dateValue)

      .substring(0, 10);

  const parts =

    dateText.split("-");

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

  return new Date(

    year,

    month - 1,

    day

  );

}

// ============================================================

// CHỐNG LỖI HTML

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

  }

  return Array.from(

    latestByCIF.values()

  );

}

// ============================================================

// TẢI DỮ LIỆU

// ============================================================

async function loadData() {

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

        return (

          dateB.localeCompare(

            dateA

          )

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

          style="text-align:center;">

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

  if (

    totalPages <= 1

  ) {

    pagination.innerHTML = `

      <button

        type="button"

        disabled>

        ‹

      </button>

      <span>

        Trang 1 / 1

      </span>

      <button

        type="button"

        disabled>

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

  if (

    page > totalPages

  ) {

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

  if (totalCustomers) {

    totalCustomers.textContent =

      uniqueCIF.size;

  }

  if (totalAmount) {

    totalAmount.textContent =

      formatAmount(total);

  }

}

// ============================================================

// XÓA BẢN GHI

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

      error.message,

      "#dc2626"

    );

  }

}

// ============================================================

// XUẤT EXCEL

// XLSX-JS-STYLE

// ============================================================

function exportExcel() {

  console.log(

    "Đã bấm nút XUẤT EXCEL"

  );

  // ==========================================================

  // KIỂM TRA DỮ LIỆU

  // ==========================================================

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

  // ==========================================================

  // KIỂM TRA THƯ VIỆN

  // ==========================================================

  if (

    typeof XLSX === "undefined"

  ) {

    showManagerMessage(

      "❌ Không tải được thư viện Excel. Hãy kiểm tra manager.html.",

      "#dc2626"

    );

    console.error(

      "XLSX không tồn tại. Kiểm tra CDN xlsx-js-style."

    );

    return;

  }

  try {

    exportBtn.disabled = true;

    exportBtn.textContent =

      "⏳ ĐANG XUẤT...";

    // ========================================================

    // NGÀY HIỆN TẠI

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

    // TÍNH TỔNG

    // ========================================================

    const total =

      filteredData.reduce(

        function (sum, row) {

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

    // STYLE

    // ========================================================

    const borderThin = {

      top: {

        style: "thin",

        color: {

          rgb: "D1D5DB"

        }

      },

      bottom: {

        style: "thin",

        color: {

          rgb: "D1D5DB"

        }

      },

      left: {

        style: "thin",

        color: {

          rgb: "D1D5DB"

        }

      },

      right: {

        style: "thin",

        color: {

          rgb: "D1D5DB"

        }

      }

    };

    const titleStyle = {

      font: {

        name: "Arial",

        sz: 18,

        bold: true

      },

      alignment: {

        horizontal: "center",

        vertical: "center"

      }

    };

    const subtitleStyle = {

      font: {

        name: "Arial",

        sz: 11,

        italic: true

      },

      alignment: {

        horizontal: "center",

        vertical: "center"

      }

    };

    const headerStyle = {

      font: {

        name: "Arial",

        sz: 11,

        bold: true,

        color: {

          rgb: "FFFFFF"

        }

      },

      fill: {

        patternType: "solid",

        fgColor: {

          rgb: "2563EB"

        }

      },

      alignment: {

        horizontal: "center",

        vertical: "center",

        wrapText: true

      },

      border: borderThin

    };

    const dataStyle = {

      font: {

        name: "Arial",

        sz: 10

      },

      alignment: {

        vertical: "center"

      },

      border: borderThin

    };

    // ========================================================

    // TẠO WORKBOOK

    // ========================================================

    const workbook =

      XLSX.utils.book_new();

    // ========================================================

    // SHEET DỰ THU

    // ========================================================

    const rows = [];

    rows.push([

      "BÁO CÁO DỰ THU"

    ]);

    rows.push([

      `Ngày xuất: ${exportDate}`

    ]);

    rows.push([

      `Tổng số hồ sơ: ${filteredData.length}`

    ]);

    rows.push([]);

    rows.push([

      "STT",

      "User",

      "Số CIF",

      "Tên khách hàng",

      "Số tiền dự thu",

      "Ngày thanh toán",

      "SĐT",

      "Ghi chú"

    ]);

    // ========================================================

    // THÊM DỮ LIỆU

    // ========================================================

    filteredData.forEach(

      function (row, index) {

        rows.push([

          index + 1,

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

      }

    );

    // ========================================================

    // DÒNG TỔNG

    // ========================================================

    rows.push([

      "",

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

    const worksheet =

      XLSX.utils.aoa_to_sheet(

        rows

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

    // STYLE TIÊU ĐỀ

    // ========================================================

    if (worksheet["A1"]) {

      worksheet["A1"].s =

        titleStyle;

    }

    if (worksheet["A2"]) {

      worksheet["A2"].s =

        subtitleStyle;

    }

    if (worksheet["A3"]) {

      worksheet["A3"].s = {

        font: {

          name: "Arial",

          sz: 11,

          bold: true

        },

        alignment: {

          horizontal: "center",

          vertical: "center"

        }

      };

    }

    // ========================================================

    // STYLE HEADER

    // ========================================================

    for (

      let col = 0;

      col < 8;

      col++

    ) {

      const address =

        XLSX.utils.encode_cell({

          r: 4,

          c: col

        });

      if (

        worksheet[address]

      ) {

        worksheet[address].s =

          headerStyle;

      }

    }

    // ========================================================

    // STYLE DỮ LIỆU

    // ========================================================

    const firstDataRow =

      5;

    const lastDataRow =

      4 +

      filteredData.length;

    for (

      let rowIndex =

        firstDataRow;

      rowIndex <=

        lastDataRow;

      rowIndex++

    ) {

      for (

        let col = 0;

        col < 8;

        col++

      ) {

        const address =

          XLSX.utils.encode_cell({

            r: rowIndex,

            c: col

          });

        const cell =

          worksheet[address];

        if (!cell) {

          continue;

        }

        cell.s = {

          ...dataStyle

        };

        // STT

        if (col === 0) {

          cell.s.alignment = {

            horizontal: "center",

            vertical: "center"

          };

        }

        // USER

        if (col === 1) {

          cell.s.alignment = {

            horizontal: "left",

            vertical: "center"

          };

        }

        // CIF

        if (col === 2) {

          cell.s.alignment = {

            horizontal: "center",

            vertical: "center"

          };

        }

        // TÊN KH

        if (col === 3) {

          cell.s.alignment = {

            horizontal: "left",

            vertical: "center",

            wrapText: true

          };

        }

        // SỐ TIỀN

        if (col === 4) {

          cell.t = "n";

          cell.s = {

            ...dataStyle,

            numFmt:

              "#,##0",

            alignment: {

              horizontal: "right",

              vertical: "center"

            }

          };

        }

        // NGÀY

        if (col === 5) {

          cell.s.alignment = {

            horizontal: "center",

            vertical: "center"

          };

        }

        // SĐT

        if (col === 6) {

          cell.s.alignment = {

            horizontal: "center",

            vertical: "center"

          };

        }

        // GHI CHÚ

        if (col === 7) {

          cell.s.alignment = {

            horizontal: "left",

            vertical: "center",

            wrapText: true

          };

        }

      }

    }

    // ========================================================

    // STYLE DÒNG TỔNG

    // ========================================================

    const totalRowIndex =

      rows.length - 1;

    const totalStyle = {

      font: {

        name: "Arial",

        sz: 11,

        bold: true

      },

      fill: {

        patternType: "solid",

        fgColor: {

          rgb: "E0F2FE"

        }

      },

      alignment: {

        vertical: "center"

      },

      border: {

        top: {

          style: "medium",

          color: {

            rgb: "2563EB"

          }

        },

        bottom: {

          style: "medium",

          color: {

            rgb: "2563EB"

          }

        },

        left: {

          style: "thin",

          color: {

            rgb: "D1D5DB"

          }

        },

        right: {

          style: "thin",

          color: {

            rgb: "D1D5DB"

          }

        }

      }

    };

    for (

      let col = 0;

      col < 8;

      col++

    ) {

      const address =

        XLSX.utils.encode_cell({

          r: totalRowIndex,

          c: col

        });

      if (

        worksheet[address]

      ) {

        worksheet[address].s =

          totalStyle;

      }

    }

    const totalLabelAddress =

      "D" +

      (

        totalRowIndex + 1

      );

    const totalAmountAddress =

      "E" +

      (

        totalRowIndex + 1

      );

    if (

      worksheet[totalLabelAddress]

    ) {

      worksheet[totalLabelAddress].s =

        {

          ...totalStyle,

          alignment: {

            horizontal: "right",

            vertical: "center"

          }

        };

    }

    if (

      worksheet[totalAmountAddress]

    ) {

      worksheet[totalAmountAddress].s =

        {

          ...totalStyle,

          numFmt:

            "#,##0",

          alignment: {

            horizontal: "right",

            vertical: "center"

          }

        };

    }

    // ========================================================

    // ĐỘ RỘNG CỘT

    // ========================================================

    worksheet["!cols"] = [

      {

        wch: 8

      },

      {

        wch: 18

      },

      {

        wch: 18

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

        wch: 17

      },

      {

        wch: 40

      }

    ];

    // ========================================================

    // CHIỀU CAO DÒNG

    // ========================================================

    worksheet["!rows"] = [];

    worksheet["!rows"][0] = {

      hpt: 30

    };

    worksheet["!rows"][1] = {

      hpt: 22

    };

    worksheet["!rows"][2] = {

      hpt: 22

    };

    worksheet["!rows"][4] = {

      hpt: 28

    };

    // ========================================================

    // AUTO FILTER

    // ========================================================

    worksheet["!autofilter"] = {

      ref:

        `A5:H${lastDataRow + 1}`

    };

    // ========================================================

    // THÊM SHEET

    // ========================================================

    XLSX.utils.book_append_sheet(

      workbook,

      worksheet,

      "Dự Thu"

    );

    // ========================================================

    // SHEET TỔNG QUAN

    // ========================================================

    const summaryRows = [

      [

        "TỔNG QUAN DỰ THU"

      ],

      [

        `Ngày xuất: ${exportDate}`

      ],

      [],

      [

        "CHỈ TIÊU",

        "GIÁ TRỊ"

      ],

      [

        "Tổng số hồ sơ",

        filteredData.length

      ],

      [

        "Tổng dự thu",

        total

      ],

      [],

      [

        "USER",

        "SỐ HỒ SƠ",

        "TỔNG DỰ THU"

      ]

    ];

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

        function (a, b) {

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

        summaryRows.push([

          user,

          value.count,

          value.amount

        ]);

      }

    );

    // ========================================================

    // TẠO SHEET

    // ========================================================

    const summarySheet =

      XLSX.utils.aoa_to_sheet(

        summaryRows

      );

    // ========================================================

    // MERGE

    // ========================================================

    summarySheet["!merges"] = [

      {

        s: {

          r: 0,

          c: 0

        },

        e: {

          r: 0,

          c: 2

        }

      },

      {

        s: {

          r: 1,

          c: 0

        },

        e: {

          r: 1,

          c: 2

        }

      }

    ];

    // ========================================================

    // TITLE

    // ========================================================

    if (

      summarySheet["A1"]

    ) {

      summarySheet["A1"].s =

        titleStyle;

    }

    if (

      summarySheet["A2"]

    ) {

      summarySheet["A2"].s =

        subtitleStyle;

    }

    // ========================================================

    // HEADER CHỈ TIÊU

    // ========================================================

    for (

      let col = 0;

      col < 2;

      col++

    ) {

      const address =

        XLSX.utils.encode_cell({

          r: 3,

          c: col

        });

      if (

        summarySheet[address]

      ) {

        summarySheet[address].s =

          headerStyle;

      }

    }

    // ========================================================

    // DỮ LIỆU CHỈ TIÊU

    // ========================================================

    for (

      let row = 4;

      row <= 5;

      row++

    ) {

      for (

        let col = 0;

        col < 2;

        col++

      ) {

        const address =

          XLSX.utils.encode_cell({

            r: row,

            c: col

          });

        const cell =

          summarySheet[address];

        if (!cell) {

          continue;

        }

        cell.s = {

          ...dataStyle

        };

      }

    }

    // ========================================================

    // TỔNG TIỀN

    // ========================================================

    if (

      summarySheet["B6"]

    ) {

      summarySheet["B6"].s = {

        ...dataStyle,

        numFmt:

          "#,##0",

        alignment: {

          horizontal: "right",

          vertical: "center"

        }

      };

    }

    // ========================================================

    // HEADER USER

    // ========================================================

    const greenHeaderStyle = {

      font: {

        name: "Arial",

        sz: 11,

        bold: true,

        color: {

          rgb: "FFFFFF"

        }

      },

      fill: {

        patternType: "solid",

        fgColor: {

          rgb: "16A34A"

        }

      },

      alignment: {

        horizontal: "center",

        vertical: "center"

      },

      border:

        borderThin

    };

    for (

      let col = 0;

      col < 3;

      col++

    ) {

      const address =

        XLSX.utils.encode_cell({

          r: 7,

          c: col

        });

      if (

        summarySheet[address]

      ) {

        summarySheet[address].s =

          greenHeaderStyle;

      }

    }

    // ========================================================

    // USER DATA

    // ========================================================

    for (

      let row = 8;

      row < summaryRows.length;

      row++

    ) {

      for (

        let col = 0;

        col < 3;

        col++

      ) {

        const address =

          XLSX.utils.encode_cell({

            r: row,

            c: col

          });

        const cell =

          summarySheet[address];

        if (!cell) {

          continue;

        }

        cell.s = {

          ...dataStyle

        };

      }

      const amountAddress =

        XLSX.utils.encode_cell({

          r: row,

          c: 2

        });

      if (

        summarySheet[amountAddress]

      ) {

        summarySheet[amountAddress].s = {

          ...dataStyle,

          numFmt:

            "#,##0",

          alignment: {

            horizontal: "right",

            vertical: "center"

          }

        };

      }

      const countAddress =

        XLSX.utils.encode_cell({

          r: row,

          c: 1

        });

      if (

        summarySheet[countAddress]

      ) {

        summarySheet[countAddress].s = {

          ...dataStyle,

          alignment: {

            horizontal: "center",

            vertical: "center"

          }

        };

      }

    }

    // ========================================================

    // ĐỘ RỘNG

    // ========================================================

    summarySheet["!cols"] = [

      {

        wch: 30

      },

      {

        wch: 20

      },

      {

        wch: 25

      }

    ];

    // ========================================================

    // THÊM SHEET TỔNG QUAN

    // ========================================================

    XLSX.utils.book_append_sheet(

      workbook,

      summarySheet,

      "Tổng Quan"

    );

    // ========================================================

    // TẠO FILE XLSX

    // ========================================================

    XLSX.writeFile(

      workbook,

      `DU_THU_${fileDate}.xlsx`

    );

    // ========================================================

    // THÔNG BÁO THÀNH CÔNG

    // ========================================================

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

  const email =

    emailInput.value.trim();

  const password =

    passwordInput.value;

  if (

    !email ||

    !password

  ) {

    showLoginMessage(

      "⚠️ Vui lòng nhập email và mật khẩu."

    );

    return;

  }

  loginBtn.disabled =

    true;

  loginBtn.textContent =

    "⏳ ĐANG ĐĂNG NHẬP...";

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

  } finally {

    loginBtn.disabled =

      false;

    loginBtn.textContent =

      "ĐĂNG NHẬP";

  }

}

// ============================================================

// ĐĂNG XUẤT

// ============================================================

async function logout() {

  const {

    error

  } =

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

  passwordInput.value =

    "";

  showLoginMessage(

    "✅ Đã đăng xuất.",

    "#16a34a"

  );

}

// ============================================================

// KIỂM TRA SESSION

// ============================================================

async function checkSession() {

  const {

    data,

    error

  } =

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

      console.error(

        error

      );

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

          error

        );

        showManagerMessage(

          "❌ Làm mới thất bại: " +

          error.message,

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
