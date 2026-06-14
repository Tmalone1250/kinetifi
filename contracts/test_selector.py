from eth_utils import keccak
print("V2.1 struct selector:", keccak(text="swapExactTokensForTokens(uint256,uint256,(uint256[],uint8[],address[]),address,uint256)")[:4].hex())
