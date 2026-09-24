"use strict";

/* ============================================================
   QUẢN LÝ DỰ THU - MANAGER.JS
   BẢN SỬA LỖI ĐĂNG NHẬP
   - Không phụ thuộc thứ tự tải HTML
   - Kiểm tra Supabase
   - Kiểm tra config.js
   - Hiện lỗi trực tiếp trên màn hình
   - Đăng nhập bằng Supabase Auth Email/Password
   ============================================================ */


/* ============================================================
   BIẾN TOÀN CỤC
   ============================================================ */

let client = null;

let loginBox;
let managerBox;

let emailInput;
let passwordInput;
let loginBtn;
let loginMessage;

let logoutBtn;

let filterUser;
let filterDate;
let filterBtn;
let refreshBtn;
let exportBtn;

let tableBody;
let totalCustomers;
let totalAmount;
let managerMessage;

let prevPageBtn;
let nextPageBtn;
let pageInfo;

let currentPage = 1;
const pageSize = 20;

let allData = [];
let filteredData = [];

let domReady = false;


/* ============================================================
   HIỂN THỊ THÔNG BÁO
   ============================================================ */

function showLoginMessage(message, type = "error") {

    if (!loginMessage) return;

    loginMessage.textContent = message;

    if (type === "success") {
        loginMessage.style.color = "#15803d";
    } else if (type === "warning") {
        loginMessage.style.color = "#d97706";
    } else {
        loginMessage.style.color = "#dc2626";
    }
}


function showManagerMessage(message, type = "error") {

    if (!managerMessage) return;

    managerMessage.textContent = message;

    if (type === "success") {
        managerMessage.style.color = "#15803d";
    } else if (type === "warning") {
        managerMessage.style.color = "#d97706";
    } else {
        managerMessage.style.color = "#dc2626";
    }
}


/* ============================================================
   KHỞI TẠO DOM
   ============================================================ */

function initDOM() {

    if (domReady) return;

    domReady = true;

    loginBox = document.getElementById("loginBox");
    managerBox = document.getElementById("managerBox");

    emailInput = document.getElementById("email");
    passwordInput = document.getElementById("password");
    loginBtn = document.getElementById("loginBtn");
    loginMessage = document.getElementById("loginMessage");

    logoutBtn = document.getElementById("logoutBtn");

    filterUser = document.getElementById("filterUser");
    filterDate = document.getElementById("filterDate");

    filterBtn = document.getElementById("filterBtn");
    refreshBtn = document.getElementById("refreshBtn");
    exportBtn = document.getElementById("exportBtn");

    tableBody = document.getElementById("tableBody");

    totalCustomers = document.getElementById("totalCustomers");
    totalAmount = document.getElementById("totalAmount");

    managerMessage = document.getElementById("managerMessage");

    prevPageBtn = document.getElementById("prevPageBtn");
    nextPageBtn = document.getElementById("nextPageBtn");
    pageInfo = document.getElementById("pageInfo");


    /* --------------------------------------------------------
       KIỂM TRA HTML
       -------------------------------------------------------- */

    if (!emailInput) {
        console.error("Không tìm thấy #email");
    }

    if (!passwordInput) {
        console.error("Không tìm thấy #password");
    }

    if (!loginBtn) {
        console.error("Không tìm thấy #loginBtn");
    }


    /* --------------------------------------------------------
       NÚT ĐĂNG NHẬP
       -------------------------------------------------------- */

    if (loginBtn) {

        loginBtn.addEventListener("click", function (event) {

            event.preventDefault();

            login();

        });

    }


    /* --------------------------------------------------------
       ENTER TRONG Ô MẬT KHẨU
       -------------------------------------------------------- */

    if (passwordInput) {

        passwordInput.addEventListener("keydown", function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                login();

            }

        });

    }


    /* --------------------------------------------------------
       LOGOUT
       -------------------------------------------------------- */

    if (logoutBtn) {

        logoutBtn.addEventListener("click", function (event) {

            event.preventDefault();

            logout();

        });

    }


    /* --------------------------------------------------------
       FILTER
       -------------------------------------------------------- */

    if (filterBtn) {

        filterBtn.addEventListener("click", function (event) {

            event.preventDefault();

            currentPage = 1;

            applyFilters();

        });

    }


    /* --------------------------------------------------------
       REFRESH
       -------------------------------------------------------- */

    if (refreshBtn) {

        refreshBtn.addEventListener("click", function (event) {

            event.preventDefault();

            currentPage = 1;

            loadData();

        });

    }


    /* --------------------------------------------------------
       EXPORT EXCEL
       -------------------------------------------------------- */

    if (exportBtn) {

        exportBtn.addEventListener("click", function (event) {

            event.preventDefault();

            exportExcel();

        });

    }


    /* --------------------------------------------------------
       PHÂN TRANG
       -------------------------------------------------------- */

    if (prevPageBtn) {

        prevPageBtn.addEventListener("click", function () {

            if (currentPage > 1) {

                currentPage--;

                renderTable();

            }

        });

    }


    if (nextPageBtn) {

        nextPageBtn.addEventListener("click", function () {

            const totalPages = Math.max(
                1,
                Math.ceil(filteredData.length / pageSize)
            );

            if (currentPage < totalPages) {

                currentPage++;

                renderTable();

            }

        });

    }


    console.log("DOM manager đã khởi tạo.");

}


