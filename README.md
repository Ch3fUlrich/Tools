# Tools Collection

A modern, high-performance web application providing a collection of useful tools. Built with a Rust backend (Axum) for speed and security, and a Next.js frontend (React + TypeScript + Tailwind CSS) for a beautiful, responsive user experience.

## 🚀 Features

### Live Demo

🌐 **[Try it online](https://ch3fulrich.github.io/Tools/)** - Frontend deployed on GitHub Pages

> **Note**: The live demo uses a mock API for demonstration. For full functionality, deploy both frontend and backend.

### Current Tools

1. **Fat Loss Calculator**
   - Calculate the percentage of fat vs muscle loss based on calorie deficit and weight loss
   - Based on scientific formulas (1kg fat = 7000 kcal, 1kg muscle = 1200 kcal)
   - Real-time calculation with input validation

2. **N26 Transaction Analyzer**
   - Analyze N26 bank transaction data from JSON exports
   - View category totals and spending patterns
   - Secure client-side and server-side processing
   - Comprehensive transaction breakdown

## 🏗️ Architecture

### Backend (Rust + Axum)

- **Fast & Secure**: Rust provides memory safety and high performance
- **Modern Web Framework**: Axum for async HTTP handling
- **RESTful API**: Clean API design with proper error handling
- **Type Safety**: Strong typing throughout the application
- **Comprehensive Tests**: Unit and integration tests

### Frontend (Next.js + React + TypeScript)

- **Modern UI**: Built with Next.js 15 and React 19
- **Type Safety**: Full TypeScript coverage
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode**: Built-in dark mode support
- **Performance**: Optimized builds and code splitting

## 📦 Project Structure

```
Tools/
├── backend/              # Rust backend
│   ├── src/
│   │   ├── main.rs      # Application entry point
│   │   ├── api/         # API route handlers
│   │   └── tools/       # Business logic modules
│   ├── tests/           # Integration tests
│   └── Cargo.toml       # Rust dependencies
│
├── frontend/            # Next.js frontend
│   ├── app/            # Next.js app directory
│   ├── components/     # React components
│   ├── lib/           # Utilities and API client
│   └── package.json   # Node.js dependencies
│
├── docs/               # Documentation
│   ├── SECURITY.md    # Security guidelines
│   ├── DESIGN.md      # Design guidelines
│   └── CONTRIBUTING.md # Contribution guidelines
│
└── LICENSE            # MIT License
```

## 🚦 Getting Started

### Prerequisites

- **Backend**: Rust 1.75+ ([Install Rust](https://rustup.rs/))
- **Frontend**: Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ch3fUlrich/Tools.git
   cd Tools
   ```

2. **Start the backend:**
   ```bash
   cd backend
   cargo run
   ```
   The backend will start on `http://localhost:3001`

3. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The frontend will start on `http://localhost:3000`

4. **Open your browser:**
   Navigate to `http://localhost:3000`

### Quick Start (Alternative)

Use the provided script:
```bash
./start.sh          # Setup and run both servers
./start.sh setup    # Only setup without running
./start.sh backend  # Run only backend
./start.sh frontend # Run only frontend
```

### Docker Deployment

Run with Docker Compose:
```bash
docker-compose up -d
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:3001`.

To stop:
```bash
docker-compose down
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
cargo test          # Run tests
cargo clippy        # Run linter
cargo fmt --check   # Check formatting
```

### Frontend Tests

```bash
cd frontend
npm run lint        # Run ESLint
npm run build       # Test production build
```

## 🔒 Security

Security is a top priority. See [SECURITY.md](docs/SECURITY.md) for:
- Security best practices
- Vulnerability reporting
- Production deployment checklist

## 🎨 Design

Our design follows modern web standards with accessibility in mind. See [DESIGN.md](docs/DESIGN.md) for:
- Design principles
- Component guidelines
- Responsive design patterns
- Accessibility standards

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for:
- Development workflow
- Coding standards
- Pull request process
- How to add new tools

### Coding Standards

All contributions must follow our coding rules. See [CODING_RULES.md](docs/CODING_RULES.md) for:
- **Linting rules**: No trailing whitespace, clippy annotations, ESLint configuration
- **Code quality principles**: DRY, readability, usability, reproducibility
- **Language-specific guidelines**: Rust and TypeScript best practices
- **Testing requirements**: Coverage and quality standards
- **Pre-commit checklist**: What to verify before submitting code

**Key Requirements:**
- ✅ All clippy warnings must be fixed (no `clippy::` exceptions without justification)
- ✅ No trailing whitespace or extra blank lines
- ✅ Code must be formatted with `cargo fmt` and `npm run lint`
- ✅ Follow DRY principle - don't repeat yourself
- ✅ Write readable, maintainable, and reproducible code

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following [CODING_RULES.md](docs/CODING_RULES.md)
4. Test thoroughly (run linters and tests)
5. Commit with clear messages: `git commit -m "feat: Add new feature"`
6. Push to your fork: `git push origin feature/my-feature`
7. Create a Pull Request

## 📝 API Documentation

### Endpoints

**Health Check**
```
GET /api/health
```

**Fat Loss Calculator**
```
POST /api/tools/fat-loss
Content-Type: application/json

{
  "kcal_deficit": 3500,
  "weight_loss_kg": 0.5
}
```

**N26 Analyzer**
```
POST /api/tools/n26-analyzer
Content-Type: application/json

{
  "id": "user_id",
  "created": "2024-01-01",
  "data": { ... }
}
```

## 🔧 Configuration

### Environment Variables

The application uses environment variables for configuration. Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

#### Port Configuration

By default:
- **Backend**: Port `3001`
- **Frontend**: Port `3000`

To change ports, set environment variables:
```bash
export BACKEND_PORT=8080
export FRONTEND_PORT=8000
```

Or update your `.env` file:
```bash
BACKEND_PORT=8080
FRONTEND_PORT=8000
```

### Backend Configuration

#### Logging

Set the log level with `RUST_LOG` environment variable:
```bash
export RUST_LOG=debug  # Options: trace, debug, info, warn, error
cargo run
```

#### CORS Configuration

The backend uses environment-based CORS configuration for security:

**Environment Variable: `ALLOWED_ORIGINS`**
- Comma-separated list of allowed origins
- Default: `http://localhost:3000,http://localhost:3001` (for development)
- Production example: `ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`

Example:
```bash
export ALLOWED_ORIGINS="http://localhost:3000,https://example.com"
cargo run
```

For Docker deployments, set in `.env` file or `docker-compose.yml`.

### Frontend Configuration

#### API URL

Set the backend API URL with `NEXT_PUBLIC_API_URL`:
```bash
# Development (local)
export NEXT_PUBLIC_API_URL=http://localhost:3001

# Production
export NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Docker Configuration

The `docker-compose.yml` uses environment variables from `.env` file:

```bash
# Start with default ports
docker-compose up -d

# Or with custom ports
BACKEND_PORT=8080 FRONTEND_PORT=8000 docker-compose up -d
```

All configuration options in `.env.example` are supported.

## 🚀 Deployment

### Production Deployment Options

#### Option 1: Docker Deployment (Recommended)

1. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your production settings
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **Verify deployment:**
   ```bash
   docker-compose ps
   curl http://localhost:3001/api/health
   ```

#### Option 2: GitHub Pages (Frontend Only)

The frontend can be deployed to GitHub Pages automatically:

1. **Enable GitHub Pages:**
   - Go to repository Settings > Pages
   - Source: GitHub Actions

2. **Push to main branch:**
   The GitHub Actions workflow will automatically build and deploy

3. **Access your site:**
   - Your site will be available at: `https://ch3fulrich.github.io/Tools/`
   - Update `NEXT_PUBLIC_API_URL` to point to your backend

**Note**: GitHub Pages only hosts the frontend. You'll need to deploy the backend separately.

#### Option 3: Manual Backend Deployment

1. **Build release binary:**
   ```bash
   cd backend
   cargo build --release
   ```

2. **Copy binary to server:**
   ```bash
   scp target/release/tools-backend user@server:/opt/tools/
   ```

3. **Run on server:**
   ```bash
   ssh user@server
   cd /opt/tools
   export ALLOWED_ORIGINS="https://yourdomain.com"
   export RUST_LOG=info
   ./tools-backend
   ```

#### Option 4: Manual Frontend Deployment

1. **Build for production:**
   ```bash
   cd frontend
   npm ci
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Or deploy to Vercel/Netlify:**
   - Connect your repository
   - Set `NEXT_PUBLIC_API_URL` environment variable
   - Deploy automatically on push

### Backend Deployment

1. Build release binary:
   ```bash
   cd backend
   cargo build --release
   ```

2. Binary will be in `target/release/tools-backend`

3. Deploy to your server and run

### Frontend Deployment

1. Build for production:
   ```bash
   cd frontend
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Or deploy to Vercel/Netlify for automatic deployment

## 📄 License

This project is fully open source and licensed under the [MIT License](LICENSE).

You are free to use, modify, and distribute this software. See the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Rust](https://www.rust-lang.org/) and [Axum](https://github.com/tokio-rs/axum)
- Frontend powered by [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

## 📧 Contact

For questions, suggestions, or issues, please:
- Open an issue on GitHub
- Start a discussion in GitHub Discussions

## 🗺️ Roadmap

Future enhancements:
- [ ] Additional financial analysis tools
- [ ] Data visualization charts
- [ ] Export functionality
- [ ] User preferences storage
- [ ] More health and fitness calculators
- [ ] API rate limiting
- [ ] Authentication system
- [ ] Mobile app versions

## 🔄 Releases

### Automated Releases

This project uses automated releases via GitHub Actions:

1. **Create a release:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Automatic build process:**
   - Backend binary is compiled for Linux
   - Frontend is built for production
   - Release artifacts are created with checksums
   - GitHub Release is created with changelog

3. **Download releases:**
   - Visit the [Releases page](https://github.com/Ch3fUlrich/Tools/releases)
   - Download pre-built binaries and builds
   - Each release includes SHA256 checksums for verification

### Creating a Release

For maintainers:

1. Update version in `CHANGELOG.md`
2. Commit the changes
3. Create and push a version tag:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```
4. GitHub Actions will automatically build and create the release

---

Made with ❤️ by the community
