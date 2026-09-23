const express = require('express');
const app = express();
app.use(express.json());

// ---------------------------------------------------------------
// "Banco de dados" em memória
// ---------------------------------------------------------------
let ordens = [];

// ---------------------------------------------------------------
// Funções auxiliares de regra de negócio
// ---------------------------------------------------------------

// Valida se o código da ordem já existe na lista
function codigoOrdemExiste(codigoOrdem) {
  return ordens.some((o) => o.codigoOrdem === codigoOrdem);
}

// Valida o tipo de produto usando switch dentro de um loop
// sobre os tipos permitidos (1-Padrão, 2-Premium, 3-Sob encomenda)
function validarTipoProduto(tipoProduto) {
  const tiposValidos = [1, 2, 3];
  let valido = false;

  for (let i = 0; i < tiposValidos.length; i++) {
    switch (tipoProduto) {
      case tiposValidos[i]:
        valido = true;
        break;
      default:
        break;
    }
  }

  return valido;
}

// Valida se os campos numéricos obrigatórios foram enviados e são números válidos
function validarCamposNumericos(campos) {
  return campos.every(
    (valor) => typeof valor === 'number' && !Number.isNaN(valor)
  );
}

// Calcula todos os campos derivados de uma ordem
function calcularCamposCalculados(ordem) {
  const estoqueFinal = ordem.estoqueInicial + ordem.quantidadeProduzida;

  let custoUnitarioAjustado;
  switch (ordem.tipoProduto) {
    case 1: // Padrão
      custoUnitarioAjustado = ordem.custoUnitarioBase;
      break;
    case 2: // Premium (+10%)
      custoUnitarioAjustado = ordem.custoUnitarioBase * 1.1;
      break;
    case 3: // Sob encomenda (+20%)
      custoUnitarioAjustado = ordem.custoUnitarioBase * 1.2;
      break;
  }

  const custoTotal = ordem.quantidadeProduzida * custoUnitarioAjustado;

  let alertaEstoque;
  if (estoqueFinal > 5000) {
    alertaEstoque = 'ALTO';
  } else if (estoqueFinal < 500) {
    alertaEstoque = 'CRITICO';
  } else {
    alertaEstoque = 'NORMAL';
  }

  return {
    estoqueFinal,
    custoUnitarioAjustado: Number(custoUnitarioAjustado.toFixed(2)),
    custoTotal: Number(custoTotal.toFixed(2)),
    alertaEstoque,
  };
}

// Mapeia tipoProduto (1/2/3) para a chave usada nos relatórios
function chaveTipoProduto(tipoProduto) {
  switch (tipoProduto) {
    case 1:
      return 'padrao';
    case 2:
      return 'premium';
    case 3:
      return 'sobEncomenda';
  }
}

// ---------------------------------------------------------------
// 1. POST /ordens - cadastra uma nova ordem de produção
// ---------------------------------------------------------------
app.post('/ordens', (req, res) => {
  const {
    codigoOrdem,
    codigoProduto,
    tipoProduto,
    quantidadeProduzida,
    custoUnitarioBase,
    estoqueInicial,
  } = req.body;

  if (
    codigoOrdem === undefined ||
    codigoProduto === undefined ||
    tipoProduto === undefined ||
    quantidadeProduzida === undefined ||
    custoUnitarioBase === undefined ||
    estoqueInicial === undefined
  ) {
    return res.status(400).json({
      erro:
        'Campos obrigatórios: codigoOrdem, codigoProduto, tipoProduto, quantidadeProduzida, custoUnitarioBase, estoqueInicial.',
    });
  }

  if (codigoOrdemExiste(codigoOrdem)) {
    return res
      .status(400)
      .json({ erro: `Já existe uma ordem com o código "${codigoOrdem}".` });
  }

  if (!validarTipoProduto(tipoProduto)) {
    return res
      .status(400)
      .json({ erro: 'tipoProduto deve ser 1 (Padrão), 2 (Premium) ou 3 (Sob encomenda).' });
  }

  if (
    !validarCamposNumericos([quantidadeProduzida, custoUnitarioBase, estoqueInicial])
  ) {
    return res.status(400).json({
      erro: 'quantidadeProduzida, custoUnitarioBase e estoqueInicial devem ser números.',
    });
  }

  const novaOrdem = {
    codigoOrdem,
    codigoProduto,
    tipoProduto,
    quantidadeProduzida,
    custoUnitarioBase,
    estoqueInicial,
  };

  Object.assign(novaOrdem, calcularCamposCalculados(novaOrdem));

  ordens.push(novaOrdem);

  res.status(201).json(novaOrdem);
});

// ---------------------------------------------------------------
// 2. GET /ordens - lista todas as ordens, com filtros opcionais
// ---------------------------------------------------------------
app.get('/ordens', (req, res) => {
  let resultado = ordens;

  const { tipo, alerta } = req.query;

  if (tipo !== undefined) {
    const tipoNumero = Number(tipo);
    resultado = resultado.filter((o) => o.tipoProduto === tipoNumero);
  }

  if (alerta !== undefined) {
    const alertaUpper = String(alerta).toUpperCase();
    resultado = resultado.filter((o) => o.alertaEstoque === alertaUpper);
  }

  res.status(200).json(resultado);
});

