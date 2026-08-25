# NutriTracker

Seu contador de calorias e macros. Roda no celular como app, funciona offline,
os dados ficam só no seu aparelho.

---

## Como rodar (passo a passo)

### 1. Abrir o terminal na pasta

```bash
cd C:\Users\Ello1\OneDrive\Desktop\Codes\Projetos\NutriTracker
```

### 2. Instalar as dependências (só na primeira vez)

```bash
npm install
```

### 3. Subir o app

```bash
npm run dev
```

O terminal vai mostrar dois endereços:

```
➜  Local:   http://localhost:5180/
➜  Network: http://192.168.100.254:5180/
```

- **No PC:** abra o `Local`.
- **No celular:** conecte o celular no mesmo Wi-Fi e abra o `Network` no navegador.

### 4. Para usar o leitor de código de barras no celular

A câmera só liga em conexão segura (https). Pelo `http://192.168...` o navegador
bloqueia. Então use:

```bash
npm run dev:https
```

Agora o endereço vira `https://192.168...`. O celular vai reclamar de
"conexão não privada" — é o certificado autoassinado, pode avançar sem medo,
é o seu próprio PC.

### 5. Instalar como app no celular

Com o app aberto no navegador do celular:

- **Android (Chrome):** menu ⋮ → "Instalar app" ou "Adicionar à tela inicial"
- **iPhone (Safari):** botão de compartilhar → "Adicionar à Tela de Início"

Depois disso ele abre em tela cheia, com ícone próprio, e funciona **sem
internet** (só a busca por código de barras precisa de rede).

---

## O que dá para fazer

| Tela | O que tem |
|---|---|
| **Hoje** | Anel de calorias, barras de macro, as 4 refeições. Navega entre os dias nas setas. Toque em qualquer item para editar ou apagar. |
| **Adicionar** | Busca nos 595 alimentos da TACO, leitor de código de barras, "o que você mais come" e cadastro manual. |
| **Peso** | Registro diário, gráfico com média móvel de 7 dias e sugestão automática de ajuste nas calorias. |
| **Ajustes** | Editar perfil, fixar metas na mão, ver seus alimentos cadastrados, backup e restauração. |

### Atalhos que economizam tempo

- **"Repetir tudo que comi ontem"** aparece no dia em branco quando o dia anterior tem registro.
- **Medidas caseiras**: em vez de digitar 90 g de arroz, toque em "1 escumadeira".
- **Última quantidade**: o app lembra quanto você comeu daquele alimento da última vez e já preenche.
- **Produtos escaneados** ficam salvos: da segunda vez aparecem na busca, mesmo offline.

---

## De onde vêm os dados

### Alimentos

- **TACO 4ª edição** (UNICAMP, 2011) — 595 alimentos brasileiros, embutidos no app.
  Quatro itens da tabela original vêm sem valores (marcados com `*`); os dois mais
  comuns (leite integral e leite desnatado) foram completados com dados do USDA e
  ficam marcados no app. Os outros dois foram removidos.
- **Open Food Facts** — base aberta e colaborativa de produtos industrializados,
  consultada por código de barras. É colaborativa, então a qualidade varia:
  confira o rótulo quando o número parecer estranho.

### Meta calórica

Equação de **Mifflin-St Jeor** para o metabolismo basal, multiplicada pelo fator
de atividade, com o ajuste do objetivo:

```
homem:  TMB = 10×peso + 6,25×altura − 5×idade + 5
mulher: TMB = 10×peso + 6,25×altura − 5×idade − 161
```

Existe um piso de segurança (1500 kcal para homens, 1200 para mulheres): se a
conta der menos que isso, o app limita e avisa.

**Isso tudo é estimativa.** O gasto real de uma pessoa pode variar uns 10% para
cima ou para baixo do que a fórmula diz. Quem dá a palavra final é a balança:
com 14 dias de registro de peso, a aba Peso compara o ritmo real com o esperado
e sugere o número corrigido. É uma ferramenta de acompanhamento — não substitui
nutricionista nem médico.

---

## Onde ficam seus dados

Por padrão, tudo em `localStorage`, no navegador daquele aparelho. Sem conta,
sem ninguém vendo.

O lado ruim: se você limpar os dados do navegador ou desinstalar o app, some.
Em **Ajustes → Baixar backup** dá para salvar um `.json` com tudo, e restaurar
depois no mesmo lugar.

### Sincronizar celular e PC (opcional)

Em **Ajustes → Sincronizar entre aparelhos** dá para entrar com um e-mail e ter
o mesmo diário nos dois. O login é por código de 6 dígitos, não por link: no
celular um link abriria no navegador padrão, fora do app instalado, e a sessão
ficaria no lugar errado.

O app continua offline-first — o `localStorage` segue sendo a fonte de verdade
local e a sincronização acontece quando dá. Cada item do diário é uma linha
própria no banco, então registrar o café no celular e o almoço no PC, os dois
offline, não faz um sobrescrever o outro. Em conflito de verdade (o mesmo item
editado nos dois), ganha a edição mais recente.

Para rodar com sincronização, copie `.env.example` para `.env.local` e preencha
com os dados do seu projeto Supabase. **Sem essas variáveis o app funciona
igual, só offline** — a seção de conta nem aparece nos Ajustes.

---

## Estrutura do projeto

```
scripts/
  build-taco.mjs      converte a TACO bruta para o formato do app
  correcoes.json      completa os alimentos que a TACO deixou em branco
  build-icons.mjs     gera os ícones PNG do PWA (sem dependência de imagem)
  dev-https.mjs       servidor de desenvolvimento com https (para a câmera)
src/
  data/alimentos.json base TACO já processada (150 KB, vai junto no app)
  lib/
    metas.js          Mifflin-St Jeor, macros, sugestão de ajuste, IMC
    db.js             estado + persistência em localStorage
    busca.js          busca por termos, sinônimos e ranking
    sinonimos.js      grafias equivalentes ("mussarela" acha "mozarela")
    supabase.js       cliente do Supabase, carregado sob demanda
    sync.js           sincronização entre aparelhos
    calculo.js        soma do dia, média móvel
    medidas.js        medidas caseiras (colher, concha, fatia...)
    openfoodfacts.js  consulta por código de barras
    util.js           datas, normalização de texto, formatação
  components/         telas e componentes de interface
```

### Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run dev:https    # idem, com https (necessário para a câmera no celular)
npm run build        # gera a versão de produção em dist/
npm run preview      # testa a versão de produção
npm run build:taco   # regenera a base de alimentos
npm run build:icons  # regenera os ícones do PWA
```

---

## Ideias para depois

- Receitas: montar um prato uma vez e registrar com um toque
- Registro de água
- Metas diferentes para dia de treino e dia de descanso
- Exportar o histórico para planilha
