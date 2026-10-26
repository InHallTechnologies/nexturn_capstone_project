# Entity relationship diagram

```mermaid
erDiagram
  USER ||--o{ CLIENT : owns
  USER ||--o{ PROJECT_POST : publishes
  PROJECT_POST ||--o| PROJECT_POST_CODE : protects
  PROJECT o|--o| PROJECT_POST_CODE : claimed_as
  CLIENT ||--o{ PROJECT : has
  PROJECT ||--o{ PROJECT_REVIEW_EVENT : tracks
  CLIENT ||--o{ INVOICE : billed
  PROJECT o|--o{ INVOICE : final_billing
  PROJECT ||--o{ TIME_ENTRY : logs
  INVOICE o|--o{ TIME_ENTRY : locks
  INVOICE ||--o{ INVOICE_LINE_ITEM : contains
  INVOICE ||--o{ PAYMENT : receives
  USER {
    string id PK
    string email UK
    string password_hash
    string role
    string business_name
  }
  CLIENT {
    string id PK
    string owner_id FK
    string name
    string email
    string billing_address
    decimal default_hourly_rate
  }
  PROJECT {
    string id PK
    string client_id FK
    string title
    decimal rate_override
    string status
    string workflow_status
    text completion_notes
    text revision_feedback
    datetime submitted_at
    datetime reviewed_at
  }
  PROJECT_REVIEW_EVENT {
    string id PK
    string project_id FK
    string actor_id FK
    string event_type
    text message
    datetime created_at
  }
  TIME_ENTRY {
    string id PK
    string project_id FK
    date entry_date
    decimal hours
    decimal rate_applied
    boolean is_billed
    string invoice_id FK
  }
  INVOICE {
    string id PK
    string client_id FK
    string number UK
    date issue_date
    date due_date
    string status
    decimal subtotal
    decimal tax
    decimal total
    decimal amount_paid
    string project_id FK
    boolean is_final
  }
  INVOICE_LINE_ITEM {
    string id PK
    string invoice_id FK
    string description
    decimal quantity
    decimal unit_rate
    decimal amount
  }
  PAYMENT {
    string id PK
    string invoice_id FK
    decimal amount
    date paid_on
    string method
    string reference
  }
  TOKEN_BLOCKLIST {
    string jti PK
    datetime created_at
  }
  PROJECT_POST {
    string id PK
    string client_user_id FK
    string title
    string description
    decimal hourly_rate
    string contact_details
    datetime created_at
  }
  PROJECT_POST_CODE {
    string id PK
    string post_id FK_UK
    string project_code
    string project_id FK_UK
  }
```

`TIME_ENTRY.invoice_id` and `is_billed` capture the unbilled-to-billed transition. MongoDB collections persist the records and token blocklist; UUID IDs preserve the frontend API contract.

`PROJECT_POST` is a discovery notice separate from the billable `PROJECT` entity. It is owned by the posting client account and is converted only after a freelancer submits the client-issued UUID code. Raw codes are returned only to the owning client at creation or regeneration, and a successful claim links the post to exactly one project.

`PROJECT.workflow_status` tracks submission, revision, approval, and closure independently from `INVOICE.status`. A final invoice is unique per project; the partial unique index allows ordinary invoices to keep a null project ID. `PROJECT_POST.hourly_rate` is nullable only to preserve legacy posts created before the rate field existed.
