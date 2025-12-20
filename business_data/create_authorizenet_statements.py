"""
Generate realistic Authorize.net payment processor statements for Grainhouse Coffee
6 months of transaction history (June 18 - December 17, 2024)
"""

import json
import random
from datetime import datetime, timedelta

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable, Image
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.graphics.shapes import Drawing, Rect, String
    from reportlab.graphics import renderPDF
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'reportlab'])
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Load existing order data
with open('purchase_orders_and_tracking.json', 'r') as f:
    data = json.load(f)

# Authorize.net colors
AUTHNET_BLUE = colors.HexColor('#003366')
AUTHNET_LIGHT_BLUE = colors.HexColor('#E6F0FA')
AUTHNET_GREEN = colors.HexColor('#28A745')
AUTHNET_RED = colors.HexColor('#DC3545')
GRAY = colors.HexColor('#6C757D')
LIGHT_GRAY = colors.HexColor('#F8F9FA')

# Random generators for realistic data
def generate_trans_id():
    return str(random.randint(40000000000, 49999999999))

def generate_auth_code():
    return ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))

def generate_card_last4():
    return str(random.randint(1000, 9999))

def get_card_type():
    types = ['Visa', 'Visa', 'Visa', 'Mastercard', 'Mastercard', 'Amex', 'Discover']
    return random.choice(types)

# Customer name pool for generated transactions
first_names = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 
               'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
               'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
               'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
               'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
               'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa']

last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
              'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
              'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
              'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
              'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
              'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell']

products_prices = [
    ('Hair Bender 12oz', 50.95),
    ('Holler Mountain 12oz', 51.99),
    ('Ethiopia Mordecofe 12oz', 55.99),
    ('Trapper Creek Decaf 12oz', 54.95),
    ('Guatemala Injerto 12oz', 54.99),
    ('Colombia El Jordan 12oz', 55.95),
    ('Ethiopia Duromina 12oz', 59.99),
    ('Indonesia Beis Penantan 12oz', 56.95),
    ('Costa Rica Bella Vista 12oz', 57.99),
    ('Ethiopia Suke Quto 12oz', 61.95),
    ('Cold Brew Concentrate', 44.99),
    ('Cold Brew Stubby 4-pack', 35.95),
    ('Single Bag Subscription', 47.95),
    ('Two Bag Subscription', 76.99),
    ('Family Pack Subscription', 97.95),
    ('3-Month Gift Subscription', 105.99),
    ('6-Month Gift Subscription', 183.95),
    ('12-Month Gift Subscription', 317.99),
    ('Origami Dripper', 42.00),
    ('Hario Buono Kettle', 64.95),
    ('AeroPress', 39.95),
    ('Hario Scale', 55.00),
    ('Hair Bender 5lb', 152.85),
]

# Generate all transactions
all_transactions = []

# First, add the existing customer orders from JSON (last 60 days) - updated to 2025
for order in data['customer_orders']:
    # Convert 2024 dates to 2025
    order_date = order['order_date'].replace('2024', '2025')
    ship_date = (order['ship_date'] or order['order_date']).replace('2024', '2025')
    trans = {
        'date': order_date,
        'settle_date': ship_date,
        'trans_id': generate_trans_id(),
        'auth_code': generate_auth_code(),
        'card_type': get_card_type(),
        'card_last4': generate_card_last4(),
        'customer': order['customer']['name'],
        'amount': order['total'],
        'status': 'Settled',
        'type': 'Auth + Capture',
        'order_id': order['order_id']
    }
    all_transactions.append(trans)

# Generate additional transactions for June 17 - Oct 17, 2025 (approximately 120 days before existing data)
start_date = datetime(2025, 6, 17)
end_date = datetime(2025, 10, 17)

# Generate roughly 80-100 additional transactions
num_additional = random.randint(85, 100)
date_range_days = (end_date - start_date).days

