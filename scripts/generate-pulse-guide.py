#!/usr/bin/env python3
"""Generate the Pulse Bar guide PDF for Tayrona AI users."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os

# ── Colors ────────────────────────────────────────────
DARK_BG = HexColor("#1a1a1f")
DARK_BG2 = HexColor("#222228")
DARK_BG3 = HexColor("#2a2a32")
CARD_BG = HexColor("#2c2c35")
GOLD = HexColor("#e7ca79")
GOLD_DIM = HexColor("#b8a060")
TEXT_PRIMARY = HexColor("#e8e8ed")
TEXT_SECONDARY = HexColor("#a0a0a8")
TEXT_MUTED = HexColor("#707078")
BORDER = HexColor("#3a3a44")

# Pulse colors
WARMING = HexColor("#85B7EB")
LOCKING = HexColor("#5DCAA5")
ZONE = HexColor("#EF9F27")
DEEP = HexColor("#D4537E")
EMERALD = HexColor("#34d399")
RED = HexColor("#ef4444")

W, H = letter


def safe_hex(hex_str):
    """Handle 8-char hex (with alpha) that HexColor doesn't support."""
    if len(hex_str) == 9 and hex_str.startswith("#"):
        rgb = hex_str[1:7]
        alpha = int(hex_str[7:9], 16) / 255
        c = HexColor("#" + rgb)
        return Color(c.red, c.green, c.blue, alpha)
    return HexColor(hex_str)

OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "pulse-guide.pdf")


def draw_rounded_rect(c, x, y, w, h, r, fill=None, stroke=None, stroke_width=0.5):
    """Draw a rounded rectangle."""
    p = c.beginPath()
    p.roundRect(x, y, w, h, r)
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(stroke_width)
    if fill and stroke:
        c.drawPath(p, fill=1, stroke=1)
    elif fill:
        c.drawPath(p, fill=1, stroke=0)
    elif stroke:
        c.drawPath(p, fill=0, stroke=1)


def draw_page_bg(c):
    """Dark background for each page."""
    c.setFillColor(DARK_BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)


def draw_footer(c, page_num):
    """Page footer."""
    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_MUTED)
    c.drawString(50, 30, "Tayrona AI — Pulse Bar Guide")
    c.drawRightString(W - 50, 30, f"{page_num}")
    # Gold line
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.3)
    c.line(50, 42, W - 50, 42)


# ═══════════════════════════════════════════════════════
# PAGE 1: COVER
# ═══════════════════════════════════════════════════════
def page_cover(c):
    draw_page_bg(c)

    # Subtle gradient overlay (simulated with rectangles)
    for i in range(20):
        alpha = 0.015 * (20 - i)
        c.setFillColor(Color(231/255, 202/255, 121/255, alpha))
        c.rect(0, H - (i * 40), W, 40, fill=1, stroke=0)

    # Top decorative bar
    c.setFillColor(GOLD)
    c.rect(0, H - 6, W, 6, fill=1, stroke=0)

    # Triskelion / logo area (abstract golden circle)
    cx, cy = W / 2, H - 220
    # Outer glow
    for r in range(60, 0, -2):
        alpha = 0.02 * (1 - r / 60)
        c.setFillColor(Color(231/255, 202/255, 121/255, alpha))
        c.circle(cx, cy, r, fill=1, stroke=0)
    # Gold circle
    c.setFillColor(GOLD)
    c.circle(cx, cy, 30, fill=1, stroke=0)
    # Inner dark
    c.setFillColor(DARK_BG)
    c.circle(cx, cy, 22, fill=1, stroke=0)
    # Gold inner ring
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.5)
    c.circle(cx, cy, 16, fill=0, stroke=1)
    # T letter
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(cx, cy - 7, "T")

    # Title
    y = H - 320
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(W / 2, y, "PULSE BAR")

    c.setFont("Helvetica", 14)
    c.setFillColor(TEXT_SECONDARY)
    c.drawCentredString(W / 2, y - 30, "Tu Indicador de Productividad en Tiempo Real")

    # Decorative line
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(W / 2 - 80, y - 55, W / 2 + 80, y - 55)

    # Visual pulse bar preview
    bar_y = y - 110
    bar_w = 360
    bar_x = (W - bar_w) / 2
    bar_h = 12

    # Background bar
    draw_rounded_rect(c, bar_x, bar_y, bar_w, bar_h, 6, fill=DARK_BG3)

    # Animated-like gradient fill (70%)
    # Draw segments
    segments = [
        (0, 0.19, WARMING),
        (0.19, 0.44, LOCKING),
        (0.44, 0.70, ZONE),
    ]
    for start, end, color in segments:
        sx = bar_x + bar_w * start
        ex = bar_x + bar_w * end
        c.setFillColor(color)
        if start == 0:
            p = c.beginPath()
            p.roundRect(sx, bar_y, ex - sx, bar_h, 6)
            c.drawPath(p, fill=1, stroke=0)
        else:
            c.rect(sx, bar_y, ex - sx, bar_h, fill=1, stroke=0)

    # Level labels below bar
    labels = [
        (0.09, "Warming up", WARMING),
        (0.32, "Locking in", LOCKING),
        (0.58, "In the zone", ZONE),
        (0.87, "Deep flow", DEEP),
    ]
    c.setFont("Helvetica", 8)
    for pos, label, color in labels:
        lx = bar_x + bar_w * pos
        c.setFillColor(color)
        c.drawCentredString(lx, bar_y - 16, label)

    # Branding
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 11)
    c.drawCentredString(W / 2, 120, "TAYRONA AI")
    c.setFont("Helvetica", 9)
    c.setFillColor(TEXT_MUTED)
    c.drawCentredString(W / 2, 100, "Organiza tu Dia, Disena tu Imperio")

    # Version
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#505058"))
    c.drawCentredString(W / 2, 60, "v1.0 — Marzo 2026")

    c.showPage()


