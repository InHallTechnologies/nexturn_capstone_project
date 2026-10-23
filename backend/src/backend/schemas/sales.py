
from decimal import Decimal, InvalidOperation


def validate_sale_item(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    quantity = data.get("quantity")
    price_at_sale = data.get("price_at_sale")

    # Validate quantity
    if isinstance(quantity, bool):
        raise ValueError("Quantity must be a positive integer")

    try:
        parsed_quantity = int(quantity)
    except (ValueError, TypeError):
        raise ValueError("Quantity must be a positive integer")

    if isinstance(quantity, float) and not quantity.is_integer():
        raise ValueError("Quantity must be a whole number")

    if parsed_quantity <= 0:
        raise ValueError("Quantity must be greater than zero")

    # Validate sale price
    try:
        price_at_sale = Decimal(str(price_at_sale))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError("Invalid sale price")

    if not price_at_sale.is_finite() or price_at_sale < 0:
        raise ValueError("Sale price must be a valid non-negative number")

    subtotal = price_at_sale * parsed_quantity

    return {
        "quantity": parsed_quantity,
        "price_at_sale": price_at_sale,
        "subtotal": subtotal,
    }
