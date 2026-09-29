"use strict";

/* ============================================================

   QUẢN LÝ DỰ THU - MANAGER.JS

   ============================================================

   - Đăng nhập bằng Supabase Auth

   - Gmail/password phải tồn tại trong:

     Supabase → Authentication → Users

   - Không chuyển sang index.html khi chưa đăng nhập

   - Bảng: du_thu

   - Lọc User

   - Lọc ngày

   - Làm mới

   - Sửa popup

   - Xóa từng bản ghi

   - Xóa tất cả

   - Phân trang 20

   - CIF trùng lấy bản ghi mới nhất

   - Xuất Excel

   - Không reset tháng

============================================================ */

let supabaseClient = null;

let allRecords = [];

let filteredRecords = [];

let currentPage = 1;

const pageSize = 20;

let editingRowId = null;

/* ============================================================

   1. KHỞI ĐỘNG

============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        initApp();

    }

);

/* ============================================================

   2. KHỞI TẠO

============================================================ */

async function initApp() {

    try {

        if (!window.supabase) {

            showLoginError(

                "Thư viện Supabase chưa được tải."

            );

            return;

        }

        if (

            !window.SUPABASE_URL ||

            !window.SUPABASE_ANON_KEY

        ) {

            showLoginError(

                "Không tìm thấy cấu hình Supabase trong config.js."

            );

            return;

        }

        supabaseClient =

            window.supabase.createClient(

                window.SUPABASE_URL,

                window.SUPABASE_ANON_KEY

            );

        setupLoginEvents();

        setupManagerEvents();

        /*

         * Kiểm tra session hiện tại

         */

        await checkCurrentSession();

    } catch (error) {

        console.error(

            "Lỗi khởi động:",

            error

        );

        showLoginError(

            error.message

        );

    }

}

/* ============================================================

   3. SỰ KIỆN ĐĂNG NHẬP

============================================================ */

function setupLoginEvents() {

    const loginBtn =

        document.getElementById(

            "loginBtn"

        );

    if (loginBtn) {

        loginBtn.addEventListener(

            "click",

            handleLogin

        );

    }

    const email =

        document.getElementById(

            "loginEmail"

        );

    const password =

        document.getElementById(

            "loginPassword"

        );

    if (email) {

        email.addEventListener(

            "keydown",

            (event) => {

                if (

                    event.key ===

                    "Enter"

                ) {

                    handleLogin();

                }

            }

        );

    }

    if (password) {

        password.addEventListener(

            "keydown",

            (event) => {

                if (

                    event.key ===

                    "Enter"

                ) {

                    handleLogin();

                }

            }

        );

    }

}

/* ============================================================

   4. ĐĂNG NHẬP SUPABASE

============================================================ */

async function handleLogin() {

    if (!supabaseClient) {

        showLoginError(

            "Supabase chưa sẵn sàng."

        );

        return;

    }

    const emailInput =

        document.getElementById(

            "loginEmail"

        );

    const passwordInput =

        document.getElementById(

            "loginPassword"

        );

    const loginBtn =

        document.getElementById(

            "loginBtn"

        );

    const email =

        emailInput

            ? emailInput.value.trim()

            : "";

    const password =

        passwordInput

            ? passwordInput.value

            : "";

    clearLoginError();

    if (!email) {

        showLoginError(

            "Vui lòng nhập Gmail."

        );

        emailInput?.focus();

        return;

    }

    if (!password) {

        showLoginError(

            "Vui lòng nhập mật khẩu."

        );

        passwordInput?.focus();

        return;

    }

    if (loginBtn) {

        loginBtn.disabled = true;

        loginBtn.innerText =

            "⏳ ĐANG ĐĂNG NHẬP...";

    }

    try {

        const {

            data,

            error

        } =

            await supabaseClient.auth.signInWithPassword({

                email: email,

                password: password

            });

        if (error) {

            throw error;

        }

        if (

            !data ||

            !data.user

        ) {

            throw new Error(

                "Không nhận được thông tin tài khoản."

            );

        }

        showManagerPage(

            data.user

        );

        await loadData();

    } catch (error) {

        console.error(

            "Lỗi đăng nhập:",

            error

        );

        showLoginError(

            getLoginErrorMessage(

                error

            )

        );

        if (passwordInput) {

            passwordInput.value = "";

            passwordInput.focus();

        }

    } finally {

        if (loginBtn) {

            loginBtn.disabled = false;

            loginBtn.innerText =

                "🔐 ĐĂNG NHẬP";

        }

    }

}

/* ============================================================

   5. KIỂM TRA SESSION

============================================================ */

