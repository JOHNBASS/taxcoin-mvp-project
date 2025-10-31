#!/usr/bin/env node

/**
 * Sui 密鑰對生成工具
 *
 * 用途: 生成新的 Sui 密鑰對用於開發測試
 *
 * 使用方法:
 *   node scripts/generate-sui-keypair.js
 */

const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { generateMnemonic, mnemonicToSeedHex } = require('@mysten/sui.js/cryptography');

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║           Sui 密鑰對生成工具 v1.0.0                     ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 方法 1: 生成全新的密鑰對
function generateNewKeypair() {
  console.log('🔑 方法 1: 生成全新密鑰對\n');
  console.log('─'.repeat(60));

  const keypair = new Ed25519Keypair();
  const publicKey = keypair.getPublicKey();
  const address = publicKey.toSuiAddress();

  // 匯出私鑰 (Base64 格式)
  const exported = keypair.export();

  console.log('\n✅ 密鑰對生成成功!\n');
  console.log('📍 Sui 地址:');
  console.log(`   ${address}\n`);

  console.log('🔓 公鑰 (Base64):');
  console.log(`   ${publicKey.toBase64()}\n`);

  console.log('🔐 私鑰 (Base64):');
  console.log(`   ${exported.privateKey}\n`);

  console.log('📋 環境變數設置:');
  console.log('─'.repeat(60));
  console.log('\n將以下內容加入到 backend/.env:\n');
  console.log(`SUI_PRIVATE_KEY=${exported.privateKey}`);
  console.log(`SUI_WALLET_ADDRESS=${address}`);
  console.log(`SUI_NETWORK=testnet\n`);

  console.log('⚠️  安全提醒:');
  console.log('─'.repeat(60));
  console.log('1. 請妥善保管私鑰,不要與他人分享');
  console.log('2. 不要將私鑰提交到 Git');
  console.log('3. 僅在測試網使用此密鑰');
  console.log('4. 生產環境應使用硬體錢包或 KMS\n');

  return keypair;
}

// 方法 2: 從助記詞恢復 (12 個詞)
function fromMnemonicPhrase(mnemonic) {
  console.log('\n🔑 方法 2: 從助記詞恢復\n');
  console.log('─'.repeat(60));

  try {
    // 從助記詞生成種子
    const seedHex = mnemonicToSeedHex(mnemonic);

    // 從種子創建密鑰對
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const publicKey = keypair.getPublicKey();
    const address = publicKey.toSuiAddress();
    const exported = keypair.export();

    console.log('\n✅ 密鑰對恢復成功!\n');
    console.log('📍 Sui 地址:');
    console.log(`   ${address}\n`);

    console.log('🔐 私鑰 (Base64):');
    console.log(`   ${exported.privateKey}\n`);

    return keypair;
  } catch (error) {
    console.error('\n❌ 錯誤: 助記詞格式不正確');
    console.error(`   ${error.message}\n`);
    return null;
  }
}

// 方法 3: 從現有私鑰恢復
function fromPrivateKey(privateKeyBase64) {
  console.log('\n🔑 方法 3: 從私鑰恢復\n');
  console.log('─'.repeat(60));

  try {
    const keypair = Ed25519Keypair.fromSecretKey(
      Buffer.from(privateKeyBase64, 'base64')
    );

    const publicKey = keypair.getPublicKey();
    const address = publicKey.toSuiAddress();

    console.log('\n✅ 密鑰對恢復成功!\n');
    console.log('📍 Sui 地址:');
    console.log(`   ${address}\n`);

    console.log('🔓 公鑰 (Base64):');
    console.log(`   ${publicKey.toBase64()}\n`);

    return keypair;
  } catch (error) {
    console.error('\n❌ 錯誤: 私鑰格式不正確');
    console.error(`   ${error.message}\n`);
    return null;
  }
}

// 生成助記詞
function generateMnemonicPhrase() {
  console.log('\n🔑 生成新的助記詞\n');
  console.log('─'.repeat(60));

  const mnemonic = generateMnemonic();

  console.log('\n✅ 助記詞生成成功!\n');
  console.log('📝 助記詞 (12 個詞):');
  console.log('─'.repeat(60));
  console.log(`\n${mnemonic}\n`);
  console.log('─'.repeat(60));

  console.log('\n⚠️  重要:');
  console.log('1. 請將這 12 個詞寫在紙上,妥善保管');
  console.log('2. 遺失助記詞將永久無法恢復錢包');
  console.log('3. 不要截圖或存在電腦上');
  console.log('4. 任何人取得助記詞都能控制你的錢包\n');

  // 從助記詞生成密鑰對
  return fromMnemonicPhrase(mnemonic);
}

// 主程式
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--new':
    case '-n':
      generateNewKeypair();
      break;

    case '--mnemonic':
    case '-m':
      generateMnemonicPhrase();
      break;

    case '--from-mnemonic':
    case '-fm':
      if (!args[1]) {
        console.error('❌ 錯誤: 請提供助記詞');
        console.error('範例: node scripts/generate-sui-keypair.js -fm "word1 word2 ... word12"\n');
        process.exit(1);
      }
      fromMnemonicPhrase(args.slice(1).join(' '));
      break;

    case '--from-key':
    case '-fk':
      if (!args[1]) {
        console.error('❌ 錯誤: 請提供私鑰');
        console.error('範例: node scripts/generate-sui-keypair.js -fk "Base64PrivateKey"\n');
        process.exit(1);
      }
      fromPrivateKey(args[1]);
      break;

    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      // 預設: 生成新密鑰對
      generateNewKeypair();

      console.log('\n💡 提示: 使用 --help 查看更多選項\n');
  }

  console.log('\n📚 相關資源:');
  console.log('─'.repeat(60));
  console.log('- Sui 文件: https://docs.sui.io/');
  console.log('- 測試網水龍頭: https://faucet.sui.io/');
  console.log('- 區塊瀏覽器: https://suiexplorer.com/?network=testnet');
  console.log('- 完整指南: docs/SUI_WALLET_SETUP.md\n');
}

function showHelp() {
  console.log('使用方法:');
  console.log('─'.repeat(60));
  console.log('\n生成新密鑰對 (預設):');
  console.log('  node scripts/generate-sui-keypair.js');
  console.log('  node scripts/generate-sui-keypair.js --new');
  console.log('  node scripts/generate-sui-keypair.js -n\n');

  console.log('生成助記詞和密鑰對:');
  console.log('  node scripts/generate-sui-keypair.js --mnemonic');
  console.log('  node scripts/generate-sui-keypair.js -m\n');

  console.log('從助記詞恢復:');
  console.log('  node scripts/generate-sui-keypair.js --from-mnemonic "word1 word2 ..."');
  console.log('  node scripts/generate-sui-keypair.js -fm "word1 word2 ..."\n');

  console.log('從私鑰恢復:');
  console.log('  node scripts/generate-sui-keypair.js --from-key "Base64PrivateKey"');
  console.log('  node scripts/generate-sui-keypair.js -fk "Base64PrivateKey"\n');

  console.log('顯示幫助:');
  console.log('  node scripts/generate-sui-keypair.js --help');
  console.log('  node scripts/generate-sui-keypair.js -h\n');
}

// 執行
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('\n❌ 發生錯誤:', error.message);
    console.error('\n請確保已安裝依賴:');
    console.error('  cd backend && npm install @mysten/sui.js\n');
    process.exit(1);
  }
}

module.exports = {
  generateNewKeypair,
  fromMnemonicPhrase,
  fromPrivateKey,
  generateMnemonicPhrase,
};
