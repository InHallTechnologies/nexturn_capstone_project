"""End-to-end smoke test for every public API route in this project.

Start the app first with docker compose up --build, then run:
  python tests/smoke_routes.py
Optionally set API_BASE_URL (default http://localhost:5000/api).
The script creates its own records and leaves them in the local demo database.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = os.getenv("API_BASE_URL", "http://localhost:5000/api").rstrip("/")
counter = str(os.getpid())
checks = 0

def call(method, path, body=None, token=None, expected=None, refresh=False):
    global checks
    headers={"Content-Type":"application/json"}
    if token: headers["Authorization"]="Bearer "+token
    if refresh: headers["Authorization"]="Bearer "+token
    req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=12) as response:
            status=response.status; content=response.read()
    except urllib.error.HTTPError as e:
        status=e.code; content=e.read()
    except Exception as e:
        raise AssertionError(f"{method} {path} could not reach {BASE}: {e}")
    try: payload=json.loads(content) if content else {}
    except ValueError: payload={}
    checks+=1
    if expected is not None and status!=expected:
        raise AssertionError(f"{method} {path}: expected {expected}, got {status}: {payload}")
    print(f"{status} {method:<6} {path}")
    return payload

def auth(email,password):
    return call("POST","/auth/login",{"email":email,"password":password},expected=200)

def main():
    global checks
    call("GET","",expected=200)
    anon=call("GET","/auth/me",expected=401)
    new_email=f"smoke-{counter}@example.test"
    call("POST","/auth/register",{"email":new_email,"password":"LongPassword123!","business_name":"Smoke Studio"},expected=201)
    call("POST","/auth/register",{"email":new_email,"password":"LongPassword123!"},expected=409)
    call("POST","/auth/register",{"email":"bad-email","password":"tiny"},expected=400)
    logged=auth(new_email,"LongPassword123!"); access=logged["access_token"]; refresh=logged["refresh_token"]
    me=call("GET","/auth/me",token=access,expected=200); assert me["user"]["email"]==new_email and "password_hash" not in me["user"]
    call("GET","/portal/invoices",token=access,expected=403)
    client=call("POST","/clients",{"name":"Smoke Client "+counter,"email":f"client-{counter}@example.test","billing_address":"1 Test Lane","default_hourly_rate":80},token=access,expected=201)
    cid=client["id"]
    call("GET","/clients?per_page=5&q=Smoke",token=access,expected=200)
    call("GET",f"/clients/{cid}",token=access,expected=200)
    call("PUT",f"/clients/{cid}",{"name":"Smoke Client Updated"},token=access,expected=200)
    project=call("POST","/projects",{"client_id":cid,"title":"Smoke Project","rate_override":90},token=access,expected=201); pid=project["id"]
    call("GET","/projects?per_page=5",token=access,expected=200)
    call("GET",f"/projects/{pid}",token=access,expected=200)
    call("PUT",f"/projects/{pid}",{"status":"on_hold"},token=access,expected=200)
    entry=call("POST","/time-entries",{"project_id":pid,"date":"2026-01-02","hours":2,"description":"Route smoke test work"},token=access,expected=201); eid=entry["id"]
    call("GET","/time-entries?per_page=10&billed=false",token=access,expected=200)
    call("GET",f"/time-entries/{eid}",token=access,expected=200)
    call("PUT",f"/time-entries/{eid}",{"hours":3},token=access,expected=200)
    invoice=call("POST","/invoices",{"client_id":cid,"time_entry_ids":[eid],"tax_rate":10,"due_days":30},token=access,expected=201)
    iid=invoice["id"]; assert invoice["subtotal"]==270 and invoice["tax"]==27 and invoice["total"]==297
    call("PUT",f"/time-entries/{eid}",{"hours":4},token=access,expected=409)
    draft_edit=call("PUT",f"/invoices/{iid}",{"due_date":"2027-02-15","tax":27,"line_items":[{"description":"Updated smoke project work","quantity":3,"unit_rate":90}]},token=access,expected=200)
    assert draft_edit["status"]=="draft" and draft_edit["total"]==297 and draft_edit["line_items"][0]["description"]=="Updated smoke project work", draft_edit
    call("PUT",f"/invoices/{iid}",{"line_items":[]},token=access,expected=400)
    call("GET","/invoices?per_page=10",token=access,expected=200)
    call("GET",f"/invoices/{iid}",token=access,expected=200)
    call("POST",f"/invoices/{iid}/send",token=access,expected=200)
    sent_edit=call("PUT",f"/invoices/{iid}",{"due_date":"2027-02-20","tax":27,"line_items":[{"description":"Client-visible smoke project work","quantity":3,"unit_rate":90}]},token=access,expected=200)
    assert sent_edit["status"]=="sent" and sent_edit["due_date"]=="2027-02-20" and sent_edit["total"]==297
    call("GET","/payments?per_page=10",token=access,expected=200)
    call("GET","/dashboard?month=2026-01",token=access,expected=200)
    call("GET","/dashboard?month=bad",token=access,expected=400)
    # Associate a client login to the newly-created billing contact and verify the client-only portal.
    portal_email=f"client-{counter}@example.test"
    call("POST","/auth/register",{"email":portal_email,"password":"PortalPassword123!","role":"client"},expected=201)
    portal=auth(portal_email,"PortalPassword123!"); pt=portal["access_token"]
    portal_invoices=call("GET","/portal/invoices?per_page=10",token=pt,expected=200)
    assert portal_invoices["total"]==1
    assert portal_invoices["items"][0]["freelancer_email"]==new_email
    call("PUT",f"/invoices/{iid}",{"tax":0},token=pt,expected=403)
    client_invoice=call("GET",f"/portal/invoices/{iid}",token=pt,expected=200)
    assert client_invoice["freelancer_email"]==new_email
    call("GET","/portal/payments?per_page=10",token=pt,expected=200)
    call("POST","/portal/project-posts",{"title":"Missing rate","description":"Should be rejected.","contact_details":"client@example.test"},token=pt,expected=400)
    for invalid_rate in (0,-1,"not-a-rate","NaN"):
        call("POST","/portal/project-posts",{"title":"Invalid rate","description":"Should be rejected.","contact_details":"client@example.test","hourly_rate":invalid_rate},token=pt,expected=400)
    post=call("POST","/portal/project-posts",{"title":"Need a product designer","description":"Design a simple responsive booking site.","contact_details":"client@example.test · +1 555 0100","hourly_rate":125},token=pt,expected=201)
    post_id=post["id"]
    first_code=post["project_code"]
    assert len(first_code)==14 and first_code.count("-")==2
    client_post=call("GET",f"/portal/project-posts/{post_id}",token=pt,expected=200)
    assert "project_code" not in client_post and client_post["claimed"] is False
    assert call("GET","/portal/project-posts?per_page=10",token=pt,expected=200)["total"]==1
    call("PUT",f"/portal/project-posts/{post_id}",{"title":"Need a responsive product designer"},token=pt,expected=200)
    feed=call("GET","/project-posts?per_page=100",token=access,expected=200); assert any(p["id"]==post_id for p in feed["items"])
    assert next(p for p in feed["items"] if p["id"]==post_id)["hourly_rate"]==125
    assert all("project_code" not in p for p in feed["items"])
    call("GET",f"/project-posts/{post_id}",token=access,expected=200)
    call("POST","/projects/claim-code",{"code":"BAD-CODE"},token=access,expected=404)
    rotated_code=call("POST",f"/portal/project-posts/{post_id}/regenerate-code",token=pt,expected=200)["project_code"]
    assert rotated_code!=first_code
    call("POST","/projects/claim-code",{"code":first_code},token=access,expected=404)
    claimed=call("POST","/projects/claim-code",{"code":rotated_code},token=access,expected=201)
    assert claimed["project"]["title"]=="Need a responsive product designer"
    assert claimed["project"]["rate_override"]==125
    assert claimed["client"]["email"]==portal_email
    assert call("GET",f"/portal/project-posts/{post_id}",token=pt,expected=200)["claimed"] is True
    assert next(p for p in call("GET","/portal/project-posts?per_page=10",token=pt,expected=200)["items"] if p["id"]==post_id)["claimed"] is True
    call("POST","/projects/claim-code",{"code":rotated_code},token=access,expected=409)
    assert any(item["id"]==claimed["project"]["id"] for item in call("GET",f"/projects?client_id={claimed['client']['id']}",token=access,expected=200)["items"])
    claimed_project_id=claimed["project"]["id"]
    call("GET","/portal/projects",token=access,expected=403)
    call("POST",f"/portal/projects/{claimed_project_id}/review",{"action":"approve"},token=pt,expected=409)
    first_work=call("POST","/time-entries",{"project_id":claimed_project_id,"date":"2026-01-04","hours":2,"description":"First delivered scope"},token=access,expected=201)
    assert first_work["rate_applied"]==125
    call("PUT",f"/projects/{claimed_project_id}",{"rate_override":None},token=access,expected=400)
    call("PUT",f"/projects/{claimed_project_id}",{"rate_override":150},token=access,expected=200)
    assert call("GET",f"/time-entries/{first_work['id']}",token=access,expected=200)["rate_applied"]==125
    second_work=call("POST","/time-entries",{"project_id":claimed_project_id,"date":"2026-01-05","hours":1,"description":"Second delivered scope"},token=access,expected=201)
    assert second_work["rate_applied"]==150
    assert call("GET","/portal/projects",token=pt,expected=200)["items"]
    submitted=call("POST",f"/projects/{claimed_project_id}/submit",{"notes":"Implemented the agreed booking flow and handed over the files."},token=access,expected=200)
    assert submitted["workflow_status"]=="submitted"
    call("POST",f"/portal/projects/{claimed_project_id}/review",{"action":"request_revision"},token=pt,expected=400)
    revision=call("POST",f"/portal/projects/{claimed_project_id}/review",{"action":"request_revision","feedback":"Please adjust the mobile booking confirmation."},token=pt,expected=200)
    assert revision["workflow_status"]=="revision_requested" and revision["revision_feedback"]
    resubmitted=call("POST",f"/projects/{claimed_project_id}/submit",{"notes":"Updated the mobile confirmation and retested."},token=access,expected=200)
    assert resubmitted["workflow_status"]=="submitted"
    approved=call("POST",f"/portal/projects/{claimed_project_id}/review",{"action":"approve","feedback":"Looks good."},token=pt,expected=200)
    assert approved["workflow_status"]=="completed"
    final_invoice=call("POST",f"/projects/{claimed_project_id}/final-invoice",{"tax_rate":10,"due_days":14},token=access,expected=201)
    final_id=final_invoice["id"]
    assert final_invoice["is_final"] is True and final_invoice["subtotal"]==400 and final_invoice["tax"]==40 and final_invoice["total"]==440
    assert all(line["unit_rate"] in (125,150) for line in final_invoice["line_items"])
    closed=call("GET",f"/projects/{claimed_project_id}",token=access,expected=200)
    assert closed["workflow_status"]=="completed" and closed["status"]=="closed" and final_invoice["status"]=="draft"
    call("POST",f"/projects/{claimed_project_id}/final-invoice",{},token=access,expected=409)
    call("POST",f"/invoices/{final_id}/send",token=access,expected=200)
    final_partial=call("POST",f"/portal/invoices/{final_id}/pay",{"amount":100,"payment_method":"cash","transaction_reference":"FINAL-PARTIAL"},token=pt,expected=201)
    assert final_partial["invoice"]["status"]=="partially_paid"
    final_paid=call("POST",f"/portal/invoices/{final_id}/pay",{"amount":340,"payment_method":"card","transaction_reference":"FINAL-REST"},token=pt,expected=201)
    assert final_paid["invoice"]["status"]=="paid"
    closed=call("GET",f"/projects/{claimed_project_id}",token=access,expected=200)
    assert closed["workflow_status"]=="closed" and closed["status"]=="closed"
    visible_final=call("GET",f"/payments?invoice_id={final_id}&per_page=10",token=access,expected=200)
    assert sum(p["amount"] for p in visible_final["items"])==440
    remaining_posts=call("GET","/project-posts?per_page=100",token=access,expected=200)
    assert all(item["id"]!=post_id for item in remaining_posts["items"])
    call("GET",f"/project-posts/{post_id}",token=access,expected=404)
    call("PUT",f"/portal/project-posts/{post_id}",{"title":"Changed after claim"},token=pt,expected=409)
    call("DELETE",f"/portal/project-posts/{post_id}",token=pt,expected=409)
    other_client=auth("client@example.com","Client123!")
    call("GET",f"/portal/project-posts/{post_id}",token=other_client["access_token"],expected=404)
    call("POST",f"/portal/project-posts/{post_id}/regenerate-code",token=other_client["access_token"],expected=404)
    call("GET","/project-posts",token=pt,expected=403)
    call("GET","/portal/project-posts",token=access,expected=403)
    call("POST",f"/portal/project-posts/{post_id}/regenerate-code",token=access,expected=403)
    call("GET","/clients",token=pt,expected=403)
    call("POST",f"/invoices/{iid}/payments",{"amount":400,"method":"Bank transfer"},token=access,expected=409)
    payment=call("POST",f"/invoices/{iid}/payments",{"amount":100,"paid_on":"2026-01-10","method":"Bank transfer","reference":"SMOKE-001"},token=access,expected=201)
    assert payment["invoice"]["status"]=="partially_paid"
    call("GET","/payments?per_page=10",token=access,expected=200)
    call("GET",f"/invoices/{iid}",token=access,expected=200)
    call("POST",f"/portal/invoices/{iid}/pay",{"amount":10,"payment_method":"invalid"},token=pt,expected=400)
    call("POST",f"/portal/invoices/{iid}/pay",{"payment_method":"cash"},token=pt,expected=400)
    call("POST",f"/portal/invoices/{iid}/pay",{"amount":198,"payment_method":"card"},token=pt,expected=409)
    partial_payment=call("POST",f"/portal/invoices/{iid}/pay",{"amount":50,"payment_method":"cash","transaction_reference":"CASH-SMOKE-001"},token=pt,expected=201)
    assert partial_payment["invoice"]["status"]=="partially_paid" and partial_payment["payment"]["amount"]==50
    client_payment=call("POST",f"/portal/invoices/{iid}/pay",{"amount":147,"payment_method":"card","transaction_reference":"CARD-SMOKE-001"},token=pt,expected=201)
    assert client_payment["invoice"]["status"]=="paid" and client_payment["payment"]["amount"]==147
    call("POST",f"/portal/invoices/{iid}/pay",token=pt,expected=409)
    visible=call("GET",f"/payments?invoice_id={iid}&per_page=10",token=access,expected=200)
    assert any(p["method"]=="Cash" and p["reference"]=="CASH-SMOKE-001" and p["amount"]==50 for p in visible["items"])
    assert any(p["method"]=="Card" and p["reference"]=="CARD-SMOKE-001" and p["amount"]==147 for p in visible["items"])
    call("PUT",f"/invoices/{iid}",{"tax":28},token=access,expected=409)
    disposable=call("POST","/portal/project-posts",{"title":"Disposable request","description":"Delete test post.","contact_details":"temporary@example.test","hourly_rate":50},token=pt,expected=201)
    call("DELETE",f"/portal/project-posts/{disposable['id']}",token=pt,expected=200)
    # Refresh rotation invalidates the previous refresh token; logout blocks access tokens too.
    rotated=call("POST","/auth/refresh",token=refresh,expected=200)
    call("POST","/auth/refresh",token=refresh,expected=401)
    call("POST","/auth/logout",{"refresh_token":rotated["refresh_token"]},token=rotated["access_token"],expected=200)
    call("GET","/auth/me",token=rotated["access_token"],expected=401)
    call("POST","/auth/refresh",token=rotated["refresh_token"],expected=401)
    # Client email uniqueness also gives a stable lookup after contact edits.
    call("DELETE",f"/clients/{cid}",token=access,expected=409)
    call("DELETE",f"/projects/{pid}",token=access,expected=409)
    # Billed time is immutable; create and delete a separate unbilled record, then clean the client.
    spare=call("POST","/time-entries",{"project_id":pid,"date":"2026-01-03","hours":1,"description":"Delete route coverage"},token=access,expected=201)
    call("DELETE",f"/time-entries/{spare['id']}",token=access,expected=200)
    call("GET","/missing-route",expected=404)
    print(f"\nPASS: {checks} route checks completed. Invoice calculations, ownership, locking, payments and token rotation passed.")

if __name__=="__main__":
    try: main()
    except Exception as e:
        print(f"\nFAIL: {e}",file=sys.stderr);sys.exit(1)