async function checkCurrentSession() {

    try {

        const {

            data,

            error

        } =

            await supabaseClient.auth.getSession();

        if (error) {

            throw error;

        }

        if (

            data &&

            data.session &&

            data.session.user

        ) {

            showManagerPage(

                data.session.user

            );

            await loadData();

        } else {

            /*

             * CHƯA ĐĂNG NHẬP:

             * chỉ hiện màn hình đăng nhập

             *

             * KHÔNG chuyển sang index.html

             */

            showLoginPage();

        }

    } catch (error) {

        console.error(

            "Lỗi kiểm tra session:",

            error

        );

        showLoginPage();

        showLoginError(

            "Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại."

        );

    }

}

/* ============================================================

   6. HIỆN TRANG ĐĂNG NHẬP

============================================================ */

function showLoginPage() {

    const loginBox =

        document.getElementById(

            "loginBox"

        );

    const managerBox =

        document.getElementById(

            "managerBox"

        );

    if (loginBox) {

        loginBox.style.display =

            "block";

    }

    if (managerBox) {

        managerBox.style.display =

            "none";

    }

}

/* ============================================================

   7. HIỆN TRANG QUẢN LÝ

============================================================ */

function showManagerPage(

    user

) {

    const loginBox =

        document.getElementById(

            "loginBox"

        );

    const managerBox =

        document.getElementById(

            "managerBox"

        );

    if (loginBox) {

        loginBox.style.display =

            "none";

    }

    if (managerBox) {

        managerBox.style.display =

            "block";

    }

    const loggedUser =

        document.getElementById(

            "loggedUser"

        );

    if (loggedUser) {

        loggedUser.innerText =

            user?.email

                ? `👤 ${user.email}`

                : "👤 Đã đăng nhập";

    }

}

/* ============================================================

   8. SỰ KIỆN TRANG QUẢN LÝ

============================================================ */

function setupManagerEvents() {

    const logoutBtn =

        document.getElementById(

            "logoutBtn"

        );

    if (logoutBtn) {

        logoutBtn.addEventListener(

            "click",

            handleLogout

        );

    }

    const filterBtn =

        document.getElementById(

            "filterBtn"

        );

    if (filterBtn) {

        filterBtn.addEventListener(

            "click",

            handleFilter

        );

    }

    const refreshBtn =

        document.getElementById(

            "refreshBtn"

        );

    if (refreshBtn) {

        refreshBtn.addEventListener(

            "click",

            handleRefresh

        );

    }

    const exportBtn =

        document.getElementById(

            "exportBtn"

        );

    if (exportBtn) {

        exportBtn.addEventListener(

            "click",

            exportToExcel

        );

    }

    const deleteAllBtn =

        document.getElementById(

            "deleteAllBtn"

        );

    if (deleteAllBtn) {

        deleteAllBtn.addEventListener(

            "click",

            handleDeleteAll

        );

    }

    const prevPageBtn =

        document.getElementById(

            "prevPageBtn"

        );

    if (prevPageBtn) {

        prevPageBtn.addEventListener(

            "click",

            () => changePage(-1)

        );

    }

    const nextPageBtn =

        document.getElementById(

            "nextPageBtn"

        );

    if (nextPageBtn) {

        nextPageBtn.addEventListener(

            "click",

            () => changePage(1)

        );

    }

    const filterUser =

        document.getElementById(

            "filterUser"

        );

    if (filterUser) {

        filterUser.addEventListener(

            "keydown",

            (event) => {

                if (

                    event.key ===

                    "Enter"

                ) {

                    handleFilter();

                }

            }

        );

    }

    const filterDate =

        document.getElementById(

            "filterDate"

        );

    if (filterDate) {

        filterDate.addEventListener(

            "keydown",

            (event) => {

                if (

                    event.key ===

                    "Enter"

                ) {

                    handleFilter();

                }

            }

        );

    }

}

/* ============================================================

   9. ĐĂNG XUẤT

============================================================ */

async function handleLogout() {

    const confirmed =

        confirm(

            "Bạn có chắc chắn muốn đăng xuất?"

        );

    if (!confirmed) {

        return;

    }

    const logoutBtn =

        document.getElementById(

            "logoutBtn"

        );

    if (logoutBtn) {

        logoutBtn.disabled = true;

        logoutBtn.innerText =

            "⏳ ĐANG ĐĂNG XUẤT...";

    }

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error(

            "Lỗi đăng xuất:",

            error

        );

    } finally {

        /*

         * QUAN TRỌNG:

         * Không chuyển sang index.html.

         * Chỉ trở về màn hình đăng nhập manager.

         */

        showLoginPage();

        const email =

            document.getElementById(

                "loginEmail"

            );

        const password =

            document.getElementById(

                "loginPassword"

            );

        if (email) {

            email.value = "";

        }

        if (password) {

            password.value = "";

        }

        clearLoginError();

        if (logoutBtn) {

            logoutBtn.disabled = false;

            logoutBtn.innerText =

                "🚪 ĐĂNG XUẤT";

        }

    }

}

