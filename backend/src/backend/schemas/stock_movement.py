
VALID_REASONS = {
    "purchase",
    "sale",
    "adjustment",
    "return",
}


def validate_stock_movement(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    product_id = data.get("product_id")
    quantity = data.get("quantity")
    reason = data.get("reason")

    # Validate product ID
    if isinstance(product_id, bool):
        raise ValueError("Product ID must be a positive integer")

    try:
        product_id = int(product_id)
    except (ValueError, TypeError):
        raise ValueError("Product ID must be a positive integer")

    if product_id <= 0:
        raise ValueError("Product ID must be a positive integer")

    # Validate quantity
    if isinstance(quantity, bool):
        raise ValueError("Quantity must be a non-zero integer")

    try:
        quantity = int(quantity)
    except (ValueError, TypeError):
        raise ValueError("Quantity must be a non-zero integer")

    if quantity == 0:
        raise ValueError("Quantity cannot be zero")

    # Validate reason
    if not isinstance(reason, str):
        raise ValueError("Reason must be a string")

    reason = reason.strip().lower()

    if reason not in VALID_REASONS:
        raise ValueError(
            f"Invalid reason. Allowed reasons: {', '.join(sorted(VALID_REASONS))}"
        )

    # Check quantity direction
    if reason == "purchase" and quantity < 0:
        raise ValueError("Purchase quantity must be positive")

    if reason == "sale" and quantity > 0:
        raise ValueError("Sale quantity must be negative")

    if reason == "return" and quantity < 0:
        raise ValueError("Return quantity must be positive")

    return {
        "product_id": product_id,
        "quantity": quantity,
        "reason": reason,
    }
