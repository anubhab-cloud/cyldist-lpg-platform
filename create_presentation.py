#!/usr/bin/env python3
"""
Generate a professional 9-slide PPTX presentation for
Cylinder Distribution Platform Backend API.
Uses only Python standard library (zipfile + xml.etree.ElementTree).
"""

import zipfile
import xml.etree.ElementTree as ET
import os
import copy

# Constants for Open XML
EMU = 914400  # 1 inch in EMUs
CM = 360000   # 1 cm in EMUs
SLIDE_W = 12192000  # 10 inches
SLIDE_H = 6858000   # 7.5 inches

# Color theme
BLUE_DARK = "1B2A4A"
BLUE_MED = "2E4A7A"
BLUE_LIGHT = "4A90D9"
ORANGE = "E8792B"
ORANGE_LIGHT = "F5A623"
WHITE = "FFFFFF"
GRAY_LIGHT = "F0F4F8"
GRAY_TEXT = "4A5568"
BLACK = "1A1A2E"



# XML Namespaces
NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
}

def register_namespaces():
    ET.register_namespace('a', NS['a'])
    ET.register_namespace('r', NS['r'])
    ET.register_namespace('p', NS['p'])
    ET.register_namespace('', NS['p'])

register_namespaces()

def emu(inches):
    return int(inches * EMU)

def cm_to_emu(cm):
    return int(cm * CM)



def make_solid_fill(color):
    """Create a solidFill element."""
    sf = ET.Element(f'{{{NS["a"]}}}solidFill')
    clr = ET.SubElement(sf, f'{{{NS["a"]}}}srgbClr', val=color)
    return sf

def make_text_run(text, size=1800, bold=False, color=BLACK, font="Segoe UI"):
    """Create a text run (a:r) element."""
    r = ET.Element(f'{{{NS["a"]}}}r')
    rpr = ET.SubElement(r, f'{{{NS["a"]}}}rPr', lang="en-US", sz=str(size))
    if bold:
        rpr.set('b', '1')
    sf = make_solid_fill(color)
    rpr.append(sf)
    latin = ET.SubElement(rpr, f'{{{NS["a"]}}}latin', typeface=font)
    cs = ET.SubElement(rpr, f'{{{NS["a"]}}}cs', typeface=font)
    t = ET.SubElement(r, f'{{{NS["a"]}}}t')
    t.text = text
    return r



def make_paragraph(text, size=1800, bold=False, color=BLACK, align="l", font="Segoe UI", bullet=False):
    """Create a paragraph (a:p) element."""
    p = ET.Element(f'{{{NS["a"]}}}p')
    ppr = ET.SubElement(p, f'{{{NS["a"]}}}pPr', algn=align)
    if bullet:
        buchar = ET.SubElement(ppr, f'{{{NS["a"]}}}buChar', char="\u2022")
        buclr = ET.SubElement(ppr, f'{{{NS["a"]}}}buClr')
        buclr.append(make_solid_fill(ORANGE))
    if not bullet:
        bunone = ET.SubElement(ppr, f'{{{NS["a"]}}}buNone')
    r = make_text_run(text, size, bold, color, font)
    p.append(r)
    return p

def make_textbox(left, top, width, height, paragraphs):
    """Create a shape with text box."""
    sp = ET.Element(f'{{{NS["p"]}}}sp')
    # nvSpPr
    nvsppr = ET.SubElement(sp, f'{{{NS["p"]}}}nvSpPr')
    cnvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvPr', id="0", name="TextBox")
    cnvsppr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvSpPr', txBox="1")
    nvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}nvPr')
    # spPr
    sppr = ET.SubElement(sp, f'{{{NS["p"]}}}spPr')
    xfrm = ET.SubElement(sppr, f'{{{NS["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NS["a"]}}}off', x=str(left), y=str(top))
    ET.SubElement(xfrm, f'{{{NS["a"]}}}ext', cx=str(width), cy=str(height))
    prstgeom = ET.SubElement(sppr, f'{{{NS["a"]}}}prstGeom', prst="rect")
    ET.SubElement(prstgeom, f'{{{NS["a"]}}}avLst')
    noFill = ET.SubElement(sppr, f'{{{NS["a"]}}}noFill')
    # txBody
    txbody = ET.SubElement(sp, f'{{{NS["p"]}}}txBody')
    bodypr = ET.SubElement(txbody, f'{{{NS["a"]}}}bodyPr', wrap="square", rtlCol="0")
    ET.SubElement(txbody, f'{{{NS["a"]}}}lstStyle')
    for para in paragraphs:
        txbody.append(para)
    return sp



def make_rect_shape(left, top, width, height, fill_color, border_color=None, radius=None):
    """Create a rectangle shape with fill."""
    sp = ET.Element(f'{{{NS["p"]}}}sp')
    nvsppr = ET.SubElement(sp, f'{{{NS["p"]}}}nvSpPr')
    cnvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvPr', id="0", name="Rectangle")
    cnvsppr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvSpPr')
    nvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}nvPr')
    sppr = ET.SubElement(sp, f'{{{NS["p"]}}}spPr')
    xfrm = ET.SubElement(sppr, f'{{{NS["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NS["a"]}}}off', x=str(left), y=str(top))
    ET.SubElement(xfrm, f'{{{NS["a"]}}}ext', cx=str(width), cy=str(height))
    prst = "roundRect" if radius else "rect"
    prstgeom = ET.SubElement(sppr, f'{{{NS["a"]}}}prstGeom', prst=prst)
    avlst = ET.SubElement(prstgeom, f'{{{NS["a"]}}}avLst')
    if radius:
        ET.SubElement(avlst, f'{{{NS["a"]}}}gd', name="adj", fmla=f"val {radius}")
    sf = make_solid_fill(fill_color)
    sppr.append(sf)
    if border_color:
        ln = ET.SubElement(sppr, f'{{{NS["a"]}}}ln', w="12700")
        ln.append(make_solid_fill(border_color))
    else:
        ln = ET.SubElement(sppr, f'{{{NS["a"]}}}ln')
        ET.SubElement(ln, f'{{{NS["a"]}}}noFill')
    # txBody (empty)
    txbody = ET.SubElement(sp, f'{{{NS["p"]}}}txBody')
    ET.SubElement(txbody, f'{{{NS["a"]}}}bodyPr')
    ET.SubElement(txbody, f'{{{NS["a"]}}}lstStyle')
    empty_p = ET.SubElement(txbody, f'{{{NS["a"]}}}p')
    return sp



def make_rounded_card(left, top, width, height, fill_color, title, items, title_color=WHITE, text_color=WHITE):
    """Create a rounded rectangle card with title and bullet items."""
    sp = ET.Element(f'{{{NS["p"]}}}sp')
    nvsppr = ET.SubElement(sp, f'{{{NS["p"]}}}nvSpPr')
    cnvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvPr', id="0", name="Card")
    cnvsppr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvSpPr')
    nvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}nvPr')
    sppr = ET.SubElement(sp, f'{{{NS["p"]}}}spPr')
    xfrm = ET.SubElement(sppr, f'{{{NS["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NS["a"]}}}off', x=str(left), y=str(top))
    ET.SubElement(xfrm, f'{{{NS["a"]}}}ext', cx=str(width), cy=str(height))
    prstgeom = ET.SubElement(sppr, f'{{{NS["a"]}}}prstGeom', prst="roundRect")
    avlst = ET.SubElement(prstgeom, f'{{{NS["a"]}}}avLst')
    ET.SubElement(avlst, f'{{{NS["a"]}}}gd', name="adj", fmla="val 8000")
    sppr.append(make_solid_fill(fill_color))
    ln = ET.SubElement(sppr, f'{{{NS["a"]}}}ln')
    ET.SubElement(ln, f'{{{NS["a"]}}}noFill')
    # Shadow effect
    effectLst = ET.SubElement(sppr, f'{{{NS["a"]}}}effectLst')
    outerShdw = ET.SubElement(effectLst, f'{{{NS["a"]}}}outerShdw',
                              blurRad="40000", dist="23000", dir="5400000", rotWithShape="0")
    shdw_clr = ET.SubElement(outerShdw, f'{{{NS["a"]}}}srgbClr', val="000000")
    ET.SubElement(shdw_clr, f'{{{NS["a"]}}}alpha', val="35000")
    # txBody
    txbody = ET.SubElement(sp, f'{{{NS["p"]}}}txBody')
    bodypr = ET.SubElement(txbody, f'{{{NS["a"]}}}bodyPr', wrap="square", rtlCol="0",
                           lIns="91440", tIns="91440", rIns="91440", bIns="45720")
    ET.SubElement(txbody, f'{{{NS["a"]}}}lstStyle')
    # Title paragraph
    title_p = make_paragraph(title, size=1600, bold=True, color=title_color, align="l", font="Segoe UI Semibold")
    txbody.append(title_p)
    # Items
    for item in items:
        item_p = make_paragraph(f"  \u2022 {item}", size=1200, color=text_color, align="l")
        txbody.append(item_p)
    return sp



