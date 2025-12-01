# 📚 Guia de Importação de Alunos

## 📋 Visão Geral

Sistema completo para importação em massa de alunos via planilha Excel, com validações automáticas e relatório de erros detalhado.

---

## 🎯 Quem Pode Usar

✅ **Gestão Municipal** - Importar alunos para qualquer turma
✅ **Diretor/Coordenador** - Importar alunos apenas para turmas da sua escola

---

## 🚀 Como Usar

### Passo 1: Acessar a Funcionalidade

1. Faça login no sistema
2. No Dashboard, clique no card **"Importar Alunos"**
3. Você será direcionado para a página de importação

### Passo 2: Baixar o Template

1. Clique no botão **"Baixar Template"**
2. Um arquivo Excel será baixado: `template_importacao_alunos_AAAA-MM-DD.xlsx`
3. O template contém duas abas:
   - **INSTRUÇÕES**: Orientações detalhadas de preenchimento
   - **ALUNOS**: Planilha para preencher com os dados

### Passo 3: Preencher o Template

#### Campos Obrigatórios (marcados com *)

| Campo | Formato | Exemplo |
|-------|---------|---------|
| **Nome Completo *** | Texto completo | João da Silva Santos |
| **CPF *** | 11 dígitos (com ou sem pontuação) | 123.456.789-00 ou 12345678900 |
| **Data de Nascimento *** | DD/MM/AAAA | 15/03/2015 |

#### Campos Opcionais

| Campo | Formato | Exemplo |
|-------|---------|---------|
| Nome da Mãe | Texto completo | Maria da Silva |
| Nome do Pai | Texto completo | José Santos |
| Endereço | Endereço completo | Rua das Flores, 123 - Centro |
| Telefone | Telefone de contato | (94) 98765-4321 |
| Observações | Texto livre | Aluno transferido |

#### ⚠️ Regras Importantes

- **NÃO altere os nomes das colunas** (cabeçalhos)
- **Remova ou sobrescreva** a linha de exemplo
- **CPF deve ser único** - alunos com CPF duplicado serão rejeitados
- **Datas** devem estar no formato brasileiro (DD/MM/AAAA)
- Campos vazios ou "nan" em campos obrigatórios causarão erro

### Passo 4: Selecionar a Turma

1. No campo **"Turma"**, selecione a turma de destino
2. **Diretor**: Verá apenas turmas da sua escola
3. **Gestão Municipal**: Verá todas as turmas ativas

### Passo 5: Fazer Upload

1. Clique em **"Selecionar Arquivo"**
2. Escolha o arquivo Excel preenchido (.xlsx ou .xls)
3. O nome do arquivo aparecerá ao lado
4. Clique em **"Importar Alunos"**

### Passo 6: Visualizar Resultado

Após o processamento, você verá:

- ✅ **Quantidade de alunos importados com sucesso**
- ❌ **Quantidade de erros encontrados**
- 📊 **Total de linhas processadas**
- 📝 **Tabela detalhada de erros** (se houver)

---

## 📊 Exemplo de Template Preenchido

| Nome Completo * | CPF * | Data de Nascimento * | Nome da Mãe | Nome do Pai | Endereço | Telefone | Observações |
|----------------|-------|---------------------|-------------|-------------|----------|----------|-------------|
| Ana Silva Costa | 111.222.333-44 | 10/05/2014 | Carla Silva | Pedro Costa | Rua A, 100 | (94) 91234-5678 | - |
| Bruno Santos Lima | 222.333.444-55 | 22/08/2015 | Juliana Santos | - | Av. B, 200 | (94) 99876-5432 | Alérgico a lactose |
| Carlos Oliveira | 333.444.555-66 | 15/12/2014 | Fernanda Oliveira | João Oliveira | Rua C, 300 | - | - |

---

## ❌ Erros Comuns e Soluções

### 1. "Nome Completo é obrigatório"
**Causa**: Campo vazio ou contém apenas espaços
**Solução**: Preencha o nome completo do aluno

### 2. "CPF é obrigatório" / "CPF inválido"
**Causa**: Campo vazio ou CPF não tem 11 dígitos
**Solução**: Digite o CPF com 11 números (pode usar pontuação)

### 3. "CPF já cadastrado"
**Causa**: Já existe um aluno com este CPF no sistema
**Solução**: Verifique se o aluno já foi cadastrado ou corrija o CPF

### 4. "Data de Nascimento é obrigatória" / "Data inválida"
**Causa**: Campo vazio ou formato incorreto
**Solução**: Use o formato DD/MM/AAAA (ex: 15/03/2015)

### 5. "Arquivo deve ser Excel (.xlsx ou .xls)"
**Causa**: Arquivo não é Excel ou extensão incorreta
**Solução**: Salve o arquivo como Excel (.xlsx)

