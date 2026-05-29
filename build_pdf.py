#!/usr/bin/env python3
"""
Premium 9-page PDF presentation - Prezi-inspired design.
Cylinder Distribution Platform Backend API.
Pure Python, no external libraries.
"""
import os
import zlib

# A4 landscape (in points: 1pt = 1/72 inch)
PW, PH = 842, 595

# Premium color palette (RGB 0-1)
NAVY        = (0.043, 0.090, 0.224)   # 0B1739
NAVY_DEEP   = (0.024, 0.055, 0.149)   # 060E26
NAVY_MID    = (0.090, 0.149, 0.298)   # 17264C
BLUE        = (0.118, 0.251, 0.686)   # 1E40AF
BLUE_BR     = (0.231, 0.510, 0.965)   # 3B82F6
ORANGE      = (0.976, 0.451, 0.086)   # F97316
ORANGE_DEEP = (0.918, 0.345, 0.047)   # EA580C
AMBER       = (0.984, 0.749, 0.141)   # FBBF24
WHITE       = (1.0, 1.0, 1.0)
OFF_WHITE   = (0.973, 0.980, 0.988)   # F8FAFC
GRAY        = (0.580, 0.639, 0.722)   # 94A3B8
DARK_GRAY   = (0.278, 0.337, 0.412)   # 475569
LIGHT_GRAY  = (0.886, 0.910, 0.941)   # E2E8F0
GREEN       = (0.063, 0.725, 0.506)   # 10B981
RED         = (0.937, 0.267, 0.267)   # EF4444
PURPLE      = (0.545, 0.361, 0.965)   # 8B5CF6
TEAL        = (0.078, 0.722, 0.651)   # 14B8A6



