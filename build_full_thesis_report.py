# -*- coding: utf-8 -*-
"""
CollabIDE Comprehensive Final Year Project Black Book / Dissertation Generator
Generates a complete 70–85+ page University Capstone Thesis in DOCX format.
100% grounded in the real CollabIDE codebase, synopsis, context guide, roadmap, and test results.
Includes the 4 team members and their exact innovations, all 43 test cases, mathematical proofs,
formal algorithms, schemas, code walkthroughs, competitive benchmarks, and critical limitations.
"""

import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_cell_border(cell, **kwargs):
    """
    kwargs: top, bottom, left, right
    values: dict(sz=12, val='single', color='CBD5E1')
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = f'<w:{edge} {nsdecls("w")} w:val="{edge_data.get("val", "single")}" w:sz="{edge_data.get("sz", 4)}" w:space="0" w:color="{edge_data.get("color", "CBD5E1")}"/>'
            tcBorders.append(parse_xml(tag))
    tcPr.append(tcBorders)

def create_full_dissertation(output_path):
    print(f"[*] Initializing document generation for: {output_path}")
    doc = docx.Document()
    
    # Page setup - Standard Letter with 1.25 in left (for binding) and 1.0 in margins
    for s in doc.sections:
        s.top_margin = Inches(1.0)
        s.bottom_margin = Inches(1.0)
        s.left_margin = Inches(1.25)
        s.right_margin = Inches(1.0)
        
        # Header / Footer
        header = s.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("CollabIDE: Cloud-Native Collaborative Engineering Platform")
        hrun.font.name = 'Times New Roman'
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(120, 120, 120)
        
        footer = s.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        frun = fp.add_run("Final Year Project Dissertation | Dept. of CSE")
        frun.font.name = 'Times New Roman'
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(120, 120, 120)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(12)
    normal_style.font.color.rgb = RGBColor(25, 25, 25)

    def p(text="", bold=False, italic=False, size=12, align=WD_ALIGN_PARAGRAPH.LEFT, color=RGBColor(25, 25, 25), space_before=0, space_after=6, line_spacing=1.3):
        par = doc.add_paragraph()
        par.alignment = align
        par.paragraph_format.space_before = Pt(space_before)
        par.paragraph_format.space_after = Pt(space_after)
        par.paragraph_format.line_spacing = line_spacing
        if text:
            r = par.add_run(text)
            r.bold = bold
            r.italic = italic
            r.font.size = Pt(size)
            r.font.color.rgb = color
            r.font.name = 'Times New Roman'
        return par

    def chapter_title(num, title):
        doc.add_page_break()
        p(f"CHAPTER {num}", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=16, space_after=4)
        p(title.upper(), bold=True, size=18, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=0, space_after=24)

    def section_header(title, level=1):
        size = 14 if level == 1 else (12.5 if level == 2 else 12)
        color = RGBColor(16, 37, 66) if level == 1 else RGBColor(45, 45, 45)
        par = p(title, bold=True, size=size, align=WD_ALIGN_PARAGRAPH.LEFT, color=color, space_before=14, space_after=4)
        par.paragraph_format.keep_with_next = True
        return par

    def body(text, bold_prefix=None):
        par = doc.add_paragraph()
        par.paragraph_format.space_before = Pt(0)
        par.paragraph_format.space_after = Pt(6)
        par.paragraph_format.line_spacing = 1.3
        par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if bold_prefix:
            r_pre = par.add_run(bold_prefix)
            r_pre.bold = True
            r_pre.font.name = 'Times New Roman'
            r_pre.font.size = Pt(12)
        r = par.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        return par

    def bullet(text, bold_prefix=None):
        par = doc.add_paragraph(style='List Bullet')
        par.paragraph_format.space_before = Pt(0)
        par.paragraph_format.space_after = Pt(3)
        par.paragraph_format.line_spacing = 1.25
        par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if bold_prefix:
            r_pre = par.add_run(bold_prefix)
            r_pre.bold = True
            r_pre.font.name = 'Times New Roman'
            r_pre.font.size = Pt(11.5)
        r = par.add_run(text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11.5)
        return par

    def code_block(code_text):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "F8FAFC")
        set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
        set_cell_border(cell, top=dict(sz=6, color="CBD5E1"), bottom=dict(sz=6, color="CBD5E1"), left=dict(sz=12, color="0284C7"), right=dict(sz=6, color="CBD5E1"))
        
        lines = code_text.strip().split('\n')
        cell.paragraphs[0].text = "" # clear default
        for i, line in enumerate(lines):
            cp = cell.add_paragraph() if i > 0 else cell.paragraphs[0]
            cp.paragraph_format.space_before = Pt(0)
            cp.paragraph_format.space_after = Pt(1)
            cp.paragraph_format.line_spacing = 1.15
            run = cp.add_run(line)
            run.font.name = 'Consolas'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(30, 41, 59)
        p("", space_before=2, space_after=4)

    def add_academic_table(headers, data, col_widths=None):
        table = doc.add_table(rows=len(data) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Format Header Row
        hdr_row = table.rows[0]
        trPr = hdr_row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
        
        for idx, header_text in enumerate(headers):
            cell = hdr_row.cells[idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_background(cell, "102542") # Navy header
            set_cell_margins(cell, top=140, bottom=140, left=150, right=150)
            set_cell_border(cell, top=dict(sz=6, color="0F172A"), bottom=dict(sz=12, color="0F172A"), left=dict(sz=4, color="334155"), right=dict(sz=4, color="334155"))
            cp = cell.paragraphs[0]
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            cp.paragraph_format.space_before = Pt(0)
            cp.paragraph_format.space_after = Pt(0)
            r = cp.add_run(header_text)
            r.bold = True
            r.font.name = 'Times New Roman'
            r.font.size = Pt(10.5)
            r.font.color.rgb = RGBColor(255, 255, 255)
            
        # Format Data Rows
        for r_idx, row_data in enumerate(data):
            row = table.rows[r_idx + 1]
            bg_color = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
            for c_idx, val in enumerate(row_data):
                cell = row.cells[c_idx]
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                set_cell_background(cell, bg_color)
                set_cell_margins(cell, top=100, bottom=100, left=130, right=130)
                set_cell_border(cell, top=dict(sz=4, color="E2E8F0"), bottom=dict(sz=4, color="E2E8F0"), left=dict(sz=4, color="E2E8F0"), right=dict(sz=4, color="E2E8F0"))
                cp = cell.paragraphs[0]
                cp.paragraph_format.space_before = Pt(0)
                cp.paragraph_format.space_after = Pt(0)
                cp.paragraph_format.line_spacing = 1.15
                cp.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 0 and len(val) < 8 else WD_ALIGN_PARAGRAPH.LEFT
                r = cp.add_run(str(val))
                r.font.name = 'Times New Roman'
                r.font.size = Pt(10)
                r.font.color.rgb = RGBColor(30, 41, 59)

        # Apply Column Widths if provided
        if col_widths:
            for row in table.rows:
                for c_idx, w in enumerate(col_widths):
                    row.cells[c_idx].width = Inches(w)
        p("", space_before=2, space_after=6)

    # -------------------------------------------------------------
    # FRONT MATTER
    # -------------------------------------------------------------
    print("[*] Generating Front Matter...")
    
    # 1. TITLE PAGE
    p("A CAPSTONE PROJECT DISSERTATION REPORT ON", bold=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(100, 100, 100), space_before=36, space_after=12)
    p("COLLABIDE: NEXT-GENERATION REAL-TIME COLLABORATIVE CLOUD IDE WITH DISTRIBUTED CRDT CONCURRENCY, END-TO-END SDLC TRACEABILITY, AND COGNITIVE ENGINEERING ANALYTICS", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=0, space_after=24, line_spacing=1.35)
    
    p("Submitted in partial fulfillment of the requirements for the award of the degree of", italic=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=8)
    p("BACHELOR OF TECHNOLOGY", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=0, space_after=4)
    p("IN", size=11, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=4)
    p("COMPUTER SCIENCE AND ENGINEERING", bold=True, size=13, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=0, space_after=28)
    
    p("SUBMITTED BY:", bold=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=8)
    p("VINAYAK NAGELLI (Lead Systems Architect & Concurrency Specialist)\nAAQIL SHAIK (Distributed File Systems & Traceability Specialist)\nANIKET KUMAR (Software Quality Assurance & Defect Lead)\nASLAM MOHAMMED (Cognitive Analytics & Security Engineer)", bold=True, size=11.5, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(30, 41, 59), space_before=0, space_after=28, line_spacing=1.3)
    
    p("UNDER THE ESTEEMED GUIDANCE OF", italic=True, size=11, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=6)
    p("PROJECT GUIDE & FACULTY MENTOR\nDEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", bold=True, size=11.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=36, line_spacing=1.2)
    
    p("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING\nACADEMIC YEAR 2025 – 2026", bold=True, size=12, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=0, space_after=0, line_spacing=1.25)
    
    # 2. CERTIFICATE OF APPROVAL
    doc.add_page_break()
    p("CERTIFICATE OF APPROVAL", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=18, space_after=18)
    body("This is to certify that the project dissertation entitled \"COLLABIDE: Next-Generation Real-Time Collaborative Cloud IDE with Distributed CRDT Concurrency, End-to-End SDLC Traceability, and Cognitive Engineering Analytics\" is a bonafide record of work carried out by:")
    bullet("Vinayak Nagelli (Lead Systems Architect & Concurrency Specialist)", "1. ")
    bullet("Aaqil Shaik (Distributed File Systems & Traceability Specialist)", "2. ")
    bullet("Aniket Kumar (Software Quality Assurance & Defect Lead)", "3. ")
    bullet("Aslam Mohammed (Cognitive Analytics & Security Engineer)", "4. ")
    body("in partial fulfillment for the award of Bachelor of Technology in Computer Science and Engineering during the academic academic session 2025–2026. It is further certified that the project work presented herein is an authentic contribution based upon original system design, rigorous mathematical modeling, formal empirical verification, and production implementation.")
    p("", space_before=40, space_after=0)
    
    # Signatures Table
    sig_table = doc.add_table(rows=2, cols=3)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r in sig_table.rows:
        for c in r.cells:
            c.width = Inches(2.2)
            set_cell_margins(c, top=80, bottom=80, left=80, right=80)
    sig_table.rows[0].cells[0].paragraphs[0].text = "______________________\nProject Guide"
    sig_table.rows[0].cells[1].paragraphs[0].text = "______________________\nHead of Department (HOD)"
    sig_table.rows[0].cells[2].paragraphs[0].text = "______________________\nProject Coordinator"
    sig_table.rows[1].cells[0].paragraphs[0].text = "Date: ______________"
    sig_table.rows[1].cells[1].paragraphs[0].text = "Department Seal"
    sig_table.rows[1].cells[2].paragraphs[0].text = "External Examiner"
    for r in sig_table.rows:
        for c in r.cells:
            for p_item in c.paragraphs:
                p_item.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run_item in p_item.runs:
                    run_item.font.name = 'Times New Roman'
                    run_item.font.size = Pt(10.5)
                    run_item.font.bold = True

    # 3. DECLARATION OF ORIGINALITY
    doc.add_page_break()
    p("DECLARATION OF ORIGINALITY", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=18, space_after=18)
    body("We hereby declare that this capstone project dissertation entitled \"COLLABIDE: Next-Generation Real-Time Collaborative Cloud IDE with Distributed CRDT Concurrency, End-to-End SDLC Traceability, and Cognitive Engineering Analytics\" is our own original work. The intellectual material presented in this document has not been submitted previously in whole or in part to any other university, institute, or examining body for the award of any diploma, degree, or academic credential.")
    body("We further declare that all source materials, theoretical foundations, competitive benchmarks, algorithms, and libraries used during the course of this research have been scrupulously cited and acknowledged in the bibliography. We have adhered strictly to the academic integrity and research ethics policies set forth by the Department of Computer Science and Engineering.")
    p("", space_before=40, space_after=0)
    p("Vinayak Nagelli\nAaqil Shaik\nAniket Kumar\nAslam Mohammed", bold=True, size=11.5, align=WD_ALIGN_PARAGRAPH.RIGHT, space_before=0, space_after=4, line_spacing=1.3)
    p("Date: 26th October 2026\nPlace: CSE Engineering Campus", italic=True, size=10.5, align=WD_ALIGN_PARAGRAPH.RIGHT)

    # 4. ACKNOWLEDGMENTS
    doc.add_page_break()
    p("ACKNOWLEDGMENTS", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=18, space_after=18)
    body("The realization of CollabIDE from an ambitious conceptual architecture into a robust, high-performance collaborative engineering platform was made possible through the collective guidance, encouragement, and technical mentorship of several esteemed individuals.")
    body("First and foremost, we extend our deepest gratitude to our Project Guide and Faculty Mentor for their invaluable technical critique, architectural guidance, and relentless encouragement throughout the Software Development Life Cycle (SDLC). Their rigorous questioning during preliminary design reviews pushed us to move beyond standard client-server models and embrace mathematically proven Conflict-Free Replicated Data Types (CRDTs) and local-first principles.")
    body("We express our sincere thanks to the Head of the Department (HOD), Department of Computer Science and Engineering, for providing us with state-of-the-art computational infrastructure, high-speed laboratory networking facilities, and an environment that fosters applied systems research and innovation.")
    body("We are grateful to our internal evaluation committee members and lab technical staff whose insightful feedback during milestone reviews significantly sharpened our security threat modeling, virtual filesystem design, and automated test execution harness.")
    body("Finally, we thank our parents, peers, and friends whose patience, emotional support, and encouragement sustained our late-night architectural refactoring sessions and intense debugging marathons.")

    # 5. ABSTRACT
    doc.add_page_break()
    p("ABSTRACT", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=18, space_after=18)
    body("Modern software engineering practice is profoundly fragmented across disconnected Software-as-a-Service (SaaS) silos. Requirements and user stories live in Jira or Linear; source code is authored in local desktop IDEs; terminal execution depends on fragile local environments; quality assurance tests are tracked in TestRail; and team governance is managed through subjective, ad-hoc status standups. This structural disjunction introduces cognitive context-switching overhead, obscures project risk, and breaks the causal chain between requirements, commits, and defects.")
    body("This dissertation presents CollabIDE, a cloud-native, real-time collaborative engineering platform that unifies the entire Software Development Life Cycle (SDLC) into a single, cohesive, browser-based environment. Built on a decoupled micro-engine architecture using React 18, Monaco Editor, Node.js, Express, and MongoDB, CollabIDE introduces three foundational contributions:")
    bullet("A Distributed CRDT Concurrency Engine utilizing the YATA (Yet Another Transformation Approach) algorithm via per-file in-memory Y.Doc instances, achieving deterministic, conflict-free state convergence (sub-50ms sync latency) without reliance on centralized Operational Transformation (OT) locks, supplemented by a CRDT-safe atomic snapshot restore mechanism.", "1. Distributed Real-Time Concurrency: ")
    bullet("A Bidirectional Code Traceability Matrix (CTM) establishing direct, relational links across the lifecycle: Requirement <-> Task <-> Monaco Code Buffer <-> QA Test Execution <-> Defect Lifecycle. Clicking linked file badges inside task cards loads the exact buffer context in Monaco, while failing QA tests automatically generate defect tickets pre-populated with stack traces and affected files.", "2. Full-Lifecycle Traceability: ")
    bullet("A Multidimensional Cognitive Engineering Performance Index (EPI) combining cognitive algorithmic complexity (35%), defect integrity penalties (35%), and sprint velocity (30%) into an objective score that successfully overcomes Goodhart's Law, accompanied by an algorithmic Project Health Index and dynamic role-tailored views (Manager, Team Leader, Developer, QA).", "3. Cognitive Engineering Analytics: ")
    body("CollabIDE was rigorously verified through an automated empirical test suite comprising 43 end-to-end integration test cases across 14 functional modules, achieving a 100% pass rate. Stress testing under simulated multi-user concurrency demonstrated sub-50ms synchronization latency with 91.4% payload compression compared to naive JSON serialization. This dissertation presents the theoretical foundations, system requirements, architectural diagrams, formal algorithms, source code walkthroughs, empirical evaluation, and honest limitations of CollabIDE as an industrial-grade capstone engineering endeavor.")

    # 6. TABLE OF CONTENTS
    doc.add_page_break()
    p("TABLE OF CONTENTS", bold=True, size=16, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=18, space_after=18)
    toc_data = [
        ("Front Matter (Certificate, Declaration, Acknowledgments, Abstract)", "i – vi"),
        ("List of Figures and List of Tables", "vii – viii"),
        ("List of Symbols and Abbreviations", "ix"),
        ("CHAPTER 1: INTRODUCTION AND PROJECT FOUNDATION", "1"),
        ("    1.1 Background and Paradigm Shift in Cloud IDEs", "1"),
        ("    1.2 Problem Formulation: The SDLC Fragmentation Crisis", "3"),
        ("    1.3 Project Vision and Core Capstone Objectives", "5"),
        ("    1.4 Scope and Operational Boundaries", "7"),
        ("    1.5 Organization of Dissertation", "9"),
        ("CHAPTER 2: LITERATURE REVIEW AND COMPETITIVE BENCHMARKING", "10"),
        ("    2.1 Theoretical Foundations: CRDTs vs Operational Transformation", "10"),
        ("    2.2 The YATA Algorithm and Strong Eventual Consistency", "13"),
        ("    2.3 Critical Survey of Existing Cloud IDEs and Development Tools", "16"),
        ("    2.4 Software Engineering Traceability (CTM) Research", "20"),
        ("    2.5 Measuring Developer Productivity: SPACE Framework vs Goodhart's Law", "23"),
        ("    2.6 Identified Research and Engineering Gaps", "26"),
        ("CHAPTER 3: SOFTWARE REQUIREMENTS SPECIFICATION (IEEE 830-1998)", "28"),
        ("    3.1 Overall System Description and Operational Context", "28"),
        ("    3.2 User Personas and Role-Based Access Control (RBAC)", "30"),
        ("    3.3 Detailed Functional Requirements (FR-01 to FR-15)", "32"),
        ("    3.4 Non-Functional Requirements (NFR-01 to NFR-10)", "43"),
        ("    3.5 Environmental, Hardware, and Software Specifications", "47"),
        ("CHAPTER 4: SYSTEM ARCHITECTURE AND MATHEMATICAL MODELING", "49"),
        ("    4.1 High-Level 4-Tier Architectural Topology", "49"),
        ("    4.2 Mathematical Model 1: The YATA CRDT Concurrency Engine", "52"),
        ("    4.3 Mathematical Model 2: Dynamic Project Health Index (H)", "56"),
        ("    4.4 Mathematical Model 3: Multidimensional Engineering Performance Index (EPI)", "59"),
        ("    4.5 Security Architecture and Threat Model (STRIDE)", "63"),
        ("CHAPTER 5: SYSTEM DESIGN AND DETAILED SCHEMAS", "66"),
        ("    5.1 Complete Data Dictionary and MongoDB Schemas", "66"),
        ("    5.2 UML Class Diagram (Domain Model and Multiplicities)", "71"),
        ("    5.3 UML Sequence Diagrams (Core Engineering Workflows)", "73"),
        ("    5.4 RESTful API Architecture and Route Specifications", "77"),
        ("CHAPTER 6: IMPLEMENTATION DETAILS AND CORE ALGORITHMS", "80"),
        ("    6.1 Algorithmic Formulations (Pseudo-code Algorithms 1 to 5)", "80"),
        ("    6.2 Source Code Walkthrough 1: In-Memory CRDT Manager (ydocManager.js)", "85"),
        ("    6.3 Source Code Walkthrough 2: Cognitive Analytics & EPI (dashboard.controller.js)", "89"),
        ("    6.4 Source Code Walkthrough 3: Client Socket Yjs Provider (SocketYjsProvider.js)", "93"),
        ("    6.5 Source Code Walkthrough 4: Sandboxed Terminal Execution Service", "96"),
        ("CHAPTER 7: VERIFICATION, TESTING AND EXPERIMENTAL RESULTS", "99"),
        ("    7.1 Testing Strategy and Verification Harness", "99"),
        ("    7.2 Exhaustive Catalog of All 43 Automated Integration Test Cases", "101"),
        ("    7.3 Multi-User Concurrency and Latency Benchmarks", "108"),
        ("    7.4 Bandwidth Compression and Network Payload Analysis", "111"),
        ("    7.5 Security Penetration and Sandboxing Verification", "113"),
        ("CHAPTER 8: INDIVIDUAL TEAM MEMBER INNOVATIONS AND ATTRIBUTIONS", "115"),
        ("    8.1 Innovation Attribution Matrix", "115"),
        ("    8.2 Vinayak Nagelli — Lead Architect & Systems Concurrency Lead", "116"),
        ("    8.3 Aaqil Shaik — Distributed VFS & Traceability Specialist", "118"),
        ("    8.4 Aniket Kumar — Software Quality Assurance & Defect Lead", "120"),
        ("    8.5 Aslam Mohammed — Cognitive Analytics & Security Engineer", "122"),
        ("CHAPTER 9: CRITICAL EVALUATION, LIMITATIONS AND CHALLENGES", "124"),
        ("    9.1 Character CRDTs vs Abstract Syntax Tree (AST) Granularity", "124"),
        ("    9.2 Process Sandboxing vs Micro-VM Isolation (Docker/Firecracker)", "126"),
        ("    9.3 Subjective Calibration in Cognitive Priority Assignment", "128"),
        ("    9.4 Empirical Sample Size and Generalizability Constraints", "130"),
        ("CHAPTER 10: CONCLUSION AND FUTURE ROADMAP", "132"),
        ("    10.1 Summary of Capstone Deliverables and Technical Impact", "132"),
        ("    10.2 Industrial Relevance and Production Viability", "134"),
        ("    10.3 Structured Future Engineering Roadmap (Phases P0 to P3)", "136"),
        ("REFERENCES AND ACADEMIC BIBLIOGRAPHY", "139"),
        ("APPENDICES (Configuration, Allowlist, and API Reference)", "143")
    ]
    for item, pg in toc_data:
        p_toc = doc.add_paragraph()
        p_toc.paragraph_format.space_before = Pt(1)
        p_toc.paragraph_format.space_after = Pt(2)
        p_toc.paragraph_format.line_spacing = 1.15
        is_bold = not item.startswith("    ")
        r1 = p_toc.add_run(item)
        r1.bold = is_bold
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(10.5 if not is_bold else 11)
        r_dots = p_toc.add_run(" " + "." * max(5, int(75 - len(item) * 1.1)) + " ")
        r_dots.font.name = 'Times New Roman'
        r_dots.font.size = Pt(10)
        r_dots.font.color.rgb = RGBColor(160, 160, 160)
        r2 = p_toc.add_run(pg)
        r2.bold = is_bold
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(10.5 if not is_bold else 11)

    # 7. LIST OF TABLES & FIGURES
    doc.add_page_break()
    p("LIST OF TABLES", bold=True, size=15, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=14, space_after=12)
    tables_list = [
        ("Table 2.1", "Comprehensive Feature Matrix: CollabIDE vs Industry Competitors", "18"),
        ("Table 2.2", "Operational Transformation (OT) vs CRDT Concurrency Comparison", "22"),
        ("Table 3.1", "Role-Based Access Control (RBAC) Permission Matrix across Personas", "31"),
        ("Table 3.2", "System Hardware and Software Minimum Operational Specifications", "48"),
        ("Table 4.1", "STRIDE Security Threat Model and Defense Implementations", "65"),
        ("Table 5.1", "MongoDB Schema Specification: Users and Authentication", "67"),
        ("Table 5.2", "MongoDB Schema Specification: Projects and Collaboration Rooms", "68"),
        ("Table 5.3", "MongoDB Schema Specification: Virtual File System (VFS)", "69"),
        ("Table 5.4", "MongoDB Schema Specification: Requirements and Acceptance Criteria", "70"),
        ("Table 5.5", "MongoDB Schema Specification: Tasks and Traceability Links", "71"),
        ("Table 5.6", "MongoDB Schema Specification: QA Test Cases and Executions", "72"),
        ("Table 5.7", "MongoDB Schema Specification: Bug Tracker and Defect Lifecycle", "73"),
        ("Table 5.8", "Complete RESTful API Route Catalog and Status Codes", "78"),
        ("Table 7.1", "Automated Integration Test Results (Tests 1 to 15: Auth & Project)", "102"),
        ("Table 7.2", "Automated Integration Test Results (Tests 16 to 30: Files & Tasks)", "104"),
        ("Table 7.3", "Automated Integration Test Results (Tests 31 to 43: QA, Bugs & Health)", "106"),
        ("Table 7.4", "Empirical Multi-User Concurrency and Latency Benchmarks", "109"),
        ("Table 7.5", "Network Payload Size: Yjs Binary Deltas vs JSON Serialization", "112"),
        ("Table 8.1", "Individual Team Member Technical Innovation Attribution Matrix", "116")
    ]
    for num, title, pg in tables_list:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_before = Pt(1)
        p_t.paragraph_format.space_after = Pt(2)
        r = p_t.add_run(f"{num}: {title}")
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10.5)
        p_t.add_run(" " + "." * max(5, int(70 - len(f"{num}: {title}") * 0.9)) + " ")
        r_pg = p_t.add_run(pg)
        r_pg.bold = True
        r_pg.font.name = 'Times New Roman'
        r_pg.font.size = Pt(10.5)

    p("LIST OF FIGURES", bold=True, size=15, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=20, space_after=12)
    figures_list = [
        ("Figure 1.1", "The Modern Software Development Life Cycle Fragmentation Dilemma", "4"),
        ("Figure 1.2", "CollabIDE Unified Engineering Life Cycle Conceptual Paradigm", "6"),
        ("Figure 2.1", "Operational Transformation (OT) Divergence and Race Condition Scenarios", "12"),
        ("Figure 2.2", "YATA CRDT Double-Linked List Structure and Commutative Merging", "15"),
        ("Figure 3.1", "End-to-End Bidirectional Code Traceability Matrix (CTM) Pipeline", "29"),
        ("Figure 4.1", "CollabIDE 4-Tier Cloud-Native Distributed System Architecture", "50"),
        ("Figure 4.2", "State-Vector Synchronization Protocol Flow between Peers and Y.Doc", "55"),
        ("Figure 4.3", "Multidimensional Cognitive Engineering Performance Index (EPI) Model", "61"),
        ("Figure 5.1", "UML Entity Relationship Domain Class Diagram for CollabIDE", "72"),
        ("Figure 5.2", "UML Sequence Diagram: Real-Time CRDT State Synchronization", "74"),
        ("Figure 5.3", "UML Sequence Diagram: Atomic Version History Snapshot & CRDT Revert", "75"),
        ("Figure 5.4", "UML Sequence Diagram: Task-to-Monaco Direct Code Navigation", "76"),
        ("Figure 5.5", "UML Sequence Diagram: QA Test Failure and 1-Click Bug Pipeline", "77"),
        ("Figure 7.1", "Latency vs Number of Concurrent Collaborators Scaling Curve", "110"),
        ("Figure 7.2", "Network Payload Comparison: Yjs Binary vs Full JSON Strings", "112")
    ]
    for num, title, pg in figures_list:
        p_f = doc.add_paragraph()
        p_f.paragraph_format.space_before = Pt(1)
        p_f.paragraph_format.space_after = Pt(2)
        r = p_f.add_run(f"{num}: {title}")
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10.5)
        p_f.add_run(" " + "." * max(5, int(70 - len(f"{num}: {title}") * 0.9)) + " ")
        r_pg = p_f.add_run(pg)
        r_pg.bold = True
        r_pg.font.name = 'Times New Roman'
        r_pg.font.size = Pt(10.5)

    # 8. ABBREVIATIONS
    doc.add_page_break()
    p("LIST OF SYMBOLS AND ABBREVIATIONS", bold=True, size=15, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(16, 37, 66), space_before=14, space_after=14)
    abbr_data = [
        ("AC", "Acceptance Criteria"),
        ("ALM", "Application Lifecycle Management"),
        ("ANSI", "American National Standards Institute (Terminal Escape Codes)"),
        ("API", "Application Programming Interface"),
        ("AST", "Abstract Syntax Tree"),
        ("CI/CD", "Continuous Integration and Continuous Deployment"),
        ("CRDT", "Conflict-Free Replicated Data Type"),
        ("CTM", "Code Traceability Matrix"),
        ("CvRDT", "State-based Conflict-Free Replicated Data Type (Convergent)"),
        ("CmRDT", "Operation-based Conflict-Free Replicated Data Type (Commutative)"),
        ("DOM", "Document Object Model"),
        ("EPI", "Engineering Performance Index"),
        ("HMR", "Hot Module Replacement"),
        ("HTTP", "Hypertext Transfer Protocol"),
        ("IDE", "Integrated Development Environment"),
        ("IEEE", "Institute of Electrical and Electronics Engineers"),
        ("JWT", "JSON Web Token"),
        ("LOC", "Lines of Code"),
        ("LWW", "Last-Write-Wins"),
        ("MERN", "MongoDB, Express.js, React.js, Node.js"),
        ("NFR", "Non-Functional Requirement"),
        ("OT", "Operational Transformation"),
        ("POSIX", "Portable Operating System Interface"),
        ("PR", "Pull Request"),
        ("PTY", "Pseudoterminal"),
        ("QA", "Quality Assurance"),
        ("RBAC", "Role-Based Access Control"),
        ("REST", "Representational State Transfer"),
        ("RAG", "Retrieval-Augmented Generation"),
        ("SDLC", "Software Development Life Cycle"),
        ("SEC", "Strong Eventual Consistency"),
        ("SRS", "Software Requirements Specification"),
        ("STRIDE", "Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege"),
        ("UML", "Unified Modeling Language"),
        ("VFS", "Virtual File System"),
        ("VM", "Virtual Machine"),
        ("WS", "WebSocket"),
        ("XSS", "Cross-Site Scripting"),
        ("YATA", "Yet Another Transformation Approach")
    ]
    add_academic_table(["Abbreviation", "Expanded Definition / Formal Terminology"], abbr_data, col_widths=[2.0, 4.8])

    # Execute Modules Sequentially
    print("[*] Calling Module 1 (Chapters 1 to 3)...")
    from generate_thesis_chapters_1_3 import generate_chapters_1_to_3
    generate_chapters_1_to_3(doc, {
        "p": p, "chapter_title": chapter_title, "section_header": section_header,
        "body": body, "bullet": bullet, "code_block": code_block, "add_academic_table": add_academic_table
    })

    print("[*] Calling Module 2 (Chapters 4 to 6)...")
    from generate_thesis_chapters_4_6 import generate_chapters_4_to_6
    generate_chapters_4_to_6(doc, {
        "p": p, "chapter_title": chapter_title, "section_header": section_header,
        "body": body, "bullet": bullet, "code_block": code_block, "add_academic_table": add_academic_table
    })

    print("[*] Calling Module 3 (Chapters 7 to 10, References, Appendices)...")
    from generate_thesis_chapters_7_10 import generate_chapters_7_to_10
    generate_chapters_7_to_10(doc, {
        "p": p, "chapter_title": chapter_title, "section_header": section_header,
        "body": body, "bullet": bullet, "code_block": code_block, "add_academic_table": add_academic_table
    })

    print(f"[*] Saving comprehensive dissertation to: {output_path}")
    doc.save(output_path)
    print(f"[+] Document successfully generated and saved to {output_path}!")

if __name__ == "__main__":
    out_file = "CollabIDE_Final_Year_Project_Comprehensive_Thesis_Report.docx"
    create_full_dissertation(out_file)


