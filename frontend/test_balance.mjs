// Quick RPC balance check - run with: node test_balance.mjs
const ADDRESS = "0x85F52C53478CD87f571cE18a4a6e43AeBB5DA9D3";
const RPCS = [
  "https://rpc.mantle.xyz",
  "https://mantle-mainnet.public.blastapi.io",
  "https://mantle.drpc.org",
];

async function checkBalance(rpc) {
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [ADDRESS, "latest"],
        id: 1,
      }),
    });
    const data = await res.json();
    const balanceWei = BigInt(data.result);
    const balanceMNT = Number(balanceWei) / 1e18;
    console.log(`✅ ${rpc}`);
    console.log(`   Balance: ${balanceMNT.toFixed(6)} MNT`);
  } catch (err) {
    console.log(`❌ ${rpc}: ${err.message}`);
  }
}

console.log(`Checking MNT balance for ${ADDRESS}...\n`);
for (const rpc of RPCS) {
  await checkBalance(rpc);
}
