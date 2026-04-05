# scripts/deploy_on_chain.ps1
Write-Host "Starting RWA Escrow deployment on Solana Devnet..."

if (!(Get-Command "rustc" -ErrorAction SilentlyContinue)) {
    Write-Error "Rust is not installed!"
    return
}

if (!(Get-Command "solana" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Solana CLI..."
    cmd /c "curl -sSfL https://release.solana.com/v1.18.3/install.ps1 | pwsh"
}

if (!(Get-Command "anchor" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Anchor Framework (takes a while)..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
}

if (!(Test-Path "$env:USERPROFILE\.config\solana\id.json")) {
    Write-Host "Generating new keypair..."
    solana-keygen new --no-passphrase --outfile "$env:USERPROFILE\.config\solana\id.json"
}

solana config set --url devnet
solana airdrop 2

Set-Location -Path "agro-contracts"
Write-Host "Building project..."
anchor build

$PROGRAM_ID = solana address -k target/deploy/agro_contracts-keypair.json
Write-Host "Program ID: $PROGRAM_ID"

(Get-Content programs/agro-contracts/src/lib.rs).Replace("Agro111111111111111111111111111111111111111", $PROGRAM_ID) | Set-Content programs/agro-contracts/src/lib.rs
(Get-Content Anchor.toml).Replace("Agro111111111111111111111111111111111111111", $PROGRAM_ID) | Set-Content Anchor.toml

Write-Host "Deploying..."
anchor deploy

Write-Host "Deployment complete! Program ID: $PROGRAM_ID"
