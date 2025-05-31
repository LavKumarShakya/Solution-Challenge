import os
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import tempfile
import logging

# Import PDF generation libraries
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import black, blue, grey, darkgreen, red
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    logging.warning("ReportLab not available. PDF generation will not work. Install with: pip install reportlab")

logger = logging.getLogger(__name__)

class PDFGenerator:
    """PDF Generator for course exports and learning path documentation"""
    
    def __init__(self):
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab is required for PDF generation. Install with: pip install reportlab")
        
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
        # Temporary directory for PDF files
        self.temp_dir = Path(tempfile.gettempdir()) / "aetherlearn_pdfs"
        self.temp_dir.mkdir(exist_ok=True)
    
    def _setup_custom_styles(self):
        """Setup custom styles for PDF generation"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CourseTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=30,
            textColor=darkgreen,
            alignment=1  # Center alignment
        ))
        
        # Module title style
        self.styles.add(ParagraphStyle(
            name='ModuleTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=12,
            spaceBefore=20,
            textColor=blue,
            leftIndent=0
        ))
        
        # Resource title style
        self.styles.add(ParagraphStyle(
            name='ResourceTitle',
            parent=self.styles['Heading2'],
            fontSize=12,
            spaceAfter=6,
            spaceBefore=10,
            textColor=black,
            leftIndent=20
        ))
        
        # Description style
        self.styles.add(ParagraphStyle(
            name='Description',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=8,
            leftIndent=20,
            textColor=grey
        ))
        
        # Metadata style
        self.styles.add(ParagraphStyle(
            name='Metadata',
            parent=self.styles['Normal'],
            fontSize=9,
            spaceAfter=4,
            leftIndent=40,
            textColor=colors.HexColor('#666666')
        ))
    
    async def generate_course_pdf(
        self,
        course: Dict[str, Any],
        progress_data: Optional[List[Dict[str, Any]]] = None,
        include_resources: bool = True,
        include_progress: bool = True
    ) -> str:
        """
        Generate a comprehensive PDF for a saved course
        
        Args:
            course: Course data dictionary
            progress_data: User progress data for resources
            include_resources: Whether to include detailed resource information
            include_progress: Whether to include progress information
            
        Returns:
            Path to the generated PDF file
        """
        try:
            # Create filename
            course_name = course.get('course_name', 'Untitled_Course')
            safe_filename = "".join(c for c in course_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            pdf_filename = f"{safe_filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = self.temp_dir / pdf_filename
            
            # Create PDF document
            doc = SimpleDocTemplate(
                str(pdf_path),
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Build PDF content
            story = []
            
            # Add course header
            story.extend(self._build_course_header(course))
            
            # Add course overview
            story.extend(self._build_course_overview(course))
            
            # Add progress summary if available
            if include_progress and progress_data:
                story.extend(self._build_progress_summary(course, progress_data))
            
            # Add modules and resources
            if include_resources:
                story.extend(self._build_modules_section(course, progress_data if include_progress else None))
            
            # Add appendix with metadata
            story.extend(self._build_appendix(course))
            
            # Build PDF
            await asyncio.get_event_loop().run_in_executor(None, doc.build, story)
            
            logger.info(f"Generated PDF for course {course.get('course_name', 'Unknown')} at {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating course PDF: {str(e)}")
            raise
    
    def _build_course_header(self, course: Dict[str, Any]) -> List[Any]:
        """Build the course header section"""
        story = []
        
        # Course title
        story.append(Paragraph(course.get('course_name', 'Untitled Course'), self.styles['CourseTitle']))
        story.append(Spacer(1, 12))
        
        # Course metadata table
        metadata = [
            ['Difficulty', course.get('difficulty', 'Not specified')],
            ['Estimated Time', f"{course.get('total_estimated_hours', 0)} hours"],
            ['Total Resources', str(course.get('total_resources', 0))],
            ['Completion', f"{course.get('completion_percentage', 0):.1f}%"],
            ['Created', course.get('created_at', datetime.now()).strftime('%B %d, %Y') if isinstance(course.get('created_at'), datetime) else 'Unknown'],
        ]
        
        if course.get('custom_tags'):
            metadata.append(['Tags', ', '.join(course.get('custom_tags', []))])
        
        metadata_table = Table(metadata, colWidths=[2*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(metadata_table)
        story.append(Spacer(1, 20))
        
        return story
    
    def _build_course_overview(self, course: Dict[str, Any]) -> List[Any]:
        """Build the course overview section"""
        story = []
        
        # Overview section header
        story.append(Paragraph("Course Overview", self.styles['Heading1']))
        story.append(Spacer(1, 12))
        
        # Description
        description = course.get('description', 'No description available.')
        story.append(Paragraph(description, self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Prerequisites
        prerequisites = course.get('prerequisites', [])
        if prerequisites:
            story.append(Paragraph("Prerequisites:", self.styles['Heading2']))
            for prereq in prerequisites:
                story.append(Paragraph(f"• {prereq}", self.styles['Normal']))
            story.append(Spacer(1, 12))
        
        # Learning objectives if available
        if course.get('learning_objectives'):
            story.append(Paragraph("Learning Objectives:", self.styles['Heading2']))
            for objective in course.get('learning_objectives', []):
                story.append(Paragraph(f"• {objective}", self.styles['Normal']))
            story.append(Spacer(1, 12))
        
        return story
    
    def _build_progress_summary(self, course: Dict[str, Any], progress_data: List[Dict[str, Any]]) -> List[Any]:
        """Build the progress summary section"""
        story = []
        
        story.append(Paragraph("Progress Summary", self.styles['Heading1']))
        story.append(Spacer(1, 12))
        
        # Calculate progress statistics
        total_resources = course.get('total_resources', 0)
        completed_resources = len([p for p in progress_data if p.get('status') == 'completed'])
        in_progress_resources = len([p for p in progress_data if p.get('status') == 'in_progress'])
        total_time_spent = sum(p.get('time_spent_minutes', 0) for p in progress_data)
        
        # Progress statistics table
        progress_stats = [
            ['Total Resources', str(total_resources)],
            ['Completed Resources', str(completed_resources)],
            ['In Progress', str(in_progress_resources)],
            ['Not Started', str(total_resources - completed_resources - in_progress_resources)],
            ['Total Time Spent', f"{total_time_spent // 60}h {total_time_spent % 60}m"],
            ['Completion Rate', f"{(completed_resources / total_resources * 100) if total_resources > 0 else 0:.1f}%"]
        ]
        
        progress_table = Table(progress_stats, colWidths=[2.5*inch, 1.5*inch])
        progress_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        story.append(progress_table)
        story.append(Spacer(1, 20))
        
        return story
    
    def _build_modules_section(self, course: Dict[str, Any], progress_data: Optional[List[Dict[str, Any]]]) -> List[Any]:
        """Build the modules and resources section"""
        story = []
        
        story.append(Paragraph("Course Modules", self.styles['Heading1']))
        story.append(Spacer(1, 12))
        
        # Create progress lookup for quick access
        progress_lookup = {}
        if progress_data:
            progress_lookup = {p['resource_id']: p for p in progress_data}
        
        modules = course.get('modules', [])
        for i, module in enumerate(modules, 1):
            # Module header
            module_title = f"Module {i}: {module.get('title', 'Untitled Module')}"
            story.append(Paragraph(module_title, self.styles['ModuleTitle']))
            
            # Module description
            if module.get('description'):
                story.append(Paragraph(module.get('description'), self.styles['Description']))
            
            story.append(Spacer(1, 8))
            
            # Module resources
            resources = module.get('resources', [])
            if resources:
                for j, resource in enumerate(resources, 1):
                    resource_id = resource.get('id', '')
                    
                    # Resource title with progress indicator
                    progress_indicator = ""
                    if resource_id in progress_lookup:
                        status = progress_lookup[resource_id].get('status', 'not_started')
                        if status == 'completed':
                            progress_indicator = " ✓"
                        elif status == 'in_progress':
                            progress_indicator = " ⏳"
                    
                    resource_title = f"{j}. {resource.get('title', 'Untitled Resource')}{progress_indicator}"
                    story.append(Paragraph(resource_title, self.styles['ResourceTitle']))
                    
                    # Resource description
                    if resource.get('description'):
                        story.append(Paragraph(resource.get('description'), self.styles['Description']))
                    
                    # Resource metadata
                    metadata_items = []
                    metadata_items.append(f"Type: {resource.get('resource_type', 'Unknown').title()}")
                    metadata_items.append(f"Source: {resource.get('source', 'Unknown')}")
                    metadata_items.append(f"Estimated Time: {resource.get('estimated_time_minutes', 0)} minutes")
                    metadata_items.append(f"Difficulty: {resource.get('difficulty', 'Unknown').title()}")
                    
                    if resource.get('url'):
                        metadata_items.append(f"URL: {resource.get('url')}")
                    
                    # Add progress information if available
                    if resource_id in progress_lookup:
                        progress = progress_lookup[resource_id]
                        time_spent = progress.get('time_spent_minutes', 0)
                        if time_spent > 0:
                            metadata_items.append(f"Time Spent: {time_spent} minutes")
                        
                        if progress.get('notes'):
                            metadata_items.append(f"Notes: {progress.get('notes')}")
                    
                    metadata_text = " | ".join(metadata_items)
                    story.append(Paragraph(metadata_text, self.styles['Metadata']))
                    story.append(Spacer(1, 8))
            
            # Add space between modules
            if i < len(modules):
                story.append(Spacer(1, 16))
        
        return story
    
    def _build_appendix(self, course: Dict[str, Any]) -> List[Any]:
        """Build the appendix section with technical details"""
        story = []
        
        story.append(PageBreak())
        story.append(Paragraph("Appendix", self.styles['Heading1']))
        story.append(Spacer(1, 12))
        
        # Technical details
        story.append(Paragraph("Technical Details", self.styles['Heading2']))
        
        tech_details = [
            ['Course ID', course.get('id', 'N/A')],
            ['Original Learning Path ID', course.get('original_learning_path_id', 'N/A')],
            ['Folder', course.get('folder_name', 'General')],
            ['Created Date', course.get('created_at', datetime.now()).strftime('%Y-%m-%d %H:%M:%S') if isinstance(course.get('created_at'), datetime) else 'Unknown'],
            ['Last Updated', course.get('updated_at', datetime.now()).strftime('%Y-%m-%d %H:%M:%S') if isinstance(course.get('updated_at'), datetime) else 'Unknown'],
            ['Last Accessed', course.get('last_accessed', 'Never').strftime('%Y-%m-%d %H:%M:%S') if isinstance(course.get('last_accessed'), datetime) else 'Never'],
        ]
        
        if course.get('original_query'):
            tech_details.append(['Original Search Query', course.get('original_query')])
        
        tech_table = Table(tech_details, colWidths=[2*inch, 4*inch])
        tech_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(tech_table)
        story.append(Spacer(1, 12))
        
        # Generation info
        story.append(Paragraph("PDF Generation", self.styles['Heading2']))
        generation_info = f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} by AetherLearn"
        story.append(Paragraph(generation_info, self.styles['Normal']))
        
        return story
    
    async def generate_learning_path_pdf(
        self,
        learning_path: Dict[str, Any],
        query: str,
        preferences: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a PDF for a learning path (before saving as course)
        
        Args:
            learning_path: Learning path data
            query: Original search query
            preferences: User preferences used for generation
            
        Returns:
            Path to the generated PDF file
        """
        try:
            # Create filename
            title = learning_path.get('title', 'Learning_Path')
            safe_filename = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
            pdf_filename = f"{safe_filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = self.temp_dir / pdf_filename
            
            # Create PDF document
            doc = SimpleDocTemplate(
                str(pdf_path),
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Build PDF content
            story = []
            
            # Header
            story.append(Paragraph(learning_path.get('title', 'Learning Path'), self.styles['CourseTitle']))
            story.append(Spacer(1, 12))
            
            # Generation info
            info_data = [
                ['Search Query', query],
                ['Difficulty', learning_path.get('difficulty', 'Not specified')],
                ['Estimated Time', f"{learning_path.get('estimated_hours', 0)} hours"],
                ['Generated', datetime.now().strftime('%B %d, %Y at %H:%M')],
            ]
            
            if preferences:
                pref_str = ', '.join([f"{k}: {v}" for k, v in preferences.items() if v])
                if pref_str:
                    info_data.append(['Preferences', pref_str])
            
            info_table = Table(info_data, colWidths=[2*inch, 4*inch])
            info_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            
            story.append(info_table)
            story.append(Spacer(1, 20))
            
            # Description
            if learning_path.get('description'):
                story.append(Paragraph("Overview", self.styles['Heading1']))
                story.append(Paragraph(learning_path.get('description'), self.styles['Normal']))
                story.append(Spacer(1, 16))
            
            # Prerequisites
            if learning_path.get('prerequisites'):
                story.append(Paragraph("Prerequisites", self.styles['Heading2']))
                for prereq in learning_path.get('prerequisites', []):
                    story.append(Paragraph(f"• {prereq}", self.styles['Normal']))
                story.append(Spacer(1, 12))
            
            # Modules
            story.append(Paragraph("Learning Modules", self.styles['Heading1']))
            story.append(Spacer(1, 12))
            
            modules = learning_path.get('modules', [])
            for i, module in enumerate(modules, 1):
                # Module title
                module_title = f"Module {i}: {module.get('title', 'Untitled Module')}"
                story.append(Paragraph(module_title, self.styles['ModuleTitle']))
                
                # Module description
                if module.get('description'):
                    story.append(Paragraph(module.get('description'), self.styles['Description']))
                
                story.append(Spacer(1, 8))
                
                # Resources
                resources = module.get('resources', [])
                for j, resource in enumerate(resources, 1):
                    resource_title = f"{j}. {resource.get('title', 'Untitled Resource')}"
                    story.append(Paragraph(resource_title, self.styles['ResourceTitle']))
                    
                    if resource.get('description'):
                        story.append(Paragraph(resource.get('description'), self.styles['Description']))
                    
                    # Resource metadata
                    metadata_items = [
                        f"Type: {resource.get('resource_type', 'Unknown').title()}",
                        f"Source: {resource.get('source', 'Unknown')}",
                        f"Time: {resource.get('estimated_time_minutes', 0)} min",
                        f"Difficulty: {resource.get('difficulty', 'Unknown').title()}"
                    ]
                    
                    if resource.get('url'):
                        metadata_items.append(f"URL: {resource.get('url')}")
                    
                    metadata_text = " | ".join(metadata_items)
                    story.append(Paragraph(metadata_text, self.styles['Metadata']))
                    story.append(Spacer(1, 8))
                
                if i < len(modules):
                    story.append(Spacer(1, 16))
            
            # Build PDF
            await asyncio.get_event_loop().run_in_executor(None, doc.build, story)
            
            logger.info(f"Generated learning path PDF at {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating learning path PDF: {str(e)}")
            raise
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """Clean up old PDF files from temp directory"""
        try:
            current_time = datetime.now()
            for pdf_file in self.temp_dir.glob("*.pdf"):
                file_age = current_time - datetime.fromtimestamp(pdf_file.stat().st_mtime)
                if file_age.total_seconds() > max_age_hours * 3600:
                    pdf_file.unlink()
                    logger.info(f"Cleaned up old PDF file: {pdf_file}")
        except Exception as e:
            logger.error(f"Error cleaning up PDF files: {str(e)}")
