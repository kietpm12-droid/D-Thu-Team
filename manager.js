const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const loginBox = document.getElementById("loginBox");
const managerBox = document.getElementById("managerBox");
const loginMessage = document.getElementById("loginMessage");
const managerMessage = document.getElementById("managerMessage");

let allData = [];

document.getElementById("loginBtn").addEventListener("click", login);

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    loginMessage.textContent =
      "⚠️ Nhập email và mật khẩu.";
    return;
  }

  loginMessage.textContent = "Đang đăng nhập...";

  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent =
      "❌ Đăng nhập thất bại: " + error.message;
    return;
  }

  loginMessage.textContent = "";

  loginBox.style.display = "none";
  managerBox.style.display = "block";

  await loadData();
}

async function loadData() {
  managerMessage.textContent = "Đang tải dữ liệu...";

  const { data, error } = await client
    .from("du_thu")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    managerMessage.textContent =
      "❌ Không tải được dữ liệu: " + error.message;
    return;
  }

  allData = data || [];
  renderData(allData);

  managerMessage.textContent = "";
}

function renderData(data) {
  const tbody = document.getElementById("tableBody");

  tbody.innerHTML = "";

  let total = 0;

  data.forEach(row => {
    total += Number(row.amount || 0);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(row.user_name)}</td>
      <td>${escapeHtml(row.cif)}</td>
      <td>${escapeHtml(row.customer_name)}</td>
      <td>${formatMoney(row.amount)}</td>
      <td>${formatDate(row.payment_date)}</td>
      <td>${escapeHtml(row.phone || "")}</td>
      <td>${escapeHtml(row.note || "")}</td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById("totalAmount").textContent =
    formatMoney(total);
}

document.getElementById("filterBtn")
  .addEventListener("click", () => {

    const user =
      document.getElementById("filterUser")
        .value.trim()
        .toLowerCase();

    const date =
      document.getElementById("filterDate").value;

    const filtered = allData.filter(row => {

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
  });


document.getElementById("exportBtn")
  .addEventListener("click", () => {

    const user =
      document.getElementById("filterUser")
        .value.trim()
        .toLowerCase();

    const date =
      document.getElementById("filterDate").value;

    const filtered = allData.filter(row => {

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
      alert("Không có dữ liệu để xuất.");
      return;
    }

    const excelData = filtered.map(row => ({
      "User": row.user_name,
      "Số CIF": row.cif,
      "Tên Khách hàng": row.customer_name,
      "Số tiền dự thu": Number(row.amount),
      "Ngày thanh toán": row.payment_date,
      "SĐT": row.phone || "",
      "Ghi chú": row.note || ""
    }));

    const worksheet =
      XLSX.utils.json_to_sheet(excelData);

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
  });


document.getElementById("logoutBtn")
  .addEventListener("click", async () => {

    await client.auth.signOut();

    managerBox.style.display = "none";
    loginBox.style.display = "block";

    allData = [];
  });


function formatMoney(value) {
  return Number(value || 0)
    .toLocaleString("vi-VN");
}

function formatDate(value) {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