# ═══════════════════════════════════════════════════════
# PAGE 2: WHAT IS THE PULSE BAR?
# ═══════════════════════════════════════════════════════
def page_what_is(c):
    draw_page_bg(c)
    draw_footer(c, 2)

    y = H - 60
    # Section title
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "01")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(75, y - 2, "Que es el Pulse Bar?")

    y -= 45
    # Explanation card
    draw_rounded_rect(c, 50, y - 90, W - 100, 90, 10, fill=CARD_BG, stroke=BORDER)
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica", 11)
    tx = 70
    c.drawString(tx, y - 25, "El Pulse Bar es una barra visual en la parte superior de Tayrona AI")
    c.drawString(tx, y - 42, "que mide tu estado de productividad en tiempo real.")
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 10)
    c.drawString(tx, y - 65, "Crece cuando trabajas. Decae cuando paras. Asi de simple.")

    y -= 130

    # How it looks - visual mockup
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(50, y, "ASI SE VE EN TU APP:")

    y -= 25
    # Mock TopBar
    draw_rounded_rect(c, 50, y - 55, W - 100, 55, 8, fill=DARK_BG2, stroke=BORDER)

    # Mini pulse bar at top of mock
    bar_x = 55
    bar_y_pos = y - 5
    bar_w = W - 110
    draw_rounded_rect(c, bar_x, bar_y_pos, bar_w, 4, 2, fill=DARK_BG3)
    # Fill to 62%
    fill_w = bar_w * 0.62
    draw_rounded_rect(c, bar_x, bar_y_pos, fill_w, 4, 2, fill=ZONE)

    # Mock stats inside bar
    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_MUTED)
    c.drawString(bar_x + 15, y - 28, "SESION")
    c.drawString(bar_x + 120, y - 28, "COMPLETADAS")
    c.drawString(bar_x + 260, y - 28, "STREAK")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(bar_x + 15, y - 42, "47m")
    c.drawString(bar_x + 120, y - 42, "5 de 8")
    c.drawString(bar_x + 260, y - 42, "3d")

    # Badge
    draw_rounded_rect(c, bar_x + 370, y - 46, 90, 22, 11, fill=safe_hex("#EF9F2718"), stroke=safe_hex("#EF9F2740"))
    c.setFillColor(ZONE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(bar_x + 415, y - 40, "In the zone")

    # Arrow pointing to pulse bar
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    ax = bar_x + fill_w + 20
    c.line(ax, bar_y_pos + 25, ax, bar_y_pos + 8)
    # arrowhead
    c.line(ax, bar_y_pos + 8, ax - 4, bar_y_pos + 14)
    c.line(ax, bar_y_pos + 8, ax + 4, bar_y_pos + 14)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(ax + 8, bar_y_pos + 18, "Pulse Bar")

    y -= 100

    # Key concept boxes
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "CONCEPTOS CLAVE:")
    y -= 20

    concepts = [
        ("Tiempo Real", "Se actualiza cada 30 segundos automaticamente", GOLD),
        ("Personal", "Solo mide TU actividad en TU sesion", WARMING),
        ("Sin Presion", "No es un puntaje — es un espejo de tu energia", LOCKING),
    ]
    box_w = (W - 120) / 3
    for i, (title, desc, color) in enumerate(concepts):
        bx = 50 + i * (box_w + 10)
        draw_rounded_rect(c, bx, y - 65, box_w, 65, 8, fill=CARD_BG, stroke=BORDER)
        # Color accent top
        c.setFillColor(color)
        c.rect(bx + 12, y - 5, 25, 3, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(bx + 12, y - 22, title)
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 8)
        # Word wrap description
        words = desc.split()
        line = ""
        ly = y - 38
        for word in words:
            test = line + " " + word if line else word
            if c.stringWidth(test, "Helvetica", 8) > box_w - 24:
                c.drawString(bx + 12, ly, line)
                line = word
                ly -= 12
            else:
                line = test
        if line:
            c.drawString(bx + 12, ly, line)

    y -= 110

    # The formula section
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "02")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(75, y - 2, "Los 4 Niveles")
    y -= 40

    levels = [
        ("Warming up", "0 — 19%", WARMING, "#85B7EB18",
         "Estas empezando tu sesion.", "Abre tareas, revisa tu dia, planifica.", 0.15),
        ("Locking in", "20 — 44%", LOCKING, "#5DCAA518",
         "Estas enfocandote.", "Completa tareas, activa el timer.", 0.38),
        ("In the zone", "45 — 74%", ZONE, "#EF9F2718",
         "Estas productivo!", "Manten el ritmo, no te distraigas.", 0.65),
        ("Deep flow", "75 — 100%", DEEP, "#D4537E18",
         "Estado maximo de productividad.", "Estas imparable. Aprovecha este momento.", 0.92),
    ]

    for name, pct_range, color, bg_hex, line1, line2, fill_pct in levels:
        draw_rounded_rect(c, 50, y - 62, W - 100, 62, 8, fill=safe_hex(bg_hex), stroke=BORDER)

        # Color bar on left
        c.setFillColor(color)
        c.rect(50, y - 62, 4, 62, fill=1, stroke=0)

        # Level name
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(70, y - 18, name)

        # Percentage range
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 9)
        c.drawString(70, y - 33, pct_range)

        # Description
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 9)
        c.drawString(230, y - 18, line1)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 8)
        c.drawString(230, y - 33, line2)

        # Mini bar visualization
        bar_x2 = 230
        bar_w2 = W - 100 - 230 + 50 - 20
        bar_y2 = y - 52
        draw_rounded_rect(c, bar_x2, bar_y2, bar_w2, 6, 3, fill=DARK_BG3)
        fill_w2 = bar_w2 * fill_pct
        if fill_w2 > 0:
            draw_rounded_rect(c, bar_x2, bar_y2, fill_w2, 6, 3, fill=color)

        y -= 72

    c.showPage()