def make_gradient_rect(left, top, width, height, color1, color2, direction="r"):
    """Create a rectangle with gradient fill."""
    sp = ET.Element(f'{{{NS["p"]}}}sp')
    nvsppr = ET.SubElement(sp, f'{{{NS["p"]}}}nvSpPr')
    cnvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvPr', id="0", name="GradRect")
    cnvsppr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvSpPr')
    nvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}nvPr')
    sppr = ET.SubElement(sp, f'{{{NS["p"]}}}spPr')
    xfrm = ET.SubElement(sppr, f'{{{NS["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NS["a"]}}}off', x=str(left), y=str(top))
    ET.SubElement(xfrm, f'{{{NS["a"]}}}ext', cx=str(width), cy=str(height))
    prstgeom = ET.SubElement(sppr, f'{{{NS["a"]}}}prstGeom', prst="rect")
    ET.SubElement(prstgeom, f'{{{NS["a"]}}}avLst')
    # Gradient fill
    gradfill = ET.SubElement(sppr, f'{{{NS["a"]}}}gradFill')
    gslst = ET.SubElement(gradfill, f'{{{NS["a"]}}}gsLst')
    gs1 = ET.SubElement(gslst, f'{{{NS["a"]}}}gs', pos="0")
    ET.SubElement(gs1, f'{{{NS["a"]}}}srgbClr', val=color1)
    gs2 = ET.SubElement(gslst, f'{{{NS["a"]}}}gs', pos="100000")
    ET.SubElement(gs2, f'{{{NS["a"]}}}srgbClr', val=color2)
    angle = "0" if direction == "r" else "5400000"
    lin = ET.SubElement(gradfill, f'{{{NS["a"]}}}lin', ang=angle, scaled="1")
    ln = ET.SubElement(sppr, f'{{{NS["a"]}}}ln')
    ET.SubElement(ln, f'{{{NS["a"]}}}noFill')
    txbody = ET.SubElement(sp, f'{{{NS["p"]}}}txBody')
    ET.SubElement(txbody, f'{{{NS["a"]}}}bodyPr')
    ET.SubElement(txbody, f'{{{NS["a"]}}}lstStyle')
    ET.SubElement(txbody, f'{{{NS["a"]}}}p')
    return sp



def make_line_shape(x1, y1, x2, y2, color=BLUE_LIGHT, width=19050):
    """Create a line connector shape."""
    cxnsp = ET.Element(f'{{{NS["p"]}}}cxnSp')
    nvsppr = ET.SubElement(cxnsp, f'{{{NS["p"]}}}nvCxnSpPr')
    cnvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvPr', id="0", name="Line")
    cnvsppr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvCxnSpPr')
    nvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}nvPr')
    sppr = ET.SubElement(cxnsp, f'{{{NS["p"]}}}spPr')
    xfrm = ET.SubElement(sppr, f'{{{NS["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NS["a"]}}}off', x=str(min(x1,x2)), y=str(min(y1,y2)))
    ET.SubElement(xfrm, f'{{{NS["a"]}}}ext', cx=str(abs(x2-x1) or 1), cy=str(abs(y2-y1) or 1))
    prstgeom = ET.SubElement(sppr, f'{{{NS["a"]}}}prstGeom', prst="line")
    ET.SubElement(prstgeom, f'{{{NS["a"]}}}avLst')
    ln = ET.SubElement(sppr, f'{{{NS["a"]}}}ln', w=str(width))
    ln.append(make_solid_fill(color))
    # Arrow head
    tailend = ET.SubElement(ln, f'{{{NS["a"]}}}tailEnd', type="triangle", w="med", len="med")
    return cxnsp

def make_arrow_shape(left, top, width, height, color=ORANGE):
    """Create an arrow shape pointing right."""
    sp = ET.Element(f'{{{NS["p"]}}}sp')
    nvsppr = ET.SubElement(sp, f'{{{NS["p"]}}}nvSpPr')
    cnvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvPr', id="0", name="Arrow")
    cnvsppr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvSpPr')
    nvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}nvPr')
    sppr = ET.SubElement(sp, f'{{{NS["p"]}}}spPr')
    xfrm = ET.SubElement(sppr, f'{{{NS["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NS["a"]}}}off', x=str(left), y=str(top))
    ET.SubElement(xfrm, f'{{{NS["a"]}}}ext', cx=str(width), cy=str(height))
    prstgeom = ET.SubElement(sppr, f'{{{NS["a"]}}}prstGeom', prst="rightArrow")
    ET.SubElement(prstgeom, f'{{{NS["a"]}}}avLst')
    sppr.append(make_solid_fill(color))
    ln = ET.SubElement(sppr, f'{{{NS["a"]}}}ln')
    ET.SubElement(ln, f'{{{NS["a"]}}}noFill')
    txbody = ET.SubElement(sp, f'{{{NS["p"]}}}txBody')
    ET.SubElement(txbody, f'{{{NS["a"]}}}bodyPr')
    ET.SubElement(txbody, f'{{{NS["a"]}}}lstStyle')
    ET.SubElement(txbody, f'{{{NS["a"]}}}p')
    return sp



def make_circle_shape(left, top, size, fill_color, text="", text_size=1000, text_color=WHITE):
    """Create a circle with text."""
    sp = ET.Element(f'{{{NS["p"]}}}sp')
    nvsppr = ET.SubElement(sp, f'{{{NS["p"]}}}nvSpPr')
    cnvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvPr', id="0", name="Circle")
    cnvsppr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}cNvSpPr')
    nvpr = ET.SubElement(nvsppr, f'{{{NS["p"]}}}nvPr')
    sppr = ET.SubElement(sp, f'{{{NS["p"]}}}spPr')
    xfrm = ET.SubElement(sppr, f'{{{NS["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NS["a"]}}}off', x=str(left), y=str(top))
    ET.SubElement(xfrm, f'{{{NS["a"]}}}ext', cx=str(size), cy=str(size))
    prstgeom = ET.SubElement(sppr, f'{{{NS["a"]}}}prstGeom', prst="ellipse")
    ET.SubElement(prstgeom, f'{{{NS["a"]}}}avLst')
    sppr.append(make_solid_fill(fill_color))
    ln = ET.SubElement(sppr, f'{{{NS["a"]}}}ln')
    ET.SubElement(ln, f'{{{NS["a"]}}}noFill')
    txbody = ET.SubElement(sp, f'{{{NS["p"]}}}txBody')
    bodypr = ET.SubElement(txbody, f'{{{NS["a"]}}}bodyPr', anchor="ctr")
    ET.SubElement(txbody, f'{{{NS["a"]}}}lstStyle')
    p = make_paragraph(text, size=text_size, bold=True, color=text_color, align="ctr")
    txbody.append(p)
    return sp



