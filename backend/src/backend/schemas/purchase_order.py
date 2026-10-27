
from datetime import date
from decimal import Decimal, InvalidOperation


VALID_STATUSES = {
    "draft",
    "approved",
    "partially_received",
    "received",
    "cancelled",
}


def validate_purchase_order(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    supplier_id = data.get("supplier_id")
    status = data.get("status", "draft")
    expected_date = data.get("expected_date")

    if isinstance(supplier_id, bool):
        raise ValueError("Supplier ID must be a positive integer")

    try:
        parsed_supplier_id = Decimal(str(supplier_id))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError("Supplier ID must be a positive integer")

    if (
        not parsed_supplier_id.is_finite()
        or parsed_supplier_id != parsed_supplier_id.to_integral_value()
    ):
        raise ValueError("Supplier ID must be a positive integer")

    supplier_id = int(parsed_supplier_id)

    if supplier_id <= 0:
        raise ValueError("Supplier ID must be a positive integer")

    if not isinstance(status, str):
        raise ValueError("Status must be a string")

    status = status.strip().lower()

    if status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid status. Allowed statuses: {', '.join(sorted(VALID_STATUSES))}"
        )

    if expected_date in ("", None):
        expected_date = None
    else:
        if not isinstance(expected_date, str):
            raise ValueError("Expected date must use YYYY-MM-DD format")

        try:
            expected_date = date.fromisoformat(expected_date)
        except ValueError:
            raise ValueError("Invalid expected date. Use YYYY-MM-DD format")
        if expected_date.isoformat() != data.get("expected_date"):
            raise ValueError("Invalid expected date. Use YYYY-MM-DD format")

    return {
        "supplier_id": supplier_id,
        "status": status,
        "expected_date": expected_date,
    }