# ═══════════════════════════════════════════════════════
# PAGE 3: WHAT MAKES PULSE GO UP / DOWN
# ═══════════════════════════════════════════════════════
def page_up_down(c):
    draw_page_bg(c)
    draw_footer(c, 3)

    y = H - 60
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "03")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(75, y - 2, "Que Sube tu Pulse?")

    y -= 50
    up_items = [
        ("Completar tareas", "+12 pts cada una", "Cada tarea completada es un boost fuerte a tu Pulse.", EMERALD, 52),
        ("Timer activo", "+10 pts", "Mientras el timer corre, tu Pulse sube y NO decae.", GOLD, 48),
        ("Interaccion con la app", "+3 a +8 pts", "Clicks, scroll, navegar entre paginas — todo cuenta.", WARMING, 48),
        ("Sesion continua larga", "+bonus", "Despues de 30 min sin pausa, recibes bonus de profundidad.", ZONE, 48),
        ("Pestana visible", "+2 pts", "Mantener la app abierta y visible da un pequeno boost.", LOCKING, 48),
    ]

    for title, pts, desc, color, h in up_items:
        draw_rounded_rect(c, 50, y - h, W - 100, h, 8, fill=CARD_BG, stroke=BORDER)

        # Up arrow
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(65, y - 24, "+")

        # Title and points
        c.setFillColor(TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(90, y - 18, title)

        # Points badge
        tw = c.stringWidth(title, "Helvetica-Bold", 11)
        draw_rounded_rect(c, 95 + tw, y - 22, c.stringWidth(pts, "Helvetica", 8) + 12, 16, 8, fill=safe_hex("#ffffff08"), stroke=BORDER)
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(101 + tw, y - 17, pts)

        # Description
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 9)
        c.drawString(90, y - 36, desc)

        y -= (h + 6)

    y -= 15

    # DOWN section
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "04")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(75, y - 2, "Que Baja tu Pulse?")

    y -= 45

    down_items = [
        ("Sin actividad 5+ min", "Empieza el decay", "Tu Pulse baja gradualmente si dejas de interactuar.", RED, False),
        ("Timer corriendo?", "NO hay decay!", "Si el timer esta activo, tu Pulse se mantiene aunque", EMERALD, True),
        ("Cambias de pestana", "Decay mas rapido", "Sin timer + pestana oculta = el sistema asume que te fuiste.", HexColor("#f97316"), False),
        ("Pestana abierta, sin clicks", "Decay lento", "Quizas estas pensando o leyendo. El decay es suave.", WARMING, False),
    ]

    for title, subtitle, desc, color, is_highlight in down_items:
        h = 52 if not is_highlight else 56
        bg = safe_hex("#34d39910") if is_highlight else CARD_BG
        border = safe_hex("#34d39930") if is_highlight else BORDER
        draw_rounded_rect(c, 50, y - h, W - 100, h, 8, fill=bg, stroke=border)

        # Icon
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 14)
        if is_highlight:
            c.drawString(65, y - 22, "OK")
        else:
            c.drawString(68, y - 22, "-")

        # Title
        c.setFillColor(TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(95, y - 18, title)

        # Subtitle
        tw = c.stringWidth(title, "Helvetica-Bold", 11)
        c.setFillColor(color)
        c.setFont("Helvetica", 9)
        c.drawString(100 + tw, y - 18, "  " + subtitle)

        # Description
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 9)
        c.drawString(95, y - 36, desc)
        if is_highlight:
            c.drawString(95, y - 48, "estes en otra app trabajando. Es la senal mas importante.")

        y -= (h + 6)

    c.showPage()