def make_slide_header(title, subtitle=None):
    """Create a standard slide header with accent bar."""
    shapes = []
    # Top accent bar
    shapes.append(make_gradient_rect(0, 0, SLIDE_W, emu(0.6), BLUE_DARK, BLUE_MED, "r"))
    # Orange accent line
    shapes.append(make_rect_shape(0, emu(0.6), SLIDE_W, emu(0.05), ORANGE))
    # Title
    paras = [make_paragraph(title, size=2800, bold=True, color=BLUE_DARK, align="l", font="Segoe UI Semibold")]
    if subtitle:
        paras.append(make_paragraph(subtitle, size=1400, color=GRAY_TEXT, align="l"))
    shapes.append(make_textbox(emu(0.5), emu(0.8), emu(9), emu(1.0), paras))
    return shapes



def create_slide1_title():
    """Slide 1: Title Slide"""
    shapes = []
    # Full background gradient
    shapes.append(make_gradient_rect(0, 0, SLIDE_W, SLIDE_H, BLUE_DARK, "1A2744", "d"))
    # Decorative orange bar top
    shapes.append(make_rect_shape(0, 0, SLIDE_W, emu(0.08), ORANGE))
    # Large decorative circle (top right)
    shapes.append(make_circle_shape(emu(7.5), emu(-0.5), emu(3), "2A3F6A", ""))
    # Small decorative circle (bottom left)
    shapes.append(make_circle_shape(emu(-0.5), emu(5.5), emu(2), "2A3F6A", ""))
    # Orange accent shape
    shapes.append(make_rect_shape(emu(0.5), emu(2.6), emu(0.08), emu(1.5), ORANGE))
    # Project Title
    paras_title = [
        make_paragraph("\U0001F6E2  Cylinder Distribution Platform", size=3600, bold=True, color=WHITE, align="l", font="Segoe UI Semibold"),
        make_paragraph("Backend API", size=2800, bold=True, color=ORANGE_LIGHT, align="l", font="Segoe UI"),
    ]
    shapes.append(make_textbox(emu(0.8), emu(2.2), emu(8), emu(2.0), paras_title))
    # Subtitle
    paras_sub = [
        make_paragraph("Production-Grade LPG Delivery Service Platform", size=1600, color="B8C5D9", align="l"),
    ]
    shapes.append(make_textbox(emu(0.8), emu(4.2), emu(7), emu(0.6), paras_sub))
    # Team info card
    paras_team = [
        make_paragraph("\U0001F465  Team CylDist", size=1600, bold=True, color=ORANGE_LIGHT, align="l"),
        make_paragraph("", size=800, color=WHITE, align="l"),
        make_paragraph("Team Members:", size=1200, bold=True, color=WHITE, align="l"),
        make_paragraph("  \u2022 Member 1 - Full Stack Developer", size=1100, color="B8C5D9", align="l"),
        make_paragraph("  \u2022 Member 2 - Backend Engineer", size=1100, color="B8C5D9", align="l"),
        make_paragraph("  \u2022 Member 3 - DevOps & Database", size=1100, color="B8C5D9", align="l"),
        make_paragraph("  \u2022 Member 4 - Frontend & Testing", size=1100, color="B8C5D9", align="l"),
        make_paragraph("", size=800, color=WHITE, align="l"),
        make_paragraph("\U0001F3EB  Department of Computer Engineering", size=1100, color="8899B3", align="l"),
        make_paragraph("     [Your College Name], 2025", size=1100, color="8899B3", align="l"),
    ]
    shapes.append(make_textbox(emu(0.8), emu(4.9), emu(6), emu(2.5), paras_team))
    # Bottom orange bar
    shapes.append(make_rect_shape(0, emu(7.42), SLIDE_W, emu(0.08), ORANGE))
    return shapes



def create_slide2_intro():
    """Slide 2: Introduction & Objectives"""
    shapes = make_slide_header("Introduction & Objectives",
                               "Overview of the LPG Cylinder Distribution Platform")
    # Left panel - Introduction
    shapes.append(make_rounded_card(
        emu(0.4), emu(1.9), emu(4.5), emu(3.2),
        BLUE_MED,
        "\U0001F4CB  Platform Overview",
        [
            "Digital LPG cylinder booking",
            "& delivery management system",
            "",
            "Multi-role platform: Admin,",
            "Customer, Delivery Agent",
            "",
            "Real-time tracking & live chat",
            "End-to-end order lifecycle",
        ]
    ))
    # Right panel - Objectives
    shapes.append(make_rounded_card(
        emu(5.2), emu(1.9), emu(4.5), emu(3.2),
        BLUE_DARK,
        "\U0001F3AF  Key Objectives",
        [
            "Digitize traditional LPG",
            "distribution workflow",
            "",
            "Provide real-time GPS tracking",
            "Enable emergency prioritization",
            "",
            "Secure & scalable architecture",
            "Production-ready deployment",
        ]
    ))
    # Bottom highlights bar
    shapes.append(make_rect_shape(emu(0.4), emu(5.3), emu(9.3), emu(1.8), GRAY_LIGHT, radius=5000))
    highlight_paras = [
        make_paragraph("\U0001F4A1 Key Highlights", size=1400, bold=True, color=BLUE_DARK, align="l"),
        make_paragraph("", size=600, color=BLACK, align="l"),
        make_paragraph("  \u25B6 Node.js + Express.js Backend    \u25B6 MongoDB + Redis Database Layer    \u25B6 Socket.IO Real-Time", size=1100, color=GRAY_TEXT, align="l"),
        make_paragraph("  \u25B6 Docker & Kubernetes Ready        \u25B6 JWT Auth + RBAC Security         \u25B6 Swagger API Docs", size=1100, color=GRAY_TEXT, align="l"),
    ]
    shapes.append(make_textbox(emu(0.6), emu(5.4), emu(9), emu(1.7), highlight_paras))
    return shapes



def create_slide3_problem():
    """Slide 3: Problem Statement & Proposed Solution"""
    shapes = make_slide_header("Problem Statement & Proposed Solution")
    # Problem side (left)
    shapes.append(make_rect_shape(emu(0.4), emu(1.9), emu(4.4), emu(0.45), "D32F2F", radius=3000))
    shapes.append(make_textbox(emu(0.5), emu(1.92), emu(4.3), emu(0.45),
        [make_paragraph("\u26A0  Problems in Traditional System", size=1300, bold=True, color=WHITE, align="ctr")]))
    problem_paras = [
        make_paragraph("", size=400, color=BLACK, align="l"),
        make_paragraph("  \u2716  Manual booking via phone/visits", size=1200, color="B71C1C", align="l"),
        make_paragraph("  \u2716  No real-time delivery tracking", size=1200, color="B71C1C", align="l"),
        make_paragraph("  \u2716  Inventory management opaque", size=1200, color="B71C1C", align="l"),
        make_paragraph("  \u2716  No priority during emergencies", size=1200, color="B71C1C", align="l"),
        make_paragraph("  \u2716  Paper-based record keeping", size=1200, color="B71C1C", align="l"),
        make_paragraph("  \u2716  No communication channel", size=1200, color="B71C1C", align="l"),
    ]
    shapes.append(make_textbox(emu(0.5), emu(2.35), emu(4.3), emu(3.2), problem_paras))
    # Arrow in middle
    shapes.append(make_arrow_shape(emu(4.6), emu(3.8), emu(0.7), emu(0.5), ORANGE))
    # Solution side (right)
    shapes.append(make_rect_shape(emu(5.5), emu(1.9), emu(4.4), emu(0.45), "1B5E20", radius=3000))
    shapes.append(make_textbox(emu(5.6), emu(1.92), emu(4.3), emu(0.45),
        [make_paragraph("\u2705  Our Digital Solution", size=1300, bold=True, color=WHITE, align="ctr")]))
    solution_paras = [
        make_paragraph("", size=400, color=BLACK, align="l"),
        make_paragraph("  \u2714  Online booking + WhatsApp", size=1200, color="1B5E20", align="l"),
        make_paragraph("  \u2714  Live GPS delivery tracking", size=1200, color="1B5E20", align="l"),
        make_paragraph("  \u2714  Automated inventory system", size=1200, color="1B5E20", align="l"),
        make_paragraph("  \u2714  Crisis prioritization engine", size=1200, color="1B5E20", align="l"),
        make_paragraph("  \u2714  Digital order management", size=1200, color="1B5E20", align="l"),
        make_paragraph("  \u2714  Real-time agent-customer chat", size=1200, color="1B5E20", align="l"),
    ]
    shapes.append(make_textbox(emu(5.6), emu(2.35), emu(4.3), emu(3.2), solution_paras))
    # Bottom impact
    shapes.append(make_rect_shape(emu(0.4), emu(5.8), emu(9.3), emu(1.2), BLUE_DARK, radius=5000))
    impact_paras = [
        make_paragraph("\U0001F680  Impact: 100% digital workflow | Real-time visibility | Emergency-aware allocation | Scalable microservices",
                      size=1100, bold=False, color=WHITE, align="ctr"),
    ]
    shapes.append(make_textbox(emu(0.5), emu(6.0), emu(9.1), emu(0.8), impact_paras))
    return shapes



