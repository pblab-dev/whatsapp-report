// Pre-carga do Node (NODE_OPTIONS=--require <BASE>/bin/localhost-only.cjs).
// Força servidores TCP a escutar somente em 127.0.0.1, sem alterar o código da Evolution API.
// Assim a porta 8080 não fica acessível pela rede; só processos locais conseguem conectar.
'use strict';
const net = require('net');
const LOCAL_HOST = '127.0.0.1';
const originalListen = net.Server.prototype.listen;

net.Server.prototype.listen = function patchedListen(...args) {
  const first = args[0];
  const isPort = typeof first === 'number' || (typeof first === 'string' && /^\d+$/.test(first));
  if (isPort) {
    if (args[1] === undefined || typeof args[1] === 'function') {
      args.splice(1, 0, LOCAL_HOST);
    } else if (typeof args[1] === 'string') {
      args[1] = LOCAL_HOST;
    }
  }
  return originalListen.apply(this, args);
};