# ═══════════════════════════════════════════════════════
# PAGE 4: FLOW DIAGRAM + TIPS
# ═══════════════════════════════════════════════════════
def page_flow_and_tips(c):
    draw_page_bg(c)
    draw_footer(c, 4)

    y = H - 60
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "05")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(75, y - 2, "El Ciclo del Pulse")

    y -= 35
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 10)
    c.drawString(50, y, "Tu Pulse sigue un ciclo natural durante cada sesion de trabajo:")

    y -= 40

    # Flow diagram - horizontal steps
    steps = [
        ("Inicias\nSesion", TEXT_MUTED, DARK_BG3),
        ("Warming\nup", WARMING, Color(0x85/255, 0xB7/255, 0xEB/255, 0.1)),
        ("Locking\nin", LOCKING, Color(0x5D/255, 0xCA/255, 0xA5/255, 0.1)),
        ("In the\nzone", ZONE, Color(0xEF/255, 0x9F/255, 0x27/255, 0.1)),
        ("Deep\nflow", DEEP, Color(0xD4/255, 0x53/255, 0x7E/255, 0.1)),
    ]

    step_w = 85
    step_h = 55
    gap = 12
    total_w = len(steps) * step_w + (len(steps) - 1) * gap
    start_x = (W - total_w) / 2

    for i, (label, color, bg_color) in enumerate(steps):
        sx = start_x + i * (step_w + gap)
        draw_rounded_rect(c, sx, y - step_h, step_w, step_h, 10, fill=bg_color, stroke=color, stroke_width=1.2)

        lines = label.split("\n")
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(sx + step_w / 2, y - 22, lines[0])
        if len(lines) > 1:
            c.setFont("Helvetica", 9)
            c.drawCentredString(sx + step_w / 2, y - 36, lines[1])

        # Arrow between steps
        if i < len(steps) - 1:
            ax = sx + step_w + 2
            ay = y - step_h / 2
            c.setStrokeColor(TEXT_MUTED)
            c.setLineWidth(0.8)
            c.line(ax, ay, ax + gap - 4, ay)
            c.line(ax + gap - 4, ay, ax + gap - 8, ay - 3)
            c.line(ax + gap - 4, ay, ax + gap - 8, ay + 3)

    # Decay arrow going back
    y -= step_h + 15
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 9)
    decay_text = "Si dejas de trabajar sin timer, el Pulse decae gradualmente..."
    c.drawCentredString(W / 2, y, decay_text)

    # Curved arrow back
    y -= 8
    arrow_start_x = start_x + total_w - 20
    arrow_end_x = start_x + 30
    c.setStrokeColor(RED)
    c.setLineWidth(0.8)
    c.setDash(3, 3)
    # Simplified: draw a line underneath
    c.line(arrow_end_x, y - 8, arrow_start_x, y - 8)
    # Arrowhead pointing left
    c.line(arrow_end_x, y - 8, arrow_end_x + 6, y - 4)
    c.line(arrow_end_x, y - 8, arrow_end_x + 6, y - 12)
    c.setDash()

    c.setFillColor(RED)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W / 2, y - 22, "Decay (sin actividad)")

    y -= 60

    # TIPS section
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "06")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(75, y - 2, "Tips para Mantener tu Pulse Alto")

    y -= 40

    tips = [
        ("Usa el timer para cada tarea",
         "El timer es tu mejor amigo. Mientras corre, tu Pulse no decae y ganas +10 pts. Incluso si trabajas fuera de la app, el timer protege tu Pulse.",
         GOLD, "1"),
        ("Empieza con tareas pequenas",
         "Cada tarea completada da +12 pts. Completar 2-3 tareas pequenas al inicio te lleva rapido a \"Locking in\" y creas momentum.",
         EMERALD, "2"),
        ("Sesiones largas sin interrupciones",
         "Despues de 30 minutos continuos, empiezas a recibir un bonus de profundidad que sube automaticamente. No rompas la racha.",
         ZONE, "3"),
        ("Mantene la pestana visible",
         "Si cambias a otra app sin timer, el sistema asume que te fuiste y el Pulse baja rapido. Mantene Tayrona visible o usa el timer.",
         WARMING, "4"),
        ("Tu streak importa",
         "Dias consecutivos de uso construyen tu streak. Un streak alto muestra consistencia — y te motiva a no romperla.",
         DEEP, "5"),
    ]

    for title, desc, color, num in tips:
        h = 68
        draw_rounded_rect(c, 50, y - h, W - 100, h, 8, fill=CARD_BG, stroke=BORDER)

        # Number circle
        c.setFillColor(color)
        c.circle(72, y - 20, 10, fill=1, stroke=0)
        c.setFillColor(DARK_BG)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(72, y - 24, num)

        # Title
        c.setFillColor(TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(95, y - 18, title)

        # Description (word wrap)
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 8.5)
        max_w = W - 100 - 95 + 50 - 20
        words = desc.split()
        line = ""
        ly = y - 34
        for word in words:
            test = line + " " + word if line else word
            if c.stringWidth(test, "Helvetica", 8.5) > max_w:
                c.drawString(95, ly, line)
                line = word
                ly -= 12
            else:
                line = test
        if line:
            c.drawString(95, ly, line)

        y -= (h + 6)

    c.showPage()