for _ in range(num_additional):
    random_days = random.randint(0, date_range_days)
    trans_date = start_date + timedelta(days=random_days)
    settle_date = trans_date + timedelta(days=random.randint(0, 1))
    
    # Random order composition
    num_items = random.randint(1, 3)
    base_amount = sum(random.choice(products_prices)[1] for _ in range(num_items))
    
    # Apply random discount (30% chance)
    discount = 0
    if random.random() < 0.3:
        discount_rate = random.choice([0.10, 0.15, 0.30])
        discount = round(base_amount * discount_rate, 2)
    
    # Calculate tax (varies by state, ~7% average)
    tax_rate = random.uniform(0, 0.10)
    subtotal = base_amount - discount
    tax = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax, 2)
    
    # Small chance of refund
    status = 'Settled'
    trans_type = 'Auth + Capture'
    if random.random() < 0.03:  # 3% refund rate
        status = 'Refunded'
        trans_type = 'Refund'
    
    # Small chance of void
    if random.random() < 0.01:  # 1% void rate
        status = 'Voided'
        trans_type = 'Void'
    
    trans = {
        'date': trans_date.strftime('%Y-%m-%d'),
        'settle_date': settle_date.strftime('%Y-%m-%d'),
        'trans_id': generate_trans_id(),
        'auth_code': generate_auth_code(),
        'card_type': get_card_type(),
        'card_last4': generate_card_last4(),
        'customer': f"{random.choice(first_names)} {random.choice(last_names)}",
        'amount': total if status != 'Refunded' else -total,
        'status': status,
        'type': trans_type,
        'order_id': f"GH-{random.randint(45000, 47200)}"
    }
    all_transactions.append(trans)

# Sort all transactions by date
all_transactions.sort(key=lambda x: x['date'])

# Create PDF document
pdf_file = "Authorize.net_Merchant_Statements_Jun-Dec_2025.pdf"
doc = SimpleDocTemplate(pdf_file, pagesize=letter,
                        rightMargin=0.4*inch, leftMargin=0.4*inch,
                        topMargin=0.4*inch, bottomMargin=0.4*inch)

styles = getSampleStyleSheet()

# Custom styles
header_style = ParagraphStyle(
    'AuthNetHeader',
    parent=styles['Heading1'],
    fontSize=20,
    textColor=AUTHNET_BLUE,
    alignment=TA_LEFT,
    spaceAfter=2
)

subheader_style = ParagraphStyle(
    'AuthNetSubheader',
    parent=styles['Normal'],
    fontSize=10,
    textColor=GRAY,
    alignment=TA_LEFT,
    spaceAfter=15
)

section_style = ParagraphStyle(
    'SectionHeader',
    parent=styles['Heading2'],
    fontSize=12,
    textColor=AUTHNET_BLUE,
    spaceBefore=15,
    spaceAfter=8
)

small_style = ParagraphStyle(
    'SmallText',
    parent=styles['Normal'],
    fontSize=7,
    textColor=GRAY
)

elements = []

# Group transactions by month
from collections import defaultdict
monthly_transactions = defaultdict(list)
for trans in all_transactions:
    month_key = trans['date'][:7]  # YYYY-MM
    monthly_transactions[month_key].append(trans)

# Sort months
sorted_months = sorted(monthly_transactions.keys())

