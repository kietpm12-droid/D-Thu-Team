const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const loginBox =
  document.getElementById("loginBox");

const managerBox =
  document.getElementById("managerBox");

const loginMessage =
  document.getElementById("loginMessage");

const managerMessage =
  document.getElementById("managerMessage");

let allData = [];


// =====================================
// ĐĂNG NHẬP
// =====================================

document
  .getElementById("loginBtn")
  .addEventListener("click", login);


async function login() {

  const email =
    document
      .getElementById("email")
      .value
      .trim();

  const password =
    document
      .getElementById("password")
      .value;


  if (!email || !password) {

    loginMessage.textContent =
      "⚠️ Vui lòng nhập email và mật khẩu.";

    return;
  }


  loginMessage.textContent =
    "⏳ Đang đăng nhập...";


  const { error } =
    await client.auth.signInWithPassword({

      email: email,

      password: password

    });


  if (error) {

    loginMessage.textContent =
      "❌ Đăng nhập thất bại: "
      + error.message;

    return;
  }


  loginMessage.textContent = "";

  loginBox.style.display = "none";

  managerBox.style.display = "block";


  await loadData();

}


// =====================================
// TẢI DỮ LIỆU
// =====================================

async function loadData() {

  managerMessage.textContent =
    "⏳ Đang tải dữ liệu...";


  const { data, error } =
    await client
      .from("du_thu")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (error) {

    managerMessage.textContent =
      "❌ Không tải được dữ liệu: "
      + error.message;

    return;
  }


  allData = data || [];


  renderData(allData);


  managerMessage.textContent = "";

}


// =====================================
// HIỂN THỊ DỮ LIỆU
// =====================================

function renderData(data) {

  const tbody =
    document.getElementById("tableBody");


  tbody.innerHTML = "";


  let total = 0;


  data.forEach(row => {

    total += Number(row.amount || 0);


    const tr =
      document.createElement("tr");


    tr.innerHTML = `

      <td>
        ${escapeHtml(row.user_name)}
      </td>

      <td>
        ${escapeHtml(row.cif)}
      </td>

      <td>
        ${escapeHtml(row.customer_name)}
      </td>

      <td>
        ${formatMoney(row.amount)} đ
      </td>

      <td>
        ${formatDate(row.payment_date)}
      </td>

      <td>
        ${escapeHtml(row.phone || "")}
      </td>

      <td>
        ${escapeHtml(row.note || "")}
      </td>

      <td>

        <button
          class="delete-btn"
          onclick="deleteDuThu(${row.id})">

          🗑️ Xóa

        </button>

      </td>

    `;


    tbody.appendChild(tr);

  });


  document.getElementById(
    "totalCustomers"
  ).textContent = data.length;


  document.getElementById(
    "totalAmount"
  ).textContent =
    formatMoney(total) + " đ";

}


// =====================================
// XÓA 1 DỰ THU
// =====================================

async function deleteDuThu(id) {

  const row =
    allData.find(
      item => item.id === id
    );


  if (!row) {

    alert(
      "❌ Không tìm thấy dữ liệu."
    );

    return;
  }


  const confirmDelete =
    confirm(
      "⚠️ Bạn có chắc muốn xóa dự thu này?\n\n"
      + "Khách hàng: "
      + row.customer_name
      + "\n"
      + "Số tiền: "
      + formatMoney(row.amount)
      + " đ"
    );


  if (!confirmDelete) {

    return;

  }


  managerMessage.textContent =
    "⏳ Đang xóa...";


  const { error } =
    await client
      .from("du_thu")
      .delete()
      .eq("id", id);


  if (error) {

    console.error(error);


    managerMessage.textContent =
      "❌ Xóa thất bại: "
      + error.message;

    return;
  }


  // Xóa khỏi dữ liệu đang có
  allData =
    allData.filter(
      item => item.id !== id
    );


  // Áp dụng lại bộ lọc hiện tại
  applyCurrentFilter();


  managerMessage.textContent =
    "✅ Đã xóa dự thu thành công.";

}


// =====================================
// LỌC
// =====================================

document
  .getElementById("filterBtn")
  .addEventListener(
    "click",
    filterData
  );


function filterData() {

  applyCurrentFilter();

}


function applyCurrentFilter() {

  const user =
    document
      .getElementById("filterUser")
      .value
      .trim()
      .toLowerCase();


  const date =
    document
      .getElementById("filterDate")
      .value;


  const filtered =
    allData.filter(row => {

      const matchUser =
        !user ||
        (row.user_name || "")
          .toLowerCase()
          .includes(user);


      const matchDate =
        !date ||
        row.payment_date === date;


      return matchUser && matchDate;

    });


  renderData(filtered);

}


// =====================================
// LÀM MỚI
// =====================================

document
  .getElementById("refreshBtn")
  .addEventListener(
    "click",
    async () => {

      await loadData();

    }
  );


// =====================================
// XUẤT EXCEL
// =====================================

document
  .getElementById("exportBtn")
  .addEventListener(
    "click",
    exportExcel
  );


function exportExcel() {

  const user =
    document
      .getElementById("filterUser")
      .value
      .trim()
      .toLowerCase();


  const date =
    document
      .getElementById("filterDate")
      .value;


  const filtered =
    allData.filter(row => {

      const matchUser =
        !user ||
        (row.user_name || "")
          .toLowerCase()
          .includes(user);


      const matchDate =
        !date ||
        row.payment_date === date;


      return matchUser && matchDate;

    });


  if (!filtered.length) {

    alert(
      "⚠️ Không có dữ liệu để xuất Excel."
    );

    return;
  }


  const excelData =
    filtered.map(row => ({

      "User":
        row.user_name || "",

      "Số CIF":
        row.cif || "",

      "Tên Khách hàng":
        row.customer_name || "",

      "Số tiền dự thu":
        Number(row.amount || 0),

      "Ngày thanh toán":
        row.payment_date || "",

      "SĐT":
        row.phone || "",

      "Ghi chú":
        row.note || ""

    }));


  const worksheet =
    XLSX.utils.json_to_sheet(
      excelData
    );


  const workbook =
    XLSX.utils.book_new();


  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Dự thu"
  );


  XLSX.writeFile(
    workbook,
    "du_thu_team.xlsx"
  );

}


// =====================================
// ĐĂNG XUẤT
// =====================================

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    async () => {

      await client.auth.signOut();


      managerBox.style.display =
        "none";


      loginBox.style.display =
        "block";


      allData = [];


      document.getElementById(
        "tableBody"
      ).innerHTML = "";

    }
  );


// =====================================
// FORMAT TIỀN
// =====================================

function formatMoney(value) {

  return Number(value || 0)
    .toLocaleString("vi-VN");

}


// =====================================
// FORMAT NGÀY
// =====================================

function formatDate(value) {

  if (!value) return "";


  const parts =
    value.split("-");


  if (parts.length !== 3) {

    return value;

  }


  return (
    parts[2]
    + "/"
    + parts[1]
    + "/"
    + parts[0]
  );

}


// =====================================
// CHỐNG HTML
// =====================================

function escapeHtml(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}
