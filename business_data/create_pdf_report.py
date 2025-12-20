"""
Generate formatted PDF report for Grainhouse Coffee business data
"""

import json
from datetime import datetime

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
except ImportError:
    print("Installing reportlab...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'reportlab'])
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Load the JSON data
with open('purchase_orders_and_tracking.json', 'r') as f:
    data = json.load(f)

# Define colors (Grainhouse brand)
BROWN = colors.HexColor('#4A3728')
GOLD = colors.HexColor('#C9A96E')
CREAM = colors.HexColor('#F5F0E8')
DARK = colors.HexColor('#1A1A1A')
GREEN = colors.HexColor('#2D5A3D')
LIGHT_GREEN = colors.HexColor('#E8F5E9')
LIGHT_ORANGE = colors.HexColor('#FFF3E0')
LIGHT_RED = colors.HexColor('#FFEBEE')

# Create PDF document
pdf_file = "Grainhouse_Coffee_Business_Report.pdf"
doc = SimpleDocTemplate(pdf_file, pagesize=letter, 
                        rightMargin=0.5*inch, leftMargin=0.5*inch,
                        topMargin=0.5*inch, bottomMargin=0.5*inch)

# Get styles
styles = getSampleStyleSheet()

# Custom styles
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=BROWN,
    alignment=TA_CENTER,
    spaceAfter=6
)

subtitle_style = ParagraphStyle(
    'CustomSubtitle',
    parent=styles['Normal'],
    fontSize=12,
    textColor=DARK,
    alignment=TA_CENTER,
    spaceAfter=20
)

section_style = ParagraphStyle(
    'SectionHeader',
    parent=styles['Heading2'],
    fontSize=14,
    textColor=colors.white,
    backColor=BROWN,
    alignment=TA_LEFT,
    spaceBefore=15,
    spaceAfter=10,
    leftIndent=6,
    rightIndent=6,
    borderPadding=8
)

subsection_style = ParagraphStyle(
    'SubsectionHeader',
    parent=styles['Heading3'],
    fontSize=12,
    textColor=BROWN,
    spaceBefore=12,
    spaceAfter=6
)

normal_style = ParagraphStyle(
    'CustomNormal',
    parent=styles['Normal'],
    fontSize=9,
    textColor=DARK
)

# Build document elements
elements = []

# ============================================
# COVER / HEADER
# ============================================
elements.append(Spacer(1, 0.5*inch))
elements.append(Paragraph("GRAINHOUSE COFFEE", title_style))
elements.append(Paragraph("Business Report", ParagraphStyle('Sub', parent=title_style, fontSize=16, textColor=GOLD)))
elements.append(Spacer(1, 0.2*inch))
elements.append(HRFlowable(width="80%", thickness=2, color=GOLD, spaceBefore=10, spaceAfter=10))
elements.append(Paragraph("Report Period: October 18 - December 17, 2024 (60 Days)", subtitle_style))
elements.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", 
                         ParagraphStyle('Date', parent=subtitle_style, fontSize=10, textColor=colors.gray)))

# ============================================
# EXECUTIVE SUMMARY
# ============================================
elements.append(Spacer(1, 0.3*inch))

# Summary table
summary_data = [
    ['SUPPLIER SPENDING', '', 'CUSTOMER SALES', ''],
    ['Total Purchase Orders', '8', 'Total Orders', '24'],
    ['Green Coffee Beans', '$52,101.70', 'Total Revenue', '$4,108.62'],
    ['Packaging Materials', '$7,660.00', 'Average Order Value', '$171.19'],
    ['Equipment/Parts', '$1,371.00', 'Orders Delivered', '20 (83%)'],
    ['Shipping & Logistics', '$11,575.00', 'Orders In Transit', '2 (8%)'],
    ['Import Duties', '$2,529.45', 'Discounts Given', '$363.69'],
    ['TOTAL SPEND', '$61,563.95', '', ''],
]

