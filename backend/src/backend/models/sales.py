from datetime import datetime, timezone


def create_sale_document(bill_number, created_by, total_amount):
    return {
        "bill_number": bill_number,
        "created_by": created_by,
        "total_amount": float(total_amount),
        "created_at": datetime.now(timezone.utc)
    }


def create_sale_item_document(
    sale_id, product_id, quantity, price_at_sale
):
    quantity = int(quantity)

    if quantity <= 0:
        raise ValueError("Sale quantity must be positive")

    price_at_sale = float(price_at_sale)

    return {
        "sale_id": sale_id,
        "product_id": product_id,
        "quantity": quantity,
        "price_at_sale": price_at_sale,
        "subtotal": quantity * price_at_sale
    }