def create_slide4_architecture():
    """Slide 4: System Architecture & Workflow"""
    shapes = make_slide_header("System Architecture & Workflow",
                               "Request Flow: User \u2192 Backend API \u2192 Database")
    # Architecture diagram using shapes
    y_base = emu(2.0)
    # --- Top row: User roles ---
    # Customer circle
    shapes.append(make_circle_shape(emu(0.8), y_base, emu(1.2), BLUE_LIGHT, "\U0001F464\nCustomer", 900, WHITE))
    # Admin circle
    shapes.append(make_circle_shape(emu(2.5), y_base, emu(1.2), ORANGE, "\U0001F6E0\nAdmin", 900, WHITE))
    # Agent circle
    shapes.append(make_circle_shape(emu(4.2), y_base, emu(1.2), "27AE60", "\U0001F69A\nAgent", 900, WHITE))
    # Arrow down from roles to API
    shapes.append(make_rect_shape(emu(2.8), y_base + emu(1.3), emu(0.06), emu(0.5), ORANGE))
    # --- Middle: Backend API box ---
    api_y = y_base + emu(1.9)
    shapes.append(make_rect_shape(emu(0.5), api_y, emu(5.2), emu(1.3), BLUE_DARK, radius=5000))
    api_paras = [
        make_paragraph("\u2699  Express.js Backend API (Node.js)", size=1300, bold=True, color=WHITE, align="ctr"),
        make_paragraph("REST API | Socket.IO | JWT Auth | RBAC | Zod Validation", size=1000, color="B8C5D9", align="ctr"),
    ]
    shapes.append(make_textbox(emu(0.6), api_y + emu(0.15), emu(5.0), emu(1.2), api_paras))
    # Arrow down from API to databases
    shapes.append(make_rect_shape(emu(2.8), api_y + emu(1.4), emu(0.06), emu(0.5), ORANGE))
    # --- Bottom row: Databases ---
    db_y = api_y + emu(2.0)
    # MongoDB
    shapes.append(make_rect_shape(emu(0.5), db_y, emu(2.3), emu(0.9), "2E7D32", radius=5000))
    shapes.append(make_textbox(emu(0.6), db_y + emu(0.1), emu(2.1), emu(0.8),
        [make_paragraph("\U0001F4BE MongoDB", size=1200, bold=True, color=WHITE, align="ctr"),
         make_paragraph("Primary Database", size=900, color="C8E6C9", align="ctr")]))
    # Redis
    shapes.append(make_rect_shape(emu(3.2), db_y, emu(2.3), emu(0.9), "C62828", radius=5000))
    shapes.append(make_textbox(emu(3.3), db_y + emu(0.1), emu(2.1), emu(0.8),
        [make_paragraph("\u26A1 Redis", size=1200, bold=True, color=WHITE, align="ctr"),
         make_paragraph("Cache + Real-Time", size=900, color="FFCDD2", align="ctr")]))
    # Right side: Workflow Steps
    wf_x = emu(6.2)
    shapes.append(make_rect_shape(wf_x, emu(1.9), emu(3.6), emu(5.2), GRAY_LIGHT, radius=5000))
    wf_paras = [
        make_paragraph("\U0001F504 Order Lifecycle", size=1400, bold=True, color=BLUE_DARK, align="ctr"),
        make_paragraph("", size=600, color=BLACK, align="l"),
        make_paragraph("  1\uFE0F\u20E3  Customer places order", size=1100, color=GRAY_TEXT, align="l"),
        make_paragraph("       \u2193", size=1100, color=ORANGE, align="l"),
        make_paragraph("  2\uFE0F\u20E3  Admin assigns agent", size=1100, color=GRAY_TEXT, align="l"),
        make_paragraph("       \u2193", size=1100, color=ORANGE, align="l"),
        make_paragraph("  3\uFE0F\u20E3  Agent picks up cylinder", size=1100, color=GRAY_TEXT, align="l"),
        make_paragraph("       \u2193", size=1100, color=ORANGE, align="l"),
        make_paragraph("  4\uFE0F\u20E3  GPS tracking begins", size=1100, color=GRAY_TEXT, align="l"),
        make_paragraph("       \u2193", size=1100, color=ORANGE, align="l"),
        make_paragraph("  5\uFE0F\u20E3  Delivery + OTP verify", size=1100, color=GRAY_TEXT, align="l"),
        make_paragraph("       \u2193", size=1100, color=ORANGE, align="l"),
        make_paragraph("  \u2705  Order completed!", size=1100, bold=True, color="1B5E20", align="l"),
    ]
    shapes.append(make_textbox(wf_x + emu(0.1), emu(2.0), emu(3.4), emu(5.0), wf_paras))
    return shapes



def create_slide5_technologies():
    """Slide 5: Technologies Used"""
    shapes = make_slide_header("Technologies Used", "Modern Tech Stack for Production-Grade Platform")
    # Technology cards in 2 rows
    techs = [
        ("Node.js", "Runtime", "4CAF50", "\u2699"),
        ("Express.js", "Framework", BLUE_LIGHT, "\U0001F310"),
        ("MongoDB", "Database", "388E3C", "\U0001F4BE"),
        ("Redis", "Cache/RT", "D32F2F", "\u26A1"),
        ("Socket.IO", "WebSocket", "212121", "\U0001F50C"),
        ("Docker", "Container", "1976D2", "\U0001F433"),
        ("Kubernetes", "Orchestration", "326CE5", "\u2638"),
    ]
    card_w = emu(2.5)
    card_h = emu(1.5)
    start_x = emu(0.4)
    gap = emu(0.2)
    # Row 1: 4 cards
    for i, (name, desc, color, icon) in enumerate(techs[:4]):
        x = start_x + i * (card_w + gap)
        y = emu(2.1)
        shapes.append(make_rect_shape(x, y, card_w, card_h, color, radius=6000))
        card_paras = [
            make_paragraph(f"{icon}  {name}", size=1500, bold=True, color=WHITE, align="ctr"),
            make_paragraph(desc, size=1100, color="E0E0E0", align="ctr"),
        ]
        shapes.append(make_textbox(x, y + emu(0.2), card_w, card_h - emu(0.2), card_paras))
    # Row 2: 3 cards (centered)
    offset_x = start_x + emu(1.35)
    for i, (name, desc, color, icon) in enumerate(techs[4:]):
        x = offset_x + i * (card_w + gap)
        y = emu(3.9)
        shapes.append(make_rect_shape(x, y, card_w, card_h, color, radius=6000))
        card_paras = [
            make_paragraph(f"{icon}  {name}", size=1500, bold=True, color=WHITE, align="ctr"),
            make_paragraph(desc, size=1100, color="E0E0E0", align="ctr"),
        ]
        shapes.append(make_textbox(x, y + emu(0.2), card_w, card_h - emu(0.2), card_paras))
    # Additional tools section
    shapes.append(make_rect_shape(emu(0.4), emu(5.7), emu(9.3), emu(1.3), GRAY_LIGHT, radius=4000))
    tools_paras = [
        make_paragraph("Supporting Technologies & Tools", size=1200, bold=True, color=BLUE_DARK, align="ctr"),
        make_paragraph("", size=400, color=BLACK, align="l"),
        make_paragraph("JWT | bcrypt | Zod | Winston | Swagger | Helmet | CORS | Razorpay | Twilio | SendGrid | AWS S3 | Jest",
                      size=1100, color=GRAY_TEXT, align="ctr"),
    ]
    shapes.append(make_textbox(emu(0.5), emu(5.75), emu(9.1), emu(1.2), tools_paras))
    return shapes



