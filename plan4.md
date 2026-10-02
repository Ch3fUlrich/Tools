1. Use `run_in_bash_session` with `cat << 'EOF' > frontend/components/tools/elterngeld/useElterngeldState.ts` to write the exact state management code.
2. Use `read_file` to verify the creation of `frontend/components/tools/elterngeld/useElterngeldState.ts`.
3. Use `run_in_bash_session` with `cat << 'EOF' > frontend/components/tools/elterngeld/useElterngeldModel.ts` to write the exact model code.
4. Use `read_file` to verify the creation of `frontend/components/tools/elterngeld/useElterngeldModel.ts`.
5. Use `run_in_bash_session` with `cat << 'EOF' > frontend/components/tools/elterngeld/ElterngeldResults.tsx` to write the exact results component code.
6. Use `read_file` to verify the creation of `frontend/components/tools/elterngeld/ElterngeldResults.tsx`.
7. Use `write_file` to overwrite `frontend/components/tools/ElterngeldOptimizer.tsx` with the exact refactored contents. I am doing this instead of `replace_with_git_merge_diff` because replacing 370 lines via diff is problematic and writing the full file is safer.
8. Use `read_file` to verify the refactored `frontend/components/tools/ElterngeldOptimizer.tsx`.
9. Use `run_in_bash_session` to run `rm refactor.py test_plan.sh plan.md plan2.md plan3.md plan4.md frontend/components/tools/ElterngeldOptimizer.tsx.new` to clean up temporary files.
10. Use `run_in_bash_session` to run `cd frontend && pnpm install --no-frozen-lockfile`.
11. Use `run_in_bash_session` to run `cd frontend && npx tsc --noEmit`.
12. Use `run_in_bash_session` to run `cd frontend && pnpm lint`.
13. Use `run_in_bash_session` to run `cd backend && cargo fmt`.
14. Use `run_in_bash_session` to run `cd backend && cargo fmt -- --check`.
15. Use `run_in_bash_session` to run `cd backend && cargo clippy -- -D warnings`.
16. Use `run_in_bash_session` to run `cd backend && cargo test`.
17. Use `run_in_bash_session` to run `cd frontend && pnpm test --run`.
18. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
19. Use `submit` to commit the changes and submit PR. Branch name: `refactor/elterngeld-optimizer`. Commit message: `refactor: extract ElterngeldOptimizer state and model logic`. PR Title: `🧹 [Refactor ElterngeldOptimizer for code health]`. PR Description sections: 🎯 What, 💡 Why, ✅ Verification, ✨ Result.
