from flask import Flask
from backend.routes.auth import auth_bp

app=Flask(__name__)

app.register_blueprint(auth_bp)

if __name__=="__main__":
    app.run(debug=True,use_reloader=False ,host="0.0.0.0", port=8000)