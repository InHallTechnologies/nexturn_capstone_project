from datetime import date, timedelta

from flask import Blueprint, request
from sqlalchemy import func

from backend.database import SessionLocal
from backend.models.products import Product
from backend.models.sales import Sale
from backend.models.stock_movement import StockMovement
from backend.utils.middleware import role_required, token_required
from backend.routes.common import pagination, sort_query


reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


def stock_query(db):
    totals = stock_totals(db)
    return (
        db.query(Product, func.coalesce(totals.c.stock, 0).label("stock"))
        .outerjoin(totals, totals.c.product_id == Product.id)
    )


def stock_totals(db):
    return (
        db.query(
            StockMovement.product_id.label("product_id"),
            func.sum(StockMovement.quantity).label("stock"),
        )
        .group_by(StockMovement.product_id)
        .subquery()
    )


@reports_bp.get("/low-stock")
@token_required
@role_required("Owner", "Manager")
def low_stock_report(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        query = stock_query(db).filter(
            func.coalesce(
                db.query(func.sum(StockMovement.quantity))
                .filter(StockMovement.product_id == Product.id)
                .correlate(Product)
                .scalar_subquery(),
                0,
            )
            <= Product.reorder_level
        )
        query, error = sort_query(
            query,
            {
                "id": Product.id,
                "sku": Product.sku,
                "name": Product.name,
                "reorder_level": Product.reorder_level,
            },
        )
        if error:
            return error
        total = query.count()
        rows = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "items": [
                {
                    "product_id": product.id,
                    "sku": product.sku,
                    "name": product.name,
                    "stock": int(stock),
                    "reorder_level": product.reorder_level,
                }
                for product, stock in rows
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }, 200
    finally:
        db.close()


@reports_bp.get("/valuation")
@token_required
@role_required("Owner")
def stock_valuation_report(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        totals = stock_totals(db)
        query = stock_query(db)
        query, error = sort_query(
            query,
            {
                "id": Product.id,
                "sku": Product.sku,
                "name": Product.name,
                "cost_price": Product.cost_price,
            },
        )
        if error:
            return error
        total = query.count()
        rows = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        total_value = (
            db.query(
                func.coalesce(
                    func.sum(
                        Product.cost_price
                        * func.coalesce(totals.c.stock, 0)
                    ),
                    0,
                )
            )
            .outerjoin(totals, totals.c.product_id == Product.id)
            .scalar()
        )
        products = []
        for product, stock in rows:
            stock = int(stock)
            value = product.cost_price * stock
            products.append(
                {
                    "product_id": product.id,
                    "sku": product.sku,
                    "name": product.name,
                    "stock": stock,
                    "cost_price": str(product.cost_price),
                    "value_at_cost": str(value),
                }
            )
        return {
            "items": products,
            "total_value_at_cost": str(total_value),
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }, 200
    finally:
        db.close()


@reports_bp.get("/ledger-balance")
@token_required
@role_required("Owner")
def ledger_balance_report(current_user_email):
    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        query = stock_query(db)
        query, error = sort_query(
            query,
            {"id": Product.id, "sku": Product.sku, "name": Product.name},
        )
        if error:
            return error
        total = query.count()
        rows = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        return {
            "items": [
                {
                    "product_id": product.id,
                    "sku": product.sku,
                    "name": product.name,
                    "stock_from_movements": int(stock),
                }
                for product, stock in rows
            ],
            "recomputed_from_movements": True,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }, 200
    finally:
        db.close()


@reports_bp.get("/sales-by-day")
@token_required
@role_required("Owner")
def sales_by_day_report(current_user_email):
    today = date.today()
    try:
        start_date = date.fromisoformat(request.args.get("start_date", (today - timedelta(days=29)).isoformat()))
        end_date = date.fromisoformat(request.args.get("end_date", today.isoformat()))
    except ValueError:
        return {"error": "Dates must use YYYY-MM-DD format"}, 400
    if end_date < start_date:
        return {"error": "end_date must not be earlier than start_date"}, 400

    args, error = pagination()
    if error:
        return error
    page, per_page = args
    db = SessionLocal()
    try:
        sale_date = func.date(Sale.created_at).label("sale_date")
        bill_count = func.count(Sale.id).label("bill_count")
        total_sales = func.coalesce(func.sum(Sale.total_amount), 0).label("total_sales")
        query = (
            db.query(
                sale_date,
                bill_count,
                total_sales,
            )
            .filter(
                func.date(Sale.created_at) >= start_date,
                func.date(Sale.created_at) <= end_date,
            )
            .group_by(func.date(Sale.created_at))
        )
        query, error = sort_query(
            query,
            {"date": sale_date, "bill_count": bill_count, "total_sales": total_sales},
            default="date",
        )
        if error:
            return error
        total = query.count()
        rows = query.offset((page - 1) * per_page).limit(per_page).all()
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "items": [
                {
                    "date": str(sale_date),
                    "bill_count": int(bill_count),
                    "total_sales": str(total_sales),
                }
                for sale_date, bill_count, total_sales in rows
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
            },
        }, 200
    finally:
        db.close()
