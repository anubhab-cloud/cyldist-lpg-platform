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
# SLIDE 1: TITLE - Hero design with massive typography
# ============================================================
def slide1(pdf):
    pdf.page()
    # Full navy background
    pdf.rect(0, 0, PW, PH, NAVY_DEEP)
    # Layered decorative circles (top right)
    pdf.circle(780, 80, 180, ORANGE)
    pdf.circle(820, 50, 130, ORANGE_DEEP)
    pdf.circle(770, 130, 70, AMBER)
    # Bottom-left accent circle
    pdf.circle(40, 520, 120, BLUE_BR)
    pdf.circle(80, 540, 60, BLUE)
    # Floating dots
    pdf.circle(640, 380, 8, AMBER)
    pdf.circle(720, 420, 5, ORANGE)
    pdf.circle(680, 460, 6, WHITE)
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
    # 4 objective cards in 2x2 grid
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
        y = 160 + row * 180
        # Card
        pdf.rect(x, y, 215, 160, WHITE, radius=8)
        # Top color band
        pdf.rect(x, y, 215, 6, color)
        # Number circle
        pdf.circle(x + 30, y + 50, 22, color)
        pdf.text_center(x + 30, y + 56, str(i + 1), size=20, color=WHITE, font='bold')
        # Title
        pdf.text(x + 65, y + 50, head, size=18, color=NAVY, font='bold')
        pdf.text(x + 65, y + 70, "_____", size=10, color=color, font='bold')
        # Description
        for j, line_text in enumerate(desc.split('\n')):
            pdf.text(x + 20, y + 105 + j * 18, line_text, size=10, color=DARK_GRAY)
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
# SLIDE 4: SYSTEM ARCHITECTURE & WORKFLOW
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
    # === LEFT: Architecture Diagram ===
    # User role circles (top row)
    roles = [
        ("CUSTOMER", BLUE_BR, 80),
        ("ADMIN", ORANGE, 220),
        ("AGENT", GREEN, 360),
    ]
    for name, color, x in roles:
        pdf.circle(x, 160, 38, color)
        # Inner highlight
        pdf.circle(x - 8, 152, 12, WHITE)
        pdf.text_center(x, 207, name, size=10, color=NAVY, font='bold')
    # Down arrow lines from roles to API
    for _, _, x in roles:
        pdf.line(x, 200, 220, 245, GRAY, width=1.5)
    pdf.triangle(212, 240, 228, 240, 220, 252, ORANGE)
    # API Box (centered)
    pdf.rect(50, 255, 350, 70, NAVY, radius=10)
    pdf.rect(50, 255, 6, 70, ORANGE)
    pdf.text(75, 282, "EXPRESS.JS BACKEND API", size=14, color=WHITE, font='bold')
    pdf.text(75, 305, "REST API  |  Socket.IO  |  JWT  |  RBAC  |  Zod", size=10, color=GRAY)
    # Down arrow to DBs
    pdf.line(140, 325, 140, 360, GRAY, width=1.5)
    pdf.line(310, 325, 310, 360, GRAY, width=1.5)
    pdf.triangle(132, 357, 148, 357, 140, 369, ORANGE)
    pdf.triangle(302, 357, 318, 357, 310, 369, ORANGE)
    # MongoDB
    pdf.rect(50, 370, 160, 60, GREEN, radius=8)
    pdf.text(75, 395, "MongoDB", size=14, color=WHITE, font='bold')
    pdf.text(75, 415, "Primary Database", size=9, color=(0.85, 1, 0.9))
    # Redis
    pdf.rect(240, 370, 160, 60, RED, radius=8)
    pdf.text(265, 395, "Redis", size=14, color=WHITE, font='bold')
    pdf.text(265, 415, "Cache + Real-Time", size=9, color=(1, 0.9, 0.9))
    # Architecture title
    pdf.text(50, 130, "ARCHITECTURE FLOW", size=10, color=ORANGE, font='bold')
    # === RIGHT: Order Lifecycle ===
    pdf.rect(440, 110, 380, 425, WHITE, radius=10)
    pdf.rect(440, 110, 380, 50, NAVY, radius=10)
    pdf.rect(440, 145, 380, 15, NAVY)
    pdf.text(470, 142, "ORDER LIFECYCLE FLOW", size=14, color=ORANGE, font='bold')
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
        # Number circle
        pdf.circle(475, y + 5, 17, color)
        pdf.text_center(475, y + 11, num, size=11, color=WHITE, font='bold')
        # Text
        pdf.text(505, y + 8, text, size=12, color=NAVY, font='bold')
        # Connecting line down
        if i < len(steps) - 1:
            pdf.line(475, y + 22, 475, y + 35, color, width=2)
    # Slide number
    pdf.text(PW - 40, 575, "04", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 5: TECHNOLOGIES USED
# ============================================================
def slide5(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, NAVY_DEEP)
    # Decorative side accent
    pdf.rect(0, 0, 8, PH, ORANGE)
    pdf.circle(800, 80, 100, NAVY_MID)
    pdf.circle(820, 60, 60, ORANGE)
    # Header
    pdf.text(40, 65, "05", size=52, color=ORANGE, font='bold')
    pdf.text(120, 50, "TECH STACK", size=11, color=AMBER, font='bold')
    pdf.text(120, 85, "Modern Technologies", size=24, color=WHITE, font='bold')
    pdf.text(120, 108, "Built with industry-standard tools for scalability & reliability", size=11, color=GRAY)
    # Tech cards in 3-column grid
    techs = [
        # row 1
        ("Node.js", "Runtime\nEngine", GREEN, 60, 160),
        ("Express", "Web\nFramework", BLUE_BR, 60, 160),
        ("MongoDB", "NoSQL\nDatabase", (0.20, 0.55, 0.23), 60, 160),
        ("Redis", "Cache &\nRT Store", RED, 60, 160),
        # row 2
        ("Socket.IO", "WebSocket\nLayer", PURPLE, 60, 320),
        ("Docker", "Container\nPlatform", BLUE, 60, 320),
        ("Kubernetes", "Orchestration\nEngine", BLUE_BR, 60, 320),
        ("JWT", "Auth &\nSecurity", ORANGE, 60, 320),
    ]
    card_w, card_h = 175, 130
    gap_x = 15
    for i, (name, desc, color, _, _) in enumerate(techs):
        col = i % 4
        row = i // 4
        x = 40 + col * (card_w + gap_x)
        y = 150 + row * (card_h + 20)
        # Card with gradient feel (two rects)
        pdf.rect(x, y, card_w, card_h, color, radius=10)
        pdf.rect(x, y, card_w, 6, WHITE)  # top highlight stripe (light overlay)
        pdf.rect(x, y, card_w, 4, AMBER)  # accent stripe
        # Big initial letter
        pdf.text(x + 15, y + 50, name[0], size=32, color=WHITE, font='bold')
        # Tech name
        pdf.text(x + 15, y + 75, name, size=14, color=WHITE, font='bold')
        # Underline
        pdf.rect(x + 15, y + 80, 30, 2, AMBER)
        # Description
        for j, line_text in enumerate(desc.split('\n')):
            pdf.text(x + 15, y + 100 + j * 14, line_text, size=10, color=(0.95, 0.95, 0.95))
    # Bottom supporting tools strip
    pdf.rect(40, 440, 770, 110, NAVY_MID, radius=10)
    pdf.rect(40, 440, 770, 6, ORANGE, radius=0)
    pdf.text(60, 470, "SUPPORTING LIBRARIES & TOOLS", size=11, color=ORANGE, font='bold')
    tool_groups = [
        ("Security:", "bcrypt | Helmet | CORS | Zod | mongo-sanitize"),
        ("Logging:", "Winston | Morgan | daily-rotate-file"),
        ("Integration:", "Twilio | SendGrid | Razorpay | AWS S3 | Multer"),
        ("Testing:", "Jest | Supertest | mongodb-memory-server"),
    ]
    for i, (label, content) in enumerate(tool_groups):
        y = 495 + (i // 2) * 20
        x = 60 + (i % 2) * 380
        pdf.text(x, y, label, size=10, color=AMBER, font='bold')
        pdf.text(x + 70, y, content, size=10, color=GRAY)
    # Slide number
    pdf.text(PW - 40, 575, "05", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 6: UNIQUE FEATURES
# ============================================================
def slide6(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    # Header strip
    pdf.rect(0, 0, PW, 90, NAVY)
    pdf.rect(0, 90, PW, 3, ORANGE)
    pdf.text(40, 50, "06", size=44, color=ORANGE, font='bold')
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
    pdf.text(PW - 40, 575, "06", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 7: DATABASE / ER DIAGRAM
# ============================================================
def slide7(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    pdf.rect(0, 0, PW, 90, NAVY)
    pdf.rect(0, 90, PW, 3, ORANGE)
    pdf.text(40, 50, "07", size=44, color=ORANGE, font='bold')
    pdf.text(110, 38, "DATA MODEL", size=11, color=AMBER, font='bold')
    pdf.text(110, 70, "Database Design & ER Diagram", size=22, color=WHITE, font='bold')
    # ER Diagram - 5 entities arranged in a diamond pattern
    entities = [
        # (name, x, y, color, fields)
        ("USER", 40, 130, BLUE, ["_id, name, email", "role, phone", "addresses", "isOnDuty, kycStatus"]),
        ("ORDER", 340, 130, ORANGE, ["orderId, customerId", "agentId, warehouseId", "status, cylinderCount", "timeline, priority"]),
        ("INVENTORY", 640, 130, GREEN, ["warehouseId, name", "totalCylinders", "availableCylinders", "location, isActive"]),
        ("CHAT MESSAGE", 40, 360, PURPLE, ["messageId, chatRoomId", "senderId, senderRole", "content, type", "status, mediaUrl"]),
        ("DELIVERY", 340, 360, RED, ["orderId, agentId", "lat, lng, timestamp", "ETA, route data", "GPS tracking"]),
    ]
    for name, x, y, color, fields in entities:
        # Header strip
        pdf.rect(x, y, 180, 35, color, radius=8)
        pdf.rect(x, y + 22, 180, 13, color)
        # Header icon circle
        pdf.circle(x + 18, y + 18, 11, WHITE)
        pdf.text(x + 13, y + 23, "DB", size=8, color=color, font='bold')
        # Name
        pdf.text(x + 38, y + 22, name, size=12, color=WHITE, font='bold')
        # Fields box
        pdf.rect(x, y + 35, 180, 110, WHITE)
        pdf.rect(x, y + 35, 180, 110, GRAY)  # would need stroke - skip
        pdf.rect(x, y + 35, 4, 110, color)  # left accent
        for i, field in enumerate(fields):
            pdf.text(x + 15, y + 55 + i * 22, field, size=9, color=DARK_GRAY)
    # Relationship lines
    # User -> Order
    pdf.line(220, 200, 340, 200, ORANGE, width=2)
    pdf.text(255, 195, "1:N", size=9, color=ORANGE, font='bold')
    # Order -> Inventory
    pdf.line(520, 200, 640, 200, ORANGE, width=2)
    pdf.text(560, 195, "N:1", size=9, color=ORANGE, font='bold')
    # User -> ChatMessage
    pdf.line(130, 280, 130, 360, ORANGE, width=2)
    pdf.text(135, 320, "1:N", size=9, color=ORANGE, font='bold')
    # Order -> Delivery
    pdf.line(430, 280, 430, 360, ORANGE, width=2)
    pdf.text(435, 320, "1:1", size=9, color=ORANGE, font='bold')
    # Order -> ChatMessage (diagonal)
    pdf.line(340, 240, 220, 360, ORANGE, width=2)
    # === Right side: Relationships panel ===
    pdf.rect(640, 360, 180, 185, NAVY, radius=8)
    pdf.rect(640, 360, 180, 6, ORANGE, radius=0)
    pdf.text(660, 390, "RELATIONSHIPS", size=11, color=ORANGE, font='bold')
    rels = [
        "User (1) -> (N) Orders",
        "User (1) -> (N) Orders",
        "         [as agent]",
        "Inventory (1) -> (N)",
        "         Orders",
        "Order (1) -> (N)",
        "         ChatMessages",
        "Order (1) -> (1)",
        "         Delivery",
    ]
    for i, rel in enumerate(rels):
        pdf.text(660, 415 + i * 14, rel, size=9, color=WHITE)
    # Slide number
    pdf.text(PW - 40, 575, "07", size=14, color=GRAY, font='bold')



# ============================================================
# SLIDE 8: DEMO & SECURITY
# ============================================================
def slide8(pdf):
    pdf.page()
    pdf.rect(0, 0, PW, PH, OFF_WHITE)
    pdf.rect(0, 0, PW, 90, NAVY)
    pdf.rect(0, 90, PW, 3, ORANGE)
    pdf.text(40, 50, "08", size=44, color=ORANGE, font='bold')
    pdf.text(110, 38, "EXECUTION & PROTECTION", size=11, color=AMBER, font='bold')
    pdf.text(110, 70, "Demo & Security", size=22, color=WHITE, font='bold')
    # === LEFT: Demo highlights with mock screens ===
    pdf.text(40, 125, "EXECUTION DEMO", size=11, color=ORANGE, font='bold')
    pdf.rect(40, 130, 60, 2, ORANGE)
    # Mock dashboard screen
    pdf.rect(40, 145, 380, 180, WHITE, radius=8)
    # Browser bar
    pdf.rect(40, 145, 380, 25, NAVY_DEEP, radius=8)
    pdf.rect(40, 162, 380, 8, NAVY_DEEP)
    pdf.circle(54, 158, 4, RED)
    pdf.circle(70, 158, 4, AMBER)
    pdf.circle(86, 158, 4, GREEN)
    pdf.text(120, 162, "/api/v1/admin/dashboard", size=9, color=GRAY)
    # Dashboard mock content
    # Sidebar
    pdf.rect(40, 170, 80, 155, NAVY)
    for i in range(5):
        pdf.rect(50, 185 + i * 25, 60, 4, ORANGE if i == 0 else GRAY)
    # Stats cards
    stats = [(BLUE_BR, "150", "Orders"), (ORANGE, "23", "Agents"), (GREEN, "98%", "Success")]
    for i, (col, num, label) in enumerate(stats):
        x = 130 + i * 95
        pdf.rect(x, 185, 85, 50, col, radius=4)
        pdf.text(x + 10, 210, num, size=18, color=WHITE, font='bold')
        pdf.text(x + 10, 225, label, size=8, color=WHITE)
    # Chart area mock
    pdf.rect(130, 245, 280, 70, LIGHT_GRAY, radius=4)
    # Bar chart bars
    heights = [25, 45, 30, 55, 40, 60, 50]
    for i, h in enumerate(heights):
        pdf.rect(145 + i * 35, 305 - h, 20, h, BLUE_BR, radius=2)
    # Demo feature list
    demos = [
        ("Admin Dashboard", "Order management & analytics"),
        ("Swagger API Docs", "Interactive testing UI at /api/v1/docs"),
        ("Live GPS Tracking", "Real-time agent location updates"),
        ("Agent-Customer Chat", "WebSocket-based messaging"),
    ]
    for i, (head, desc) in enumerate(demos):
        y = 345 + i * 50
        pdf.circle(55, y + 12, 12, ORANGE)
        pdf.text_center(55, y + 17, str(i + 1), size=11, color=WHITE, font='bold')
        pdf.text(80, y + 8, head, size=12, color=NAVY, font='bold')
        pdf.text(80, y + 25, desc, size=10, color=DARK_GRAY)
    # === RIGHT: Security ===
    pdf.text(450, 125, "SECURITY ARCHITECTURE", size=11, color=ORANGE, font='bold')
    pdf.rect(450, 130, 80, 2, ORANGE)
    # Security card
    pdf.rect(450, 145, 370, 410, NAVY, radius=10)
    pdf.rect(450, 145, 370, 6, ORANGE, radius=0)
    # Security shield icon
    pdf.circle(485, 185, 22, ORANGE)
    pdf.text(478, 192, "S", size=22, color=WHITE, font='bold')
    pdf.text(520, 178, "MULTI-LAYER", size=11, color=AMBER, font='bold')
    pdf.text(520, 195, "PROTECTION", size=11, color=AMBER, font='bold')
    # 4 main security pillars
    pillars = [
        ("JWT AUTH", "Access (15min) + Refresh (7d)\nToken rotation + reuse detection", BLUE_BR),
        ("RATE LIMITING", "100 req/15min global\n10 req/15min for auth endpoints", ORANGE),
        ("ENCRYPTION", "bcrypt 12-round password hashing\nHelmet + CSP headers + HTTPS", PURPLE),
        ("RBAC", "Role-based access control:\nAdmin | Customer | Delivery Agent", GREEN),
    ]
    for i, (title, desc, color) in enumerate(pillars):
        y = 230 + i * 75
        # Color indicator bar
        pdf.rect(465, y, 4, 50, color)
        pdf.text(480, y + 12, title, size=12, color=AMBER, font='bold')
        for j, line_text in enumerate(desc.split('\n')):
            pdf.text(480, y + 30 + j * 15, line_text, size=9, color=GRAY)
    # Bottom badges row
    badges = ["Helmet", "CORS", "HPP", "Sanitize", "XSS-Clean", "Winston"]
    for i, b in enumerate(badges):
        x = 460 + (i % 6) * 60
        pdf.rect(x, 540, 55, 16, NAVY_MID, radius=8)
        pdf.text_center(x + 27, 552, b, size=8, color=AMBER, font='bold')
    pdf.text(PW - 40, 575, "08", size=14, color=GRAY, font='bold')



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
    pdf.text(40, 60, "09", size=44, color=ORANGE, font='bold')
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
    # Decorative circles on thank you
    pdf.circle(180, 485, 25, ORANGE_DEEP)
    pdf.circle(660, 485, 25, ORANGE_DEEP)
    # Text
    pdf.text_center(420, 480, "THANK YOU!", size=42, color=WHITE, font='bold')
    pdf.text_center(420, 510, "Questions  &  Discussion  Welcome", size=13, color=(1, 0.95, 0.88))
    # Bottom signature
    pdf.text_center(PW / 2, 565, "Team CylDist  -  Department of Computer Engineering  -  2025-26", size=10, color=GRAY)
    pdf.rect(0, PH - 5, PW, 5, ORANGE)
    pdf.text(PW - 40, 575, "09", size=14, color=GRAY, font='bold')


# ============================================================
# Main
# ============================================================
def main():
    pdf = PDF()
    slide1(pdf)
    slide2(pdf)
    slide3(pdf)
    slide4(pdf)
    slide5(pdf)
    slide6(pdf)
    slide7(pdf)
    slide8(pdf)
    slide9(pdf)
    out = "/projects/sandbox/cyldist-lpg-platform/CylDist_Platform_Presentation.pdf"
    pdf.save(out)


if __name__ == "__main__":
    main()
