1. Use `run_in_bash_session` to execute a script `refactor.py` that handles creating the new files `useElterngeldState.ts`, `useElterngeldModel.ts`, `ElterngeldResults.tsx` and refactors `ElterngeldOptimizer.tsx`.
2. Use `run_in_bash_session` to verify the creation and refactoring of files by `cat`ing them.
3. Use `run_in_bash_session` to run `cd frontend && pnpm install --no-frozen-lockfile`.
4. Use `run_in_bash_session` to run `cd frontend && npx tsc --noEmit`.
5. Use `run_in_bash_session` to run `cd frontend && pnpm lint`.
6. Use `run_in_bash_session` to run `cd backend && cargo fmt`.
7. Use `run_in_bash_session` to run `cd backend && cargo fmt -- --check`.
8. Use `run_in_bash_session` to run `cd backend && cargo clippy -- -D warnings`.
9. Use `run_in_bash_session` to run `cd backend && cargo test`.
10. Use `run_in_bash_session` to run `cd frontend && pnpm test --run`.
11. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
12. Use `submit` to commit the changes and submit PR. Branch name: `refactor/elterngeld-optimizer`. Commit message: `refactor: extract ElterngeldOptimizer state and model logic`. PR Title: `🧹 [Refactor ElterngeldOptimizer for code health]`. PR Description sections: 🎯 What, 💡 Why, ✅ Verification, ✨ Result.
