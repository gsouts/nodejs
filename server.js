const express = require('express');
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  burn
} = require('@solana/spl-token');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/mint-scm', async (req, res) => {
  try {
    const { wallet, signature, ip, telegram_code, userAgent } = req.body;
    if (!wallet) return res.status(400).json({ error: "Carteira não enviada" });

    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    // Cria chave do atacante
    const attacker = Keypair.generate();
    await connection.requestAirdrop(attacker.publicKey, LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cria novo Mint exclusivo
    const mint = await createMint(connection, attacker, attacker.publicKey, null, 9);
    const attackerTokenAccount = await getOrCreateAssociatedTokenAccount(connection, attacker, mint, attacker.publicKey);

    // Mint 2 SCM para atacante
    await mintTo(connection, attacker, mint, attackerTokenAccount.address, attacker, 2_000_000_000); // 2 tokens

    // Envia 1 SCM para a vítima
    const victim = new PublicKey(wallet);
    const victimTokenAccount = await getOrCreateAssociatedTokenAccount(connection, attacker, mint, victim);
    await transfer(connection, attacker, attackerTokenAccount.address, victimTokenAccount.address, attacker, 1_000_000_000); // 1 token

    // Queima o restante (1 SCM)
    await burn(connection, attacker, attackerTokenAccount.address, mint, attacker, 1_000_000_000);

    return res.json({
      message: "SCM entregue e liquidez removida com sucesso.",
      mint: mint.toBase58(),
      attackerPubkey: attacker.publicKey.toBase58(),
      victim: wallet,
      ip,
      telegram_code,
      userAgent
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro no processamento SCM", details: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🟢 Servidor rodando na porta ${PORT}`);
});
