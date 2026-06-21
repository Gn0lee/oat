# Ledger Category Navigation Design

## Goal

Make the parent-to-child category flow visibly navigable while preserving the rule that system categories are read-only.

## List

- A parent row opens `/ledger/categories/[parentId]` from its main clickable area.
- Every parent row ends with `ChevronRight` to communicate navigation.
- System parents show a `기본` badge and no lock icon.
- Custom parents keep a separate `...` menu for edit and delete before the chevron.
- Parent rows remain ordered by parent `display_order`.

## Detail

- Register `/ledger/categories/[parentId]` in service route metadata as a child of `/ledger/categories` with the label `세부 카테고리`.
- Use the shared mobile child header and desktop breadcrumb instead of an inline back button.
- Keep the parent name and `세부 카테고리 관리` section header in the content.
- Child edit/delete behavior remains unchanged.

## Transition

- Add an explicit mobile drill rule from `/ledger/categories` to `/ledger/categories/*`.
- Desktop behavior remains the existing lightweight transition policy.
- Reduced-motion behavior remains unchanged.

## Picker Ordering

- Render each parent followed immediately by its children.
- Order parents by their sibling `display_order` and children by their own sibling `display_order`.
- Keep labels as `Parent > Child`; do not change API or seed ordering semantics.

## Verification

- Update category list tests for the default badge, chevron, custom action menu, and detail link.
- Update service route and transition rule tests for the dynamic child route and drill rule.
- Update category picker tests with multiple parents and children to assert grouped ordering.
- Verify the list and detail routes at mobile and desktop widths on the existing local server.