summary_table = Table(summary_data, colWidths=[2*inch, 1.3*inch, 2*inch, 1.3*inch])
summary_table.setStyle(TableStyle([
    # Header row
    ('BACKGROUND', (0, 0), (1, 0), BROWN),
    ('BACKGROUND', (2, 0), (3, 0), GREEN),
    ('TEXTCOLOR', (0, 0), (3, 0), colors.white),
    ('FONTNAME', (0, 0), (3, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (3, 0), 11),
    ('ALIGN', (0, 0), (3, 0), 'CENTER'),
    # Data rows
    ('FONTNAME', (0, 1), (3, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (3, -1), 9),
    ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
    ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
    # Total row bold
    ('FONTNAME', (0, -1), (1, -1), 'Helvetica-Bold'),
    ('BACKGROUND', (0, -1), (1, -1), CREAM),
    # Grid
    ('GRID', (0, 0), (3, -1), 0.5, colors.gray),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
elements.append(summary_table)

# ============================================
# TOP PRODUCTS & DISCOUNT CODES
# ============================================
elements.append(Spacer(1, 0.3*inch))

products_discounts = [
    ['TOP SELLING PRODUCTS', '', '', 'DISCOUNT CODE USAGE', '', ''],
    ['Product', 'Orders', 'Revenue', 'Code', 'Uses', 'Savings'],
    ['Hair Bender', '8', '$407.60', 'WELCOME10', '5', '$87.56'],
    ['Holler Mountain', '5', '$259.95', 'HOLIDAY15', '6', '$156.21'],
    ['Ethiopia Mordecofe', '4', '$223.96', 'SAVE30', '4', '$89.98'],
    ['Guatemala Injerto', '3', '$164.97', '', '', ''],
    ['Two Bag Subscription', '3', '$230.97', 'TOTAL', '15', '$363.69'],
]

pd_table = Table(products_discounts, colWidths=[1.5*inch, 0.7*inch, 0.9*inch, 1.2*inch, 0.6*inch, 0.9*inch])
pd_table.setStyle(TableStyle([
    ('SPAN', (0, 0), (2, 0)),
    ('SPAN', (3, 0), (5, 0)),
    ('BACKGROUND', (0, 0), (2, 0), GOLD),
    ('BACKGROUND', (3, 0), (5, 0), GOLD),
    ('BACKGROUND', (0, 1), (5, 1), CREAM),
    ('TEXTCOLOR', (0, 0), (5, 0), DARK),
    ('FONTNAME', (0, 0), (5, 1), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('ALIGN', (0, 0), (5, 1), 'CENTER'),
    ('ALIGN', (1, 2), (2, -1), 'CENTER'),
    ('ALIGN', (4, 2), (5, -1), 'CENTER'),
    ('FONTNAME', (3, -1), (5, -1), 'Helvetica-Bold'),
    ('GRID', (0, 0), (5, -1), 0.5, colors.gray),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]))
elements.append(pd_table)

# ============================================
# PAGE BREAK - SUPPLIERS
# ============================================
elements.append(PageBreak())
elements.append(Paragraph("SUPPLIERS", section_style))
elements.append(Spacer(1, 0.1*inch))

supplier_data = [['ID', 'Company', 'Contact', 'Email', 'Specialty']]
for s in data['suppliers']:
    supplier_data.append([s['id'], s['name'], s['contact'], s['email'], s['specialty']])

supplier_table = Table(supplier_data, colWidths=[0.7*inch, 1.8*inch, 1.2*inch, 1.8*inch, 1.8*inch])
supplier_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), BROWN),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 8),
    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, CREAM]),
]))
elements.append(supplier_table)

# ============================================
# PURCHASE ORDERS
# ============================================
elements.append(Spacer(1, 0.3*inch))
elements.append(Paragraph("SUPPLIER PURCHASE ORDERS", section_style))
elements.append(Spacer(1, 0.1*inch))

