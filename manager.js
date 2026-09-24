"use strict";

/* ============================================================
   QUẢN LÝ DỰ THU - MANAGER.JS
   BẢN FULL HOÀN CHỈNH
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

let emailInput;
let passwordInput;

let loginBtn;
let logoutBtn;

let loginBox;
let managerBox;

let messageBox;

let filterUser;
let filterDate;
let filterBtn;
let refreshBtn;
let exportBtn;

let tableBody;

let statsBox;

let pagination;


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

    messageBox =
        document.getElementById("message");

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

    statsBox =
        document.getElementById("stats");

    pagination =
        document.getElementById("pagination");


    /* ========================================================
       NÚT ĐĂNG NHẬP
    ======================================================== */

    if (loginBtn) {

        loginBtn.addEventListener(
            "click",
            login
        );

    }


    /* ========================================================
       ENTER ĐỂ ĐĂNG NHẬP
    ======================================================== */

    if (passwordInput) {

        passwordInput.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    login();

                }

            }
        );

    }


    /* ========================================================
       ĐĂNG XUẤT
    ======================================================== */

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );

    }


    /* ========================================================
       LỌC
    ======================================================== */

    if (filterBtn) {

        filterBtn.addEventListener(
            "click",
            function () {

                currentPage = 1;

                applyFilters();

            }
        );

    }


    /* ========================================================
       LÀM MỚI
    ======================================================== */

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            refreshData
        );

    }


    /* ========================================================
       XUẤT EXCEL
    ======================================================== */

    if (exportBtn) {

        exportBtn.addEventListener(
            "click",
            exportExcel
        );

    }

}


/* ============================================================
   HIỂN THỊ THÔNG BÁO
============================================================ */

function showMessage(
    message,
    type = "info"
) {

    if (!messageBox) return;

    messageBox.textContent =
        message;

    messageBox.className =
        "message " + type;

}


/* ============================================================
   KẾT NỐI SUPABASE
============================================================ */

function initSupabase() {

    try {

        if (
            !window.supabase ||
            typeof window.supabase.createClient !== "function"
        ) {

            throw new Error(
                "Không tìm thấy thư viện Supabase."
            );

        }


        const supabaseUrl =
            window.SUPABASE_URL;

        const supabaseAnonKey =
            window.SUPABASE_ANON_KEY;


        if (
            !supabaseUrl ||
            !supabaseAnonKey
        ) {

            throw new Error(
                "Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY trong config.js."
            );

        }


        client =
            window.supabase.createClient(
                supabaseUrl,
                supabaseAnonKey
            );


        return true;

    } catch (error) {

        console.error(
            "Lỗi Supabase:",
            error
        );

        showMessage(
            error.message,
            "error"
        );

        return false;

    }

}


/* ============================================================
   ĐĂNG NHẬP
============================================================ */

