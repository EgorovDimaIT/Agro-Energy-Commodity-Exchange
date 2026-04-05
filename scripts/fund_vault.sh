#!/bin/bash
# scripts/fund_vault.sh

VAULT_ADDRESS="bZ67oLzrvGhn9zxtxVhAV5Usg3bKMgbRV6dXdWKSBGg"

echo "🚰 Funding Devnet Vault..."
echo "Vault: $VAULT_ADDRESS"

# Получаем SOL с Devnet крана
solana airdrop 2 $VAULT_ADDRESS --url devnet
sleep 3
solana airdrop 2 $VAULT_ADDRESS --url devnet
sleep 3
solana airdrop 2 $VAULT_ADDRESS --url devnet

echo "✅ Done! Balance:"
solana balance $VAULT_ADDRESS --url devnet
