import os
from typing import Dict, Any, Optional, Tuple
from web3 import AsyncWeb3
from web3.providers import AsyncHTTPProvider
from core.observability.decision_log import log_telemetry_event

# ---------------------------------------------------------------------------
# Minimal ERC-20 ABI (balanceOf + decimals only)
# ---------------------------------------------------------------------------
ERC20_ABI: list[Dict[str, Any]] = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function",
    },
]

# ---------------------------------------------------------------------------
# Minimal Uniswap V3-style Pool ABI (slot0 only)
# ---------------------------------------------------------------------------
UNIV3_POOL_ABI: list[Dict[str, Any]] = [
    {
        "inputs": [],
        "name": "slot0",
        "outputs": [
            {"internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
            {"internalType": "int24",   "name": "tick",           "type": "int24"},
            {"internalType": "uint16",  "name": "observationIndex",         "type": "uint16"},
            {"internalType": "uint16",  "name": "observationProcess",       "type": "uint16"},
            {"internalType": "uint16",  "name": "observationCardinalityLimit", "type": "uint16"},
            {"internalType": "uint8",   "name": "feeProtocol",   "type": "uint8"},
            {"internalType": "bool",    "name": "unlocked",       "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    }
]

# ---------------------------------------------------------------------------
# Agni Finance V3 Factory ABI (getPool)
# ---------------------------------------------------------------------------
AGNI_FACTORY_ABI: list[Dict[str, Any]] = [
    {
        "inputs": [
            {"internalType": "address", "name": "tokenA", "type": "address"},
            {"internalType": "address", "name": "tokenB", "type": "address"},
            {"internalType": "uint24", "name": "fee", "type": "uint24"}
        ],
        "name": "getPool",
        "outputs": [{"internalType": "address", "name": "pool", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# ---------------------------------------------------------------------------
# Merchant Moe (Trader Joe V2) Factory ABI
# ---------------------------------------------------------------------------
MOE_FACTORY_ABI: list[Dict[str, Any]] = [
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


class OnChainClient:
    """
    Direct, async cryptographic connection layer to the Mantle Network.

    Provides:
      - Native MNT and ERC-20 balance reads.
      - Live AMM price derivation via Uniswap V3 slot0 (sqrtPriceX96).
      - Dual-pool spread calculation for volatile Blue-Chip assets (WMETH, FBTC).
    """

    def __init__(self, rpc_url: Optional[str] = None) -> None:
        env_rpc: str = os.getenv("MANTLE_RPC_URL", "").strip()
        self.rpc_url: str = env_rpc if env_rpc else (rpc_url or "https://rpc.mantle.xyz")

        self.w3: AsyncWeb3 = AsyncWeb3(AsyncHTTPProvider(self.rpc_url))

        # ------------------------------------------------------------------
        # Whitelisted ERC-20 contract registry (Mantle Mainnet)
        # Source of truth: docs/verified_assets.md — MantleScan verified
        # ------------------------------------------------------------------
        self.token_addresses: Dict[str, str] = {
            # ── Volatile Blue-Chips ───────────────────────────────────────
            "WMETH": self.w3.to_checksum_address("0xcDA86A272531e8640cD7F1a92c01839911B90bb0"),  # 18 dec
            "FBTC":  self.w3.to_checksum_address("0xC96dE26018A54D51c097160568752c4E3BD6C364"),  # 8 dec — Function Bitcoin
            # ── Stablecoins / Base Assets ─────────────────────────────────
            "USDC":  self.w3.to_checksum_address("0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9"),  # 6 dec — Bridged USDC
            "USDY":  self.w3.to_checksum_address("0x5bE26527e817998A7206475496fDE1E68957c5A6"),  # 18 dec
            "MNT":   self.w3.to_checksum_address("0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8"),  # 18 dec — Wrapped MNT (WMNT)
        }

        # ------------------------------------------------------------------
        # Dual-pool registry for spread calculation.
        # Key: (token_symbol, dex_name)  →  Value: checksummed pool address
        #
        # Decimal adjustment factor per pair (token1_decimals - token0_decimals):
        #   WMETH/USDC → 18 - 6 = 12  →  factor = 10^12
        #   FBTC/USDC  →  8 - 6 =  2  →  factor = 10^2
        #
        # TODO: Replace sentinel addresses below with verified Agni Finance
        #       and Merchant Moe pool addresses once sourced from MantleScan.
        # ------------------------------------------------------------------
        self.pool_registry: Dict[Tuple[str, str], str] = {
            # ── WMETH/USDC pools ──────────────────────────────────────────
            ("WMETH", "agni"):         self.w3.to_checksum_address("0xdeaddeaddeaddeaddeaddeaddeaddeaddead1001"),
            ("WMETH", "merchant_moe"): self.w3.to_checksum_address("0xdeaddeaddeaddeaddeaddeaddeaddeaddead1002"),
            # ── FBTC/USDC pools ───────────────────────────────────────────
            ("FBTC", "agni"):          self.w3.to_checksum_address("0xdeaddeaddeaddeaddeaddeaddeaddeaddead2001"),
            ("FBTC", "merchant_moe"):  self.w3.to_checksum_address("0xdeaddeaddeaddeaddeaddeaddeaddeaddead2002"),
        }

        # Decimal adjustment per volatile asset:
        # price formula needs (10^token1_decimals / 10^token0_decimals)
        # WMETH: 18 dec token1, 6 dec token0 (USDC) → adjustment = 10^12
        # FBTC:   8 dec token1, 6 dec token0 (USDC) → adjustment = 10^2
        self._decimal_adjustments: Dict[str, float] = {
            "WMETH": 1e12,  # 18 - 6 = 12
            "FBTC":  1e2,   #  8 - 6 =  2
        }

        # Legacy USDY/USDC pool (preserved from v1)
        self.usdy_usdc_pool: str = self.w3.to_checksum_address(
            "0x5821df22000df0bcaeed0312000000021bc08910"
        )

    # -----------------------------------------------------------------------
    # Connectivity
    # -----------------------------------------------------------------------

    async def check_connection(self) -> bool:
        """Verifies the connection to the Mantle RPC gateway."""
        try:
            return await self.w3.is_connected()
        except Exception:
            return False

    # -----------------------------------------------------------------------
    # Balance reads
    # -----------------------------------------------------------------------

    async def get_mnt_balance(self, address: str) -> float:
        """Queries the live native MNT balance on-chain."""
        checksum_address: str = self.w3.to_checksum_address(address)
        balance_wei: int = await self.w3.eth.get_balance(checksum_address)
        return float(self.w3.from_wei(balance_wei, "ether"))

    async def get_erc20_balance(self, token_symbol: str, wallet_address: str) -> float:
        """Queries a live whitelisted ERC-20 token balance on-chain."""
        if token_symbol.upper() == "MNT":
            return await self.get_mnt_balance(wallet_address)

        token_addr: Optional[str] = self.token_addresses.get(token_symbol.upper())
        if not token_addr:
            raise ValueError(f"Asset '{token_symbol}' is not in the whitelisted registry.")

        checksum_wallet: str = self.w3.to_checksum_address(wallet_address)
        contract = self.w3.eth.contract(address=token_addr, abi=ERC20_ABI)

        try:
            raw_balance: int = await contract.functions.balanceOf(checksum_wallet).call()
            decimals: int = await contract.functions.decimals().call()
            return float(raw_balance / (10 ** decimals))
        except Exception:
            return 0.0

    # -----------------------------------------------------------------------
    # Legacy stablecoin price (preserved from v1)
    # -----------------------------------------------------------------------

    async def get_live_usdy_price(self) -> float:
        """
        Queries the Uniswap V3-style USDY/USDC pool on Mantle L2.
        Derives the active market price from slot0.sqrtPriceX96.
        """
        try:
            pool_contract = self.w3.eth.contract(
                address=self.usdy_usdc_pool, abi=UNIV3_POOL_ABI
            )
            slot0_data = await pool_contract.functions.slot0().call()
            sqrt_price_x96: int = slot0_data[0]

            # USDY (token1, 18 dec) priced in USDC (token0, 6 dec):
            # price = (2^96 / sqrtPriceX96)^2 / 10^12
            ratio: float = float(2 ** 96) / float(sqrt_price_x96)
            price_conversion: float = (ratio ** 2) / 1e12
            return float(price_conversion)
        except Exception:
            return 0.9850  # Secure oracle fallback

    # -----------------------------------------------------------------------
    # Dynamic Pool Resolution (The "Alpha" Factory Pattern)
    # -----------------------------------------------------------------------

    async def resolve_agni_pool(self, token_a_symbol: str, token_b_symbol: str, fee_tier: int = 3000) -> str:
        """
        Dynamically fetches the exact Agni Finance pool address from the factory contract.
        Fee tiers are typically 500 (0.05%), 3000 (0.3%), or 10000 (1%).
        """
        token_a_addr = self.token_addresses[token_a_symbol.upper()]
        token_b_addr = self.token_addresses[token_b_symbol.upper()]
        factory_addr = self.w3.to_checksum_address("0x25CBe9926E0b77e2Ea7Ede3DCDb51eFE199Fcb14")
        
        factory_contract = self.w3.eth.contract(address=factory_addr, abi=AGNI_FACTORY_ABI)
        
        pool_address = await factory_contract.functions.getPool(token_a_addr, token_b_addr, fee_tier).call()
        
        if pool_address == "0x0000000000000000000000000000000000000000":
            raise ValueError(f"No active pool found for {token_a_symbol}/{token_b_symbol} at fee tier {fee_tier}.")
            
        return pool_address

    async def resolve_merchant_moe_pool(self, token_a_symbol: str, token_b_symbol: str, bin_step: int = 20) -> str:
        """
        Dynamically fetches the exact Merchant Moe pool address from the LBFactory contract.
        Trader Joe V2 uses bin steps (typically 10, 15, or 20 for volatile pairs).
        """
        token_a_addr = self.token_addresses[token_a_symbol.upper()]
        token_b_addr = self.token_addresses[token_b_symbol.upper()]
        factory_addr = self.w3.to_checksum_address("0xea0005B1728256F2dfc11b156557F83f9472e3FA")
        
        factory_contract = self.w3.eth.contract(address=factory_addr, abi=MOE_FACTORY_ABI)
        
        res = await factory_contract.functions.getLBPairInformation(token_a_addr, token_b_addr, bin_step).call()
        
        # Web3.py returns the tuple components as a python tuple, where LBPair is index 1
        # If it happens to be wrapped in a list/dict due to web3 versions, we handle it:
        if isinstance(res, tuple) or isinstance(res, list):
            pool_address = res[1]
        elif isinstance(res, dict):
            pool_address = res.get("LBPair")
        else:
            raise ValueError(f"Unexpected return type from getLBPairInformation: {type(res)}")
            
        if not pool_address or pool_address == "0x0000000000000000000000000000000000000000":
            raise ValueError(f"No active pool found for {token_a_symbol}/{token_b_symbol} at bin step {bin_step}.")
            
        return pool_address

    # -----------------------------------------------------------------------
    # Volatile asset spread calculation (NEW — Phase 2)
    # -----------------------------------------------------------------------

    async def _query_pool_price(
        self, pool_address: str, decimal_adjustment: float, dex_label: str
    ) -> float:
        """
        Internal helper: derives the USD price of a volatile token from a single
        Uniswap V3-style pool's slot0.sqrtPriceX96.

        Formula (token1 = volatile asset, token0 = USDC):
            price_token0_per_token1 = (sqrtPriceX96 / 2^96)^2 * decimal_adjustment

        Args:
            pool_address:       Checksummed address of the pool contract.
            decimal_adjustment: 10^(token1_decimals - token0_decimals).
            dex_label:          Human-readable DEX name for telemetry.

        Returns:
            Derived price in USDC per 1 unit of the volatile token.
        """
        pool_contract = self.w3.eth.contract(address=pool_address, abi=UNIV3_POOL_ABI)
        slot0_data = await pool_contract.functions.slot0().call()
        sqrt_price_x96: int = slot0_data[0]

        # Uniswap V3 price formula
        ratio: float = float(sqrt_price_x96) / float(2 ** 96)
        price: float = (ratio ** 2) * decimal_adjustment

        log_telemetry_event(
            "DEBUG",
            "onchain_client",
            "query_pool_price",
            f"[{dex_label}] sqrtPriceX96={sqrt_price_x96} → price={price:.6f} USDC",
            {"pool_address": pool_address, "sqrt_price_x96": sqrt_price_x96, "price_usdc": price},
        )
        return price

    async def get_live_spread(self, token_symbol: str) -> float:
        """
        Calculates the real-time price divergence percentage between two DEX pools
        for a whitelisted volatile asset (WETH or WBTC).

        Mechanism:
          1. Query sqrtPriceX96 from the primary pool (Agni Finance).
          2. Query sqrtPriceX96 from the secondary pool (Merchant Moe).
          3. Derive USD prices using the Uniswap V3 formula.
          4. Return the absolute divergence percentage:
               spread_pct = |price_primary - price_secondary| / price_primary * 100

        Args:
            token_symbol: One of 'WETH' or 'WBTC'.

        Returns:
            Spread as a percentage (e.g., 0.72 means 0.72% divergence).

        Raises:
            ValueError: If the token symbol is not in the volatile pool registry.
        """
        symbol: str = token_symbol.upper()

        # Dynamically resolve Agni Finance pool address
        try:
            primary_addr: str = await self.resolve_agni_pool(symbol, "USDC")
        except Exception as e:
            raise ValueError(f"Failed to dynamically resolve Agni pool for {symbol}/USDC: {e}")

        # Dynamically resolve Merchant Moe pool address
        try:
            secondary_addr: str = await self.resolve_merchant_moe_pool(symbol, "USDC")
        except Exception as e:
            raise ValueError(f"Failed to dynamically resolve Merchant Moe pool for {symbol}/USDC: {e}")

        decimal_adjustment: float = self._decimal_adjustments.get(symbol, 1.0)

        log_telemetry_event(
            "INFO",
            "onchain_client",
            "get_live_spread",
            f"Querying live dual-pool spread for {symbol}.",
            {"token": symbol, "primary_dex": "agni", "secondary_dex": "merchant_moe"},
        )

        try:
            price_primary: float = await self._query_pool_price(
                primary_addr, decimal_adjustment, f"agni/{symbol}"
            )
            price_secondary: float = await self._query_pool_price(
                secondary_addr, decimal_adjustment, f"merchant_moe/{symbol}"
            )

            if price_primary == 0.0:
                raise ZeroDivisionError("Primary pool returned a zero price — pool may be uninitialized.")

            spread_pct: float = abs(price_primary - price_secondary) / price_primary * 100.0

            log_telemetry_event(
                "INFO",
                "onchain_client",
                "get_live_spread",
                (
                    f"[{symbol}] SPREAD CALCULATED: "
                    f"Agni={price_primary:.4f} | MerchantMoe={price_secondary:.4f} "
                    f"| Divergence={spread_pct:.4f}%"
                ),
                {
                    "token": symbol,
                    "price_primary_usdc": price_primary,
                    "price_secondary_usdc": price_secondary,
                    "spread_pct": spread_pct,
                },
            )
            return spread_pct

        except ZeroDivisionError as e:
            log_telemetry_event(
                "ERROR", "onchain_client", "get_live_spread",
                f"Spread calculation failed — {e}",
                {"token": symbol},
            )
            return 0.0
        except Exception as e:
            return 0.0

    # -----------------------------------------------------------------------
    # Sandbox Lending Protocol (Phase 4 Flywheel)
    # -----------------------------------------------------------------------

    def init_contract(self, address: str, abi: list) -> None:
        """Dynamically points to a fresh contract deployment."""
        self.mock_defi_contract = self.w3.eth.contract(
            address=self.w3.to_checksum_address(address),
            abi=abi
        )

    async def get_lending_position(self, wallet_address: str) -> dict:
        """Fetches the state from the simulated MockMantleDeFi contract."""
        if not hasattr(self, "mock_defi_contract"):
            raise ValueError("Contract not initialized. Call init_contract first.")
            
        checksum_wallet = self.w3.to_checksum_address(wallet_address)
        
        supplied_fbtc = await self.mock_defi_contract.functions.suppliedFBTC(checksum_wallet).call()
        borrowed_usdc = await self.mock_defi_contract.functions.borrowedUSDC(checksum_wallet).call()
        fbtc_price = await self.mock_defi_contract.functions.fbtcPriceUsd().call()
        unharvested = await self.mock_defi_contract.functions.unharvestedLPRewardsUSDC(checksum_wallet).call()
        
        return {
            "supplied_fbtc": supplied_fbtc,
            "borrowed_usdc": borrowed_usdc,
            "fbtc_price_usd": fbtc_price,
            "unharvested_rewards_usdc": unharvested
        }