def create_slide6_features():
    """Slide 6: Unique Features Implemented"""
    shapes = make_slide_header("Unique Features Implemented", "10 Key Feature Highlights")
    # Feature grid - 2 columns x 5 rows
    features_left = [
        ("\U0001F4F1", "WhatsApp Booking", "Book via WhatsApp API"),
        ("\U0001F6D2", "Product Store", "Buy accessories with gas"),
        ("\U0001F4CD", "GPS Tracking", "Real-time delivery location"),
        ("\U0001F4AC", "Live Chat", "Customer-Agent messaging"),
        ("\U0001F6A8", "Crisis Engine", "Emergency prioritization"),
    ]
    features_right = [
        ("\U0001F4E6", "Inventory Mgmt", "Warehouse-level tracking"),
        ("\U0001F510", "JWT + RBAC", "Role-based security"),
        ("\U0001F514", "Notifications", "SMS/Email/Push alerts"),
        ("\U0001F4D6", "Swagger Docs", "Interactive API docs"),
        ("\U0001F433", "Docker + K8s", "Container orchestration"),
    ]
    card_w = emu(4.5)
    card_h = emu(0.8)
    for i, (icon, title, desc) in enumerate(features_left):
        x = emu(0.3)
        y = emu(2.0) + i * (card_h + emu(0.12))
        shapes.append(make_rect_shape(x, y, card_w, card_h, BLUE_DARK, radius=4000))
        p = [make_paragraph(f"{icon}  {title}  —  {desc}", size=1100, color=WHITE, align="l")]
        shapes.append(make_textbox(x + emu(0.2), y + emu(0.15), card_w - emu(0.3), card_h - emu(0.1), p))
    for i, (icon, title, desc) in enumerate(features_right):
        x = emu(5.1)
        y = emu(2.0) + i * (card_h + emu(0.12))
        shapes.append(make_rect_shape(x, y, card_w, card_h, BLUE_MED, radius=4000))
        p = [make_paragraph(f"{icon}  {title}  —  {desc}", size=1100, color=WHITE, align="l")]
        shapes.append(make_textbox(x + emu(0.2), y + emu(0.15), card_w - emu(0.3), card_h - emu(0.1), p))
    # Bottom accent
    shapes.append(make_rect_shape(emu(0.3), emu(6.7), emu(9.4), emu(0.5), ORANGE, radius=3000))
    shapes.append(make_textbox(emu(0.5), emu(6.72), emu(9.0), emu(0.45),
        [make_paragraph("\u2B50  All features are production-ready with comprehensive error handling & logging",
                       size=1100, bold=True, color=WHITE, align="ctr")]))
    return shapes



