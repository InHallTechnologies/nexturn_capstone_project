
from decimal import Decimal, InvalidOperation


def validate_sale_item(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    product_id = data.get("product_id")
    quantity = data.get("quantity")
    price_at_sale = data.get("price_at_sale")

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

    if isinstance(quantity, bool):
        raise ValueError("Quantity must be a positive integer")

    try:
        parsed_quantity = Decimal(str(quantity))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError("Quantity must be a positive integer")

    if (
        not parsed_quantity.is_finite()
        or parsed_quantity != parsed_quantity.to_integral_value()
        or parsed_quantity <= 0
    ):
        raise ValueError("Quantity must be greater than zero")
    parsed_quantity = int(parsed_quantity)

    try:
        price_at_sale = Decimal(str(price_at_sale))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError("Invalid sale price")

    if not price_at_sale.is_finite() or price_at_sale < 0:
        raise ValueError("Sale price must be a valid non-negative number")

    subtotal = price_at_sale * parsed_quantity

    return {
        "product_id": int(parsed_product_id),
        "quantity": parsed_quantity,
        "price_at_sale": price_at_sale,
        "subtotal": subtotal,
    }