/* ============================================================
   KHỞI TẠO SUPABASE
   ============================================================ */

function initSupabase() {

    try {

        /* ------------------------------------------------------
           KIỂM TRA THƯ VIỆN SUPABASE
           ------------------------------------------------------ */

        if (!window.supabase) {

            showLoginMessage(
                "❌ Không tải được thư viện Supabase. Hãy kiểm tra Internet.",
                "error"
            );

            console.error("window.supabase không tồn tại.");

            return false;

        }


        if (
            typeof window.supabase.createClient !== "function"
        ) {

            showLoginMessage(
                "❌ Supabase JS chưa được tải đúng.",
                "error"
            );

            console.error(
                "supabase.createClient không tồn tại."
            );

            return false;

        }


        /* ------------------------------------------------------
           KIỂM TRA CONFIG
           ------------------------------------------------------ */

        console.log("Kiểm tra config.js...");
        console.log("Các biến SUPABASE hiện có:", {
            SUPABASE_URL:
                typeof window.SUPABASE_URL !== "undefined"
                    ? "CÓ"
                    : "KHÔNG",

            SUPABASE_ANON_KEY:
                typeof window.SUPABASE_ANON_KEY !== "undefined"
                    ? "CÓ"
                    : "KHÔNG",

            supabaseUrl:
                typeof window.supabaseUrl !== "undefined"
                    ? "CÓ"
                    : "KHÔNG",

            supabaseAnonKey:
                typeof window.supabaseAnonKey !== "undefined"
                    ? "CÓ"
                    : "KHÔNG"
        });


        /* ------------------------------------------------------
           HỖ TRỢ NHIỀU KIỂU ĐẶT TÊN CONFIG
           ------------------------------------------------------ */

        const url =
            window.SUPABASE_URL ||
            window.supabaseUrl ||
            window.supabase_url ||
            window.SUPABASE_PROJECT_URL;

        const key =
            window.SUPABASE_ANON_KEY ||
            window.supabaseAnonKey ||
            window.supabase_anon_key ||
            window.SUPABASE_KEY;


        /* ------------------------------------------------------
           KHÔNG CÓ CONFIG
           ------------------------------------------------------ */

        if (!url) {

            showLoginMessage(
                "❌ Không tìm thấy SUPABASE_URL trong config.js",
                "error"
            );

            console.error(
                "Không tìm thấy SUPABASE_URL / supabaseUrl."
            );

            return false;

        }


        if (!key) {

            showLoginMessage(
                "❌ Không tìm thấy SUPABASE_ANON_KEY trong config.js",
                "error"
            );

            console.error(
                "Không tìm thấy SUPABASE_ANON_KEY / supabaseAnonKey."
            );

            return false;

        }


        /* ------------------------------------------------------
           TẠO CLIENT
           ------------------------------------------------------ */

        client = window.supabase.createClient(
            url,
            key
        );


        console.log("Supabase client đã tạo thành công.");

        return true;

    } catch (error) {

        console.error(
            "Lỗi initSupabase:",
            error
        );

        showLoginMessage(
            "❌ Lỗi khởi tạo Supabase: " +
            (error.message || error),
            "error"
        );

        return false;

    }

}


