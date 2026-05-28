#!/usr/bin/env python3
"""
Premium 9-slide PPTX presentation - Prezi-inspired bold design.
Matches build_pdf.py design language. Includes fade transitions.
"""
import zipfile, os

# 16:9 widescreen
SLIDE_W = 12192000
SLIDE_H = 6858000
EMU = 914400

# Premium colors
NAVY        = "0B1739"
NAVY_DEEP   = "060E26"
NAVY_MID    = "17264C"
BLUE        = "1E40AF"
BLUE_BR     = "3B82F6"
ORANGE      = "F97316"
ORANGE_DEEP = "EA580C"
AMBER       = "FBBF24"
WHITE       = "FFFFFF"
OFF_WHITE   = "F8FAFC"
GRAY        = "94A3B8"
DARK_GRAY   = "475569"
LIGHT_GRAY  = "E2E8F0"
GREEN       = "10B981"
RED         = "EF4444"
PURPLE      = "8B5CF6"
TEAL        = "14B8A6"

def emu(inches):
    return int(inches * EMU)

def _id():
    _id.n += 1
    return _id.n
_id.n = 100



# ============================================================
# Shape XML primitives
# ============================================================
def rect(x, y, w, h, fill, radius=0):
    prst = "roundRect" if radius else "rect"
    avlst = f'<a:gd name="adj" fmla="val {radius}"/>' if radius else ''
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="r"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="{prst}"><a:avLst>{avlst}</a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>'''

def circle(x, y, size, fill):
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="c"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{size}" cy="{size}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>'''

