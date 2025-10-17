# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-17

### Major Transformation

Complete repository transformation from Jupyter notebooks to production-ready web application.

### Added

#### Backend (Rust + Axum)
- Rust backend with Axum web framework
- Fat Loss Calculator API endpoint (`/api/tools/fat-loss`)
- N26 Transaction Analyzer API endpoint (`/api/tools/n26-analyzer`)
- Health check endpoint (`/api/health`)
- Comprehensive unit tests (8 tests, 100% passing)
- CORS configuration for frontend integration
- Error handling and input validation
- Type-safe data structures with Serde

#### Frontend (Next.js + React + TypeScript)
- Next.js 15 application with React 19
- TypeScript for full type safety
- Tailwind CSS for responsive styling
- Fat Loss Calculator UI component
- N26 Transaction Analyzer UI component
- Dark mode support
- Mobile-responsive design
- Tool selection interface
- API client library

#### Documentation
- `README.md` - Complete project documentation
- `docs/SECURITY.md` - Security guidelines and best practices
- `docs/DESIGN.md` - Design principles and component guidelines
- `docs/CONTRIBUTING.md` - Contribution guidelines and workflow
- MIT License for open source

#### Development Tools
- GitHub Actions CI/CD for backend
- GitHub Actions CI/CD for frontend
- Rust formatting with `rustfmt`
- Rust linting with `clippy`
- ESLint configuration for frontend
- `.gitignore` for proper file exclusion
- `start.sh` quick start script

### Changed
- Converted Fat Loss calculations from Python notebook to Rust module
- Converted N26 analyzer from Python notebook to Rust module
- Modernized project structure with monorepo layout
- Updated README with comprehensive documentation

### Removed
- Jupyter notebook files (moved to `archive/` directory)
- Python dependencies

### Technical Details

**Backend Stack:**
- Rust 1.75+
- Axum 0.7
- Tokio async runtime
- Serde for JSON serialization
- Chrono for date handling

**Frontend Stack:**
- Next.js 15.5
- React 19
- TypeScript 5
- Tailwind CSS
- ESLint

**Architecture:**
- RESTful API design
- Modular component structure
- Type-safe end-to-end
- Mobile-first responsive design
- Dark mode support

**Quality Assurance:**
- 8 backend unit tests
- Clippy linting with zero warnings
- ESLint with zero errors
- Production build successful
- Code review passed

[0.1.0]: https://github.com/Ch3fUlrich/Tools/releases/tag/v0.1.0
