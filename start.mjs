// Wrapper to ensure the bundled server runs from the repo root
// This fixes path resolution for dist/public static files in production
import('./dist/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