class PDF:
    """Build a multi-page PDF from drawing primitives."""
    def __init__(self):
        self.pages = []          # list of content stream strings
        self.cur = []            # current page commands

    def page(self):
        if self.cur:
            self.pages.append('\n'.join(self.cur))
        self.cur = []

    # --- helpers ---
    def _fill(self, c):
        return f"{c[0]:.3f} {c[1]:.3f} {c[2]:.3f} rg"

    def _stroke(self, c):
        return f"{c[0]:.3f} {c[1]:.3f} {c[2]:.3f} RG"

    def _y(self, y):
        return PH - y

    # --- shapes ---
    def rect(self, x, y, w, h, fill, radius=0):
        """Filled rectangle, y from top."""
        py = self._y(y) - h
        cmds = [self._fill(fill)]
        if radius > 0:
            r = min(radius, w/2, h/2)
            k = 0.5523 * r
            cmds.append(f"{x+r:.2f} {py:.2f} m")
            cmds.append(f"{x+w-r:.2f} {py:.2f} l")
            cmds.append(f"{x+w-r+k:.2f} {py:.2f} {x+w:.2f} {py+r-k:.2f} {x+w:.2f} {py+r:.2f} c")
            cmds.append(f"{x+w:.2f} {py+h-r:.2f} l")
            cmds.append(f"{x+w:.2f} {py+h-r+k:.2f} {x+w-r+k:.2f} {py+h:.2f} {x+w-r:.2f} {py+h:.2f} c")
            cmds.append(f"{x+r:.2f} {py+h:.2f} l")
            cmds.append(f"{x+r-k:.2f} {py+h:.2f} {x:.2f} {py+h-r+k:.2f} {x:.2f} {py+h-r:.2f} c")
            cmds.append(f"{x:.2f} {py+r:.2f} l")
            cmds.append(f"{x:.2f} {py+r-k:.2f} {x+r-k:.2f} {py:.2f} {x+r:.2f} {py:.2f} c")
            cmds.append("f")
        else:
            cmds.append(f"{x:.2f} {py:.2f} {w:.2f} {h:.2f} re f")
        self.cur.append('\n'.join(cmds))

    def circle(self, cx, cy, r, fill):
        """Filled circle, cy from top."""
        py = self._y(cy)
        k = 0.5523 * r
        cmds = [self._fill(fill)]
        cmds.append(f"{cx+r:.2f} {py:.2f} m")
        cmds.append(f"{cx+r:.2f} {py+k:.2f} {cx+k:.2f} {py+r:.2f} {cx:.2f} {py+r:.2f} c")
        cmds.append(f"{cx-k:.2f} {py+r:.2f} {cx-r:.2f} {py+k:.2f} {cx-r:.2f} {py:.2f} c")
        cmds.append(f"{cx-r:.2f} {py-k:.2f} {cx-k:.2f} {py-r:.2f} {cx:.2f} {py-r:.2f} c")
        cmds.append(f"{cx+k:.2f} {py-r:.2f} {cx+r:.2f} {py-k:.2f} {cx+r:.2f} {py:.2f} c")
        cmds.append("f")
        self.cur.append('\n'.join(cmds))



    def line(self, x1, y1, x2, y2, color, width=1):
        py1, py2 = self._y(y1), self._y(y2)
        cmds = [self._stroke(color), f"{width:.2f} w",
                f"{x1:.2f} {py1:.2f} m", f"{x2:.2f} {py2:.2f} l", "S"]
        self.cur.append('\n'.join(cmds))

    def triangle(self, x1, y1, x2, y2, x3, y3, fill):
        """Filled triangle for arrows etc."""
        py1, py2, py3 = self._y(y1), self._y(y2), self._y(y3)
        cmds = [self._fill(fill),
                f"{x1:.2f} {py1:.2f} m",
                f"{x2:.2f} {py2:.2f} l",
                f"{x3:.2f} {py3:.2f} l",
                "f"]
        self.cur.append('\n'.join(cmds))

    def arrow_right(self, x, y, w, h, fill):
        """Right arrow shape."""
        # Body rect (60% of w) + triangle head (40% of w)
        body_w = w * 0.55
        # body rect (taller in middle)
        body_h = h * 0.5
        body_y = y + (h - body_h) / 2
        py_body = self._y(body_y) - body_h
        cmds = [self._fill(fill),
                f"{x:.2f} {py_body:.2f} {body_w:.2f} {body_h:.2f} re f"]
        self.cur.append('\n'.join(cmds))
        # Triangle head
        self.triangle(x + body_w, y, x + body_w, y + h, x + w, y + h/2, fill)

    def _esc(self, s):
        return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    def _font_ref(self, font):
        return {'reg': '/F1', 'bold': '/F2', 'italic': '/F3'}.get(font, '/F1')

    def text(self, x, y, s, size=12, color=(0,0,0), font='reg'):
        """Draw text. y = baseline from top."""
        py = self._y(y)
        ref = self._font_ref(font)
        cmds = ['BT', f"{ref} {size} Tf",
                self._fill(color),
                f"{x:.2f} {py:.2f} Td",
                f"({self._esc(s)}) Tj", 'ET']
        self.cur.append('\n'.join(cmds))

    def text_center(self, cx, y, s, size=12, color=(0,0,0), font='reg'):
        """Centered text. cx = center x."""
        # Approximate width using helvetica metrics (~0.5 em average)
        char_w = size * 0.5 if font != 'bold' else size * 0.55
        w = len(s) * char_w
        self.text(cx - w/2, y, s, size, color, font)

    # ============================================================
    # 3D ILLUSTRATIONS
    # ============================================================
    def ellipse(self, cx, cy, rx, ry, fill):
        """Filled ellipse."""
        py = self._y(cy)
        kx, ky = 0.5523 * rx, 0.5523 * ry
        cmds = [self._fill(fill)]
        cmds.append(f"{cx+rx:.2f} {py:.2f} m")
        cmds.append(f"{cx+rx:.2f} {py+ky:.2f} {cx+kx:.2f} {py+ry:.2f} {cx:.2f} {py+ry:.2f} c")
        cmds.append(f"{cx-kx:.2f} {py+ry:.2f} {cx-rx:.2f} {py+ky:.2f} {cx-rx:.2f} {py:.2f} c")
        cmds.append(f"{cx-rx:.2f} {py-ky:.2f} {cx-kx:.2f} {py-ry:.2f} {cx:.2f} {py-ry:.2f} c")
        cmds.append(f"{cx+kx:.2f} {py-ry:.2f} {cx+rx:.2f} {py-ky:.2f} {cx+rx:.2f} {py:.2f} c")
        cmds.append("f")
        self.cur.append('\n'.join(cmds))

    def cylinder_3d(self, cx, cy, w, h, color, top_lighter=None, label=""):
        """3D cylinder for LPG/database. cy = vertical center."""
        if top_lighter is None:
            top_lighter = tuple(min(1.0, c + 0.15) for c in color)
        rx = w / 2
        ry_top = w / 6  # ellipse flatness for top/bottom
        # Bottom ellipse (darker)
        self.ellipse(cx, cy + h/2, rx, ry_top, tuple(c * 0.7 for c in color))
        # Body rectangle
        self.rect(cx - rx, cy - h/2, w, h, color)
        # Top ellipse (lighter for highlight)
        self.ellipse(cx, cy - h/2, rx, ry_top, top_lighter)
        # Vertical highlight strip
        self.rect(cx - rx + 3, cy - h/2 + ry_top, w * 0.15, h - 2*ry_top, top_lighter)
        if label:
            self.text_center(cx, cy + 4, label, size=10, color=(1,1,1), font='bold')

    def lpg_cylinder_full(self, cx, cy, w, h, body=(0.97, 0.45, 0.09), label="LPG"):
        """Full LPG cylinder illustration with valve cap & base ring."""
        # Cap/valve on top
        cap_w = w * 0.5
        cap_h = h * 0.06
        self.rect(cx - cap_w/2, cy - h/2 - cap_h, cap_w, cap_h, (0.35, 0.40, 0.50))
        # Valve handle
        valve_w = w * 0.25
        valve_h = h * 0.04
        self.rect(cx - valve_w/2, cy - h/2 - cap_h - valve_h, valve_w, valve_h, (0.94, 0.27, 0.27))
        # Top button
        self.ellipse(cx, cy - h/2 - cap_h - valve_h - 2, 4, 3, (0.25, 0.25, 0.25))
        # Main body cylinder (3D)
        self.cylinder_3d(cx, cy, w, h, body)
        # White label band
        band_h = h * 0.18
        self.rect(cx - w*0.45, cy - band_h/2, w * 0.9, band_h, (1, 1, 1))
        self.text_center(cx, cy - band_h/2 + band_h*0.7, label, size=11, color=body, font='bold')
        # Base ring
        self.rect(cx - w*0.45, cy + h/2 - h*0.05, w * 0.9, h*0.05, tuple(c * 0.6 for c in body))

    def cube_3d(self, x, y, size, color, depth=0.3):
        """Isometric-style 3D cube using 3 parallelograms."""
        d = size * depth  # depth offset
        lighter = tuple(min(1.0, c + 0.18) for c in color)
        darker = tuple(c * 0.65 for c in color)
        # FRONT face (rect)
        self.rect(x, y + d, size, size, color)
        # TOP face (parallelogram - need polygon)
        py_top = self._y(y + d) + size  # PDF coords: top of front face
        py_back = self._y(y) + size      # back top
        cmds = [self._fill(lighter)]
        cmds.append(f"{x:.2f} {py_top:.2f} m")
        cmds.append(f"{x + d:.2f} {py_back:.2f} l")
        cmds.append(f"{x + size + d:.2f} {py_back:.2f} l")
        cmds.append(f"{x + size:.2f} {py_top:.2f} l")
        cmds.append("f")
        self.cur.append('\n'.join(cmds))
        # RIGHT face (parallelogram)
        py_front_top = self._y(y + d) + size
        py_front_bot = self._y(y + d + size) + size
        py_back_top = self._y(y) + size
        py_back_bot = self._y(y + size) + size
        cmds = [self._fill(darker)]
        cmds.append(f"{x + size:.2f} {py_front_bot:.2f} m")
        cmds.append(f"{x + size:.2f} {py_front_top:.2f} l")
        cmds.append(f"{x + size + d:.2f} {py_back_top:.2f} l")
        cmds.append(f"{x + size + d:.2f} {py_back_bot:.2f} l")
        cmds.append("f")
        self.cur.append('\n'.join(cmds))

    def user_avatar(self, cx, cy, size, color):
        """User avatar - circle head + rounded shoulders."""
        head_r = size / 4
        # Head
        self.circle(cx, cy - size/3, head_r, color)
        # Body (shoulders)
        body_w = size * 0.85
        body_h = size * 0.45
        self.rect(cx - body_w/2, cy - size/8, body_w, body_h, color, radius=body_h/2)

    def phone_3d(self, x, y, w, h, screen_color=(0.23, 0.51, 0.97), label=""):
        """3D smartphone mockup."""
        # Phone body
        self.rect(x, y, w, h, (0.05, 0.06, 0.15), radius=10)
        # Screen
        s_x = x + w * 0.06
        s_y = y + h * 0.08
        s_w = w * 0.88
        s_h = h * 0.78
        self.rect(s_x, s_y, s_w, s_h, screen_color)
        # Notch
        notch_w = w * 0.35
        self.rect(x + (w - notch_w)/2, y + 2, notch_w, 6, (0.05, 0.06, 0.15), radius=3)
        # Speaker
        self.rect(x + w/2 - 8, y + 5, 16, 2, (0.3, 0.3, 0.3))
        # Home indicator
        self.rect(x + w/2 - 25, y + h - 5, 50, 2, (1, 1, 1))
        if label:
            self.text_center(x + w/2, y + h/2, label, size=12, color=(1, 1, 1), font='bold')

    def server_rack(self, x, y, w, h, color=(0.16, 0.25, 0.41)):
        """3D server rack - chassis + 3 stacked units with LEDs."""
        # Outer chassis
        self.rect(x, y, w, h, color, radius=4)
        # Server units inside
        unit_h = (h - 8) / 3
        for i in range(3):
            uy = y + 3 + i * (unit_h + 1)
            self.rect(x + 3, uy, w - 6, unit_h, (0.06, 0.10, 0.20))
            # LEDs
            led_y = uy + unit_h * 0.3
            self.circle(x + 8, led_y, 1.5, (0.06, 0.73, 0.51))   # green
            self.circle(x + 12, led_y, 1.5, (0.98, 0.75, 0.14))   # amber
            self.circle(x + 16, led_y, 1.5, (0.23, 0.51, 0.97))   # blue
            # Slot/vent line
            self.rect(x + 25, uy + unit_h * 0.45, w - 32, 1, (0.19, 0.23, 0.31))

    def delivery_truck(self, x, y, w, h, color=(0.97, 0.45, 0.09)):
        """Delivery truck illustration."""
        # Cargo box
        cargo_w = w * 0.62
        cargo_h = h * 0.72
        self.rect(x, y + h*0.08, cargo_w, cargo_h, color)
        # Cargo door lines
        self.rect(x + 4, y + h*0.12, 1.5, cargo_h*0.92, tuple(c*0.7 for c in color))
        self.rect(x + cargo_w - 5, y + h*0.12, 1.5, cargo_h*0.92, tuple(c*0.7 for c in color))
        # Cab
        cab_x = x + cargo_w
        cab_w = w * 0.36
        cab_h = h * 0.5
        self.rect(cab_x, y + h*0.3, cab_w, cab_h, (0.04, 0.09, 0.22), radius=4)
        # Windshield
        self.rect(cab_x + 2, y + h*0.34, cab_w*0.7, cab_h*0.5, (0.23, 0.51, 0.97))
        # Wheels
        wheel_y = y + h*0.85
        wheel_r = h * 0.12
        for cx in [x + cargo_w*0.2, x + cargo_w*0.7, cab_x + cab_w*0.5]:
            self.circle(cx, wheel_y, wheel_r, (0.1, 0.1, 0.1))
            self.circle(cx, wheel_y, wheel_r * 0.4, (0.58, 0.64, 0.72))

    def shield(self, cx, cy, w, h, color):
        """Security shield (pentagon-ish)."""
        # Top rect part
        self.rect(cx - w/2, cy - h/2, w, h*0.6, color, radius=5)
        # Bottom triangle (using triangle method)
        self.triangle(cx - w/2, cy + h*0.1, cx + w/2, cy + h*0.1, cx, cy + h/2, color)

    def rocket(self, cx, cy, w, h, body_color=(0.98, 0.75, 0.14), fin_color=(0.91, 0.34, 0.04)):
        """Rocket illustration."""
        # Body
        body_w = w * 0.5
        body_h = h * 0.55
        self.rect(cx - body_w/2, cy - h/2 + h*0.2, body_w, body_h, body_color, radius=body_w/4)
        # Nose cone
        self.triangle(cx - body_w/2, cy - h/2 + h*0.2, cx + body_w/2, cy - h/2 + h*0.2, cx, cy - h/2, fin_color)
        # Window
        win_r = body_w * 0.18
        self.circle(cx, cy - h*0.1, win_r, (0.23, 0.51, 0.97))
        self.circle(cx + win_r*0.3, cy - h*0.1 - win_r*0.3, win_r*0.4, (1, 1, 1))
        # Fins
        fin_w = w * 0.18
        fin_h = h * 0.15
        # Left fin (triangle)
        self.triangle(cx - body_w/2 - fin_w + 2, cy + h*0.15,
                      cx - body_w/2 + 2, cy + h*0.15,
                      cx - body_w/2 + 2, cy + h*0.15 + fin_h, fin_color)
        # Right fin
        self.triangle(cx + body_w/2 - 2, cy + h*0.15,
                      cx + body_w/2 + fin_w - 2, cy + h*0.15,
                      cx + body_w/2 - 2, cy + h*0.15 + fin_h, fin_color)
        # Flame
        flame_w = body_w * 0.6
        flame_top = cy + h*0.3
        self.triangle(cx - flame_w/2, flame_top, cx + flame_w/2, flame_top,
                      cx, cy + h/2, (0.94, 0.27, 0.27))

    def map_pin(self, cx, cy, size, color=(0.94, 0.27, 0.27)):
        """Location map pin."""
        # Round head
        self.circle(cx, cy - size*0.6, size*0.5, color)
        # Pointer triangle
        self.triangle(cx - size*0.3, cy - size*0.4, cx + size*0.3, cy - size*0.4,
                      cx, cy + size*0.1, color)
        # Inner dot
        self.circle(cx, cy - size*0.6, size*0.18, (1, 1, 1))

    def cloud_shape(self, cx, cy, w, h, color):
        """Cloud illustration (3 overlapping circles + base rect)."""
        # 3 puffs
        self.circle(cx - w*0.3, cy, h*0.45, color)
        self.circle(cx, cy - h*0.15, h*0.55, color)
        self.circle(cx + w*0.3, cy, h*0.45, color)
        # Base
        self.rect(cx - w*0.4, cy - 1, w*0.8, h*0.5, color, radius=h*0.25)

    def chat_bubble(self, x, y, w, h, color):
        """Chat bubble with tail."""
        self.rect(x, y, w, h, color, radius=6)
        # Tail (small triangle below-left)
        self.triangle(x + w*0.15, y + h, x + w*0.3, y + h, x + w*0.15, y + h + 6, color)



    def save(self, path):
        if self.cur:
            self.pages.append('\n'.join(self.cur))
        # Build PDF objects
        objects = {}
        # Catalog
        objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
        # Page tree (will fill kids later)
        # Fonts (Helvetica family - core PDF fonts)
        objects[3] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
        objects[4] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
        objects[5] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>"
        # Resources
        resources = "<< /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >>"
        # Pages and contents
        next_obj = 6
        page_objs = []
        for content in self.pages:
            content_bytes = content.encode('latin-1', errors='replace')
            # Compress content
            compressed = zlib.compress(content_bytes)
            stream_obj = (f"<< /Length {len(compressed)} /Filter /FlateDecode >>\nstream\n".encode()
                          + compressed + b"\nendstream")
            objects[next_obj] = stream_obj
            stream_id = next_obj
            next_obj += 1
            page_obj = (f"<< /Type /Page /Parent 2 0 R "
                        f"/MediaBox [0 0 {PW} {PH}] "
                        f"/Contents {stream_id} 0 R "
                        f"/Resources {resources} >>").encode()
            objects[next_obj] = page_obj
            page_objs.append(next_obj)
            next_obj += 1
        # Pages object
        kids = ' '.join(f"{n} 0 R" for n in page_objs)
        objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_objs)} >>".encode()
        # Write PDF
        with open(path, 'wb') as f:
            f.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
            offsets = {}
            for obj_num in sorted(objects.keys()):
                offsets[obj_num] = f.tell()
                f.write(f"{obj_num} 0 obj\n".encode())
                if isinstance(objects[obj_num], str):
                    f.write(objects[obj_num].encode())
                else:
                    f.write(objects[obj_num])
                f.write(b"\nendobj\n")
            xref_offset = f.tell()
            max_obj = max(objects.keys())
            f.write(b"xref\n")
            f.write(f"0 {max_obj + 1}\n".encode())
            f.write(b"0000000000 65535 f \n")
            for i in range(1, max_obj + 1):
                f.write(f"{offsets.get(i, 0):010d} 00000 n \n".encode())
            f.write(b"trailer\n")
            f.write(f"<< /Size {max_obj + 1} /Root 1 0 R >>\n".encode())
            f.write(b"startxref\n")
            f.write(f"{xref_offset}\n".encode())
            f.write(b"%%EOF\n")
        print(f"PDF created: {path}")
        print(f"Pages: {len(self.pages)}")
        print(f"Size: {os.path.getsize(path)/1024:.1f} KB")



