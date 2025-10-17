# Tools Collection

A modern, high-performance web application providing a collection of useful tools. Built with a Rust backend (Axum) for speed and security, and a Next.js frontend (React + TypeScript + Tailwind CSS) for a beautiful, responsive user experience.

## 🚀 Features

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

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m "feat: Add new feature"`
5. Push to your fork: `git push origin feature/my-feature`
6. Create a Pull Request

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

### Backend

Default port: `3001`

To change, set the port in `backend/src/main.rs`:
```rust
let listener = tokio::net::TcpListener::bind("0.0.0.0:YOUR_PORT").await.unwrap();
```

### Frontend

Default port: `3000`

To change the API URL, set environment variable:
```bash
NEXT_PUBLIC_API_URL=http://localhost:YOUR_PORT
```

## 🚀 Deployment

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

---

Made with ❤️ by the community
