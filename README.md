# Controle de Produção API

API REST desenvolvida em Node.js + Express para gerenciar ordens de produção, controle de estoque e relatórios consolidados de uma indústria de peças automotivas.

## Tecnologias

- Node.js
- Express

## Instalação

```bash
npm install
```

## Execução

```bash
npm start
```

O servidor sobe em `http://localhost:3000`.

## Recurso: Ordem de Produção

Cada ordem possui os seguintes campos:

| Campo | Tipo | Origem |
|---|---|---|
| `codigoOrdem` | string/number | enviado pelo cliente (único) |
| `codigoProduto` | string | enviado pelo cliente |
| `tipoProduto` | number (1, 2 ou 3) | enviado pelo cliente |
| `quantidadeProduzida` | number | enviado pelo cliente |
| `custoUnitarioBase` | number | enviado pelo cliente |
| `estoqueInicial` | number | enviado pelo cliente |
| `custoUnitarioAjustado` | number | calculado pelo servidor |
| `estoqueFinal` | number | calculado pelo servidor |
| `custoTotal` | number | calculado pelo servidor |
| `alertaEstoque` | string | calculado pelo servidor |

### Regras de negócio

- `estoqueFinal = estoqueInicial + quantidadeProduzida`
- Ajuste de custo unitário por `tipoProduto`:
  - **1 – Padrão**: custo base sem ajuste
  - **2 – Premium**: +10% sobre o custo base
  - **3 – Sob encomenda**: +20% sobre o custo base
- `custoTotal = quantidadeProduzida * custoUnitarioAjustado`
- Alerta de estoque:
  - `estoqueFinal > 5000` → `"ALTO"`
  - `estoqueFinal < 500` → `"CRITICO"`
  - caso contrário → `"NORMAL"`

## Endpoints

### `POST /ordens`
Cadastra uma nova ordem de produção.

**Corpo (JSON):**
```json
{
  "codigoOrdem": "OP001",
  "codigoProduto": "PEC-100",
  "tipoProduto": 2,
  "quantidadeProduzida": 300,
  "custoUnitarioBase": 50,
  "estoqueInicial": 4800
}
```

**Respostas:**
- `201` — ordem criada, com todos os campos calculados
- `400` — campo obrigatório faltando, `codigoOrdem` repetido, `tipoProduto` inválido, ou campos numéricos inválidos

### `GET /ordens`
Lista todas as ordens cadastradas.

**Filtros opcionais (query string):**
- `?tipo=2` — filtra por `tipoProduto`
- `?alerta=ALTO` — filtra por `alertaEstoque`

### `GET /ordens/:codigoOrdem`
Retorna uma ordem específica.

**Respostas:**
- `200` — ordem encontrada
- `404` — ordem não encontrada

### `PUT /ordens/:codigoOrdem`
Atualiza uma ordem existente. Campos aceitos no corpo: `codigoProduto`, `tipoProduto`, `quantidadeProduzida`, `custoUnitarioBase`, `estoqueInicial` (todos opcionais, só envie o que quer alterar).

Após a atualização, os campos calculados são recalculados automaticamente.

**Respostas:**
- `200` — ordem atualizada
- `400` — `tipoProduto` inválido ou campo numérico inválido
- `404` — ordem não encontrada

### `DELETE /ordens/:codigoOrdem`
Remove uma ordem de produção.

**Respostas:**
- `200` — remoção confirmada
- `404` — ordem não encontrada

### `GET /relatorios/ordens`
Retorna um relatório consolidado de todas as ordens cadastradas.

**Exemplo de resposta:**
```json
{
  "totalOrdens": 2,
  "estoquePorTipo": { "padrao": 0, "premium": 5100, "sobEncomenda": 0 },
  "mediaCustoTotalPorOrdem": 16500,
  "ordemMaisCara": { "codigoOrdem": "OP001", "custoTotal": 16500 },
  "ordemMaisBarata": { "codigoOrdem": "OP001", "custoTotal": 16500 },
  "quantidadeAlertas": { "alto": 1, "critico": 0, "normal": 0 },
  "porProduto": {
    "PEC-100": { "estoqueFinalConsolidado": 5100, "valorTotalInvestido": 16500 }
  }
}
```

## Testando a API

### Pelo navegador (apenas GET)
Acesse diretamente as rotas `GET`, por exemplo `http://localhost:3000/ordens`.

### Pelo console do navegador (F12), com `fetch`
Útil para testar `POST`, `PUT` e `DELETE` sem instalar nada:

```js
fetch('/ordens', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    codigoOrdem: "OP001",
    codigoProduto: "PEC-100",
    tipoProduto: 2,
    quantidadeProduzida: 300,
    custoUnitarioBase: 50,
    estoqueInicial: 4800
  })
}).then(res => res.json()).then(console.log);
```

### Pelo terminal, com `curl`
```bash
curl -X POST http://localhost:3000/ordens \
  -H "Content-Type: application/json" \
  -d '{"codigoOrdem":"OP001","codigoProduto":"PEC-100","tipoProduto":2,"quantidadeProduzida":300,"custoUnitarioBase":50,"estoqueInicial":4800}'
```

## Persistência

Os dados são armazenados em memória (array `ordens` dentro de `server.js`). Isso significa que todo o conteúdo é perdido quando o servidor é reiniciado — não há banco de dados nesta versão.