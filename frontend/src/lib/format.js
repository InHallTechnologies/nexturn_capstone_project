export function money(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function paymentMethodLabel(method) {
  return String(method || "").replace(/\s*\(demo\)$/i, "");
}
