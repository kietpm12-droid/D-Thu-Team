"use strict";
/* ============================================================
   QUẢN LÝ DỰ THU - MANAGER.JS
   FULL VERSION
   - POPUP SỬA DỮ LIỆU
   - KHÔNG CẦN SỬA MANAGER.HTML
   - GIỮ NGUYÊN LỌC / XÓA / EXCEL / PHÂN TRANG
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
let emailInput = null;
let passwordInput = null;
let loginBtn = null;
let logoutBtn = null;
let loginBox = null;
let managerBox = null;
let loginMessage = null;
let managerMessage = null;
let filterUser = null;
let filterDate = null;
let filterBtn = null;
let refreshBtn = null;
let exportBtn = null;
let tableBody = null;
let totalCustomers = null;
let totalAmount = null;
let pagination = null;
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
    loginMessage =
        document.getElementById("loginMessage");
    managerMessage =
        document.getElementById("managerMessage");
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
    totalCustomers =
        document.getElementById("totalCustomers");
    totalAmount =
        document.getElementById("totalAmount");
    pagination =
        document.getElementById("pagination");
    /* ========================================================
       ĐĂNG NHẬP
    ======================================================== */
    if (loginBtn) {
        loginBtn.addEventListener(
            "click",
            login
        );
    }
    /* ========================================================
       ENTER ĐĂNG NHẬP
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
    /* ========================================================
       TẠO POPUP SỬA
    ======================================================== */
    createEditModal();
}
/* ============================================================
   THÔNG BÁO
============================================================ */
function showMessage(
    message,
    type = "info"
) {
    if (
        managerBox &&
        managerBox.style.display !== "none" &&
        managerMessage
    ) {
        managerMessage.textContent =
            message;
        managerMessage.className =
            type;
        return;
    }
    if (loginMessage) {
        loginMessage.textContent =
            message;
        loginMessage.className =
            type;
    }
}
/* ============================================================
   KẾT NỐI SUPABASE
============================================================ */
function initSupabase() {
    try {
        if (
            !window.supabase ||
            typeof window.supabase.createClient !==
                "function"
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
    if (
        !emailInput ||
        !passwordInput
    ) {
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
            loginBtn.disabled =
                true;
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
                email:
                    email,
                password:
                    password
            });
        if (error) {
            console.error(
                "Login error:",
                error
            );
            let message =
                error.message ||
                "Đăng nhập thất bại.";
            const lowerMessage =
                String(
                    error.message || ""
                ).toLowerCase();
            if (
                lowerMessage.includes(
                    "invalid login credentials"
                )
            ) {
                message =
                    "Email hoặc mật khẩu không đúng.";
            }
            if (
                lowerMessage.includes(
                    "email not confirmed"
                )
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
        if (
            !data ||
            !data.user
        ) {
            showMessage(
                "Không lấy được thông tin tài khoản.",
                "error"
            );
            return;
        }
        if (loginBox) {
            loginBox.style.display =
                "none";
        }
        if (managerBox) {
            managerBox.style.display =
                "block";
        }
        showMessage(
            "Đăng nhập thành công.",
            "success"
        );
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
            loginBtn.disabled =
                false;
            loginBtn.textContent =
                "🔐 ĐĂNG NHẬP";
        }
    }
}
window.login =
    login;
/* ============================================================
   KIỂM TRA SESSION
============================================================ */
async function checkSession() {
    if (!client) {
        return;
    }
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
        closeEditModal();
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
        if (totalCustomers) {
            totalCustomers.textContent =
                "0";
        }
        if (totalAmount) {
            totalAmount.textContent =
                "0 đ";
        }
        if (pagination) {
            pagination.innerHTML = `
                <button
                    type="button"
                    class="page-btn"
                    disabled
                >
                    ❮
                </button>
                <span class="page-info">
                    Trang 1 / 1
                </span>
                <button
                    type="button"
                    class="page-btn"
                    disabled
                >
                    ❯
                </button>
            `;
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
        if (!success) {
            return;
        }
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
                        ascending:
                            false
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
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
        allData =
            dedupeByCIF(
                allData
            );
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
============================================================ */
function dedupeByCIF(data) {
    const map =
        new Map();
    let emptyCIFIndex =
        0;
    for (
        const row of data
    ) {
        const cif =
            String(
                row.cif || ""
            ).trim();
        if (!cif) {
            emptyCIFIndex++;
            map.set(
                "__EMPTY__" +
                emptyCIFIndex,
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
    if (!value) {
        return "";
    }
    const stringValue =
        String(value);
    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            stringValue
        )
    ) {
        return stringValue;
    }
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
    if (!value) {
        return "";
    }
    const normalized =
        normalizeDate(value);
    if (!normalized) {
        return "";
    }
    const parts =
        normalized.split("-");
    if (
        parts.length !== 3
    ) {
        return "";
    }
    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0]
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
        return Number.isFinite(
            value
        )
            ? value
            : 0;
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
    return Number.isFinite(
        number
    )
        ? number
        : 0;
}
function formatMoney(value) {
    const amount =
        parseAmount(value);
    return (
        amount.toLocaleString(
            "vi-VN"
        ) +
        " đ"
    );
}
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
   LỌC DỮ LIỆU
============================================================ */
function applyFilters() {
    const userValue =
        filterUser
            ? filterUser.value
                .trim()
                .toLowerCase()
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
                        row.user_name ||
                        ""
                    )
                    .trim()
                    .toLowerCase();
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
    const totalPages =
        Math.ceil(
            filteredData.length /
            pageSize
        );
    if (
        totalPages === 0
    ) {
        currentPage = 1;
    } else {
        currentPage =
            Math.min(
                currentPage,
                totalPages
            );
    }
    updateStats();
    renderTable();
    updatePagination();
}
/* ============================================================
   THỐNG KÊ
============================================================ */
function updateStats() {
    const customerElement =
        totalCustomers ||
        document.getElementById(
            "totalCustomers"
        );
    const amountElement =
        totalAmount ||
        document.getElementById(
            "totalAmount"
        );
    const uniqueCIF =
        new Set();
    let total =
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
            total +=
                parseAmount(
                    row.amount
                );
        }
    );
    if (customerElement) {
        customerElement.textContent =
            uniqueCIF.size;
    }
    if (amountElement) {
        amountElement.textContent =
            total.toLocaleString(
                "vi-VN"
            ) +
            " đ";
    }
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
   HIỂN THỊ BẢNG
============================================================ */
function renderTable() {
    if (!tableBody) {
        return;
    }
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
    if (
        pageData.length === 0
    ) {
        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
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
                            <td>
                                <div
                                    class="action-wrap"
                                >
                                    <button
                                        type="button"
                                        class="edit-btn"
                                        onclick="editRow('${escapeHTML(row.id)}')"
                                        title="Sửa"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        type="button"
                                        class="delete-btn"
                                        onclick="deleteRow('${escapeHTML(row.id)}')"
                                        title="Xóa"
                                    >
                                        🗑️
                                    </button>
                                </div>
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
    if (!pagination) {
        return;
    }
    const totalPages =
        Math.ceil(
            filteredData.length /
            pageSize
        );
    const safeTotalPages =
        Math.max(
            1,
            totalPages
        );
    if (
        safeTotalPages <= 1
    ) {
        pagination.innerHTML = `
            <button
                type="button"
                class="page-btn"
                disabled
            >
                ❮
            </button>
            <span class="page-info">
                Trang 1 / 1
            </span>
            <button
                type="button"
                class="page-btn"
                disabled
            >
                ❯
            </button>
        `;
        return;
    }
    pagination.innerHTML = `
        <button
            type="button"
            class="page-btn"
            ${
                currentPage === 1
                    ? "disabled"
                    : ""
            }
            onclick="goToPage(${currentPage - 1})"
        >
            ❮
        </button>
        <span class="page-info">
            Trang
            ${currentPage}
            /
            ${safeTotalPages}
        </span>
        <button
            type="button"
            class="page-btn"
            ${
                currentPage === safeTotalPages
                    ? "disabled"
                    : ""
            }
            onclick="goToPage(${currentPage + 1})"
        >
            ❯
        </button>
    `;
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
    if (!id) {
        return;
    }
    const confirmed =
        confirm(
            "Bạn có chắc chắn muốn xóa dữ liệu này không?"
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
        await loadData();
        showMessage(
            "Đã xóa thành công.",
            "success"
        );
    } catch (error) {
        console.error(
            "Delete error:",
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
   TẠO POPUP SỬA
   Không cần sửa manager.html
============================================================ */
function createEditModal() {
    if (
        document.getElementById(
            "editModal"
        )
    ) {
        return;
    }
    const style =
        document.createElement(
            "style"
        );
    style.id =
        "editModalStyle";
    style.textContent = `
        /* ====================================================
           POPUP SỬA DỰ THU
        ==================================================== */
        #editModal {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background:
                rgba(15, 23, 42, 0.58);
            backdrop-filter:
                blur(4px);
            -webkit-backdrop-filter:
                blur(4px);
        }
        #editModal.show {
            display: flex;
        }
        #editModal .edit-modal-box {
            width: 100%;
            max-width: 520px;
            max-height:
                calc(100vh - 32px);
            overflow-y: auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow:
                0 25px 60px
                rgba(15, 23, 42, 0.25);
            animation:
                editModalIn
                0.18s ease-out;
            -webkit-overflow-scrolling:
                touch;
        }
        @keyframes editModalIn {
            from {
                opacity: 0;
                transform:
                    translateY(15px)
                    scale(0.98);
            }
            to {
                opacity: 1;
                transform:
                    translateY(0)
                    scale(1);
            }
        }
        #editModal .edit-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding:
                16px 18px;
            border-bottom:
                1px solid #e2e8f0;
            background:
                linear-gradient(
                    135deg,
                    #eef2ff,
                    #f8fafc
                );
            border-radius:
                20px 20px 0 0;
        }
        #editModal .edit-modal-title {
            margin: 0;
            color: #1e1b4b;
            font-size: 17px;
            font-weight: 800;
        }
        #editModal .edit-modal-close {
            width: 34px !important;
            height: 34px !important;
            min-width: 34px !important;
            max-width: 34px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 50% !important;
            background: #e2e8f0 !important;
            color: #475569 !important;
            font-size: 20px !important;
            line-height: 1 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            box-shadow: none !important;
        }
        #editModal .edit-modal-close:hover {
            background: #cbd5e1 !important;
        }
        #editModal .edit-modal-body {
            padding: 18px;
        }
        #editModal .edit-field {
            margin-bottom: 13px;
        }
        #editModal .edit-field label {
            display: block;
            margin:
                0 0 5px;
            color: #334155;
            font-size: 12px;
            font-weight: 700;
        }
        #editModal .edit-field input,
        #editModal .edit-field textarea {
            width: 100%;
            margin: 0 !important;
            padding:
                9px 11px !important;
            height: 42px !important;
            min-height: 42px !important;
            border:
                1.5px solid #cbd5e1 !important;
            border-radius: 10px !important;
            background: #f8fafc !important;
            color: #0f172a !important;
            font-size: 14px !important;
            font-family: inherit !important;
            outline: none !important;
            box-shadow: none !important;
        }
        #editModal .edit-field textarea {
            height: 76px !important;
            min-height: 76px !important;
            resize: vertical !important;
        }
        #editModal .edit-field input:focus,
        #editModal .edit-field textarea:focus {
            background: #ffffff !important;
            border-color:
                #6366f1 !important;
            box-shadow:
                0 0 0 3px
                rgba(99,102,241,.12)
                !important;
        }
        #editModal .edit-readonly {
            background: #f1f5f9 !important;
            color: #64748b !important;
            cursor: not-allowed !important;
        }
        #editModal .edit-money-wrap {
            display: flex;
            align-items: center;
            border:
                1.5px solid #fdba74;
            border-radius: 10px;
            background: #fff7ed;
            overflow: hidden;
        }
        #editModal .edit-money-wrap input {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            font-size: 17px !important;
            font-weight: 800 !important;
            color: #c2410c !important;
        }
        #editModal .edit-money-unit {
            flex-shrink: 0;
            padding-right: 11px;
            color: #ea580c;
            font-size: 12px;
            font-weight: 800;
        }
        #editModal .edit-modal-footer {
            display: flex;
            gap: 9px;
            padding:
                14px 18px 18px;
            border-top:
                1px solid #f1f5f9;
        }
        #editModal .edit-cancel-btn,
        #editModal .edit-save-btn {
            flex: 1;
            width: auto !important;
            height: 42px !important;
            min-height: 42px !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 10px !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        #editModal .edit-cancel-btn {
            background: #e2e8f0 !important;
            color: #334155 !important;
        }
        #editModal .edit-save-btn {
            background:
                linear-gradient(
                    135deg,
                    #4f46e5,
                    #6366f1
                ) !important;
            color: #ffffff !important;
            box-shadow:
                0 5px 12px
                rgba(79,70,229,.22);
        }
        #editModal .edit-save-btn:disabled {
            opacity: .6;
            cursor: not-allowed !important;
        }
        @media (max-width: 480px) {
            #editModal {
                padding: 10px;
                align-items: center;
            }
            #editModal .edit-modal-box {
                max-height:
                    calc(100vh - 20px);
                border-radius: 17px;
            }
            #editModal .edit-modal-header {
                padding:
                    13px 14px;
                border-radius:
                    17px 17px 0 0;
            }
            #editModal .edit-modal-body {
                padding:
                    14px;
            }
            #editModal .edit-field {
                margin-bottom: 10px;
            }
            #editModal .edit-field input {
                height: 40px !important;
                min-height: 40px !important;
                font-size: 14px !important;
            }
            #editModal .edit-field textarea {
                height: 68px !important;
                min-height: 68px !important;
            }
            #editModal .edit-modal-footer {
                padding:
                    12px 14px 14px;
            }
        }
    `;
    document.head.appendChild(
        style
    );
    const modal =
        document.createElement(
            "div"
        );
    modal.id =
        "editModal";
    modal.innerHTML = `
        <div
            class="edit-modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editModalTitle"
        >
            <div
                class="edit-modal-header"
            >
                <h2
                    id="editModalTitle"
                    class="edit-modal-title"
                >
                    ✏️ SỬA DỰ THU
                </h2>
                <button
                    type="button"
                    class="edit-modal-close"
                    id="editModalClose"
                    aria-label="Đóng"
                >
                    ×
                </button>
            </div>
            <div
                class="edit-modal-body"
            >
                <div
                    class="edit-field"
                >
                    <label>
                        User cán bộ
                    </label>
                    <input
                        id="editUser"
                        type="text"
                        class="edit-readonly"
                        readonly
                    >
                </div>
                <div
                    class="edit-field"
                >
                    <label>
                        Số CIF
                    </label>
                    <input
                        id="editCIF"
                        type="text"
                        class="edit-readonly"
                        readonly
                    >
                </div>
                <div
                    class="edit-field"
                >
                    <label>
                        Tên khách hàng
                    </label>
                    <input
                        id="editCustomerName"
                        type="text"
                        placeholder="Nhập tên khách hàng"
                        autocomplete="off"
                    >
                </div>
                <div
                    class="edit-field"
                >
                    <label>
                        Số tiền dự thu
                    </label>
                    <div
                        class="edit-money-wrap"
                    >
                        <input
                            id="editAmount"
                            type="text"
                            inputmode="numeric"
                            placeholder="0"
                            autocomplete="off"
                        >
                        <span
                            class="edit-money-unit"
                        >
                            VNĐ
                        </span>
                    </div>
                </div>
                <div
                    class="edit-field"
                >
                    <label>
                        Ngày thanh toán
                    </label>
                    <input
                        id="editPaymentDate"
                        type="date"
                    >
                </div>
                <div
                    class="edit-field"
                >
                    <label>
                        SĐT
                    </label>
                    <input
                        id="editPhone"
                        type="tel"
                        inputmode="tel"
                        placeholder="Nhập số điện thoại"
                        autocomplete="off"
                    >
                </div>
                <div
                    class="edit-field"
                >
                    <label>
                        Ghi chú
                    </label>
                    <textarea
                        id="editNote"
                        placeholder="Nhập ghi chú..."
                    ></textarea>
                </div>
            </div>
            <div
                class="edit-modal-footer"
            >
                <button
                    type="button"
                    class="edit-cancel-btn"
                    id="editCancelBtn"
                >
                    Hủy
                </button>
                <button
                    type="button"
                    class="edit-save-btn"
                    id="editSaveBtn"
                >
                    💾 Lưu thay đổi
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(
        modal
    );
    const closeBtn =
        document.getElementById(
            "editModalClose"
        );
    const cancelBtn =
        document.getElementById(
            "editCancelBtn"
        );
    const saveBtn =
        document.getElementById(
            "editSaveBtn"
        );
    const amountInput =
        document.getElementById(
            "editAmount"
        );
    if (closeBtn) {
        closeBtn.addEventListener(
            "click",
            closeEditModal
        );
    }
    if (cancelBtn) {
        cancelBtn.addEventListener(
            "click",
            closeEditModal
        );
    }
    if (saveBtn) {
        saveBtn.addEventListener(
            "click",
            saveEditRow
        );
    }
    if (amountInput) {
        amountInput.addEventListener(
            "input",
            function () {
                let value =
                    amountInput.value;
                value =
                    value.replace(
                        /[^0-9]/g,
                        ""
                    );
                if (!value) {
                    amountInput.value =
                        "";
                    return;
                }
                const number =
                    Number(value);
                amountInput.value =
                    number.toLocaleString(
                        "en-US"
                    );
            }
        );
    }
    /*
     * Bấm ra ngoài popup để đóng
     */
    modal.addEventListener(
        "click",
        function (event) {
            if (
                event.target === modal
            ) {
                closeEditModal();
            }
        }
    );
    /*
     * Nhấn ESC để đóng
     */
    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key === "Escape" &&
                modal.classList.contains(
                    "show"
                )
            ) {
                closeEditModal();
            }
        }
    );
}
/* ============================================================
   MỞ POPUP SỬA
============================================================ */
function editRow(id) {
    if (!id) {
        return;
    }
    const row =
        allData.find(
            function (item) {
                return String(
                    item.id
                ) ===
                String(id);
            }
        );
    if (!row) {
        alert(
            "Không tìm thấy dữ liệu."
        );
        return;
    }
    /*
     * Lưu ID đang sửa
     */
    const modal =
        document.getElementById(
            "editModal"
        );
    if (!modal) {
        createEditModal();
    }
    modal.dataset.editId =
        String(id);
    /*
     * Lấy các ô input
     */
    const userInput =
        document.getElementById(
            "editUser"
        );
    const cifInput =
        document.getElementById(
            "editCIF"
        );
    const customerInput =
        document.getElementById(
            "editCustomerName"
        );
    const amountInput =
        document.getElementById(
            "editAmount"
        );
    const dateInput =
        document.getElementById(
            "editPaymentDate"
        );
    const phoneInput =
        document.getElementById(
            "editPhone"
        );
    const noteInput =
        document.getElementById(
            "editNote"
        );
    if (userInput) {
        userInput.value =
            row.user_name || "";
    }
    if (cifInput) {
        cifInput.value =
            row.cif || "";
    }
    if (customerInput) {
        customerInput.value =
            row.customer_name || "";
    }
    if (amountInput) {
        amountInput.value =
            formatNumberForInput(
                row.amount
            );
    }
    if (dateInput) {
        dateInput.value =
            normalizeDate(
                row.payment_date
            );
    }
    if (phoneInput) {
        phoneInput.value =
            row.phone || "";
    }
    if (noteInput) {
        noteInput.value =
            row.note || "";
    }
    const saveBtn =
        document.getElementById(
            "editSaveBtn"
        );
    if (saveBtn) {
        saveBtn.disabled =
            false;
        saveBtn.textContent =
            "💾 Lưu thay đổi";
    }
    modal.classList.add(
        "show"
    );
    document.body.style.overflow =
        "hidden";
    /*
     * Focus tên khách hàng
     */
    setTimeout(
        function () {
            if (customerInput) {
                customerInput.focus();
            }
        },
        100
    );
}
window.editRow =
    editRow;
/* ============================================================
   ĐÓNG POPUP
============================================================ */
function closeEditModal() {
    const modal =
        document.getElementById(
            "editModal"
        );
    if (!modal) {
        return;
    }
    modal.classList.remove(
        "show"
    );
    document.body.style.overflow =
        "";
}
/* ============================================================
   LƯU DỮ LIỆU TỪ POPUP
============================================================ */
async function saveEditRow() {
    const modal =
        document.getElementById(
            "editModal"
        );
    if (!modal) {
        return;
    }
    const id =
        modal.dataset.editId;
    if (!id) {
        alert(
            "Không xác định được dữ liệu cần sửa."
        );
        return;
    }
    const customerInput =
        document.getElementById(
            "editCustomerName"
        );
    const amountInput =
        document.getElementById(
            "editAmount"
        );
    const dateInput =
        document.getElementById(
            "editPaymentDate"
        );
    const phoneInput =
        document.getElementById(
            "editPhone"
        );
    const noteInput =
        document.getElementById(
            "editNote"
        );
    const customerName =
        customerInput
            ? customerInput.value.trim()
            : "";
    const amountText =
        amountInput
            ? amountInput.value.trim()
            : "";
    const paymentDate =
        dateInput
            ? dateInput.value
            : "";
    const phone =
        phoneInput
            ? phoneInput.value.trim()
            : "";
    const note =
        noteInput
            ? noteInput.value.trim()
            : "";
    /*
     * Kiểm tra
     */
    if (!customerName) {
        alert(
            "Vui lòng nhập tên khách hàng."
        );
        if (customerInput) {
            customerInput.focus();
        }
        return;
    }
    if (!amountText) {
        alert(
            "Vui lòng nhập số tiền dự thu."
        );
        if (amountInput) {
            amountInput.focus();
        }
        return;
    }
    const amount =
        parseAmount(
            amountText
        );
    if (
        amount <= 0
    ) {
        alert(
            "Số tiền dự thu phải lớn hơn 0."
        );
        if (amountInput) {
            amountInput.focus();
        }
        return;
    }
    if (!paymentDate) {
        alert(
            "Vui lòng chọn ngày thanh toán."
        );
        if (dateInput) {
            dateInput.focus();
        }
        return;
    }
    if (!client) {
        const success =
            initSupabase();
        if (!success) {
            return;
        }
    }
    const saveBtn =
        document.getElementById(
            "editSaveBtn"
        );
    try {
        if (saveBtn) {
            saveBtn.disabled =
                true;
            saveBtn.textContent =
                "⏳ ĐANG LƯU...";
        }
        const {
            error
        } =
            await client
                .from("du_thu")
                .update({
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
            if (saveBtn) {
                saveBtn.disabled =
                    false;
                saveBtn.textContent =
                    "💾 Lưu thay đổi";
            }
            return;
        }
        closeEditModal();
        await loadData();
        showMessage(
            "Cập nhật thành công.",
            "success"
        );
    } catch (error) {
        console.error(
            "Update error:",
            error
        );
        alert(
            "Có lỗi khi cập nhật: " +
            error.message
        );
        if (saveBtn) {
            saveBtn.disabled =
                false;
            saveBtn.textContent =
                "💾 Lưu thay đổi";
        }
    }
}
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
                "Không tìm thấy thư viện Excel."
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
        const excelData =
            filteredData.map(
                function (row) {
                    return {
                        "User":
                            row.user_name ||
                            "",
                        "Số CIF":
                            row.cif ||
                            "",
                        "Tên Khách hàng":
                            row.customer_name ||
                            "",
                        "Số tiền dự thu":
                            parseAmount(
                                row.amount
                            ),
                        "Ngày thanh toán":
                            normalizeDate(
                                row.payment_date
                            ),
                        "SĐT":
                            row.phone ||
                            "",
                        "Ghi chú":
                            row.note ||
                            ""
                    };
                }
            );
        const workbook =
            XLSX.utils.book_new();
        const worksheet =
            XLSX.utils.json_to_sheet(
                excelData
            );
        /*
         * TÔ MÀU HEADER
         */
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
                worksheet[
                    cellAddress
                ].s = {
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
        /*
         * FORMAT TIỀN
         */
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
        /*
         * FORMAT NGÀY
         */
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
                const dateText =
                    excelData[
                        rowIndex - 2
                    ][
                        "Ngày thanh toán"
                    ];
                if (dateText) {
                    const parts =
                        dateText.split("-");
                    if (
                        parts.length === 3
                    ) {
                        const year =
                            Number(
                                parts[0]
                            );
                        const month =
                            Number(
                                parts[1]
                            ) - 1;
                        const day =
                            Number(
                                parts[2]
                            );
                        cell.v =
                            new Date(
                                year,
                                month,
                                day
                            );
                        cell.t =
                            "d";
                        cell.z =
                            "dd/mm/yyyy";
                    }
                }
            }
        }
        /*
         * ĐỘ RỘNG CỘT
         */
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
        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Du Thu"
        );
        /*
         * SHEET TỔNG QUAN
         */
        const uniqueCIF =
            new Set();
        let total =
            0;
        filteredData.forEach(
            function (row) {
                const cif =
                    String(
                        row.cif ||
                        ""
                    ).trim();
                if (cif) {
                    uniqueCIF.add(
                        cif
                    );
                }
                total +=
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
                    total
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
        for (
            let col = 0;
            col < 2;
            col++
        ) {
            const address =
                XLSX.utils.encode_cell({
                    r: 0,
                    c: col
                });
            if (
                summarySheet[address]
            ) {
                summarySheet[address].s = {
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
        if (
            summarySheet["B4"]
        ) {
            summarySheet["B4"].t =
                "n";
            summarySheet["B4"].z =
                "#,##0";
        }
        XLSX.utils.book_append_sheet(
            workbook,
            summarySheet,
            "Tong Quan"
        );
        /*
         * TÊN FILE
         */
        const now =
            new Date();
        const year =
            now.getFullYear();
        const month =
            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            );
        const day =
            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            );
        const fileName =
            `BAO_CAO_DU_THU_${year}-${month}-${day}.xlsx`;
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
