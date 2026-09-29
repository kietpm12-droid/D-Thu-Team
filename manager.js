// Khai báo biến toàn cục
let supabaseClient = null;
let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const pageSize = 10;

// Khởi chạy khi DOM và các thư viện CDN đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // 1. Khởi tạo Supabase client từ thư viện CDN và file config.js
    if (window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_KEY !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("Chưa cấu hình Supabase hoặc thiếu file config.js");
        alert("Lỗi kết nối hệ thống: Thiếu thông tin cấu hình Supabase.");
        return;
    }

    // 2. Gán sự kiện cho các nút bấm trên giao diện
    setupEventListeners();

    // 3. Kiểm tra trạng thái đăng nhập & Tải dữ liệu
    await checkAuthAndLoad();
}

// Gán sự kiện nút bấm theo đúng các ID trong HTML
function setupEventListeners() {
    // Nút Đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = handleLogout;
    }

    // Nút Lọc dữ liệu
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.onclick = handleFilter;
    }

    // Nút Làm mới
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            const filterUser = document.getElementById('filterUser');
            const filterDate = document.getElementById('filterDate');
            if (filterUser) filterUser.value = '';
            if (filterDate) filterDate.value = '';
            loadData();
        };
    }

    // Nút Xuất Excel
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.onclick = exportToExcel;
    }

    // Nút Xóa tất cả
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.onclick = handleDeleteAll;
    }

    // Nút Phân trang
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (prevPageBtn) prevPageBtn.onclick = () => changePage(-1);
    if (nextPageBtn) nextPageBtn.onclick = () => changePage(1);
}

// Kiểm tra xác thực Supabase & Chuyển hướng nếu chưa đăng nhập
async function checkAuthAndLoad() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error || !session) {
            window.location.href = 'index.html';
            return;
        }
        loadData();
    } catch (err) {
        console.error("Lỗi xác thực:", err);
        window.location.href = 'index.html';
    }
}

// Chức năng Đăng xuất (Chống kẹt / Chống lỗi 404 Vercel)
async function handleLogout(e) {
    if (e) e.preventDefault();

    if (!confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.innerText = "⏳ Đang đăng xuất...";
        logoutBtn.disabled = true;
    }

    // Xóa bộ nhớ tạm và quay lại trang đăng nhập chính (index.html)
    const redirectToLogin = () => {
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch (err) {
            console.error(err);
        }
        window.location.href = 'index.html';
    };

    try {
        if (supabaseClient && supabaseClient.auth) {
            // Giới hạn thời gian chờ SignOut trong 1.5s để tránh treo màn hình
            const signOutPromise = supabaseClient.auth.signOut();
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
            await Promise.race([signOutPromise, timeoutPromise]);
        }
    } catch (error) {
        console.warn("Lỗi API Supabase khi đăng xuất:", error);
    } finally {
        redirectToLogin();
    }
}