def text_box(x, y, w, h, paragraphs, anchor="t"):
    """paragraphs = list of (text, size_pt, bold, color, align)."""
    paras = []
    for t, sz, b, c, a in paragraphs:
        bold = ' b="1"' if b else ''
        t = (t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
        paras.append(f'<a:p><a:pPr algn="{a}"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="{sz*100}"{bold} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>{t}</a:t></a:r></a:p>')
    body = ''.join(paras)
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="t"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="{anchor}" rtlCol="0"/><a:lstStyle/>{body}</p:txBody></p:sp>'''

def shape_text(x, y, w, h, fill, paragraphs, prst="rect", radius=0, shadow=False, anchor="ctr"):
    avlst = f'<a:gd name="adj" fmla="val {radius}"/>' if radius and prst == "roundRect" else ''
    shadow_xml = '<a:effectLst><a:outerShdw blurRad="50800" dist="38100" dir="2700000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr></a:outerShdw></a:effectLst>' if shadow else ''
    paras = []
    for t, sz, b, c, a in paragraphs:
        bold = ' b="1"' if b else ''
        t = (t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
        paras.append(f'<a:p><a:pPr algn="{a}"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="{sz*100}"{bold} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>{t}</a:t></a:r></a:p>')
    body = ''.join(paras) if paras else '<a:p/>'
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="s"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="{prst}"><a:avLst>{avlst}</a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln>{shadow_xml}</p:spPr><p:txBody><a:bodyPr wrap="square" anchor="{anchor}" rtlCol="0" lIns="91440" tIns="91440" rIns="91440" bIns="91440"/><a:lstStyle/>{body}</p:txBody></p:sp>'''

def line(x1, y1, x2, y2, color, width=19050):
    flipH = "1" if x2 < x1 else "0"
    flipV = "1" if y2 < y1 else "0"
    return f'''<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{_id()}" name="ln"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm flipH="{flipH}" flipV="{flipV}"><a:off x="{min(x1,x2)}" y="{min(y1,y2)}"/><a:ext cx="{max(abs(x2-x1),1)}" cy="{max(abs(y2-y1),1)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="{width}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'''

def arrow_right(x, y, w, h, fill):
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="a"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rightArrow"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>'''

def down_arrow(x, y, w, h, fill):
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="da"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="downArrow"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>'''



# ============================================================
# SLIDE 1: TITLE
# ============================================================
def slide1():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, NAVY_DEEP))
    # Decorative circles top-right
    s.append(circle(emu(10.5), emu(-2.0), emu(4.5), ORANGE))
    s.append(circle(emu(11.0), emu(-1.5), emu(3.2), ORANGE_DEEP))
    s.append(circle(emu(10.2), emu(0.0), emu(1.6), AMBER))
    # Bottom-left circles
    s.append(circle(emu(-1.0), emu(5.5), emu(2.8), BLUE_BR))
    s.append(circle(emu(0.0), emu(6.0), emu(1.4), BLUE))
    # Floating dots
    s.append(circle(emu(8.5), emu(4.5), emu(0.18), AMBER))
    s.append(circle(emu(9.3), emu(5.0), emu(0.12), ORANGE))
    s.append(circle(emu(8.8), emu(5.5), emu(0.15), WHITE))
    # Top status pill
    s.append(shape_text(emu(0.6), emu(0.5), emu(2.5), emu(0.35), ORANGE,
        [("BACKEND API  |  v1.0", 11, True, WHITE, "ctr")],
        prst="roundRect", radius=50000, anchor="ctr"))
    # Vertical orange accent
    s.append(rect(emu(0.6), emu(1.3), emu(0.08), emu(2.3), ORANGE))
    # MASSIVE TITLE
    s.append(text_box(emu(0.85), emu(1.2), emu(11), emu(1.0),
        [("CYLINDER", 60, True, WHITE, "l")]))
    s.append(text_box(emu(0.85), emu(2.05), emu(11), emu(1.0),
        [("DISTRIBUTION", 60, True, ORANGE, "l")]))
    s.append(text_box(emu(0.85), emu(2.9), emu(11), emu(1.0),
        [("PLATFORM.", 60, True, WHITE, "l")]))
    # Tagline
    s.append(rect(emu(0.85), emu(3.85), emu(4.5), emu(0.04), ORANGE))
    s.append(text_box(emu(0.85), emu(3.95), emu(8), emu(0.5),
        [("Production-Grade LPG Delivery Backend", 16, False, GRAY, "l")]))
    # Team info card
    s.append(shape_text(emu(0.85), emu(4.7), emu(7.5), emu(2.0), NAVY_MID,
        [], prst="roundRect", radius=8000, shadow=True, anchor="t"))
    s.append(rect(emu(0.85), emu(4.7), emu(0.08), emu(2.0), ORANGE))
    s.append(text_box(emu(1.1), emu(4.85), emu(7), emu(0.5),
        [("TEAM CYLDIST", 18, True, AMBER, "l")]))
    s.append(text_box(emu(1.1), emu(5.25), emu(7), emu(0.4),
        [("Department of Computer Engineering", 12, False, WHITE, "l")]))
    s.append(text_box(emu(1.1), emu(5.7), emu(3.5), emu(0.35),
        [("Member 1  -  Lead Developer", 11, False, GRAY, "l")]))
    s.append(text_box(emu(1.1), emu(6.0), emu(3.5), emu(0.35),
        [("Member 2  -  Backend Engineer", 11, False, GRAY, "l")]))
    s.append(text_box(emu(4.6), emu(5.7), emu(3.5), emu(0.35),
        [("Member 3  -  DevOps & DB", 11, False, GRAY, "l")]))
    s.append(text_box(emu(4.6), emu(6.0), emu(3.5), emu(0.35),
        [("Member 4  -  Frontend & QA", 11, False, GRAY, "l")]))
    s.append(text_box(emu(1.1), emu(6.35), emu(7), emu(0.35),
        [("[Your College Name]  |  Academic Year 2025-26", 11, True, ORANGE, "l")]))
    s.append(rect(0, emu(7.4), SLIDE_W, emu(0.1), ORANGE))
    s.append(text_box(emu(12.6), emu(7.0), emu(0.5), emu(0.3),
        [("01", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 2: INTRODUCTION & OBJECTIVES
# ============================================================
def slide2():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, OFF_WHITE))
    s.append(rect(0, 0, emu(4.5), SLIDE_H, NAVY))
    s.append(rect(emu(4.5), 0, emu(0.06), SLIDE_H, ORANGE))
    s.append(circle(emu(-0.6), emu(6.5), emu(2.2), ORANGE))
    s.append(circle(emu(-0.8), emu(6.3), emu(1.3), ORANGE_DEEP))
    s.append(text_box(emu(0.5), emu(0.4), emu(2), emu(1.5),
        [("02", 72, True, ORANGE, "l")]))
    s.append(rect(emu(0.5), emu(1.6), emu(1.6), emu(0.04), ORANGE))
    s.append(text_box(emu(0.5), emu(1.7), emu(4), emu(0.4),
        [("INTRODUCTION", 12, True, AMBER, "l")]))
    s.append(text_box(emu(0.5), emu(2.3), emu(4), emu(0.7),
        [("Digital LPG", 32, True, WHITE, "l")]))
    s.append(text_box(emu(0.5), emu(2.85), emu(4), emu(0.7),
        [("Distribution", 32, True, WHITE, "l")]))
    s.append(text_box(emu(0.5), emu(3.4), emu(4), emu(0.7),
        [("Reimagined.", 32, True, AMBER, "l")]))
    s.append(text_box(emu(0.5), emu(4.2), emu(4), emu(0.9),
        [("A production-grade backend that", 11, False, GRAY, "l"),
         ("transforms how LPG cylinders are", 11, False, GRAY, "l"),
         ("booked, tracked, and delivered.", 11, False, GRAY, "l")]))
    s.append(shape_text(emu(0.5), emu(5.3), emu(3.5), emu(1.9), NAVY_MID,
        [], prst="roundRect", radius=6000, anchor="t"))
    s.append(text_box(emu(0.7), emu(5.45), emu(3), emu(0.4),
        [("PROJECT IMPACT", 11, True, ORANGE, "l")]))
    stats = [("3+", "User Roles"), ("30+", "API Endpoints"), ("10+", "Core Features"), ("2", "Databases")]
    for i, (num, label) in enumerate(stats):
        col = i % 2
        row = i // 2
        x = emu(0.7) + col * emu(1.6)
        y = emu(5.85) + row * emu(0.65)
        s.append(text_box(x, y, emu(1.5), emu(0.4),
            [(num, 22, True, AMBER, "l")]))
        s.append(text_box(x, y + emu(0.4), emu(1.5), emu(0.3),
            [(label, 9, False, GRAY, "l")]))
    # RIGHT - Objectives
    s.append(text_box(emu(5.0), emu(0.55), emu(7), emu(0.4),
        [("KEY OBJECTIVES", 12, True, ORANGE, "l")]))
    s.append(rect(emu(5.0), emu(0.95), emu(0.8), emu(0.04), ORANGE))
    s.append(text_box(emu(5.0), emu(1.1), emu(7), emu(0.7),
        [("Goals & Mission", 28, True, NAVY, "l")]))
    objs = [
        ("DIGITIZE", "Replace manual booking", "with online + WhatsApp", BLUE_BR),
        ("TRACK", "Real-time GPS tracking", "& live customer chat", ORANGE),
        ("SECURE", "JWT + RBAC + bcrypt", "production security", PURPLE),
        ("SCALE", "Docker + Kubernetes", "ready deployment", GREEN),
    ]
    for i, (head, d1, d2, color) in enumerate(objs):
        col = i % 2
        row = i // 2
        x = emu(5.0) + col * emu(3.7)
        y = emu(2.1) + row * emu(2.5)
        s.append(shape_text(x, y, emu(3.5), emu(2.3), WHITE, [], prst="roundRect", radius=6000, shadow=True))
        s.append(rect(x, y, emu(3.5), emu(0.08), color))
        s.append(circle(x + emu(0.25), y + emu(0.5), emu(0.6), color))
        s.append(text_box(x + emu(0.25), y + emu(0.6), emu(0.6), emu(0.5),
            [(str(i + 1), 22, True, WHITE, "ctr")]))
        s.append(text_box(x + emu(1.0), y + emu(0.55), emu(2.3), emu(0.5),
            [(head, 18, True, NAVY, "l")]))
        s.append(rect(x + emu(1.0), y + emu(1.0), emu(0.6), emu(0.04), color))
        s.append(text_box(x + emu(0.3), y + emu(1.4), emu(3.2), emu(0.4),
            [(d1, 11, False, DARK_GRAY, "l")]))
        s.append(text_box(x + emu(0.3), y + emu(1.7), emu(3.2), emu(0.4),
            [(d2, 11, False, DARK_GRAY, "l")]))
    s.append(text_box(emu(12.6), emu(7.1), emu(0.5), emu(0.3),
        [("02", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 3: PROBLEM vs SOLUTION
# ============================================================
def slide3():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, OFF_WHITE))
    s.append(rect(0, 0, SLIDE_W, emu(1.5), NAVY))
    s.append(rect(0, emu(1.5), SLIDE_W, emu(0.05), ORANGE))
    s.append(text_box(emu(0.5), emu(0.3), emu(2), emu(1.0),
        [("03", 64, True, ORANGE, "l")]))
    s.append(text_box(emu(1.85), emu(0.4), emu(8), emu(0.4),
        [("THE CHALLENGE", 12, True, AMBER, "l")]))
    s.append(text_box(emu(1.85), emu(0.85), emu(10), emu(0.6),
        [("Problem  vs  Solution", 28, True, WHITE, "l")]))
    # PROBLEM CARD
    s.append(shape_text(emu(0.5), emu(1.85), emu(5.5), emu(5.0), WHITE,
        [], prst="roundRect", radius=8000, shadow=True))
    s.append(rect(emu(0.5), emu(1.85), emu(5.5), emu(0.85), RED, radius=8000))
    s.append(rect(emu(0.5), emu(2.4), emu(5.5), emu(0.3), RED))
    s.append(circle(emu(0.7), emu(2.0), emu(0.55), WHITE))
    s.append(text_box(emu(0.7), emu(2.05), emu(0.55), emu(0.5),
        [("X", 26, True, RED, "ctr")]))
    s.append(text_box(emu(1.4), emu(2.0), emu(4), emu(0.4),
        [("TRADITIONAL SYSTEM", 14, True, WHITE, "l")]))
    s.append(text_box(emu(1.4), emu(2.35), emu(4), emu(0.3),
        [("Outdated  -  Manual  -  Inefficient", 9, False, "FFD0D0", "l")]))
    problems = [
        "Manual booking via phone calls",
        "No real-time delivery tracking",
        "Opaque inventory management",
        "Zero priority for emergencies",
        "Paper-based record keeping",
        "No customer communication",
        "Inefficient route planning",
    ]
    for i, p in enumerate(problems):
        y = emu(3.0) + i * emu(0.5)
        s.append(circle(emu(0.85), y + emu(0.05), emu(0.2), RED))
        s.append(text_box(emu(0.85), y + emu(0.07), emu(0.2), emu(0.2),
            [("X", 9, True, WHITE, "ctr")]))
        s.append(text_box(emu(1.2), y, emu(4.5), emu(0.4),
            [(p, 11, False, DARK_GRAY, "l")]))
    # Center arrow
    s.append(circle(emu(6.1), emu(4.0), emu(0.7), NAVY))
    s.append(arrow_right(emu(6.2), emu(4.2), emu(0.5), emu(0.3), ORANGE))
    # SOLUTION CARD
    s.append(shape_text(emu(7.0), emu(1.85), emu(5.5), emu(5.0), WHITE,
        [], prst="roundRect", radius=8000, shadow=True))
    s.append(rect(emu(7.0), emu(1.85), emu(5.5), emu(0.85), GREEN, radius=8000))
    s.append(rect(emu(7.0), emu(2.4), emu(5.5), emu(0.3), GREEN))
    s.append(circle(emu(7.2), emu(2.0), emu(0.55), WHITE))
    s.append(text_box(emu(7.2), emu(2.05), emu(0.55), emu(0.5),
        [("v", 26, True, GREEN, "ctr")]))
    s.append(text_box(emu(7.9), emu(2.0), emu(4.5), emu(0.4),
        [("OUR DIGITAL SOLUTION", 14, True, WHITE, "l")]))
    s.append(text_box(emu(7.9), emu(2.35), emu(4.5), emu(0.3),
        [("Modern  -  Automated  -  Scalable", 9, False, "D0FFD0", "l")]))
    solutions = [
        "Online + WhatsApp booking",
        "Live GPS delivery tracking",
        "Automated inventory engine",
        "Crisis prioritization system",
        "Digital order management",
        "Real-time agent-customer chat",
        "Smart route optimization",
    ]
    for i, sol in enumerate(solutions):
        y = emu(3.0) + i * emu(0.5)
        s.append(circle(emu(7.35), y + emu(0.05), emu(0.2), GREEN))
        s.append(text_box(emu(7.35), y + emu(0.07), emu(0.2), emu(0.2),
            [("v", 9, True, WHITE, "ctr")]))
        s.append(text_box(emu(7.7), y, emu(4.5), emu(0.4),
            [(sol, 11, False, DARK_GRAY, "l")]))
    s.append(rect(0, emu(7.05), SLIDE_W, emu(0.45), NAVY_DEEP))
    s.append(text_box(emu(0.5), emu(7.13), emu(2), emu(0.3),
        [("IMPACT", 11, True, ORANGE, "l")]))
    s.append(text_box(emu(1.6), emu(7.13), emu(10), emu(0.3),
        [("100% digital workflow  |  Real-time visibility  |  Emergency-aware  |  Cloud scalable", 11, False, WHITE, "l")]))
    s.append(text_box(emu(12.6), emu(7.13), emu(0.5), emu(0.3),
        [("03", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 4: ARCHITECTURE & WORKFLOW
# ============================================================
def slide4():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, OFF_WHITE))
    s.append(rect(0, 0, SLIDE_W, emu(1.2), NAVY))
    s.append(rect(0, emu(1.2), SLIDE_W, emu(0.04), ORANGE))
    s.append(text_box(emu(0.5), emu(0.25), emu(2), emu(0.8),
        [("04", 44, True, ORANGE, "l")]))
    s.append(text_box(emu(1.5), emu(0.3), emu(8), emu(0.4),
        [("SYSTEM DESIGN", 11, True, AMBER, "l")]))
    s.append(text_box(emu(1.5), emu(0.7), emu(10), emu(0.5),
        [("Architecture & Workflow", 22, True, WHITE, "l")]))
    # ARCHITECTURE FLOW
    s.append(text_box(emu(0.5), emu(1.5), emu(4), emu(0.4),
        [("ARCHITECTURE FLOW", 11, True, ORANGE, "l")]))
    roles = [
        ("CUSTOMER", BLUE_BR, emu(0.7)),
        ("ADMIN", ORANGE, emu(2.4)),
        ("AGENT", GREEN, emu(4.1)),
    ]
    for name, color, x in roles:
        s.append(circle(x, emu(2.0), emu(1.0), color))
        s.append(circle(x + emu(0.1), emu(2.1), emu(0.3), WHITE))
        s.append(text_box(x, emu(3.05), emu(1.0), emu(0.3),
            [(name, 10, True, NAVY, "ctr")]))
    for _, _, x in roles:
        s.append(line(x + emu(0.5), emu(3.0), emu(2.7), emu(3.6), GRAY, width=15000))
    # API box
    s.append(shape_text(emu(0.5), emu(3.7), emu(4.7), emu(1.0), NAVY,
        [], prst="roundRect", radius=8000))
    s.append(rect(emu(0.5), emu(3.7), emu(0.08), emu(1.0), ORANGE))
    s.append(text_box(emu(0.7), emu(3.85), emu(4.5), emu(0.4),
        [("EXPRESS.JS BACKEND API", 14, True, WHITE, "l")]))
    s.append(text_box(emu(0.7), emu(4.25), emu(4.5), emu(0.4),
        [("REST  |  Socket.IO  |  JWT  |  RBAC  |  Zod", 10, False, GRAY, "l")]))
    s.append(line(emu(1.7), emu(4.75), emu(1.7), emu(5.2), GRAY, width=15000))
    s.append(line(emu(4.0), emu(4.75), emu(4.0), emu(5.2), GRAY, width=15000))
    s.append(down_arrow(emu(1.55), emu(5.1), emu(0.3), emu(0.2), ORANGE))
    s.append(down_arrow(emu(3.85), emu(5.1), emu(0.3), emu(0.2), ORANGE))
    # MongoDB
    s.append(shape_text(emu(0.5), emu(5.3), emu(2.2), emu(0.9), GREEN,
        [], prst="roundRect", radius=6000))
    s.append(text_box(emu(0.7), emu(5.45), emu(2), emu(0.4),
        [("MongoDB", 14, True, WHITE, "l")]))
    s.append(text_box(emu(0.7), emu(5.85), emu(2), emu(0.3),
        [("Primary Database", 9, False, "D0FFE0", "l")]))
    # Redis
    s.append(shape_text(emu(2.95), emu(5.3), emu(2.2), emu(0.9), RED,
        [], prst="roundRect", radius=6000))
    s.append(text_box(emu(3.15), emu(5.45), emu(2), emu(0.4),
        [("Redis", 14, True, WHITE, "l")]))
    s.append(text_box(emu(3.15), emu(5.85), emu(2), emu(0.3),
        [("Cache + Real-Time", 9, False, "FFD0D0", "l")]))
    # ORDER LIFECYCLE (right)
    s.append(shape_text(emu(5.6), emu(1.5), emu(7.0), emu(5.5), WHITE,
        [], prst="roundRect", radius=8000, shadow=True, anchor="t"))
    s.append(rect(emu(5.6), emu(1.5), emu(7.0), emu(0.7), NAVY, radius=8000))
    s.append(rect(emu(5.6), emu(2.0), emu(7.0), emu(0.2), NAVY))
    s.append(text_box(emu(5.85), emu(1.65), emu(6.5), emu(0.4),
        [("ORDER LIFECYCLE FLOW", 14, True, ORANGE, "l")]))
    steps = [
        ("01", "Customer places order", BLUE_BR),
        ("02", "Admin assigns agent", ORANGE),
        ("03", "Agent picks cylinder", PURPLE),
        ("04", "GPS tracking begins", AMBER),
        ("05", "Live chat enabled", TEAL),
        ("06", "Delivery + OTP verify", BLUE),
        ("07", "Order completed!", GREEN),
    ]
    for i, (num, txt, color) in enumerate(steps):
        y = emu(2.4) + i * emu(0.62)
        s.append(circle(emu(5.95), y, emu(0.5), color))
        s.append(text_box(emu(5.95), y + emu(0.05), emu(0.5), emu(0.4),
            [(num, 13, True, WHITE, "ctr")]))
        s.append(text_box(emu(6.7), y + emu(0.1), emu(5.8), emu(0.4),
            [(txt, 13, True, NAVY, "l")]))
        if i < len(steps) - 1:
            s.append(line(emu(6.2), y + emu(0.5), emu(6.2), y + emu(0.62), color, width=20000))
    s.append(text_box(emu(12.6), emu(7.1), emu(0.5), emu(0.3),
        [("04", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 5: TECHNOLOGIES USED
# ============================================================
def slide5():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, NAVY_DEEP))
    s.append(rect(0, 0, emu(0.1), SLIDE_H, ORANGE))
    s.append(circle(emu(11), emu(-0.5), emu(2.5), NAVY_MID))
    s.append(circle(emu(11.5), emu(-0.2), emu(1.6), ORANGE))
    s.append(text_box(emu(0.4), emu(0.3), emu(2), emu(1.0),
        [("05", 52, True, ORANGE, "l")]))
    s.append(text_box(emu(1.5), emu(0.4), emu(8), emu(0.4),
        [("TECH STACK", 11, True, AMBER, "l")]))
    s.append(text_box(emu(1.5), emu(0.85), emu(10), emu(0.6),
        [("Modern Technologies", 24, True, WHITE, "l")]))
    s.append(text_box(emu(1.5), emu(1.4), emu(11), emu(0.4),
        [("Built with industry-standard tools for scalability & reliability", 11, False, GRAY, "l")]))
    techs = [
        ("Node", "Runtime", GREEN),
        ("Express", "Framework", BLUE_BR),
        ("MongoDB", "Database", "228B22"),
        ("Redis", "Cache/RT", RED),
        ("Socket.IO", "WebSocket", PURPLE),
        ("Docker", "Container", BLUE),
        ("K8s", "Orchestration", BLUE_BR),
        ("JWT", "Auth", ORANGE),
    ]
    card_w = emu(2.9)
    card_h = emu(2.0)
    gap_x = emu(0.15)
    for i, (name, desc, color) in enumerate(techs):
        col = i % 4
        row = i // 4
        x = emu(0.4) + col * (card_w + gap_x)
        y = emu(2.0) + row * (card_h + emu(0.3))
        s.append(shape_text(x, y, card_w, card_h, color, [], prst="roundRect", radius=8000, shadow=True))
        s.append(rect(x, y, card_w, emu(0.06), AMBER))
        s.append(text_box(x + emu(0.2), y + emu(0.15), emu(1), emu(0.7),
            [(name[0], 36, True, WHITE, "l")]))
        s.append(text_box(x + emu(0.2), y + emu(0.95), emu(2.7), emu(0.4),
            [(name, 16, True, WHITE, "l")]))
        s.append(rect(x + emu(0.2), y + emu(1.3), emu(0.5), emu(0.04), AMBER))
        s.append(text_box(x + emu(0.2), y + emu(1.5), emu(2.7), emu(0.4),
            [(desc, 11, False, "FFFFFF", "l")]))
    s.append(shape_text(emu(0.4), emu(6.5), emu(12.2), emu(0.85), NAVY_MID,
        [], prst="roundRect", radius=6000))
    s.append(rect(emu(0.4), emu(6.5), emu(12.2), emu(0.06), ORANGE))
    s.append(text_box(emu(0.6), emu(6.6), emu(5), emu(0.3),
        [("SUPPORTING LIBRARIES", 11, True, ORANGE, "l")]))
    s.append(text_box(emu(0.6), emu(6.95), emu(12), emu(0.3),
        [("bcrypt | Helmet | CORS | Zod | Winston | Twilio | SendGrid | Razorpay | AWS S3 | Jest | Swagger", 10, False, GRAY, "l")]))
    s.append(text_box(emu(12.6), emu(7.1), emu(0.5), emu(0.3),
        [("05", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 6: UNIQUE FEATURES
# ============================================================
def slide6():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, OFF_WHITE))
    s.append(rect(0, 0, SLIDE_W, emu(1.2), NAVY))
    s.append(rect(0, emu(1.2), SLIDE_W, emu(0.04), ORANGE))
    s.append(text_box(emu(0.5), emu(0.25), emu(2), emu(0.8),
        [("06", 44, True, ORANGE, "l")]))
    s.append(text_box(emu(1.5), emu(0.3), emu(10), emu(0.4),
        [("WHAT MAKES US DIFFERENT", 11, True, AMBER, "l")]))
    s.append(text_box(emu(1.5), emu(0.7), emu(10), emu(0.5),
        [("Unique Features", 22, True, WHITE, "l")]))
    features = [
        ("WhatsApp", "Booking", "API-based booking", BLUE_BR),
        ("Product", "Store", "Buy accessories", ORANGE),
        ("Live GPS", "Tracking", "5s update intervals", GREEN),
        ("Real-time", "Chat", "Customer-Agent msg", PURPLE),
        ("Crisis", "Engine", "Emergency priority", RED),
        ("Inventory", "Manager", "Warehouse tracking", TEAL),
        ("JWT +", "RBAC", "Role-based access", BLUE),
        ("Multi-channel", "Notify", "SMS/Email/Push", AMBER),
        ("Swagger", "API Docs", "Interactive testing", "EA580C"),
        ("Docker +", "K8s", "Production deploy", "228B22"),
    ]
    card_w = emu(2.4)
    card_h = emu(2.7)
    gap = emu(0.13)
    start_x = emu(0.4)
    for i, (t1, t2, desc, color) in enumerate(features):
        col = i % 5
        row = i // 5
        x = start_x + col * (card_w + gap)
        y = emu(1.5) + row * (card_h + emu(0.3))
        s.append(shape_text(x, y, card_w, card_h, WHITE, [], prst="roundRect", radius=6000, shadow=True))
        s.append(rect(x, y, card_w, emu(1.2), color, radius=6000))
        s.append(rect(x, y + emu(0.6), card_w, emu(0.6), color))
        s.append(circle(x + emu(0.25), y + emu(0.35), emu(0.55), WHITE))
        s.append(text_box(x + emu(0.25), y + emu(0.45), emu(0.55), emu(0.4),
            [(str(i + 1).zfill(2), 13, True, color, "ctr")]))
        s.append(text_box(x + emu(0.95), y + emu(0.3), emu(1.5), emu(0.4),
            [(t1, 12, True, WHITE, "l")]))
        s.append(text_box(x + emu(0.95), y + emu(0.65), emu(1.5), emu(0.4),
            [(t2, 12, True, WHITE, "l")]))
        s.append(text_box(x + emu(0.2), y + emu(1.5), emu(2.0), emu(0.5),
            [(desc, 10, False, DARK_GRAY, "l")]))
        s.append(rect(x, y + card_h - emu(0.06), card_w, emu(0.06), color))
    s.append(text_box(emu(12.6), emu(7.1), emu(0.5), emu(0.3),
        [("06", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 7: ER DIAGRAM
# ============================================================
def slide7():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, OFF_WHITE))
    s.append(rect(0, 0, SLIDE_W, emu(1.2), NAVY))
    s.append(rect(0, emu(1.2), SLIDE_W, emu(0.04), ORANGE))
    s.append(text_box(emu(0.5), emu(0.25), emu(2), emu(0.8),
        [("07", 44, True, ORANGE, "l")]))
    s.append(text_box(emu(1.5), emu(0.3), emu(10), emu(0.4),
        [("DATA MODEL", 11, True, AMBER, "l")]))
    s.append(text_box(emu(1.5), emu(0.7), emu(10), emu(0.5),
        [("Database Design & ER Diagram", 22, True, WHITE, "l")]))
    entities = [
        ("USER", emu(0.4), emu(1.7), BLUE, ["_id, name, email", "role, phone", "addresses", "isOnDuty, kyc"]),
        ("ORDER", emu(4.6), emu(1.7), ORANGE, ["orderId, customerId", "agentId, warehouseId", "status, count", "timeline, priority"]),
        ("INVENTORY", emu(8.8), emu(1.7), GREEN, ["warehouseId, name", "totalCylinders", "available", "location, active"]),
        ("CHAT MESSAGE", emu(0.4), emu(4.8), PURPLE, ["messageId, roomId", "senderId, role", "content, type", "status, mediaUrl"]),
        ("DELIVERY", emu(4.6), emu(4.8), RED, ["orderId, agentId", "lat, lng, time", "ETA, route", "GPS tracking"]),
    ]
    for name, x, y, color, fields in entities:
        s.append(rect(x, y, emu(3), emu(0.5), color, radius=6000))
        s.append(rect(x, y + emu(0.3), emu(3), emu(0.2), color))
        s.append(circle(x + emu(0.15), y + emu(0.1), emu(0.3), WHITE))
        s.append(text_box(x + emu(0.15), y + emu(0.13), emu(0.3), emu(0.25),
            [("DB", 8, True, color, "ctr")]))
        s.append(text_box(x + emu(0.6), y + emu(0.13), emu(2.4), emu(0.3),
            [(name, 12, True, WHITE, "l")]))
        s.append(shape_text(x, y + emu(0.5), emu(3), emu(1.6), WHITE, [], prst="rect"))
        s.append(rect(x, y + emu(0.5), emu(0.06), emu(1.6), color))
        for i, field in enumerate(fields):
            s.append(text_box(x + emu(0.2), y + emu(0.65) + i * emu(0.32), emu(2.7), emu(0.3),
                [(field, 9, False, DARK_GRAY, "l")]))
    # Relationships
    s.append(line(emu(3.4), emu(2.2), emu(4.6), emu(2.2), ORANGE, width=20000))
    s.append(text_box(emu(3.7), emu(2.0), emu(0.7), emu(0.3),
        [("1:N", 10, True, ORANGE, "ctr")]))
    s.append(line(emu(7.6), emu(2.2), emu(8.8), emu(2.2), ORANGE, width=20000))
    s.append(text_box(emu(7.9), emu(2.0), emu(0.7), emu(0.3),
        [("N:1", 10, True, ORANGE, "ctr")]))
    s.append(line(emu(1.9), emu(3.85), emu(1.9), emu(4.8), ORANGE, width=20000))
    s.append(text_box(emu(2.0), emu(4.25), emu(0.7), emu(0.3),
        [("1:N", 10, True, ORANGE, "ctr")]))
    s.append(line(emu(6.1), emu(3.85), emu(6.1), emu(4.8), ORANGE, width=20000))
    s.append(text_box(emu(6.2), emu(4.25), emu(0.7), emu(0.3),
        [("1:1", 10, True, ORANGE, "ctr")]))
    s.append(line(emu(4.6), emu(2.7), emu(3.4), emu(4.8), ORANGE, width=15000))
    # Right relationships panel
    s.append(shape_text(emu(8.8), emu(4.8), emu(4.0), emu(2.3), NAVY,
        [], prst="roundRect", radius=8000))
    s.append(rect(emu(8.8), emu(4.8), emu(4.0), emu(0.08), ORANGE))
    s.append(text_box(emu(9.0), emu(4.95), emu(3.5), emu(0.4),
        [("RELATIONSHIPS", 11, True, ORANGE, "l")]))
    rels = [
        "User (1) -> (N) Orders",
        "User (1) -> (N) Orders [agent]",
        "Inventory (1) -> (N) Orders",
        "Order (1) -> (N) ChatMessages",
        "Order (1) -> (1) Delivery",
    ]
    for i, r in enumerate(rels):
        s.append(text_box(emu(9.0), emu(5.4) + i * emu(0.32), emu(3.8), emu(0.3),
            [(r, 10, False, WHITE, "l")]))
    s.append(text_box(emu(12.6), emu(7.1), emu(0.5), emu(0.3),
        [("07", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 8: DEMO & SECURITY
# ============================================================
def slide8():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, OFF_WHITE))
    s.append(rect(0, 0, SLIDE_W, emu(1.2), NAVY))
    s.append(rect(0, emu(1.2), SLIDE_W, emu(0.04), ORANGE))
    s.append(text_box(emu(0.5), emu(0.25), emu(2), emu(0.8),
        [("08", 44, True, ORANGE, "l")]))
    s.append(text_box(emu(1.5), emu(0.3), emu(10), emu(0.4),
        [("EXECUTION & PROTECTION", 11, True, AMBER, "l")]))
    s.append(text_box(emu(1.5), emu(0.7), emu(10), emu(0.5),
        [("Demo & Security", 22, True, WHITE, "l")]))
    # === LEFT: Demo with mock dashboard ===
    s.append(text_box(emu(0.5), emu(1.4), emu(4), emu(0.4),
        [("EXECUTION DEMO", 11, True, ORANGE, "l")]))
    s.append(rect(emu(0.5), emu(1.7), emu(0.8), emu(0.04), ORANGE))
    # Mock dashboard
    s.append(shape_text(emu(0.5), emu(1.85), emu(6.0), emu(2.7), WHITE,
        [], prst="roundRect", radius=4000, shadow=True))
    s.append(rect(emu(0.5), emu(1.85), emu(6.0), emu(0.35), NAVY_DEEP, radius=4000))
    s.append(rect(emu(0.5), emu(2.05), emu(6.0), emu(0.15), NAVY_DEEP))
    s.append(circle(emu(0.65), emu(1.95), emu(0.1), RED))
    s.append(circle(emu(0.85), emu(1.95), emu(0.1), AMBER))
    s.append(circle(emu(1.05), emu(1.95), emu(0.1), GREEN))
    s.append(text_box(emu(1.4), emu(1.95), emu(4), emu(0.3),
        [("/api/v1/admin/dashboard", 9, False, GRAY, "l")]))
    s.append(rect(emu(0.5), emu(2.2), emu(1.2), emu(2.35), NAVY))
    for i in range(5):
        s.append(rect(emu(0.7), emu(2.4) + i * emu(0.4), emu(0.85), emu(0.06),
            ORANGE if i == 0 else GRAY))
    stats = [(BLUE_BR, "150", "Orders"), (ORANGE, "23", "Agents"), (GREEN, "98%", "Success")]
    for i, (col, num, lbl) in enumerate(stats):
        x = emu(1.85) + i * emu(1.5)
        s.append(shape_text(x, emu(2.4), emu(1.4), emu(0.8), col, [], prst="roundRect", radius=3000))
        s.append(text_box(x + emu(0.15), emu(2.5), emu(1.2), emu(0.4),
            [(num, 18, True, WHITE, "l")]))
        s.append(text_box(x + emu(0.15), emu(2.9), emu(1.2), emu(0.3),
            [(lbl, 9, False, WHITE, "l")]))
    s.append(rect(emu(1.85), emu(3.35), emu(4.5), emu(1.1), LIGHT_GRAY))
    bars = [25, 45, 30, 55, 40, 60, 50]
    for i, h in enumerate(bars):
        bar_h = emu(h * 0.015)
        s.append(rect(emu(2.0) + i * emu(0.6), emu(4.4) - bar_h, emu(0.4), bar_h, BLUE_BR))
    demos = [
        ("Admin Dashboard", "Order management & analytics"),
        ("Swagger API Docs", "Interactive testing UI"),
        ("Live GPS Tracking", "Real-time agent location"),
        ("Agent-Customer Chat", "WebSocket messaging"),
    ]
    for i, (head, desc) in enumerate(demos):
        y = emu(4.8) + i * emu(0.55)
        s.append(circle(emu(0.65), y + emu(0.05), emu(0.35), ORANGE))
        s.append(text_box(emu(0.65), y + emu(0.1), emu(0.35), emu(0.3),
            [(str(i + 1), 13, True, WHITE, "ctr")]))
        s.append(text_box(emu(1.15), y, emu(5), emu(0.3),
            [(head, 12, True, NAVY, "l")]))
        s.append(text_box(emu(1.15), y + emu(0.3), emu(5), emu(0.3),
            [(desc, 10, False, DARK_GRAY, "l")]))
    # === RIGHT: Security ===
    s.append(text_box(emu(7.0), emu(1.4), emu(5), emu(0.4),
        [("SECURITY ARCHITECTURE", 11, True, ORANGE, "l")]))
    s.append(rect(emu(7.0), emu(1.7), emu(0.8), emu(0.04), ORANGE))
    s.append(shape_text(emu(7.0), emu(1.85), emu(5.6), emu(5.2), NAVY,
        [], prst="roundRect", radius=8000))
    s.append(rect(emu(7.0), emu(1.85), emu(5.6), emu(0.08), ORANGE))
    s.append(circle(emu(7.2), emu(2.1), emu(0.5), ORANGE))
    s.append(text_box(emu(7.2), emu(2.2), emu(0.5), emu(0.4),
        [("S", 22, True, WHITE, "ctr")]))
    s.append(text_box(emu(7.85), emu(2.05), emu(4), emu(0.3),
        [("MULTI-LAYER", 11, True, AMBER, "l")]))
    s.append(text_box(emu(7.85), emu(2.35), emu(4), emu(0.3),
        [("PROTECTION", 11, True, AMBER, "l")]))
    pillars = [
        ("JWT AUTH", "Access (15min) + Refresh (7d) tokens", "Token rotation + reuse detection", BLUE_BR),
        ("RATE LIMITING", "100 req/15min global limit", "10 req/15min for auth endpoints", ORANGE),
        ("ENCRYPTION", "bcrypt 12-round password hashing", "Helmet + CSP + HTTPS enforced", PURPLE),
        ("RBAC", "Role-based access control:", "Admin | Customer | Delivery Agent", GREEN),
    ]
    for i, (title, d1, d2, color) in enumerate(pillars):
        y = emu(2.95) + i * emu(0.95)
        s.append(rect(emu(7.2), y, emu(0.06), emu(0.85), color))
        s.append(text_box(emu(7.4), y, emu(5), emu(0.3),
            [(title, 12, True, AMBER, "l")]))
        s.append(text_box(emu(7.4), y + emu(0.3), emu(5), emu(0.3),
            [(d1, 9, False, GRAY, "l")]))
        s.append(text_box(emu(7.4), y + emu(0.55), emu(5), emu(0.3),
            [(d2, 9, False, GRAY, "l")]))
    badges = ["Helmet", "CORS", "HPP", "Sanitize", "XSS", "Winston"]
    for i, b in enumerate(badges):
        x = emu(7.1) + i * emu(0.85)
        s.append(shape_text(x, emu(6.7), emu(0.78), emu(0.3), NAVY_MID,
            [(b, 8, True, AMBER, "ctr")], prst="roundRect", radius=10000))
    s.append(text_box(emu(12.6), emu(7.1), emu(0.5), emu(0.3),
        [("08", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 9: CONCLUSION & THANK YOU
# ============================================================
def slide9():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, NAVY_DEEP))
    s.append(circle(emu(-0.5), emu(0.5), emu(2.5), NAVY_MID))
    s.append(circle(emu(11), emu(0.5), emu(3), ORANGE))
    s.append(circle(emu(11.5), emu(0.3), emu(2), ORANGE_DEEP))
    s.append(circle(emu(10.5), emu(6), emu(2.0), BLUE))
    s.append(circle(emu(0.5), emu(6.5), emu(1.5), AMBER))
    s.append(rect(0, 0, SLIDE_W, emu(0.06), ORANGE))
    s.append(text_box(emu(0.5), emu(0.4), emu(2), emu(0.8),
        [("09", 44, True, ORANGE, "l")]))
    s.append(text_box(emu(1.5), emu(0.4), emu(10), emu(0.4),
        [("WRAPPING UP", 11, True, AMBER, "l")]))
    s.append(text_box(emu(1.5), emu(0.85), emu(10), emu(0.5),
        [("Conclusion & Future Scope", 22, True, WHITE, "l")]))
    # Achievements
    s.append(shape_text(emu(0.4), emu(1.6), emu(6.0), emu(3.6), NAVY_MID,
        [], prst="roundRect", radius=8000))
    s.append(rect(emu(0.4), emu(1.6), emu(6.0), emu(0.08), GREEN))
    s.append(text_box(emu(0.7), emu(1.8), emu(5), emu(0.4),
        [("PROJECT ACHIEVEMENTS", 13, True, GREEN, "l")]))
    achievements = [
        "Production-grade REST API",
        "Real-time GPS + Live Chat",
        "Crisis Prioritization Engine",
        "Complete Order Lifecycle",
        "Docker & Kubernetes Deploy",
        "Multi-layer Security (JWT/RBAC)",
        "WhatsApp Integration",
        "Swagger API Documentation",
        "Inventory Management",
        "Real-time Notifications",
    ]
    for i, a in enumerate(achievements):
        col = i % 2
        row = i // 2
        x = emu(0.7) + col * emu(2.85)
        y = emu(2.4) + row * emu(0.5)
        s.append(circle(x, y + emu(0.05), emu(0.25), GREEN))
        s.append(text_box(x, y + emu(0.07), emu(0.25), emu(0.25),
            [("v", 10, True, WHITE, "ctr")]))
        s.append(text_box(x + emu(0.4), y + emu(0.05), emu(2.6), emu(0.3),
            [(a, 10, False, WHITE, "l")]))
    # Future
    s.append(shape_text(emu(6.7), emu(1.6), emu(6.0), emu(3.6), NAVY_MID,
        [], prst="roundRect", radius=8000))
    s.append(rect(emu(6.7), emu(1.6), emu(6.0), emu(0.08), ORANGE))
    s.append(text_box(emu(7.0), emu(1.8), emu(5), emu(0.4),
        [("FUTURE ENHANCEMENTS", 13, True, ORANGE, "l")]))
    futures = [
        ("AI", "Demand Prediction", "ML consumption forecast", BLUE_BR),
        ("APP", "Mobile App", "React Native / Flutter", ORANGE),
        ("PAY", "Online Payments", "Razorpay / UPI / Stripe", PURPLE),
        ("MAP", "Route Optimization", "Google Maps integration", GREEN),
        ("IoT", "Smart Sensors", "Cylinder gas-level IoT", TEAL),
    ]
    for i, (icon, title, desc, color) in enumerate(futures):
        y = emu(2.4) + i * emu(0.55)
        s.append(circle(emu(7.0), y + emu(0.05), emu(0.4), color))
        s.append(text_box(emu(7.0), y + emu(0.13), emu(0.4), emu(0.3),
            [(icon, 9, True, WHITE, "ctr")]))
        s.append(text_box(emu(7.55), y, emu(5), emu(0.3),
            [(title, 12, True, WHITE, "l")]))
        s.append(text_box(emu(7.55), y + emu(0.28), emu(5), emu(0.3),
            [(desc, 9, False, GRAY, "l")]))
    # BIG THANK YOU
    s.append(shape_text(emu(2.5), emu(5.4), emu(8.2), emu(1.5), ORANGE,
        [], prst="roundRect", radius=12000, shadow=True))
    s.append(rect(emu(2.5), emu(5.4), emu(8.2), emu(0.08), AMBER))
    s.append(circle(emu(2.7), emu(5.85), emu(0.5), ORANGE_DEEP))
    s.append(circle(emu(10.0), emu(5.85), emu(0.5), ORANGE_DEEP))
    s.append(text_box(emu(2.5), emu(5.55), emu(8.2), emu(0.8),
        [("THANK YOU!", 42, True, WHITE, "ctr")]))
    s.append(text_box(emu(2.5), emu(6.3), emu(8.2), emu(0.4),
        [("Questions  &  Discussion  Welcome", 13, False, "FFEFD5", "ctr")]))
    s.append(text_box(emu(0.5), emu(7.05), emu(12), emu(0.3),
        [("Team CylDist  -  Department of Computer Engineering  -  2025-26", 10, False, GRAY, "ctr")]))
    s.append(rect(0, emu(7.4), SLIDE_W, emu(0.1), ORANGE))
    return ''.join(s)



# ============================================================
# PPTX ASSEMBLY (Open XML package)
# ============================================================

XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

def slide_xml(shapes_xml, transition="fade"):
    """Wrap shape XML into a complete slide XML with a transition."""
    transition_xml = ""
    if transition == "fade":
        transition_xml = '<p:transition spd="med"><p:fade/></p:transition>'
    elif transition == "push":
        transition_xml = '<p:transition spd="med"><p:push dir="l"/></p:transition>'
    elif transition == "wipe":
        transition_xml = '<p:transition spd="med"><p:wipe dir="l"/></p:transition>'
    return XML_DECL + f'''<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>{shapes_xml}</p:spTree></p:cSld>{transition_xml}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'''

def slide_rels():
    return XML_DECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>'

def slide_layout():
    return XML_DECL + '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'

def slide_layout_rels():
    return XML_DECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>'

def slide_master():
    return XML_DECL + '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>'

def slide_master_rels():
    return XML_DECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>'

def theme_xml():
    return XML_DECL + '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="CylDist"><a:themeElements><a:clrScheme name="CylDist"><a:dk1><a:srgbClr val="0B1739"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="17264C"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="3B82F6"/></a:accent1><a:accent2><a:srgbClr val="F97316"/></a:accent2><a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="FBBF24"/></a:accent4><a:accent5><a:srgbClr val="8B5CF6"/></a:accent5><a:accent6><a:srgbClr val="14B8A6"/></a:accent6><a:hlink><a:srgbClr val="3B82F6"/></a:hlink><a:folHlink><a:srgbClr val="8B5CF6"/></a:folHlink></a:clrScheme><a:fontScheme name="CylDist"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>'



def presentation_xml(n):
    sld_ids = ''.join(f'<p:sldId id="{256+i}" r:id="rId{i+1}"/>' for i in range(n))
    return XML_DECL + f'<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId{n+1}"/></p:sldMasterIdLst><p:sldIdLst>{sld_ids}</p:sldIdLst><p:sldSz cx="{SLIDE_W}" cy="{SLIDE_H}" type="screen16x9"/><p:notesSz cx="{SLIDE_H}" cy="{SLIDE_W}"/></p:presentation>'

def presentation_rels(n):
    rels = ''
    for i in range(n):
        rels += f'<Relationship Id="rId{i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i+1}.xml"/>'
    rels += f'<Relationship Id="rId{n+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    rels += f'<Relationship Id="rId{n+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'
    return XML_DECL + f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rels}</Relationships>'

def content_types_xml(n):
    overrides = '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
    for i in range(n):
        overrides += f'<Override PartName="/ppt/slides/slide{i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
    overrides += '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
    overrides += '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
    overrides += '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
    overrides += '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    overrides += '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
    return XML_DECL + f'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>{overrides}</Types>'

def root_rels():
    return XML_DECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'

def core_xml():
    return XML_DECL + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Cylinder Distribution Platform - Backend API</dc:title><dc:creator>Team CylDist</dc:creator><dc:subject>College Engineering Project</dc:subject></cp:coreProperties>'

def app_xml():
    return XML_DECL + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft PowerPoint</Application><Slides>9</Slides><Company>Team CylDist</Company></Properties>'


def main():
    slides = [slide1(), slide2(), slide3(), slide4(), slide5(),
              slide6(), slide7(), slide8(), slide9()]
    n = len(slides)
    out = "/projects/sandbox/cyldist-lpg-platform/CylDist_Platform_Presentation.pptx"
    transitions = ["fade", "push", "fade", "wipe", "fade", "push", "fade", "wipe", "fade"]
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types_xml(n))
        z.writestr('_rels/.rels', root_rels())
        z.writestr('ppt/presentation.xml', presentation_xml(n))
        z.writestr('ppt/_rels/presentation.xml.rels', presentation_rels(n))
        z.writestr('ppt/theme/theme1.xml', theme_xml())
        z.writestr('ppt/slideMasters/slideMaster1.xml', slide_master())
        z.writestr('ppt/slideMasters/_rels/slideMaster1.xml.rels', slide_master_rels())
        z.writestr('ppt/slideLayouts/slideLayout1.xml', slide_layout())
        z.writestr('ppt/slideLayouts/_rels/slideLayout1.xml.rels', slide_layout_rels())
        for i, shape_xml in enumerate(slides):
            z.writestr(f'ppt/slides/slide{i+1}.xml', slide_xml(shape_xml, transitions[i]))
            z.writestr(f'ppt/slides/_rels/slide{i+1}.xml.rels', slide_rels())
        z.writestr('docProps/core.xml', core_xml())
        z.writestr('docProps/app.xml', app_xml())
    print(f"PPTX created: {out}")
    print(f"Slides: {n}")
    print(f"Size: {os.path.getsize(out)/1024:.1f} KB")
    print(f"Transitions: {', '.join(transitions)}")


if __name__ == "__main__":
    main()