/* ============================================================
   ĐĂNG NHẬP
   ============================================================ */

async function login() {

    console.log("Đã bấm nút ĐĂNG NHẬP.");

    if (!emailInput || !passwordInput) {

        alert(
            "❌ Không tìm thấy ô Email hoặc Mật khẩu."
        );

        return;

    }


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    /* --------------------------------------------------------
       KIỂM TRA EMAIL
       -------------------------------------------------------- */

    if (!email) {

        showLoginMessage(
            "⚠️ Vui lòng nhập email.",
            "warning"
        );

        emailInput.focus();

        return;

    }


    /* --------------------------------------------------------
       KIỂM TRA PASSWORD
       -------------------------------------------------------- */

    if (!password) {

        showLoginMessage(
            "⚠️ Vui lòng nhập mật khẩu.",
            "warning"
        );

        passwordInput.focus();

        return;

    }


    /* --------------------------------------------------------
       KHỞI TẠO SUPABASE NẾU CHƯA CÓ
       -------------------------------------------------------- */

    if (!client) {

        const ok = initSupabase();

        if (!ok) {

            return;

        }

    }


    /* --------------------------------------------------------
       KHÓA NÚT
       -------------------------------------------------------- */

    if (loginBtn) {

        loginBtn.disabled = true;

        loginBtn.textContent = "⏳ ĐANG ĐĂNG NHẬP...";

    }


    showLoginMessage(
        "⏳ Đang kiểm tra tài khoản...",
        "warning"
    );


    try {

        console.log(
            "Đang gọi Supabase Auth..."
        );


        const {
            data,
            error
        } = await client.auth.signInWithPassword({

            email: email,

            password: password

        });


        /* ------------------------------------------------------
           SUPABASE TRẢ LỖI
           ------------------------------------------------------ */

        if (error) {

            console.error(
                "Supabase login error:",
                error
            );


            let message =
                error.message ||
                "Đăng nhập thất bại.";


            /* Một số lỗi thường gặp */

            if (
                message
                    .toLowerCase()
                    .includes("invalid login credentials")
            ) {

                message =
                    "❌ Email hoặc mật khẩu không đúng.";

            }


            if (
                message
                    .toLowerCase()
                    .includes("email not confirmed")
            ) {

                message =
                    "❌ Email chưa được xác nhận trong Supabase Authentication.";

            }


            showLoginMessage(
                message,
                "error"
            );


            return;

        }


        /* ------------------------------------------------------
           ĐĂNG NHẬP THÀNH CÔNG
           ------------------------------------------------------ */

        if (!data || !data.session) {

            showLoginMessage(
                "❌ Supabase không tạo được phiên đăng nhập.",
                "error"
            );

            console.error(
                "Không có session:",
                data
            );

            return;

        }


        console.log(
            "Đăng nhập thành công:",
            data.user
        );


        showLoginMessage(
            "✅ Đăng nhập thành công!",
            "success"
        );


        /* ------------------------------------------------------
           HIỆN TRANG QUẢN LÝ
           ------------------------------------------------------ */

        if (loginBox) {

            loginBox.style.display = "none";

        }


        if (managerBox) {

            managerBox.style.display = "block";

        }


        /* ------------------------------------------------------
           TẢI DỮ LIỆU
           ------------------------------------------------------ */

        currentPage = 1;

        await loadData();


    } catch (error) {

        console.error(
            "Lỗi login:",
            error
        );


        showLoginMessage(
            "❌ Lỗi đăng nhập: " +
            (error.message || error),
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
   KIỂM TRA SESSION KHI MỞ TRANG
   ============================================================ */

async function checkSession() {

    if (!client) return;


    try {

        const {
            data,
            error
        } = await client.auth.getSession();


        if (error) {

            console.error(
                "Lỗi getSession:",
                error
            );

            return;

        }


        if (
            data &&
            data.session &&
            data.session.user
        ) {

            console.log(
                "Đã có session:",
                data.session.user.email
            );


            if (loginBox) {

                loginBox.style.display = "none";

            }


            if (managerBox) {

                managerBox.style.display = "block";

            }


            await loadData();

        }

    } catch (error) {

        console.error(
            "checkSession error:",
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

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


    allData = [];

    filteredData = [];

    currentPage = 1;


    if (managerBox) {

        managerBox.style.display = "none";

    }


    if (loginBox) {

        loginBox.style.display = "block";

    }


    if (emailInput) {

        emailInput.value = "";

    }


    if (passwordInput) {

        passwordInput.value = "";

    }


    showLoginMessage(
        "Đã đăng xuất.",
        "success"
    );

}


/* ============================================================
   TẢI DỮ LIỆU
   ============================================================ */

async function loadData() {

    if (!client) {

        showManagerMessage(
            "❌ Chưa kết nối Supabase.",
            "error"
        );

        return;

    }


    showManagerMessage(
        "⏳ Đang tải dữ liệu...",
        "warning"
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

            console.error(
                "Lỗi tải du_thu:",
                error
            );

            showManagerMessage(
                "❌ Lỗi tải dữ liệu: " +
                error.message,
                "error"
            );

            return;

        }


        allData = Array.isArray(data)
            ? data
            : [];


        /* ------------------------------------------------------
           DEDUPE THEO CIF
           Giữ bản ghi mới nhất:
           1. payment_date
           2. created_at
           ------------------------------------------------------ */

        allData = dedupeByCIF(
            allData
        );


        applyFilters();


        showManagerMessage(
            "✅ Đã tải dữ liệu.",
            "success"
        );


    } catch (error) {

        console.error(
            "loadData error:",
            error
        );

        showManagerMessage(
            "❌ Lỗi: " +
            (error.message || error),
            "error"
        );

    }

}


/* ============================================================
   DEDUPE CIF
   ============================================================ */

function dedupeByCIF(data) {

    const map = new Map();


    data.forEach(row => {

        const cif =
            String(
                row.cif || ""
            ).trim();


        if (!cif) {

            return;

        }


        if (!map.has(cif)) {

            map.set(
                cif,
                row
            );

            return;

        }


        const oldRow =
            map.get(cif);


        const oldDate =
            new Date(
                oldRow.payment_date || 0
            ).getTime();


        const newDate =
            new Date(
                row.payment_date || 0
            ).getTime();


        if (newDate > oldDate) {

            map.set(
                cif,
                row
            );

            return;

        }


        if (
            newDate === oldDate
        ) {

            const oldCreated =
                new Date(
                    oldRow.created_at || 0
                ).getTime();


            const newCreated =
                new Date(
                    row.created_at || 0
                ).getTime();


            if (
                newCreated >
                oldCreated
            ) {

                map.set(
                    cif,
                    row
                );

            }

        }

    });


    return Array.from(
        map.values()
    );

}


/* ============================================================
   FILTER
   ============================================================ */

function applyFilters() {

    const user =
        filterUser
            ? filterUser.value
                .trim()
                .toLowerCase()
            : "";


    const date =
        filterDate
            ? filterDate.value
            : "";


    filteredData =
        allData.filter(row => {

            const rowUser =
                String(
                    row.user_name || ""
                )
                    .trim()
                    .toLowerCase();


            if (
                user &&
                !rowUser.includes(user)
            ) {

                return false;

            }


            if (date) {

                const rowDate =
                    String(
                        row.payment_date || ""
                    ).substring(
                        0,
                        10
                    );


                if (
                    rowDate !== date
                ) {

                    return false;

                }

            }


            return true;

        });


    currentPage = 1;


    updateStats();

    renderTable();

}


/* ============================================================
   THỐNG KÊ
   ============================================================ */

function updateStats() {

    const count =
        filteredData.length;


    let total = 0;


    filteredData.forEach(row => {

        total +=
            Number(
                row.amount || 0
            );

    });


    if (totalCustomers) {

        totalCustomers.textContent =
            count.toLocaleString(
                "vi-VN"
            );

    }


    if (totalAmount) {

        totalAmount.textContent =
            total.toLocaleString(
                "vi-VN"
            ) +
            " đ";

    }

}


/* ============================================================
   FORMAT TIỀN
   ============================================================ */

function formatMoney(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "vi-VN"
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

        return String(value);

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


    tableBody.innerHTML = "";


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredData.length /
                pageSize
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const start =
        (
            currentPage - 1
        ) *
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

        const tr =
            document.createElement(
                "tr"
            );


        tr.innerHTML = `
            <td colspan="8" style="text-align:center;padding:20px">
                Không có dữ liệu
            </td>
        `;


        tableBody.appendChild(
            tr
        );

    } else {

        pageData.forEach(
            row => {

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

                    <td>
                        ${formatMoney(
                            row.amount
                        )} đ
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
                        <button
                            type="button"
                            class="delete-btn"
                            data-id="${escapeHTML(
                                row.id
                            )}">
                            Xóa
                        </button>
                    </td>

                `;


                const deleteBtn =
                    tr.querySelector(
                        ".delete-btn"
                    );


                if (deleteBtn) {

                    deleteBtn.addEventListener(
                        "click",
                        function () {

                            deleteRow(
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


    if (pageInfo) {

        pageInfo.textContent =
            `Trang ${currentPage} / ${totalPages}`;

    }


    if (prevPageBtn) {

        prevPageBtn.disabled =
            currentPage <= 1;

    }


    if (nextPageBtn) {

        nextPageBtn.disabled =
            currentPage >= totalPages;

    }

}


/* ============================================================
   XÓA DÒNG
   ============================================================ */

async function deleteRow(id) {

    if (!id) return;


    const confirmDelete =
        confirm(
            "Bạn có chắc muốn xóa dữ liệu này không?"
        );


    if (!confirmDelete) {

        return;

    }


    try {

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

            console.error(
                "Delete error:",
                error
            );

            alert(
                "❌ Xóa thất bại: " +
                error.message
            );

            return;

        }


        showManagerMessage(
            "✅ Đã xóa dữ liệu.",
            "success"
        );


        await loadData();


    } catch (error) {

        console.error(
            error
        );

        alert(
            "❌ Lỗi xóa dữ liệu."
        );

    }

}


/* ============================================================
   XUẤT EXCEL
   ============================================================ */

function exportExcel() {

    if (
        typeof XLSX === "undefined"
    ) {

        alert(
            "❌ Chưa tải được thư viện Excel."
        );

        return;

    }


    if (
        filteredData.length === 0
    ) {

        alert(
            "Không có dữ liệu để xuất."
        );

        return;

    }


    try {

        /* ------------------------------------------------------
           SHEET DỮ LIỆU
           ------------------------------------------------------ */

        const rows =
            filteredData.map(
                row => ({

                    "User":
                        String(
                            row.user_name || ""
                        ),

                    "Số CIF":
                        String(
                            row.cif || ""
                        ),

                    "Tên Khách hàng":
                        String(
                            row.customer_name || ""
                        ),

                    "Số tiền dự thu":
                        Number(
                            row.amount || 0
                        ),

                    "Ngày thanh toán":
                        row.payment_date
                            ? new Date(
                                row.payment_date
                            )
                            : "",

                    "SĐT":
                        String(
                            row.phone || ""
                        ),

                    "Ghi chú":
                        String(
                            row.note || ""
                        )

                })
            );


        const ws =
            XLSX.utils.json_to_sheet(
                rows
            );


        /* ------------------------------------------------------
           ĐỊNH DẠNG CỘT
           ------------------------------------------------------ */

        ws["!cols"] = [

            {
                wch: 18
            },

            {
                wch: 15
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
                wch: 18
            },

            {
                wch: 40
            }

        ];


        /* ------------------------------------------------------
           FORMAT TIỀN
           ------------------------------------------------------ */

        for (
            let r = 2;
            r <= rows.length + 1;
            r++
        ) {

            const cell =
                ws[
                    "D" + r
                ];


            if (cell) {

                cell.t =
                    "n";

                cell.z =
                    "#,##0";

            }

        }


        /* ------------------------------------------------------
           FORMAT NGÀY
           ------------------------------------------------------ */

        for (
            let r = 2;
            r <= rows.length + 1;
            r++
        ) {

            const cell =
                ws[
                    "E" + r
                ];


            if (
                cell &&
                cell.v instanceof Date
            ) {

                cell.t =
                    "d";

                cell.z =
                    "dd/mm/yyyy";

            }

        }


        /* ------------------------------------------------------
           SHEET TỔNG QUAN
           ------------------------------------------------------ */

        const total =
            filteredData.reduce(
                (
                    sum,
                    row
                ) =>
                    sum +
                    Number(
                        row.amount || 0
                    ),
                0
            );


        const summaryData = [

            [
                "BÁO CÁO DỰ THU"
            ],

            [],

            [
                "Tổng khách hàng",
                filteredData.length
            ],

            [
                "Tổng dự thu",
                total
            ],

            [],

            [
                "Ngày xuất",
                new Date()
            ]

        ];


        const wsSummary =
            XLSX.utils.aoa_to_sheet(
                summaryData
            );


        wsSummary["!cols"] = [

            {
                wch: 25
            },

            {
                wch: 25
            }

        ];


        if (wsSummary["B4"]) {

            wsSummary["B4"].t =
                "n";

            wsSummary["B4"].z =
                "#,##0";

        }


        if (wsSummary["B6"]) {

            wsSummary["B6"].t =
                "d";

            wsSummary["B6"].z =
                "dd/mm/yyyy";

        }


        /* ------------------------------------------------------
           TẠO WORKBOOK
           ------------------------------------------------------ */

        const wb =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            wb,
            ws,
            "Du Thu"
        );


        XLSX.utils.book_append_sheet(
            wb,
            wsSummary,
            "Tong Quan"
        );


        /* ------------------------------------------------------
           XUẤT FILE
           ------------------------------------------------------ */

        XLSX.writeFile(
            wb,
            "bao_cao_du_thu.xlsx",
            {
                bookType: "xlsx",
                compression: false,
                cellDates: true,
                bookSST: false
            }
        );


        showManagerMessage(
            "✅ Xuất Excel thành công.",
            "success"
        );


    } catch (error) {

        console.error(
            "Export error:",
            error
        );


        alert(
            "❌ Xuất Excel thất bại: " +
            (
                error.message ||
                error
            )
        );

    }

}


/* ============================================================
   KHỞI ĐỘNG
   ============================================================ */

async function startApp() {

    console.log(
        "========== KHỞI ĐỘNG MANAGER =========="
    );


    initDOM();


    if (!loginBtn) {

        console.error(
            "Không tìm thấy nút đăng nhập."
        );

        return;

    }


    const supabaseOK =
        initSupabase();


    if (!supabaseOK) {

        return;

    }


    await checkSession();


    console.log(
        "========== MANAGER ĐÃ SẴN SÀNG =========="
    );

}


/* ============================================================
   CHỜ DOM
   ============================================================ */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startApp
    );

} else {

    startApp();

}
