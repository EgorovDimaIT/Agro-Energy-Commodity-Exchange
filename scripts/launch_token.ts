const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const {
    BagsSDK,
    BAGS_FEE_SHARE_V2_MAX_CLAIMERS_NON_LUT,
    waitForSlotsToPass,
    signAndSendTransaction,
    createTipTransaction,
    sendBundleAndConfirm,
} = require("@bagsfm/bags-sdk");
const {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    Connection,
    VersionedTransaction,
} = require("@solana/web3.js");
const bs58 = require("bs58");

// ============================================================
// 1. ENVIRONMENT VARIABLES — ВАЛИДАЦИЯ
// ============================================================
const BAGS_API_KEY = process.env.BAGS_API_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!BAGS_API_KEY) {
    throw new Error("❌ BAGS_API_KEY не задан в .env.local");
}
if (!SOLANA_RPC_URL) {
    throw new Error("❌ SOLANA_RPC_URL не задан в .env.local");
}
if (!PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY не задан в .env.local");
}

// ============================================================
// 2. КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверка что RPC — MAINNET
//    Bags API работает ТОЛЬКО с mainnet.
//    Devnet baseMint не существует для бэкенда Bags → 500.
// ============================================================
if (
    SOLANA_RPC_URL.includes("devnet") ||
    SOLANA_RPC_URL.includes("testnet")
) {
    console.warn("⚠️  ВНИМАНИЕ: Bags API поддерживает ТОЛЬКО Solana Mainnet!");
    console.warn("⚠️  Ваш RPC указывает на devnet/testnet. Это вызовет ошибку 500.");
    console.warn("⚠️  Измените SOLANA_RPC_URL в .env.local на mainnet RPC.");
    console.warn("⚠️  Пример: https://mainnet.helius-rpc.com/?api-key=YOUR_KEY");
    process.exit(1);
}

// ============================================================
// 3. ИНИЦИАЛИЗАЦИЯ SDK
// ============================================================
const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

// ИСПРАВЛЕНО: В офиц. документации 0.015, у вас было 0.012
const FALLBACK_JITO_TIP_LAMPORTS = 0.015 * LAMPORTS_PER_SOL;

// ============================================================
// 4. ФУНКЦИЯ: Отправка бандла с Jito tip
// ============================================================
async function sendBundleWithTip(unsignedTransactions, keypair) {
    const commitment = sdk.state.getCommitment();
    const bundleBlockhash = unsignedTransactions[0]?.message?.recentBlockhash;
    if (!bundleBlockhash) {
        throw new Error("Bundle transactions must have a blockhash");
    }

    let jitoTip = FALLBACK_JITO_TIP_LAMPORTS;
    try {
        const recommendedJitoTip = await sdk.solana.getJitoRecentFees();
        if (
            recommendedJitoTip &&
            recommendedJitoTip.landed_tips_95th_percentile
        ) {
            jitoTip = Math.floor(
                recommendedJitoTip.landed_tips_95th_percentile * LAMPORTS_PER_SOL
            );
        }
    } catch (e) {
        console.warn("⚠️  Не удалось получить Jito fees, используем fallback:", e.message);
    }
    console.log(`💰 Jito tip: ${jitoTip / LAMPORTS_PER_SOL} SOL`);

    const tipTransaction = await createTipTransaction(
        connection,
        commitment,
        keypair.publicKey,
        jitoTip,
        { blockhash: bundleBlockhash }
    );

    // Подписываем все транзакции (tip + основные)
    const signedTransactions = [tipTransaction, ...unsignedTransactions].map(
        (tx) => {
            tx.sign([keypair]);
            return tx;
        }
    );

    console.log(`📦 Отправляем бандл через Jito (${signedTransactions.length} tx)...`);
    const bundleId = await sendBundleAndConfirm(signedTransactions, sdk);
    console.log(`✅ Bundle ID: ${bundleId}`);
    return bundleId;
}

