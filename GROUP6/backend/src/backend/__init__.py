from flask import Flask, request
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import datetime

app = Flask(__name__)
db = MongoClient("mongodb+srv://jira:EQeauM0LDROMMIUT@cluster0.gtfzanv.mongodb.net/")["tracker"]

FLOW = {
    "Backlog": ["To Do"],
    "To Do": ["Backlog", "In Progress"],
    "In Progress": ["To Do", "In Review"],
    "In Review": ["In Progress", "Done"],
    "Done": ["In Review"],
}

@app.after_request
def allow_react(res):
    res.headers["Access-Control-Allow-Origin"] = "*"
    res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT"
    return res

def new_id():
    return str(uuid.uuid4())

def now():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def current_user():
    token = request.headers.get("Authorization")
    if not token:
        return None
    return db.users.find_one({"token": token})

def get_project(project_id, user):
    project = db.projects.find_one({"_id": project_id})
    if project and any(m["id"] == user["_id"] for m in project["members"]):
        return project
    return None

@app.post("/register")
def register():
    data = request.json
    if not data.get("name") or not data.get("email") or not data.get("password"):
        return {"error": "name, email and password are required"}, 400
    if db.users.find_one({"email": data["email"]}):
        return {"error": "Email already registered"}, 409
    db.users.insert_one({
        "_id": new_id(),
        "name": data["name"],
        "email": data["email"],
        "password": generate_password_hash(data["password"]),
        "token": None,
    })
    return {"message": "Registered"}, 201

@app.post("/login")
def login():
    data = request.json
    user = db.users.find_one({"email": data.get("email")})
    if not user or not check_password_hash(user["password"], data.get("password", "")):
        return {"error": "Wrong email or password"}, 401
    token = new_id()
    db.users.update_one({"_id": user["_id"]}, {"$set": {"token": token}})
    return {"token": token, "id": user["_id"], "name": user["name"]}

@app.post("/logout")
def logout():
    user = current_user()
    if user:
        db.users.update_one({"_id": user["_id"]}, {"$set": {"token": None}})
    return {"message": "Logged out"}

@app.get("/projects")
def list_projects():
    user = current_user()
    if not user:
        return {"error": "Login required"}, 401
    return list(db.projects.find({"members.id": user["_id"]}))

@app.post("/projects")
def create_project():
    user = current_user()
    if not user:
        return {"error": "Login required"}, 401
    data = request.json
    if not data.get("name") or not data.get("key"):
        return {"error": "name and key are required"}, 400
    project = {
        "_id": new_id(),
        "name": data["name"],
        "key": data["key"].upper(),
        "owner": user["_id"],
        "members": [{"id": user["_id"], "name": user["name"]}],
    }
    db.projects.insert_one(project)
    return project, 201

@app.post("/projects/<project_id>/members")
def add_member(project_id):
    user = current_user()
    if not user:
        return {"error": "Login required"}, 401
    project = get_project(project_id, user)
    if not project:
        return {"error": "Project not found"}, 404
    if project["owner"] != user["_id"]:
        return {"error": "Only the owner can add members"}, 403
    other = db.users.find_one({"email": request.json.get("email")})
    if not other:
        return {"error": "No user with that email"}, 404
    if any(m["id"] == other["_id"] for m in project["members"]):
        return {"error": "Already a member"}, 409
    db.projects.update_one(
        {"_id": project_id},
        {"$push": {"members": {"id": other["_id"], "name": other["name"]}}},
    )
    return {"message": "Member added"}, 201

@app.get("/projects/<project_id>/issues")
def list_issues(project_id):
    user = current_user()
    if not user:
        return {"error": "Login required"}, 401
    if not get_project(project_id, user):
        return {"error": "Project not found"}, 404
    return list(db.issues.find({"project_id": project_id}))

@app.post("/projects/<project_id>/issues")
def create_issue(project_id):
    user = current_user()
    if not user:
        return {"error": "Login required"}, 401
    project = get_project(project_id, user)
    if not project:
        return {"error": "Project not found"}, 404
    data = request.json
    if not data.get("title"):
        return {"error": "title is required"}, 400

    assignee = None
    for m in project["members"]:
        if m["id"] == data.get("assignee"):
            assignee = m

    number = db.issues.count_documents({"project_id": project_id}) + 1
    issue = {
        "_id": new_id(),
        "project_id": project_id,
        "key": project["key"] + "-" + str(number),
        "title": data["title"],
        "description": data.get("description", ""),
        "priority": data.get("priority", "medium"),
        "state": "Backlog",
        "assignee": assignee,
        "reporter": user["name"],
        "comments": [],
        "activity": [{"field": "created", "old": None, "new": "Backlog", "by": user["name"], "at": now()}],
    }
    db.issues.insert_one(issue)
    return issue, 201

@app.put("/issues/<issue_id>/move")
def move_issue(issue_id):
    user = current_user()
    if not user:
        return {"error": "Login required"}, 401
    issue = db.issues.find_one({"_id": issue_id})
    if not issue:
        return {"error": "Issue not found"}, 404
    project = get_project(issue["project_id"], user)
    if not project:
        return {"error": "Issue not found"}, 404

    is_assignee = issue["assignee"] and issue["assignee"]["id"] == user["_id"]
    if not is_assignee and project["owner"] != user["_id"]:
        return {"error": "Only the assignee or project owner can move this issue"}, 403

    new_state = request.json.get("state")
    if new_state not in FLOW[issue["state"]]:
        return {"error": "Cannot move from " + issue["state"] + " to " + str(new_state)}, 422

    entry = {"field": "state", "old": issue["state"], "new": new_state, "by": user["name"], "at": now()}
    db.issues.update_one(
        {"_id": issue_id},
        {"$set": {"state": new_state}, "$push": {"activity": entry}},
    )
    return {"message": "Moved"}

@app.post("/issues/<issue_id>/comments")
def add_comment(issue_id):
    user = current_user()
    if not user:
        return {"error": "Login required"}, 401
    issue = db.issues.find_one({"_id": issue_id})
    if not issue or not get_project(issue["project_id"], user):
        return {"error": "Issue not found"}, 404
    text = request.json.get("text")
    if not text:
        return {"error": "text is required"}, 400
    db.issues.update_one(
        {"_id": issue_id},
        {"$push": {"comments": {"by": user["name"], "text": text, "at": now()}}},
    )
    return {"message": "Comment added"}, 201

def main():
    app.run(debug=True)