# Generate statement for each month
for month_idx, month_key in enumerate(sorted_months):
    month_trans = monthly_transactions[month_key]
    month_date = datetime.strptime(month_key + '-01', '%Y-%m-%d')
    month_name = month_date.strftime('%B %Y')
    
    # Calculate month-end date
    if month_date.month == 12:
        month_end = datetime(month_date.year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = datetime(month_date.year, month_date.month + 1, 1) - timedelta(days=1)
    
    # ============================================
    # HEADER
    # ============================================
    if month_idx > 0:
        elements.append(PageBreak())
    
    # Authorize.net logo area
    header_table = Table([
        [Paragraph("<b>Authorize.net</b>", ParagraphStyle('Logo', fontSize=18, textColor=AUTHNET_BLUE)),
         Paragraph("MERCHANT STATEMENT", ParagraphStyle('Title', fontSize=14, textColor=GRAY, alignment=TA_RIGHT))]
    ], colWidths=[4*inch, 3.5*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=2, color=AUTHNET_BLUE, spaceBefore=5, spaceAfter=15))
    
    # Merchant info and statement period
    info_data = [
        ['MERCHANT INFORMATION', '', 'STATEMENT PERIOD', ''],
        ['Merchant Name:', 'Grainhouse Coffee', 'From:', month_date.strftime('%m/%d/%Y')],
        ['Merchant ID:', '4847291058', 'To:', month_end.strftime('%m/%d/%Y')],
        ['Gateway ID:', 'GHC-2847-PROD', 'Page:', f'{month_idx + 1} of {len(sorted_months)}'],
        ['Account Type:', 'Card Not Present', '', ''],
    ]
    
    info_table = Table(info_data, colWidths=[1.2*inch, 2.3*inch, 1*inch, 1.2*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (-1, 0), AUTHNET_BLUE),
        ('BACKGROUND', (0, 0), (-1, 0), AUTHNET_LIGHT_BLUE),
        ('SPAN', (0, 0), (1, 0)),
        ('SPAN', (2, 0), (3, 0)),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # ============================================
    # MONTHLY SUMMARY
    # ============================================
    elements.append(Paragraph("MONTHLY SUMMARY", section_style))
    
    # Calculate stats
    settled_trans = [t for t in month_trans if t['status'] == 'Settled']
    refunded_trans = [t for t in month_trans if t['status'] == 'Refunded']
    voided_trans = [t for t in month_trans if t['status'] == 'Voided']
    
    gross_sales = sum(t['amount'] for t in settled_trans)
    refunds = sum(abs(t['amount']) for t in refunded_trans)
    net_sales = gross_sales - refunds
    
    # Processing fees (roughly 2.9% + $0.30 per transaction)
    processing_fees = round(len(settled_trans) * 0.30 + gross_sales * 0.029, 2)
    net_deposit = round(net_sales - processing_fees, 2)
    
    # Card breakdown
    card_breakdown = defaultdict(lambda: {'count': 0, 'amount': 0})
    for t in settled_trans:
        card_breakdown[t['card_type']]['count'] += 1
        card_breakdown[t['card_type']]['amount'] += t['amount']
    
    summary_data = [
        ['Transaction Summary', '', '', 'Card Type Breakdown', '', ''],
        ['Approved Transactions:', str(len(settled_trans)), f'${gross_sales:,.2f}', 'Card Type', 'Count', 'Amount'],
        ['Refunds:', str(len(refunded_trans)), f'-${refunds:,.2f}', 
         'Visa', str(card_breakdown['Visa']['count']), f"${card_breakdown['Visa']['amount']:,.2f}"],
        ['Voids:', str(len(voided_trans)), '$0.00',
         'Mastercard', str(card_breakdown['Mastercard']['count']), f"${card_breakdown['Mastercard']['amount']:,.2f}"],
        ['', '', '',
         'Amex', str(card_breakdown['Amex']['count']), f"${card_breakdown['Amex']['amount']:,.2f}"],
        ['Gross Sales:', '', f'${gross_sales:,.2f}',
         'Discover', str(card_breakdown['Discover']['count']), f"${card_breakdown['Discover']['amount']:,.2f}"],
        ['Processing Fees:', '', f'-${processing_fees:,.2f}', '', '', ''],
        ['NET DEPOSIT:', '', f'${net_deposit:,.2f}', '', '', ''],
    ]
    
    summary_table = Table(summary_data, colWidths=[1.3*inch, 0.6*inch, 1*inch, 0.9*inch, 0.6*inch, 1*inch])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (3, 1), (5, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (2, 0), AUTHNET_LIGHT_BLUE),
        ('BACKGROUND', (3, 0), (5, 0), AUTHNET_LIGHT_BLUE),
        ('BACKGROUND', (3, 1), (5, 1), LIGHT_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), AUTHNET_BLUE),
        ('SPAN', (0, 0), (2, 0)),
        ('SPAN', (3, 0), (5, 0)),
        ('ALIGN', (1, 1), (2, -1), 'RIGHT'),
        ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (2, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (2, -1), AUTHNET_LIGHT_BLUE),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('BOX', (0, 0), (2, -1), 0.5, GRAY),
        ('BOX', (3, 0), (5, 5), 0.5, GRAY),
        ('LINEBELOW', (0, 0), (2, 0), 0.5, GRAY),
        ('LINEBELOW', (3, 1), (5, 1), 0.5, GRAY),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # ============================================
    # TRANSACTION DETAIL
    # ============================================
    elements.append(Paragraph("TRANSACTION DETAIL", section_style))
    
    trans_data = [['Date', 'Trans ID', 'Auth Code', 'Card', 'Last 4', 'Customer', 'Type', 'Amount', 'Status']]
    
    for t in month_trans:
        amount_str = f"${t['amount']:,.2f}" if t['amount'] >= 0 else f"-${abs(t['amount']):,.2f}"
        trans_data.append([
            t['date'],
            t['trans_id'][:8] + '...',
            t['auth_code'],
            t['card_type'][:4],
            t['card_last4'],
            t['customer'][:18] + ('...' if len(t['customer']) > 18 else ''),
            t['type'][:10],
            amount_str,
            t['status']
        ])
    
    trans_table = Table(trans_data, colWidths=[0.7*inch, 0.75*inch, 0.6*inch, 0.45*inch, 0.4*inch, 1.25*inch, 0.7*inch, 0.7*inch, 0.6*inch])
    
    table_style = [
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTSIZE', (0, 1), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (-1, 0), AUTHNET_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (7, 1), (7, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.25, GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]
    
    # Color code status
    for i, t in enumerate(month_trans, 1):
        if t['status'] == 'Settled':
            table_style.append(('TEXTCOLOR', (8, i), (8, i), AUTHNET_GREEN))
        elif t['status'] == 'Refunded':
            table_style.append(('TEXTCOLOR', (8, i), (8, i), AUTHNET_RED))
            table_style.append(('TEXTCOLOR', (7, i), (7, i), AUTHNET_RED))
        elif t['status'] == 'Voided':
            table_style.append(('TEXTCOLOR', (8, i), (8, i), colors.orange))
    
    trans_table.setStyle(TableStyle(table_style))
    elements.append(trans_table)
    
    # ============================================
    # FOOTER
    # ============================================
    elements.append(Spacer(1, 0.2*inch))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=GRAY, spaceBefore=10, spaceAfter=5))
    
    footer_text = """<font size=6 color=gray>
    This statement is provided for informational purposes only. Authorize.net is a registered trademark of Visa Inc.
    For questions about this statement, contact Merchant Support at 1-877-447-3938 or support@authorize.net
    <br/>Merchant Agreement ID: MA-4847291058-2025 | Gateway: api.authorize.net | Settlement: Daily ACH
    </font>"""
    elements.append(Paragraph(footer_text, styles['Normal']))

