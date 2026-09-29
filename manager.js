import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    deleteDoc, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Đợi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
    initManager();
});

function initManager() {
    loadData();

    // Sự kiện Tìm kiếm
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterData);
    }

    // Sự kiện Lọc theo trạng thái
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterData);
    }

    // Sự kiện Nút Xóa tất cả
    const btnDeleteAll = document.getElementById('btnDeleteAll');
    if (btnDeleteAll) {
        btnDeleteAll.addEventListener('click', deleteAllData);
    }
}

let allRecords = []; // Lưu trữ dữ liệu gốc để filter

// Hàm tải dữ liệu từ Firestore
async function loadData() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    showLoading(true);
    tableBody.innerHTML = '';

    try {
        const q = query(collection(db, "records"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        allRecords = [];
        querySnapshot.forEach((docSnap) => {
            allRecords.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderTable(allRecords);
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Lỗi tải dữ liệu: ${error.message}</td></tr>`;
    } finally {
        showLoading(false);
    }
}

// Render dữ liệu ra bảng
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Không có dữ liệu nào.</td></tr>`;
        return;
    }

    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        // Format ngày tháng
        let dateStr = 'N/A';
        if (item.timestamp) {
            const date = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
            dateStr = date.toLocaleString('vi-VN');
        }

        // Tạo danh sách ảnh (preview)
        let imagesHtml = '';
        if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
            imagesHtml = item.imageUrls.map(url => 
                `<a href="${url}" target="_blank"><img src="${url}" class="table-img-thumb" alt="Checkin" style="width:40px;height:40px;object-fit:cover;margin-right:4px;border-radius:4px;"/></a>`
            ).join('');
        } else {
            imagesHtml = '<span style="color:#888;">Không có ảnh</span>';
        }

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.customerName || 'N/A'}</strong><br><small>${item.customerId || ''}</small></td>
            <td>${item.address || 'N/A'}</td>
            <td>${item.note || ''}</td>
            <td>${imagesHtml}</td>
            <td><span class="badge ${getStatusClass(item.status)}">${item.status || 'Chưa xử lý'}</span></td>
            <td><small>${dateStr}</small></td>
            <td>
                <button class="btn-action btn-edit" data-id="${item.id}">Sửa</button>
                <button class="btn-action btn-delete" data-id="${item.id}">Xóa</button>
            </td>
        `;

        tableBody.appendChild(tr);
    });

    // Gán sự kiện cho các nút Sửa/Xóa từng dòng
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => editRow(e.target.dataset.id));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => deleteRow(e.target.dataset.id));
    });
}

// Lọc dữ liệu theo từ khóa và trạng thái
function filterData() {
    const keyword = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
    const status = document.getElementById('statusFilter')?.value || 'ALL';

    const filtered = allRecords.filter(item => {
        const matchKeyword = 
            (item.customerName && item.customerName.toLowerCase().includes(keyword)) ||
            (item.customerId && item.customerId.toLowerCase().includes(keyword)) ||
            (item.address && item.address.toLowerCase().includes(keyword)) ||
            (item.note && item.note.toLowerCase().includes(keyword));

        const matchStatus = (status === 'ALL') || (item.status === status);

        return matchKeyword && matchStatus;
    });

    renderTable(filtered);
}

// Hàm bổ trợ hiển thị CSS class cho trạng thái
function getStatusClass(status) {
    switch (status) {
        case 'Đã thu nợ': return 'badge-success';
        case 'Hẹn trả': return 'badge-warning';
        case 'Không gặp': return 'badge-danger';
        default: return 'badge-secondary';
    }
}

// Bật/tắt trạng thái Loading
function showLoading(isLoading) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = isLoading ? 'block' : 'none';
    }
}

// Xóa 1 bản ghi
async function deleteRow(id) {
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
        try {
            showLoading(true);
            await deleteDoc(doc(db, "records", id));
            alert("Đã xóa thành công!");
            loadData();
        } catch (error) {
            console.error("Lỗi khi xóa:", error);
            alert("Không thể xóa: " + error.message);
        } finally {
            showLoading(false);
        }
    }
}

// Sửa bản ghi
function editRow(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;
    alert(`Tính năng sửa cho hồ sơ: ${record.customerName || id}`);
}

// Xóa toàn bộ dữ liệu
async function deleteAllData() {
    if (confirm("⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu?")) {
        if (confirm("XÁC NHẬN LẦN 2: Tất cả hồ sơ sẽ bị xóa vĩnh viễn. Tiếp tục?")) {
            try {
                showLoading(true);
                const querySnapshot = await getDocs(collection(db, "records"));
                const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(doc(db, "records", docSnap.id)));
                await Promise.all(deletePromises);

                alert("Đã xóa toàn bộ dữ liệu thành công!");
                loadData();
            } catch (error) {
                console.error("Lỗi khi xóa dữ liệu:", error);
                alert("Lỗi khi xóa dữ liệu: " + error.message);
            } finally {
                showLoading(false);
            }
        }
    }
}
