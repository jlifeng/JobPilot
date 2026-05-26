# brainstorm: reorder project entries

## Goal

Allow users to reorder individual project entries inside the resume editor's Projects section, instead of only being able to reorder top-level resume sections such as Projects, Summary, and Work Experience.

## What I already know

* The current pain point is inside the Projects section: a user may write three projects and later want to adjust their order.
* The editor already supports top-level section drag sorting.
* Web editor project entries are rendered in `src/components/editor/sections/projects.tsx`.
* Desktop editor project entries are rendered in `desktop/src/components/editor/sections/projects.tsx`.
* Project entries are stored as `ProjectsContent.items`; changing item order only needs to reorder this array.
* `src/stores/resume-store.ts` already normalizes item ids, updates section content, and autosaves changed sections.
* The project already depends on `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` in both web and desktop packages.

## Assumptions

* Reordering project entries should affect preview and export because templates render `ProjectsContent.items` in order.
* The MVP should support drag handle sorting and should not require new database fields.
* Web and desktop should stay behaviorally consistent.
* Item-level sorting should be scoped to project entries only for the first pass, unless we decide to generalize it to other repeated sections.

## Open Questions

* Should this first version only support Projects, or should it also cover other repeated sections like Work Experience, Education, Certifications, Languages, GitHub, and custom entries?

## Requirements

* Add item-level reorder controls inside the Projects section.
* Reordering an item updates `content.items` in the selected Projects section.
* Top-level section dragging must continue to work.
* Dragging a project entry must not accidentally drag the whole Projects section.
* Text inputs, date pickers, rich text, list editing, add, and delete interactions must keep working.
* The rendered preview/export order should match the edited item order.
* Support keyboard-accessible sorting where feasible through the existing `dnd-kit` sortable pattern.

## Acceptance Criteria

* [ ] Given a Projects section with at least three entries, dragging the third entry above the first persists the new order in `content.items`.
* [ ] The top-level Projects section can still be dragged among other resume sections using its existing module handle.
* [ ] Editing fields inside a project item does not start dragging.
* [ ] Deleting or adding a project after reordering preserves the expected item order.
* [ ] Web editor and desktop editor expose the same item sorting behavior.
* [ ] Type check and relevant lint/build checks pass or any unrelated pre-existing failures are documented.

## Definition of Done

* Tests added or updated where the codebase has suitable coverage for editor behavior.
* Type check and lint run for touched front-end code.
* Manual browser or desktop verification confirms project item reorder and module reorder do not conflict.
* No unrelated dirty files are staged.

## Out of Scope

* Cross-section dragging of items.
* Moving a project entry into another section.
* Changing preview/export templates.
* Creating a new sorting persistence field.
* Redesigning the whole resume editor.

## Technical Notes

* Existing section-level sorting lives in `src/components/editor/editor-canvas.tsx` and `src/components/editor/dnd/sortable-section.tsx`.
* `SortableSection` exposes drag handle listeners through context, so the outer section only drags from the module header handle.
* Recommended implementation is an inner sortable list for project items with a separate item drag handle.
* Use stable item ids. The store already fills missing ids during normalization, but newly added items should continue to call `generateId()`.
* Prefer `arrayMove` from `@dnd-kit/sortable` over manual splice logic for item arrays.
* Official `dnd-kit` sortable docs recommend `SortableContext`, `useSortable`, `arrayMove`, and `sortableKeyboardCoordinates` for sortable lists: https://docs.dndkit.com/presets/sortable

## Recommended MVP

Add a small drag handle next to each project number, for example `GripVertical #1`. The handle reorders only project cards. Keep delete on the right side. Do not make the whole project card draggable, because the card contains editable inputs and rich text.

Implementation should likely add a reusable editor item sortable wrapper if Work Experience and Education will follow soon; otherwise, a local `SortableProjectItem` inside the Projects section is acceptable for the first pass.