po_data = [['PO Number', 'Supplier', 'Order Date', 'Status', 'Tracking', 'Total']]
for po in data['supplier_purchase_orders']:
    status = po['status']
    po_data.append([
        po['po_number'],
        po['supplier_name'][:25] + '...' if len(po['supplier_name']) > 25 else po['supplier_name'],
        po['order_date'],
        status,
        po['tracking_number'][:15] + '...' if po['tracking_number'] and len(po['tracking_number']) > 15 else (po['tracking_number'] or '-'),
        f"${po['total']:,.2f}"
    ])

po_table = Table(po_data, colWidths=[1*inch, 1.8*inch, 0.9*inch, 0.8*inch, 1.3*inch, 1*inch])
po_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), BROWN),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 8),
    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
    ('FONTNAME', (-1, 1), (-1, -1), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))

# Color code status
for i, po in enumerate(data['supplier_purchase_orders'], 1):
    if po['status'] == 'Delivered':
        po_table.setStyle(TableStyle([('BACKGROUND', (3, i), (3, i), LIGHT_GREEN)]))
    elif po['status'] == 'In Transit':
        po_table.setStyle(TableStyle([('BACKGROUND', (3, i), (3, i), LIGHT_ORANGE)]))

elements.append(po_table)

# Total row
elements.append(Spacer(1, 0.1*inch))
total_spend = sum(po['total'] for po in data['supplier_purchase_orders'])
elements.append(Paragraph(f"<b>Total Supplier Spend: ${total_spend:,.2f}</b>", 
                         ParagraphStyle('Total', parent=normal_style, fontSize=10, alignment=TA_RIGHT)))

# ============================================
# PAGE BREAK - CUSTOMER ORDERS
# ============================================
elements.append(PageBreak())
elements.append(Paragraph("CUSTOMER ORDERS", section_style))
elements.append(Spacer(1, 0.1*inch))

# Split into two tables for readability
order_data1 = [['Order ID', 'Date', 'Customer', 'City, State', 'Status', 'Total']]
for order in data['customer_orders']:
    status = order['status']
    order_data1.append([
        order['order_id'],
        order['order_date'],
        order['customer']['name'],
        f"{order['customer']['city']}, {order['customer']['state']}",
        status,
        f"${order['total']:,.2f}"
    ])

order_table1 = Table(order_data1, colWidths=[0.8*inch, 0.9*inch, 1.4*inch, 1.4*inch, 0.9*inch, 0.8*inch])
order_table1.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), BROWN),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 7),
    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
    ('FONTNAME', (-1, 1), (-1, -1), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))

# Color code status
for i, order in enumerate(data['customer_orders'], 1):
    if order['status'] == 'Delivered':
        order_table1.setStyle(TableStyle([('BACKGROUND', (4, i), (4, i), LIGHT_GREEN)]))
    elif order['status'] == 'In Transit':
        order_table1.setStyle(TableStyle([('BACKGROUND', (4, i), (4, i), LIGHT_ORANGE)]))
    elif order['status'] in ['Processing', 'Pending']:
        order_table1.setStyle(TableStyle([('BACKGROUND', (4, i), (4, i), LIGHT_RED)]))

elements.append(order_table1)

# Total row
elements.append(Spacer(1, 0.1*inch))
total_revenue = sum(order['total'] for order in data['customer_orders'])
elements.append(Paragraph(f"<b>Total Customer Revenue: ${total_revenue:,.2f}</b>", 
                         ParagraphStyle('Total', parent=normal_style, fontSize=10, alignment=TA_RIGHT)))

# ============================================
# PAGE BREAK - TRACKING DETAILS
# ============================================
elements.append(PageBreak())
elements.append(Paragraph("SHIPMENT TRACKING DETAILS", section_style))
elements.append(Spacer(1, 0.1*inch))

tracking_data = [['Order ID', 'Customer', 'Tracking Number', 'Carrier', 'Status']]
for order in data['customer_orders']:
    tracking = order['tracking_number'] or '-'
    tracking_data.append([
        order['order_id'],
        order['customer']['name'],
        tracking,
        order['carrier'],
        order['status']
    ])