/* ============================================================

   10. TẢI DỮ LIỆU

============================================================ */

async function loadData() {

    const tableBody =

        document.getElementById(

            "tableBody"

        );

    if (tableBody) {

        tableBody.innerHTML = `

            <tr>

                <td

                    colspan="8"

                    class="empty-row"

                >

                    ⏳ Đang tải dữ liệu...

                </td>

            </tr>

        `;

    }

    try {

        const {

            data,

            error

        } =

            await supabaseClient

                .from("du_thu")

                .select("*")

                .order(

                    "created_at",

                    {

                        ascending: false

                    }

                );

        if (error) {

            throw error;

        }

        allRecords =

            Array.isArray(data)

                ? data

                : [];

        filteredRecords =

            getLatestRecordsByCIF(

                allRecords

            );

        currentPage = 1;

        updateStats();

        renderTable();

    } catch (error) {

        console.error(

            "Lỗi tải dữ liệu:",

            error

        );

        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td

                        colspan="8"

                        class="empty-row error-row"

                    >

                        ❌ Lỗi tải dữ liệu:<br>

                        ${escapeHtml(

                            error.message

                        )}

                    </td>

                </tr>

            `;

        }

    }

}

/* ============================================================

   11. LÀM MỚI

============================================================ */

async function handleRefresh() {

    const filterUser =

        document.getElementById(

            "filterUser"

        );

    const filterDate =

        document.getElementById(

            "filterDate"

        );

    if (filterUser) {

        filterUser.value = "";

    }

    if (filterDate) {

        filterDate.value = "";

    }

    currentPage = 1;

    await loadData();

}

/* ============================================================

   12. CIF MỚI NHẤT

============================================================ */

function getLatestRecordsByCIF(

    records

) {

    const map =

        new Map();

    records.forEach(

        (item) => {

            const cif =

                String(

                    item.cif ?? ""

                ).trim();

            if (!cif) {

                const key =

                    "__EMPTY_CIF__" +

                    String(

                        item.id ??

                        Math.random()

                    );

                map.set(

                    key,

                    item

                );

                return;

            }

            const existing =

                map.get(cif);

            if (!existing) {

                map.set(

                    cif,

                    item

                );

                return;

            }

            if (

                isRecordNewer(

                    item,

                    existing

                )

            ) {

                map.set(

                    cif,

                    item

                );

            }

        }

    );

    return Array.from(

        map.values()

    );

}

/* ============================================================

   13. SO SÁNH BẢN GHI

============================================================ */

function isRecordNewer(

    a,

    b

) {

    const dateA =

        parseDateOnly(

            a?.payment_date

        );

    const dateB =

        parseDateOnly(

            b?.payment_date

        );

    if (

        dateA &&

        dateB

    ) {

        if (

            dateA.getTime() !==

            dateB.getTime()

        ) {

            return (

                dateA.getTime() >

                dateB.getTime()

            );

        }

    }

    if (

        dateA &&

        !dateB

    ) {

        return true;

    }

    if (

        !dateA &&

        dateB

    ) {

        return false;

    }

    const createdA =

        parseDateTime(

            a?.created_at

        );

    const createdB =

        parseDateTime(

            b?.created_at

        );

    if (

        createdA &&

        createdB

    ) {

        return (

            createdA.getTime() >

            createdB.getTime()

        );

    }

    return !!createdA;

}

/* ============================================================

   14. LỌC

============================================================ */

function handleFilter() {

    const userKeyword =

        document.getElementById(

            "filterUser"

        )?.value

            .trim()

            .toLowerCase() || "";

    const dateKeyword =

        document.getElementById(

            "filterDate"

        )?.value || "";

    const latestRecords =

        getLatestRecordsByCIF(

            allRecords

        );

    filteredRecords =

        latestRecords.filter(

            (item) => {

                const itemUser =

                    String(

                        item.user_name ??

                        item.user ??

                        ""

                    )

                        .trim()

                        .toLowerCase();

                const matchUser =

                    !userKeyword ||

                    itemUser.includes(

                        userKeyword

                    );

                let matchDate =

                    true;

                if (dateKeyword) {

                    matchDate =

                        formatDateForInput(

                            item.payment_date

                        ) ===

                        dateKeyword;

                }

                return (

                    matchUser &&

                    matchDate

                );

            }

        );

    currentPage = 1;

    updateStats();

    renderTable();

}

/* ============================================================

   15. THỐNG KÊ

============================================================ */

function updateStats() {

    const totalCustomers =

        document.getElementById(

            "totalCustomers"

        );

    const totalAmount =

        document.getElementById(

            "totalAmount"

        );

    if (totalCustomers) {

        totalCustomers.innerText =

            filteredRecords.length

                .toLocaleString(

                    "vi-VN"

                );

    }

    const total =

        filteredRecords.reduce(

            (

                sum,

                item

            ) => {

                return (

                    sum +

                    parseAmount(

                        item.amount

                    )

                );

            },

            0

        );

    if (totalAmount) {

        totalAmount.innerText =

            formatMoney(total);

    }

}

/* ============================================================

   16. HIỂN THỊ BẢNG

============================================================ */

function renderTable() {

    const tableBody =

        document.getElementById(

            "tableBody"

        );

    if (!tableBody) {

        return;

    }

    tableBody.innerHTML = "";

    if (

        filteredRecords.length === 0

    ) {

        tableBody.innerHTML = `

            <tr>

                <td

                    colspan="8"

                    class="empty-row"

                >

                    Không có dữ liệu

                </td>

            </tr>

        `;

        updatePaginationInfo(0);

        return;

    }

    const totalPages =

        Math.ceil(

            filteredRecords.length /

            pageSize

        );

    if (

        currentPage >

        totalPages

    ) {

        currentPage =

            totalPages;

    }

    const startIndex =

        (currentPage - 1) *

        pageSize;

    const pageData =

        filteredRecords.slice(

            startIndex,

            startIndex +

            pageSize

        );

    pageData.forEach(

        (item) => {

            const tr =

                document.createElement(

                    "tr"

                );

            const user =

                item.user_name ??

                item.user ??

                "";

            const cif =

                item.cif ??

                "";

            const customerName =

                item.customer_name ??

                item.customerName ??

                "";

            const amount =

                parseAmount(

                    item.amount

                );

            const paymentDate =

                formatDateVN(

                    item.payment_date

                );

            const phone =

                item.phone ??

                "";

            const note =

                item.note ??

                "";

            tr.innerHTML = `

                <td>

                    ${escapeHtml(user)}

                </td>

                <td>

                    ${escapeHtml(cif)}

                </td>

                <td>

                    <strong>

                        ${escapeHtml(

                            customerName

                        )}

                    </strong>

                </td>

                <td class="amount-cell">

                    ${formatMoney(amount)}

                </td>

                <td>

                    ${escapeHtml(

                        paymentDate

                    )}

                </td>

                <td>

                    ${escapeHtml(phone)}

                </td>

                <td class="note-cell">

                    ${escapeHtml(note)}

                </td>

                <td>

                    <div class="action-buttons">

                        <button

                            type="button"

                            class="edit-btn"

                            onclick="openEditModal('${escapeJs(item.id)}')"

                            title="Sửa"

                        >

                            ✏️

                        </button>

                        <button

                            type="button"

                            class="delete-btn"

                            onclick="deleteRecord('${escapeJs(item.id)}')"

                            title="Xóa"

                        >

                            🗑️

                        </button>

                    </div>

                </td>

            `;

            tableBody.appendChild(

                tr

            );

        }

    );

    updatePaginationInfo(

        totalPages

    );

}

/* ============================================================

   17. PHÂN TRANG

============================================================ */

function changePage(

    direction

) {

    const totalPages =

        Math.ceil(

            filteredRecords.length /

            pageSize

        );

    const newPage =

        currentPage +

        direction;

    if (

        newPage < 1 ||

        newPage > totalPages

    ) {

        return;

    }

    currentPage =

        newPage;

    renderTable();

}

/* ============================================================

   18. THÔNG TIN PHÂN TRANG

============================================================ */

function updatePaginationInfo(

    totalPages

) {

    const pageInfo =

        document.getElementById(

            "pageInfo"

        );

    const prevBtn =

        document.getElementById(

            "prevPageBtn"

        );

    const nextBtn =

        document.getElementById(

            "nextPageBtn"

        );

    if (!totalPages) {

        if (pageInfo) {

            pageInfo.innerText =

                "Trang 0 / 0";

        }

        if (prevBtn) {

            prevBtn.disabled =

                true;

        }

        if (nextBtn) {

            nextBtn.disabled =

                true;

        }

        return;

    }

    if (pageInfo) {

        pageInfo.innerText =

            `Trang ${currentPage} / ${totalPages}`;

    }

    if (prevBtn) {

        prevBtn.disabled =

            currentPage <= 1;

    }

    if (nextBtn) {

        nextBtn.disabled =

            currentPage >=

            totalPages;

    }

}

/* ============================================================

   19. TÌM RECORD

============================================================ */

function findRecordById(

    id

) {

    return allRecords.find(

        (item) =>

            String(item.id) ===

            String(id)

    );

}

/* ============================================================

   20. POPUP SỬA

============================================================ */

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

            class="edit-modal-overlay"

            id="editModalOverlay"

        >

            <div class="edit-modal-box">

                <div class="edit-modal-header">

                    <strong>

                        ✏️ SỬA DỮ LIỆU DỰ THU

                    </strong>

                    <button

                        type="button"

                        id="closeEditModal"

                        class="edit-modal-close"

                    >

                        ✕

                    </button>

                </div>

                <div class="edit-modal-body">

                    <div class="edit-form-grid">

                        <div class="edit-form-group">

                            <label>User</label>

                            <input

                                id="editUser"

                                type="text"

                                autocomplete="off"

                            >

                        </div>

                        <div class="edit-form-group">

                            <label>Số CIF</label>

                            <input

                                id="editCif"

                                type="text"

                                autocomplete="off"

                            >

                        </div>

                        <div class="edit-form-group full">

                            <label>

                                Tên khách hàng

                            </label>

                            <input

                                id="editCustomerName"

                                type="text"

                                autocomplete="off"

                            >

                        </div>

                        <div class="edit-form-group">

                            <label>

                                Số tiền dự thu

                            </label>

                            <input

                                id="editAmount"

                                type="text"

                                inputmode="numeric"

                            >

                        </div>

                        <div class="edit-form-group">

                            <label>

                                Ngày thanh toán

                            </label>

                            <input

                                id="editPaymentDate"

                                type="date"

                            >

                        </div>

                        <div class="edit-form-group">

                            <label>SĐT</label>

                            <input

                                id="editPhone"

                                type="text"

                                inputmode="tel"

                            >

                        </div>

                        <div class="edit-form-group full">

                            <label>Ghi chú</label>

                            <textarea

                                id="editNote"

                                rows="3"

                            ></textarea>

                        </div>

                    </div>

                </div>

                <div class="edit-modal-footer">

                    <button

                        type="button"

                        id="cancelEditBtn"

                        class="modal-cancel-btn"

                    >

                        HỦY

                    </button>

                    <button

                        type="button"

                        id="saveEditBtn"

                        class="modal-save-btn"

                    >

                        💾 LƯU THAY ĐỔI

                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(

        modal

    );

    document

        .getElementById(

            "closeEditModal"

        )

        ?.addEventListener(

            "click",

            closeEditModal

        );

    document

        .getElementById(

            "cancelEditBtn"

        )

        ?.addEventListener(

            "click",

            closeEditModal

        );

    document

        .getElementById(

            "saveEditBtn"

        )

        ?.addEventListener(

            "click",

            saveEditRecord

        );

    document

        .getElementById(

            "editAmount"

        )

        ?.addEventListener(

            "input",

            handleEditAmountInput

        );

    document

        .getElementById(

            "editModalOverlay"

        )

        ?.addEventListener(

            "click",

            (event) => {

                if (

                    event.target.id ===

                    "editModalOverlay"

                ) {

                    closeEditModal();

                }

            }

        );

    document.addEventListener(

        "keydown",

        (event) => {

            if (

                event.key ===

                "Escape"

            ) {

                const modal =

                    document.getElementById(

                        "editModal"

                    );

                if (

                    modal?.classList.contains(

                        "show"

                    )

                ) {

                    closeEditModal();

                }

            }

        }

    );

}

/* ============================================================

   21. MỞ POPUP

============================================================ */

window.openEditModal =

    function (id) {

        createEditModal();

        const record =

            findRecordById(id);

        if (!record) {

            alert(

                "Không tìm thấy dữ liệu cần sửa."

            );

            return;

        }

        editingRowId =

            id;

        document.getElementById(

            "editUser"

        ).value =

            record.user_name ??

            record.user ??

            "";

        document.getElementById(

            "editCif"

        ).value =

            record.cif ??

            "";

        document.getElementById(

            "editCustomerName"

        ).value =

            record.customer_name ??

            record.customerName ??

            "";

        document.getElementById(

            "editAmount"

        ).value =

            formatNumberInput(

                record.amount

            );

        document.getElementById(

            "editPaymentDate"

        ).value =

            formatDateForInput(

                record.payment_date

            );

        document.getElementById(

            "editPhone"

        ).value =

            record.phone ??

            "";

        document.getElementById(

            "editNote"

        ).value =

            record.note ??

            "";

        document

            .getElementById(

                "editModal"

            )

            ?.classList.add(

                "show"

            );

        document.body.classList.add(

            "modal-open"

        );

    };

/* ============================================================

   22. ĐÓNG POPUP

============================================================ */

function closeEditModal() {

    document

        .getElementById(

            "editModal"

        )

        ?.classList.remove(

            "show"

        );

    document.body.classList.remove(

        "modal-open"

    );

    editingRowId =

        null;

}

/* ============================================================

   23. FORMAT INPUT TIỀN

============================================================ */

function handleEditAmountInput(

    event

) {

    const input =

        event.target;

    const raw =

        String(

            input.value || ""

        )

            .replace(

                /\D/g,

                ""

            );

    if (!raw) {

        input.value = "";

        return;

    }

    input.value =

        Number(raw)

            .toLocaleString(

                "vi-VN"

            );

}

/* ============================================================

   24. LƯU SỬA

============================================================ */

async function saveEditRecord() {

    if (!editingRowId) {

        return;

    }

    const user =

        document.getElementById(

            "editUser"

        )?.value.trim() || "";

    const cif =

        document.getElementById(

            "editCif"

        )?.value.trim() || "";

    const customerName =

        document.getElementById(

            "editCustomerName"

        )?.value.trim() || "";

    const amount =

        parseAmount(

            document.getElementById(

                "editAmount"

            )?.value

        );

    const paymentDate =

        document.getElementById(

            "editPaymentDate"

        )?.value || null;

    const phone =

        document.getElementById(

            "editPhone"

        )?.value.trim() || "";

    const note =

        document.getElementById(

            "editNote"

        )?.value.trim() || "";

    if (!user) {

        alert(

            "Vui lòng nhập User."

        );

        return;

    }

    if (!cif) {

        alert(

            "Vui lòng nhập số CIF."

        );

        return;

    }

    if (!customerName) {

        alert(

            "Vui lòng nhập tên khách hàng."

        );

        return;

    }

    if (

        amount <= 0

    ) {

        alert(

            "Vui lòng nhập số tiền dự thu."

        );

        return;

    }

    if (!paymentDate) {

        alert(

            "Vui lòng chọn ngày thanh toán."

        );

        return;

    }

    const saveBtn =

        document.getElementById(

            "saveEditBtn"

        );

    if (saveBtn) {

        saveBtn.disabled = true;

        saveBtn.innerText =

            "⏳ ĐANG LƯU...";

    }

    try {

        const {

            error

        } =

            await supabaseClient

                .from("du_thu")

                .update({

                    user_name:

                        user,

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

                    editingRowId

                );

        if (error) {

            throw error;

        }

        closeEditModal();

        alert(

            "✅ Đã lưu thay đổi!"

        );

        await loadData();

    } catch (error) {

        console.error(

            "Lỗi sửa:",

            error

        );

        alert(

            "❌ Không thể lưu:\n\n" +

            error.message

        );

    } finally {

        if (saveBtn) {

            saveBtn.disabled = false;

            saveBtn.innerText =

                "💾 LƯU THAY ĐỔI";

        }

    }

}

/* ============================================================

   25. XÓA 1 RECORD

============================================================ */

window.deleteRecord =

    async function (id) {

        const record =

            findRecordById(id);

        const name =

            record?.customer_name ||

            "";

        if (

            !confirm(

                "Bạn có chắc muốn xóa bản ghi này?" +

                (

                    name

                        ? `\n\nKhách hàng: ${name}`

                        : ""

                )

            )

        ) {

            return;

        }

        try {

            const {

                error

            } =

                await supabaseClient

                    .from("du_thu")

                    .delete()

                    .eq(

                        "id",

                        id

                    );

            if (error) {

                throw error;

            }

            await loadData();

            alert(

                "✅ Đã xóa thành công!"

            );

        } catch (error) {

            alert(

                "❌ Lỗi khi xóa:\n\n" +

                error.message

            );

        }

    };

/* ============================================================

   26. XÓA TẤT CẢ

============================================================ */

async function handleDeleteAll() {

    if (

        !allRecords.length

    ) {

        alert(

            "Hiện không có dữ liệu để xóa."

        );

        return;

    }

    if (

        !confirm(

            "⚠️ Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu?"

        )

    ) {

        return;

    }

    if (

        !confirm(

            "⚠️ XÁC NHẬN LẦN 2\n\nThao tác này không thể hoàn tác."

        )

    ) {

        return;

    }

    const btn =

        document.getElementById(

            "deleteAllBtn"

        );

    if (btn) {

        btn.disabled = true;

        btn.innerText =

            "⏳ ĐANG XÓA...";

    }

    try {

        const {

            error

        } =

            await supabaseClient

                .from("du_thu")

                .delete()

                .neq(

                    "id",

                    "00000000-0000-0000-0000-000000000000"

                );

        if (error) {

            throw error;

        }

        allRecords = [];

        filteredRecords = [];

        currentPage = 1;

        updateStats();

        renderTable();

        alert(

            "✅ Đã xóa toàn bộ dữ liệu!"

        );

    } catch (error) {

        alert(

            "❌ Lỗi xóa toàn bộ:\n\n" +

            error.message

        );

    } finally {

        if (btn) {

            btn.disabled = false;

            btn.innerText =

                "🗑️ XÓA TẤT CẢ";

        }

    }

}

/* ============================================================

   27. XUẤT EXCEL

============================================================ */

function exportToExcel() {

    if (

        !filteredRecords.length

    ) {

        alert(

            "Không có dữ liệu để xuất Excel."

        );

        return;

    }

    if (

        typeof XLSX ===

        "undefined"

    ) {

        alert(

            "Thư viện Excel chưa sẵn sàng."

        );

        return;

    }

    try {

        const exportData =

            filteredRecords.map(

                (item) => ({

                    "User":

                        item.user_name ??

                        item.user ??

                        "",

                    "Số CIF":

                        item.cif ??

                        "",

                    "Tên Khách Hàng":

                        item.customer_name ??

                        item.customerName ??

                        "",

                    "Số Tiền Dự Thu":

                        parseAmount(

                            item.amount

                        ),

                    "Ngày Thanh Toán":

                        formatDateVN(

                            item.payment_date

                        ),

                    "Số Điện Thoại":

                        item.phone ??

                        "",

                    "Ghi Chú":

                        item.note ??

                        ""

                })

            );

        const wsData =

            XLSX.utils.json_to_sheet(

                exportData

            );

        const totalAmount =

            filteredRecords.reduce(

                (

                    sum,

                    item

                ) =>

                    sum +

                    parseAmount(

                        item.amount

                    ),

                0

            );

        const totalUser =

            new Set(

                filteredRecords

                    .map(

                        item =>

                            String(

                                item.user_name ??

                                item.user ??

                                ""

                            ).trim()

                    )

                    .filter(Boolean)

            ).size;

        const filterUser =

            document.getElementById(

                "filterUser"

            )?.value.trim() ||

            "Tất cả";

        const filterDate =

            document.getElementById(

                "filterDate"

            )?.value ||

            "Tất cả";

        const overviewData = [

            [

                "BÁO CÁO DỰ THU"

            ],

            [],

            [

                "Nội dung",

                "Giá trị"

            ],

            [

                "Tổng khách hàng",

                filteredRecords.length

            ],

            [

                "Tổng dự thu",

                totalAmount

            ],

            [

                "Số User",

                totalUser

            ],

            [

                "Lọc theo User",

                filterUser

            ],

            [

                "Lọc theo ngày thanh toán",

                filterDate ===

                "Tất cả"

                    ? "Tất cả"

                    : formatDateVN(

                        filterDate

                    )

            ],

            [

                "Thời gian xuất",

                new Date()

                    .toLocaleString(

                        "vi-VN"

                    )

            ]

        ];

        const wsOverview =

            XLSX.utils.aoa_to_sheet(

                overviewData

            );

        wsData["!cols"] = [

            { wch: 18 },

            { wch: 15 },

            { wch: 28 },

            { wch: 20 },

            { wch: 18 },

            { wch: 18 },

            { wch: 35 }

        ];

        wsOverview["!cols"] = [

            { wch: 32 },

            { wch: 38 }

        ];

        const headerCells = [

            "A1",

            "B1",

            "C1",

            "D1",

            "E1",

            "F1",

            "G1"

        ];

        headerCells.forEach(

            cell => {

                if (

                    wsData[cell]

                ) {

                    wsData[cell].s = {

                        font: {

                            bold: true

                        },

                        alignment: {

                            horizontal:

                                "center"

                        }

                    };

                }

            }

        );

        for (

            let row = 2;

            row <=

            filteredRecords.length + 1;

            row++

        ) {

            const cell =

                wsData[

                    `D${row}`

                ];

            if (cell) {

                cell.t = "n";

                cell.z =

                    '#,##0" ₫"';

            }

        }

        if (

            wsOverview["A1"]

        ) {

            wsOverview["A1"].s = {

                font: {

                    bold: true,

                    sz: 16

                }

            };

        }

        if (

            wsOverview["B5"]

        ) {

            wsOverview["B5"].t =

                "n";

            wsOverview["B5"].z =

                '#,##0" ₫"';

        }

        const workbook =

            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(

            workbook,

            wsData,

            "Dự Thu"

        );

        XLSX.utils.book_append_sheet(

            workbook,

            wsOverview,

            "Tổng Quan"

        );

        const now =

            new Date();

        const filename =

            `Bao_Cao_Du_Thu_${String(

                now.getDate()

            ).padStart(2, "0")}-${String(

                now.getMonth() + 1

            ).padStart(2, "0")}-${now.getFullYear()}.xlsx`;

        XLSX.writeFile(

            workbook,

            filename

        );

    } catch (error) {

        console.error(

            "Lỗi Excel:",

            error

        );

        alert(

            "❌ Không thể xuất Excel:\n\n" +

            error.message

        );

    }

}

/* ============================================================

   28. SỐ TIỀN

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

        typeof value ===

        "number"

    ) {

        return Number.isFinite(

            value

        )

            ? value

            : 0;

    }

    const number =

        Number(

            String(value)

                .replace(

                    /[^\d-]/g,

                    ""

                )

        );

    return Number.isFinite(

        number

    )

        ? number

        : 0;

}

function formatMoney(

    value

) {

    return (

        parseAmount(value)

            .toLocaleString(

                "vi-VN"

            ) +

        " đ"

    );

}

function formatNumberInput(

    value

) {

    const number =

        parseAmount(value);

    return number

        ? number.toLocaleString(

            "vi-VN"

        )

        : "";

}

/* ============================================================

   29. NGÀY

============================================================ */

function parseDateOnly(

    value

) {

    if (!value) {

        return null;

    }

    const str =

        String(value);

    const match =

        str.match(

            /^(\d{4})-(\d{2})-(\d{2})/

        );

    if (match) {

        return new Date(

            Number(match[1]),

            Number(match[2]) - 1,

            Number(match[3])

        );

    }

    const vnMatch =

        str.match(

            /^(\d{2})\/(\d{2})\/(\d{4})$/

        );

    if (vnMatch) {

        return new Date(

            Number(vnMatch[3]),

            Number(vnMatch[2]) - 1,

            Number(vnMatch[1])

        );

    }

    const parsed =

        new Date(value);

    if (

        Number.isNaN(

            parsed.getTime()

        )

    ) {

        return null;

    }

    return new Date(

        parsed.getFullYear(),

        parsed.getMonth(),

        parsed.getDate()

    );

}

function parseDateTime(

    value

) {

    if (!value) {

        return null;

    }

    const date =

        new Date(value);

    return Number.isNaN(

        date.getTime()

    )

        ? null

        : date;

}

function formatDateForInput(

    value

) {

    const date =

        parseDateOnly(value);

    if (!date) {

        return "";

    }

    return (

        `${date.getFullYear()}-` +

        `${String(

            date.getMonth() + 1

        ).padStart(2, "0")}-` +

        `${String(

            date.getDate()

        ).padStart(2, "0")}`

    );

}

function formatDateVN(

    value

) {

    const date =

        parseDateOnly(value);

    if (!date) {

        return "";

    }

    return (

        `${String(

            date.getDate()

        ).padStart(2, "0")}/` +

        `${String(

            date.getMonth() + 1

        ).padStart(2, "0")}/` +

        `${date.getFullYear()}`

    );

}

/* ============================================================

   30. HIỂN THỊ LỖI ĐĂNG NHẬP

============================================================ */

function showLoginError(

    message

) {

    const box =

        document.getElementById(

            "loginError"

        );

    if (box) {

        box.innerText =

            message || "";

        box.style.display =

            message

                ? "block"

                : "none";

    }

}

function clearLoginError() {

    showLoginError("");

}

function getLoginErrorMessage(

    error

) {

    const message =

        String(

            error?.message || ""

        );

    if (

        message

            .toLowerCase()

            .includes(

                "invalid login credentials"

            )

    ) {

        return (

            "Gmail hoặc mật khẩu không đúng."

        );

    }

    if (

        message

            .toLowerCase()

            .includes(

                "email not confirmed"

            )

    ) {

        return (

            "Tài khoản Gmail chưa được xác nhận trong Supabase."

        );

    }

    return message ||

        "Đăng nhập thất bại.";

}

/* ============================================================

   31. ESCAPE HTML

============================================================ */

function escapeHtml(

    value

) {

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

function escapeJs(

    value

) {

    return String(

        value ?? ""

    )

        .replace(

            /\\/g,

            "\\\\"

        )

        .replace(

            /'/g,

            "\\'"

        )

        .replace(

            /"/g,

            '\\"'

        );

}

/* ============================================================

   32. TẠO POPUP

============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        createEditModal();

    }

);