// ============================================================
// 5. ФУНКЦИЯ: Создание Fee Share Config
//    КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ:
//    - Убран bagsConfigType (нет в документации)
//    - Корректная обработка bundles и transactions
//    - Проверка результата
// ============================================================
async function getOrCreateFeeShareConfig(
    tokenMint,
    creatorWallet,
    keypair,
    feeClaimers,
    partner,       // optional
    partnerConfig  // optional
) {
    const commitment = sdk.state.getCommitment();
    let additionalLookupTables;

    // Если fee claimers > 15, нужны Lookup Tables
    if (feeClaimers.length > BAGS_FEE_SHARE_V2_MAX_CLAIMERS_NON_LUT) {
        console.log(
            `📋 Создаём LUT для ${feeClaimers.length} fee claimers ` +
            `(лимит без LUT: ${BAGS_FEE_SHARE_V2_MAX_CLAIMERS_NON_LUT})...`
        );

        const lutResult = await sdk.config.getConfigCreationLookupTableTransactions({
            payer: creatorWallet,
            baseMint: tokenMint,
            feeClaimers: feeClaimers,
        });

        if (!lutResult) {
            throw new Error("Failed to create LUT transactions");
        }

        // Создаём LUT
        await signAndSendTransaction(
            connection,
            commitment,
            lutResult.creationTransaction,
            keypair
        );

        // Ждём 1 слот между созданием и расширением LUT
        await waitForSlotsToPass(connection, commitment, 1);

        // Расширяем LUT
        for (const extendTx of lutResult.extendTransactions) {
            await signAndSendTransaction(connection, commitment, extendTx, keypair);
        }

        additionalLookupTables = lutResult.lutAddresses;
        console.log(`✅ LUT создан, адреса:`, additionalLookupTables.map(k => k.toBase58()));
    }

    // -------------------------------------------------------
    // ОСНОВНОЙ ВЫЗОВ — createBagsFeeShareConfig
    // ИСПРАВЛЕНО: убран bagsConfigType, добавлены только
    //   документированные параметры
    // -------------------------------------------------------
    try {
        console.log("🔧 Вызываем createBagsFeeShareConfig...");
        console.log("   baseMint:", tokenMint.toBase58());
        console.log("   payer:", creatorWallet.toBase58());
        console.log(
            "   feeClaimers:",
            feeClaimers.map((fc) => ({
                user: fc.user.toBase58(),
                userBps: fc.userBps,
            }))
        );

        const configResult = await sdk.config.createBagsFeeShareConfig({
            payer: creatorWallet,
            baseMint: tokenMint,
            feeClaimers: feeClaimers,
            // Только если у вас есть partner key:
            ...(partner ? { partner } : {}),
            ...(partnerConfig ? { partnerConfig } : {}),
            ...(additionalLookupTables ? { additionalLookupTables } : {}),
            // НЕ передаём bagsConfigType — его нет в API!
        });

        if (!configResult) {
            throw new Error("createBagsFeeShareConfig вернул пустой результат");
        }

        console.log("✅ Fee share config получен.");

        // Обрабатываем bundles (если есть)
        if (configResult.bundles && configResult.bundles.length > 0) {
            console.log(`📦 Обрабатываем ${configResult.bundles.length} bundle(s)...`);
            for (const bundle of configResult.bundles) {
                await sendBundleWithTip(bundle, keypair);
            }
        }

        // Обрабатываем отдельные транзакции (если есть)
        if (configResult.transactions && configResult.transactions.length > 0) {
            console.log(`📝 Подписываем ${configResult.transactions.length} transaction(s)...`);
            for (const tx of configResult.transactions) {
                await signAndSendTransaction(connection, commitment, tx, keypair);
            }
        }

        if (!configResult.meteoraConfigKey) {
            throw new Error(
                "configResult.meteoraConfigKey отсутствует! " +
                "Ответ сервера: " + JSON.stringify(configResult)
            );
        }

        return configResult.meteoraConfigKey;
    } catch (error) {
        console.error("🚨 Ошибка при создании fee share config:");
        console.error("   Message:", error.message);
        if (error.response) {
            console.error("   Status:", error.response.status);
            console.error("   Data:", JSON.stringify(error.response.data));
        }
        throw error;
    }
}

