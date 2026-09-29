"use strict";

/* ============================================================

   QUẢN LÝ DỰ THU - MANAGER.JS

   ============================================================

   - Supabase Auth

   - Đúng config.js:

       window.SUPABASE_URL

       window.SUPABASE_ANON_KEY

   - Bảng Supabase: du_thu

   - Lọc User

   - Lọc ngày thanh toán

   - Làm mới

   - Sửa bằng POPUP

   - Xóa từng bản ghi

   - Xóa toàn bộ

   - Phân trang 20 dòng

   - CIF trùng: lấy bản ghi mới nhất

   - Thống kê khách hàng duy nhất

   - Xuất Excel 2 sheet

   - Không có STT

   - Không reset theo tháng

============================================================ */

/* ============================================================

   1. BIẾN TOÀN CỤC

============================================================ */

let supabaseClient = null;

let allRecords = [];

let filteredRecords = [];

let currentPage = 1;

const pageSize = 20;

let editingRowId = null;

/* ============================================================

   2. KHỞI ĐỘNG

============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    initApp();

});

async function initApp() {

    try {

        /* ----------------------------------------------------

           KIỂM TRA THƯ VIỆN SUPABASE

        ---------------------------------------------------- */

        if (!window.supabase) {

            throw new Error(

                "Thư viện Supabase chưa được tải."

            );

        }

        /* ----------------------------------------------------

           KIỂM TRA CONFIG.JS

           config.js của bạn dùng:

           window.SUPABASE_URL

           window.SUPABASE_ANON_KEY

        ---------------------------------------------------- */

        if (

            !window.SUPABASE_URL ||

            !window.SUPABASE_ANON_KEY

        ) {

            throw new Error(

                "Không tìm thấy SUPABASE_URL hoặc SUPABASE_ANON_KEY trong config.js."

            );

        }

        /* ----------------------------------------------------

           TẠO KẾT NỐI SUPABASE

        ---------------------------------------------------- */

        supabaseClient =

            window.supabase.createClient(

                window.SUPABASE_URL,

                window.SUPABASE_ANON_KEY

            );

        console.log(

            "✅ Supabase đã kết nối."

        );

        /* ----------------------------------------------------

           GẮN CÁC NÚT

        ---------------------------------------------------- */

        setupEventListeners();

        /* ----------------------------------------------------

           KIỂM TRA ĐĂNG NHẬP

        ---------------------------------------------------- */

        await checkAuthAndLoad();

    } catch (error) {

        console.error(

            "❌ Lỗi khởi động:",

            error

        );

        alert(

            "LỖI HỆ THỐNG\n\n" +

            error.message

        );

    }

}

/* ============================================================

   3. GẮN SỰ KIỆN

============================================================ */

function setupEventListeners() {

    const logoutBtn =

        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener(

            "click",

            handleLogout

        );

    }

    const filterBtn =

        document.getElementById("filterBtn");

    if (filterBtn) {

        filterBtn.addEventListener(

            "click",

            handleFilter

        );

    }

    const refreshBtn =

        document.getElementById("refreshBtn");

    if (refreshBtn) {

        refreshBtn.addEventListener(

            "click",

            handleRefresh

        );

    }

    const exportBtn =

        document.getElementById("exportBtn");

    if (exportBtn) {

        exportBtn.addEventListener(

            "click",

            exportToExcel

        );

    }

    const deleteAllBtn =

        document.getElementById("deleteAllBtn");

    if (deleteAllBtn) {

        deleteAllBtn.addEventListener(

            "click",

            handleDeleteAll

        );

    }

    const prevPageBtn =

        document.getElementById("prevPageBtn");

    if (prevPageBtn) {

        prevPageBtn.addEventListener(

            "click",

            () => changePage(-1)

        );

    }

    const nextPageBtn =

        document.getElementById("nextPageBtn");

    if (nextPageBtn) {

        nextPageBtn.addEventListener(

            "click",

            () => changePage(1)

        );

    }

    /* ----------------------------------------------------

       ENTER Ở Ô USER

    ---------------------------------------------------- */

    const filterUser =

        document.getElementById("filterUser");

    if (filterUser) {

        filterUser.addEventListener(

            "keydown",

            (event) => {

                if (event.key === "Enter") {

                    handleFilter();

                }

            }

        );

    }

    /* ----------------------------------------------------

       ENTER Ở Ô NGÀY

    ---------------------------------------------------- */

    const filterDate =

        document.getElementById("filterDate");

    if (filterDate) {

        filterDate.addEventListener(

            "keydown",

            (event) => {

                if (event.key === "Enter") {

                    handleFilter();

                }

            }

        );

    }

}

