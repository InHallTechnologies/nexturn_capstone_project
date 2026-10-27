
from decimal import Decimal, InvalidOperation


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

    if isinstance(product_id, bool):
        raise ValueError("Product ID must be a positive integer")

    try:
        parsed_product_id = Decimal(str(product_id))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError("Product ID must be a positive integer")

    if (
        not parsed_product_id.is_finite()
        or parsed_product_id != parsed_product_id.to_integral_value()
        or parsed_product_id <= 0
    ):
        raise ValueError("Product ID must be a positive integer")
    product_id = int(parsed_product_id)

    if isinstance(quantity, bool):
        raise ValueError("Quantity must be a non-zero integer")

    try:
        parsed_quantity = Decimal(str(quantity))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError("Quantity must be a non-zero integer")

    if (
        not parsed_quantity.is_finite()
        or parsed_quantity != parsed_quantity.to_integral_value()
    ):
        raise ValueError("Quantity must be a non-zero integer")

    quantity = int(parsed_quantity)
    if quantity == 0:
        raise ValueError("Quantity cannot be zero")

    if not isinstance(reason, str):
        raise ValueError("Reason must be a string")

    reason = reason.strip().lower()

    if reason not in VALID_REASONS:
        raise ValueError(
            f"Invalid reason. Allowed reasons: {', '.join(sorted(VALID_REASONS))}"
        )

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
