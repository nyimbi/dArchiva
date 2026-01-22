#!/usr/bin/env python3
# (c) Copyright Datacraft, 2026
"""Generate sample PDF documents for dArchiva demo."""
from pathlib import Path
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

OUTPUT_DIR = Path(__file__).parent.parent / "demo_documents"
OUTPUT_DIR.mkdir(exist_ok=True)

styles = getSampleStyleSheet()

def create_invoice():
	"""Create a sample invoice for Finance department."""
	doc = SimpleDocTemplate(str(OUTPUT_DIR / "Invoice_2026_001.pdf"), pagesize=A4)
	story = []

	# Header
	story.append(Paragraph("<b>INVOICE</b>", styles['Title']))
	story.append(Spacer(1, 0.5*cm))

	# Company info
	story.append(Paragraph("<b>Acme Supplies Ltd</b>", styles['Heading2']))
	story.append(Paragraph("123 Industrial Area, Nairobi", styles['Normal']))
	story.append(Paragraph("Tel: +254 20 123 4567", styles['Normal']))
	story.append(Spacer(1, 1*cm))

	# Invoice details
	story.append(Paragraph(f"Invoice No: INV-2026-001", styles['Normal']))
	story.append(Paragraph(f"Date: {date.today().strftime('%d %B %Y')}", styles['Normal']))
	story.append(Paragraph("Bill To: Datacraft Kenya Ltd", styles['Normal']))
	story.append(Spacer(1, 1*cm))

	# Items table
	data = [
		['Item', 'Qty', 'Unit Price (KES)', 'Total (KES)'],
		['Office Supplies', '10', '5,000', '50,000'],
		['Computer Equipment', '2', '85,000', '170,000'],
		['Software License', '5', '12,000', '60,000'],
		['', '', 'Subtotal:', '280,000'],
		['', '', 'VAT (16%):', '44,800'],
		['', '', 'TOTAL:', '324,800'],
	]
	table = Table(data, colWidths=[8*cm, 2*cm, 4*cm, 4*cm])
	table.setStyle(TableStyle([
		('BACKGROUND', (0, 0), (-1, 0), colors.grey),
		('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
		('GRID', (0, 0), (-1, -1), 1, colors.black),
		('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
		('FONTNAME', (2, -3), (3, -1), 'Helvetica-Bold'),
	]))
	story.append(table)
	story.append(Spacer(1, 1*cm))
	story.append(Paragraph("Payment Terms: Net 30 days", styles['Normal']))

	doc.build(story)
	print("  ✓ Invoice_2026_001.pdf")

def create_contract():
	"""Create a sample contract for Legal department."""
	doc = SimpleDocTemplate(str(OUTPUT_DIR / "Service_Agreement_2026.pdf"), pagesize=A4)
	story = []

	story.append(Paragraph("<b>SERVICE AGREEMENT</b>", styles['Title']))
	story.append(Spacer(1, 0.5*cm))
	story.append(Paragraph(f"Date: {date.today().strftime('%d %B %Y')}", styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph("<b>PARTIES</b>", styles['Heading2']))
	story.append(Paragraph("This Agreement is entered into between:", styles['Normal']))
	story.append(Paragraph("<b>Datacraft Kenya Ltd</b> (\"Client\")", styles['Normal']))
	story.append(Paragraph("and", styles['Normal']))
	story.append(Paragraph("<b>TechSolutions Africa Ltd</b> (\"Provider\")", styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph("<b>1. SERVICES</b>", styles['Heading2']))
	story.append(Paragraph(
		"The Provider agrees to deliver document management system implementation services "
		"including software deployment, customization, and staff training.",
		styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("<b>2. TERM</b>", styles['Heading2']))
	story.append(Paragraph(
		"This Agreement shall commence on 1 February 2026 and continue for a period of "
		"twelve (12) months unless terminated earlier in accordance with Section 5.",
		styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("<b>3. COMPENSATION</b>", styles['Heading2']))
	story.append(Paragraph(
		"Client shall pay Provider a total fee of KES 2,500,000 payable in three installments.",
		styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("<b>4. CONFIDENTIALITY</b>", styles['Heading2']))
	story.append(Paragraph(
		"Both parties agree to maintain strict confidentiality of all proprietary information "
		"exchanged during the term of this Agreement.",
		styles['Normal']))
	story.append(Spacer(1, 2*cm))

	story.append(Paragraph("_________________________", styles['Normal']))
	story.append(Paragraph("Authorized Signatory - Client", styles['Normal']))
	story.append(Spacer(1, 1*cm))
	story.append(Paragraph("_________________________", styles['Normal']))
	story.append(Paragraph("Authorized Signatory - Provider", styles['Normal']))

	doc.build(story)
	print("  ✓ Service_Agreement_2026.pdf")

def create_employment_letter():
	"""Create a sample employment document for HR department."""
	doc = SimpleDocTemplate(str(OUTPUT_DIR / "Employment_Offer_Onyango.pdf"), pagesize=A4)
	story = []

	story.append(Paragraph("<b>DATACRAFT KENYA LTD</b>", styles['Title']))
	story.append(Paragraph("Human Resources Department", styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph(f"Date: {date.today().strftime('%d %B %Y')}", styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("Mr. James Onyango", styles['Normal']))
	story.append(Paragraph("P.O. Box 12345", styles['Normal']))
	story.append(Paragraph("Nairobi, Kenya", styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph("<b>RE: OFFER OF EMPLOYMENT - SOFTWARE DEVELOPER</b>", styles['Heading2']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("Dear Mr. Onyango,", styles['Normal']))
	story.append(Spacer(1, 0.3*cm))

	story.append(Paragraph(
		"We are pleased to offer you the position of Software Developer at Datacraft Kenya Ltd. "
		"This offer is subject to the following terms and conditions:",
		styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("<b>Position:</b> Software Developer", styles['Normal']))
	story.append(Paragraph("<b>Department:</b> Engineering", styles['Normal']))
	story.append(Paragraph("<b>Start Date:</b> 1 March 2026", styles['Normal']))
	story.append(Paragraph("<b>Gross Salary:</b> KES 250,000 per month", styles['Normal']))
	story.append(Paragraph("<b>Benefits:</b> Medical cover, pension contribution", styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph(
		"Please sign and return a copy of this letter to confirm your acceptance.",
		styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph("Yours sincerely,", styles['Normal']))
	story.append(Spacer(1, 1*cm))
	story.append(Paragraph("_________________________", styles['Normal']))
	story.append(Paragraph("Grace Muthoni", styles['Normal']))
	story.append(Paragraph("HR Manager", styles['Normal']))

	doc.build(story)
	print("  ✓ Employment_Offer_Onyango.pdf")

def create_policy_document():
	"""Create a sample policy document."""
	doc = SimpleDocTemplate(str(OUTPUT_DIR / "Data_Protection_Policy.pdf"), pagesize=A4)
	story = []

	story.append(Paragraph("<b>DATA PROTECTION POLICY</b>", styles['Title']))
	story.append(Paragraph("Datacraft Kenya Ltd", styles['Heading2']))
	story.append(Paragraph(f"Effective Date: {date.today().strftime('%d %B %Y')}", styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph("<b>1. PURPOSE</b>", styles['Heading2']))
	story.append(Paragraph(
		"This policy establishes guidelines for the collection, use, and protection of "
		"personal data in compliance with the Kenya Data Protection Act, 2019.",
		styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("<b>2. SCOPE</b>", styles['Heading2']))
	story.append(Paragraph(
		"This policy applies to all employees, contractors, and third parties who handle "
		"personal data on behalf of Datacraft Kenya Ltd.",
		styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("<b>3. DATA PROTECTION PRINCIPLES</b>", styles['Heading2']))
	story.append(Paragraph("Personal data shall be:", styles['Normal']))
	story.append(Paragraph("• Processed lawfully, fairly, and transparently", styles['Normal']))
	story.append(Paragraph("• Collected for specified, explicit purposes", styles['Normal']))
	story.append(Paragraph("• Adequate, relevant, and limited to necessity", styles['Normal']))
	story.append(Paragraph("• Accurate and kept up to date", styles['Normal']))
	story.append(Paragraph("• Stored securely with appropriate measures", styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph("<b>4. RESPONSIBILITIES</b>", styles['Heading2']))
	story.append(Paragraph(
		"The Data Protection Officer is responsible for ensuring compliance with this policy. "
		"All employees must complete annual data protection training.",
		styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph("<b>Approved by:</b>", styles['Normal']))
	story.append(Spacer(1, 0.5*cm))
	story.append(Paragraph("_________________________", styles['Normal']))
	story.append(Paragraph("Managing Director", styles['Normal']))

	doc.build(story)
	print("  ✓ Data_Protection_Policy.pdf")

def create_memo():
	"""Create a sample internal memo."""
	doc = SimpleDocTemplate(str(OUTPUT_DIR / "Memo_System_Maintenance.pdf"), pagesize=A4)
	story = []

	story.append(Paragraph("<b>INTERNAL MEMORANDUM</b>", styles['Title']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph(f"<b>Date:</b> {date.today().strftime('%d %B %Y')}", styles['Normal']))
	story.append(Paragraph("<b>To:</b> All Staff", styles['Normal']))
	story.append(Paragraph("<b>From:</b> IT Department", styles['Normal']))
	story.append(Paragraph("<b>Subject:</b> Scheduled System Maintenance", styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph(
		"Please be advised that scheduled maintenance will be performed on our document "
		"management system on Saturday, 25 January 2026, from 6:00 AM to 12:00 PM EAT.",
		styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph(
		"During this time, the following services will be temporarily unavailable:",
		styles['Normal']))
	story.append(Paragraph("• Document upload and download", styles['Normal']))
	story.append(Paragraph("• Search functionality", styles['Normal']))
	story.append(Paragraph("• Workflow processing", styles['Normal']))
	story.append(Spacer(1, 0.5*cm))

	story.append(Paragraph(
		"We apologize for any inconvenience and appreciate your understanding as we work "
		"to improve system performance and reliability.",
		styles['Normal']))
	story.append(Spacer(1, 1*cm))

	story.append(Paragraph("For any questions, please contact the IT helpdesk.", styles['Normal']))

	doc.build(story)
	print("  ✓ Memo_System_Maintenance.pdf")

def main():
	print("=" * 50)
	print("Generating Sample Documents")
	print("=" * 50)
	print(f"\nOutput directory: {OUTPUT_DIR}\n")

	create_invoice()
	create_contract()
	create_employment_letter()
	create_policy_document()
	create_memo()

	print("\n" + "=" * 50)
	print("Documents ready for scanning demo!")
	print("=" * 50)
	print(f"\nFiles location: {OUTPUT_DIR}")
	print("\nSuggested scan workflow:")
	print("  1. Invoice_2026_001.pdf → Finance dept")
	print("  2. Service_Agreement_2026.pdf → Legal dept")
	print("  3. Employment_Offer_Onyango.pdf → HR dept")
	print("  4. Data_Protection_Policy.pdf → All depts")
	print("  5. Memo_System_Maintenance.pdf → All depts")

if __name__ == "__main__":
	main()
