
from datetime import date


VALID_STATUSES = {
    "draft",
    "pending",
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

    # Validate supplier ID
    if isinstance(supplier_id, bool):
        raise ValueError("Supplier ID must be a positive integer")

    try:
        supplier_id = int(supplier_id)
    except (ValueError, TypeError):
        raise ValueError("Supplier ID must be a positive integer")

    if supplier_id <= 0:
        raise ValueError("Supplier ID must be a positive integer")

    # Validate status
    if not isinstance(status, str):
        raise ValueError("Status must be a string")

    status = status.strip().lower()

    if status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid status. Allowed statuses: {', '.join(sorted(VALID_STATUSES))}"
        )

    # Validate expected date (optional)
    if expected_date in ("", None):
        expected_date = None
    else:
        if not isinstance(expected_date, str):
            raise ValueError("Expected date must use YYYY-MM-DD format")

        try:
            expected_date = date.fromisoformat(expected_date)
        except ValueError:
            raise ValueError("Invalid expected date. Use YYYY-MM-DD format")

    return {
        "supplier_id": supplier_id,
        "status": status,
        "expected_date": expected_date,
    }
