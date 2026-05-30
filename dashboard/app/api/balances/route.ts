import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const telemetryFilePath = path.resolve(process.cwd(), '../telemetry/event_stream.json');
  
  // Base State as defined in the dashboard_revision blueprint
  let balances: Record<string, number> = {
    MNT: 1420.50,
    WMETH: 1.25,
    USDC: 500.00,
    USDY: 0.00
  };

  try {
    if (fs.existsSync(telemetryFilePath)) {
      const content = fs.readFileSync(telemetryFilePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      lines.forEach(line => {
        try {
          const event = JSON.parse(line);
          
          // Detect successful Peg Arbitrage swaps by the CLI Wrapper
          if (
            event.component === 'cli_wrapper' &&
            event.action === 'run_byreal_cli' &&
            event.level === 'SUCCESS' &&
            event.metadata &&
            event.metadata.command
          ) {
            const cmd = event.metadata.command;
            
            if (cmd.includes('swap')) {
              const fromMatch = cmd.match(/--from (\w+)/);
              const toMatch = cmd.match(/--to (\w+)/);
              const amountMatch = cmd.match(/--amount (\d+(\.\d+)?)/);

              if (fromMatch && toMatch && amountMatch) {
                const fromToken = fromMatch[1];
                const toToken = toMatch[1];
                const amount = parseFloat(amountMatch[1]);

                if (balances[fromToken] !== undefined) {
                  balances[fromToken] -= amount;
                }
                
                if (balances[toToken] !== undefined) {
                  balances[toToken] += amount; // Assumes 1:1 nominal for mockup
                }
              }
            }
          }
        } catch (e) {
          // Ignore invalid JSON lines
        }
      });
    }
  } catch (err) {
    console.error("Failed to read telemetry for balances:", err);
  }

  return NextResponse.json(balances);
}