async function login() {

    if (!emailInput || !passwordInput) {

        console.error(
            "Không tìm thấy ô email/password."
        );

        return;

    }


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    if (!email) {

        showMessage(
            "Vui lòng nhập email.",
            "error"
        );

        emailInput.focus();

        return;

    }


    if (!password) {

        showMessage(
            "Vui lòng nhập mật khẩu.",
            "error"
        );

        passwordInput.focus();

        return;

    }


    if (!client) {

        const success =
            initSupabase();

        if (!success) {

            return;

        }

    }


    try {

        if (loginBtn) {

            loginBtn.disabled = true;

            loginBtn.textContent =
                "⏳ ĐANG ĐĂNG NHẬP...";

        }


        showMessage(
            "Đang kiểm tra tài khoản...",
            "info"
        );


        const {
            data,
            error
        } =
            await client.auth.signInWithPassword({

                email: email,

                password: password

            });


        if (error) {

            console.error(
                "Login error:",
                error
            );


            let message =
                error.message ||
                "Đăng nhập thất bại.";


            if (
                error.message
                    .toLowerCase()
                    .includes("invalid login credentials")
            ) {

                message =
                    "Email hoặc mật khẩu không đúng.";

            }


            if (
                error.message
                    .toLowerCase()
                    .includes("email not confirmed")
            ) {

                message =
                    "Email chưa được xác nhận trong Supabase.";

            }


            showMessage(
                message,
                "error"
            );

            return;

        }


        if (!data || !data.user) {

            showMessage(
                "Không lấy được thông tin tài khoản.",
                "error"
            );

            return;

        }


        console.log(
            "Đăng nhập thành công:",
            data.user.email
        );


        showMessage(
            "Đăng nhập thành công.",
            "success"
        );


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


        showMessage(
            "Có lỗi xảy ra: " +
            error.message,
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
   CHO HTML GỌI window.login()
============================================================ */

window.login =
    login;


/* ============================================================
   KIỂM TRA SESSION
============================================================ */

async function checkSession() {

    if (!client) return;


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


        if (
            data &&
            data.session &&
            data.session.user
        ) {

            if (loginBox) {

                loginBox.style.display =
                    "none";

            }


            if (managerBox) {

                managerBox.style.display =
                    "block";

            }


            await loadData();

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
            "Lỗi checkSession:",
            error
        );

    }

}


/* ============================================================
   ĐĂNG XUẤT
============================================================ */

async function logout() {

    try {

        if (client) {

            await client.auth.signOut();

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


        if (emailInput) {

            emailInput.value = "";

        }


        if (passwordInput) {

            passwordInput.value = "";

        }


        if (tableBody) {

            tableBody.innerHTML = "";

        }


        if (statsBox) {

            statsBox.innerHTML = "";

        }


        if (pagination) {

            pagination.innerHTML = "";

        }


        showMessage(
            "Đã đăng xuất.",
            "info"
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

}


/* ============================================================
   LOAD DỮ LIỆU
============================================================ */

async function loadData() {

    if (!client) {

        const success =
            initSupabase();

        if (!success) return;

    }


    try {

        showMessage(
            "Đang tải dữ liệu...",
            "info"
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

            console.error(
                "Load data error:",
                error
            );

            showMessage(
                "Không thể tải dữ liệu: " +
                error.message,
                "error"
            );

            return;

        }


        allData =
            Array.isArray(data)
                ? data
                : [];


        /*
         * Loại CIF trùng
         * Giữ bản ghi mới nhất
         */

        allData =
            dedupeByCIF(allData);


        currentPage = 1;


        applyFilters();


        showMessage(
            `Đã tải ${allData.length} dữ liệu.`,
            "success"
        );


    } catch (error) {

        console.error(
            "loadData error:",
            error
        );

        showMessage(
            "Có lỗi khi tải dữ liệu.",
            "error"
        );

    }

}


/* ============================================================
   LOẠI CIF TRÙNG
   GIỮ BẢN GHI MỚI NHẤT
============================================================ */

function dedupeByCIF(data) {

    const map =
        new Map();


    for (const row of data) {

        const cif =
            String(
                row.cif || ""
            )
            .trim();


        /*
         * Nếu CIF rỗng thì giữ nguyên
         */

        if (!cif) {

            const key =
                "__EMPTY__" +
                Math.random();

            map.set(
                key,
                row
            );

            continue;

        }


        const existing =
            map.get(cif);


        if (!existing) {

            map.set(
                cif,
                row
            );

            continue;

        }


        const currentPayment =
            new Date(
                row.payment_date ||
                0
            ).getTime();


        const existingPayment =
            new Date(
                existing.payment_date ||
                0
            ).getTime();


        if (
            currentPayment >
            existingPayment
        ) {

            map.set(
                cif,
                row
            );

            continue;

        }


        if (
            currentPayment ===
            existingPayment
        ) {

            const currentCreated =
                new Date(
                    row.created_at ||
                    0
                ).getTime();


            const existingCreated =
                new Date(
                    existing.created_at ||
                    0
                ).getTime();


            if (
                currentCreated >
                existingCreated
            ) {

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
   CHUẨN HÓA NGÀY
============================================================ */

function normalizeDate(value) {

    if (!value) return "";


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
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


/* ============================================================
   FORMAT NGÀY
============================================================ */

function formatDate(value) {

    if (!value) return "";


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const year =
        date.getFullYear();


    return (
        day +
        "/" +
        month +
        "/" +
        year
    );

}


/* ============================================================
   FORMAT TIỀN
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


    const cleaned =
        String(value)
            .replace(
                /,/g,
                ""
            )
            .replace(
                /\./g,
                ""
            )
            .replace(
                /[^0-9-]/g,
                ""
            );


    const number =
        Number(cleaned);


    return Number.isFinite(number)
        ? number
        : 0;

}


function formatMoney(value) {

    const amount =
        parseAmount(value);


    return amount.toLocaleString(
        "vi-VN"
    ) + " đ";

}


/* ============================================================
   LỌC DỮ LIỆU
============================================================ */

function applyFilters() {

    const userValue =
        filterUser
            ? filterUser.value.trim()
            : "";


    const dateValue =
        filterDate
            ? filterDate.value
            : "";


    filteredData =
        allData.filter(
            function (row) {

                const rowUser =
                    String(
                        row.user_name || ""
                    ).trim();


                const rowDate =
                    normalizeDate(
                        row.payment_date
                    );


                const userMatch =
                    !userValue ||
                    rowUser === userValue;


                const dateMatch =
                    !dateValue ||
                    rowDate === dateValue;


                return (
                    userMatch &&
                    dateMatch
                );

            }
        );


    currentPage = Math.max(
        1,
        Math.min(
            currentPage,
            Math.ceil(
                filteredData.length /
                pageSize
            ) || 1
        )
    );


    updateStats();

    renderTable();

    updatePagination();


}


/* ============================================================
   THỐNG KÊ
============================================================ */

function updateStats() {

    if (!statsBox) return;


    const uniqueCIF =
        new Set();


    let totalAmount =
        0;


    filteredData.forEach(
        function (row) {

            const cif =
                String(
                    row.cif || ""
                ).trim();


            if (cif) {

                uniqueCIF.add(cif);

            }


            totalAmount +=
                parseAmount(
                    row.amount
                );

        }
    );


    statsBox.innerHTML = `
        <div class="stat-item">
            <strong>${uniqueCIF.size}</strong>
            <span>CIF</span>
        </div>

        <div class="stat-item">
            <strong>${formatMoney(totalAmount)}</strong>
            <span>Tổng dự thu</span>
        </div>

        <div class="stat-item">
            <strong>${filteredData.length}</strong>
            <span>Bản ghi</span>
        </div>
    `;

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

    if (!tableBody) return;


    const start =
        (currentPage - 1) *
        pageSize;


    const end =
        start +
        pageSize;


    const pageData =
        filteredData.slice(
            start,
            end
        );


    if (!pageData.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8"
                    style="text-align:center;padding:30px;">
                    Không có dữ liệu
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        pageData
            .map(
                function (row) {

                    return `
                        <tr>

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

                            <td class="action-cell">

                                <button
                                    type="button"
                                    class="edit-btn"
                                    onclick="editRow('${row.id}')"
                                >
                                    ✏️ Sửa
                                </button>

                                <button
                                    type="button"
                                    class="delete-btn"
                                    onclick="deleteRow('${row.id}')"
                                >
                                    🗑️ Xóa
                                </button>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* ============================================================
   PHÂN TRANG
============================================================ */

function updatePagination() {

    if (!pagination) return;


    const totalPages =
        Math.ceil(
            filteredData.length /
            pageSize
        );


    if (totalPages <= 1) {

        pagination.innerHTML = "";

        return;

    }


    let html = "";


    html += `
        <button
            type="button"
            ${currentPage === 1 ? "disabled" : ""}
            onclick="goToPage(${currentPage - 1})"
        >
            ◀
        </button>
    `;


    const maxButtons = 7;


    let startPage =
        Math.max(
            1,
            currentPage -
            Math.floor(
                maxButtons / 2
            )
        );


    let endPage =
        Math.min(
            totalPages,
            startPage +
            maxButtons -
            1
        );


    if (
        endPage -
        startPage +
        1 <
        maxButtons
    ) {

        startPage =
            Math.max(
                1,
                endPage -
                maxButtons +
                1
            );

    }


    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        html += `
            <button
                type="button"
                class="${
                    page === currentPage
                        ? "active"
                        : ""
                }"
                onclick="goToPage(${page})"
            >
                ${page}
            </button>
        `;

    }


    html += `
        <button
            type="button"
            ${
                currentPage === totalPages
                    ? "disabled"
                    : ""
            }
            onclick="goToPage(${currentPage + 1})"
        >
            ▶
        </button>
    `;


    pagination.innerHTML =
        html;

}


/* ============================================================
   ĐI TỚI TRANG
============================================================ */

function goToPage(page) {

    const totalPages =
        Math.ceil(
            filteredData.length /
            pageSize
        );


    if (page < 1) {

        page = 1;

    }


    if (
        totalPages > 0 &&
        page > totalPages
    ) {

        page =
            totalPages;

    }


    currentPage =
        page;


    renderTable();

    updatePagination();

}


window.goToPage =
    goToPage;


/* ============================================================
   XÓA DỮ LIỆU
============================================================ */

async function deleteRow(id) {

    if (!id) return;


    const confirmed =
        confirm(
            "Bạn có chắc chắn muốn xóa dữ liệu này không?"
        );


    if (!confirmed) return;


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

            console.error(
                "Delete error:",
                error
            );

            alert(
                "Xóa thất bại: " +
                error.message
            );

            return;

        }


        alert(
            "Đã xóa thành công."
        );


        await loadData();


    } catch (error) {

        console.error(
            error
        );

        alert(
            "Có lỗi khi xóa dữ liệu."
        );

    }

}


window.deleteRow =
    deleteRow;


/* ============================================================
   CHUYỂN SỐ TIỀN VỀ DẠNG NHẬP
============================================================ */

function formatNumberForInput(value) {

    const number =
        parseAmount(value);


    if (!number) {

        return "";

    }


    return number.toLocaleString(
        "en-US"
    );

}


/* ============================================================
   SỬA DỮ LIỆU
============================================================ */

async function editRow(id) {

    if (!id) return;


    const row =
        allData.find(
            function (item) {

                return String(
                    item.id
                ) === String(id);

            }
        );


    if (!row) {

        alert(
            "Không tìm thấy dữ liệu."
        );

        return;

    }


    const customerName =
        prompt(
            "Tên khách hàng:",
            row.customer_name || ""
        );


    if (
        customerName === null
    ) {

        return;

    }


    const amount =
        prompt(
            "Số tiền dự thu:",
            formatNumberForInput(
                row.amount
            )
        );


    if (amount === null) {

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
            "SĐT:",
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
                        parseAmount(
                            amount
                        ),

                    payment_date:
                        paymentDate,

                    phone:
                        phone.trim(),

                    note:
                        note.trim()

                })
                .eq(
                    "id",
                    id
                );


        if (error) {

            console.error(
                "Update error:",
                error
            );

            alert(
                "Cập nhật thất bại: " +
                error.message
            );

            return;

        }


        alert(
            "Cập nhật thành công."
        );


        await loadData();


    } catch (error) {

        console.error(
            error
        );

        alert(
            "Có lỗi khi cập nhật."
        );

    }

}


window.editRow =
    editRow;


/* ============================================================
   LÀM MỚI
============================================================ */

async function refreshData() {

    await loadData();

}


window.refreshData =
    refreshData;


/* ============================================================
   XUẤT EXCEL
============================================================ */

async function exportExcel() {

    try {

        if (
            typeof XLSX === "undefined"
        ) {

            alert(
                "Không tìm thấy thư viện Excel XLSX."
            );

            return;

        }


        if (
            !filteredData.length
        ) {

            alert(
                "Không có dữ liệu để xuất Excel."
            );

            return;

        }


        /* ====================================================
           DỮ LIỆU EXCEL
        ==================================================== */

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
                            normalizeDate(
                                row.payment_date
                            ),

                        "SĐT":
                            row.phone || "",

                        "Ghi chú":
                            row.note || ""

                    };

                }
            );


        /* ====================================================
           TẠO WORKBOOK
        ==================================================== */

        const workbook =
            XLSX.utils.book_new();


        /* ====================================================
           TẠO SHEET DỮ LIỆU
        ==================================================== */

        const worksheet =
            XLSX.utils.json_to_sheet(
                excelData
            );


        /* ====================================================
           TÔ MÀU CHỈ HÀNG TIÊU ĐỀ
        ==================================================== */

        for (
            let col = 0;
            col < 7;
            col++
        ) {

            const cellAddress =
                XLSX.utils.encode_cell({

                    r: 0,

                    c: col

                });


            if (
                worksheet[cellAddress]
            ) {

                worksheet[cellAddress].s = {

                    fill: {

                        patternType:
                            "solid",

                        fgColor: {

                            rgb:
                                "1D4ED8"

                        }

                    },

                    font: {

                        bold:
                            true,

                        color: {

                            rgb:
                                "FFFFFF"

                        }

                    },

                    alignment: {

                        horizontal:
                            "center",

                        vertical:
                            "center"

                    }

                };

            }

        }


        /* ====================================================
           ĐỊNH DẠNG SỐ TIỀN
        ==================================================== */

        for (
            let rowIndex = 2;
            rowIndex <=
            excelData.length + 1;
            rowIndex++
        ) {

            const cell =
                worksheet[
                    `D${rowIndex}`
                ];


            if (cell) {

                cell.t =
                    "n";

                cell.z =
                    "#,##0";

            }

        }


        /* ====================================================
           ĐỊNH DẠNG NGÀY
        ==================================================== */

        for (
            let rowIndex = 2;
            rowIndex <=
            excelData.length + 1;
            rowIndex++
        ) {

            const cell =
                worksheet[
                    `E${rowIndex}`
                ];


            if (cell) {

                cell.t =
                    "d";

                cell.z =
                    "dd/mm/yyyy";

            }

        }


        /* ====================================================
           ĐỘ RỘNG CỘT
        ==================================================== */

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


        /* ====================================================
           THÊM SHEET DỰ THU
        ==================================================== */

        XLSX.utils.book_append_sheet(

            workbook,

            worksheet,

            "Du Thu"

        );


        /* ====================================================
           SHEET TỔNG QUAN
        ==================================================== */

        const uniqueCIF =
            new Set();


        let totalAmount =
            0;


        filteredData.forEach(
            function (row) {

                const cif =
                    String(
                        row.cif || ""
                    ).trim();


                if (cif) {

                    uniqueCIF.add(
                        cif
                    );

                }


                totalAmount +=
                    parseAmount(
                        row.amount
                    );

            }
        );


        const summaryData = [

            {

                "Nội dung":
                    "Tổng số CIF",

                "Giá trị":
                    uniqueCIF.size

            },

            {

                "Nội dung":
                    "Tổng số bản ghi",

                "Giá trị":
                    filteredData.length

            },

            {

                "Nội dung":
                    "Tổng tiền dự thu",

                "Giá trị":
                    totalAmount

            },

            {

                "Nội dung":
                    "Ngày xuất",

                "Giá trị":
                    formatDate(
                        new Date()
                    )

            }

        ];


        const summarySheet =
            XLSX.utils.json_to_sheet(
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


        if (
            summarySheet["B4"]
        ) {

            summarySheet["B4"].z =
                "#,##0";

        }


        XLSX.utils.book_append_sheet(

            workbook,

            summarySheet,

            "Tong Quan"

        );


        /* ====================================================
           TÊN FILE
        ==================================================== */

        const now =
            new Date();


        const fileDate =
            now
                .toISOString()
                .slice(
                    0,
                    10
                );


        const fileName =
            `BAO_CAO_DU_THU_${fileDate}.xlsx`;


        /* ====================================================
           TẢI FILE
        ==================================================== */

        XLSX.writeFile(

            workbook,

            fileName

        );


        showMessage(
            "Đã xuất Excel thành công.",
            "success"
        );


    } catch (error) {

        console.error(
            "Export Excel error:",
            error
        );


        alert(
            "Xuất Excel thất bại: " +
            error.message
        );

    }

}


/* ============================================================
   KHỞI ĐỘNG APP
============================================================ */

async function startApp() {

    try {

        initDOM();


        const success =
            initSupabase();


        if (!success) {

            return;

        }


        await checkSession();


    } catch (error) {

        console.error(
            "Start app error:",
            error
        );

        showMessage(
            "Không thể khởi động hệ thống.",
            "error"
        );

    }

}


/* ============================================================
   DOM READY
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startApp
    );

} else {

    startApp();

}
