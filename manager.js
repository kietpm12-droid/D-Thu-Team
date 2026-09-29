// Khai báo biến toàn cục
let supabaseClient = null;
let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
const pageSize = 10;

// Khởi tạo ứng dụng sau khi DOM và CDN tải xong
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Khởi tạo Supabase client từ config.js
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error("Không thể kết nối Supabase. Vui lòng kiểm tra file config.js");
        return;
    }

    // 2. Kiểm tra trạng thái đăng nhập
    checkAuth();

    // 3. Đăng ký sự kiện nút bấm
    setupEventListeners();
}

// Kiểm tra phiên đăng nhập
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        // Chưa đăng nhập thì chuyển hướng về trang login
        window.location.href = 'login.html';
        return;
    }
    // Đã đăng nhập -> Tải dữ liệu
    loadData();
}

// Lắng nghe sự kiện các nút bấm (Bám sát ID trong file HTML)
function setupEventListeners() {
    // Nút Đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Nút Lọc dữ liệu
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) filterBtn.addEventListener('click', handleFilter);

    // Nút Làm mới
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
        document.getElementById('filterUser').value = '';
        document.getElementById('filterDate').value = '';
        loadData();
    });

    // Nút Xuất Excel
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToExcel);

    // Nút Xóa tất cả
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', handleDeleteAll);

    // Nút Phân trang
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));
}

// Chức năng Đăng xuất
async function handleLogout() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            window.location.href = 'login.html';
        } catch (error) {
            alert("Lỗi khi đăng xuất: " + error.message);
        }
    }
}

// Tải dữ liệu từ Supabase
async function loadData() {
    try {
        const { data, error } = await supabaseClient
            .from('records') // Đảm bảo tên table trong Supabase của bạn là 'records'
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
        const tableBody = document.getElementById('tableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
        }
    }
}

// Cập nhật 2 ô Thống kê (Tổng khách hàng & Tổng dự thu)
function updateStats() {
    const totalCustomers = document.getElementById('totalCustomers');
    const totalAmount = document.getElementById('totalAmount');

    if (totalCustomers) totalCustomers.innerText = filteredRecords.length;

    if (totalAmount) {
        const sum = filteredRecords.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
        totalAmount.innerText = sum.toLocaleString('vi-VN') + ' đ';
    }
}

// Lọc dữ liệu theo User và Ngày thanh toán
function handleFilter() {
    const filterUser = document.getElementById('filterUser')?.value.toLowerCase().trim() || '';
    const filterDate = document.getElementById('filterDate')?.value || '';

    filteredRecords = allRecords.filter(item => {
        const matchUser = !filterUser || (item.user_name && item.user_name.toLowerCase().includes(filterUser));
        
        let matchDate = true;
        if (filterDate && item.payment_date) {
            // So sánh định dạng YYYY-MM-DD
            const itemDate = new Date(item.payment_date).toISOString().split('T')[0];
            matchDate = (itemDate === filterDate);
        }

        return matchUser && matchDate;
    });

    currentPage = 1;
    updateStats();
    renderTable();
}

// Hiển thị bảng dữ liệu kèm Phân trang
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-row" style="text-align:center;">Không có dữ liệu</td></tr>`;
        updatePaginationInfo(0);
        return;
    }

    // Tính toán phân trang
    const totalPages = Math.ceil(filteredRecords.length / pageSize);
    const startIdx = (currentPage - 1) * pageSize;
    const pageData = filteredRecords.slice(startIdx, startIdx + pageSize);

    pageData.forEach(item => {
        const tr = document.createElement('tr');
        
        const formattedAmount = (Number(item.amount) || 0).toLocaleString('vi-VN') + ' đ';
        const formattedDate = item.payment_date ? new Date(item.payment_date).toLocaleDateString('vi-VN') : 'N/A';

        tr.innerHTML = `
            <td>${item.user_name || 'N/A'}</td>
            <td>${item.cif || 'N/A'}</td>
            <td><strong>${item.customer_name || 'N/A'}</strong></td>
            <td style="color: #2e7d32; font-weight: bold;">${formattedAmount}</td>
            <td>${formattedDate}</td>
            <td>${item.phone || 'N/A'}</td>
            <td>${item.note || ''}</td>
            <td>
                <button class="btn-action btn-delete" onclick="deleteRecord('${item.id}')">🗑️ Xóa</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    updatePaginationInfo(totalPages);
}

// Cập nhật trạng thái các nút Phân trang
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

// Xóa 1 dòng
window.deleteRecord = async function(id) {
    if (confirm("Bạn có chắc chắn muốn xóa dòng dữ liệu này?")) {
        try {
            const { error } = await supabaseClient.from('records').delete().eq('id', id);
            if (error) throw error;
            alert("Đã xóa thành công!");
            loadData();
        } catch (error) {
            alert("Không thể xóa: " + error.message);
        }
    }
};

// Xóa tất cả dữ liệu
async function handleDeleteAll() {
    if (confirm("⚠️ CẢNH BÁO: Bạn có chắc muốn xóa TOÀN BỘ dữ liệu dự thu?")) {
        if (confirm("XÁC NHẬN LẦN 2: Thao tác này không thể phục hồi! Tiếp tục?")) {
            try {
                const { error } = await supabaseClient.from('records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                if (error) throw error;
                alert("Đã xóa toàn bộ dữ liệu!");
                loadData();
            } catch (error) {
                alert("Lỗi khi xóa tất cả: " + error.message);
            }
        }
    }
}

// Xuất Excel sử dụng thư viện xlsx-js-style đã khai báo trong HTML
function exportToExcel() {
    if (filteredRecords.length === 0) {
        alert("Không có dữ liệu để xuất Excel!");
        return;
    }

    const excelData = filteredRecords.map((item, index) => ({
        "STT": index + 1,
        "User": item.user_name || '',
        "Số CIF": item.cif || '',
        "Tên Khách Hàng": item.customer_name || '',
        "Số Tiền Dự Thu": item.amount || 0,
        "Ngày Thanh Toán": item.payment_date || '',
        "Số Điện Thoại": item.phone || '',
        "Ghi Chú": item.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "QuanLyDuThu");
    
    XLSX.writeFile(workbook, `Quan_Ly_Du_Thu_${new Date().toISOString().split('T')[0]}.xlsx`);
}
