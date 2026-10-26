import os
from decimal import Decimal

from backend.database import SessionLocal
from backend.models.category import Category
from backend.models.products import Product
from backend.models.stock_movement import StockMovement
from backend.models.supplier import Supplier
from backend.models.user import User
from backend.utils.password import hash_password


DEMO_CATEGORIES = (
    {"name": "Beverages", "description": "Packaged drinks and bottled water"},
    {"name": "Pantry", "description": "Shelf-stable food and household essentials"},
    {"name": "Accessories", "description": "Small retail and checkout accessories"},
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
        if (
            db.query(Category).count()
            or db.query(Product).count()
            or db.query(Supplier).count()
            or db.query(StockMovement).count()
        ):
            print("Inventory data already exists — skipping demo inventory.")
            return

        staff = (
            db.query(User)
            .filter_by(role="Staff")
            .order_by(User.id)
            .first()
        )
        if not staff:
            raise RuntimeError("Seed role accounts before seeding inventory")

        categories = {item["name"]: Category(**item) for item in DEMO_CATEGORIES}
        db.add_all(categories.values())
        db.flush()

        supplier = Supplier(
            name="Northstar Wholesale",
            contact="555-0100",
            email="orders@northstar.example",
            address="100 Market Street",
            payment_terms="Net 30",
        )
        db.add(supplier)

        for item in DEMO_PRODUCTS:
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

        db.commit()
        print("Demo inventory data seeded.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
    seed_inventory()