# ============================================
# FINAL SUMMARY PAGE
# ============================================
elements.append(PageBreak())

# Header
elements.append(Paragraph("<b>Authorize.net</b>", ParagraphStyle('Logo', fontSize=18, textColor=AUTHNET_BLUE)))
elements.append(Paragraph("6-MONTH ACCOUNT SUMMARY", ParagraphStyle('Title', fontSize=14, textColor=GRAY)))
elements.append(HRFlowable(width="100%", thickness=2, color=AUTHNET_BLUE, spaceBefore=5, spaceAfter=15))

elements.append(Paragraph(f"Period: June 17, 2025 - December 17, 2025", subheader_style))

# Overall stats
all_settled = [t for t in all_transactions if t['status'] == 'Settled']
all_refunded = [t for t in all_transactions if t['status'] == 'Refunded']
total_gross = sum(t['amount'] for t in all_settled)
total_refunds = sum(abs(t['amount']) for t in all_refunded)
total_fees = round(len(all_settled) * 0.30 + total_gross * 0.029, 2)
total_net = round(total_gross - total_refunds - total_fees, 2)

overall_data = [
    ['6-MONTH TOTALS', ''],
    ['Total Transactions', str(len(all_transactions))],
    ['Approved Transactions', str(len(all_settled))],
    ['Refunded Transactions', str(len(all_refunded))],
    ['', ''],
    ['Gross Sales', f'${total_gross:,.2f}'],
    ['Total Refunds', f'-${total_refunds:,.2f}'],
    ['Processing Fees (2.9% + $0.30)', f'-${total_fees:,.2f}'],
    ['', ''],
    ['NET DEPOSITS', f'${total_net:,.2f}'],
]

