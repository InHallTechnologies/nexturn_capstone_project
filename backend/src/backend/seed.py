import os
from datetime import datetime,timedelta
from uuid import uuid4
from pymongo import ReturnDocument
from werkzeug.security import generate_password_hash
from . import create_app

app=create_app()
db=app.db
accounts=[("Admin","admin@campus.test","AdminPass123!","admin"),("Organizer","organizer@campus.test","OrganizerPass123!","organizer"),("Student","student@campus.test","StudentPass123!","student")]
users={}
for name,email,password,role in accounts:
    db.users.update_one({"email":email},{"$setOnInsert":{"_id":str(uuid4()),"name":name,"email":email,"password_hash":generate_password_hash(password),"role":role,"created_at":datetime.now()}},upsert=True)
    users[role]=db.users.find_one({"email":email})
venue=db.venues.find_one_and_update({"name":"Main Auditorium"},{"$setOnInsert":{"_id":str(uuid4()),"name":"Main Auditorium","location":"Campus Center","capacity":300}},upsert=True,return_document=ReturnDocument.AFTER)
db.events.update_one({"title":"Welcome Week Live","organizer_id":users["organizer"]["_id"]},{"$setOnInsert":{"_id":str(uuid4()),"title":"Welcome Week Live","description":"Live music and student club showcases.","category":"Music","tags":["welcome","live"],"banner_url":None,"start_time":datetime.now()+timedelta(days=7),"end_time":datetime.now()+timedelta(days=7,hours=3),"venue_id":venue["_id"],"capacity":250,"seats_sold":0,"status":"approved","organizer_id":users["organizer"]["_id"],"created_at":datetime.now()}},upsert=True)
print("Seeded demo accounts: admin@campus.test, organizer@campus.test, student@campus.test")
