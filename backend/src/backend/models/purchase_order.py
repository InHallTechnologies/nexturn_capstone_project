from datetime import datetime, timezone


VALID_STATUSES = {
    "draft",
    "approved",
    "partially_received",
    "received",
    "cancelled"
}


def create_purchase_order_document(
    supplier_id, items, expected_date, created_by
):
    return {
        "supplier_id": supplier_id,
        "items": [
            {
                "product_id": item["product_id"],
                "ordered_qty": int(item["ordered_qty"]),
                "received_qty": 0,
                "unit_cost": float(item["unit_cost"])
            }
            for item in items
        ],
        "status": "draft",
        "expected_date": expected_date,
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }