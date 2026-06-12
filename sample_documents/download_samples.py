#!/usr/bin/env python3
"""Download sample scanned documents from direct URLs for OCR testing."""
import os
import urllib.request
import urllib.error
from pathlib import Path
import ssl
import json

# Output directory
OUTPUT_DIR = Path(__file__).parent / "images"
OUTPUT_DIR.mkdir(exist_ok=True)

# Disable SSL verification for sample downloads
ssl._create_default_https_context = ssl._create_unverified_context

# Sample document images from public sources
SAMPLE_URLS = {
    # FUNSD - Form understanding dataset (direct from GitHub)
    "form": [
        "https://raw.githubusercontent.com/applicaai/kleister-nda/main/img/KILE0000.png",
        "https://guillaumejaume.github.io/FUNSD/img/datasets/testing/82092117.png",
    ],
    # Invoice samples from various public repos
    "invoice": [
        "https://raw.githubusercontent.com/nanonets/invoice-template-samples/master/Invoice%201.jpg",
        "https://raw.githubusercontent.com/nanonets/invoice-template-samples/master/Invoice%202.jpg",
        "https://raw.githubusercontent.com/nanonets/invoice-template-samples/master/Invoice%203.jpg",
        "https://raw.githubusercontent.com/nanonets/invoice-template-samples/master/Invoice%204.jpg",
        "https://raw.githubusercontent.com/nanonets/invoice-template-samples/master/Invoice%205.jpg",
    ],
    # Public domain documents
    "document": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Typewritten_document.jpg/800px-Typewritten_document.jpg",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Business_letter_format.png/800px-Business_letter_format.png",
    ],
}

def download_from_urls():
    """Download sample documents from direct URLs."""
    count = 0
    for category, urls in SAMPLE_URLS.items():
        print(f"Downloading {category} samples...")
        for i, url in enumerate(urls):
            try:
                ext = url.split('.')[-1].lower()
                if ext not in ('jpg', 'jpeg', 'png', 'tiff', 'tif'):
                    ext = 'jpg'
                filename = f"{category}_{i + 1:03d}.{ext}"
                filepath = OUTPUT_DIR / filename

                if not filepath.exists():
                    urllib.request.urlretrieve(url, filepath)
                    count += 1
                    print(f"  Downloaded: {filename}")
            except Exception as e:
                print(f"  Failed to download {url}: {e}")
    return count

def generate_synthetic_documents():
    """Generate synthetic document images using PIL."""
    from PIL import Image, ImageDraw, ImageFont
    import random

    print("Generating synthetic document images...")
    count = 0

    # Sample text content for different document types
    letter_content = [
        "Dear Sir/Madam,\n\nI am writing to inquire about the position advertised in the newspaper.\nI have extensive experience in this field and would be a great asset to your team.\n\nSincerely,\nJohn Smith",
        "Dear Customer,\n\nThank you for your recent purchase. Your order has been processed and will ship within 3-5 business days.\n\nBest regards,\nCustomer Service",
        "To Whom It May Concern,\n\nThis letter serves as confirmation of employment for Jane Doe, who has been employed at our company since January 2020.\n\nHuman Resources",
    ]

    memo_content = [
        "MEMORANDUM\n\nTO: All Staff\nFROM: Management\nDATE: January 15, 2024\nSUBJECT: Office Closure\n\nPlease note that the office will be closed on Monday for maintenance.",
        "INTERNAL MEMO\n\nTO: Department Heads\nFROM: CEO\nRE: Q4 Budget Review\n\nPlease submit your quarterly budget reports by end of business Friday.",
    ]

    invoice_content = [
        "INVOICE #INV-2024-001\n\nBill To:\nAcme Corporation\n123 Business St.\n\nItem                  Qty    Price\n-----------------------------------\nConsulting Services    10    $1,500\nSoftware License        1    $2,000\n-----------------------------------\nTotal:                       $3,500",
        "INVOICE\n\nInvoice Number: 12345\nDate: 2024-01-20\n\nDescription: Professional Services\nHours: 40\nRate: $75/hr\nAmount Due: $3,000",
    ]

    receipt_content = [
        "RECEIPT\n------------------------\nStore: Quick Mart\nDate: 01/20/2024\n\nMilk          $3.99\nBread         $2.49\nEggs          $4.99\n------------------------\nSubtotal:    $11.47\nTax:          $0.92\nTotal:       $12.39\n\nThank you!",
        "SALES RECEIPT\n\nTransaction #: 98765\nCashier: Sarah\n\nItem 1: $15.00\nItem 2: $25.00\nItem 3: $10.00\n-------------\nTotal: $50.00\nPaid: Cash",
    ]

    report_content = [
        "QUARTERLY REPORT\n\nQ4 2023 Financial Summary\n\nRevenue: $1,250,000\nExpenses: $890,000\nNet Profit: $360,000\n\nKey Highlights:\n- Sales increased 15% YoY\n- New market expansion complete\n- Customer retention at 95%",
        "ANNUAL REPORT 2023\n\nExecutive Summary\n\nThis document presents the annual performance review of operations including key metrics, achievements, and projections for the coming year.",
    ]

    contract_content = [
        "CONTRACT AGREEMENT\n\nThis Agreement is entered into as of January 1, 2024\nbetween Party A and Party B.\n\nTERMS AND CONDITIONS:\n\n1. Services: Party B agrees to provide consulting services\n2. Payment: Party A agrees to pay $5,000 monthly\n3. Duration: 12 months from effective date\n\nSignatures:\n\n_________________  _________________\nParty A            Party B",
        "SERVICE AGREEMENT\n\nEffective Date: February 15, 2024\n\nThis agreement outlines the terms under which\nservices will be provided.\n\nScope of Work:\n- Project management\n- Quality assurance\n- Documentation\n\nCompensation: $75/hour",
    ]

    form_content = [
        "APPLICATION FORM\n\nPersonal Information:\nName: ________________________\nAddress: ______________________\nPhone: ________________________\nEmail: ________________________\n\nEmployment History:\nCurrent Employer: ______________\nPosition: _____________________\nYears: ________________________\n\nSignature: ____________________\nDate: _________________________",
        "REGISTRATION FORM\n\nEvent: Annual Conference 2024\n\nAttendee Details:\nFull Name: ____________________\nCompany: ______________________\nTitle: ________________________\n\nSession Preferences:\n[ ] Morning Workshop\n[ ] Afternoon Seminar\n[ ] Evening Networking\n\nDietary Requirements: __________",
    ]

    resume_content = [
        "JOHN DOE\n\nSoftware Engineer\njohn.doe@email.com | (555) 123-4567\n\nEXPERIENCE\n\nSenior Developer, Tech Corp (2020-Present)\n- Led team of 5 developers\n- Implemented CI/CD pipeline\n- Reduced deployment time by 60%\n\nEDUCATION\n\nB.S. Computer Science\nState University, 2015",
        "JANE SMITH\n\nMarketing Manager\n\nPROFESSIONAL SUMMARY\n\n10+ years experience in digital marketing\nand brand management.\n\nSKILLS\n- Social Media Strategy\n- Content Marketing\n- Analytics & Reporting\n- Team Leadership",
    ]

    notice_content = [
        "NOTICE\n\nTO ALL EMPLOYEES:\n\nPlease be advised that the office will undergo\nrenovations starting March 1, 2024.\n\nDuring this period:\n- Work from home is permitted\n- Meeting rooms will be unavailable\n- IT support will be remote only\n\nManagement",
        "PUBLIC NOTICE\n\nHearing Date: April 15, 2024\nTime: 2:00 PM\nLocation: City Hall, Room 204\n\nAll interested parties are invited to attend\nthe public hearing regarding the proposed\nzoning changes for District 7.\n\nCity Planning Department",
    ]

    certificate_content = [
        "CERTIFICATE OF COMPLETION\n\nThis is to certify that\n\nMICHAEL JOHNSON\n\nhas successfully completed the course\n\nPROJECT MANAGEMENT PROFESSIONAL\n\nDate: December 15, 2023\n\n_________________\nProgram Director",
        "CERTIFICATE\n\nAWARDED TO\n\nSARAH WILLIAMS\n\nFor outstanding achievement in\nCustomer Service Excellence\n\nQ4 2023\n\nAcme Corporation",
    ]

    all_content = [
        ("letter", letter_content),
        ("memo", memo_content),
        ("invoice", invoice_content),
        ("receipt", receipt_content),
        ("report", report_content),
        ("contract", contract_content),
        ("form", form_content),
        ("resume", resume_content),
        ("notice", notice_content),
        ("certificate", certificate_content),
    ]

    # Try to use a system font
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Courier.ttc", 14)
        font_large = ImageFont.truetype("/System/Library/Fonts/Courier.ttc", 18)
    except:
        font = ImageFont.load_default()
        font_large = font

    for category, contents in all_content:
        for i, text in enumerate(contents):
            # Create variations
            for variation in range(5):  # 5 variations of each
                # Create image with slight variations
                width = random.randint(600, 850)
                height = random.randint(800, 1100)

                # Random paper color (off-white variations)
                bg_color = (
                    random.randint(245, 255),
                    random.randint(245, 255),
                    random.randint(240, 255)
                )

                img = Image.new('RGB', (width, height), color=bg_color)
                draw = ImageDraw.Draw(img)

                # Add some noise/texture to simulate scanned document
                for _ in range(random.randint(50, 200)):
                    x = random.randint(0, width)
                    y = random.randint(0, height)
                    gray = random.randint(200, 240)
                    draw.point((x, y), fill=(gray, gray, gray))

                # Add text with slight position variation
                x_offset = random.randint(40, 80)
                y_offset = random.randint(60, 100)
                text_color = (
                    random.randint(0, 30),
                    random.randint(0, 30),
                    random.randint(0, 30)
                )

                # Draw text line by line
                y_pos = y_offset
                for line in text.split('\n'):
                    draw.text((x_offset, y_pos), line, fill=text_color, font=font)
                    y_pos += 22

                # Add some random "stains" or marks
                for _ in range(random.randint(0, 3)):
                    x = random.randint(0, width)
                    y = random.randint(0, height)
                    r = random.randint(2, 8)
                    gray = random.randint(180, 220)
                    draw.ellipse([x-r, y-r, x+r, y+r], fill=(gray, gray, gray))

                filename = f"synth_{category}_{i+1:02d}_v{variation+1:02d}.png"
                filepath = OUTPUT_DIR / filename
                img.save(filepath, "PNG")
                count += 1

                if count % 10 == 0:
                    print(f"  Generated {count} synthetic documents...")

    return count

def main():
    print("=" * 60)
    print("Downloading/generating sample documents for OCR testing")
    print("=" * 60)

    total = 0

    # First, try to download from URLs
    print("\nPhase 1: Downloading from URLs...")
    total += download_from_urls()

    # Generate synthetic documents to reach 100+
    print("\nPhase 2: Generating synthetic documents...")
    total += generate_synthetic_documents()

    print("\n" + "=" * 60)
    print(f"Complete! Total images: {total}")
    print(f"Location: {OUTPUT_DIR}")
    print("=" * 60)

    # List the files by category
    files = list(OUTPUT_DIR.glob("*.png")) + list(OUTPUT_DIR.glob("*.jpg"))
    print(f"\nFiles by category:")
    categories = {}
    for f in files:
        parts = f.stem.split("_")
        if parts[0] == "synth":
            cat = f"synth_{parts[1]}"
        else:
            cat = parts[0]
        categories[cat] = categories.get(cat, 0) + 1
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

if __name__ == "__main__":
    main()
