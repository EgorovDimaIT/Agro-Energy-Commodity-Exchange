#!/bin/bash
# scripts/launch_all_devnet.sh
# Запускает все 7 токенов на Devnet одной командой

echo "🚀 Agro-Energy Devnet Token Launcher"
echo "======================================"

# Проверяем конфиг Solana
# Note: In this environment, solana might not be in PATH, so we use node scripts if needed.
# But I will provide the script as requested by the user.

solana config set --url devnet
echo "✅ Network: Devnet"

# Получаем адрес кошелька
WALLET=$(solana address)
echo "💳 Wallet: $WALLET"

# Пополняем SOL
echo "💰 Requesting airdrops..."
solana airdrop 2 --url devnet && sleep 2
solana airdrop 2 --url devnet && sleep 2
solana airdrop 2 --url devnet && sleep 2

BALANCE=$(solana balance)
echo "💰 Balance: $BALANCE"

echo ""
echo "🪙 Creating tokens..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Функция создания токена
create_token() {
  local SYMBOL=$1
  local SUPPLY=$2
  local DECIMALS=$3

  echo ""
  echo "Creating $SYMBOL..."
  
  # Создаём токен
  MINT=$(spl-token create-token --decimals $DECIMALS | grep "Creating token" | awk '{print $3}')
  echo "  Mint: $MINT"

  # Создаём аккаунт
  ACCOUNT=$(spl-token create-account $MINT | grep "Creating account" | awk '{print $3}')
  echo "  Account: $ACCOUNT"

  # Минтим токены
  spl-token mint $MINT $SUPPLY > /dev/null
  echo "  ✅ Minted: $SUPPLY $SYMBOL"

  # Убираем mint authority (fixed supply)
  spl-token authorize $MINT mint --disable > /dev/null
  echo "  🔒 Supply locked forever"

  # Сохраняем
  echo "NEXT_PUBLIC_${SYMBOL}_TOKEN_MINT=$MINT" >> token-addresses.env
  echo "  Explorer: https://explorer.solana.com/address/$MINT?cluster=devnet"
}

# Создаём все токены
rm -f token-addresses.env
create_token "AGRO"  1000000 6
create_token "oBBL"   800000 6
create_token "oLNG"   600000 6
create_token "oWHT"   550000 6
create_token "oCRN"   720000 6
create_token "oUREA"  400000 6
create_token "oAMN"   350000 6

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL TOKENS CREATED!"
echo ""
echo "📋 Add to .env.local:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat token-addresses.env
