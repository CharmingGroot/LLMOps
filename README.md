# LLMOps Platform

Modular ML Pipeline Orchestration Platform with TypeScript/Node.js

## Architecture

- **Monorepo Structure**: pnpm workspace
- **Backend**: TypeScript + Node.js
- **Frontend**: React + TypeScript
- **State Management**: MLflow
- **Orchestration**: Custom Pipeline Engine
- **Modularity**: Registry/Plugin Pattern

## Project Structure

```
llmops/
├── packages/              # TypeScript/Node.js packages
│   ├── core/             # Common types & utilities
│   ├── state/            # MLflow client
│   ├── orchestrator/     # Pipeline execution engine
│   ├── cli/              # CLI tools
│   ├── dashboard-api/    # Backend API
│   └── dashboard-ui/     # React Frontend
├── modules/              # Python AI modules
│   ├── preprocess/
│   ├── train/
│   ├── benchmark/
│   └── deploy/
└── config/               # Configuration files
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Python >= 3.10
- MLflow

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode
pnpm dev
```

### Usage

```bash
# Run pipeline
llmops run --config config/pipeline.yaml

# Run individual stage
llmops stage train --run-id <run-id> --config config/stages/train.yaml

# Check status
llmops status --run-id <run-id>
```

## Development

Each package can be developed independently:

```bash
# Work on core package
cd packages/core
pnpm dev

# Work on orchestrator
cd packages/orchestrator
pnpm dev
```

## License

MIT
