# LinkBoard - Dolt Enterprise Bookmarks

[![CI](https://github.com/# TODO: replace with your GitHub username/linkboard/actions/workflows/ci.yml/badge.svg)](https://github.com/# TODO: replace with your GitHub username/linkboard/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/# TODO: replace with your GitHub username/linkboard)](https://github.com/# TODO: replace with your GitHub username/linkboard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node Version](https://img.shields.io/badge/node-22-blue)

A self-hosted personal bookmarks manager built for speed, simplicity, and total control over your data.

![LinkBoard Screenshot](docs/screenshot.png)

## Features
- **Multi-user Support**: Secure registration and session-based login.
- **Categories & Colors**: Organize links by category with custom hex color swatches.
- **Full-Text Search**: Search across titles, URLs, descriptions, and tags.
- **Favicon Auto-Fetching**: Uses Google's favicon service for visual flair.
- **Zero-Install Binary**: Distributed as a Single Executable Application (SEA).
- **Responsive UI**: Classic Bootstrap 3 interface with premium Navy & Gold aesthetics.

## Quick Start

### 1. Download Binary
Go to the [Latest Release](https://github.com/# TODO: replace with your GitHub username/linkboard/releases/latest) and download the binary for your platform.
```bash
./linkboard
```

### 2. Run from Source
```bash
git clone https://github.com/# TODO: replace with your GitHub username/linkboard.git
cd linkboard
npm install
npm start
```

### 3. Docker One-Liner
```bash
docker build -t linkboard .
docker run -p 3000:3000 -v $(pwd)/data:/app/data linkboard
```

## Configuration
| Var | Default | Description |
|---|---|---|
| PORT | 3000 | Port the server listens on |
| SESSION_SECRET | dolt-secret | Secret for signing session cookies |
| NODE_ENV | production | Environment mode |
| DB_PATH | ./bookmarks.sqlite | Path to the SQLite database file |

## Distribution: single executable
LinkBoard uses Node.js SEA (Single Executable Application) to bundle the runtime, code, and assets into a single binary.
To build it yourself:
```bash
npm run build-sea
```
This generates `linkboard` (or `linkboard.exe`) which can be moved and run on any machine without Node.js installed.

## Development
- `npm run dev`: Start with nodemon for hot-reloading.
- `npm test`: Run basic connectivity and logic tests.
- `npm run lint`: Check code quality with ESLint.

## Contributing
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License
Distributed under the MIT License. See `LICENSE` for more information.
