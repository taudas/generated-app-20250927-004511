# AuraStream

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/taudas/generated-app-20250927-004511)

AuraStream is a visually stunning, minimalist single-page web application designed for the pure and simple purpose of playing a single, dedicated audio stream. The user interface is crafted to be clean, intuitive, and distraction-free, focusing entirely on the listening experience. The aesthetic follows minimalist design principles, employing a serene color palette, generous white space, and elegant typography to create a calm and immersive atmosphere.

## Key Features

- **Minimalist Audio Player**: A clean, single-purpose interface for audio streaming.
- **Intuitive Controls**: Simple play/pause and volume slider controls.
- **Visual Feedback**: A subtle, pulsing glow on the play button indicates when the stream is live.
- **Elegant Design**: A serene color palette, beautiful typography, and a subtle gradient background create a calming user experience.
- **Fully Responsive**: Flawless layout and functionality across all device sizes, from mobile to desktop.
- **Zero Distractions**: The UI is focused solely on the listening experience without any unnecessary clutter.

## Technology Stack

- **Frontend**: React, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Icons**: Lucide React
- **Animation**: Framer Motion
- **Deployment**: Cloudflare Workers

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.
- [Git](https://git-scm.com/) for cloning the repository.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/aura-stream-player.git
    cd aura-stream-player
    ```

2.  **Install dependencies:**
    ```sh
    bun install
    ```

## Development

To run the application in development mode with hot-reloading, use the following command:

```sh
bun run dev
```

This will start the Vite development server, typically available at `http://localhost:3000`.

## Building for Production

To create a production-ready build of the application, run:

```sh
bun run build
```

This command bundles the application and outputs the static assets to the `dist` directory, ready for deployment.

## Deployment

This project is configured for seamless deployment to the Cloudflare global network.

### Deploy with Wrangler CLI

1.  **Authenticate with Cloudflare:**
    If you haven't already, log in to your Cloudflare account.
    ```sh
    bunx wrangler login
    ```

2.  **Deploy the application:**
    Run the deploy script, which will build the project and deploy it using Wrangler.
    ```sh
    bun run deploy
    ```

### Deploy with the Cloudflare Button

You can also deploy this project directly to your Cloudflare account by clicking the button below.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/taudas/generated-app-20250927-004511)

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.