// ============================================================
// 6. ГЛАВНАЯ ФУНКЦИЯ: Запуск токена
// ============================================================
async function launchToken(launchParams) {
    try {
        // Декодируем keypair
        let keypair;
        try {
            keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
        } catch (e) {
            throw new Error(
                "Не удалось декодировать PRIVATE_KEY. Убедитесь что это Base58-encoded secret key. " +
                e.message
            );
        }

        const commitment = sdk.state.getCommitment();
        const walletAddress = keypair.publicKey.toBase58();

        console.log("=".repeat(60));
        console.log(`🚀 Запуск токена: $${launchParams.symbol}`);
        console.log(`👛 Кошелёк: ${walletAddress}`);
        console.log(`💰 Initial buy: ${launchParams.initialBuyAmountLamports / LAMPORTS_PER_SOL} SOL`);
        console.log("=".repeat(60));

        // Проверяем баланс
        const balance = await connection.getBalance(keypair.publicKey);
        const balanceSOL = balance / LAMPORTS_PER_SOL;
        console.log(`💰 Баланс кошелька: ${balanceSOL} SOL`);
        if (balanceSOL < 0.1) {
            throw new Error(
                `Недостаточно SOL. Баланс: ${balanceSOL} SOL. ` +
                `Нужно минимум ~0.1 SOL для комиссий + initial buy.`
            );
        }

        // ============ STEP 1: Создание metadata ============
        console.log("\n📝 Шаг 1/3: Создание token info и metadata...");

        // ИСПРАВЛЕНО: Чистый символ без случайных суффиксов
        const cleanSymbol = launchParams.symbol
            .toUpperCase()
            .replace("$", "")
            .substring(0, 10); // Max 10 chars

        const tokenInfoResponse = await sdk.tokenLaunch.createTokenInfoAndMetadata({
            imageUrl: launchParams.imageUrl,
            name: launchParams.name,
            description: launchParams.description,
            symbol: cleanSymbol,
            ...(launchParams.twitterUrl ? { twitter: launchParams.twitterUrl } : {}),
            ...(launchParams.websiteUrl ? { website: launchParams.websiteUrl } : {}),
            ...(launchParams.telegramUrl ? { telegram: launchParams.telegramUrl } : {}),
        });

        if (!tokenInfoResponse || !tokenInfoResponse.tokenMint) {
            throw new Error(
                "createTokenInfoAndMetadata не вернул tokenMint. " +
                "Ответ: " + JSON.stringify(tokenInfoResponse)
            );
        }

        console.log("✅ Token mint:", tokenInfoResponse.tokenMint);
        console.log("✅ Metadata URL:", tokenInfoResponse.tokenMetadata);

        // ============ STEP 2: Fee Share Config ============
        console.log("\n⚙️  Шаг 2/3: Создание fee share config...");

        const tokenMint = new PublicKey(tokenInfoResponse.tokenMint);

        // Fee claimers: создатель получает 100% (10000 bps)
        // ВАЖНО: creator ОБЯЗАН быть указан явно
        const feeClaimers = [
            {
                user: keypair.publicKey,
                userBps: 10000, // 100% создателю
            },
        ];

        console.log("   Fee claimers:");
        feeClaimers.forEach((fc, i) => {
            console.log(`   [${i}] ${fc.user.toBase58()} → ${fc.userBps / 100}%`);
        });

        const configKey = await getOrCreateFeeShareConfig(
            tokenMint,
            keypair.publicKey,
            keypair,
            feeClaimers
            // partner и partnerConfig — undefined (не используем)
        );

        console.log("✅ Config Key:", configKey.toBase58());

        // ============ STEP 3: Launch Transaction ============
        console.log("\n🎯 Шаг 3/3: Создание и отправка launch transaction...");

        const tokenLaunchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
            metadataUrl: tokenInfoResponse.tokenMetadata,
            tokenMint: tokenMint,
            launchWallet: keypair.publicKey,
            initialBuyLamports: launchParams.initialBuyAmountLamports,
            configKey: configKey,
        });

        if (!tokenLaunchTransaction) {
            throw new Error("createLaunchTransaction вернул пустой результат");
        }

        console.log("📡 Подписываем и отправляем...");
        const signature = await signAndSendTransaction(
            connection,
            commitment,
            tokenLaunchTransaction,
            keypair
        );

        // ============ SUCCESS ============
        console.log("\n" + "=".repeat(60));
        console.log("🎉 УСПЕХ! Токен запущен на Bags.fm!");
        console.log("=".repeat(60));
        console.log("🪙 Token Mint:", tokenInfoResponse.tokenMint);
        console.log("📄 Metadata:", tokenInfoResponse.tokenMetadata);
        console.log("🔑 Config:", configKey.toBase58());
        console.log("📝 TX Signature:", signature);
        console.log(`🌐 Ссылка: https://bags.fm/${tokenInfoResponse.tokenMint}`);
        console.log(
            `🔍 Explorer: https://solscan.io/tx/${signature}`
        );
        console.log("=".repeat(60));

        return {
            tokenMint: tokenInfoResponse.tokenMint,
            metadata: tokenInfoResponse.tokenMetadata,
            configKey: configKey.toBase58(),
            signature,
        };
    } catch (error) {
        console.error("\n🚨 ОШИБКА ЗАПУСКА ТОКЕНА:");
        console.error("   Message:", error.message);

        // Расширенная диагностика для API-ошибок
        if (error.message && error.message.includes("500")) {
            console.error("\n💡 ДИАГНОСТИКА ОШИБКИ 500:");
            console.error("   1. Убедитесь что SOLANA_RPC_URL указывает на MAINNET");
            console.error("   2. Убедитесь что BAGS_API_KEY валиден (проверьте на dev.bags.fm)");
            console.error("   3. Проверьте что imageUrl доступен публично");
            console.error("   4. Попробуйте другое имя/символ токена");
        }

        if (error.message && error.message.includes("401")) {
            console.error("\n💡 API Key невалиден или истёк.");
            console.error("   Получите новый на https://dev.bags.fm");
        }

        throw error;
    }
}

// ============================================================
// 7. ЗАПУСК
// ============================================================
launchToken({
    // ИСПРАВЛЕНО: используйте реальное изображение PNG, доступное публично
    imageUrl: "https://arweave.net/your-image-hash",  // Замените на ваш URL!

    // ИСПРАВЛЕНО: чистые имя и символ без random suffix
    name: "Agro Energy Social Exchange",
    symbol: "AGRO",
    description: "Institutional RWA Social Hub on Solana",

    // Соцсети (опционально)
    // twitterUrl: "https://x.com/your_project",
    // websiteUrl: "https://your-project.com",
    // telegramUrl: "https://t.me/your_group",

    // ИСПРАВЛЕНО: Initial buy в lamports
    // 0.05 SOL — минимальная покупка при запуске
    initialBuyAmountLamports: 0.05 * LAMPORTS_PER_SOL,
}).catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
});