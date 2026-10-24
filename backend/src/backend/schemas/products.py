
from decimal import Decimal, InvalidOperation


def _parse_integer(value, field_name):
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer")

    try:
        parsed_value = Decimal(str(value))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError(f"{field_name} must be an integer")

    if not parsed_value.is_finite() or parsed_value != parsed_value.to_integral_value():
        raise ValueError(f"{field_name} must be an integer")

    return int(parsed_value)


def validate_product(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")

    sku = data.get("sku")
    name = data.get("name")
    category_id = data.get("category_id")
    unit = data.get("unit")
    cost_price = data.get("cost_price")
    selling_price = data.get("selling_price")
    reorder_level = data.get("reorder_level", 0)

    if not isinstance(sku, str) or not isinstance(name, str):
        raise ValueError("SKU and name must be strings")

    if not isinstance(unit, str):
        raise ValueError("Unit must be a string")

    sku = sku.strip().upper()
    name = name.strip()
    unit = unit.strip()

    if not sku:
        raise ValueError("SKU is required")

    if not name:
        raise ValueError("Product name is required")

    if not unit:
        raise ValueError("Unit is required")

    if len(sku) > 50:
        raise ValueError("SKU cannot exceed 50 characters")

    if len(name) > 150:
        raise ValueError("Product name cannot exceed 150 characters")

    if len(unit) > 30:
        raise ValueError("Unit cannot exceed 30 characters")

    try:
        category_id = _parse_integer(category_id, "Category ID")
        reorder_level = _parse_integer(reorder_level, "Reorder level")
        cost_price = Decimal(str(cost_price))
        selling_price = Decimal(str(selling_price))
    except (ValueError, TypeError, InvalidOperation):
        raise ValueError("Invalid category ID, price, or reorder level")

    if category_id <= 0:
        raise ValueError("Category ID must be positive")

    if reorder_level < 0:
        raise ValueError("Reorder level cannot be negative")

    if (
        not cost_price.is_finite()
        or not selling_price.is_finite()
        or cost_price < 0
        or selling_price < 0
    ):
        raise ValueError("Prices must be valid non-negative numbers")

    return {
        "sku": sku,
        "name": name,
        "category_id": category_id,
        "unit": unit,
        "cost_price": cost_price,
        "selling_price": selling_price,
        "reorder_level": reorder_level,
    }
