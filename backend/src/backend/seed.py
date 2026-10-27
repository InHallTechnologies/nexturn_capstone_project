import os
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from backend.database import SessionLocal
from backend.models.category import Category
from backend.models.purchase_order_item import PurchaseOrderItem
from backend.models.purchase_orders import PurchaseOrder
from backend.models.products import Product
from backend.models.sale_items import SaleItem
from backend.models.sales import Sale
from backend.models.stock_movement import StockMovement
from backend.models.supplier import Supplier
from backend.models.user import User
from backend.utils.password import hash_password


DEMO_CATEGORIES = (
    {"name": "Beverages", "description": "Packaged drinks and bottled water"},
    {"name": "Pantry", "description": "Shelf-stable food and household essentials"},
    {"name": "Accessories", "description": "Small retail and checkout accessories"},
    {"name": "Snacks", "description": "Packaged snacks and biscuits"},
    {"name": "Dairy & Chilled", "description": "Milk and other chilled essentials"},
    {"name": "Personal Care", "description": "Everyday personal care products"},
    {"name": "Home Care", "description": "Cleaning and household care products"},
)

DEMO_SUPPLIERS = (
    {
        "name": "Northstar Wholesale",
        "contact": "555-0100",
        "email": "orders@northstar.example",
        "address": "100 Market Street",
        "payment_terms": "Net 30",
    },
    {
        "name": "Apex Global Distributors",
        "contact": "555-0101",
        "email": "orders@apex.example",
        "address": "42 Commerce Avenue",
        "payment_terms": "Net 30",
    },
    {
        "name": "Metro Beverage Supply",
        "contact": "555-0102",
        "email": "sales@metrobev.example",
        "address": "18 Riverside Road",
        "payment_terms": "Net 15",
    },
    {
        "name": "City Packaging House",
        "contact": "555-0103",
        "email": "orders@citypack.example",
        "address": "9 Industrial Park",
        "payment_terms": "Net 30",
    },
    {
        "name": "Greenfield Foods",
        "contact": "555-0104",
        "email": "supply@greenfield.example",
        "address": "75 Orchard Lane",
        "payment_terms": "Net 15",
    },
)

DEMO_PRODUCTS = (
    {
        "sku": "BEV-WATER-001",
        "name": "Spring Water 500ml",
        "category": "Beverages",
        "unit": "bottle",
        "cost_price": "12.00",
        "selling_price": "20.00",
        "reorder_level": 24,
        "stock": 60,
    },
    {
        "sku": "BEV-COFFEE-001",
        "name": "Ground Coffee 250g",
        "category": "Beverages",
        "unit": "bag",
        "cost_price": "180.00",
        "selling_price": "320.00",
        "reorder_level": 8,
        "stock": 5,
    },
    {
        "sku": "PAN-PASTA-001",
        "name": "Penne Pasta 500g",
        "category": "Pantry",
        "unit": "pack",
        "cost_price": "45.00",
        "selling_price": "80.00",
        "reorder_level": 12,
        "stock": 30,
    },
    {
        "sku": "ACC-BAG-001",
        "name": "Reusable Shopping Bag",
        "category": "Accessories",
        "unit": "each",
        "cost_price": "25.00",
        "selling_price": "50.00",
        "reorder_level": 10,
        "stock": 0,
    },
    {
        "sku": "BEV-JUICE-001",
        "name": "Citrus Juice 1L",
        "category": "Beverages",
        "unit": "bottle",
        "cost_price": "55.00",
        "selling_price": "85.00",
        "reorder_level": 12,
        "stock": 40,
    },
    {
        "sku": "BEV-TEA-001",
        "name": "Assorted Tea Bags 100ct",
        "category": "Beverages",
        "unit": "box",
        "cost_price": "110.00",
        "selling_price": "165.00",
        "reorder_level": 10,
        "stock": 35,
    },
    {
        "sku": "PAN-RICE-001",
        "name": "Basmati Rice 5kg",
        "category": "Pantry",
        "unit": "bag",
        "cost_price": "320.00",
        "selling_price": "425.00",
        "reorder_level": 10,
        "stock": 35,
    },
    {
        "sku": "PAN-OIL-001",
        "name": "Sunflower Oil 1L",
        "category": "Pantry",
        "unit": "bottle",
        "cost_price": "105.00",
        "selling_price": "145.00",
        "reorder_level": 12,
        "stock": 28,
    },
    {
        "sku": "SNK-CHIPS-001",
        "name": "Sea Salt Potato Chips",
        "category": "Snacks",
        "unit": "bag",
        "cost_price": "18.00",
        "selling_price": "30.00",
        "reorder_level": 20,
        "stock": 60,
    },
    {
        "sku": "SNK-BISCUIT-001",
        "name": "Butter Biscuits 200g",
        "category": "Snacks",
        "unit": "pack",
        "cost_price": "24.00",
        "selling_price": "40.00",
        "reorder_level": 15,
        "stock": 45,
    },
    {
        "sku": "DAI-MILK-001",
        "name": "Full Cream Milk 1L",
        "category": "Dairy & Chilled",
        "unit": "carton",
        "cost_price": "48.00",
        "selling_price": "62.00",
        "reorder_level": 12,
        "stock": 30,
    },
    {
        "sku": "PER-SOAP-001",
        "name": "Aloe Hand Soap",
        "category": "Personal Care",
        "unit": "bottle",
        "cost_price": "38.00",
        "selling_price": "60.00",
        "reorder_level": 10,
        "stock": 45,
    },
    {
        "sku": "HOM-CLEANER-001",
        "name": "Multi-Surface Cleaner 500ml",
        "category": "Home Care",
        "unit": "bottle",
        "cost_price": "52.00",
        "selling_price": "80.00",
        "reorder_level": 10,
        "stock": 24,
    },
    {
        "sku": "ACC-NOTEBOOK-001",
        "name": "Ruled Notebook",
        "category": "Accessories",
        "unit": "each",
        "cost_price": "22.00",
        "selling_price": "35.00",
        "reorder_level": 10,
        "stock": 30,
    },
)

