import asyncio
from web3 import AsyncWeb3, AsyncHTTPProvider

RPC = "https://rpc.mantle.xyz"
FACTORY = "0xea0005B1728256F2dfc11b156557F83f9472e3FA"
WMETH = "0xcDA86A272531e8640cD7F1a92c01839911B90bb0"
USDC = "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9"

MOE_FACTORY_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "tokenA", "type": "address"},
            {"internalType": "address", "name": "tokenB", "type": "address"},
            {"internalType": "uint16", "name": "binStep", "type": "uint16"}
        ],
        "name": "getLBPairInformation",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint16", "name": "binStep", "type": "uint16"},
                    {"internalType": "address", "name": "LBPair", "type": "address"},
                    {"internalType": "bool", "name": "createdByOwner", "type": "bool"},
                    {"internalType": "bool", "name": "ignoredForRouting", "type": "bool"}
                ],
                "internalType": "struct ILBFactory.LBPairInformation",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

async def main():
    w3 = AsyncWeb3(AsyncHTTPProvider(RPC))
    factory = w3.eth.contract(address=w3.to_checksum_address(FACTORY), abi=MOE_FACTORY_ABI)
    
    # binStep is typically 10, 15, 20, etc. for Trader Joe.
    for binStep in [10, 15, 20, 25, 50, 100]:
        try:
            res = await factory.functions.getLBPairInformation(
                w3.to_checksum_address(WMETH),
                w3.to_checksum_address(USDC),
                binStep
            ).call()
            print(f"binStep={binStep} => {res}")
        except Exception as e:
            print(f"binStep={binStep} failed: {e}")

asyncio.run(main())