// Tải dữ liệu từ bảng 'records' trong Supabase
async function loadData() {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Đang tải dữ liệu...</td></tr>`;
    }

    try {
        const { data, error } = await supabaseClient
            .from('records')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allRecords = data || [];
        filteredRecords = [...allRecords];
        currentPage = 1;

        updateStats();
        renderTable();
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
        }
    }
}

// Cập nhật 2 thẻ Thống kê (Tổng khách hàng & Tổng dự thu)
function updateStats() {
    const totalCustomers = document.getElementById('totalCustomers');
    const totalAmount = document.getElementById('totalAmount');

    if (totalCustomers) {
        totalCustomers.innerText = filteredRecords.length;
    }

    if (totalAmount) {
        const sum = filteredRecords.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
        totalAmount.innerText = sum.toLocaleString('vi-VN') + ' đ';
    }
}

// Lọc dữ liệu theo User và Ngày thanh toán
function handleFilter() {
    const userKeyword = document.getElementById('filterUser')?.value.toLowerCase().trim() || '';
    const dateKeyword = document.getElementById('filterDate')?.value || '';

    filteredRecords = allRecords.filter(item => {
        const matchUser = !userKeyword || 
            (item.user_name && item.user_name.toLowerCase().includes(userKeyword)) || 
            (item.user && item.user.toLowerCase().includes(userKeyword));
        
        let matchDate = true;
        if (dateKeyword && item.payment_date) {
            const formattedItemDate = new Date(item.payment_date).toISOString().split('T')[0];
            matchDate = (formattedItemDate === dateKeyword);
        }

        return matchUser && matchDate;
    });

    currentPage = 1;
    updateStats();
    renderTable();
}

// Render bảng dữ liệu kèm phân trang
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-row" style="text-align:center;">Không có dữ liệu</td></tr>`;
        updatePaginationInfo(0);
        return;
    }

    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const startIdx = (currentPage - 1) * pageSize;
    const pageData = filteredRecords.slice(startIdx, startIdx + pageSize);

    pageData.forEach(item => {
        const tr = document.createElement('tr');
        
        const amountFormatted = (Number(item.amount) || 0).toLocaleString('vi-VN') + ' đ';
        const dateFormatted = item.payment_date ? new Date(item.payment_date).toLocaleDateString('vi-VN') : 'N/A';

        tr.innerHTML = `
            <td>${item.user_name || item.user || 'N/A'}</td>
            <td>${item.cif || 'N/A'}</td>
            <td><strong>${item.customer_name || item.customerName || 'N/A'}</strong></td>
            <td style="color: #2e7d32; font-weight: bold;">${amountFormatted}</td>
            <td>${dateFormatted}</td>
            <td>${item.phone || 'N/A'}</td>
            <td>${item.note || ''}</td>
            <td>
                <button type="button" class="btn-action btn-delete" onclick="deleteRecord('${item.id}')">🗑️ Xóa</button>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    updatePaginationInfo(totalPages);
}

// Cập nhật giao diện thanh Phân trang
function updatePaginationInfo(totalPages) {
    const pageInfo = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    if (pageInfo) pageInfo.innerText = `Trang ${totalPages === 0 ? 0 : currentPage} / ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = (currentPage <= 1);
    if (nextPageBtn) nextPageBtn.disabled = (currentPage >= totalPages || totalPages === 0);
}

function changePage(direction) {
    currentPage += direction;
    renderTable();
}

// Xóa 1 bản ghi
window.deleteRecord = async function(id) {
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
        try {
            const { error } = await supabaseClient.from('records').delete().eq('id', id);
            if (error) throw error;
            alert("Đã xóa bản ghi thành công!");
            loadData();
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
        }
    }
};

// Xóa toàn bộ dữ liệu
async function handleDeleteAll() {
    if (confirm("⚠️ CẢNH BÁO: Bạn có chắc muốn xóa TOÀN BỘ dữ liệu dự thu?")) {
        if (confirm("XÁC NHẬN LẦN 2: Thao tác này không thể hoàn tác! Tiếp tục?")) {
            try {
                const { error } = await supabaseClient.from('records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) throw error;
                alert("Đã xóa toàn bộ dữ liệu!");
                loadData();
            } catch (error) {
                alert("Lỗi khi xóa dữ liệu: " + error.message);
            }
        }
    }
}

// Xuất Excel
function exportToExcel() {
    if (filteredRecords.length === 0) {
        alert("Không có dữ liệu để xuất Excel!");
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert("Thư viện Excel chưa sẵn sàng, vui lòng thử lại sau vài giây.");
        return;
    }

    const exportData = filteredRecords.map((item, index) => ({
        "STT": index + 1,
        "User": item.user_name || item.user || '',
        "Số CIF": item.cif || '',
        "Tên Khách Hàng": item.customer_name || item.customerName || '',
        "Số Tiền Dự Thu": item.amount || 0,
        "Ngày Thanh Toán": item.payment_date || '',
        "Số Điện Thoại": item.phone || '',
        "Ghi Chú": item.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "QuanLyDuThu");

    XLSX.writeFile(workbook, `Bao_Cao_Du_Thu_${new Date().toISOString().split('T')[0]}.xlsx`);
}
