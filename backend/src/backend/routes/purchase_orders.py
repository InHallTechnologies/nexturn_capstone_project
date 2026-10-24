from decimal import Decimal, InvalidOperation

from flask import Blueprint, request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from backend.database import SessionLocal
from backend.models.products import Product
from backend.models.purchase_order_item import PurchaseOrderItem
from backend.models.purchase_orders import PurchaseOrder
from backend.models.stock_movement import StockMovement
from backend.models.supplier import Supplier
from backend.models.user import User
from backend.schemas.purchase_order import validate_purchase_order
from backend.utils.middleware import role_required, token_required
from backend.routes.common import (
    pagination,
    parse_positive_integer,
    request_object,
    sort_query,
)


purchase_orders_bp = Blueprint(
    "purchase_orders", __name__, url_prefix="/api/purchase-orders"
)


def serialize_order(order, db):
    items = (
        db.query(PurchaseOrderItem)
        .filter_by(purchase_order_id=order.id)
        .order_by(PurchaseOrderItem.id)
        .all()
    )
    return {
        "id": order.id,
        "supplier_id": order.supplier_id,
        "status": order.status,
        "expected_date": order.expected_date.isoformat() if order.expected_date else None,
        "created_by": order.created_by,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "ordered_qty": item.ordered_qty,
                "received_qty": item.received_qty,
                "unit_cost": str(item.unit_cost),
            }
            for item in items
        ],
    }


def user_order_access(db, order, email):
    user = db.query(User).filter_by(email=email).first()
    return bool(user and (user.role == "Owner" or order.created_by == user.id))


def validate_order_items(data):
    items = data.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("At least one purchase-order item is required")
    parsed = []
    seen_products = set()
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Each purchase-order item must be an object")
        try:
            product_id = parse_positive_integer(item.get("product_id"), "Product ID")
            quantity = parse_positive_integer(item.get("ordered_qty"), "Ordered quantity")
            unit_cost = Decimal(str(item.get("unit_cost")))
        except (ValueError, TypeError, InvalidOperation):
            raise ValueError("Each item needs valid product_id, ordered_qty and unit_cost")
        if not unit_cost.is_finite() or unit_cost < 0:
            raise ValueError("Unit cost must be a non-negative amount")
        if product_id in seen_products:
            raise ValueError("A product may appear only once in a purchase order")
        seen_products.add(product_id)
        parsed.append(
            {"product_id": product_id, "ordered_qty": quantity, "unit_cost": unit_cost}
        )
    return parsed


@purchase_orders_bp.get("")
@token_required
@role_required("Owner", "Manager")
def list_purchase_orders(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        query = db.query(PurchaseOrder)
        user = db.query(User).filter_by(email=current_user_email).first()
        if user.role != "Owner":
            query = query.filter(PurchaseOrder.created_by == user.id)
        status = request.args.get("status")
        if status:
            query = query.filter(PurchaseOrder.status == status.strip().lower())
        query, error = sort_query(
            query,
            {
                "id": PurchaseOrder.id,
                "status": PurchaseOrder.status,
                "expected_date": PurchaseOrder.expected_date,
                "created_at": PurchaseOrder.created_at,
            },
        )
        if error:
            return error
        total = query.count()
        orders = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "items": [serialize_order(order, db) for order in orders],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }, 200
    finally:
        db.close()


@purchase_orders_bp.get("/<int:order_id>")
@token_required
@role_required("Owner", "Manager")
def get_purchase_order(current_user_email, order_id):
    db = SessionLocal()
    try:
        order = db.get(PurchaseOrder, order_id)
        if not order:
            return {"error": "Purchase order not found"}, 404
        if not user_order_access(db, order, current_user_email):
            return {"error": "Permission denied"}, 403
        return serialize_order(order, db), 200
    finally:
        db.close()


@purchase_orders_bp.post("")
@token_required
@role_required("Owner", "Manager")
def create_purchase_order(current_user_email):
    data, error = request_object()
    if error:
        return error
    if data.get("status", "draft") != "draft":
        return {"error": "Purchase orders must be created as drafts"}, 400
    try:
        values = validate_purchase_order({**data, "status": "draft"})
        items = validate_order_items(data)
    except ValueError as exc:
        return {"error": str(exc)}, 400

    db = SessionLocal()
    try:
        if not db.get(Supplier, values["supplier_id"]):
            return {"error": "Supplier not found"}, 404
        for item in items:
            if not db.get(Product, item["product_id"]):
                return {"error": f"Product {item['product_id']} not found"}, 404
        user = db.query(User).filter_by(email=current_user_email).first()
        order = PurchaseOrder(
            supplier_id=values["supplier_id"],
            expected_date=values["expected_date"],
            created_by=user.id,
            status="draft",
        )
        db.add(order)
        db.flush()
        for item in items:
            db.add(PurchaseOrderItem(purchase_order_id=order.id, **item))
        db.commit()
        db.refresh(order)
        return serialize_order(order, db), 201
    except IntegrityError:
        db.rollback()
        return {"error": "Purchase order references invalid data"}, 409
    finally:
        db.close()


@purchase_orders_bp.post("/<int:order_id>/approve")
@token_required
@role_required("Owner")
def approve_purchase_order(current_user_email, order_id):
    db = SessionLocal()
    try:
        order = db.query(PurchaseOrder).filter_by(id=order_id).with_for_update().first()
        if not order:
            return {"error": "Purchase order not found"}, 404
        if order.status != "draft":
            return {"error": "Only draft purchase orders can be approved"}, 409
        if not db.query(PurchaseOrderItem).filter_by(purchase_order_id=order.id).first():
            return {"error": "A purchase order must have items before approval"}, 409
        order.status = "approved"
        db.commit()
        return serialize_order(order, db), 200
    finally:
        db.close()


