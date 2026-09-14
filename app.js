"use strict";

// ============================================================
// KẾT NỐI SUPABASE
// ============================================================

const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// ============================================================
// LẤY CÁC PHẦN TỬ HTML
// ============================================================

const form = document.getElementById("duThuForm");
const button = document.getElementById("submitBtn");
const message = document.getElementById("message");

const amountInput = document.getElementById("amount");
const paymentDate = document.getElementById("payment_date");

// ============================================================
// HÀM HIỂN THỊ THÔNG BÁO
// ============================================================

function showMessage(text, color) {
  message.textContent = text;
  message.style.color = color;
}

// ============================================================
// NGÀY MẶC ĐỊNH LÀ NGÀY HIỆN TẠI
// ============================================================

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

paymentDate.value = getToday();

// ============================================================
// TỰ ĐỘNG THÊM DẤU PHẨY CHO SỐ TIỀN
// ============================================================

amountInput.addEventListener("input", function () {
  let value = this.value.replace(/\D/g, "");

  // Bỏ số 0 ở đầu nhưng vẫn giữ lại một số 0 nếu người dùng nhập 0
  value = value.replace(/^0+(?=\d)/, "");

  if (value) {
    this.value = Number(value).toLocaleString("en-US");
  } else {
    this.value = "";
  }
});

// ============================================================
// LẤY THÔNG TIN TỪ FORM
// ============================================================

function getFormData() {
  const amountText = amountInput.value.replace(/,/g, "").trim();

  return {
    user_name: document
      .getElementById("user_name")
      .value
      .trim(),

    cif: document
      .getElementById("cif")
      .value
      .trim(),

    customer_name: document
      .getElementById("customer_name")
      .value
      .trim(),

    amount: Number(amountText),

    payment_date: paymentDate.value,

    phone:
      document.getElementById("phone").value.trim() || null,

    note:
      document.getElementById("note").value.trim() || null
  };
}

// ============================================================
// KIỂM TRA DỮ LIỆU
// ============================================================

function validateData(data) {
  if (
    !data.user_name ||
    !data.cif ||
    !data.customer_name ||
    !data.amount ||
    !data.payment_date
  ) {
    return false;
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    return false;
  }

  return true;
}

// ============================================================
// TÌM BẢN GHI CÙNG CIF
// ============================================================

async function findExistingByCIF(cif) {
  const { data, error } = await client
    .from("du_thu")
    .select("*")
    .eq("cif", cif)
    .order("payment_date", {
      ascending: false
    })
    .order("created_at", {
      ascending: false
    })
    .limit(1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

// ============================================================
// SO SÁNH NGÀY
// ============================================================

function isNewerDate(newDate, oldDate) {
  if (!oldDate) {
    return true;
  }

  return String(newDate) > String(oldDate);
}

// ============================================================
// RESET FORM
// ============================================================

function resetForm() {
  form.reset();

  paymentDate.value = getToday();

  document.getElementById("user_name").focus();
}

// ============================================================
// GỬI DỰ THU
// ============================================================

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  button.disabled = true;
  button.innerHTML = "⏳ ĐANG XỬ LÝ...";

  showMessage("", "#6366f1");

  const data = getFormData();

  if (!validateData(data)) {
    showMessage(
      "⚠️ Vui lòng nhập đầy đủ và chính xác thông tin bắt buộc.",
      "#dc2626"
    );

    button.disabled = false;
    button.innerHTML = "<span>🚀</span> GỬI DỰ THU";
    return;
  }

  try {
    // ========================================================
    // TÌM CIF ĐÃ TỒN TẠI
    // ========================================================

    const oldData = await findExistingByCIF(data.cif);

    // ========================================================
    // TRƯỜNG HỢP 1: CIF CHƯA TỒN TẠI -> THÊM MỚI
    // ========================================================

    if (!oldData) {
      const { error } = await client
        .from("du_thu")
        .insert([data]);

      if (error) {
        throw error;
      }

      showMessage(
        "✅ Đã thêm dự thu mới thành công!",
        "#16a34a"
      );

      resetForm();
    }

    // ========================================================
    // TRƯỜNG HỢP 2: CIF ĐÃ TỒN TẠI
    // ========================================================

    else {
      const newDate = data.payment_date;
      const oldDate = oldData.payment_date;

      // Chỉ cập nhật nếu ngày mới lớn hơn ngày cũ
      if (isNewerDate(newDate, oldDate)) {
        const { error } = await client
          .from("du_thu")
          .update(data)
          .eq("id", oldData.id);

        if (error) {
          throw error;
        }

        showMessage(
          "✅ CIF đã tồn tại. Đã cập nhật ngày dự thu mới nhất!",
          "#16a34a"
        );

        resetForm();
      }

      // Ngày mới bằng hoặc cũ hơn ngày đang có
      else if (String(newDate) === String(oldDate)) {
        showMessage(
          "ℹ️ CIF này đã có dự thu cùng ngày. Không tạo thêm dòng trùng.",
          "#d97706"
        );
      }

      else {
        showMessage(
          "ℹ️ CIF này đã có ngày dự thu mới hơn. Không cập nhật dữ liệu cũ.",
          "#d97706"
        );
      }
    }
  } catch (error) {
    console.error("Lỗi lưu dự thu:", error);

    showMessage(
      "❌ Lưu dự thu thất bại: " + error.message,
      "#dc2626"
    );
  }

  button.disabled = false;
  button.innerHTML = "<span>🚀</span> GỬI DỰ THU";
});
