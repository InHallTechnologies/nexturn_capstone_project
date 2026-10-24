from decimal import Decimal
from uuid import uuid4

from flask import Blueprint
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from backend.database import SessionLocal
from backend.models.products import Product
from backend.models.sale_items import SaleItem
from backend.models.sales import Sale
from backend.models.stock_movement import StockMovement
from backend.models.user import User
from backend.utils.middleware import role_required, token_required
from backend.routes.common import (
    pagination,
    parse_positive_integer,
    request_object,
    sort_query,
)


sales_bp = Blueprint("sales", __name__, url_prefix="/api/sales")


def serialize_sale(sale, db):
    items = db.query(SaleItem).filter_by(sale_id=sale.id).order_by(SaleItem.id).all()
    return {
        "id": sale.id,
        "bill_number": sale.bill_number,
        "created_by": sale.created_by,
        "total_amount": str(sale.total_amount),
        "created_at": sale.created_at.isoformat(),
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price_at_sale": str(item.price_at_sale),
                "subtotal": str(item.subtotal),
            }
            for item in items
        ],
    }


@sales_bp.get("")
@token_required
@role_required("Owner", "Manager", "Staff")
def list_sales(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=current_user_email).first()
        query = db.query(Sale)
        if user.role != "Owner":
            query = query.filter(Sale.created_by == user.id)
        query, error = sort_query(
            query,
            {
                "id": Sale.id,
                "bill_number": Sale.bill_number,
                "total_amount": Sale.total_amount,
                "created_at": Sale.created_at,
            },
            default="created_at",
        )
        if error:
            return error
        total = query.count()
        sales = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "items": [serialize_sale(sale, db) for sale in sales],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }, 200
    finally:
        db.close()


@sales_bp.get("/<int:sale_id>")
@token_required
@role_required("Owner", "Manager", "Staff")
def get_sale(current_user_email, sale_id):
    db = SessionLocal()
    try:
        sale = db.get(Sale, sale_id)
        if not sale:
            return {"error": "Sale not found"}, 404
        user = db.query(User).filter_by(email=current_user_email).first()
        if user.role != "Owner" and sale.created_by != user.id:
            return {"error": "Permission denied"}, 403
        return serialize_sale(sale, db), 200
    finally:
        db.close()


@sales_bp.post("")
@token_required
@role_required("Owner", "Manager", "Staff")
def create_sale(current_user_email):
    data, error = request_object()
    if error:
        return error
    items = data.get("items")
    if not isinstance(items, list) or not items:
        return {"error": "At least one sale item is required"}, 400

    quantities = {}
    for item in items:
        if not isinstance(item, dict):
            return {"error": "Each sale item must be an object"}, 400
        try:
            product_id = parse_positive_integer(item.get("product_id"), "Product ID")
            quantity = parse_positive_integer(item.get("quantity"), "Quantity")
        except ValueError as exc:
            return {"error": str(exc)}, 400
        quantities[product_id] = quantities.get(product_id, 0) + quantity

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=current_user_email).first()
        product_ids = sorted(quantities)
        products = (
            db.query(Product)
            .filter(Product.id.in_(product_ids))
            .order_by(Product.id)
            .with_for_update()
            .all()
        )
        product_map = {product.id: product for product in products}
        if len(product_map) != len(product_ids):
            return {"error": "One or more products were not found"}, 404

        stock_rows = (
            db.query(
                StockMovement.product_id,
                func.coalesce(func.sum(StockMovement.quantity), 0),
            )
            .filter(StockMovement.product_id.in_(product_ids))
            .group_by(StockMovement.product_id)
            .all()
        )
        stock_by_product = {product_id: int(quantity) for product_id, quantity in stock_rows}
        for product_id, quantity in quantities.items():
            if stock_by_product.get(product_id, 0) < quantity:
                return {
                    "error": f"Insufficient stock for product {product_id}",
                    "available": stock_by_product.get(product_id, 0),
                    "requested": quantity,
                }, 409

        bill_number = data.get("bill_number")
        if bill_number is None:
            bill_number = f"INV-{uuid4().hex[:16].upper()}"
        elif not isinstance(bill_number, str) or not bill_number.strip():
            return {"error": "bill_number must be a non-empty string"}, 400
        else:
            bill_number = bill_number.strip()
        if len(bill_number) > 50:
            return {"error": "bill_number cannot exceed 50 characters"}, 400

        sale = Sale(
            bill_number=bill_number,
            created_by=user.id,
            total_amount=Decimal("0.00"),
        )
        db.add(sale)
        db.flush()
        total_amount = Decimal("0.00")
        for product_id, quantity in quantities.items():
            product = product_map[product_id]
            unit_price = product.selling_price
            subtotal = unit_price * quantity
            total_amount += subtotal
            db.add(
                SaleItem(
                    sale_id=sale.id,
                    product_id=product_id,
                    quantity=quantity,
                    price_at_sale=unit_price,
                    subtotal=subtotal,
                )
            )
            db.add(
                StockMovement(
                    product_id=product_id,
                    quantity=-quantity,
                    reason="sale",
                    reference_id=sale.id,
                    created_by=user.id,
                )
            )
        sale.total_amount = total_amount
        db.commit()
        db.refresh(sale)
        return serialize_sale(sale, db), 201
    except IntegrityError:
        db.rollback()
        return {"error": "Bill number already exists or sale data is invalid"}, 409
    finally:
        db.close()
