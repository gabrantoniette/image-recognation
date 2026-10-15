# Política de Segurança

## Versões suportadas

Apenas a branch `main` recebe correções de segurança.

## Como reportar uma vulnerabilidade

**Não abra uma issue pública para reportar vulnerabilidades.**

Use o reporte privado do GitHub:
[Security → Report a vulnerability](https://github.com/gabrantoniette/image-recognation/security/advisories/new).

Inclua, se possível:

- descrição do problema e impacto;
- passos para reproduzir (navegador, versão, URL/arquivo afetado);
- sugestão de correção, se houver.

Você deve receber uma resposta inicial em até 7 dias.

## Escopo

Este é um projeto estático que roda inteiramente no navegador (sem backend).
O modelo YOLOv5n e o TensorFlow.js são executados localmente em um Web Worker;
nenhuma imagem ou dado do usuário é enviado para servidores.