/* ============================================================

   4. KIỂM TRA ĐĂNG NHẬP

============================================================ */

async function checkAuthAndLoad() {

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

            !data ||

            !data.session

        ) {

            window.location.href =

                "index.html";

            return;

        }

        await loadData();

    } catch (error) {

        console.error(

            "❌ Lỗi xác thực:",

            error

        );

        window.location.href =

            "index.html";

    }

}

/* ============================================================

   5. ĐĂNG XUẤT

============================================================ */

async function handleLogout(event) {

    if (event) {

        event.preventDefault();

    }

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

        if (supabaseClient) {

            await supabaseClient.auth.signOut();

        }

    } catch (error) {

        console.warn(

            "Lỗi Supabase khi đăng xuất:",

            error

        );

    } finally {

        try {

            sessionStorage.clear();

        } catch (error) {}

        window.location.href =

            "index.html";

    }

}

/* ============================================================

   6. TẢI DỮ LIỆU

============================================================ */

async function loadData() {

    const tableBody =

        document.getElementById(

            "tableBody"

        );

    if (tableBody) {

        tableBody.innerHTML = `

            <tr>

                <td colspan="8" class="empty-row">

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

            "❌ Lỗi tải dữ liệu:",

            error

        );

        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td

                        colspan="8"

                        class="empty-row"

                        style="color:#dc2626;"

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

   7. LÀM MỚI

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

   8. LẤY BẢN GHI MỚI NHẤT THEO CIF

============================================================ */

function getLatestRecordsByCIF(records) {

    const map =

        new Map();

    records.forEach(

        (item) => {

            const cif =

                String(

                    item.cif ?? ""

                ).trim();

            /* ------------------------------------------------

               CIF TRỐNG

            ------------------------------------------------ */

            if (!cif) {

                const uniqueKey =

                    "__EMPTY_CIF__" +

                    String(

                        item.id ??

                        Math.random()

                    );

                map.set(

                    uniqueKey,

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

   9. SO SÁNH BẢN GHI

============================================================ */

function isRecordNewer(a, b) {

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

    if (

        createdA &&

        !createdB

    ) {

        return true;

    }

    return false;

}

/* ============================================================

   10. LỌC DỮ LIỆU

============================================================ */

function handleFilter() {

    const filterUser =

        document.getElementById(

            "filterUser"

        );

    const filterDate =

        document.getElementById(

            "filterDate"

        );

    const userKeyword =

        filterUser

            ? filterUser.value

                .trim()

                .toLowerCase()

            : "";

    const dateKeyword =

        filterDate

            ? filterDate.value

            : "";

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

                    const itemDate =

                        formatDateForInput(

                            item.payment_date

                        );

                    matchDate =

                        itemDate ===

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

   11. THỐNG KÊ

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

    let total = 0;

    filteredRecords.forEach(

        (item) => {

            total +=

                parseAmount(

                    item.amount

                );

        }

    );

    if (totalAmount) {

        totalAmount.innerText =

            formatMoney(total);

    }

}

/* ============================================================

   12. HIỂN THỊ BẢNG

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

    if (

        currentPage < 1

    ) {

        currentPage = 1;

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

                    ${formatMoney(

                        amount

                    )}

                </td>

                <td>

                    ${escapeHtml(

                        paymentDate

                    )}

                </td>

                <td>

                    ${escapeHtml(

                        phone

                    )}

                </td>

                <td class="note-cell">

                    ${escapeHtml(

                        note

                    )}

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

   13. PHÂN TRANG

============================================================ */

function changePage(direction) {

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

    const tableWrap =

        document.querySelector(

            ".table-wrap"

        );

    if (tableWrap) {

        tableWrap.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }

}

/* ============================================================

   14. HIỂN THỊ SỐ TRANG

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

    if (

        totalPages === 0

    ) {

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

   15. TÌM BẢN GHI THEO ID

============================================================ */

function findRecordById(id) {

    return allRecords.find(

        (item) =>

            String(item.id) ===

            String(id)

    );

}

/* ============================================================

   16. TẠO POPUP SỬA

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

                    <div>

                        ✏️ SỬA DỮ LIỆU DỰ THU

                    </div>

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

                            <label>

                                User

                            </label>

                            <input

                                id="editUser"

                                type="text"

                                autocomplete="off"

                            >

                        </div>

                        <div class="edit-form-group">

                            <label>

                                Số CIF

                            </label>

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

                                autocomplete="off"

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

                            <label>

                                SĐT

                            </label>

                            <input

                                id="editPhone"

                                type="text"

                                inputmode="tel"

                                autocomplete="off"

                            >

                        </div>

                        <div class="edit-form-group full">

                            <label>

                                Ghi chú

                            </label>

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

                    modal &&

                    modal.classList.contains(

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

   17. MỞ POPUP SỬA

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

        const modal =

            document.getElementById(

                "editModal"

            );

        if (modal) {

            modal.classList.add(

                "show"

            );

            document.body.classList.add(

                "modal-open"

            );

        }

    };

/* ============================================================

   18. ĐÓNG POPUP

============================================================ */

function closeEditModal() {

    const modal =

        document.getElementById(

            "editModal"

        );

    if (modal) {

        modal.classList.remove(

            "show"

        );

    }

    document.body.classList.remove(

        "modal-open"

    );

    editingRowId =

        null;

}

/* ============================================================

   19. FORMAT SỐ TIỀN TRONG POPUP

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

    const number =

        Number(raw);

    input.value =

        number.toLocaleString(

            "vi-VN"

        );

}

/* ============================================================

   20. LƯU DỮ LIỆU SỬA

============================================================ */

async function saveEditRecord() {

    if (!editingRowId) {

        alert(

            "Không xác định được bản ghi cần sửa."

        );

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

    const amountRaw =

        document.getElementById(

            "editAmount"

        )?.value || "";

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

    const amount =

        parseAmount(

            amountRaw

        );

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

        !amount ||

        amount < 0

    ) {

        alert(

            "Vui lòng nhập số tiền dự thu hợp lệ."

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

        const updateData = {

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

        };

        const {

            error

        } =

            await supabaseClient

                .from("du_thu")

                .update(

                    updateData

                )

                .eq(

                    "id",

                    editingRowId

                );

        if (error) {

            throw error;

        }

        alert(

            "✅ Đã lưu thay đổi thành công!"

        );

        closeEditModal();

        await loadData();

    } catch (error) {

        console.error(

            "❌ Lỗi cập nhật:",

            error

        );

        alert(

            "❌ Lỗi khi lưu dữ liệu:\n\n" +

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

   21. XÓA 1 BẢN GHI

============================================================ */

window.deleteRecord =

    async function (id) {

        const record =

            findRecordById(id);

        const customerName =

            record?.customer_name ??

            record?.customerName ??

            "";

        const confirmed =

            confirm(

                "Bạn có chắc chắn muốn xóa bản ghi này?" +

                (

                    customerName

                        ? `\n\nKhách hàng: ${customerName}`

                        : ""

                )

            );

        if (!confirmed) {

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

            alert(

                "✅ Đã xóa bản ghi thành công!"

            );

            await loadData();

        } catch (error) {

            console.error(

                "❌ Lỗi xóa:",

                error

            );

            alert(

                "❌ Lỗi khi xóa:\n\n" +

                error.message

            );

        }

    };

/* ============================================================

   22. XÓA TOÀN BỘ

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

    const confirm1 =

        confirm(

            "⚠️ CẢNH BÁO\n\n" +

            "Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu DỰ THU không?"

        );

    if (!confirm1) {

        return;

    }

    const confirm2 =

        confirm(

            "⚠️ XÁC NHẬN LẦN 2\n\n" +

            "Toàn bộ dữ liệu hiện tại sẽ bị xóa khỏi hệ thống.\n\n" +

            "Thao tác này không thể hoàn tác.\n\n" +

            "Bạn có chắc chắn muốn tiếp tục?"

        );

    if (!confirm2) {

        return;

    }

    const deleteBtn =

        document.getElementById(

            "deleteAllBtn"

        );

    if (deleteBtn) {

        deleteBtn.disabled = true;

        deleteBtn.innerText =

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

        alert(

            "✅ Đã xóa toàn bộ dữ liệu Dự Thu!"

        );

        allRecords = [];

        filteredRecords = [];

        currentPage = 1;

        updateStats();

        renderTable();

    } catch (error) {

        console.error(

            "❌ Lỗi xóa toàn bộ:",

            error

        );

        alert(

            "❌ Lỗi khi xóa toàn bộ dữ liệu:\n\n" +

            error.message

        );

    } finally {

        if (deleteBtn) {

            deleteBtn.disabled = false;

            deleteBtn.innerText =

                "🗑️ XÓA TẤT CẢ";

        }

    }

}

/* ============================================================

   23. XUẤT EXCEL

============================================================ */

function exportToExcel() {

    if (

        !filteredRecords ||

        filteredRecords.length === 0

    ) {

        alert(

            "Không có dữ liệu để xuất Excel!"

        );

        return;

    }

    if (

        typeof XLSX ===

        "undefined"

    ) {

        alert(

            "Thư viện Excel chưa sẵn sàng.\n\n" +

            "Vui lòng chờ vài giây rồi thử lại."

        );

        return;

    }

    try {

        /* ----------------------------------------------------

           SHEET 1 - DỰ THU

        ---------------------------------------------------- */

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

        /* ----------------------------------------------------

           TỔNG QUAN

        ---------------------------------------------------- */

        const totalCustomer =

            filteredRecords.length;

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

                        (item) =>

                            String(

                                item.user_name ??

                                item.user ??

                                ""

                            ).trim()

                    )

                    .filter(

                        Boolean

                    )

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

                totalCustomer

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

        /* ----------------------------------------------------

           ĐỘ RỘNG CỘT

        ---------------------------------------------------- */

        wsData["!cols"] = [

            {

                wch: 18

            },

            {

                wch: 15

            },

            {

                wch: 28

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

                wch: 35

            }

        ];

        wsOverview["!cols"] = [

            {

                wch: 32

            },

            {

                wch: 38

            }

        ];

        /* ----------------------------------------------------

           STYLE HEADER SHEET DỰ THU

        ---------------------------------------------------- */

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

            (cell) => {

                if (

                    wsData[cell]

                ) {

                    wsData[cell].s = {

                        font: {

                            bold: true

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

        );

        /* ----------------------------------------------------

           FORMAT TIỀN

        ---------------------------------------------------- */

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

        /* ----------------------------------------------------

           STYLE SHEET TỔNG QUAN

        ---------------------------------------------------- */

        if (

            wsOverview["A1"]

        ) {

            wsOverview["A1"].s = {

                font: {

                    bold: true,

                    sz: 16

                },

                alignment: {

                    horizontal:

                        "center"

                }

            };

        }

        if (

            wsOverview["A3"]

        ) {

            wsOverview["A3"].s = {

                font: {

                    bold: true

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

        /* ----------------------------------------------------

           TẠO WORKBOOK

        ---------------------------------------------------- */

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

        /* ----------------------------------------------------

           TÊN FILE

        ---------------------------------------------------- */

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

            `Bao_Cao_Du_Thu_${day}-${month}-${year}.xlsx`;

        /* ----------------------------------------------------

           TẢI FILE

        ---------------------------------------------------- */

        XLSX.writeFile(

            workbook,

            fileName

        );

    } catch (error) {

        console.error(

            "❌ Lỗi xuất Excel:",

            error

        );

        alert(

            "❌ Không thể xuất Excel:\n\n" +

            error.message

        );

    }

}

/* ============================================================

   24. XỬ LÝ SỐ TIỀN

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

    const cleaned =

        String(value)

            .replace(

                /[^\d-]/g,

                ""

            );

    const number =

        Number(

            cleaned

        );

    return Number.isFinite(

        number

    )

        ? number

        : 0;

}

/* ============================================================

   25. FORMAT TIỀN

============================================================ */

function formatMoney(value) {

    return (

        parseAmount(

            value

        )

            .toLocaleString(

                "vi-VN"

            ) +

        " đ"

    );

}

/* ============================================================

   26. FORMAT SỐ TIỀN TRONG INPUT

============================================================ */

function formatNumberInput(value) {

    const number =

        parseAmount(

            value

        );

    if (!number) {

        return "";

    }

    return number.toLocaleString(

        "vi-VN"

    );

}

/* ============================================================

   27. PARSE NGÀY

============================================================ */

function parseDateOnly(value) {

    if (!value) {

        return null;

    }

    const str =

        String(value);

    /* --------------------------------------------------------

       YYYY-MM-DD

    -------------------------------------------------------- */

    const match =

        str.match(

            /^(\d{4})-(\d{2})-(\d{2})/

        );

    if (match) {

        return new Date(

            Number(

                match[1]

            ),

            Number(

                match[2]

            ) - 1,

            Number(

                match[3]

            )

        );

    }

    /* --------------------------------------------------------

       DD/MM/YYYY

    -------------------------------------------------------- */

    const vnMatch =

        str.match(

            /^(\d{2})\/(\d{2})\/(\d{4})$/

        );

    if (vnMatch) {

        return new Date(

            Number(

                vnMatch[3]

            ),

            Number(

                vnMatch[2]

            ) - 1,

            Number(

                vnMatch[1]

            )

        );

    }

    /* --------------------------------------------------------

       TRƯỜNG HỢP KHÁC

    -------------------------------------------------------- */

    const parsed =

        new Date(

            value

        );

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

/* ============================================================

   28. PARSE NGÀY GIỜ

============================================================ */

function parseDateTime(value) {

    if (!value) {

        return null;

    }

    const date =

        new Date(

            value

        );

    if (

        Number.isNaN(

            date.getTime()

        )

    ) {

        return null;

    }

    return date;

}

/* ============================================================

   29. ĐỔI NGÀY SANG YYYY-MM-DD

============================================================ */

function formatDateForInput(value) {

    const date =

        parseDateOnly(

            value

        );

    if (!date) {

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

    return `${year}-${month}-${day}`;

}

/* ============================================================

   30. ĐỔI NGÀY SANG DD/MM/YYYY

============================================================ */

function formatDateVN(value) {

    const date =

        parseDateOnly(

            value

        );

    if (!date) {

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

    return `${day}/${month}/${year}`;

}

/* ============================================================

   31. ESCAPE HTML

============================================================ */

function escapeHtml(value) {

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

   32. ESCAPE JAVASCRIPT

============================================================ */

function escapeJs(value) {

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

   33. TẠO POPUP NGAY KHI TRANG LOAD

============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        createEditModal();

    }

);
