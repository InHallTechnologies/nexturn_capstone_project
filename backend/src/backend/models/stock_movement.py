from datetime import datetime, timezone


VALID_REASONS = {
    "purchase",
    "sale",
    "adjustment",
    "return"
}


def create_stock_movement_document(
    product_id, quantity, reason, reference_id, created_by
):
    if reason not in VALID_REASONS:
        raise ValueError("Invalid stock movement reason")

    if quantity == 0:
        raise ValueError("Quantity cannot be zero")

    return {
        "product_id": product_id,
        "quantity": int(quantity),
        "reason": reason,
        "reference_id": reference_id,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc)
    }