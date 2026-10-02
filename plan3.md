1. Use `run_in_bash_session` to execute a script `generate_state.py` containing `cat << 'EOF' > frontend/components/tools/elterngeld/useElterngeldState.ts` to write the exact state management code.
2. Use `run_in_bash_session` to verify the creation of `useElterngeldState.ts` using `cat`.
3. Use `run_in_bash_session` to execute a script `generate_model.py` containing `cat << 'EOF' > frontend/components/tools/elterngeld/useElterngeldModel.ts` to write the exact model code.
4. Use `run_in_bash_session` to verify the creation of `useElterngeldModel.ts` using `cat`.
5. Use `run_in_bash_session` to execute a script `generate_results.py` containing `cat << 'EOF' > frontend/components/tools/elterngeld/ElterngeldResults.tsx` to write the exact results component code.
6. Use `run_in_bash_session` to verify the creation of `ElterngeldResults.tsx` using `cat`.
7. Use `run_in_bash_session` to execute a script `refactor_main.py` which reads `ElterngeldOptimizer.tsx` and writes the modified code to `ElterngeldOptimizer.tsx` replacing the extracted sections.
8. Use `run_in_bash_session` to verify the refactored `ElterngeldOptimizer.tsx` using `cat`.
9. Use `run_in_bash_session` to run `cd frontend && pnpm install --no-frozen-lockfile`.
10. Use `run_in_bash_session` to run `cd frontend && npx tsc --noEmit`.
11. Use `run_in_bash_session` to run `cd frontend && pnpm lint`.
12. Use `run_in_bash_session` to run `cd backend && cargo fmt`.
13. Use `run_in_bash_session` to run `cd backend && cargo fmt -- --check`.
14. Use `run_in_bash_session` to run `cd backend && cargo clippy -- -D warnings`.
15. Use `run_in_bash_session` to run `cd backend && cargo test`.
16. Use `run_in_bash_session` to run `cd frontend && pnpm test --run`.
17. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
18. Use `submit` to commit the changes and submit PR. Branch name: `refactor/elterngeld-optimizer`. Commit message: `refactor: extract ElterngeldOptimizer state and model logic`. PR Title: `🧹 [Refactor ElterngeldOptimizer for code health]`. PR Description sections: 🎯 What, 💡 Why, ✅ Verification, ✨ Result.
