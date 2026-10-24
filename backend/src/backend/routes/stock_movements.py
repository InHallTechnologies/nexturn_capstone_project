from flask import Blueprint, request
from sqlalchemy import func

from backend.database import SessionLocal
from backend.models.products import Product
from backend.models.stock_movement import StockMovement
from backend.models.user import User
from backend.schemas.stock_movement import validate_stock_movement
from backend.utils.middleware import role_required, token_required
from backend.routes.common import pagination, request_object, sort_query


stock_movements_bp = Blueprint(
    "stock_movements", __name__, url_prefix="/api/stock-movements"
)


def serialize_movement(movement):
    return {
        "id": movement.id,
        "product_id": movement.product_id,
        "quantity": movement.quantity,
        "reason": movement.reason,
        "notes": movement.notes,
        "reference_id": movement.reference_id,
        "created_by": movement.created_by,
        "created_at": movement.created_at.isoformat(),
    }


@stock_movements_bp.get("")
@token_required
@role_required("Owner", "Manager")
def list_stock_movements(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        query = db.query(StockMovement)
        product_id = request.args.get("product_id")
        if product_id:
            try:
                product_id = int(product_id)
            except ValueError:
                return {"error": "product_id must be an integer"}, 400
            query = query.filter(StockMovement.product_id == product_id)
        reason = request.args.get("reason")
        if reason:
            query = query.filter(StockMovement.reason == reason.strip().lower())
        query, error = sort_query(
            query,
            {
                "id": StockMovement.id,
                "product_id": StockMovement.product_id,
                "quantity": StockMovement.quantity,
                "reason": StockMovement.reason,
                "created_at": StockMovement.created_at,
            },
            default="created_at",
        )
        if error:
            return error
        total = query.count()
        movements = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "items": [serialize_movement(item) for item in movements],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }, 200
    finally:
        db.close()


@stock_movements_bp.post("/adjustments")
@token_required
@role_required("Owner", "Manager")
def create_adjustment(current_user_email):
    data, error = request_object()
    if error:
        return error
    note = data.get("notes")
    if not isinstance(note, str) or not note.strip():
        return {"error": "A reason for the adjustment is required"}, 400
    if len(note.strip()) > 500:
        return {"error": "Adjustment reason cannot exceed 500 characters"}, 400
    try:
        values = validate_stock_movement(
            {
                "product_id": data.get("product_id"),
                "quantity": data.get("quantity"),
                "reason": "adjustment",
            }
        )
    except ValueError as exc:
        return {"error": str(exc)}, 400
    db = SessionLocal()
    try:
        product = db.query(Product).filter_by(id=values["product_id"]).with_for_update().first()
        if not product:
            return {"error": "Product not found"}, 404
        current_stock = (
            db.query(func.coalesce(func.sum(StockMovement.quantity), 0))
            .filter(StockMovement.product_id == product.id)
            .scalar()
        )
        if int(current_stock) + values["quantity"] < 0:
            return {"error": "Adjustment cannot reduce stock below zero"}, 409
        user = db.query(User).filter_by(email=current_user_email).first()
        movement = StockMovement(
            **values,
            notes=note.strip(),
            created_by=user.id,
        )
        db.add(movement)
        db.commit()
        db.refresh(movement)
        return serialize_movement(movement), 201
    finally:
        db.close()
