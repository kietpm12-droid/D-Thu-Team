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

function showLoginMessage(
  text,
  color = "#dc2626"
) {
  loginMessage.textContent = text;
  loginMessage.style.color = color;
}

function showManagerMessage(
  text,
  color = "#2563eb"
) {
  managerMessage.textContent = text;
  managerMessage.style.color = color;
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

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ============================================================
// CHUYỂN NGÀY SANG DATE AN TOÀN
// Dùng cho ExcelJS
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

  return newCreated >
    oldCreated;
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

    const { error } =
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

  const { data, error } =
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

      if (dateA !== dateB) {

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

      return createdB -
        createdA;
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
// LỌC
// ============================================================

function applyFilter() {

  const selectedUser =
    filterUser.value
      .trim()
      .toLowerCase();

  const selectedDate =
    filterDate.value;

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

      deleteButton.addEventListener(
        "click",
        function () {

          deleteData(
            row.id
          );

        }
      );

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

  pagination.innerHTML = "";

  const totalPages =
    Math.ceil(
      filteredData.length /
      PAGE_SIZE
    );

  if (totalPages <= 1) {

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
// XUẤT EXCEL - EXCELJS
// ============================================================

async function exportExcel() {

  if (
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
      "❌ Không tải được thư viện ExcelJS.",
      "#dc2626"
    );

    return;
  }

  try {

    exportBtn.disabled = true;

    exportBtn.textContent =
      "⏳ ĐANG TẠO EXCEL...";

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
    // TẠO WORKBOOK
    // ========================================================

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "Quản Lý Dự Thu";

    workbook.lastModifiedBy =
      "Quản Lý Dự Thu";

    workbook.created =
      new Date();

    workbook.modified =
      new Date();

    // ========================================================
    // SHEET DỰ THU
    // ========================================================

    const worksheet =
      workbook.addWorksheet(
        "Dự Thu",
        {
          views: [
            {
              state: "frozen",
              ySplit: 5
            }
          ]
        }
      );

    // ========================================================
    // TIÊU ĐỀ
    // ========================================================

    worksheet.mergeCells(
      "A1:H1"
    );

    worksheet.getCell("A1").value =
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
    // THÔNG TIN BÁO CÁO
    // ========================================================

    worksheet.mergeCells(
      "A2:H2"
    );

    worksheet.getCell("A2").value =
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
      "A3:H3"
    );

    worksheet.getCell("A3").value =
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

    worksheet.getRow(4).height =
      8;

    // ========================================================
    // HEADER
    // ========================================================

    const headers = [
      "STT",
      "User",
      "Số CIF",
      "Tên khách hàng",
      "Số tiền dự thu",
      "Ngày thanh toán",
      "SĐT",
      "Ghi chú"
    ];

    const headerRow =
      worksheet.getRow(5);

    headerRow.values =
      headers;

    headerRow.height =
      25;

    headerRow.eachCell(
      function (cell) {

        cell.font = {
          name: "Arial",
          size: 11,
          bold: true,
          color: {
            argb: "FFFFFFFF"
          }
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF2563EB"
          }
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true
        };

        cell.border = {
          top: {
            style: "thin",
            color: {
              argb: "FFD1D5DB"
            }
          },
          left: {
            style: "thin",
            color: {
              argb: "FFD1D5DB"
            }
          },
          bottom: {
            style: "thin",
            color: {
              argb: "FFD1D5DB"
            }
          },
          right: {
            style: "thin",
            color: {
              argb: "FFD1D5DB"
            }
          }
        };
      }
    );

    // ========================================================
    // DỮ LIỆU
    // ========================================================

    filteredData.forEach(
      function (row, index) {

        const excelRow =
          worksheet.addRow([
            index + 1,
            row.user_name || "",
            row.cif || "",
            row.customer_name || "",
            Number(
              row.amount || 0
            ),
            convertToExcelDate(
              row.payment_date
            ),
            row.phone || "",
            row.note || ""
          ]);

        excelRow.height =
          22;

        excelRow.eachCell(
          function (cell) {

            cell.font = {
              name: "Arial",
              size: 10
            };

            cell.border = {
              top: {
                style: "thin",
                color: {
                  argb: "FFE5E7EB"
                }
              },
              left: {
                style: "thin",
                color: {
                  argb: "FFE5E7EB"
                }
              },
              bottom: {
                style: "thin",
                color: {
                  argb: "FFE5E7EB"
                }
              },
              right: {
                style: "thin",
                color: {
                  argb: "FFE5E7EB"
                }
              }
            };

            cell.alignment = {
              vertical: "middle"
            };
          }
        );

        // STT
        excelRow.getCell(1).alignment = {
          horizontal: "center",
          vertical: "middle"
        };

        // USER
        excelRow.getCell(2).alignment = {
          horizontal: "left",
          vertical: "middle"
        };

        // CIF
        excelRow.getCell(3).alignment = {
          horizontal: "center",
          vertical: "middle"
        };

        // TÊN KH
        excelRow.getCell(4).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true
        };

        // TIỀN
        excelRow.getCell(5).numFmt =
          '#,##0';

        excelRow.getCell(5).alignment = {
          horizontal: "right",
          vertical: "middle"
        };

        // NGÀY
        excelRow.getCell(6).numFmt =
          "dd/mm/yyyy";

        excelRow.getCell(6).alignment = {
          horizontal: "center",
          vertical: "middle"
        };

        // SĐT
        excelRow.getCell(7).alignment = {
          horizontal: "center",
          vertical: "middle"
        };

        // GHI CHÚ
        excelRow.getCell(8).alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true
        };
      }
    );

    // ========================================================
    // DÒNG TỔNG
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

    const totalRow =
      worksheet.addRow([
        "",
        "",
        "",
        "TỔNG DỰ THU",
        total,
        "",
        "",
        ""
      ]);

    totalRow.height =
      27;

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
            argb: "FFE0F2FE"
          }
        };

        cell.border = {
          top: {
            style: "medium",
            color: {
              argb: "FF2563EB"
            }
          },
          left: {
            style: "thin",
            color: {
              argb: "FFD1D5DB"
            }
          },
          bottom: {
            style: "medium",
            color: {
              argb: "FF2563EB"
            }
          },
          right: {
            style: "thin",
            color: {
              argb: "FFD1D5DB"
            }
          }
        };

        cell.alignment = {
          vertical: "middle"
        };
      }
    );

    totalRow.getCell(4).alignment = {
      horizontal: "right",
      vertical: "middle"
    };

    totalRow.getCell(5).numFmt =
      '#,##0';

    totalRow.getCell(5).alignment = {
      horizontal: "right",
      vertical: "middle"
    };

    // ========================================================
    // ĐỘ RỘNG CỘT
    // ========================================================

    worksheet.columns = [
      {
        key: "stt",
        width: 8
      },
      {
        key: "user",
        width: 18
      },
      {
        key: "cif",
        width: 18
      },
      {
        key: "customer",
        width: 30
      },
      {
        key: "amount",
        width: 20
      },
      {
        key: "date",
        width: 18
      },
      {
        key: "phone",
        width: 17
      },
      {
        key: "note",
        width: 40
      }
    ];

    // ========================================================
    // AUTO FILTER
    // ========================================================

    worksheet.autoFilter = {
      from: "A5",
      to: `H${filteredData.length + 5 - 1}`
    };

    // ========================================================
    // IN ẤN
    // ========================================================

    worksheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9
    };

    worksheet.pageSetup.margins = {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2
    };

    worksheet.headerFooter.oddFooter =
      "Trang &P / &N";

    // ========================================================
    // SHEET TỔNG QUAN
    // ========================================================

    const summarySheet =
      workbook.addWorksheet(
        "Tổng Quan"
      );

    summarySheet.mergeCells(
      "A1:C1"
    );

    summarySheet.getCell("A1").value =
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

    summarySheet.getCell("A2").value =
      `Ngày xuất: ${exportDate}`;

    summarySheet.getCell(
      "A2"
    ).alignment = {
      horizontal: "center"
    };

    summarySheet.addRow([]);

    // ========================================================
    // CHỈ TIÊU
    // ========================================================

    const summaryHeader =
      summarySheet.addRow([
        "CHỈ TIÊU",
        "GIÁ TRỊ"
      ]);

    summaryHeader.eachCell(
      function (cell) {

        cell.font = {
          name: "Arial",
          bold: true,
          color: {
            argb: "FFFFFFFF"
          }
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF2563EB"
          }
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle"
        };

        cell.border = {
          top: {
            style: "thin"
          },
          left: {
            style: "thin"
          },
          bottom: {
            style: "thin"
          },
          right: {
            style: "thin"
          }
        };
      }
    );

    const reportCountRow =
      summarySheet.addRow([
        "Tổng số hồ sơ",
        filteredData.length
      ]);

    const totalAmountRow =
      summarySheet.addRow([
        "Tổng dự thu",
        total
      ]);

    totalAmountRow.getCell(2).numFmt =
      '#,##0';

    [reportCountRow, totalAmountRow]
      .forEach(
        function (row) {

          row.eachCell(
            function (cell) {

              cell.font = {
                name: "Arial",
                size: 11
              };

              cell.border = {
                top: {
                  style: "thin"
                },
                left: {
                  style: "thin"
                },
                bottom: {
                  style: "thin"
                },
                right: {
                  style: "thin"
                }
              };

              cell.alignment = {
                vertical: "middle"
              };
            }
          );
        }
      );

    summarySheet.addRow([]);

    // ========================================================
    // THỐNG KÊ USER
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
          bold: true,
          color: {
            argb: "FFFFFFFF"
          }
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF16A34A"
          }
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle"
        };

        cell.border = {
          top: {
            style: "thin"
          },
          left: {
            style: "thin"
          },
          bottom: {
            style: "thin"
          },
          right: {
            style: "thin"
          }
        };
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
        item.amount += amount;
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

        const row =
          summarySheet.addRow([
            user,
            value.count,
            value.amount
          ]);

        row.getCell(3).numFmt =
          '#,##0';

        row.eachCell(
          function (cell) {

            cell.font = {
              name: "Arial",
              size: 10
            };

            cell.border = {
              top: {
                style: "thin"
              },
              left: {
                style: "thin"
              },
              bottom: {
                style: "thin"
              },
              right: {
                style: "thin"
              }
            };

            cell.alignment = {
              vertical: "middle"
            };
          }
        );

        row.getCell(2).alignment = {
          horizontal: "center"
        };

        row.getCell(3).alignment = {
          horizontal: "right"
        };
      }
    );

    // ========================================================
    // ĐỘ RỘNG TỔNG QUAN
    // ========================================================

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

    summarySheet.views = [
      {
        state: "frozen",
        ySplit: 4
      }
    ];

    summarySheet.pageSetup = {
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    };

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

    link.href = url;

    link.download =
      `DU_THU_${fileDate}.xlsx`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    window.URL.revokeObjectURL(
      url
    );

    showManagerMessage(
      "✅ Đã tạo file Excel báo cáo đẹp thành công.",
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

  } finally {

    exportBtn.disabled = false;

    exportBtn.textContent =
      "📥 XUẤT EXCEL";
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

  } finally {

    loginBtn.disabled = false;

    loginBtn.textContent =
      "ĐĂNG NHẬP";
  }
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