DEMO_PURCHASE_ORDERS = (
    {
        "supplier": "Apex Global Distributors",
        "status": "approved",
        "expected_date": date(2026, 11, 15),
        "items": (("BEV-JUICE-001", 24, 0), ("BEV-WATER-001", 48, 0)),
    },
    {
        "supplier": "Metro Beverage Supply",
        "status": "partially_received",
        "expected_date": date(2026, 11, 18),
        "items": (("BEV-TEA-001", 25, 10),),
    },
    {
        "supplier": "City Packaging House",
        "status": "received",
        "expected_date": date(2026, 10, 20),
        "items": (("PAN-RICE-001", 20, 20),),
    },
    {
        "supplier": "Greenfield Foods",
        "status": "draft",
        "expected_date": date(2026, 11, 22),
        "items": (("SNK-BISCUIT-001", 50, 0), ("SNK-CHIPS-001", 40, 0)),
    },
)

DEMO_SALES = (
    (1, (("BEV-JUICE-001", 2), ("SNK-CHIPS-001", 3))),
    (2, (("PAN-RICE-001", 1), ("SNK-BISCUIT-001", 2))),
    (3, (("BEV-TEA-001", 2), ("DAI-MILK-001", 2))),
    (4, (("BEV-JUICE-001", 3), ("PER-SOAP-001", 1))),
    (5, (("PAN-RICE-001", 2), ("HOM-CLEANER-001", 1))),
    (6, (("SNK-CHIPS-001", 4), ("ACC-NOTEBOOK-001", 2))),
    (7, (("BEV-TEA-001", 1), ("DAI-MILK-001", 3))),
    (8, (("BEV-JUICE-001", 1), ("SNK-BISCUIT-001", 3))),
)

DEMO_USERS = [
    {
        "name": "Demo Owner",
        "email": "owner@example.com",
        "password_env": "OWNER_INITIAL_PASSWORD",
        "role": "Owner",
    },
    {
        "name": "Demo Manager",
        "email": "manager@example.com",
        "password_env": "MANAGER_INITIAL_PASSWORD",
        "role": "Manager",
    },
    {
        "name": "Demo Staff",
        "email": "staff@example.com",
        "password_env": "STAFF_INITIAL_PASSWORD",
        "role": "Staff",
    },
]


def seed_users():
    db=SessionLocal()
    try:
        for demo_user in DEMO_USERS:
            email = demo_user["email"].strip().lower()
            existing_user =db.query(User).filter_by(email=email).first()

            if existing_user:
                print(f"Already exists: {email} — skipping")
                continue

            password = os.getenv(demo_user["password_env"])
            if not password:
                raise RuntimeError(
                    f"{demo_user['password_env']} must be set to create the "
                    f"{demo_user['role']} seed account"
                )

            user_document = User(
                name= demo_user["name"],
                email= email,
                password=hash_password(password),
                role= demo_user["role"],
            )

            db.add(user_document)
            print(f"Created {demo_user['role']}: {email}")
        db.commit()
        print("User seeding completed.")
    except Exception:
        db.rollback()
        raise
    
    finally:
        db.close()


