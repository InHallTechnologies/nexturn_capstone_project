from datetime import datetime
import re
from uuid import uuid4
import secrets
from flask import Blueprint, current_app, request
from flask_jwt_extended import jwt_required
from .security import record,role_required,user_id
from .event_time import event_is_complete

student_bp=Blueprint("student",__name__)

@student_bp.get("/events")
@jwt_required()
@role_required("student")
def event_feed():
    query={"status":"approved","end_time":{"$gt":datetime.now()}}
    category=request.args.get("category")
    if category:
        query["category"]={"$regex":f"^{re.escape(category)}$","$options":"i"}
    if request.args.get("from") or request.args.get("to"):
        query["start_time"]={}
        try:
            if request.args.get("from"):
                query["start_time"]["$gte"]=datetime.strptime(request.args["from"], "%Y-%m-%d")
            if request.args.get("to"):
                query["start_time"]["$lte"]=datetime.strptime(request.args["to"], "%Y-%m-%dT%H:%M:%S") if "T" in request.args["to"] else datetime.strptime(request.args["to"], "%Y-%m-%d")
        except ValueError:
            return {"error":"Invalid date filter"},400
    if request.args.get("search"):
        query["$or"]=[{"title":{"$regex":request.args["search"],"$options":"i"}},{"description":{"$regex":request.args["search"],"$options":"i"}}]
    events=[]
    for event in current_app.db.events.find(query).sort("start_time",1):
        venue=current_app.db.venues.find_one({"_id":event["venue_id"]})
        event["venue"]=record(venue) if venue else None
        events.append(record(event))
    return {"events":events}

@student_bp.get("/events/<event_id>")
@jwt_required()
@role_required("student")
def event_detail(event_id):
    event=current_app.db.events.find_one({"_id":event_id,"status":"approved"})
    if not event:
        return {"error":"Event not found"},404
    event["seats_remaining"]=max(0,event["capacity"]-event.get("seats_sold",0))
    event["waitlist_length"]=current_app.db.waitlist.count_documents({"event_id":event["_id"]})
    waiting=current_app.db.waitlist.find_one({"event_id":event["_id"],"student_id":user_id()})
    event["waitlist_position"]=waiting["position"] if waiting else None
    venue=current_app.db.venues.find_one({"_id":event["venue_id"]})
    event["venue"]=record(venue) if venue else None
    return {"event":record(event)}

@student_bp.post("/events/<event_id>/book")
@jwt_required()
@role_required("student")
def book_event(event_id):
    oid=event_id
    db=current_app.db
    event=db.events.find_one({"_id":oid,"status":"approved"})
    if not event:
        return {"error":"Event not found"},404
    if event_is_complete(event):
        return {"error":"This event has ended. Booking and waitlisting are closed."},409
    student=user_id()
    if db.tickets.find_one({"event_id":oid,"student_id":student,"status":{"$in":["booked","used"]}}):
        return {"error":"You already have a ticket for this event"},409
    client=current_app.mongo_client
    with client.start_session() as session:
        with session.start_transaction():
            event=db.events.find_one({"_id":oid,"status":"approved"},session=session)
            if not event or event_is_complete(event):
                return {"error":"This event has ended. Booking and waitlisting are closed."},409
            claimed=db.events.update_one({"_id":oid,"status":"approved","end_time":{"$gt":datetime.utcnow()},"$expr":{"$lt":["$seats_sold","$capacity"]}},{"$inc":{"seats_sold":1}},session=session)
            if claimed.modified_count:
                ticket={"_id":str(uuid4()),"event_id":oid,"student_id":student,"code":secrets.token_urlsafe(12),"status":"booked","booked_at":datetime.now()}
                db.tickets.insert_one(ticket,session=session)
            else:
                event=db.events.find_one({"_id":oid,"status":"approved"},session=session)
                if not event or event_is_complete(event):
                    return {"error":"This event has ended. Booking and waitlisting are closed."},409
                existing=db.waitlist.find_one({"event_id":oid,"student_id":student},session=session)
                if existing:
                    return {"error":"You are already on the waitlist","position":existing["position"]},409
                position=db.waitlist.count_documents({"event_id":oid},session=session)+1
                db.waitlist.insert_one({"_id":str(uuid4()),"event_id":oid,"student_id":student,"position":position,"created_at":datetime.now()},session=session)
                return {"message":"Event is full; added to waitlist","position":position},202
    return {"ticket":record(ticket)},201

@student_bp.delete("/tickets/<ticket_id>")
@jwt_required()
@role_required("student")
def cancel_ticket(ticket_id):
    oid=ticket_id
    db=current_app.db
    query={"_id":oid,"student_id":user_id(),"status":"booked"}
    client=current_app.mongo_client
    with client.start_session() as session:
        with session.start_transaction():
            ticket=db.tickets.find_one(query,session=session)
            if not ticket:
                return {"error":"Active ticket not found"},404
            event=db.events.find_one({"_id":ticket["event_id"]},session=session)
            if event and event_is_complete(event):
                return {"error":"This event has ended. Ticket changes are closed."},409
            now=datetime.now()
            db.tickets.update_one(query,{"$set":{"status":"cancelled","cancelled_at":now}},session=session)
            db.events.update_one({"_id":ticket["event_id"]},{"$inc":{"seats_sold":-1}},session=session)
            waiting=db.waitlist.find_one({"event_id":ticket["event_id"]},sort=[("position",1)],session=session)
            if waiting:
                promoted={"_id":str(uuid4()),"event_id":ticket["event_id"],"student_id":waiting["student_id"],"code":secrets.token_urlsafe(12),"status":"booked","booked_at":now,"promoted_at":now}
                db.tickets.insert_one(promoted,session=session)
                db.waitlist.delete_one({"_id":waiting["_id"]},session=session)
                db.waitlist.update_many({"event_id":ticket["event_id"],"position":{"$gt":waiting["position"]}},{"$inc":{"position":-1}},session=session)
                db.events.update_one({"_id":ticket["event_id"]},{"$inc":{"seats_sold":1}},session=session)
    return {"message":"Ticket cancelled","waitlist_promoted":bool(waiting)}

@student_bp.get("/tickets")
@jwt_required()
@role_required("student")
def my_tickets():
    tickets=[record(ticket) for ticket in current_app.db.tickets.find({"student_id":user_id()}).sort("booked_at",-1)]
    for ticket in tickets:
        event=current_app.db.events.find_one({"_id":ticket["event_id"]},{"title":1,"start_time":1,"end_time":1,"venue_id":1})
        ticket["event"]=record(event) if event else None
    return {"tickets":tickets}

@student_bp.delete("/events/<event_id>/waitlist")
@jwt_required()
@role_required("student")
def leave_waitlist(event_id):
    oid=event_id
    event=current_app.db.events.find_one({"_id":oid})
    if event and event_is_complete(event):
        return {"error":"This event has ended. Waitlist changes are closed."},409
    entry=current_app.db.waitlist.find_one_and_delete({"event_id":oid,"student_id":user_id()})
    if not entry:
        return {"error":"Waitlist entry not found"},404
    current_app.db.waitlist.update_many({"event_id":oid,"position":{"$gt":entry["position"]}},{"$inc":{"position":-1}})
    return {"message":"Removed from waitlist"}
