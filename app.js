const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const form = document.getElementById("duThuForm");
const button = document.getElementById("submitBtn");
const message = document.getElementById("message");

document.getElementById("payment_date").value =
  new Date().toISOString().split("T")[0];

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  button.disabled = true;
  button.textContent = "ĐANG LƯU...";
  message.textContent = "";

  const data = {
    user_name: document.getElementById("user_name").value.trim(),
    cif: document.getElementById("cif").value.trim(),
    customer_name: document.getElementById("customer_name").value.trim(),
    amount: Number(document.getElementById("amount").value),
    payment_date: document.getElementById("payment_date").value,
    phone: document.getElementById("phone").value.trim() || null,
    note: document.getElementById("note").value.trim() || null
  };

  try {
    const { error } = await client
      .from("du_thu")
      .insert([data]);

    if (error) throw error;

    message.textContent = "✅ Đã lưu dự thu thành công!";
    form.reset();

    document.getElementById("payment_date").value =
      new Date().toISOString().split("T")[0];

  } catch (error) {
    console.error(error);
    message.textContent =
      "❌ Lưu thất bại: " + error.message;
  }

  button.disabled = false;
  button.textContent = "GỬI DỰ THU";
});