def seed_inventory():
    db = SessionLocal()
    try:
        staff = (
            db.query(User)
            .filter_by(role="Staff")
            .order_by(User.id)
            .first()
        )
        manager = (
            db.query(User)
            .filter_by(role="Manager")
            .order_by(User.id)
            .first()
        )
        if not staff or not manager:
            raise RuntimeError("Seed role accounts before seeding inventory")

        categories = {item.name: item for item in db.query(Category).all()}
        for item in DEMO_CATEGORIES:
            if item["name"] not in categories:
                category = Category(**item)
                db.add(category)
                categories[item["name"]] = category
        db.flush()

        suppliers = {item.email: item for item in db.query(Supplier).all()}
        for item in DEMO_SUPPLIERS:
            if item["email"] not in suppliers:
                supplier = Supplier(**item)
                db.add(supplier)
                suppliers[item["email"]] = supplier
        db.flush()

        products = {item.sku: item for item in db.query(Product).all()}

        for item in DEMO_PRODUCTS:
            if item["sku"] in products:
                continue
            product = Product(
                sku=item["sku"],
                name=item["name"],
                category_id=categories[item["category"]].id,
                unit=item["unit"],
                cost_price=Decimal(item["cost_price"]),
                selling_price=Decimal(item["selling_price"]),
                reorder_level=item["reorder_level"],
            )
            db.add(product)
            db.flush()
            products[item["sku"]] = product
            if item["stock"]:
                db.add(
                    StockMovement(
                        product_id=product.id,
                        quantity=item["stock"],
                        reason="adjustment",
                        notes="Demo opening stock",
                        created_by=staff.id,
                    )
                )

        supplier_ids = {
            item["name"]: suppliers[item["email"]].id
            for item in DEMO_SUPPLIERS
        }
        for order_data in DEMO_PURCHASE_ORDERS:
            existing_order = (
                db.query(PurchaseOrder)
                .filter_by(
                    supplier_id=supplier_ids[order_data["supplier"]],
                    created_by=manager.id,
                    expected_date=order_data["expected_date"],
                )
                .first()
            )
            if existing_order:
                continue

            order = PurchaseOrder(
                supplier_id=supplier_ids[order_data["supplier"]],
                created_by=manager.id,
                status=order_data["status"],
                expected_date=order_data["expected_date"],
            )
            db.add(order)
            db.flush()
            for sku, ordered_qty, received_qty in order_data["items"]:
                product = products[sku]
                db.add(
                    PurchaseOrderItem(
                        purchase_order_id=order.id,
                        product_id=product.id,
                        ordered_qty=ordered_qty,
                        received_qty=received_qty,
                        unit_cost=product.cost_price,
                    )
                )
                if received_qty:
                    db.add(
                        StockMovement(
                            product_id=product.id,
                            quantity=received_qty,
                            reason="purchase",
                            notes="Demo purchase receipt",
                            reference_id=order.id,
                            created_by=manager.id,
                        )
                    )

        for sale_number, sale_items in DEMO_SALES:
            bill_number = f"DEMO-INV-{sale_number:04d}"
            if db.query(Sale).filter_by(bill_number=bill_number).first():
                continue

            sale = Sale(
                bill_number=bill_number,
                created_by=staff.id,
                total_amount=Decimal("0.00"),
                created_at=datetime.now(timezone.utc)
                - timedelta(days=sale_number - 1),
            )
            db.add(sale)
            db.flush()
            total_amount = Decimal("0.00")
            for sku, quantity in sale_items:
                product = products[sku]
                subtotal = product.selling_price * quantity
                total_amount += subtotal
                db.add(
                    SaleItem(
                        sale_id=sale.id,
                        product_id=product.id,
                        quantity=quantity,
                        price_at_sale=product.selling_price,
                        subtotal=subtotal,
                    )
                )
                db.add(
                    StockMovement(
                        product_id=product.id,
                        quantity=-quantity,
                        reason="sale",
                        notes="Demo sale",
                        reference_id=sale.id,
                        created_by=staff.id,
                        created_at=sale.created_at,
                    )
                )
            sale.total_amount = total_amount

        db.commit()
        print("Demo inventory and transaction data seeded.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
    seed_inventory()