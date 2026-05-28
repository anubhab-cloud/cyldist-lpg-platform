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
# 3D ILLUSTRATIONS - using native PPTX preset shapes for 3D look
# ============================================================
def preset_shape(x, y, w, h, fill, prst, gradient_to=None, shadow=False, line_color=None):
    """Generic preset shape with optional gradient & shadow for 3D feel."""
    fill_xml = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>'
    if gradient_to:
        fill_xml = f'<a:gradFill flip="none" rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="{fill}"/></a:gs><a:gs pos="100000"><a:srgbClr val="{gradient_to}"/></a:gs></a:gsLst><a:lin ang="2700000" scaled="0"/></a:gradFill>'
    shadow_xml = '<a:effectLst><a:outerShdw blurRad="50800" dist="38100" dir="2700000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="50000"/></a:srgbClr></a:outerShdw></a:effectLst>' if shadow else ''
    line_xml = f'<a:ln w="12700"><a:solidFill><a:srgbClr val="{line_color}"/></a:solidFill></a:ln>' if line_color else '<a:ln><a:noFill/></a:ln>'
    return f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="ps"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="{prst}"><a:avLst/></a:prstGeom>{fill_xml}{line_xml}{shadow_xml}</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>'''

def cylinder_3d(x, y, w, h, fill, gradient_to=None, shadow=True):
    """3D cylinder - use for LPG cylinder OR database. Uses 'can' preset."""
    return preset_shape(x, y, w, h, fill, "can", gradient_to=gradient_to, shadow=shadow)

def cube_3d(x, y, size, fill, gradient_to=None, shadow=True):
    """3D cube using 'cube' preset."""
    return preset_shape(x, y, size, size, fill, "cube", gradient_to=gradient_to, shadow=shadow)

def cloud_shape(x, y, w, h, fill, shadow=True):
    return preset_shape(x, y, w, h, fill, "cloud", shadow=shadow)

def shield(x, y, w, h, fill, shadow=True):
    return preset_shape(x, y, w, h, fill, "homePlate", shadow=shadow)

def bolt(x, y, w, h, fill):
    return preset_shape(x, y, w, h, fill, "lightningBolt")

def star_shape(x, y, size, fill):
    return preset_shape(x, y, size, size, fill, "star5")

def hexagon(x, y, w, h, fill, gradient_to=None, shadow=True):
    return preset_shape(x, y, w, h, fill, "hexagon", gradient_to=gradient_to, shadow=shadow)


# ============================================================
# COMPOSITE 3D ILLUSTRATIONS
# ============================================================
def lpg_cylinder(cx, cy, w, h, body_color=ORANGE, body_grad="EA580C", label=""):
    """A realistic LPG gas cylinder illustration: cap + valve + body + base."""
    parts = []
    # Drop shadow ellipse below
    parts.append(f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="shd"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{cx - w//2}" y="{cy + h//2 - 30000}"/><a:ext cx="{w}" cy="60000"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="000000"><a:alpha val="20000"/></a:srgbClr></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>''')
    # Cylinder body (using 'can' preset for 3D look)
    parts.append(cylinder_3d(cx - w//2, cy - int(h*0.42), w, int(h*0.85), body_color, gradient_to=body_grad, shadow=True))
    # Top collar/neck (gray ring)
    neck_w = int(w * 0.5)
    neck_h = int(h * 0.08)
    parts.append(cylinder_3d(cx - neck_w//2, cy - int(h*0.5), neck_w, neck_h, "5A6680"))
    # Valve handle (red star/handle on top)
    valve_w = int(w * 0.25)
    valve_h = int(h * 0.06)
    parts.append(preset_shape(cx - valve_w//2, cy - int(h*0.55), valve_w, valve_h, RED, "rect"))
    # Tiny dot on top
    parts.append(preset_shape(cx - 30000, cy - int(h*0.58), 60000, 60000, "404040", "ellipse"))
    # Brand label (white band with text)
    if label:
        band_w = int(w * 0.9)
        band_h = int(h * 0.12)
        parts.append(preset_shape(cx - band_w//2, cy + int(h*0.05), band_w, band_h, WHITE, "rect"))
        parts.append(text_box(cx - band_w//2, cy + int(h*0.06), band_w, band_h,
            [(label, 12, True, body_color, "ctr")], anchor="ctr"))
    return ''.join(parts)

def database_3d(x, y, w, h, color, label=""):
    """3D database cylinder with label."""
    parts = []
    parts.append(cylinder_3d(x, y, w, h, color, shadow=True))
    if label:
        parts.append(text_box(x, y + h//2 - 200000, w, 300000,
            [(label, 11, True, WHITE, "ctr")], anchor="ctr"))
    return ''.join(parts)

def server_rack(x, y, w, h, color="2A3F6A"):
    """3D server rack illustration - stacked server units."""
    parts = []
    # Outer chassis
    parts.append(preset_shape(x, y, w, h, color, "roundRect", shadow=True))
    # Server units inside (3 stacked rows)
    unit_h = (h - 80000) // 3
    for i in range(3):
        uy = y + 30000 + i * (unit_h + 10000)
        parts.append(preset_shape(x + 30000, uy, w - 60000, unit_h, "0F1A33", "rect"))
        # LED indicators
        parts.append(preset_shape(x + 60000, uy + unit_h//3, 30000, 30000, GREEN, "ellipse"))
        parts.append(preset_shape(x + 110000, uy + unit_h//3, 30000, 30000, AMBER, "ellipse"))
        parts.append(preset_shape(x + 160000, uy + unit_h//3, 30000, 30000, BLUE_BR, "ellipse"))
        # Slot lines
        parts.append(preset_shape(x + 250000, uy + unit_h//2 - 5000, w - 320000, 10000, "303A50", "rect"))
    return ''.join(parts)

def user_avatar(cx, cy, size, color=BLUE_BR, role=""):
    """User avatar - circle head + rounded body."""
    parts = []
    head_r = size // 4
    # Head (circle)
    parts.append(preset_shape(cx - head_r, cy - size//2, head_r*2, head_r*2, color, "ellipse"))
    # Body (rounded rect / shoulders)
    body_w = int(size * 0.85)
    body_h = int(size * 0.55)
    parts.append(f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="bdy"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{cx - body_w//2}" y="{cy - size//2 + head_r*2 - 30000}"/><a:ext cx="{body_w}" cy="{body_h}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 30000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>''')
    # Role label below
    if role:
        parts.append(text_box(cx - size//2, cy + size//2 + 50000, size, 250000,
            [(role, 10, True, NAVY, "ctr")], anchor="ctr"))
    return ''.join(parts)

def phone_mockup(x, y, w, h, screen_color=BLUE_BR, screen_label=""):
    """3D smartphone mockup."""
    parts = []
    # Phone body (rounded rect with shadow)
    parts.append(preset_shape(x, y, w, h, NAVY_DEEP, "roundRect", shadow=True))
    # Screen
    s_x = x + int(w * 0.06)
    s_y = y + int(h * 0.08)
    s_w = int(w * 0.88)
    s_h = int(h * 0.78)
    parts.append(preset_shape(s_x, s_y, s_w, s_h, screen_color, "rect", gradient_to=BLUE))
    # Notch
    notch_w = int(w * 0.35)
    parts.append(preset_shape(x + (w - notch_w)//2, y + 50000, notch_w, 80000, NAVY_DEEP, "roundRect"))
    # Speaker
    parts.append(preset_shape(x + w//2 - 60000, y + 70000, 120000, 30000, "404040", "roundRect"))
    # Home indicator
    parts.append(preset_shape(x + w//2 - 200000, y + h - 100000, 400000, 30000, WHITE, "roundRect"))
    # Screen text
    if screen_label:
        parts.append(text_box(s_x, s_y + s_h//3, s_w, 400000,
            [(screen_label, 14, True, WHITE, "ctr")], anchor="ctr"))
    return ''.join(parts)

def delivery_truck(x, y, w, h, color=ORANGE):
    """Delivery truck silhouette with cargo box."""
    parts = []
    # Cargo box (back, larger)
    cargo_w = int(w * 0.65)
    cargo_h = int(h * 0.7)
    parts.append(preset_shape(x, y + int(h*0.1), cargo_w, cargo_h, color, "rect", shadow=True))
    # Cargo door lines
    parts.append(preset_shape(x + 80000, y + int(h*0.15), 30000, int(cargo_h*0.9), darker(color), "rect"))
    parts.append(preset_shape(x + cargo_w - 110000, y + int(h*0.15), 30000, int(cargo_h*0.9), darker(color), "rect"))
    # Cab (front, smaller)
    cab_x = x + cargo_w
    cab_w = int(w * 0.35)
    cab_h = int(h * 0.5)
    parts.append(preset_shape(cab_x, y + int(h*0.3), cab_w, cab_h, NAVY, "roundRect", shadow=True))
    # Windshield
    parts.append(preset_shape(cab_x + 30000, y + int(h*0.35), int(cab_w*0.7), int(cab_h*0.55), BLUE_BR, "rect"))
    # Wheels
    wheel_y = y + int(h*0.78)
    wheel_size = int(h * 0.22)
    parts.append(preset_shape(x + int(cargo_w*0.15), wheel_y, wheel_size, wheel_size, "1A1A1A", "ellipse"))
    parts.append(preset_shape(x + int(cargo_w*0.7), wheel_y, wheel_size, wheel_size, "1A1A1A", "ellipse"))
    parts.append(preset_shape(cab_x + int(cab_w*0.5), wheel_y, wheel_size, wheel_size, "1A1A1A", "ellipse"))
    # Wheel hubs
    hub_size = int(wheel_size * 0.4)
    hub_off = (wheel_size - hub_size) // 2
    parts.append(preset_shape(x + int(cargo_w*0.15) + hub_off, wheel_y + hub_off, hub_size, hub_size, GRAY, "ellipse"))
    parts.append(preset_shape(x + int(cargo_w*0.7) + hub_off, wheel_y + hub_off, hub_size, hub_size, GRAY, "ellipse"))
    parts.append(preset_shape(cab_x + int(cab_w*0.5) + hub_off, wheel_y + hub_off, hub_size, hub_size, GRAY, "ellipse"))
    return ''.join(parts)

def darker(hex_color, amt=0.2):
    """Return darker hex color."""
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    r = max(0, int(r * (1 - amt)))
    g = max(0, int(g * (1 - amt)))
    b = max(0, int(b * (1 - amt)))
    return f"{r:02X}{g:02X}{b:02X}"

def map_pin(cx, cy, size, color=RED):
    """Map pin / location marker."""
    parts = []
    # Pin teardrop using 'pie' or just oval + triangle
    parts.append(preset_shape(cx - size//2, cy - size, size, size, color, "ellipse", shadow=True))
    # Triangle pointer (using triangle preset)
    tri_w = int(size * 0.5)
    tri_h = int(size * 0.4)
    parts.append(preset_shape(cx - tri_w//2, cy - 50000, tri_w, tri_h, color, "triangle"))
    # Inner white dot
    inner = int(size * 0.4)
    parts.append(preset_shape(cx - inner//2, cy - size + (size - inner)//2, inner, inner, WHITE, "ellipse"))
    return ''.join(parts)

def rocket(cx, cy, w, h, body_color=ORANGE, fin_color="EA580C"):
    """Rocket/launch illustration."""
    parts = []
    # Body (main capsule)
    body_w = int(w * 0.5)
    body_h = int(h * 0.7)
    parts.append(preset_shape(cx - body_w//2, cy - h//2 + int(h*0.15), body_w, body_h, body_color, "roundRect", shadow=True))
    # Nose cone (triangle)
    cone_h = int(h * 0.3)
    parts.append(preset_shape(cx - body_w//2, cy - h//2, body_w, cone_h, fin_color, "triangle"))
    # Window (circle)
    win_size = int(body_w * 0.4)
    parts.append(preset_shape(cx - win_size//2, cy - h//4, win_size, win_size, BLUE_BR, "ellipse"))
    parts.append(preset_shape(cx - win_size//3, cy - h//4 + win_size//6, int(win_size*0.6), int(win_size*0.6), WHITE, "ellipse"))
    # Left fin
    fin_w = int(w * 0.2)
    fin_h = int(h * 0.2)
    parts.append(preset_shape(cx - body_w//2 - fin_w + 30000, cy + int(h*0.2), fin_w, fin_h, fin_color, "rtTriangle"))
    # Right fin (flipped)
    parts.append(f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="fin"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm flipH="1"><a:off x="{cx + body_w//2 - 30000}" y="{cy + int(h*0.2)}"/><a:ext cx="{fin_w}" cy="{fin_h}"/></a:xfrm><a:prstGeom prst="rtTriangle"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fin_color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>''')
    # Flame plume
    flame_w = int(body_w * 0.7)
    flame_h = int(h * 0.18)
    parts.append(f'''<p:sp><p:nvSpPr><p:cNvPr id="{_id()}" name="flm"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm flipV="1"><a:off x="{cx - flame_w//2}" y="{cy + h//2 - flame_h}"/><a:ext cx="{flame_w}" cy="{flame_h}"/></a:xfrm><a:prstGeom prst="triangle"><a:avLst/></a:prstGeom><a:gradFill flip="none"><a:gsLst><a:gs pos="0"><a:srgbClr val="FBBF24"/></a:gs><a:gs pos="100000"><a:srgbClr val="EF4444"/></a:gs></a:gsLst><a:lin ang="5400000"/></a:gradFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>''')
    return ''.join(parts)







# ============================================================
# SLIDE 1: TITLE - Now with 3D LPG cylinder illustration
# ============================================================
def slide1():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, NAVY_DEEP))
    # Decorative circles top-right
    s.append(circle(emu(11.5), emu(-2.0), emu(4.5), ORANGE))
    s.append(circle(emu(12.0), emu(-1.5), emu(3.2), ORANGE_DEEP))
    # Bottom-left circles
    s.append(circle(emu(-1.0), emu(5.5), emu(2.8), BLUE_BR))
    s.append(circle(emu(0.0), emu(6.0), emu(1.4), BLUE))
    # Hex grid pattern background (decorative tech feel)
    for hx, hy in [(emu(7.5), emu(0.4)), (emu(8.3), emu(0.9)), (emu(7.5), emu(1.4)),
                   (emu(9.1), emu(0.4)), (emu(9.1), emu(1.4))]:
        s.append(hexagon(hx, hy, emu(0.6), emu(0.5), "1A2845", shadow=False))
    # LARGE 3D LPG CYLINDER ILLUSTRATION (right side - hero visual)
    cyl_cx = emu(10.5)
    cyl_cy = emu(4.2)
    s.append(lpg_cylinder(cyl_cx, cyl_cy, emu(2.4), emu(4.0),
                         body_color=ORANGE, body_grad="C2410C", label="LPG"))
    # Floating data nodes around cylinder (network feel)
    s.append(circle(emu(8.5), emu(2.5), emu(0.25), AMBER))
    s.append(circle(emu(8.0), emu(4.0), emu(0.18), BLUE_BR))
    s.append(circle(emu(9.0), emu(6.0), emu(0.20), GREEN))
    s.append(circle(emu(12.5), emu(3.5), emu(0.22), AMBER))
    s.append(circle(emu(12.5), emu(5.0), emu(0.18), PURPLE))
    # Top status pill
    s.append(shape_text(emu(0.6), emu(0.5), emu(2.5), emu(0.35), ORANGE,
        [("BACKEND API  |  v1.0", 11, True, WHITE, "ctr")],
        prst="roundRect", radius=50000, anchor="ctr"))
    # Vertical orange accent
    s.append(rect(emu(0.6), emu(1.3), emu(0.08), emu(2.3), ORANGE))
    # MASSIVE TITLE
    s.append(text_box(emu(0.85), emu(1.2), emu(8), emu(1.0),
        [("CYLINDER", 60, True, WHITE, "l")]))
    s.append(text_box(emu(0.85), emu(2.05), emu(8), emu(1.0),
        [("DISTRIBUTION", 60, True, ORANGE, "l")]))
    s.append(text_box(emu(0.85), emu(2.9), emu(8), emu(1.0),
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
    # Small 3D LPG cylinder visual on left panel
    s.append(lpg_cylinder(emu(3.7), emu(2.8), emu(0.6), emu(1.4), ORANGE, "C2410C", ""))
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
# SLIDE 4: ARCHITECTURE & WORKFLOW - With 3D illustrations
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
    # ARCHITECTURE FLOW LABEL
    s.append(text_box(emu(0.5), emu(1.5), emu(4), emu(0.4),
        [("ARCHITECTURE FLOW", 11, True, ORANGE, "l")]))
    # === USER AVATARS (3D illustrations) ===
    # Customer avatar
    s.append(user_avatar(emu(0.95), emu(2.4), emu(0.9), BLUE_BR, "CUSTOMER"))
    # Admin avatar
    s.append(user_avatar(emu(2.4), emu(2.4), emu(0.9), ORANGE, "ADMIN"))
    # Agent avatar
    s.append(user_avatar(emu(3.85), emu(2.4), emu(0.9), GREEN, "AGENT"))
    # Connection lines from avatars converge to API
    s.append(line(emu(0.95), emu(3.0), emu(2.4), emu(3.7), GRAY, width=15000))
    s.append(line(emu(2.4), emu(3.0), emu(2.4), emu(3.7), GRAY, width=15000))
    s.append(line(emu(3.85), emu(3.0), emu(2.4), emu(3.7), GRAY, width=15000))
    # === 3D SERVER RACK (representing API backend) ===
    s.append(server_rack(emu(0.5), emu(3.7), emu(4.7), emu(1.0)))
    s.append(text_box(emu(0.5), emu(3.75), emu(4.7), emu(0.3),
        [("EXPRESS.JS API SERVER", 11, True, ORANGE, "ctr")]))
    # Connect server to databases (down arrows)
    s.append(line(emu(1.7), emu(4.75), emu(1.7), emu(5.2), GRAY, width=15000))
    s.append(line(emu(4.0), emu(4.75), emu(4.0), emu(5.2), GRAY, width=15000))
    s.append(down_arrow(emu(1.55), emu(5.1), emu(0.3), emu(0.2), ORANGE))
    s.append(down_arrow(emu(3.85), emu(5.1), emu(0.3), emu(0.2), ORANGE))
    # === 3D DATABASE CYLINDERS ===
    s.append(database_3d(emu(0.7), emu(5.3), emu(1.8), emu(1.4), GREEN, "MongoDB"))
    s.append(database_3d(emu(3.1), emu(5.3), emu(1.8), emu(1.4), RED, "Redis"))
    s.append(text_box(emu(0.5), emu(6.8), emu(2.2), emu(0.3),
        [("Primary DB", 9, False, DARK_GRAY, "ctr")]))
    s.append(text_box(emu(2.95), emu(6.8), emu(2.2), emu(0.3),
        [("Cache & RT", 9, False, DARK_GRAY, "ctr")]))
    # === Delivery truck (showing the delivery aspect) ===
    s.append(delivery_truck(emu(0.6), emu(7.05), emu(1.6), emu(0.4), ORANGE))
    # ORDER LIFECYCLE (right) - keep
    s.append(shape_text(emu(5.6), emu(1.5), emu(7.0), emu(5.5), WHITE,
        [], prst="roundRect", radius=8000, shadow=True, anchor="t"))
    s.append(rect(emu(5.6), emu(1.5), emu(7.0), emu(0.7), NAVY, radius=8000))
    s.append(rect(emu(5.6), emu(2.0), emu(7.0), emu(0.2), NAVY))
    s.append(text_box(emu(5.85), emu(1.65), emu(6.5), emu(0.4),
        [("ORDER LIFECYCLE FLOW", 14, True, ORANGE, "l")]))
    # Map pin at top right of card
    s.append(map_pin(emu(12.15), emu(2.0), emu(0.4), AMBER))
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
# SLIDE 5: TECHNOLOGIES USED - With 3D cubes
# ============================================================
def slide5():
    s = []
    s.append(rect(0, 0, SLIDE_W, SLIDE_H, NAVY_DEEP))
    s.append(rect(0, 0, emu(0.1), SLIDE_H, ORANGE))
    s.append(circle(emu(11), emu(-0.5), emu(2.5), NAVY_MID))
    # Decorative cloud (representing Docker/K8s cloud)
    s.append(cloud_shape(emu(11.5), emu(0.3), emu(1.5), emu(0.9), ORANGE_DEEP))
    s.append(text_box(emu(0.4), emu(0.3), emu(2), emu(1.0),
        [("05", 52, True, ORANGE, "l")]))
    s.append(text_box(emu(1.5), emu(0.4), emu(8), emu(0.4),
        [("TECH STACK", 11, True, AMBER, "l")]))
    s.append(text_box(emu(1.5), emu(0.85), emu(10), emu(0.6),
        [("Modern Technologies", 24, True, WHITE, "l")]))
    s.append(text_box(emu(1.5), emu(1.4), emu(11), emu(0.4),
        [("3D-illustrated tech stack for production scalability", 11, False, GRAY, "l")]))
    # === 3D CUBE TECH CARDS ===
    techs = [
        ("Node.js", "Runtime", GREEN, "0F9D58"),
        ("Express", "Framework", BLUE_BR, "1E40AF"),
        ("MongoDB", "Database", "228B22", "0F5132"),
        ("Redis", "Cache", RED, "991B1B"),
        ("Socket.IO", "WebSocket", PURPLE, "5B21B6"),
        ("Docker", "Container", BLUE, "1E40AF"),
        ("K8s", "Orchestration", "326CE5", "1E3A8A"),
        ("JWT", "Auth", ORANGE, "C2410C"),
    ]
    card_w = emu(2.9)
    card_h = emu(2.0)
    gap_x = emu(0.15)
    cube_size = emu(0.9)
    for i, (name, desc, color, dark_color) in enumerate(techs):
        col = i % 4
        row = i // 4
        x = emu(0.4) + col * (card_w + gap_x)
        y = emu(2.0) + row * (card_h + emu(0.3))
        # Card background (rounded rect with shadow)
        s.append(shape_text(x, y, card_w, card_h, "0F1A33", [], prst="roundRect", radius=8000, shadow=True))
        # Top accent stripe
        s.append(rect(x, y, card_w, emu(0.06), color))
        # 3D CUBE icon (using 'cube' preset for genuine 3D look)
        s.append(cube_3d(x + emu(0.2), y + emu(0.2), cube_size, color, gradient_to=dark_color))
        # Tech letter on cube
        s.append(text_box(x + emu(0.2), y + emu(0.3), cube_size, emu(0.6),
            [(name[0], 28, True, WHITE, "ctr")]))
        # Tech name
        s.append(text_box(x + emu(1.3), y + emu(0.3), emu(1.5), emu(0.4),
            [(name, 14, True, WHITE, "l")]))
        # Underline
        s.append(rect(x + emu(1.3), y + emu(0.65), emu(0.5), emu(0.04), AMBER))
        # Description
        s.append(text_box(x + emu(1.3), y + emu(0.8), emu(1.5), emu(0.4),
            [(desc, 10, False, GRAY, "l")]))
        # Bottom: tagline
        s.append(text_box(x + emu(0.2), y + emu(1.4), card_w - emu(0.3), emu(0.4),
            [("Production-ready", 9, False, AMBER, "l")]))
    # Bottom supporting libraries strip
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
# SLIDE 7: ER DIAGRAM - With 3D database cylinders
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
    # === 5 entities as 3D database cylinders + field cards ===
    entities = [
        ("USER", emu(0.4), emu(1.7), BLUE, ["_id, name, email", "role, phone", "addresses", "isOnDuty, kyc"]),
        ("ORDER", emu(4.6), emu(1.7), ORANGE, ["orderId, customerId", "agentId, warehouseId", "status, count", "timeline, priority"]),
        ("INVENTORY", emu(8.8), emu(1.7), GREEN, ["warehouseId, name", "totalCylinders", "available", "location, active"]),
        ("CHAT MESSAGE", emu(0.4), emu(4.8), PURPLE, ["messageId, roomId", "senderId, role", "content, type", "status, mediaUrl"]),
        ("DELIVERY", emu(4.6), emu(4.8), RED, ["orderId, agentId", "lat, lng, time", "ETA, route", "GPS tracking"]),
    ]
    for name, x, y, color, fields in entities:
        # 3D Database cylinder (visual entity icon)
        s.append(database_3d(x, y, emu(0.9), emu(0.9), color, ""))
        # Entity name label (right of cylinder)
        s.append(rect(x + emu(0.95), y, emu(2.05), emu(0.5), color, radius=6000))
        s.append(text_box(x + emu(0.95), y + emu(0.13), emu(2.05), emu(0.3),
            [(name, 12, True, WHITE, "ctr")]))
        # Fields panel
        s.append(shape_text(x, y + emu(0.95), emu(3), emu(1.2), WHITE, [], prst="rect"))
        s.append(rect(x, y + emu(0.95), emu(0.06), emu(1.2), color))
        for i, field in enumerate(fields):
            s.append(text_box(x + emu(0.2), y + emu(1.0) + i * emu(0.27), emu(2.7), emu(0.25),
                [(field, 9, False, DARK_GRAY, "l")]))
    # Relationship lines with badges
    s.append(line(emu(3.4), emu(2.0), emu(4.6), emu(2.0), ORANGE, width=20000))
    s.append(circle(emu(3.85), emu(1.85), emu(0.3), AMBER))
    s.append(text_box(emu(3.85), emu(1.9), emu(0.3), emu(0.25),
        [("1:N", 9, True, NAVY, "ctr")]))
    s.append(line(emu(7.6), emu(2.0), emu(8.8), emu(2.0), ORANGE, width=20000))
    s.append(circle(emu(8.05), emu(1.85), emu(0.3), AMBER))
    s.append(text_box(emu(8.05), emu(1.9), emu(0.3), emu(0.25),
        [("N:1", 9, True, NAVY, "ctr")]))
    s.append(line(emu(1.85), emu(3.95), emu(1.85), emu(4.8), ORANGE, width=20000))
    s.append(circle(emu(1.7), emu(4.25), emu(0.3), AMBER))
    s.append(text_box(emu(1.7), emu(4.3), emu(0.3), emu(0.25),
        [("1:N", 9, True, NAVY, "ctr")]))
    s.append(line(emu(6.05), emu(3.95), emu(6.05), emu(4.8), ORANGE, width=20000))
    s.append(circle(emu(5.9), emu(4.25), emu(0.3), AMBER))
    s.append(text_box(emu(5.9), emu(4.3), emu(0.3), emu(0.25),
        [("1:1", 9, True, NAVY, "ctr")]))
    # Right relationships panel
    s.append(shape_text(emu(8.8), emu(4.8), emu(4.0), emu(2.3), NAVY,
        [], prst="roundRect", radius=8000, shadow=True))
    s.append(rect(emu(8.8), emu(4.8), emu(4.0), emu(0.08), ORANGE))
    # Database stack icon in panel
    s.append(database_3d(emu(8.95), emu(5.4), emu(0.5), emu(0.5), AMBER, ""))
    s.append(text_box(emu(9.55), emu(5.45), emu(3.2), emu(0.4),
        [("RELATIONSHIPS", 11, True, ORANGE, "l")]))
    rels = [
        "User (1) -> (N) Orders",
        "User (1) -> (N) Orders [agent]",
        "Inventory (1) -> (N) Orders",
        "Order (1) -> (N) ChatMessages",
        "Order (1) -> (1) Delivery",
    ]
    for i, r in enumerate(rels):
        s.append(text_box(emu(8.95), emu(5.95) + i * emu(0.25), emu(3.8), emu(0.25),
            [(r, 10, False, WHITE, "l")]))
    s.append(text_box(emu(12.6), emu(7.1), emu(0.5), emu(0.3),
        [("07", 14, True, GRAY, "r")]))
    return ''.join(s)



# ============================================================
# SLIDE 8: DEMO & SECURITY - With phone mockup & shield
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
    # === LEFT: Phone mockup + dashboard ===
    s.append(text_box(emu(0.5), emu(1.4), emu(4), emu(0.4),
        [("EXECUTION DEMO", 11, True, ORANGE, "l")]))
    s.append(rect(emu(0.5), emu(1.7), emu(0.8), emu(0.04), ORANGE))
    # 3D Phone mockup (left)
    s.append(phone_mockup(emu(0.5), emu(1.85), emu(2.0), emu(3.6), BLUE_BR, ""))
    # Phone screen content - mock app UI
    s.append(rect(emu(0.65), emu(2.25), emu(1.7), emu(0.5), AMBER, radius=4000))
    s.append(text_box(emu(0.65), emu(2.35), emu(1.7), emu(0.3),
        [("CYLINDER", 9, True, NAVY, "ctr")]))
    s.append(text_box(emu(0.65), emu(2.55), emu(1.7), emu(0.2),
        [("BOOKING APP", 7, True, NAVY, "ctr")]))
    # Mock order cards
    for i in range(3):
        y = emu(2.95) + i * emu(0.55)
        s.append(rect(emu(0.65), y, emu(1.7), emu(0.45), WHITE, radius=4000))
        s.append(rect(emu(0.65), y, emu(0.05), emu(0.45), GREEN if i == 0 else (ORANGE if i == 1 else BLUE)))
        s.append(text_box(emu(0.78), y + emu(0.05), emu(1.5), emu(0.2),
            [(f"Order #{1001+i}", 8, True, NAVY, "l")]))
        s.append(text_box(emu(0.78), y + emu(0.22), emu(1.5), emu(0.2),
            [("Domestic 14.2kg", 6, False, DARK_GRAY, "l")]))
    # Dashboard mockup (right of phone)
    s.append(shape_text(emu(2.75), emu(1.85), emu(3.7), emu(2.7), WHITE,
        [], prst="roundRect", radius=4000, shadow=True))
    s.append(rect(emu(2.75), emu(1.85), emu(3.7), emu(0.35), NAVY_DEEP, radius=4000))
    s.append(rect(emu(2.75), emu(2.05), emu(3.7), emu(0.15), NAVY_DEEP))
    s.append(circle(emu(2.85), emu(1.95), emu(0.1), RED))
    s.append(circle(emu(3.0), emu(1.95), emu(0.1), AMBER))
    s.append(circle(emu(3.15), emu(1.95), emu(0.1), GREEN))
    s.append(text_box(emu(3.4), emu(1.95), emu(3), emu(0.25),
        [("admin/dashboard", 8, False, GRAY, "l")]))
    # Stats cards
    stats = [(BLUE_BR, "150", "Orders"), (ORANGE, "23", "Agents"), (GREEN, "98%", "Done")]
    for i, (col, num, lbl) in enumerate(stats):
        x = emu(2.85) + i * emu(1.15)
        s.append(shape_text(x, emu(2.4), emu(1.05), emu(0.7), col, [], prst="roundRect", radius=3000))
        s.append(text_box(x + emu(0.1), emu(2.5), emu(0.95), emu(0.35),
            [(num, 16, True, WHITE, "l")]))
        s.append(text_box(x + emu(0.1), emu(2.85), emu(0.95), emu(0.25),
            [(lbl, 8, False, WHITE, "l")]))
    # Mini bar chart
    s.append(rect(emu(2.85), emu(3.25), emu(3.45), emu(1.1), LIGHT_GRAY))
    bars = [25, 45, 30, 55, 40, 60, 50]
    for i, h in enumerate(bars):
        bar_h = emu(h * 0.014)
        s.append(rect(emu(2.95) + i * emu(0.45), emu(4.3) - bar_h, emu(0.32), bar_h, BLUE_BR))
    # Demo features list
    demos = [
        ("Mobile App", "iOS / Android"),
        ("Admin Panel", "Order management"),
        ("API Docs", "Swagger UI"),
    ]
    for i, (head, desc) in enumerate(demos):
        y = emu(4.7) + i * emu(0.55)
        s.append(circle(emu(0.65), y + emu(0.05), emu(0.4), ORANGE))
        s.append(text_box(emu(0.65), y + emu(0.13), emu(0.4), emu(0.3),
            [(str(i + 1), 13, True, WHITE, "ctr")]))
        s.append(text_box(emu(1.2), y, emu(2.5), emu(0.3),
            [(head, 12, True, NAVY, "l")]))
        s.append(text_box(emu(1.2), y + emu(0.3), emu(2.5), emu(0.3),
            [(desc, 10, False, DARK_GRAY, "l")]))
        # GPS pin badge
        if i == 0:
            s.append(map_pin(emu(4.5), y + emu(0.4), emu(0.3), GREEN))
    # === RIGHT: Security with shield illustration ===
    s.append(text_box(emu(7.0), emu(1.4), emu(5), emu(0.4),
        [("SECURITY ARCHITECTURE", 11, True, ORANGE, "l")]))
    s.append(rect(emu(7.0), emu(1.7), emu(0.8), emu(0.04), ORANGE))
    # Big shield illustration as security icon
    s.append(shield(emu(11.4), emu(1.85), emu(1.0), emu(1.0), ORANGE))
    s.append(text_box(emu(11.4), emu(2.15), emu(1.0), emu(0.4),
        [("S", 28, True, WHITE, "ctr")]))
    s.append(shape_text(emu(7.0), emu(1.85), emu(4.3), emu(5.2), NAVY,
        [], prst="roundRect", radius=8000, shadow=True))
    s.append(rect(emu(7.0), emu(1.85), emu(4.3), emu(0.08), ORANGE))
    s.append(text_box(emu(7.2), emu(2.1), emu(4), emu(0.3),
        [("MULTI-LAYER", 11, True, AMBER, "l")]))
    s.append(text_box(emu(7.2), emu(2.4), emu(4), emu(0.3),
        [("PROTECTION", 11, True, AMBER, "l")]))
    pillars = [
        ("JWT AUTH", "Access (15min) + Refresh", "Token rotation enabled", BLUE_BR),
        ("RATE LIMIT", "100 req/15min global", "10 req/15min auth", ORANGE),
        ("ENCRYPTION", "bcrypt 12-round hashing", "Helmet + CSP + HTTPS", PURPLE),
        ("RBAC", "Admin | Customer | Agent", "Role-scoped routes", GREEN),
    ]
    for i, (title, d1, d2, color) in enumerate(pillars):
        y = emu(2.95) + i * emu(1.0)
        s.append(rect(emu(7.2), y, emu(0.06), emu(0.85), color))
        # Lock icon (using lightning bolt as substitute)
        s.append(bolt(emu(7.35), y + emu(0.1), emu(0.35), emu(0.5), color))
        s.append(text_box(emu(7.8), y, emu(3.5), emu(0.3),
            [(title, 12, True, AMBER, "l")]))
        s.append(text_box(emu(7.8), y + emu(0.3), emu(3.5), emu(0.3),
            [(d1, 9, False, GRAY, "l")]))
        s.append(text_box(emu(7.8), y + emu(0.55), emu(3.5), emu(0.3),
            [(d2, 9, False, GRAY, "l")]))
    badges = ["Helmet", "CORS", "HPP", "Sanitize", "XSS", "Winston"]
    for i, b in enumerate(badges):
        x = emu(11.5) + (i % 1) * emu(0.85)
        y = emu(2.95) + i * emu(0.65)
        s.append(shape_text(x, y, emu(1.4), emu(0.5), NAVY_MID,
            [(b, 9, True, AMBER, "ctr")], prst="roundRect", radius=10000, shadow=True))
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
    # ROCKET illustration on the left of THANK YOU
    s.append(rocket(emu(2.0), emu(6.15), emu(0.9), emu(1.5), AMBER, ORANGE_DEEP))
    # Star decorations
    s.append(star_shape(emu(3.0), emu(5.65), emu(0.25), AMBER))
    s.append(star_shape(emu(9.6), emu(5.7), emu(0.2), AMBER))
    s.append(star_shape(emu(10.3), emu(6.4), emu(0.18), AMBER))
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