# ============================================================
# SLIDE 1: TITLE - Hero with 3D LPG cylinder
# ============================================================
def slide1(pdf):
    pdf.page()
    # Full navy background
    pdf.rect(0, 0, PW, PH, NAVY_DEEP)
    # Layered decorative circles (top right & bottom-left)
    pdf.circle(50, 520, 120, BLUE_BR)
    pdf.circle(80, 540, 60, BLUE)
    # Hex-tech background pattern (decorative)
    for hx, hy in [(540, 60), (575, 90), (610, 60), (540, 120), (610, 120)]:
        pdf.circle(hx, hy, 8, NAVY_MID)
    # === BIG 3D LPG CYLINDER (right hero visual) ===
    pdf.lpg_cylinder_full(720, 320, 100, 280, body=ORANGE, label="LPG")
    # Floating data nodes near cylinder (network feel)
    pdf.circle(620, 200, 8, AMBER)
    pdf.circle(615, 380, 6, BLUE_BR)
    pdf.circle(800, 250, 7, GREEN)
    pdf.circle(815, 480, 6, AMBER)
    # Connection lines from nodes to cylinder
    pdf.line(620, 200, 690, 220, AMBER, width=1)
    pdf.line(615, 380, 700, 360, BLUE_BR, width=1)
    pdf.line(800, 250, 750, 240, GREEN, width=1)
    # Top status pill
    pdf.rect(60, 50, 200, 28, ORANGE, radius=14)
    pdf.text(80, 70, "BACKEND API  |  v1.0", size=11, color=WHITE, font='bold')
    # Vertical orange accent
    pdf.rect(60, 130, 6, 110, ORANGE)
    # MASSIVE TITLE
    pdf.text(80, 175, "CYLINDER", size=58, color=WHITE, font='bold')
    pdf.text(80, 220, "DISTRIBUTION", size=58, color=ORANGE, font='bold')
    pdf.text(80, 265, "PLATFORM.", size=58, color=WHITE, font='bold')
    # Tagline
    pdf.rect(80, 295, 380, 3, ORANGE)
    pdf.text(80, 318, "Production-Grade LPG Delivery Backend", size=16, color=GRAY, font='italic')
    # Team info card
    pdf.rect(80, 360, 540, 140, NAVY_MID, radius=10)
    pdf.rect(80, 360, 6, 140, ORANGE, radius=0)
    pdf.text(110, 388, "TEAM CYLDIST", size=18, color=AMBER, font='bold')
    pdf.text(110, 410, "Department of Computer Engineering", size=11, color=WHITE)
    # Members in two columns
    pdf.text(110, 438, "Member 1  -  Lead Developer", size=10, color=GRAY)
    pdf.text(110, 455, "Member 2  -  Backend Engineer", size=10, color=GRAY)
    pdf.text(330, 438, "Member 3  -  DevOps & DB", size=10, color=GRAY)
    pdf.text(330, 455, "Member 4  -  Frontend & QA", size=10, color=GRAY)
    pdf.text(110, 482, "[Your College Name]  |  Academic Year 2025-26", size=10, color=ORANGE, font='bold')
    # Bottom accent bar
    pdf.rect(0, 590, PW, 5, ORANGE)
    # Slide number
    pdf.text(PW - 40, 575, "01", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 2: INTRODUCTION & OBJECTIVES
# ============================================================
def slide2(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    # Left navy panel (40%)
    pdf.rect(0, 0, 320, PH, NAVY)
    pdf.rect(320, 0, 4, PH, ORANGE)
    # Decorative circle on navy
    pdf.circle(-30, 480, 140, ORANGE)
    pdf.circle(-50, 450, 80, ORANGE_DEEP)
    # Big number
    pdf.text(40, 90, "02", size=72, color=ORANGE, font='bold')
    # Section label
    pdf.rect(40, 110, 120, 3, ORANGE)
    pdf.text(40, 140, "INTRODUCTION", size=12, color=AMBER, font='bold')
    # Bold title
    pdf.text(40, 180, "Digital LPG", size=32, color=WHITE, font='bold')
    pdf.text(40, 218, "Distribution", size=32, color=WHITE, font='bold')
    pdf.text(40, 256, "Reimagined.", size=32, color=AMBER, font='bold')
    # Description
    pdf.text(40, 300, "A production-grade backend that", size=11, color=GRAY)
    pdf.text(40, 318, "transforms how LPG cylinders are", size=11, color=GRAY)
    pdf.text(40, 336, "booked, tracked, and delivered.", size=11, color=GRAY)
    # Stats panel at bottom
    pdf.rect(40, 380, 240, 180, NAVY_MID, radius=8)
    pdf.text(60, 410, "PROJECT IMPACT", size=11, color=ORANGE, font='bold')
    # Small LPG cylinder icon next to title
    pdf.lpg_cylinder_full(265, 410, 25, 50, body=ORANGE, label="")
    stats = [("3+", "User Roles"), ("30+", "API Endpoints"), ("10+", "Core Features"), ("2", "Databases")]
    for i, (num, label) in enumerate(stats):
        col = i % 2
        row = i // 2
        x = 60 + col * 110
        y = 445 + row * 55
        pdf.text(x, y, num, size=24, color=AMBER, font='bold')
        pdf.text(x, y + 18, label, size=9, color=GRAY)
    # RIGHT SIDE - Objectives
    pdf.text(360, 70, "KEY OBJECTIVES", size=11, color=ORANGE, font='bold')
    pdf.rect(360, 80, 60, 2, ORANGE)
    pdf.text(360, 115, "Goals & Mission", size=28, color=NAVY, font='bold')
    # 4 objective cards in 2x2 grid (compressed to make room for 5th card)
    objs = [
        ("DIGITIZE", "Replace manual booking\nwith online + WhatsApp", BLUE_BR),
        ("TRACK", "Real-time GPS tracking\n& live customer chat", ORANGE),
        ("SECURE", "JWT + RBAC + bcrypt\nproduction security", PURPLE),
        ("SCALE", "Docker + Kubernetes\nready deployment", GREEN),
    ]
    for i, (head, desc, color) in enumerate(objs):
        col = i % 2
        row = i // 2
        x = 360 + col * 230
        y = 130 + row * 145
        # Card
        pdf.rect(x, y, 215, 130, WHITE, radius=8)
        # Top color band
        pdf.rect(x, y, 215, 5, color)
        # Number circle
        pdf.circle(x + 25, y + 40, 17, color)
        pdf.text_center(x + 25, y + 46, str(i + 1), size=16, color=WHITE, font='bold')
        # Title
        pdf.text(x + 55, y + 42, head, size=15, color=NAVY, font='bold')
        pdf.text(x + 55, y + 60, "____", size=10, color=color, font='bold')
        # Description
        for j, line_text in enumerate(desc.split('\n')):
            pdf.text(x + 18, y + 85 + j * 16, line_text, size=10, color=DARK_GRAY)
    # === 5TH CARD: EMERGENCY CRISIS ENGINE (wide banner) ===
    y5 = 425
    pdf.rect(360, y5, 445, 100, RED, radius=8)
    # Top accent
    pdf.rect(360, y5, 445, 5, AMBER)
    # Number circle (white-on-red)
    pdf.circle(385, y5 + 35, 17, WHITE)
    pdf.text_center(385, y5 + 41, "5", size=16, color=RED, font='bold')
    # Title
    pdf.text(415, y5 + 32, "CRISIS ENGINE", size=14, color=WHITE, font='bold')
    # Tagline
    pdf.text(415, y5 + 50, "Emergency-aware allocation with Priority Score Formula", size=9, color=(1, 0.85, 0.85))
    # Badges row
    badges = [
        ("HOSPITAL +150", AMBER),
        ("DOMESTIC +75", (1, 0.9, 0.9)),
        ("HOTEL 70% cap", (1, 0.9, 0.9)),
        ("HOARDING -200", (1, 0.9, 0.9)),
    ]
    for i, (txt, col_text) in enumerate(badges):
        bx = 380 + i * 105
        pdf.rect(bx, y5 + 70, 95, 20, (0.55, 0, 0), radius=10)
        pdf.text_center(bx + 47, y5 + 83, txt, size=8, color=col_text, font='bold')
    # Slide number
    pdf.text(PW - 40, 575, "02", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 3: PROBLEM vs SOLUTION
# ============================================================
def slide3(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    # Top decorative band
    pdf.rect(0, 0, PW, 110, NAVY)
    pdf.rect(0, 110, PW, 4, ORANGE)
    # Number badge (large)
    pdf.text(50, 65, "03", size=64, color=ORANGE, font='bold')
    pdf.text(150, 50, "THE CHALLENGE", size=12, color=AMBER, font='bold')
    pdf.text(150, 85, "Problem  vs  Solution", size=28, color=WHITE, font='bold')
    # PROBLEM CARD (left)
    pdf.rect(40, 140, 370, 400, WHITE, radius=10)
    # Red header band
    pdf.rect(40, 140, 370, 60, RED, radius=10)
    pdf.rect(40, 175, 370, 25, RED)  # extend bottom flat
    # Big X icon
    pdf.circle(85, 170, 22, WHITE)
    pdf.text(78, 178, "X", size=24, color=RED, font='bold')
    pdf.text(120, 175, "TRADITIONAL SYSTEM", size=15, color=WHITE, font='bold')
    pdf.text(120, 192, "Outdated  -  Manual  -  Inefficient", size=9, color=(1, 0.85, 0.85))
    # Problem items
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
        y = 230 + i * 40
        pdf.circle(70, y - 4, 8, RED)
        pdf.text(67, y - 1, "X", size=10, color=WHITE, font='bold')
        pdf.text(90, y, p, size=11, color=DARK_GRAY)
    # Center arrow (overlapping)
    pdf.rect(420, 320, 40, 40, NAVY, radius=20)
    pdf.triangle(425, 332, 425, 348, 455, 340, ORANGE)
    # SOLUTION CARD (right)
    pdf.rect(470, 140, 370, 400, WHITE, radius=10)
    pdf.rect(470, 140, 370, 60, GREEN, radius=10)
    pdf.rect(470, 175, 370, 25, GREEN)
    # Big check icon
    pdf.circle(515, 170, 22, WHITE)
    pdf.text(508, 178, "v", size=24, color=GREEN, font='bold')
    pdf.text(550, 175, "OUR DIGITAL SOLUTION", size=15, color=WHITE, font='bold')
    pdf.text(550, 192, "Modern  -  Automated  -  Scalable", size=9, color=(0.85, 1, 0.9))
    solutions = [
        "Online + WhatsApp booking",
        "Live GPS delivery tracking",
        "Automated inventory engine",
        "Crisis prioritization system",
        "Digital order management",
        "Real-time agent-customer chat",
        "Smart route optimization",
    ]
    for i, s in enumerate(solutions):
        y = 230 + i * 40
        pdf.circle(500, y - 4, 8, GREEN)
        pdf.text(497, y - 1, "v", size=10, color=WHITE, font='bold')
        pdf.text(520, y, s, size=11, color=DARK_GRAY)
    # Bottom impact strip
    pdf.rect(0, 555, PW, 40, NAVY_DEEP)
    pdf.text(40, 580, "IMPACT", size=11, color=ORANGE, font='bold')
    pdf.text(120, 580, "100% digital workflow  |  Real-time visibility  |  Emergency-aware  |  Cloud scalable", size=11, color=WHITE)
    pdf.text(PW - 40, 580, "03", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 4: ARCHITECTURE - With 3D illustrations
# ============================================================
def slide4(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    # Header strip
    pdf.rect(0, 0, PW, 90, NAVY)
    pdf.rect(0, 90, PW, 3, ORANGE)
    pdf.text(40, 50, "04", size=44, color=ORANGE, font='bold')
    pdf.text(110, 38, "SYSTEM DESIGN", size=11, color=AMBER, font='bold')
    pdf.text(110, 70, "Architecture & Workflow", size=22, color=WHITE, font='bold')
    pdf.text(40, 115, "ARCHITECTURE FLOW", size=10, color=ORANGE, font='bold')
    # === USER AVATARS (3D illustrations replacing flat circles) ===
    pdf.user_avatar(80, 165, 50, BLUE_BR)
    pdf.text_center(80, 215, "CUSTOMER", size=9, color=NAVY, font='bold')
    pdf.user_avatar(220, 165, 50, ORANGE)
    pdf.text_center(220, 215, "ADMIN", size=9, color=NAVY, font='bold')
    pdf.user_avatar(360, 165, 50, GREEN)
    pdf.text_center(360, 215, "AGENT", size=9, color=NAVY, font='bold')
    # Connection lines from avatars to API server
    pdf.line(80, 200, 220, 240, GRAY, width=1)
    pdf.line(220, 200, 220, 240, GRAY, width=1)
    pdf.line(360, 200, 220, 240, GRAY, width=1)
    pdf.triangle(212, 240, 228, 240, 220, 252, ORANGE)
    # === 3D SERVER RACK (API backend) ===
    pdf.server_rack(60, 245, 320, 75)
    pdf.text(80, 263, "EXPRESS.JS BACKEND API SERVER", size=12, color=ORANGE, font='bold')
    pdf.text(80, 308, "REST  |  Socket.IO  |  JWT  |  RBAC", size=9, color=GRAY)
    # Down arrows to DBs
    pdf.line(140, 320, 140, 360, GRAY, width=1.5)
    pdf.line(310, 320, 310, 360, GRAY, width=1.5)
    pdf.triangle(132, 357, 148, 357, 140, 369, ORANGE)
    pdf.triangle(302, 357, 318, 357, 310, 369, ORANGE)
    # === 3D DATABASE CYLINDERS ===
    pdf.cylinder_3d(140, 420, 110, 80, GREEN)
    pdf.text_center(140, 425, "MongoDB", size=12, color=WHITE, font='bold')
    pdf.text_center(140, 478, "Primary DB", size=8, color=GRAY)
    pdf.cylinder_3d(310, 420, 110, 80, RED)
    pdf.text_center(310, 425, "Redis", size=12, color=WHITE, font='bold')
    pdf.text_center(310, 478, "Cache + RT", size=8, color=GRAY)
    # === Delivery truck illustration at bottom ===
    pdf.delivery_truck(70, 510, 100, 50, ORANGE)
    pdf.text(190, 535, "Delivery Agent", size=10, color=DARK_GRAY, font='bold')
    pdf.text(190, 553, "GPS-tracked van", size=8, color=GRAY)
    # === RIGHT: Order Lifecycle ===
    pdf.rect(440, 110, 380, 425, WHITE, radius=10)
    pdf.rect(440, 110, 380, 50, NAVY, radius=10)
    pdf.rect(440, 145, 380, 15, NAVY)
    pdf.text(470, 142, "ORDER LIFECYCLE FLOW", size=14, color=ORANGE, font='bold')
    # Map pin icon at top right
    pdf.map_pin(795, 135, 12, AMBER)
    steps = [
        ("01", "Customer places order", BLUE_BR),
        ("02", "Admin assigns agent", ORANGE),
        ("03", "Agent picks cylinder", PURPLE),
        ("04", "GPS tracking begins", AMBER),
        ("05", "Live chat enabled", TEAL),
        ("06", "Delivery + OTP verify", BLUE),
        ("07", "Order completed!", GREEN),
    ]
    for i, (num, text, color) in enumerate(steps):
        y = 185 + i * 48
        pdf.circle(475, y + 5, 17, color)
        pdf.text_center(475, y + 11, num, size=11, color=WHITE, font='bold')
        pdf.text(505, y + 8, text, size=12, color=NAVY, font='bold')
        if i < len(steps) - 1:
            pdf.line(475, y + 22, 475, y + 35, color, width=2)
    pdf.text(PW - 40, 575, "04", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 5 (NEW): CRISIS ENGINE - How It Works (text-heavy)
# ============================================================
def slide_crisis(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    # Header
    pdf.rect(0, 0, PW, 75, NAVY)
    pdf.rect(0, 75, PW, 3, ORANGE)
    pdf.text(40, 45, "05", size=40, color=ORANGE, font='bold')
    pdf.text(110, 30, "CRISIS PRIORITIZATION ENGINE", size=10, color=AMBER, font='bold')
    pdf.text(110, 60, "How Emergency Allocation Works", size=20, color=WHITE, font='bold')
    # Subtitle
    pdf.text(40, 95, "During severe stock crises, FCFS is suspended. Orders enter a holding pool & are allocated using a Heuristic Priority Score (P).",
             size=9, color=DARK_GRAY)
    # === FORMULA HIGHLIGHTED BOX ===
    pdf.rect(40, 110, 770, 75, NAVY, radius=8)
    pdf.rect(40, 110, 6, 75, ORANGE)
    pdf.text(60, 130, "PRIORITY SCORE FORMULA", size=10, color=AMBER, font='bold')
    pdf.text(60, 158, "P  =  (1.5 x S_sector)  +  (1.0 x S_urgency)  -  (1.0 x S_hoarding)",
             size=18, color=WHITE, font='bold')
    pdf.text(60, 178, "Higher P = higher priority. Orders sorted in a Max-Heap and allocated in descending P order.",
             size=8, color=GRAY)
    # === 3 COMPONENT EXPLANATIONS (3 columns) ===
    comp_y = 200
    comp_h = 175
    col_w = 250
    cols = [
        (BLUE, "S_sector", "Sector Base Score", [
            "Hospitals/Emergency:  100",
            "Domestic Households:    50",
            "Hostels/Institutional:    30",
            "Commercial (Hotels):     10",
            "",
            "Multiplier:  W_sector = 1.5",
            "Hospital order = 150 in P",
        ]),
        (ORANGE, "S_urgency", "Necessity Index", [
            "(DaysSinceRefill / AvgCycle)",
            "x 100",
            "",
            "Capped at 200 max",
            "(prevents outlier anomalies)",
            "",
            "Multiplier:  W_urgency = 1.0",
        ]),
        (RED, "S_hoarding", "Hoarding Penalty Shield", [
            "-200 if user refilled within",
            "21 days, OR ordered more",
            "than 2 cylinders in 30 days",
            "",
            "Hospitals: fully exempt",
            "",
            "Multiplier:  W_hoarding = 1.0",
        ]),
    ]
    for i, (color, name, sub, lines) in enumerate(cols):
        x = 40 + i * (col_w + 10)
        pdf.rect(x, comp_y, col_w, comp_h, WHITE, radius=6)
        pdf.rect(x, comp_y, col_w, 5, color)
        pdf.text(x + 15, comp_y + 25, name, size=15, color=color, font='bold')
        pdf.text(x + 15, comp_y + 42, sub, size=10, color=NAVY, font='bold')
        pdf.rect(x + 15, comp_y + 48, 25, 2, color)
        for j, line_text in enumerate(lines):
            pdf.text(x + 15, comp_y + 65 + j * 14, line_text, size=9, color=DARK_GRAY)
    # === SECTOR COOLDOWN LOCKOUTS ===
    cool_y = 390
    cool_h = 75
    cools = [
        (GREEN, "HOSPITAL", "Exempt from cooldowns", "15% emergency reserve stock"),
        (BLUE_BR, "DOMESTIC HOUSEHOLD", "30-day lock period", "Hard reject within 30 days"),
        (RED, "HOTEL / COMMERCIAL", "7-day lock period", "70% quantity cap applied"),
    ]
    for i, (color, title, l1, l2) in enumerate(cools):
        x = 40 + i * (col_w + 10)
        pdf.rect(x, cool_y, col_w, cool_h, color, radius=6)
        pdf.text(x + 15, cool_y + 22, title, size=13, color=WHITE, font='bold')
        pdf.text(x + 15, cool_y + 42, l1, size=10, color=WHITE, font='bold')
        pdf.text(x + 15, cool_y + 58, l2, size=9, color=WHITE)
    # === WORKFLOW STRIP ===
    flow_y = 480
    pdf.rect(40, flow_y, 770, 45, NAVY_DEEP, radius=6)
    pdf.rect(40, flow_y, 770, 4, AMBER)
    flow_steps = ["Order Created", "Score Calculated", "Max-Heap Sort", "Batch Allocate", "Notify Customer"]
    step_w = 770 / len(flow_steps)
    for i, step in enumerate(flow_steps):
        sx = 40 + i * step_w
        col = AMBER if i == 0 else WHITE
        pdf.text_center(sx + step_w/2, flow_y + 27, step, size=10, color=col, font='bold')
        if i < len(flow_steps) - 1:
            pdf.text_center(sx + step_w - 8, flow_y + 27, ">", size=14, color=ORANGE, font='bold')
    pdf.text(PW - 40, 575, "05", size=14, color=GRAY, font='bold')


# ============================================================
# SLIDE 5 (now SLIDE 6): TECHNOLOGIES - With 3D cubes & cloud
# ============================================================
def slide5(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, NAVY_DEEP)
    pdf.rect(0, 0, 8, PH, ORANGE)
    pdf.circle(800, 80, 100, NAVY_MID)
    # Decorative cloud (Docker/K8s/cloud feel)
    pdf.cloud_shape(770, 95, 70, 35, ORANGE_DEEP)
    pdf.text(40, 65, "06", size=52, color=ORANGE, font='bold')
    pdf.text(120, 50, "TECH STACK", size=11, color=AMBER, font='bold')
    pdf.text(120, 85, "Modern Technologies", size=24, color=WHITE, font='bold')
    pdf.text(120, 108, "3D-illustrated stack for production scalability", size=11, color=GRAY)
    # Tech cards in 4-column grid with 3D CUBES
    techs = [
        ("Node.js", "Runtime", GREEN),
        ("Express", "Framework", BLUE_BR),
        ("MongoDB", "Database", (0.20, 0.55, 0.23)),
        ("Redis", "Cache", RED),
        ("Socket.IO", "WebSocket", PURPLE),
        ("Docker", "Container", BLUE),
        ("Kubernetes", "Orchestration", BLUE_BR),
        ("JWT", "Auth", ORANGE),
    ]
    card_w, card_h = 180, 130
    gap_x = 18
    cube_size = 50
    for i, (name, desc, color) in enumerate(techs):
        col = i % 4
        row = i // 4
        x = 40 + col * (card_w + gap_x)
        y = 150 + row * (card_h + 20)
        # Card with shadow
        pdf.rect(x, y, card_w, card_h, (0.06, 0.10, 0.20), radius=10)
        # Top accent stripe
        pdf.rect(x, y, card_w, 4, AMBER)
        # === 3D CUBE icon ===
        pdf.cube_3d(x + 15, y + 25, cube_size, color)
        pdf.text(x + 30, y + 65, name[0], size=22, color=WHITE, font='bold')
        # Tech name
        pdf.text(x + 90, y + 50, name, size=14, color=WHITE, font='bold')
        # Underline
        pdf.rect(x + 90, y + 55, 25, 2, AMBER)
        # Description
        pdf.text(x + 90, y + 75, desc, size=10, color=GRAY)
        # Bottom tagline
        pdf.text(x + 15, y + card_h - 15, "Production-ready", size=9, color=AMBER, font='italic')
    # Bottom supporting tools
    pdf.rect(40, 440, 770, 110, (0.09, 0.15, 0.30), radius=10)
    pdf.rect(40, 440, 770, 4, ORANGE)
    pdf.text(60, 470, "SUPPORTING LIBRARIES & TOOLS", size=11, color=ORANGE, font='bold')
    tool_groups = [
        ("Security:", "bcrypt | Helmet | CORS | Zod"),
        ("Logging:", "Winston | Morgan | rotate-file"),
        ("Integration:", "Twilio | SendGrid | Razorpay | S3"),
        ("Testing:", "Jest | Supertest | mongo-mem-server"),
    ]
    for i, (label, content) in enumerate(tool_groups):
        y = 495 + (i // 2) * 20
        x = 60 + (i % 2) * 380
        pdf.text(x, y, label, size=10, color=AMBER, font='bold')
        pdf.text(x + 70, y, content, size=10, color=GRAY)
    pdf.text(PW - 40, 575, "06", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 6: UNIQUE FEATURES
# ============================================================
def slide6(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    # Header strip
    pdf.rect(0, 0, PW, 90, NAVY)
    pdf.rect(0, 90, PW, 3, ORANGE)
    pdf.text(40, 50, "07", size=44, color=ORANGE, font='bold')
    pdf.text(110, 38, "WHAT MAKES US DIFFERENT", size=11, color=AMBER, font='bold')
    pdf.text(110, 70, "Unique Features", size=22, color=WHITE, font='bold')
    # 10 features in a 5x2 grid
    features = [
        ("WhatsApp", "Booking", BLUE_BR),
        ("Product", "Store", ORANGE),
        ("Live GPS", "Tracking", GREEN),
        ("Real-time", "Chat", PURPLE),
        ("Crisis", "Engine", RED),
        ("Inventory", "Manager", TEAL),
        ("JWT +", "RBAC", BLUE),
        ("Multi-channel", "Notify", AMBER),
        ("Swagger", "API Docs", (0.91, 0.34, 0.04)),
        ("Docker +", "K8s", (0.20, 0.55, 0.23)),
    ]
    feature_descs = [
        "API-based booking via WhatsApp",
        "Buy accessories with cylinders",
        "5-second GPS update intervals",
        "Customer-Agent messaging",
        "Emergency-aware allocation",
        "Warehouse-level cylinder tracking",
        "Role-based access control",
        "SMS / Email / Push alerts",
        "Interactive API testing UI",
        "Production-grade deployment",
    ]
    card_w, card_h = 145, 175
    gap = 10
    start_x = 40
    for i, ((title1, title2, color), desc) in enumerate(zip(features, feature_descs)):
        col = i % 5
        row = i // 5
        x = start_x + col * (card_w + gap)
        y = 120 + row * (card_h + 20)
        # Main card
        pdf.rect(x, y, card_w, card_h, WHITE, radius=10)
        # Top color block
        pdf.rect(x, y, card_w, 70, color, radius=10)
        pdf.rect(x, y + 35, card_w, 35, color)
        # Big number badge
        pdf.circle(x + 25, y + 30, 16, WHITE)
        pdf.text_center(x + 25, y + 36, str(i + 1).zfill(2), size=12, color=color, font='bold')
        # Two-line title
        pdf.text(x + 50, y + 30, title1, size=12, color=WHITE, font='bold')
        pdf.text(x + 50, y + 47, title2, size=12, color=WHITE, font='bold')
        # Description below
        pdf.text(x + 12, y + 95, desc[:25], size=9, color=DARK_GRAY)
        if len(desc) > 25:
            # wrap
            words = desc.split()
            lines, cur = [], ""
            for w in words:
                if len(cur + " " + w) > 22:
                    lines.append(cur.strip())
                    cur = w
                else:
                    cur += " " + w
            if cur:
                lines.append(cur.strip())
            for j, ln in enumerate(lines[:3]):
                pdf.text(x + 12, y + 95 + j * 14, ln, size=9, color=DARK_GRAY)
        # Bottom accent
        pdf.rect(x, y + card_h - 4, card_w, 4, color, radius=0)
    # Slide number
    pdf.text(PW - 40, 575, "07", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 7: ER DIAGRAM - With 3D database cylinders
# ============================================================
def slide7(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    pdf.rect(0, 0, PW, 90, NAVY)
    pdf.rect(0, 90, PW, 3, ORANGE)
    pdf.text(40, 50, "08", size=44, color=ORANGE, font='bold')
    pdf.text(110, 38, "DATA MODEL", size=11, color=AMBER, font='bold')
    pdf.text(110, 70, "Database Design & ER Diagram", size=22, color=WHITE, font='bold')
    # ER Diagram - 5 entities with 3D database cylinder icons
    entities = [
        ("USER", 40, 130, BLUE, ["_id, name, email", "role, phone", "addresses", "isOnDuty, kyc"]),
        ("ORDER", 340, 130, ORANGE, ["orderId, customerId", "agentId, warehouseId", "status, count", "timeline, priority"]),
        ("INVENTORY", 640, 130, GREEN, ["warehouseId, name", "totalCylinders", "available", "location, active"]),
        ("CHAT MSG", 40, 360, PURPLE, ["messageId, roomId", "senderId, role", "content, type", "status, mediaUrl"]),
        ("DELIVERY", 340, 360, RED, ["orderId, agentId", "lat, lng, time", "ETA, route", "GPS tracking"]),
    ]
    for name, x, y, color, fields in entities:
        # 3D database cylinder icon
        pdf.cylinder_3d(x + 25, y + 18, 40, 30, color)
        # Entity name label box
        pdf.rect(x + 50, y, 130, 35, color, radius=5)
        pdf.text_center(x + 115, y + 22, name, size=12, color=WHITE, font='bold')
        # Fields panel
        pdf.rect(x, y + 40, 180, 110, WHITE)
        pdf.rect(x, y + 40, 4, 110, color)  # left accent
        for i, field in enumerate(fields):
            pdf.text(x + 15, y + 60 + i * 22, field, size=9, color=DARK_GRAY)
    # Relationship lines with badges
    pdf.line(220, 200, 340, 200, ORANGE, width=2)
    pdf.circle(280, 200, 14, AMBER)
    pdf.text_center(280, 204, "1:N", size=8, color=NAVY, font='bold')
    pdf.line(520, 200, 640, 200, ORANGE, width=2)
    pdf.circle(580, 200, 14, AMBER)
    pdf.text_center(580, 204, "N:1", size=8, color=NAVY, font='bold')
    pdf.line(130, 280, 130, 360, ORANGE, width=2)
    pdf.circle(130, 320, 14, AMBER)
    pdf.text_center(130, 324, "1:N", size=8, color=NAVY, font='bold')
    pdf.line(430, 280, 430, 360, ORANGE, width=2)
    pdf.circle(430, 320, 14, AMBER)
    pdf.text_center(430, 324, "1:1", size=8, color=NAVY, font='bold')
    pdf.line(340, 240, 220, 360, ORANGE, width=1.5)
    # Right relationships panel
    pdf.rect(640, 360, 180, 185, NAVY, radius=8)
    pdf.rect(640, 360, 180, 6, ORANGE, radius=0)
    # Stack of 3D database cylinders icon in panel
    pdf.cylinder_3d(670, 395, 25, 12, AMBER)
    pdf.text(700, 393, "RELATIONSHIPS", size=11, color=ORANGE, font='bold')
    rels = [
        "User (1) -> (N) Orders",
        "User (1) -> (N) Orders",
        "          [as agent]",
        "Inventory (1) -> (N)",
        "          Orders",
        "Order (1) -> (N)",
        "          ChatMessages",
        "Order (1) -> (1)",
        "          Delivery",
    ]
    for i, rel in enumerate(rels):
        pdf.text(660, 425 + i * 14, rel, size=9, color=WHITE)
    pdf.text(PW - 40, 575, "08", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 8: DEMO & SECURITY - With phone & shield illustrations
# ============================================================
def slide8(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    pdf.rect(0, 0, PW, 90, NAVY)
    pdf.rect(0, 90, PW, 3, ORANGE)
    pdf.text(40, 50, "09", size=44, color=ORANGE, font='bold')
    pdf.text(110, 38, "EXECUTION & PROTECTION", size=11, color=AMBER, font='bold')
    pdf.text(110, 70, "Demo & Security", size=22, color=WHITE, font='bold')
    # === LEFT: Phone mockup + dashboard ===
    pdf.text(40, 125, "EXECUTION DEMO", size=11, color=ORANGE, font='bold')
    pdf.rect(40, 130, 60, 2, ORANGE)
    # 3D PHONE MOCKUP (left)
    pdf.phone_3d(40, 145, 130, 240, BLUE_BR)
    # Phone screen content - mock app UI
    pdf.rect(50, 175, 110, 30, AMBER, radius=4)
    pdf.text_center(105, 188, "CYLINDER", size=10, color=NAVY, font='bold')
    pdf.text_center(105, 200, "BOOKING", size=8, color=NAVY, font='bold')
    # Mock order cards on phone
    for i in range(4):
        cy = 215 + i * 35
        pdf.rect(50, cy, 110, 28, WHITE, radius=3)
        pdf.rect(50, cy, 4, 28, [GREEN, ORANGE, BLUE_BR, PURPLE][i])
        pdf.text(58, cy + 11, f"Order #{1001+i}", size=8, color=NAVY, font='bold')
        pdf.text(58, cy + 22, "Domestic 14.2kg", size=7, color=DARK_GRAY)
    # Dashboard mockup (right of phone)
    pdf.rect(190, 145, 240, 180, WHITE, radius=4)
    pdf.rect(190, 145, 240, 22, NAVY_DEEP, radius=4)
    pdf.rect(190, 161, 240, 6, NAVY_DEEP)
    pdf.circle(202, 156, 3, RED)
    pdf.circle(214, 156, 3, AMBER)
    pdf.circle(226, 156, 3, GREEN)
    pdf.text(245, 161, "admin/dashboard", size=8, color=GRAY)
    # Stats cards
    stats = [(BLUE_BR, "150", "Orders"), (ORANGE, "23", "Agents"), (GREEN, "98%", "Done")]
    for i, (col, num, lbl) in enumerate(stats):
        x = 200 + i * 78
        pdf.rect(x, 175, 70, 45, col, radius=3)
        pdf.text(x + 8, 200, num, size=18, color=WHITE, font='bold')
        pdf.text(x + 8, 215, lbl, size=8, color=WHITE)
    # Mini bar chart
    pdf.rect(200, 230, 220, 80, LIGHT_GRAY, radius=2)
    bars = [25, 45, 30, 55, 40, 60, 50]
    for i, h in enumerate(bars):
        pdf.rect(212 + i * 28, 305 - h, 16, h, BLUE_BR, radius=1)
    # Demo features list
    demos = [
        ("Mobile App", "iOS / Android booking"),
        ("Admin Panel", "Order management UI"),
        ("Live GPS", "Real-time tracking"),
        ("API Docs", "Swagger interactive UI"),
    ]
    for i, (head, desc) in enumerate(demos):
        y = 355 + i * 40
        pdf.circle(60, y + 7, 12, ORANGE)
        pdf.text_center(60, y + 11, str(i + 1), size=11, color=WHITE, font='bold')
        pdf.text(80, y + 4, head, size=11, color=NAVY, font='bold')
        pdf.text(80, y + 18, desc, size=9, color=DARK_GRAY)
        # Map pin badge for GPS
        if i == 2:
            pdf.map_pin(380, y + 20, 12, GREEN)
    # === RIGHT: Security with shield illustration ===
    pdf.text(450, 125, "SECURITY ARCHITECTURE", size=11, color=ORANGE, font='bold')
    pdf.rect(450, 130, 80, 2, ORANGE)
    # Security card
    pdf.rect(450, 145, 370, 380, NAVY, radius=10)
    pdf.rect(450, 145, 370, 6, ORANGE, radius=0)
    # Big SHIELD illustration
    pdf.shield(495, 200, 50, 60, ORANGE)
    pdf.text_center(495, 210, "S", size=24, color=WHITE, font='bold')
    pdf.text(540, 178, "MULTI-LAYER", size=11, color=AMBER, font='bold')
    pdf.text(540, 195, "PROTECTION", size=11, color=AMBER, font='bold')
    pdf.text(540, 215, "Production-grade", size=9, color=GRAY)
    # 4 main security pillars with bolt icons
    pillars = [
        ("JWT AUTH", "Access (15min) + Refresh (7d)", "Token rotation + reuse detect", BLUE_BR),
        ("RATE LIMITING", "100 req/15min global", "10 req/15min for auth", ORANGE),
        ("ENCRYPTION", "bcrypt 12-round hashing", "Helmet + CSP + HTTPS", PURPLE),
        ("RBAC", "Admin | Customer | Agent", "Role-scoped routes", GREEN),
    ]
    for i, (title, desc1, desc2, color) in enumerate(pillars):
        y = 260 + i * 60
        pdf.rect(465, y, 4, 50, color)
        # Lightning bolt-ish accent (zigzag using triangles)
        pdf.triangle(478, y + 5, 488, y + 5, 478, y + 25, color)
        pdf.triangle(478, y + 25, 488, y + 25, 488, y + 45, color)
        pdf.text(500, y + 12, title, size=12, color=AMBER, font='bold')
        pdf.text(500, y + 28, desc1, size=9, color=GRAY)
        pdf.text(500, y + 42, desc2, size=9, color=GRAY)
    # Bottom badges
    badges = ["Helmet", "CORS", "HPP", "Sanitize", "XSS", "Winston"]
    for i, b in enumerate(badges):
        x = 460 + (i % 6) * 60
        pdf.rect(x, 510, 55, 16, NAVY_MID, radius=8)
        pdf.text_center(x + 27, 521, b, size=8, color=AMBER, font='bold')
    pdf.text(PW - 40, 575, "09", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 9: CONCLUSION & FUTURE SCOPE
# ============================================================
def slide9(pdf):
    pdf.page()
    # Full navy background
    pdf.rect(0, 0, PW, PH, NAVY_DEEP)
    # Decorative shapes
    pdf.circle(50, 80, 100, NAVY_MID)
    pdf.circle(800, 100, 130, ORANGE)
    pdf.circle(820, 80, 80, ORANGE_DEEP)
    pdf.circle(750, 480, 90, BLUE)
    pdf.circle(80, 520, 60, AMBER)
    # Top bar
    pdf.rect(0, 0, PW, 5, ORANGE)
    # Header
    pdf.text(40, 60, "10", size=44, color=ORANGE, font='bold')
    pdf.text(110, 50, "WRAPPING UP", size=11, color=AMBER, font='bold')
    pdf.text(110, 80, "Conclusion & Future Scope", size=22, color=WHITE, font='bold')
    # === Left: Achievements ===
    pdf.rect(40, 120, 360, 290, NAVY_MID, radius=10)
    pdf.rect(40, 120, 360, 6, GREEN, radius=0)
    pdf.text(60, 152, "PROJECT ACHIEVEMENTS", size=12, color=GREEN, font='bold')
    pdf.text(60, 168, "_______________", size=10, color=GREEN)
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
        x = 60 + col * 170
        y = 195 + row * 38
        pdf.circle(x + 8, y + 5, 6, GREEN)
        pdf.text(x + 5, y + 8, "v", size=9, color=WHITE, font='bold')
        pdf.text(x + 22, y + 8, a, size=10, color=WHITE)
    # === Right: Future scope ===
    pdf.rect(440, 120, 360, 290, NAVY_MID, radius=10)
    pdf.rect(440, 120, 360, 6, ORANGE, radius=0)
    pdf.text(460, 152, "FUTURE ENHANCEMENTS", size=12, color=ORANGE, font='bold')
    pdf.text(460, 168, "________________", size=10, color=ORANGE)
    futures = [
        ("AI", "Demand Prediction", "ML-based consumption forecast", BLUE_BR),
        ("APP", "Mobile App", "React Native / Flutter", ORANGE),
        ("PAY", "Online Payments", "Razorpay / Stripe / UPI", PURPLE),
        ("MAP", "Route Optimization", "Google Maps integration", GREEN),
        ("IoT", "Smart Sensors", "Cylinder gas-level IoT", TEAL),
    ]
    for i, (icon, title, desc, color) in enumerate(futures):
        y = 190 + i * 42
        # Icon circle
        pdf.circle(478, y + 10, 16, color)
        pdf.text_center(478, y + 14, icon, size=9, color=WHITE, font='bold')
        # Title + desc
        pdf.text(508, y + 8, title, size=12, color=WHITE, font='bold')
        pdf.text(508, y + 24, desc, size=9, color=GRAY)
    # === Big Thank You section ===
    pdf.rect(150, 430, 540, 110, ORANGE, radius=15)
    pdf.rect(150, 430, 540, 6, AMBER, radius=0)
    # ROCKET illustration on the left side of THANK YOU
    pdf.rocket(125, 485, 50, 90, AMBER, ORANGE_DEEP)
    # Decorative star/dots on right
    pdf.circle(660, 485, 25, ORANGE_DEEP)
    # Stars
    for sx, sy in [(225, 460), (700, 470), (715, 510)]:
        pdf.triangle(sx-5, sy+2, sx+5, sy+2, sx, sy-7, AMBER)
        pdf.triangle(sx-5, sy+2, sx+5, sy+2, sx, sy+10, AMBER)
    # Text
    pdf.text_center(420, 480, "THANK YOU!", size=42, color=WHITE, font='bold')
    pdf.text_center(420, 510, "Questions  &  Discussion  Welcome", size=13, color=(1, 0.95, 0.88))
    # Bottom signature
    pdf.text_center(PW / 2, 565, "Team CylDist  -  Department of Computer Engineering  -  2025-26", size=10, color=GRAY)
    pdf.rect(0, PH - 5, PW, 5, ORANGE)
    pdf.text(PW - 40, 575, "10", size=14, color=GRAY, font='bold')


# ============================================================
# Main
# ============================================================
def main():
    pdf = PDF()
    slide1(pdf)
    slide2(pdf)
    slide3(pdf)
    slide4(pdf)
    slide_crisis(pdf)
    slide5(pdf)
    slide6(pdf)
    slide7(pdf)
    slide8(pdf)
    slide9(pdf)
    out = "/projects/sandbox/cyldist-lpg-platform/CylDist_Platform_Presentation.pdf"
    pdf.save(out)


if __name__ == "__main__":
    main()
