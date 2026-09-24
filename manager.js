"use strict";

/* ============================================================
   QUẢN LÝ DỰ THU - MANAGER.JS
   FULL VERSION - ĐỒNG BỘ VỚI MANAGER.HTML
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
   THÔNG BÁO
============================================================ */

function showMessage(
    message,
    type = "info"
) {

    /*
     * Nếu đang ở trang quản lý thì
     * hiển thị tại managerMessage.
     */

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


    /*
     * Nếu đang ở trang đăng nhập
     * thì hiển thị tại loginMessage.
     */

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

        console.error(
            "Không tìm thấy ô email hoặc mật khẩu."
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


        console.log(
            "Đăng nhập thành công:",
            data.user.email
        );


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


/* ============================================================
   CHO HTML GỌI window.login()
============================================================ */

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


        /*
         * Loại CIF trùng.
         * Giữ bản ghi có ngày thanh toán
         * mới nhất.
         */

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


        /*
         * CIF rỗng:
         * Không gom chung các dòng.
         */

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


    /*
     * Nếu Supabase trả YYYY-MM-DD,
     * xử lý trực tiếp để tránh lệch múi giờ.
     */

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

    /*
     * QUAN TRỌNG:
     * HTML sử dụng:
     *
     * totalCustomers
     * totalAmount
     *
     * Không dùng id="stats".
     */


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


    /*
     * Tổng khách hàng
     */

    if (customerElement) {

        customerElement.textContent =
            uniqueCIF.size;

    }


    /*
     * Tổng dự thu
     */

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
                                        onclick="editRow('${row.id}')"
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        type="button"
                                        class="delete-btn"
                                        onclick="deleteRow('${row.id}')"
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


    let html = "";


    /*
     * Nút trước
     */

    html += `

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

    `;


    /*
     * Thông tin trang
     */

    html += `

        <span class="page-info">

            Trang
            ${currentPage}
            /
            ${safeTotalPages}

        </span>

    `;


    /*
     * Nút sau
     */

    html += `

        <button
            type="button"
            class="page-btn"
            ${
                currentPage ===
                safeTotalPages
                    ? "disabled"
                    : ""
            }
            onclick="goToPage(${currentPage + 1})"
        >
            ❯
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
   FORMAT SỐ TIỀN CHO Ô SỬA
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


    const customerName =
        prompt(
            "Tên khách hàng:",
            row.customer_name ||
            ""
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


    if (
        amount === null
    ) {

        return;

    }


    const paymentDate =
        prompt(
            "Ngày thanh toán (YYYY-MM-DD):",
            normalizeDate(
                row.payment_date
            )
        );


    if (
        paymentDate === null
    ) {

        return;

    }


    const phone =
        prompt(
            "SĐT:",
            row.phone ||
            ""
        );


    if (
        phone === null
    ) {

        return;

    }


    const note =
        prompt(
            "Ghi chú:",
            row.note ||
            ""
        );


    if (
        note === null
    ) {

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


        /* ====================================================
           DỮ LIỆU EXCEL
        ==================================================== */

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


        /* ====================================================
           WORKBOOK
        ==================================================== */

        const workbook =
            XLSX.utils.book_new();


        /* ====================================================
           SHEET DỰ THU
        ==================================================== */

        const worksheet =
            XLSX.utils.json_to_sheet(
                excelData
            );


        /* ====================================================
           TÔ MÀU HÀNG TIÊU ĐỀ
           
           CHỈ 7 CỘT DỮ LIỆU
           KHÔNG TÔ DÒNG KHÁCH HÀNG
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

                /*
                 * Chuyển YYYY-MM-DD
                 * thành Date để Excel nhận
                 * đúng định dạng.
                 */

                const dateText =
                    excelData[
                        rowIndex - 2
                    ][
                        "Ngày thanh toán"
                    ];


                if (dateText) {

                    const parts =
                        dateText.split(
                            "-"
                        );


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


        /*
         * Tô màu tiêu đề sheet Tổng Quan
         */

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


        /*
         * Định dạng tổng tiền
         */

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


        /* ====================================================
           TÊN FILE
        ==================================================== */

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


        /* ====================================================
           XUẤT FILE
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
