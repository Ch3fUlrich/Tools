1. Extract state management logic from `ElterngeldOptimizer.tsx` into a custom hook `useElterngeldState.ts` inside `frontend/components/tools/elterngeld/`.
   - Move all `useState` hooks, `EXAMPLE` constant, `loadExample`, and `applySnapshot` functions.
   - Return `{ snapshot, applySnapshot, loadExample, updateField }`.
2. Extract the `useMemo` block that calculates `model` and the `warnings` logic into a custom hook `useElterngeldModel.ts` inside `frontend/components/tools/elterngeld/`.
   - Take `snapshot` and `t` as arguments.
   - Return `{ model, warnings }`.
3. Extract the right column (Results section) into a separate component `ElterngeldResults.tsx` inside `frontend/components/tools/elterngeld/`.
   - Take `model`, `warnings`, `profitDeltaKind`, and `relief` as props.
4. Refactor `ElterngeldOptimizer.tsx` to use these new hooks and component.
   - Update `Segmented` and `Field` bindings to use the new `updateField` generic state setter instead of 30+ individual `setXxx` functions.
5. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
6. Commit the changes and submit PR.
