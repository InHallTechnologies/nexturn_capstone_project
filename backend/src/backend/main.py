from flask import Flask
from backend.routes.auth import auth_bp
from backend.routes.categories import categories_bp
from backend.routes.products import products_bp
from backend.routes.suppliers import suppliers_bp
from backend.routes.purchase_orders import purchase_orders_bp
from backend.routes.sales import sales_bp
from backend.routes.stock_movements import stock_movements_bp
from backend.routes.reports import reports_bp

app=Flask(__name__)

for blueprint in (
    auth_bp,
    categories_bp,
    products_bp,
    suppliers_bp,
    purchase_orders_bp,
    sales_bp,
    stock_movements_bp,
    reports_bp,
):
    app.register_blueprint(blueprint)

if __name__=="__main__":
    app.run(debug=True,use_reloader=False ,host="0.0.0.0", port=8000)