# ═══════════════════════════════════════════════════════
# PAGE 5: DECAY TABLE + CLOSING
# ═══════════════════════════════════════════════════════
def page_decay_and_close(c):
    draw_page_bg(c)
    draw_footer(c, 5)

    y = H - 60
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "07")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(75, y - 2, "Tabla de Decay")

    y -= 35
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 10)
    c.drawString(50, y, "Cuanto baja tu Pulse segun la situacion:")

    y -= 30

    # Table
    headers = ["Situacion", "Gracia", "Decay Rate", "Nota"]
    col_widths = [180, 65, 90, W - 100 - 180 - 65 - 90]
    table_x = 50

    # Header row
    draw_rounded_rect(c, table_x, y - 25, W - 100, 25, 6, fill=DARK_BG3, stroke=BORDER)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(GOLD)
    cx = table_x + 10
    for i, h_text in enumerate(headers):
        c.drawString(cx, y - 17, h_text)
        cx += col_widths[i]

    y -= 25
    rows = [
        ["Timer activo", "---", "0 pts/min", "Sin decay! Tu Pulse se mantiene."],
        ["Tab visible, sin clicks", "5 min", "-1.5 pts/min", "Decay suave. Quizas piensas."],
        ["Tab visible, 15+ min idle", "5 min", "-3 pts/min", "Decay moderado."],
        ["Tab oculta, sin timer", "5 min", "-3 pts/min", "Asume que te fuiste."],
        ["Tab oculta, 10+ min", "5 min", "-5 pts/min", "Decay rapido. Vuelve pronto!"],
    ]

    row_colors = [EMERALD, WARMING, ZONE, HexColor("#f97316"), RED]

    for i, (row, rcolor) in enumerate(zip(rows, row_colors)):
        rh = 28
        bg = CARD_BG if i % 2 == 0 else DARK_BG2
        draw_rounded_rect(c, table_x, y - rh, W - 100, rh, 0, fill=bg)

        # Color indicator
        c.setFillColor(rcolor)
        c.rect(table_x, y - rh, 3, rh, fill=1, stroke=0)

        cx = table_x + 10
        for j, cell in enumerate(row):
            if j == 0:
                c.setFillColor(TEXT_PRIMARY)
                c.setFont("Helvetica-Bold", 9)
            elif j == 2:
                c.setFillColor(rcolor)
                c.setFont("Helvetica-Bold", 9)
            else:
                c.setFillColor(TEXT_SECONDARY)
                c.setFont("Helvetica", 9)
            c.drawString(cx, y - 18, cell)
            cx += col_widths[j]

        y -= rh

    y -= 10
    # Important note
    draw_rounded_rect(c, 50, y - 40, W - 100, 40, 8, fill=safe_hex("#34d39910"), stroke=safe_hex("#34d39930"))
    c.setFillColor(EMERALD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(70, y - 18, "Recuerda: El timer es tu escudo contra el decay.")
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 9)
    c.drawString(70, y - 32, "Mientras corre, puedes trabajar en cualquier app y tu Pulse no baja.")

    y -= 75

    # Summary / Closing
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "08")
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(75, y - 2, "En Resumen")

    y -= 40

    summary_items = [
        "El Pulse Bar refleja tu energia productiva en tiempo real.",
        "Hay 4 niveles: desde Warming up hasta Deep flow.",
        "Completar tareas y usar el timer son las mejores formas de subir.",
        "El decay es natural — no es un castigo, es un espejo.",
        "Sesiones largas y consistentes te llevan al Deep flow.",
        "Tu streak de dias consecutivos muestra tu disciplina.",
    ]

    for item in summary_items:
        c.setFillColor(GOLD)
        c.setFont("Helvetica", 10)
        c.drawString(65, y, ">")
        c.setFillColor(TEXT_PRIMARY)
        c.setFont("Helvetica", 10)
        c.drawString(82, y, item)
        y -= 22

    y -= 30

    # Final branding
    # Gold decorative line
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(W / 2 - 60, y, W / 2 + 60, y)

    y -= 30
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(W / 2, y, "TAYRONA AI")

    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, y - 22, "Organiza tu Dia, Disena tu Imperio")

    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W / 2, y - 48, "tayrona-ai.vercel.app")

    c.showPage()


# ═══════════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════════
def main():
    c = canvas.Canvas(OUTPUT_PATH, pagesize=letter)
    c.setTitle("Pulse Bar — Guia del Usuario | Tayrona AI")
    c.setAuthor("Tayrona AI")
    c.setSubject("Como funciona el Pulse Bar")

    page_cover(c)
    page_what_is(c)
    page_up_down(c)
    page_flow_and_tips(c)
    page_decay_and_close(c)

    c.save()
    print(f"PDF generated: {OUTPUT_PATH}")
    print(f"Pages: 5")


if __name__ == "__main__":
    main()
