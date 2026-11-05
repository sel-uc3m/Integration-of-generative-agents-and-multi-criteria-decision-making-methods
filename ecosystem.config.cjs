const path = require("path");
const fs = require("fs");

// Detectar puerto configurado en .env o por variable de entorno (por defecto 3000)
let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
try {
  const envPath = path.resolve(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const portMatch = envContent.match(/^PORT\s*=\s*(\d+)/m);
    if (portMatch) {
      port = parseInt(portMatch[1], 10);
    }
  }
} catch {
  // Mantener fallback
}

module.exports = {
  apps: [
    {
      name: "Metodologia-Integracion-Agentes-Preproyecto",
      cwd: "./web",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${port}`,
      exec_mode: "fork",
      instances: 1, // Mantener 1 instancia para preservar el checkpointer MemorySaver de LangGraph y la base de datos SQLite
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      env: {
        NODE_ENV: "production",
        PORT: port,
        OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
        EVAL_MODEL: process.env.EVAL_MODEL || "deepseek-r1:7b",
      },
    },
  ],
};