def create_slide7_database():
    """Slide 7: Database Design & ER Diagram"""
    shapes = make_slide_header("Database Design & ER Diagram",
                               "MongoDB Collections & Relationships")
    # ER Diagram visual using shapes
    # Entity boxes
    entities = [
        ("User", emu(0.5), emu(2.0), BLUE_DARK, ["_id, name, email", "role, phone, addresses", "location, isOnDuty", "walletBalance, kycStatus"]),
        ("Order", emu(3.7), emu(2.0), ORANGE, ["orderId, customerId", "agentId, warehouseId", "status, cylinderCount", "timeline, priority"]),
        ("Inventory", emu(6.9), emu(2.0), "2E7D32", ["warehouseId, name", "totalCylinders", "availableCylinders", "location, isActive"]),
        ("ChatMessage", emu(0.5), emu(4.8), "6A1B9A", ["messageId, chatRoomId", "senderId, senderRole", "content, type, status", "mediaUrl, readAt"]),
        ("Delivery", emu(3.7), emu(4.8), "C62828", ["orderId, agentId", "lat, lng, timestamp", "route data", "ETA tracking"]),
    ]
    for name, x, y, color, fields in entities:
        # Entity header
        shapes.append(make_rect_shape(x, y, emu(2.8), emu(0.5), color, radius=3000))
        shapes.append(make_textbox(x, y + emu(0.05), emu(2.8), emu(0.45),
            [make_paragraph(f"\U0001F4CB {name}", size=1200, bold=True, color=WHITE, align="ctr")]))
        # Entity body
        shapes.append(make_rect_shape(x, y + emu(0.5), emu(2.8), emu(1.5), GRAY_LIGHT, radius=0))
        field_paras = []
        for f in fields:
            field_paras.append(make_paragraph(f"  {f}", size=900, color=GRAY_TEXT, align="l"))
        shapes.append(make_textbox(x + emu(0.1), y + emu(0.55), emu(2.6), emu(1.4), field_paras))
    # Relationship labels
    rel_paras = [
        make_paragraph("Relationships:", size=1200, bold=True, color=BLUE_DARK, align="l"),
        make_paragraph("  User (1) \u2192 (*) Orders [customerId]", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("  User (1) \u2192 (*) Orders [agentId]", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("  Order (1) \u2192 (*) ChatMessages [chatRoomId]", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("  Inventory (1) \u2192 (*) Orders [warehouseId]", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("  Order (1) \u2192 (1) Delivery [orderId]", size=1000, color=GRAY_TEXT, align="l"),
    ]
    shapes.append(make_textbox(emu(6.5), emu(4.8), emu(3.4), emu(2.3), rel_paras))
    return shapes



def create_slide8_security():
    """Slide 8: Screenshots / Demo & Security"""
    shapes = make_slide_header("Demo & Security Features",
                               "API Documentation, Tracking & Security Measures")
    # Left: Demo section
    shapes.append(make_rect_shape(emu(0.3), emu(1.9), emu(5.0), emu(3.0), GRAY_LIGHT, radius=5000))
    demo_paras = [
        make_paragraph("\U0001F4F1  Live Demo Highlights", size=1500, bold=True, color=BLUE_DARK, align="ctr"),
        make_paragraph("", size=600, color=BLACK, align="l"),
        make_paragraph("  \U0001F4CA  Admin Dashboard", size=1200, color=GRAY_TEXT, align="l"),
        make_paragraph("     \u2022 Order management & analytics", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("     \u2022 Agent assignment & monitoring", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("", size=400, color=BLACK, align="l"),
        make_paragraph("  \U0001F4D6  Swagger API Documentation", size=1200, color=GRAY_TEXT, align="l"),
        make_paragraph("     \u2022 /api/v1/docs - Interactive testing", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("     \u2022 All endpoints documented", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("", size=400, color=BLACK, align="l"),
        make_paragraph("  \U0001F4CD  Real-Time Delivery Tracking", size=1200, color=GRAY_TEXT, align="l"),
        make_paragraph("     \u2022 GPS updates every 5 seconds", size=1000, color=GRAY_TEXT, align="l"),
        make_paragraph("     \u2022 Socket.IO room-per-order", size=1000, color=GRAY_TEXT, align="l"),
    ]
    shapes.append(make_textbox(emu(0.5), emu(2.0), emu(4.7), emu(2.9), demo_paras))
    # Right: Security section
    shapes.append(make_rect_shape(emu(5.6), emu(1.9), emu(4.2), emu(3.0), BLUE_DARK, radius=5000))
    sec_paras = [
        make_paragraph("\U0001F512  Security Architecture", size=1500, bold=True, color=ORANGE_LIGHT, align="ctr"),
        make_paragraph("", size=600, color=WHITE, align="l"),
        make_paragraph("  \U0001F511  JWT Authentication", size=1200, bold=True, color=WHITE, align="l"),
        make_paragraph("     Access (15min) + Refresh (7d)", size=1000, color="B8C5D9", align="l"),
        make_paragraph("", size=400, color=WHITE, align="l"),
        make_paragraph("  \u23F1  Rate Limiting", size=1200, bold=True, color=WHITE, align="l"),
        make_paragraph("     100 req/15min, 10/15min auth", size=1000, color="B8C5D9", align="l"),
        make_paragraph("", size=400, color=WHITE, align="l"),
        make_paragraph("  \U0001F510  Password Encryption", size=1200, bold=True, color=WHITE, align="l"),
        make_paragraph("     bcrypt 12 rounds hashing", size=1000, color="B8C5D9", align="l"),
        make_paragraph("", size=400, color=WHITE, align="l"),
        make_paragraph("  \U0001F6E1  Role-Based Access (RBAC)", size=1200, bold=True, color=WHITE, align="l"),
        make_paragraph("     Admin | Customer | Agent", size=1000, color="B8C5D9", align="l"),
    ]
    shapes.append(make_textbox(emu(5.7), emu(2.0), emu(4.0), emu(2.9), sec_paras))
    # Bottom: Additional security measures
    shapes.append(make_rect_shape(emu(0.3), emu(5.2), emu(9.5), emu(1.9), "1A1A2E", radius=5000))
    bottom_paras = [
        make_paragraph("\U0001F6E1  Additional Security Measures", size=1300, bold=True, color=ORANGE_LIGHT, align="ctr"),
        make_paragraph("", size=400, color=WHITE, align="l"),
        make_paragraph("  Helmet (CSP)  |  CORS Allowlist  |  HPP Protection  |  Mongo Sanitize  |  XSS Clean  |  10kb Payload Limit",
                      size=1100, color="B8C5D9", align="ctr"),
        make_paragraph("", size=400, color=WHITE, align="l"),
        make_paragraph("  Refresh Token Rotation  |  Reuse Detection  |  NoSQL Injection Prevention  |  Winston Logging  |  ELK-Ready",
                      size=1100, color="B8C5D9", align="ctr"),
    ]
    shapes.append(make_textbox(emu(0.4), emu(5.3), emu(9.3), emu(1.8), bottom_paras))
    return shapes



def create_slide9_conclusion():
    """Slide 9: Conclusion & Future Scope"""
    shapes = []
    # Full dark background
    shapes.append(make_gradient_rect(0, 0, SLIDE_W, SLIDE_H, BLUE_DARK, "1A2744", "d"))
    shapes.append(make_rect_shape(0, 0, SLIDE_W, emu(0.08), ORANGE))
    # Title
    shapes.append(make_textbox(emu(0.5), emu(0.3), emu(9), emu(0.7),
        [make_paragraph("Conclusion & Future Scope", size=2800, bold=True, color=WHITE, align="ctr", font="Segoe UI Semibold")]))
    # Left: Achievements
    shapes.append(make_rect_shape(emu(0.3), emu(1.2), emu(4.7), emu(3.5), "2A3F6A", radius=6000))
    achieve_paras = [
        make_paragraph("\U0001F3C6  Project Achievements", size=1500, bold=True, color=ORANGE_LIGHT, align="ctr"),
        make_paragraph("", size=500, color=WHITE, align="l"),
        make_paragraph("  \u2705 Production-grade REST API", size=1150, color=WHITE, align="l"),
        make_paragraph("  \u2705 Real-time GPS + Live Chat", size=1150, color=WHITE, align="l"),
        make_paragraph("  \u2705 Crisis Prioritization Engine", size=1150, color=WHITE, align="l"),
        make_paragraph("  \u2705 Complete Order Lifecycle", size=1150, color=WHITE, align="l"),
        make_paragraph("  \u2705 Docker & K8s Deployment", size=1150, color=WHITE, align="l"),
        make_paragraph("  \u2705 Comprehensive Security", size=1150, color=WHITE, align="l"),
        make_paragraph("  \u2705 WhatsApp Integration", size=1150, color=WHITE, align="l"),
        make_paragraph("  \u2705 Swagger API Documentation", size=1150, color=WHITE, align="l"),
    ]
    shapes.append(make_textbox(emu(0.4), emu(1.3), emu(4.5), emu(3.4), achieve_paras))
    # Right: Future Scope
    shapes.append(make_rect_shape(emu(5.3), emu(1.2), emu(4.5), emu(3.5), "2A3F6A", radius=6000))
    future_paras = [
        make_paragraph("\U0001F680  Future Enhancements", size=1500, bold=True, color=ORANGE_LIGHT, align="ctr"),
        make_paragraph("", size=500, color=WHITE, align="l"),
        make_paragraph("  \U0001F916  AI Demand Prediction", size=1150, color=WHITE, align="l"),
        make_paragraph("     ML-based consumption forecast", size=950, color="8899B3", align="l"),
        make_paragraph("  \U0001F4F1  Mobile App Integration", size=1150, color=WHITE, align="l"),
        make_paragraph("     React Native / Flutter app", size=950, color="8899B3", align="l"),
        make_paragraph("  \U0001F4B3  Online Payment Gateway", size=1150, color=WHITE, align="l"),
        make_paragraph("     Razorpay/Stripe integration", size=950, color="8899B3", align="l"),
        make_paragraph("  \U0001F5FA  Smart Route Optimization", size=1150, color=WHITE, align="l"),
        make_paragraph("     Google Maps route planning", size=950, color="8899B3", align="l"),
    ]
    shapes.append(make_textbox(emu(5.4), emu(1.3), emu(4.3), emu(3.4), future_paras))
    # Thank You section
    shapes.append(make_rect_shape(emu(2.5), emu(5.0), emu(5.0), emu(1.5), ORANGE, radius=8000))
    thanks_paras = [
        make_paragraph("\U0001F64F  Thank You!", size=2400, bold=True, color=WHITE, align="ctr", font="Segoe UI Semibold"),
        make_paragraph("Questions & Feedback Welcome", size=1200, color="FFF3E0", align="ctr"),
    ]
    shapes.append(make_textbox(emu(2.6), emu(5.1), emu(4.8), emu(1.4), thanks_paras))
    # Team credit bottom
    shapes.append(make_textbox(emu(0.5), emu(6.8), emu(9), emu(0.5),
        [make_paragraph("Team CylDist  |  Department of Computer Engineering  |  2025",
                       size=1000, color="6B7B8F", align="ctr")]))
    # Bottom bar
    shapes.append(make_rect_shape(0, emu(7.42), SLIDE_W, emu(0.08), ORANGE))
    return shapes



# ============================================================
# PPTX Generation (Open XML Package)
# ============================================================

def xml_declaration():
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

def content_types_xml(num_slides):
    """[Content_Types].xml"""
    root = ET.Element("Types")
    root.set("xmlns", "http://schemas.openxmlformats.org/package/2006/content-types")
    ET.SubElement(root, "Default", Extension="rels",
                  ContentType="application/vnd.openxmlformats-package.relationships+xml")
    ET.SubElement(root, "Default", Extension="xml",
                  ContentType="application/xml")
    ET.SubElement(root, "Override", PartName="/ppt/presentation.xml",
                  ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml")
    for i in range(1, num_slides + 1):
        ET.SubElement(root, "Override", PartName=f"/ppt/slides/slide{i}.xml",
                      ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml")
    ET.SubElement(root, "Override", PartName="/ppt/slideLayouts/slideLayout1.xml",
                  ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml")
    ET.SubElement(root, "Override", PartName="/ppt/slideMasters/slideMaster1.xml",
                  ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml")
    ET.SubElement(root, "Override", PartName="/ppt/theme/theme1.xml",
                  ContentType="application/vnd.openxmlformats-officedocument.theme+xml")
    ET.SubElement(root, "Override", PartName="/docProps/core.xml",
                  ContentType="application/vnd.openxmlformats-package.core-properties+xml")
    ET.SubElement(root, "Override", PartName="/docProps/app.xml",
                  ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml")
    return xml_declaration() + ET.tostring(root, encoding="unicode")



def rels_xml():
    """_rels/.rels"""
    root = ET.Element("Relationships")
    root.set("xmlns", "http://schemas.openxmlformats.org/package/2006/relationships")
    ET.SubElement(root, "Relationship", Id="rId1",
                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
                  Target="ppt/presentation.xml")
    ET.SubElement(root, "Relationship", Id="rId2",
                  Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
                  Target="docProps/core.xml")
    ET.SubElement(root, "Relationship", Id="rId3",
                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
                  Target="docProps/app.xml")
    return xml_declaration() + ET.tostring(root, encoding="unicode")

def presentation_xml(num_slides):
    """ppt/presentation.xml"""
    nsmap = {
        'xmlns:a': NS['a'],
        'xmlns:r': NS['r'],
        'xmlns:p': NS['p'],
    }
    root = ET.Element(f'{{{NS["p"]}}}presentation')
    root.set('xmlns:a', NS['a'])
    root.set('xmlns:r', NS['r'])
    root.set('xmlns:p', NS['p'])
    # Slide size
    sldSz = ET.SubElement(root, f'{{{NS["p"]}}}sldSz', cx=str(SLIDE_W), cy=str(SLIDE_H))
    notesSz = ET.SubElement(root, f'{{{NS["p"]}}}notesSz', cx=str(SLIDE_H), cy=str(SLIDE_W))
    # Slide ID list
    sldIdLst = ET.SubElement(root, f'{{{NS["p"]}}}sldIdLst')
    for i in range(1, num_slides + 1):
        ET.SubElement(sldIdLst, f'{{{NS["p"]}}}sldId', id=str(255 + i), **{f'{{{NS["r"]}}}id': f'rId{i}'})
    # Slide master ID list
    sldMasterIdLst = ET.SubElement(root, f'{{{NS["p"]}}}sldMasterIdLst')
    ET.SubElement(sldMasterIdLst, f'{{{NS["p"]}}}sldMasterId', id="2147483648",
                  **{f'{{{NS["r"]}}}id': f'rId{num_slides + 1}'})
    return xml_declaration() + ET.tostring(root, encoding="unicode")



def presentation_rels_xml(num_slides):
    """ppt/_rels/presentation.xml.rels"""
    root = ET.Element("Relationships")
    root.set("xmlns", "http://schemas.openxmlformats.org/package/2006/relationships")
    for i in range(1, num_slides + 1):
        ET.SubElement(root, "Relationship", Id=f"rId{i}",
                      Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
                      Target=f"slides/slide{i}.xml")
    ET.SubElement(root, "Relationship", Id=f"rId{num_slides + 1}",
                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
                  Target="slideMasters/slideMaster1.xml")
    ET.SubElement(root, "Relationship", Id=f"rId{num_slides + 2}",
                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
                  Target="theme/theme1.xml")
    return xml_declaration() + ET.tostring(root, encoding="unicode")

def slide_xml(shapes):
    """Generate slide XML with shapes."""
    root = ET.Element(f'{{{NS["p"]}}}sld')
    root.set('xmlns:a', NS['a'])
    root.set('xmlns:r', NS['r'])
    root.set('xmlns:p', NS['p'])
    cSld = ET.SubElement(root, f'{{{NS["p"]}}}cSld')
    spTree = ET.SubElement(cSld, f'{{{NS["p"]}}}spTree')
    # Group shape properties (required)
    nvGrpSpPr = ET.SubElement(spTree, f'{{{NS["p"]}}}nvGrpSpPr')
    cNvPr = ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}cNvPr', id="1", name="")
    cNvGrpSpPr = ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}cNvGrpSpPr')
    nvPr = ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}nvPr')
    grpSpPr = ET.SubElement(spTree, f'{{{NS["p"]}}}grpSpPr')
    xfrm = ET.SubElement(grpSpPr, f'{{{NS["a"]}}}xfrm')
    ET.SubElement(xfrm, f'{{{NS["a"]}}}off', x="0", y="0")
    ET.SubElement(xfrm, f'{{{NS["a"]}}}ext', cx="0", cy="0")
    ET.SubElement(xfrm, f'{{{NS["a"]}}}chOff', x="0", y="0")
    ET.SubElement(xfrm, f'{{{NS["a"]}}}chExt', cx="0", cy="0")
    # Add shapes
    for shape in shapes:
        spTree.append(shape)
    return xml_declaration() + ET.tostring(root, encoding="unicode")



def slide_rels_xml():
    """Slide relationship file."""
    root = ET.Element("Relationships")
    root.set("xmlns", "http://schemas.openxmlformats.org/package/2006/relationships")
    ET.SubElement(root, "Relationship", Id="rId1",
                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
                  Target="../slideLayouts/slideLayout1.xml")
    return xml_declaration() + ET.tostring(root, encoding="unicode")

def slide_layout_xml():
    """ppt/slideLayouts/slideLayout1.xml"""
    root = ET.Element(f'{{{NS["p"]}}}sldLayout')
    root.set('xmlns:a', NS['a'])
    root.set('xmlns:r', NS['r'])
    root.set('xmlns:p', NS['p'])
    root.set('type', 'blank')
    root.set('preserve', '1')
    cSld = ET.SubElement(root, f'{{{NS["p"]}}}cSld', name="Blank")
    spTree = ET.SubElement(cSld, f'{{{NS["p"]}}}spTree')
    nvGrpSpPr = ET.SubElement(spTree, f'{{{NS["p"]}}}nvGrpSpPr')
    ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}cNvPr', id="1", name="")
    ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}cNvGrpSpPr')
    ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}nvPr')
    grpSpPr = ET.SubElement(spTree, f'{{{NS["p"]}}}grpSpPr')
    return xml_declaration() + ET.tostring(root, encoding="unicode")

def slide_layout_rels_xml():
    root = ET.Element("Relationships")
    root.set("xmlns", "http://schemas.openxmlformats.org/package/2006/relationships")
    ET.SubElement(root, "Relationship", Id="rId1",
                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
                  Target="../slideMasters/slideMaster1.xml")
    return xml_declaration() + ET.tostring(root, encoding="unicode")



def slide_master_xml():
    """ppt/slideMasters/slideMaster1.xml"""
    root = ET.Element(f'{{{NS["p"]}}}sldMaster')
    root.set('xmlns:a', NS['a'])
    root.set('xmlns:r', NS['r'])
    root.set('xmlns:p', NS['p'])
    cSld = ET.SubElement(root, f'{{{NS["p"]}}}cSld')
    bg = ET.SubElement(cSld, f'{{{NS["p"]}}}bg')
    bgPr = ET.SubElement(bg, f'{{{NS["p"]}}}bgPr')
    bgPr.append(make_solid_fill(WHITE))
    ET.SubElement(bgPr, f'{{{NS["a"]}}}effectLst')
    spTree = ET.SubElement(cSld, f'{{{NS["p"]}}}spTree')
    nvGrpSpPr = ET.SubElement(spTree, f'{{{NS["p"]}}}nvGrpSpPr')
    ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}cNvPr', id="1", name="")
    ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}cNvGrpSpPr')
    ET.SubElement(nvGrpSpPr, f'{{{NS["p"]}}}nvPr')
    grpSpPr = ET.SubElement(spTree, f'{{{NS["p"]}}}grpSpPr')
    # Slide layout ID list
    sldLayoutIdLst = ET.SubElement(root, f'{{{NS["p"]}}}sldLayoutIdLst')
    ET.SubElement(sldLayoutIdLst, f'{{{NS["p"]}}}sldLayoutId', id="2147483649",
                  **{f'{{{NS["r"]}}}id': 'rId1'})
    return xml_declaration() + ET.tostring(root, encoding="unicode")

def slide_master_rels_xml():
    root = ET.Element("Relationships")
    root.set("xmlns", "http://schemas.openxmlformats.org/package/2006/relationships")
    ET.SubElement(root, "Relationship", Id="rId1",
                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
                  Target="../slideLayouts/slideLayout1.xml")
    ET.SubElement(root, "Relationship", Id="rId2",
                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
                  Target="../theme/theme1.xml")
    return xml_declaration() + ET.tostring(root, encoding="unicode")



def theme_xml():
    """ppt/theme/theme1.xml - Blue & Orange theme"""
    root = ET.Element(f'{{{NS["a"]}}}theme')
    root.set('xmlns:a', NS['a'])
    root.set('name', 'CylDist Theme')
    themeElements = ET.SubElement(root, f'{{{NS["a"]}}}themeElements')
    # Color scheme
    clrScheme = ET.SubElement(themeElements, f'{{{NS["a"]}}}clrScheme', name="CylDist")
    colors = {
        'dk1': '1B2A4A', 'lt1': 'FFFFFF', 'dk2': '2E4A7A', 'lt2': 'F0F4F8',
        'accent1': '4A90D9', 'accent2': 'E8792B', 'accent3': '27AE60',
        'accent4': 'F5A623', 'accent5': '6A1B9A', 'accent6': '00ACC1',
        'hlink': '4A90D9', 'folHlink': '6A1B9A'
    }
    for name, val in colors.items():
        el = ET.SubElement(clrScheme, f'{{{NS["a"]}}}{name}')
        ET.SubElement(el, f'{{{NS["a"]}}}srgbClr', val=val)
    # Font scheme
    fontScheme = ET.SubElement(themeElements, f'{{{NS["a"]}}}fontScheme', name="CylDist")
    majorFont = ET.SubElement(fontScheme, f'{{{NS["a"]}}}majorFont')
    ET.SubElement(majorFont, f'{{{NS["a"]}}}latin', typeface="Segoe UI Semibold")
    ET.SubElement(majorFont, f'{{{NS["a"]}}}ea', typeface="")
    ET.SubElement(majorFont, f'{{{NS["a"]}}}cs', typeface="")
    minorFont = ET.SubElement(fontScheme, f'{{{NS["a"]}}}minorFont')
    ET.SubElement(minorFont, f'{{{NS["a"]}}}latin', typeface="Segoe UI")
    ET.SubElement(minorFont, f'{{{NS["a"]}}}ea', typeface="")
    ET.SubElement(minorFont, f'{{{NS["a"]}}}cs', typeface="")
    # Format scheme
    fmtScheme = ET.SubElement(themeElements, f'{{{NS["a"]}}}fmtScheme', name="Office")
    fillStyleLst = ET.SubElement(fmtScheme, f'{{{NS["a"]}}}fillStyleLst')
    fillStyleLst.append(make_solid_fill("FFFFFF"))
    fillStyleLst.append(make_solid_fill("FFFFFF"))
    fillStyleLst.append(make_solid_fill("FFFFFF"))
    lnStyleLst = ET.SubElement(fmtScheme, f'{{{NS["a"]}}}lnStyleLst')
    for _ in range(3):
        ln = ET.SubElement(lnStyleLst, f'{{{NS["a"]}}}ln', w="9525")
        ln.append(make_solid_fill("000000"))
    effectStyleLst = ET.SubElement(fmtScheme, f'{{{NS["a"]}}}effectStyleLst')
    for _ in range(3):
        ET.SubElement(effectStyleLst, f'{{{NS["a"]}}}effectStyle').append(
            ET.Element(f'{{{NS["a"]}}}effectLst'))
    bgFillStyleLst = ET.SubElement(fmtScheme, f'{{{NS["a"]}}}bgFillStyleLst')
    bgFillStyleLst.append(make_solid_fill("FFFFFF"))
    bgFillStyleLst.append(make_solid_fill("FFFFFF"))
    bgFillStyleLst.append(make_solid_fill("FFFFFF"))
    return xml_declaration() + ET.tostring(root, encoding="unicode")



def core_xml():
    """docProps/core.xml"""
    cp_ns = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
    dc_ns = "http://purl.org/dc/elements/1.1/"
    dcterms_ns = "http://purl.org/dc/terms/"
    xsi_ns = "http://www.w3.org/2001/XMLSchema-instance"
    root = ET.Element("cp:coreProperties")
    root.set("xmlns:cp", cp_ns)
    root.set("xmlns:dc", dc_ns)
    root.set("xmlns:dcterms", dcterms_ns)
    root.set("xmlns:xsi", xsi_ns)
    title = ET.SubElement(root, f'{{{dc_ns}}}title')
    title.text = "Cylinder Distribution Platform - Backend API"
    subject = ET.SubElement(root, f'{{{dc_ns}}}subject')
    subject.text = "College Engineering Project Presentation"
    creator = ET.SubElement(root, f'{{{dc_ns}}}creator')
    creator.text = "Team CylDist"
    desc = ET.SubElement(root, f'{{{dc_ns}}}description')
    desc.text = "Production-grade LPG cylinder distribution platform backend API presentation"
    return xml_declaration() + ET.tostring(root, encoding="unicode")

def app_xml():
    """docProps/app.xml"""
    ep_ns = "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
    root = ET.Element("Properties")
    root.set("xmlns", ep_ns)
    app = ET.SubElement(root, "Application")
    app.text = "Microsoft Office PowerPoint"
    slides_el = ET.SubElement(root, "Slides")
    slides_el.text = "9"
    company = ET.SubElement(root, "Company")
    company.text = "Team CylDist"
    return xml_declaration() + ET.tostring(root, encoding="unicode")



def build_pptx(output_path):
    """Build the complete PPTX file."""
    # Generate all 9 slides
    slides_data = [
        create_slide1_title(),
        create_slide2_intro(),
        create_slide3_problem(),
        create_slide4_architecture(),
        create_slide5_technologies(),
        create_slide6_features(),
        create_slide7_database(),
        create_slide8_security(),
        create_slide9_conclusion(),
    ]
    num_slides = len(slides_data)

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # [Content_Types].xml
        zf.writestr('[Content_Types].xml', content_types_xml(num_slides))
        # _rels/.rels
        zf.writestr('_rels/.rels', rels_xml())
        # ppt/presentation.xml
        zf.writestr('ppt/presentation.xml', presentation_xml(num_slides))
        # ppt/_rels/presentation.xml.rels
        zf.writestr('ppt/_rels/presentation.xml.rels', presentation_rels_xml(num_slides))
        # Theme
        zf.writestr('ppt/theme/theme1.xml', theme_xml())
        # Slide Master
        zf.writestr('ppt/slideMasters/slideMaster1.xml', slide_master_xml())
        zf.writestr('ppt/slideMasters/_rels/slideMaster1.xml.rels', slide_master_rels_xml())
        # Slide Layout
        zf.writestr('ppt/slideLayouts/slideLayout1.xml', slide_layout_xml())
        zf.writestr('ppt/slideLayouts/_rels/slideLayout1.xml.rels', slide_layout_rels_xml())
        # Slides
        for i, shapes in enumerate(slides_data, 1):
            zf.writestr(f'ppt/slides/slide{i}.xml', slide_xml(shapes))
            zf.writestr(f'ppt/slides/_rels/slide{i}.xml.rels', slide_rels_xml())
        # docProps
        zf.writestr('docProps/core.xml', core_xml())
        zf.writestr('docProps/app.xml', app_xml())

    print(f"✅ Presentation created: {output_path}")
    print(f"   Slides: {num_slides}")
    file_size = os.path.getsize(output_path)
    print(f"   Size: {file_size / 1024:.1f} KB")

if __name__ == "__main__":
    output = "/projects/sandbox/cyldist-lpg-platform/CylDist_Platform_Presentation.pptx"
    build_pptx(output)