overall_table = Table(overall_data, colWidths=[3*inch, 1.5*inch])
overall_table.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('BACKGROUND', (0, 0), (-1, 0), AUTHNET_BLUE),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ('FONTSIZE', (0, -1), (-1, -1), 12),
    ('BACKGROUND', (0, -1), (-1, -1), AUTHNET_LIGHT_BLUE),
    ('TEXTCOLOR', (0, -1), (-1, -1), AUTHNET_BLUE),
    ('BOX', (0, 0), (-1, -1), 1, AUTHNET_BLUE),
    ('LINEBELOW', (0, 0), (-1, 0), 1, AUTHNET_BLUE),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
elements.append(overall_table)
elements.append(Spacer(1, 0.3*inch))

# Monthly breakdown
elements.append(Paragraph("MONTHLY BREAKDOWN", section_style))

monthly_summary = [['Month', 'Transactions', 'Gross Sales', 'Refunds', 'Fees', 'Net Deposit']]
for month_key in sorted_months:
    month_trans = monthly_transactions[month_key]
    month_date = datetime.strptime(month_key + '-01', '%Y-%m-%d')
    
    settled = [t for t in month_trans if t['status'] == 'Settled']
    refunded = [t for t in month_trans if t['status'] == 'Refunded']
    
    gross = sum(t['amount'] for t in settled)
    refs = sum(abs(t['amount']) for t in refunded)
    fees = round(len(settled) * 0.30 + gross * 0.029, 2)
    net = round(gross - refs - fees, 2)
    
    monthly_summary.append([
        month_date.strftime('%B %Y'),
        str(len(month_trans)),
        f'${gross:,.2f}',
        f'-${refs:,.2f}',
        f'-${fees:,.2f}',
        f'${net:,.2f}'
    ])

# Add totals row
monthly_summary.append([
    'TOTAL',
    str(len(all_transactions)),
    f'${total_gross:,.2f}',
    f'-${total_refunds:,.2f}',
    f'-${total_fees:,.2f}',
    f'${total_net:,.2f}'
])

monthly_table = Table(monthly_summary, colWidths=[1.3*inch, 0.9*inch, 1*inch, 0.9*inch, 0.9*inch, 1*inch])
monthly_table.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BACKGROUND', (0, 0), (-1, 0), AUTHNET_BLUE),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
    ('GRID', (0, 0), (-1, -1), 0.5, GRAY),
    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ('BACKGROUND', (0, -1), (-1, -1), AUTHNET_LIGHT_BLUE),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, LIGHT_GRAY]),
]))
elements.append(monthly_table)

# Final footer
elements.append(Spacer(1, 0.5*inch))
elements.append(HRFlowable(width="100%", thickness=1, color=AUTHNET_BLUE, spaceBefore=10, spaceAfter=10))
elements.append(Paragraph("""
<font size=8 color=gray>
<b>Authorize.net</b> | A Visa Solution<br/>
P.O. Box 8999, San Francisco, CA 94128-8999<br/>
Merchant Support: 1-877-447-3938 | www.authorize.net<br/><br/>
This document contains confidential merchant account information. 
Unauthorized distribution is prohibited.
</font>
""", ParagraphStyle('Footer', alignment=TA_CENTER)))

# Build PDF
doc.build(elements)

print(f"\n[SUCCESS] Authorize.net statements generated: {pdf_file}")
print(f"\nStatement Summary:")
print(f"  Period: June 17 - December 17, 2025 (6 months)")
print(f"  Total Transactions: {len(all_transactions)}")
print(f"  Gross Sales: ${total_gross:,.2f}")
print(f"  Net Deposits: ${total_net:,.2f}")
print(f"\nMonthly statements included for:")
for month_key in sorted_months:
    month_date = datetime.strptime(month_key + '-01', '%Y-%m-%d')
    print(f"  - {month_date.strftime('%B %Y')}")

