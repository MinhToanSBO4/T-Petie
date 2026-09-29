const routes = ['/', '/api/products?limit=48', '/api/collections', '/bo-suu-tap', '/sale'];
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function main() {
  for (const path of routes) {
    const times = [];
    for (let i = 0; i < 2; i++) {
      const start = performance.now();
      const response = await fetch(new URL(path, base));
      await response.arrayBuffer();
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      times.push(Math.round(performance.now() - start));
    }
    console.log(`${path}: first ${times[0]}ms, warm ${times[1]}ms`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
