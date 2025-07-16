# Texas Hold'em Poker Game

A sophisticated cross-platform Texas Hold'em poker game with real-time multiplayer functionality, responsive UI design, and immersive gameplay experience.

## Features

- **Real-time Multiplayer**: WebSocket-powered real-time gameplay
- **Cross-Platform UI**: Responsive design for desktop, tablet, and mobile
- **Comprehensive Game Logic**: Complete Texas Hold'em rules implementation
- **Player Management**: Room creation, joining, and host controls
- **Game Settings**: Customizable starting chips and blind levels
- **Mobile Optimized**: Touch-friendly mobile interface

## Tech Stack

- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket
- **Real-time Communication**: WebSocket (ws)
- **UI Components**: Radix UI, shadcn/ui
- **Build Tool**: Vite

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open http://localhost:5000 in your browser

## Production Build

```bash
npm run build
npm start
```

## Deployment on Render

This project is configured for deployment on Render with the included `render.yaml` file.

### Render Deployment Steps:

1. Push your code to GitHub
2. Connect your GitHub repository to Render
3. Render will automatically detect the `render.yaml` configuration
4. The build process will run `npm install && npm run build`
5. The app will start with `npm start`

### Environment Variables

The app automatically uses Render's provided PORT environment variable. No additional configuration needed.

## Game Rules

- Standard Texas Hold'em rules
- 2-8 players per game
- Customizable starting chips and blinds
- Automatic blind increases when players are eliminated
- Host controls for game management

## Project Structure

```
├── client/src/          # React frontend
├── server/              # Express backend
├── shared/              # Shared types and schemas
├── package.json         # Dependencies and scripts
├── render.yaml          # Render deployment config
└── README.md           # This file
```

## License

MIT License