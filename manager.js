"use strict";

// ============================================================
// QUẢN LÝ DỰ THU - MANAGER.JS
// BẢN HOÀN CHỈNH - ĐÃ BỎ CỘT STT KHI XUẤT EXCEL
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
// → DD/MM/YYYY
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

  previousButton.className =
    "arrow";

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

  nextButton.className =
    "arrow";

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

    page = totalPages;

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
// ĐÃ BỎ HOÀN TOÀN CỘT STT
// ============================================================

async function exportExcel() {

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
  // KIỂM TRA EXCELJS
  // ==========================================================

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
    // MÀU
    // ========================================================

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


    // ========================================================
    // BORDER
    // ========================================================

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
    // KHÔNG CÓ STT
    // ========================================================

    const worksheet =
      workbook.addWorksheet(
        "Dự Thu"
      );


    // ========================================================
    // CỘT EXCEL
    // A → G
    // ========================================================

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


    // ========================================================
    // DÒNG TRỐNG
    // ========================================================

    worksheet.addRow([]);


    // ========================================================
    // HEADER
    // KHÔNG CÓ STT
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
    // KHÔNG CÓ INDEX + 1
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


        // USER

        excelRow.getCell(
          1
        ).alignment = {

          horizontal: "left",

          vertical: "middle"

        };


        // CIF

        excelRow.getCell(
          2
        ).alignment = {

          horizontal: "center",

          vertical: "middle"

        };


        // TÊN KH

        excelRow.getCell(
          3
        ).alignment = {

          horizontal: "left",

          vertical: "middle",

          wrapText: true

        };


        // SỐ TIỀN

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


        // NGÀY

        excelRow.getCell(
          5
        ).alignment = {

          horizontal: "center",

          vertical: "middle"

        };


        // SĐT

        excelRow.getCell(
          6
        ).alignment = {

          horizontal: "center",

          vertical: "middle"

        };


        // GHI CHÚ

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
    // HEADER TỪ A5 → G
    // ========================================================

    worksheet.autoFilter = {

      from: "A5",

      to:
        `G${5 + filteredData.length}`

    };


    // ========================================================
    // FREEZE HEADER
    // ========================================================

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


    // ========================================================
    // TIÊU ĐỀ
    // ========================================================

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


    // ========================================================
    // NGÀY
    // ========================================================

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


    // ========================================================
    // CHỈ TIÊU
    // ========================================================

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


    // ========================================================
    // DÒNG TRỐNG
    // ========================================================

    summarySheet.addRow([]);


    // ========================================================
    // HEADER USER
    // ========================================================

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


    // ========================================================
    // FREEZE
    // ========================================================

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


    // ========================================================
    // TẠO BLOB
    // ========================================================

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


    // ========================================================
    // TẠO LINK TẢI
    // ========================================================

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


    // ========================================================
    // THÔNG BÁO
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