### 6. "Você só pode importar alunos para turmas da sua escola"
**Causa**: Diretor tentou importar para turma de outra escola
**Solução**: Selecione uma turma da sua escola

---

## 💡 Dicas e Boas Práticas

### ✅ FAÇA

- ✅ Baixe sempre um template atualizado antes de importar
- ✅ Verifique todos os dados antes do upload
- ✅ Mantenha uma cópia de segurança do arquivo
- ✅ Teste primeiro com poucos alunos (2-3)
- ✅ Corrija os erros e reimporte apenas as linhas com erro
- ✅ Use CTRL+C e CTRL+V para copiar dados de outras planilhas

### ❌ NÃO FAÇA

- ❌ Não altere os nomes das colunas (cabeçalhos)
- ❌ Não use formatos de data diferentes de DD/MM/AAAA
- ❌ Não deixe células com fórmulas nos campos de dados
- ❌ Não importegooglerande quantidade sem testar antes
- ❌ Não feche a página durante o upload

---

## 🔄 Reimportação Após Erros

Se houver erros na importação:

1. **Anote os números das linhas com erro** (tabela de detalhes)
2. **Abra novamente o arquivo original**
3. **Corrija apenas as linhas com erro**
4. **Remova as linhas que foram importadas com sucesso**
5. **Faça novo upload** apenas com as linhas corrigidas

---

## 📈 Fluxo Completo

```
1. Dashboard → Card "Importar Alunos"
                ↓
2. Baixar Template Excel
                ↓
3. Preencher planilha com dados dos alunos
                ↓
4. Salvar arquivo Excel
                ↓
5. Selecionar Turma de destino
                ↓
6. Fazer Upload do arquivo
                ↓
7. Aguardar processamento
                ↓
8. Verificar resultado
                ↓
9a. Sucesso total ✅ → Concluído!
9b. Erros parciais ⚠️ → Corrigir e reimportar
```

---

## 🔐 Permissões e Segurança

### Diretor/Coordenador
- ✅ Pode baixar o template
- ✅ Pode importar alunos para **turmas da sua escola**
- ❌ Não pode importar para turmas de outras escolas
- ✅ Vê apenas turmas da sua escola na seleção

### Gestão Municipal
- ✅ Pode baixar o template
- ✅ Pode importar alunos para **qualquer turma**
- ✅ Vê todas as turmas ativas na seleção

### Validações de Segurança
- CPF duplicado é rejeitado automaticamente
- Apenas arquivos Excel são aceitos
- Upload limitado apenas a perfis autorizados
- Validação de permissões no backend (dupla camada)

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. **Verifique este guia** primeiro
2. **Consulte a aba INSTRUÇÕES** do template
3. **Teste com poucos dados** para identificar o problema
4. **Entre em contato** com o suporte técnico se necessário

---

## 📝 Exemplo Prático Passo a Passo

### Cenário: Diretora Maria quer importar 10 novos alunos

**1. Acessar:**
- Login → Dashboard → "Importar Alunos"

**2. Baixar:**
- Clica em "Baixar Template"
- Arquivo salvo: `template_importacao_alunos_2025-01-19.xlsx`

**3. Preencher:**
- Abre o Excel
- Lê as instruções na aba "INSTRUÇÕES"
- Vai para aba "ALUNOS"
- Remove/sobrescreve a linha de exemplo
- Preenche 10 linhas com dados dos alunos
- Verifica CPFs, datas e nomes
- Salva o arquivo

**4. Importar:**
- Volta para o sistema
- Seleciona "Turma 5º Ano A - Matutino"
- Clica "Selecionar Arquivo"
- Escolhe o arquivo preenchido
- Clica "Importar Alunos"

**5. Resultado:**
- ✅ 9 alunos importados
- ❌ 1 erro: "Linha 5: CPF já cadastrado"
- Anota que a linha 5 tem problema

**6. Corrigir:**
- Abre novamente o Excel
- Verifica linha 5 (aluno João)
- Descobre que João já está no sistema
- Remove a linha 5
- Salva arquivo corrigido

**7. Pronto!**
- Importação concluída com sucesso! 🎉

---

## 🎓 Resumo Rápido

| Passo | Ação | Tempo Estimado |
|-------|------|----------------|
| 1 | Baixar template | 10 segundos |
| 2 | Preencher dados | 5-10 minutos |
| 3 | Selecionar turma | 5 segundos |
| 4 | Upload e importação | 10-30 segundos |
| 5 | Verificar resultado | 1 minuto |

**Total: ~15 minutos para importar até 50 alunos**

---

**Sistema de Importação de Alunos - EDUCA+ Curionópolis** 🚀
