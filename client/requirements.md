## Packages
react-zoom-pan-pinch | Provides the highly performant pan and zoom functionality required for the infinite canvas.
uuid | For generating unique IDs for tables, columns, and relationships.
@types/uuid | Type definitions for uuid.
date-fns | Formatting dates if needed for exports or history logs.

## Notes
- State is 100% client-side using `localStorage`. No backend API integration is required for the core canvas state.
- The infinite canvas relies on calculating exact pixel positions for SVG relationship lines. Tables have a fixed width of 288px (`w-72`) to make these math calculations highly performant without needing DOM refs during render cycles.
- Drag-and-drop is implemented via standard Pointer Events rather than heavy libraries to ensure it works smoothly inside the zoom/pan wrapper.
