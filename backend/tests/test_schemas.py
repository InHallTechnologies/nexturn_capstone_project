from decimal import Decimal

from backend.schemas.products import validate_product
from backend.schemas.purchase_order import validate_purchase_order
from backend.schemas.sales import validate_sale_item
from backend.schemas.stock_movement import validate_stock_movement
from backend.schemas.user import validate_register


def test_registration_always_assigns_staff_role():
    result = validate_register(
        {
            "name": " New User ",
            "email": "NEW@example.test",
            "password": "Password123",
            "role": "Owner",
        }
    )

    assert result["name"] == "New User"
    assert result["email"] == "new@example.test"
    assert result["role"] == "Staff"


def test_registration_accepts_password_over_72_bytes():
    result = validate_register(
        {
            "name": "Test",
            "email": "test@example.test",
            "password": "a" * 100,
        }
    )

    assert result["password"] == "a" * 100


def test_product_schema_parses_valid_prices_and_ids():
    result = validate_product(
        {
            "sku": "abc-1",
            "name": "Product",
            "category_id": "2",
            "unit": "each",
            "cost_price": "1.20",
            "selling_price": "2.50",
        }
    )

    assert result["sku"] == "ABC-1"
    assert result["category_id"] == 2
    assert result["cost_price"] == Decimal("1.20")
    assert result["selling_price"] == Decimal("2.50")


def test_product_schema_rejects_fractional_category_id():
    try:
        validate_product(
            {
                "sku": "abc-1",
                "name": "Product",
                "category_id": 1.5,
                "unit": "each",
                "cost_price": 1,
                "selling_price": 2,
            }
        )
    except ValueError as error:
        assert "Category ID" in str(error) or "Invalid category" in str(error)
    else:
        assert False


def test_purchase_order_schema_accepts_documented_status():
    result = validate_purchase_order(
        {"supplier_id": 1, "status": "partially_received"}
    )

    assert result["status"] == "partially_received"


def test_purchase_order_schema_rejects_undocumented_status():
    try:
        validate_purchase_order({"supplier_id": 1, "status": "pending"})
    except ValueError as error:
        assert "Invalid status" in str(error)
    else:
        assert False


def test_sale_item_schema_calculates_subtotal():
    result = validate_sale_item(
        {"product_id": 3, "quantity": 2, "price_at_sale": "4.25"}
    )

    assert result["product_id"] == 3
    assert result["quantity"] == 2
    assert result["subtotal"] == Decimal("8.50")


def test_sale_item_schema_rejects_fractional_quantity():
    try:
        validate_sale_item(
            {"product_id": 3, "quantity": 1.5, "price_at_sale": "4.25"}
        )
    except ValueError as error:
        assert "Quantity" in str(error)
    else:
        assert False


def test_stock_movement_schema_requires_signed_sale_quantity():
    result = validate_stock_movement(
        {"product_id": 2, "quantity": -3, "reason": "sale"}
    )

    assert result["product_id"] == 2
    assert result["quantity"] == -3
    assert result["reason"] == "sale"


def test_stock_movement_schema_rejects_fractional_quantity():
    try:
        validate_stock_movement(
            {"product_id": 2, "quantity": 1.5, "reason": "purchase"}
        )
    except ValueError as error:
        assert "integer" in str(error)
    else:
        assert False