@purchase_orders_bp.put("/<int:order_id>")
@token_required
@role_required("Owner", "Manager")
def update_purchase_order(current_user_email, order_id):
    data, error = request_object()
    if error:
        return error
    if data.get("status", "draft") != "draft":
        return {"error": "Only draft purchase orders can be edited"}, 409
    try:
        values = validate_purchase_order({**data, "status": "draft"})
        items = validate_order_items(data)
    except ValueError as exc:
        return {"error": str(exc)}, 400

    db = SessionLocal()
    try:
        order = db.query(PurchaseOrder).filter_by(id=order_id).with_for_update().first()
        if not order:
            return {"error": "Purchase order not found"}, 404
        if not user_order_access(db, order, current_user_email):
            return {"error": "Permission denied"}, 403
        if order.status != "draft":
            return {"error": "Only draft purchase orders can be edited"}, 409
        if not db.get(Supplier, values["supplier_id"]):
            return {"error": "Supplier not found"}, 404
        for item in items:
            if not db.get(Product, item["product_id"]):
                return {"error": f"Product {item['product_id']} not found"}, 404
        db.query(PurchaseOrderItem).filter_by(purchase_order_id=order.id).delete()
        order.supplier_id = values["supplier_id"]
        order.expected_date = values["expected_date"]
        for item in items:
            db.add(PurchaseOrderItem(purchase_order_id=order.id, **item))
        db.commit()
        return serialize_order(order, db), 200
    except IntegrityError:
        db.rollback()
        return {"error": "Purchase order references invalid data"}, 409
    finally:
        db.close()


@purchase_orders_bp.delete("/<int:order_id>")
@token_required
@role_required("Owner", "Manager")
def delete_purchase_order(current_user_email, order_id):
    db = SessionLocal()
    try:
        order = db.query(PurchaseOrder).filter_by(id=order_id).with_for_update().first()
        if not order:
            return {"error": "Purchase order not found"}, 404
        if not user_order_access(db, order, current_user_email):
            return {"error": "Permission denied"}, 403
        if order.status != "draft":
            return {"error": "Only draft purchase orders can be deleted"}, 409
        db.query(PurchaseOrderItem).filter_by(purchase_order_id=order.id).delete()
        db.delete(order)
        db.commit()
        return {"message": "Purchase order deleted"}, 200
    finally:
        db.close()


@purchase_orders_bp.post("/<int:order_id>/receive")
@token_required
@role_required("Owner", "Manager")
def receive_purchase_order(current_user_email, order_id):
    data, error = request_object()
    if error:
        return error
    receipts = data.get("items")
    if not isinstance(receipts, list) or not receipts:
        return {"error": "At least one receipt item is required"}, 400
    db = SessionLocal()
    try:
        order = db.query(PurchaseOrder).filter_by(id=order_id).with_for_update().first()
        if not order:
            return {"error": "Purchase order not found"}, 404
        if not user_order_access(db, order, current_user_email):
            return {"error": "Permission denied"}, 403
        if order.status not in {"approved", "partially_received"}:
            return {"error": "Only approved orders can receive goods"}, 409
        user = db.query(User).filter_by(email=current_user_email).first()
        order_items = {
            item.id: item
            for item in db.query(PurchaseOrderItem)
            .filter_by(purchase_order_id=order.id)
            .with_for_update()
            .all()
        }
        received_any = set()
        for receipt in receipts:
            if not isinstance(receipt, dict):
                return {"error": "Each receipt item must be an object"}, 400
            try:
                line_id = parse_positive_integer(receipt.get("item_id"), "Item ID")
                quantity = parse_positive_integer(receipt.get("quantity"), "Received quantity")
            except ValueError as exc:
                return {"error": str(exc)}, 400
            if line_id not in order_items:
                return {"error": "Receipt item does not belong to this purchase order"}, 400
            line = order_items[line_id]
            if line.received_qty + quantity > line.ordered_qty:
                return {"error": "Cannot receive more than the ordered quantity"}, 409
            line.received_qty += quantity
            received_any.add(line.id)
            db.add(
                StockMovement(
                    product_id=line.product_id,
                    quantity=quantity,
                    reason="purchase",
                    reference_id=order.id,
                    created_by=user.id,
                )
            )
        if len(received_any) != len(receipts):
            return {"error": "Duplicate receipt line items are not allowed"}, 400
        remaining = (
            db.query(func.count(PurchaseOrderItem.id))
            .filter(
                PurchaseOrderItem.purchase_order_id == order.id,
                PurchaseOrderItem.received_qty < PurchaseOrderItem.ordered_qty,
            )
            .scalar()
        )
        order.status = "partially_received" if remaining else "received"
        db.commit()
        return serialize_order(order, db), 200
    except IntegrityError:
        db.rollback()
        return {"error": "Receipt violates a purchase-order constraint"}, 409
    finally:
        db.close()


@purchase_orders_bp.post("/<int:order_id>/cancel")
@token_required
@role_required("Owner", "Manager")
def cancel_purchase_order(current_user_email, order_id):
    db = SessionLocal()
    try:
        order = db.query(PurchaseOrder).filter_by(id=order_id).with_for_update().first()
        if not order:
            return {"error": "Purchase order not found"}, 404
        if not user_order_access(db, order, current_user_email):
            return {"error": "Permission denied"}, 403
        if order.status not in {"draft", "approved"}:
            return {"error": "Only draft or approved orders can be cancelled"}, 409
        if any(item.received_qty for item in db.query(PurchaseOrderItem).filter_by(purchase_order_id=order.id)):
            return {"error": "Orders with received goods cannot be cancelled"}, 409
        order.status = "cancelled"
        db.commit()
        return serialize_order(order, db), 200
    finally:
        db.close()
