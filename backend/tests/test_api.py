from backend.models.category import Category
from backend.models.products import Product
from backend.models.purchase_order_item import PurchaseOrderItem
from backend.models.purchase_orders import PurchaseOrder
from backend.models.stock_movement import StockMovement
from backend.models.supplier import Supplier
from backend.models.user import User
from backend.utils.jwt_handler import tokenizing
from backend.utils.password import is_bcrypt_hash


def api_request(api, method, path, role=None, json=None, token=None):
    access_token = token or (api["tokens"][role] if role else None)
    headers = (
        {"Authorization": f"Bearer {access_token}"}
        if access_token
        else {}
    )
    return getattr(api["client"], method)(path, headers=headers, json=json)


def test_register_creates_staff_and_hashes_password(api):
    response = api_request(
        api,
        "post",
        "/api/auth/register",
        json={
            "name": "New Staff",
            "email": "new@example.test",
            "password": "Password123",
            "role": "Owner",
        },
    )

    assert response.status_code == 201
    with api["sessions"]() as db:
        user = db.query(User).filter_by(email="new@example.test").one()
        assert user.role == "Staff"
        assert is_bcrypt_hash(user.password)
        assert user.password != "Password123"


def test_login_returns_access_and_refresh_tokens(api):
    with api["sessions"]() as db:
        user = db.query(User).filter_by(email="staff@example.test").one()
        from backend.utils.password import hash_password

        user.password = hash_password("Password123")
        db.commit()

    response = api_request(
        api,
        "post",
        "/api/auth/login",
        json={"email": "staff@example.test", "password": "Password123"},
    )
    body = response.get_json()

    assert response.status_code == 200
    assert body["access_token"] == body["token"]
    assert body["refresh_token"]
    assert body["access_token"] != body["refresh_token"]


def test_refresh_rotates_refresh_token_and_rejects_reuse(api):
    refresh_token = tokenizing("staff@example.test", "Staff", "refresh")
    response = api_request(
        api,
        "post",
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["access_token"]
    assert body["refresh_token"] != refresh_token

    replay = api_request(
        api,
        "post",
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert replay.status_code == 401


def test_logout_revokes_access_and_refresh_tokens(api):
    access_token = tokenizing("staff@example.test", "Staff")
    refresh_token = tokenizing("staff@example.test", "Staff", "refresh")
    response = api_request(
        api,
        "post",
        "/api/auth/logout",
        token=access_token,
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    access_response = api_request(
        api,
        "get",
        "/api/auth/me",
        token=access_token,
    )
    refresh_response = api_request(
        api,
        "post",
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert access_response.status_code == 401
    assert refresh_response.status_code == 401


def test_role_permissions_for_catalog_and_supplier_routes(api):
    staff_write = api_request(
        api,
        "post",
        "/api/categories",
        role="Staff",
        json={"name": "Forbidden"},
    )
    manager_write = api_request(
        api,
        "post",
        "/api/categories",
        role="Manager",
        json={"name": "Tools"},
    )
    staff_supplier_list = api_request(
        api,
        "get",
        "/api/suppliers",
        role="Staff",
    )
    manager_category_list = api_request(
        api,
        "get",
        "/api/categories",
        role="Manager",
    )

    assert staff_write.status_code == 403
    assert manager_write.status_code == 201
    assert staff_supplier_list.status_code == 403
    assert manager_category_list.status_code == 200


def test_sale_updates_stock_ledger_and_blocks_overselling(api):
    with api["sessions"]() as db:
        owner = db.query(User).filter_by(email="owner@example.test").one()
        category = Category(name="Hardware")
        db.add(category)
        db.flush()
        product = Product(
            sku="HAMMER-1",
            name="Hammer",
            category_id=category.id,
            unit="each",
            cost_price=2,
            selling_price=5,
            reorder_level=0,
        )
        db.add(product)
        db.flush()
        db.add(
            StockMovement(
                product_id=product.id,
                quantity=3,
                reason="purchase",
                created_by=owner.id,
            )
        )
        product_id = product.id
        db.commit()

    sale = api_request(
        api,
        "post",
        "/api/sales",
        role="Staff",
        json={"items": [{"product_id": product_id, "quantity": 2}]},
    )
    oversell = api_request(
        api,
        "post",
        "/api/sales",
        role="Staff",
        json={"items": [{"product_id": product_id, "quantity": 2}]},
    )

    assert sale.status_code == 201
    assert sale.get_json()["total_amount"] == "10.00"
    assert oversell.status_code == 409
    with api["sessions"]() as db:
        stock = sum(
            movement.quantity
            for movement in db.query(StockMovement)
            .filter_by(product_id=product_id)
            .all()
        )
        assert stock == 1


def test_purchase_order_partial_receipt_and_over_receipt(api):
    with api["sessions"]() as db:
        manager = db.query(User).filter_by(email="manager@example.test").one()
        category = Category(name="Office")
        supplier = Supplier(name="Office Supply")
        db.add_all([category, supplier])
        db.flush()
        product = Product(
            sku="PAPER-1",
            name="Paper",
            category_id=category.id,
            unit="pack",
            cost_price=1,
            selling_price=2,
        )
        db.add(product)
        db.flush()
        order = PurchaseOrder(
            supplier_id=supplier.id,
            created_by=manager.id,
            status="draft",
        )
        db.add(order)
        db.flush()
        line = PurchaseOrderItem(
            purchase_order_id=order.id,
            product_id=product.id,
            ordered_qty=5,
            received_qty=0,
            unit_cost=1,
        )
        db.add(line)
        db.commit()
        order_id = order.id
        line_id = line.id

    approval = api_request(
        api,
        "post",
        f"/api/purchase-orders/{order_id}/approve",
        role="Owner",
    )
    receipt = api_request(
        api,
        "post",
        f"/api/purchase-orders/{order_id}/receive",
        role="Manager",
        json={"items": [{"item_id": line_id, "quantity": 3}]},
    )
    excessive_receipt = api_request(
        api,
        "post",
        f"/api/purchase-orders/{order_id}/receive",
        role="Manager",
        json={"items": [{"item_id": line_id, "quantity": 3}]},
    )

    assert approval.status_code == 200
    assert receipt.status_code == 200
    assert receipt.get_json()["status"] == "partially_received"
    assert excessive_receipt.status_code == 409
    with api["sessions"]() as db:
        movements = db.query(StockMovement).filter_by(reason="purchase").all()
        assert len(movements) == 1
        assert movements[0].quantity == 3


def test_reports_restrict_valuation_to_owner(api):
    manager_response = api_request(
        api,
        "get",
        "/api/reports/valuation",
        role="Manager",
    )
    owner_response = api_request(
        api,
        "get",
        "/api/reports/valuation",
        role="Owner",
    )

    assert manager_response.status_code == 403
    assert owner_response.status_code == 200
