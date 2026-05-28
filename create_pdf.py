#!/usr/bin/env python3
"""
Generate a professional 9-slide PDF presentation for
Cylinder Distribution Platform Backend API.
Uses raw PDF generation (no external libraries needed).
"""

import struct
import zlib
import os

# Page dimensions (A4 landscape in points: 842 x 595)
PAGE_W = 842
PAGE_H = 595

# Colors (RGB 0-1)
BLUE_DARK = (0.106, 0.165, 0.290)
BLUE_MED = (0.180, 0.290, 0.478)
BLUE_LIGHT = (0.290, 0.565, 0.851)
ORANGE = (0.910, 0.475, 0.169)
ORANGE_LIGHT = (0.961, 0.651, 0.137)
WHITE = (1, 1, 1)
GRAY_LIGHT = (0.941, 0.957, 0.973)
GRAY_TEXT = (0.290, 0.333, 0.408)
BLACK = (0.102, 0.102, 0.180)
GREEN = (0.153, 0.369, 0.129)
RED = (0.698, 0.110, 0.110)



class PDFWriter:
    """Minimal PDF writer for presentation slides."""
    
    def __init__(self):
        self.objects = []  # list of object bytes
        self.pages = []
        self.current_page_streams = []
        self.fonts = {}
        self._setup_fonts()
    
    def _setup_fonts(self):
        """Register standard PDF fonts."""
        self.fonts = {
            'regular': 'Helvetica',
            'bold': 'Helvetica-Bold',
            'italic': 'Helvetica-Oblique',
        }
    
    def _escape_text(self, text):
        """Escape special PDF characters."""
        text = text.replace('\\', '\\\\')
        text = text.replace('(', '\\(')
        text = text.replace(')', '\\)')
        return text
    
    def new_page(self):
        """Start a new page."""
        if self.current_page_streams:
            self.pages.append(self.current_page_streams)
        self.current_page_streams = []
    
    def _color_cmd(self, color, stroke=False):
        """Get PDF color command."""
        r, g, b = color
        op = 'RG' if stroke else 'rg'
        return f"{r:.3f} {g:.3f} {b:.3f} {op}"



    def rect(self, x, y, w, h, fill_color=None, stroke_color=None, radius=0):
        """Draw a rectangle (y from top)."""
        py = PAGE_H - y - h  # Convert to PDF coords (bottom-up)
        cmds = []
        if fill_color:
            cmds.append(self._color_cmd(fill_color))
        if stroke_color:
            cmds.append(self._color_cmd(stroke_color, stroke=True))
        if radius > 0:
            # Rounded rectangle using curves
            r = min(radius, w/2, h/2)
            k = 0.5523 * r  # bezier approximation
            cmds.append(f"{x+r:.1f} {py:.1f} m")
            cmds.append(f"{x+w-r:.1f} {py:.1f} l")
            cmds.append(f"{x+w-r+k:.1f} {py:.1f} {x+w:.1f} {py+r-k:.1f} {x+w:.1f} {py+r:.1f} c")
            cmds.append(f"{x+w:.1f} {py+h-r:.1f} l")
            cmds.append(f"{x+w:.1f} {py+h-r+k:.1f} {x+w-r+k:.1f} {py+h:.1f} {x+w-r:.1f} {py+h:.1f} c")
            cmds.append(f"{x+r:.1f} {py+h:.1f} l")
            cmds.append(f"{x+r-k:.1f} {py+h:.1f} {x:.1f} {py+h-r+k:.1f} {x:.1f} {py+h-r:.1f} c")
            cmds.append(f"{x:.1f} {py+r:.1f} l")
            cmds.append(f"{x:.1f} {py+r-k:.1f} {x+r-k:.1f} {py:.1f} {x+r:.1f} {py:.1f} c")
            op = 'B' if fill_color and stroke_color else ('f' if fill_color else 'S')
            cmds.append(op)
        else:
            op = 'B' if fill_color and stroke_color else ('f' if fill_color else 'S')
            cmds.append(f"{x:.1f} {py:.1f} {w:.1f} {h:.1f} re {op}")
        self.current_page_streams.append('\n'.join(cmds))



    def circle(self, cx, cy, r, fill_color=None):
        """Draw a circle."""
        py = PAGE_H - cy  # center y in PDF coords
        k = 0.5523 * r
        cmds = []
        if fill_color:
            cmds.append(self._color_cmd(fill_color))
        cmds.append(f"{cx+r:.1f} {py:.1f} m")
        cmds.append(f"{cx+r:.1f} {py+k:.1f} {cx+k:.1f} {py+r:.1f} {cx:.1f} {py+r:.1f} c")
        cmds.append(f"{cx-k:.1f} {py+r:.1f} {cx-r:.1f} {py+k:.1f} {cx-r:.1f} {py:.1f} c")
        cmds.append(f"{cx-r:.1f} {py-k:.1f} {cx-k:.1f} {py-r:.1f} {cx:.1f} {py-r:.1f} c")
        cmds.append(f"{cx+k:.1f} {py-r:.1f} {cx+r:.1f} {py-k:.1f} {cx+r:.1f} {py:.1f} c")
        cmds.append("f")
        self.current_page_streams.append('\n'.join(cmds))
    
    def text(self, x, y, content, size=12, color=BLACK, font='regular', align='left', max_width=None):
        """Draw text (y from top)."""
        py = PAGE_H - y  # Convert to PDF coords
        font_name = self.fonts.get(font, 'Helvetica')
        # Map to PDF font reference
        font_ref = '/F1' if font == 'regular' else ('/F2' if font == 'bold' else '/F3')
        escaped = self._escape_text(content)
        # Approximate text width for alignment
        if align != 'left' and max_width:
            char_width = size * 0.5  # approximate
            text_width = len(content) * char_width
            if align == 'center':
                x = x + (max_width - text_width) / 2
            elif align == 'right':
                x = x + max_width - text_width
        cmds = [
            'BT',
            f"{font_ref} {size} Tf",
            self._color_cmd(color),
            f"{x:.1f} {py:.1f} Td",
            f"({escaped}) Tj",
            'ET'
        ]
        self.current_page_streams.append('\n'.join(cmds))



    def line(self, x1, y1, x2, y2, color=BLACK, width=1):
        """Draw a line."""
        py1 = PAGE_H - y1
        py2 = PAGE_H - y2
        cmds = [
            f"{width:.1f} w",
            self._color_cmd(color, stroke=True),
            f"{x1:.1f} {py1:.1f} m",
            f"{x2:.1f} {py2:.1f} l",
            "S"
        ]
        self.current_page_streams.append('\n'.join(cmds))
    
    def arrow(self, x1, y1, x2, y2, color=ORANGE, width=2):
        """Draw a line with arrow head."""
        self.line(x1, y1, x2, y2, color, width)
        # Simple triangle arrowhead
        import math
        angle = math.atan2(-(y2-y1), x2-x1)  # negative because PDF y is inverted
        head_len = 8
        py2 = PAGE_H - y2
        lx = x2 - head_len * math.cos(angle - 0.4)
        ly = py2 + head_len * math.sin(angle - 0.4)
        rx = x2 - head_len * math.cos(angle + 0.4)
        ry = py2 + head_len * math.sin(angle + 0.4)
        cmds = [
            self._color_cmd(color),
            f"{x2:.1f} {py2:.1f} m",
            f"{lx:.1f} {ly:.1f} l",
            f"{rx:.1f} {ry:.1f} l",
            "f"
        ]
        self.current_page_streams.append('\n'.join(cmds))



    def build(self, output_path):
        """Generate the final PDF file."""
        # Finalize last page
        if self.current_page_streams:
            self.pages.append(self.current_page_streams)
        
        # Build PDF structure
        objects = []  # (obj_number, content_bytes)
        obj_num = 1
        
        # Object 1: Catalog
        catalog_num = obj_num
        objects.append((obj_num, b"<< /Type /Catalog /Pages 2 0 R >>"))
        obj_num += 1
        
        # Object 2: Pages (placeholder - will update)
        pages_num = obj_num
        obj_num += 1
        
        # Font objects
        f1_num = obj_num
        objects.append((obj_num, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"))
        obj_num += 1
        f2_num = obj_num
        objects.append((obj_num, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"))
        obj_num += 1
        f3_num = obj_num
        objects.append((obj_num, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>"))
        obj_num += 1
        
        # Resources dict
        resources = f"<< /Font << /F1 {f1_num} 0 R /F2 {f2_num} 0 R /F3 {f3_num} 0 R >> >>"
        
        # Page objects and content streams
        page_obj_nums = []
        for page_streams in self.pages:
            # Content stream
            content = '\n'.join(page_streams)
            content_bytes = content.encode('latin-1', errors='replace')
            stream_num = obj_num
            stream_obj = f"<< /Length {len(content_bytes)} >>\nstream\n".encode() + content_bytes + b"\nendstream"
            objects.append((obj_num, stream_obj))
            obj_num += 1
            
            # Page object
            page_num = obj_num
            page_obj = f"<< /Type /Page /Parent {pages_num} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] /Contents {stream_num} 0 R /Resources {resources} >>".encode()
            objects.append((obj_num, page_obj))
            page_obj_nums.append(obj_num)
            obj_num += 1
        
        # Now build Pages object
        kids = ' '.join(f"{n} 0 R" for n in page_obj_nums)
        pages_obj = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_obj_nums)} >>".encode()
        objects.insert(1, (pages_num, pages_obj))  # Insert at position 1 (after catalog)
        
        # Write PDF file
        with open(output_path, 'wb') as f:
            f.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
            
            offsets = {}
            for obj_n, content in objects:
                offsets[obj_n] = f.tell()
                f.write(f"{obj_n} 0 obj\n".encode())
                f.write(content)
                f.write(b"\nendobj\n\n")
            
            # Cross-reference table
            xref_offset = f.tell()
            f.write(b"xref\n")
            max_obj = max(offsets.keys())
            f.write(f"0 {max_obj + 1}\n".encode())
            f.write(b"0000000000 65535 f \n")
            for i in range(1, max_obj + 1):
                offset = offsets.get(i, 0)
                f.write(f"{offset:010d} 00000 n \n".encode())
            
            # Trailer
            f.write(b"trailer\n")
            f.write(f"<< /Size {max_obj + 1} /Root {catalog_num} 0 R >>\n".encode())
            f.write(b"startxref\n")
            f.write(f"{xref_offset}\n".encode())
            f.write(b"%%EOF\n")
        
        print(f"PDF created: {output_path}")
        print(f"Pages: {len(self.pages)}")
        print(f"Size: {os.path.getsize(output_path) / 1024:.1f} KB")




def create_slide1(pdf):
    """Title Slide"""
    pdf.new_page()
    # Dark background
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill_color=BLUE_DARK)
    # Top orange accent bar
    pdf.rect(0, 0, PAGE_W, 6, fill_color=ORANGE)
    # Decorative circles
    pdf.circle(720, 80, 100, fill_color=BLUE_MED)
    pdf.circle(60, 480, 80, fill_color=BLUE_MED)
    # Orange vertical accent
    pdf.rect(50, 180, 5, 120, fill_color=ORANGE)
    # Title
    pdf.text(70, 200, "Cylinder Distribution Platform", size=32, color=WHITE, font='bold')
    pdf.text(70, 240, "Backend API", size=26, color=ORANGE_LIGHT, font='bold')
    # Subtitle
    pdf.text(70, 280, "Production-Grade LPG Delivery Service Platform", size=14, color=(0.722, 0.773, 0.851))
    # Team info
    pdf.text(70, 330, "Team CylDist", size=16, color=ORANGE_LIGHT, font='bold')
    pdf.text(70, 355, "Team Members:", size=12, color=WHITE, font='bold')
    pdf.text(85, 375, "* Member 1 - Full Stack Developer", size=11, color=(0.722, 0.773, 0.851))
    pdf.text(85, 393, "* Member 2 - Backend Engineer", size=11, color=(0.722, 0.773, 0.851))
    pdf.text(85, 411, "* Member 3 - DevOps & Database", size=11, color=(0.722, 0.773, 0.851))
    pdf.text(85, 429, "* Member 4 - Frontend & Testing", size=11, color=(0.722, 0.773, 0.851))
    pdf.text(70, 460, "Department of Computer Engineering", size=11, color=(0.533, 0.600, 0.702))
    pdf.text(70, 478, "[Your College Name], 2025", size=11, color=(0.533, 0.600, 0.702))
    # Bottom orange bar
    pdf.rect(0, PAGE_H - 6, PAGE_W, 6, fill_color=ORANGE)




def slide_header(pdf, title, subtitle=""):
    """Standard slide header."""
    # Top gradient bar
    pdf.rect(0, 0, PAGE_W, 45, fill_color=BLUE_DARK)
    # Orange accent line
    pdf.rect(0, 45, PAGE_W, 3, fill_color=ORANGE)
    # Title
    pdf.text(40, 70, title, size=22, color=BLUE_DARK, font='bold')
    if subtitle:
        pdf.text(40, 92, subtitle, size=11, color=GRAY_TEXT)

def create_slide2(pdf):
    """Introduction & Objectives"""
    pdf.new_page()
    slide_header(pdf, "Introduction & Objectives", "Overview of the LPG Cylinder Distribution Platform")
    # Left card - Overview
    pdf.rect(30, 115, 380, 240, fill_color=BLUE_MED, radius=10)
    pdf.text(50, 140, "Platform Overview", size=14, color=WHITE, font='bold')
    pdf.text(50, 165, "* Digital LPG cylinder booking &", size=11, color=WHITE)
    pdf.text(50, 182, "  delivery management system", size=11, color=WHITE)
    pdf.text(50, 205, "* Multi-role platform:", size=11, color=WHITE)
    pdf.text(50, 222, "  Admin, Customer, Delivery Agent", size=11, color=WHITE)
    pdf.text(50, 245, "* Real-time GPS tracking & live chat", size=11, color=WHITE)
    pdf.text(50, 265, "* End-to-end order lifecycle management", size=11, color=WHITE)
    pdf.text(50, 288, "* WhatsApp-based booking support", size=11, color=WHITE)
    pdf.text(50, 308, "* Emergency crisis prioritization", size=11, color=WHITE)
    # Right card - Objectives
    pdf.rect(430, 115, 380, 240, fill_color=BLUE_DARK, radius=10)
    pdf.text(450, 140, "Key Objectives", size=14, color=ORANGE_LIGHT, font='bold')
    pdf.text(450, 165, "* Digitize traditional LPG distribution", size=11, color=WHITE)
    pdf.text(450, 185, "* Provide real-time GPS delivery tracking", size=11, color=WHITE)
    pdf.text(450, 205, "* Enable emergency-aware allocation", size=11, color=WHITE)
    pdf.text(450, 225, "* Build secure & scalable architecture", size=11, color=WHITE)
    pdf.text(450, 245, "* Production-ready Docker/K8s deploy", size=11, color=WHITE)
    pdf.text(450, 265, "* Implement role-based access control", size=11, color=WHITE)
    pdf.text(450, 285, "* Create comprehensive API documentation", size=11, color=WHITE)
    pdf.text(450, 308, "* Enable real-time communication", size=11, color=WHITE)
    # Bottom highlights
    pdf.rect(30, 370, 780, 90, fill_color=GRAY_LIGHT, radius=8)
    pdf.text(50, 390, "Key Highlights", size=13, color=BLUE_DARK, font='bold')
    pdf.text(50, 412, "Node.js + Express.js  |  MongoDB + Redis  |  Socket.IO Real-Time  |  Docker & Kubernetes", size=11, color=GRAY_TEXT)
    pdf.text(50, 432, "JWT Auth + RBAC  |  Swagger API Docs  |  WhatsApp Integration  |  Crisis Engine", size=11, color=GRAY_TEXT)




def create_slide3(pdf):
    """Problem Statement & Proposed Solution"""
    pdf.new_page()
    slide_header(pdf, "Problem Statement & Proposed Solution")
    # Problem header
    pdf.rect(30, 110, 370, 30, fill_color=RED, radius=5)
    pdf.text(80, 130, "Problems in Traditional System", size=12, color=WHITE, font='bold')
    # Problem items
    pdf.rect(30, 145, 370, 230, fill_color=(1, 0.95, 0.95), radius=5)
    problems = [
        "X  Manual booking via phone/visits",
        "X  No real-time delivery tracking",
        "X  Inventory management is opaque",
        "X  No priority during emergencies",
        "X  Paper-based record keeping",
        "X  No communication channel",
        "X  No analytics or reporting",
        "X  Inefficient route planning",
    ]
    for i, p in enumerate(problems):
        pdf.text(50, 168 + i * 26, p, size=11, color=(0.5, 0.1, 0.1))
    # Arrow
    pdf.arrow(405, 250, 430, 250, color=ORANGE, width=3)
    # Solution header
    pdf.rect(440, 110, 370, 30, fill_color=GREEN, radius=5)
    pdf.text(500, 130, "Our Digital Solution", size=12, color=WHITE, font='bold')
    # Solution items
    pdf.rect(440, 145, 370, 230, fill_color=(0.93, 1, 0.93), radius=5)
    solutions = [
        "+  Online booking + WhatsApp API",
        "+  Live GPS delivery tracking",
        "+  Automated inventory system",
        "+  Crisis prioritization engine",
        "+  Digital order management",
        "+  Real-time agent-customer chat",
        "+  Dashboard analytics & reports",
        "+  Smart warehouse allocation",
    ]
    for i, s in enumerate(solutions):
        pdf.text(460, 168 + i * 26, s, size=11, color=(0.1, 0.4, 0.1))
    # Impact bar
    pdf.rect(30, 390, 780, 45, fill_color=BLUE_DARK, radius=8)
    pdf.text(60, 416, "Impact: 100% digital workflow | Real-time visibility | Emergency-aware | Scalable microservices", size=11, color=WHITE)




def create_slide4(pdf):
    """System Architecture & Workflow"""
    pdf.new_page()
    slide_header(pdf, "System Architecture & Workflow", "User -> Backend API -> Database")
    # User roles (circles at top)
    pdf.circle(120, 165, 35, fill_color=BLUE_LIGHT)
    pdf.text(95, 162, "Customer", size=9, color=WHITE, font='bold')
    pdf.circle(250, 165, 35, fill_color=ORANGE)
    pdf.text(233, 162, "Admin", size=9, color=WHITE, font='bold')
    pdf.circle(380, 165, 35, fill_color=(0.153, 0.682, 0.376))
    pdf.text(363, 162, "Agent", size=9, color=WHITE, font='bold')
    # Arrows down
    pdf.arrow(120, 200, 250, 240, color=ORANGE, width=2)
    pdf.arrow(250, 200, 250, 240, color=ORANGE, width=2)
    pdf.arrow(380, 200, 250, 240, color=ORANGE, width=2)
    # API Box
    pdf.rect(80, 245, 400, 60, fill_color=BLUE_DARK, radius=10)
    pdf.text(120, 268, "Express.js Backend API (Node.js)", size=13, color=WHITE, font='bold')
    pdf.text(110, 290, "REST API | Socket.IO | JWT Auth | RBAC | Zod", size=10, color=(0.722, 0.773, 0.851))
    # Arrows to databases
    pdf.arrow(200, 310, 150, 350, color=ORANGE, width=2)
    pdf.arrow(350, 310, 400, 350, color=ORANGE, width=2)
    # MongoDB
    pdf.rect(70, 355, 180, 50, fill_color=(0.180, 0.490, 0.196), radius=8)
    pdf.text(100, 374, "MongoDB", size=12, color=WHITE, font='bold')
    pdf.text(95, 393, "Primary Database", size=9, color=(0.784, 0.902, 0.784))
    # Redis
    pdf.rect(300, 355, 180, 50, fill_color=(0.776, 0.157, 0.157), radius=8)
    pdf.text(350, 374, "Redis", size=12, color=WHITE, font='bold')
    pdf.text(325, 393, "Cache + Real-Time", size=9, color=(1, 0.804, 0.824))
    # Right side: Workflow
    pdf.rect(530, 120, 280, 320, fill_color=GRAY_LIGHT, radius=10)
    pdf.text(580, 145, "Order Lifecycle Flow", size=13, color=BLUE_DARK, font='bold')
    steps = [
        "1. Customer places order",
        "2. Admin assigns agent",
        "3. Agent picks up cylinder",
        "4. GPS tracking begins",
        "5. Live chat enabled",
        "6. Delivery + OTP verify",
        "7. Order completed!",
    ]
    for i, step in enumerate(steps):
        y = 175 + i * 35
        color = GREEN if i == 6 else GRAY_TEXT
        pdf.text(560, y, step, size=11, color=color, font='bold' if i == 6 else 'regular')
        if i < 6:
            pdf.text(610, y + 17, "|", size=11, color=ORANGE)




def create_slide5(pdf):
    """Technologies Used"""
    pdf.new_page()
    slide_header(pdf, "Technologies Used", "Modern Tech Stack for Production-Grade Platform")
    # Tech cards - Row 1
    techs_row1 = [
        ("Node.js", "Runtime Engine", (0.298, 0.686, 0.314)),
        ("Express.js", "Web Framework", BLUE_LIGHT),
        ("MongoDB", "NoSQL Database", (0.220, 0.557, 0.235)),
        ("Redis", "Cache & RT Store", (0.827, 0.184, 0.184)),
    ]
    for i, (name, desc, color) in enumerate(techs_row1):
        x = 40 + i * 200
        pdf.rect(x, 120, 185, 90, fill_color=color, radius=10)
        pdf.text(x + 30, 155, name, size=14, color=WHITE, font='bold')
        pdf.text(x + 30, 178, desc, size=10, color=(0.9, 0.9, 0.9))
    # Tech cards - Row 2
    techs_row2 = [
        ("Socket.IO", "WebSocket Layer", (0.129, 0.129, 0.129)),
        ("Docker", "Containerization", (0.098, 0.463, 0.824)),
        ("Kubernetes", "Orchestration", (0.196, 0.424, 0.898)),
    ]
    for i, (name, desc, color) in enumerate(techs_row2):
        x = 140 + i * 200
        pdf.rect(x, 225, 185, 90, fill_color=color, radius=10)
        pdf.text(x + 30, 260, name, size=14, color=WHITE, font='bold')
        pdf.text(x + 30, 283, desc, size=10, color=(0.9, 0.9, 0.9))
    # Supporting tools section
    pdf.rect(30, 340, 780, 100, fill_color=GRAY_LIGHT, radius=8)
    pdf.text(50, 365, "Supporting Technologies & Libraries", size=13, color=BLUE_DARK, font='bold')
    pdf.text(50, 390, "JWT | bcrypt | Zod | Winston | Swagger | Helmet | CORS | Razorpay | Twilio | SendGrid", size=11, color=GRAY_TEXT)
    pdf.text(50, 412, "AWS S3 | Jest | Supertest | Nodemon | Docker Compose | HPA | Multer | Morgan", size=11, color=GRAY_TEXT)




def create_slide6(pdf):
    """Unique Features Implemented"""
    pdf.new_page()
    slide_header(pdf, "Unique Features Implemented", "10 Key Feature Highlights")
    # Feature cards in 2 columns
    features_left = [
        "WhatsApp Booking - Book via API",
        "Product Store - Buy accessories",
        "GPS Tracking - Real-time location",
        "Live Chat - Agent messaging",
        "Crisis Engine - Emergency priority",
    ]
    features_right = [
        "Inventory Mgmt - Warehouse tracking",
        "JWT + RBAC - Role-based security",
        "Notifications - SMS/Email/Push",
        "Swagger Docs - Interactive API",
        "Docker + K8s - Container deploy",
    ]
    for i, feat in enumerate(features_left):
        y = 120 + i * 52
        pdf.rect(30, y, 380, 44, fill_color=BLUE_DARK, radius=6)
        pdf.text(50, y + 27, feat, size=11, color=WHITE)
    for i, feat in enumerate(features_right):
        y = 120 + i * 52
        pdf.rect(430, y, 380, 44, fill_color=BLUE_MED, radius=6)
        pdf.text(450, y + 27, feat, size=11, color=WHITE)
    # Bottom accent
    pdf.rect(30, 395, 780, 40, fill_color=ORANGE, radius=8)
    pdf.text(100, 418, "All features are production-ready with comprehensive error handling & logging", size=11, color=WHITE, font='bold')




def create_slide7(pdf):
    """Database Design & ER Diagram"""
    pdf.new_page()
    slide_header(pdf, "Database Design & ER Diagram", "MongoDB Collections & Relationships")
    # Entity boxes
    entities = [
        ("User", 50, 120, BLUE_DARK, ["_id, name, email, role", "phone, addresses, location", "isOnDuty, walletBalance", "kycStatus, facilityType"]),
        ("Order", 300, 120, ORANGE, ["orderId, customerId", "agentId, warehouseId", "status, cylinderCount", "timeline, priority, OTP"]),
        ("Inventory", 560, 120, (0.180, 0.490, 0.196), ["warehouseId, name", "totalCylinders", "availableCylinders", "location, isActive"]),
        ("ChatMessage", 50, 310, (0.416, 0.106, 0.604), ["messageId, chatRoomId", "senderId, senderRole", "content, type, status", "mediaUrl, readAt"]),
        ("Delivery", 300, 310, (0.776, 0.157, 0.157), ["orderId, agentId", "lat, lng, timestamp", "route data, ETA", "GPS tracking"]),
    ]
    for name, x, y, color, fields in entities:
        # Header
        pdf.rect(x, y, 210, 28, fill_color=color, radius=5)
        pdf.text(x + 50, y + 19, name, size=11, color=WHITE, font='bold')
        # Body
        pdf.rect(x, y + 28, 210, 90, fill_color=GRAY_LIGHT)
        for i, field in enumerate(fields):
            pdf.text(x + 10, y + 48 + i * 20, field, size=9, color=GRAY_TEXT)
    # Relationships section
    pdf.rect(560, 310, 250, 130, fill_color=GRAY_LIGHT, radius=8)
    pdf.text(575, 333, "Relationships", size=12, color=BLUE_DARK, font='bold')
    rels = [
        "User (1) -> (*) Orders",
        "User (1) -> (*) Orders [agent]",
        "Order (1) -> (*) ChatMessages",
        "Inventory (1) -> (*) Orders",
        "Order (1) -> (1) Delivery",
    ]
    for i, rel in enumerate(rels):
        pdf.text(575, 358 + i * 18, rel, size=9, color=GRAY_TEXT)
    # Connection lines between entities
    pdf.line(260, 175, 300, 175, color=ORANGE, width=1.5)
    pdf.line(510, 175, 560, 175, color=ORANGE, width=1.5)
    pdf.line(155, 238, 155, 310, color=ORANGE, width=1.5)
    pdf.line(405, 238, 405, 310, color=ORANGE, width=1.5)




def create_slide8(pdf):
    """Screenshots / Demo & Security"""
    pdf.new_page()
    slide_header(pdf, "Demo & Security Features", "API Documentation, Tracking & Security Measures")
    # Left: Demo section
    pdf.rect(30, 110, 390, 230, fill_color=GRAY_LIGHT, radius=10)
    pdf.text(50, 135, "Live Demo Highlights", size=13, color=BLUE_DARK, font='bold')
    pdf.text(50, 160, "Admin Dashboard", size=11, color=GRAY_TEXT, font='bold')
    pdf.text(65, 178, "* Order management & analytics", size=10, color=GRAY_TEXT)
    pdf.text(65, 195, "* Agent assignment & monitoring", size=10, color=GRAY_TEXT)
    pdf.text(50, 218, "Swagger API Documentation", size=11, color=GRAY_TEXT, font='bold')
    pdf.text(65, 236, "* /api/v1/docs - Interactive testing", size=10, color=GRAY_TEXT)
    pdf.text(65, 253, "* All 30+ endpoints documented", size=10, color=GRAY_TEXT)
    pdf.text(50, 276, "Real-Time Delivery Tracking", size=11, color=GRAY_TEXT, font='bold')
    pdf.text(65, 294, "* GPS updates every 5 seconds", size=10, color=GRAY_TEXT)
    pdf.text(65, 311, "* Socket.IO room-per-order", size=10, color=GRAY_TEXT)
    # Right: Security section
    pdf.rect(440, 110, 370, 230, fill_color=BLUE_DARK, radius=10)
    pdf.text(460, 135, "Security Architecture", size=13, color=ORANGE_LIGHT, font='bold')
    pdf.text(460, 162, "JWT Authentication", size=11, color=WHITE, font='bold')
    pdf.text(475, 180, "Access (15min) + Refresh (7d)", size=10, color=(0.722, 0.773, 0.851))
    pdf.text(460, 203, "Rate Limiting", size=11, color=WHITE, font='bold')
    pdf.text(475, 221, "100 req/15min, 10/15min auth", size=10, color=(0.722, 0.773, 0.851))
    pdf.text(460, 244, "Password Encryption", size=11, color=WHITE, font='bold')
    pdf.text(475, 262, "bcrypt 12 rounds hashing", size=10, color=(0.722, 0.773, 0.851))
    pdf.text(460, 285, "Role-Based Access (RBAC)", size=11, color=WHITE, font='bold')
    pdf.text(475, 303, "Admin | Customer | Agent", size=10, color=(0.722, 0.773, 0.851))
    # Bottom security bar
    pdf.rect(30, 355, 780, 80, fill_color=(0.102, 0.102, 0.180), radius=8)
    pdf.text(50, 378, "Additional Security Measures", size=12, color=ORANGE_LIGHT, font='bold')
    pdf.text(50, 400, "Helmet (CSP) | CORS Allowlist | HPP Protection | Mongo Sanitize | XSS Clean | 10kb Payload Limit", size=10, color=(0.722, 0.773, 0.851))
    pdf.text(50, 418, "Refresh Token Rotation | Reuse Detection | NoSQL Injection Prevention | Winston Logging | ELK-Ready", size=10, color=(0.722, 0.773, 0.851))




def create_slide9(pdf):
    """Conclusion & Future Scope"""
    pdf.new_page()
    # Dark background
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill_color=BLUE_DARK)
    pdf.rect(0, 0, PAGE_W, 5, fill_color=ORANGE)
    # Title
    pdf.text(250, 38, "Conclusion & Future Scope", size=22, color=WHITE, font='bold')
    # Left: Achievements
    pdf.rect(30, 60, 380, 280, fill_color=BLUE_MED, radius=10)
    pdf.text(60, 85, "Project Achievements", size=14, color=ORANGE_LIGHT, font='bold')
    achievements = [
        "+ Production-grade REST API",
        "+ Real-time GPS + Live Chat",
        "+ Crisis Prioritization Engine",
        "+ Complete Order Lifecycle",
        "+ Docker & K8s Deployment",
        "+ Comprehensive Security",
        "+ WhatsApp Integration",
        "+ Swagger API Documentation",
        "+ Multi-role RBAC System",
        "+ Inventory Management",
    ]
    for i, a in enumerate(achievements):
        pdf.text(60, 112 + i * 22, a, size=10, color=WHITE)
    # Right: Future Scope
    pdf.rect(430, 60, 380, 280, fill_color=BLUE_MED, radius=10)
    pdf.text(460, 85, "Future Enhancements", size=14, color=ORANGE_LIGHT, font='bold')
    futures = [
        ("AI Demand Prediction", "ML-based consumption forecast"),
        ("Mobile App Integration", "React Native / Flutter app"),
        ("Online Payment Gateway", "Razorpay/Stripe integration"),
        ("Smart Route Optimization", "Google Maps route planning"),
        ("IoT Cylinder Monitoring", "Smart sensors for gas level"),
    ]
    for i, (title, desc) in enumerate(futures):
        y = 112 + i * 48
        pdf.text(460, y, title, size=11, color=WHITE, font='bold')
        pdf.text(475, y + 18, desc, size=9, color=(0.533, 0.600, 0.702))
    # Thank You box
    pdf.rect(220, 370, 400, 80, fill_color=ORANGE, radius=12)
    pdf.text(330, 400, "Thank You!", size=24, color=WHITE, font='bold')
    pdf.text(290, 428, "Questions & Feedback Welcome", size=12, color=(1, 0.953, 0.878))
    # Team credit
    pdf.text(200, 480, "Team CylDist  |  Department of Computer Engineering  |  2025", size=10, color=(0.420, 0.482, 0.561))
    # Bottom bar
    pdf.rect(0, PAGE_H - 5, PAGE_W, 5, fill_color=ORANGE)




def main():
    pdf = PDFWriter()
    create_slide1(pdf)
    create_slide2(pdf)
    create_slide3(pdf)
    create_slide4(pdf)
    create_slide5(pdf)
    create_slide6(pdf)
    create_slide7(pdf)
    create_slide8(pdf)
    create_slide9(pdf)
    output = "/projects/sandbox/cyldist-lpg-platform/CylDist_Platform_Presentation.pdf"
    pdf.build(output)

if __name__ == "__main__":
    main()