// ---------------------------------------------------------------
// 3. GET /ordens/:codigoOrdem - retorna uma ordem específica
// ---------------------------------------------------------------
app.get('/ordens/:codigoOrdem', (req, res) => {
  const ordem = ordens.find(
    (o) => String(o.codigoOrdem) === req.params.codigoOrdem
  );

  if (!ordem) {
    return res.status(404).json({ erro: 'Ordem não encontrada.' });
  }

  res.status(200).json(ordem);
});

// ---------------------------------------------------------------
// 4. PUT /ordens/:codigoOrdem - atualiza uma ordem existente
// ---------------------------------------------------------------
app.put('/ordens/:codigoOrdem', (req, res) => {
  const ordem = ordens.find(
    (o) => String(o.codigoOrdem) === req.params.codigoOrdem
  );

  if (!ordem) {
    return res.status(404).json({ erro: 'Ordem não encontrada.' });
  }

  const {
    codigoProduto,
    tipoProduto,
    quantidadeProduzida,
    custoUnitarioBase,
    estoqueInicial,
  } = req.body;

  if (tipoProduto !== undefined) {
    if (!validarTipoProduto(tipoProduto)) {
      return res
        .status(400)
        .json({ erro: 'tipoProduto deve ser 1 (Padrão), 2 (Premium) ou 3 (Sob encomenda).' });
    }
    ordem.tipoProduto = tipoProduto;
  }

  if (codigoProduto !== undefined) ordem.codigoProduto = codigoProduto;
  if (quantidadeProduzida !== undefined) ordem.quantidadeProduzida = quantidadeProduzida;
  if (custoUnitarioBase !== undefined) ordem.custoUnitarioBase = custoUnitarioBase;
  if (estoqueInicial !== undefined) ordem.estoqueInicial = estoqueInicial;

  if (
    !validarCamposNumericos([
      ordem.quantidadeProduzida,
      ordem.custoUnitarioBase,
      ordem.estoqueInicial,
    ])
  ) {
    return res.status(400).json({
      erro: 'quantidadeProduzida, custoUnitarioBase e estoqueInicial devem ser números.',
    });
  }

  Object.assign(ordem, calcularCamposCalculados(ordem));

  res.status(200).json(ordem);
});

// ---------------------------------------------------------------
// 5. DELETE /ordens/:codigoOrdem - remove uma ordem
// ---------------------------------------------------------------
app.delete('/ordens/:codigoOrdem', (req, res) => {
  const indice = ordens.findIndex(
    (o) => String(o.codigoOrdem) === req.params.codigoOrdem
  );

  if (indice === -1) {
    return res.status(404).json({ erro: 'Ordem não encontrada.' });
  }

  ordens.splice(indice, 1);

  res.status(200).json({ mensagem: 'Ordem removida com sucesso.' });
});

// ---------------------------------------------------------------
// 6. GET /relatorios/ordens - relatório consolidado
// ---------------------------------------------------------------
app.get('/relatorios/ordens', (req, res) => {
  const totalOrdens = ordens.length;

  const estoquePorTipo = { padrao: 0, premium: 0, sobEncomenda: 0 };
  const quantidadeAlertas = { alto: 0, critico: 0, normal: 0 };
  const porProduto = {};

  let somaCustoTotal = 0;
  let ordemMaisCara = null;
  let ordemMaisBarata = null;

  for (const ordem of ordens) {
    // estoque por tipo
    const chaveTipo = chaveTipoProduto(ordem.tipoProduto);
    estoquePorTipo[chaveTipo] += ordem.estoqueFinal;

    // soma de custo total (para a média)
    somaCustoTotal += ordem.custoTotal;

    // ordem mais cara / mais barata
    if (!ordemMaisCara || ordem.custoTotal > ordemMaisCara.custoTotal) {
      ordemMaisCara = { codigoOrdem: ordem.codigoOrdem, custoTotal: ordem.custoTotal };
    }
    if (!ordemMaisBarata || ordem.custoTotal < ordemMaisBarata.custoTotal) {
      ordemMaisBarata = { codigoOrdem: ordem.codigoOrdem, custoTotal: ordem.custoTotal };
    }

    // contagem de alertas
    switch (ordem.alertaEstoque) {
      case 'ALTO':
        quantidadeAlertas.alto++;
        break;
      case 'CRITICO':
        quantidadeAlertas.critico++;
        break;
      case 'NORMAL':
        quantidadeAlertas.normal++;
        break;
    }

    // consolidado por produto
    if (!porProduto[ordem.codigoProduto]) {
      porProduto[ordem.codigoProduto] = {
        estoqueFinalConsolidado: 0,
        valorTotalInvestido: 0,
      };
    }
    porProduto[ordem.codigoProduto].estoqueFinalConsolidado += ordem.estoqueFinal;
    porProduto[ordem.codigoProduto].valorTotalInvestido += ordem.custoTotal;
  }

  const mediaCustoTotalPorOrdem =
    totalOrdens > 0 ? Number((somaCustoTotal / totalOrdens).toFixed(2)) : 0;

  res.status(200).json({
    totalOrdens,
    estoquePorTipo,
    mediaCustoTotalPorOrdem,
    ordemMaisCara,
    ordemMaisBarata,
    quantidadeAlertas,
    porProduto,
  });
});

// ---------------------------------------------------------------
const PORTA = 3000;
app.listen(PORTA, () => {
  console.log(`API rodando em http://localhost:${PORTA}`);
});

module.exports = app;