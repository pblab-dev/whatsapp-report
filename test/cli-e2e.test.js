'use strict';

// Fluxo completo pela CLI contra o servidor falso da Evolution (nenhuma mensagem real).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { startFakeEvolution } = require('./helpers');

const ROOT = path.join(__dirname, '..');
const JID = '120363000000000001@g.us';

function cli(env, ...args) {
  // Assíncrono: o servidor falso roda neste mesmo processo e precisa responder.
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(ROOT, 'src', 'cli.js'), ...args], { env: { ...process.env, ...env }, encoding: 'utf8' }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

test('fluxo: selecionar grupo, coletar, gerar relatório e bloquear envio sem aprovação', async () => {
  const now = Math.floor(Date.now() / 1000);
  const participants = ['a', 'b', 'c'].map((p) => ({ id: `5585${p.repeat(8)}@s.whatsapp.net` }));
  const records = Array.from({ length: 30 }, (_, i) => ({
    key: { id: `M${i}`, remoteJid: JID, participant: participants[i % 3].id },
    messageTimestamp: now - i * 300,
    messageType: 'conversation',
  }));
  const fake = await startFakeEvolution({
    groups: [{ id: JID, subject: 'Turma Teste', size: 3, participants }],
    messagesByJid: { [JID]: records },
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-e2e-'));
  const env = {
    EVOLUTION_API_URL: fake.baseUrl,
    EVOLUTION_API_KEY: fake.apiKey,
    WR_DATA_DIR: dir,
    WR_ALLOW_REAL_SEND: '',
  };
  try {
    assert.match(await cli(env, 'select-groups', '--jids', JID), /Grupos monitorados: 1/);
    assert.match(await cli(env, 'add-recipient', '--id', 'dono', '--type', 'user', '--target', '5585999990000', '--name', 'Dono', '--schedule', 'nightly'), /criado sem aprovação/);
    assert.match(await cli(env, 'collect'), /30 novas mensagens/);
    const report = await cli(env, 'report', '--days', '7');
    assert.match(report, /Relatório de grupos/);
    assert.match(report, /Turma Teste/);
    assert.match(report, /Veredito/);
    assert.doesNotMatch(report, /\|/, 'sem tabela markdown');
    // Sem aprovação, nenhum envio é feito e nenhuma chamada de sendText chega à Evolution.
    assert.match(await cli(env, 'run', '--real'), /Nenhum destinatário aprovado/);
    assert.equal(fake.calls.sends.length, 0);
    // Status não expõe números de telefone nem a chave.
    const status = await cli(env, 'status');
    assert.doesNotMatch(status, /5585/);
    assert.doesNotMatch(status, new RegExp(fake.apiKey));
    // Dados gravados sem texto de mensagens e sem número de telefone.
    const raw = fs.readFileSync(path.join(dir, 'store.json'), 'utf8');
    assert.doesNotMatch(raw, /5585/);
    assert.doesNotMatch(raw, /"text"|conversation":/);
  } finally {
    await fake.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