tracking_table = Table(tracking_data, colWidths=[0.8*inch, 1.5*inch, 2.2*inch, 1.3*inch, 0.9*inch])
tracking_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), BROWN),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 7),
    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ('FONTNAME', (2, 1), (2, -1), 'Courier'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))

# Color code status
for i, order in enumerate(data['customer_orders'], 1):
    if order['status'] == 'Delivered':
        tracking_table.setStyle(TableStyle([('BACKGROUND', (4, i), (4, i), LIGHT_GREEN)]))
    elif order['status'] == 'In Transit':
        tracking_table.setStyle(TableStyle([('BACKGROUND', (4, i), (4, i), LIGHT_ORANGE)]))
    elif order['status'] in ['Processing', 'Pending']:
        tracking_table.setStyle(TableStyle([('BACKGROUND', (4, i), (4, i), LIGHT_RED)]))

elements.append(tracking_table)

# ============================================
# GREEN COFFEE INVENTORY
# ============================================
elements.append(Spacer(1, 0.3*inch))
elements.append(Paragraph("GREEN COFFEE INVENTORY", section_style))
elements.append(Spacer(1, 0.1*inch))

inventory_data = [
    ['Origin', 'Product', 'Qty (kg)', 'Cost/kg', 'Total', 'PO Number'],
    ['Colombia', 'Colombia El Jordan', '500', '$8.45', '$4,225.00', 'PO-2024-0847'],
    ['Colombia', 'Colombia Huila', '300', '$7.90', '$2,370.00', 'PO-2024-0847'],
    ['Ethiopia', 'Ethiopia Mordecofe', '400', '$11.20', '$4,480.00', 'PO-2024-0863'],
    ['Ethiopia', 'Ethiopia Duromina', '350', '$12.50', '$4,375.00', 'PO-2024-0863'],
    ['Ethiopia', 'Ethiopia Suke Quto', '250', '$14.80', '$3,700.00', 'PO-2024-0863'],
    ['Indonesia', 'Indonesia Beis Penantan', '450', '$9.75', '$4,387.50', 'PO-2024-0912'],
    ['Indonesia', 'Sumatra Mandheling', '300', '$8.90', '$2,670.00', 'PO-2024-0912'],
    ['Guatemala', 'Guatemala Injerto', '400', '$9.20', '$3,680.00', 'PO-2024-0934'],
    ['Costa Rica', 'Costa Rica Bella Vista', '350', '$10.50', '$3,675.00', 'PO-2024-0934'],
    ['Ethiopia', 'Mordecofe (New Crop)', '600', '$11.50', '$6,900.00', 'PO-2024-0989'],
    ['TOTAL', '', '3,900 kg', '', '$40,462.50', ''],
]

inv_table = Table(inventory_data, colWidths=[0.9*inch, 1.6*inch, 0.7*inch, 0.7*inch, 0.9*inch, 1.1*inch])
inv_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), BROWN),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 8),
    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
    ('ALIGN', (2, 1), (4, -1), 'RIGHT'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    # Total row
    ('BACKGROUND', (0, -1), (-1, -1), CREAM),
    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
]))
elements.append(inv_table)

# ============================================
# FOOTER
# ============================================
elements.append(Spacer(1, 0.5*inch))
elements.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=10, spaceAfter=10))
elements.append(Paragraph("Grainhouse Coffee Roasters | 2847 NW Industrial Way, Portland, OR 97210 | (503) 555-0187",
                         ParagraphStyle('Footer', parent=normal_style, fontSize=8, alignment=TA_CENTER, textColor=colors.gray)))

# Build PDF
doc.build(elements)
print(f"\n[SUCCESS] PDF report generated: {pdf_file}")
print("\nSections included:")
print("  - Executive Summary (spending & revenue)")
print("  - Top Products & Discount Codes")
print("  - Suppliers Directory")
print("  - Supplier Purchase Orders")
print("  - Customer Orders")
print("  - Shipment Tracking Details")
print("  - Green Coffee Inventory")

