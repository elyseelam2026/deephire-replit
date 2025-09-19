# DeepHire Design Guidelines

## Design Approach: Enterprise-First with Modern Touches
**Selected Approach:** Design System (Material Design/Carbon hybrid)
**Justification:** B2B recruiting platform requiring trust, professionalism, and data-heavy interfaces. Utility-focused with enterprise users prioritizing efficiency and reliability.

## Core Design Elements

### Color Palette
**Primary:** 220 85% 25% (Deep navy blue for trust and professionalism)
**Secondary:** 220 15% 96% (Light gray backgrounds)
**Accent:** 142 76% 36% (Professional green for success states)
**Dark Mode Primary:** 220 85% 85% (Light blue on dark)
**Text:** 220 15% 20% (Dark gray) / 220 15% 90% (Light on dark)

### Typography
- **Primary:** Inter (Google Fonts) - Clean, professional, excellent readability
- **Display:** Inter Bold for headings and CTAs
- **Body:** Inter Regular/Medium for content
- **Code/Data:** JetBrains Mono for candidate IDs and technical details

### Layout System
**Tailwind Spacing:** Primary units of 4, 6, and 8 (p-4, m-6, h-8)
- Consistent 6-unit spacing between major sections
- 4-unit internal component spacing
- 8-unit margins for page containers

### Component Library
**Navigation:** Fixed sidebar with collapsible sections for portal switching
**Data Tables:** Clean, sortable tables with alternating row colors and hover states
**Cards:** Elevated cards with subtle shadows for candidate profiles and job listings
**Forms:** Consistent input styling with clear labels and validation states
**Buttons:** Primary (filled), Secondary (outline), and Ghost variants
**Modals:** Center-positioned overlays with backdrop blur for detailed views

## Portal-Specific Design

### Client Portal
- **Dashboard:** KPI cards with candidate pipeline metrics
- **Job Management:** Tabbed interface for active/draft/completed postings
- **Candidate Longlists:** Grid/list toggle with filtering sidebar
- **Color Focus:** Navy primary with green success indicators

### Candidate Portal
- **Profile Builder:** Progressive disclosure wizard with completion indicators
- **Job Recommendations:** Card-based layout with match percentages
- **Application Tracking:** Timeline-style status updates
- **Color Focus:** Warmer secondary blues with achievement greens

## Key UI Patterns
**AI Matching Indicators:** Percentage badges with color-coded confidence levels
**Status Indicators:** Dot notation with consistent color mapping across portals
**Upload Areas:** Drag-and-drop zones with clear visual feedback
**Search/Filter:** Persistent filter panels with applied filter chips

## Images
**Hero Image:** No large hero - this is a utility-focused B2B application
**Profile Images:** Circular avatar placeholders for candidates
**Company Logos:** Square containers with rounded corners for client branding
**Icons:** Heroicons for consistency - use outline style for navigation, filled for actions

The design prioritizes data density, quick scanning, and professional aesthetics suitable for HR professionals and enterprise clients.