# dArchiva Demo Script

## Pre-Demo Setup

### 1. Start Services
```bash
cd /Users/nyimbiodero/src/pjs/dArchiva
./scripts/start_dev.sh
```

### 2. Verify Login Works
- Open http://localhost:3001
- Login as `admin` / `Abcd1234.`

### 3. Have Sample Documents Ready
Location: `/Users/nyimbiodero/src/pjs/dArchiva/demo_documents/`
- Invoice_2026_001.pdf
- Service_Agreement_2026.pdf
- Employment_Offer_Onyango.pdf
- Data_Protection_Policy.pdf
- Memo_System_Maintenance.pdf

---

## Demo Flow (15 minutes)

### ACT 1: Document Intake (3 min)

**Narrator:** "Let me show you how a document enters dArchiva from a physical scanner."

1. Open Scanner interface
2. Place `Invoice_2026_001.pdf` on scanner (or upload)
3. Scan document
4. Show it appearing in the Inbox

**Key Point:** "Documents can come from scanners, email, or bulk upload."

---

### ACT 2: OCR & Auto-Classification (2 min)

**Narrator:** "dArchiva automatically extracts text and classifies documents."

1. Open the scanned invoice
2. Show OCR text extraction (searchable text)
3. Point out auto-detected document type: "Invoice"
4. Show suggested tags: "Finance", amount detected

**Key Point:** "AI extracts key data - vendor name, amounts, dates."

---

### ACT 3: Workflow & Routing (3 min)

**Narrator:** "Documents automatically route to the right people."

1. Show workflow being triggered
2. Invoice routes to Finance department
3. Login as `finance_user` / `Demo1234!` (Wanjiku Kamau)
4. Show document in her workflow queue
5. Demonstrate approval action

**Key Point:** "Workflows ensure proper review and approval chains."

---

### ACT 4: Security & Access Control (4 min) ⭐ KEY DEMO

**Narrator:** "Now watch how dArchiva enforces department-level security."

1. **As Finance user (Wanjiku):**
   - Show she can see the Invoice
   - Navigate to Documents
   - Show Finance-only documents

2. **Switch to Legal user:**
   - Logout, login as `legal_user` / `Demo1234!` (Ochieng Otieno)
   - Try to access the Invoice → **ACCESS DENIED**
   - Show he can see the Service Agreement

3. **Demonstrate the principle:**
   - "Finance cannot see Legal documents"
   - "Legal cannot see HR documents"
   - "Each department has isolated visibility"

**Key Point:** "Zero-trust architecture. Data isolation by default."

---

### ACT 5: Document Sharing (2 min)

**Narrator:** "When collaboration is needed, we have controlled sharing."

1. Login as `admin`
2. Select the Data_Protection_Policy.pdf
3. Share with specific users or departments
4. Set permissions (view/edit/download)
5. Show audit trail of who accessed

**Key Point:** "Every action is logged. Complete audit trail."

---

### ACT 6: Search & Retrieval (1 min)

**Narrator:** "Finding documents is instant."

1. Use search: "Invoice Acme"
2. Show full-text search results
3. Filter by date, department, document type
4. Open document directly from search

**Key Point:** "Find any document in seconds, not hours."

---

## Demo Credentials

| Username | Password | Name | Department |
|----------|----------|------|------------|
| admin | Abcd1234. | Administrator | All |
| finance_user | Demo1234! | Wanjiku Kamau | Finance |
| legal_user | Demo1234! | Ochieng Otieno | Legal |
| hr_user | Demo1234! | Akinyi Odhiambo | HR |
| manager | Demo1234! | Mwangi Njoroge | All Depts |

---

## Troubleshooting

### Login not working?
```bash
# Check backend logs
tail -f /tmp/darchiva-backend.log
```

### Scanner not detected?
- Use file upload as fallback
- Demo the "simulate scan" feature

### Database connection issues?
```bash
# Restart services
./scripts/start_dev.sh
```

---

## Configured Workflows

| Workflow | Trigger | Flow |
|----------|---------|------|
| Invoice Approval | Document type = Invoice | Finance Dept → Manager → Archive |
| Contract Review | Document type = Contract | Legal Dept → Compliance → Manager → Archive |
| Employee Document | Document type = Employment Record | HR Dept → Data Entry → Archive |

---

## Key Messages to Emphasize

1. **Security First:** Department isolation, audit trails, encryption
2. **Efficiency:** OCR, auto-classification, instant search
3. **Compliance:** Full audit trail, retention policies
4. **Integration:** Scanners, email, bulk import
5. **Kenyan Context:** Built for local business needs
