from datetime import datetime, timezone


def create_product_document(
    sku, name, category_id, unit,
    cost_price, selling_price, reorder_level
):
    return {
        "sku": sku.strip().upper(),
        "name": name.strip(),
        "category_id": category_id,
        "unit": unit,
        "cost_price": float(cost_price),
        "selling_price": float(selling_price),
        "reorder_level": int(reorder_level),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }