const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);
const form = document.getElementById("duThuForm");
const button = document.getElementById("submitBtn");
const message = document.getElementById("message");
const amountInput = document.getElementById("amount");
const paymentDate = document.getElementById("payment_date");
// ===============================
// NGÀY MẶC ĐỊNH
// ===============================
paymentDate.value =
  new Date().toISOString().split("T")[0];
// ===============================
// TỰ ĐỘNG THÊM DẤU PHẨY TIỀN
// ===============================
amountInput.addEventListener("input", function () {
  // Chỉ giữ lại số
  let value = this.value.replace(/\D/g, "");
  // Bỏ số 0 ở đầu
  value = value.replace(/^0+(?=\d)/, "");
  // Thêm dấu phẩy
  if (value) {
    this.value = Number(value).toLocaleString("en-US");
  } else {
    this.value = "";
  }
});
// ===============================
// GỬI DỰ THU
// ===============================
form.addEventListener("submit", async function (event) {
  event.preventDefault();
  button.disabled = true;
  button.innerHTML = "⏳ ĐANG LƯU...";
  message.textContent = "";
  message.style.color = "#6366f1";
  // Bỏ dấu phẩy trước khi gửi Supabase
  const amountValue =
    amountInput.value.replace(/,/g, "");
  const data = {
    user_name:
      document.getElementById("user_name").value.trim(),
    cif:
      document.getElementById("cif").value.trim(),
    customer_name:
      document.getElementById("customer_name").value.trim(),
    amount:
      Number(amountValue),
    payment_date:
      paymentDate.value,
    phone:
      document.getElementById("phone").value.trim() || null,
    note:
      document.getElementById("note").value.trim() || null
  };
  // ===============================
  // KIỂM TRA
  // ===============================
  if (
    !data.user_name ||
    !data.cif ||
    !data.customer_name ||
    !data.amount ||
    !data.payment_date
  ) {
    message.textContent =
      "⚠️ Vui lòng nhập đầy đủ thông tin bắt buộc.";
    message.style.color = "#dc2626";
    button.disabled = false;
    button.innerHTML = "<span>🚀</span> GỬI DỰ THU";
    return;
  }
  try {
    const { error } =
      await client
        .from("du_thu")
        .insert([data]);
    if (error) {
      throw error;
    }
    // ===============================
    // THÀNH CÔNG
    // ===============================
    message.textContent =
      "✅ Đã lưu dự thu thành công!";
    message.style.color = "#16a34a";
    form.reset();
    paymentDate.value =
      new Date().toISOString().split("T")[0];
    document
      .getElementById("user_name")
      .focus();
  } catch (error) {
    console.error(error);
    message.textContent =
      "❌ Lưu thất bại: " + error.message;
    message.style.color = "#dc2626";
  }
  button.disabled = false;
  button.innerHTML =
    "<span>🚀</span> GỬI DỰ THU";
});
