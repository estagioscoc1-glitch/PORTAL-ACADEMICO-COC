import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Enable parsing of JSON body payloads
  app.use(express.json());

  // Interactive Helper Bot AI route
  app.post("/api/helper-bot", async (req: express.Request, res: express.Response) => {
    const { message, role, userName } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem vazia." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Local rule-based fallback response if API key is not present (offline/dev mode safe)
      const lowercaseMsg = message.toLowerCase();
      let reply = "";

      if (role === "admin") {
        if (lowercaseMsg.includes("cadast") || lowercaseMsg.includes("usuario") || lowercaseMsg.includes("aluno") || lowercaseMsg.includes("professor") || lowercaseMsg.includes("matricula")) {
          reply = "### Gerenciamento de Usuários (Alunos e Professores)\n" +
                  "- Acesse a aba **Registros Acadêmicos** no menu superior.\n" +
                  "- Use a busca para filtrar por **Nome** ou **Matrícula** (o CPF foi removido da busca).\n" +
                  "- Clique em **\"Cadastrar Novo Aluno\"** ou **\"Cadastrar Novo Professor\"** para registrar um novo usuário.\n" +
                  "- Edite ou transfira alunos de turma conforme necessário.";
        } else if (lowercaseMsg.includes("prazo") || lowercaseMsg.includes("bloque") || lowercaseMsg.includes("fechar") || lowercaseMsg.includes("limite")) {
          reply = "### Configurações de Prazos e Bloqueios\n" +
                  "- Acesse a aba **Segurança** ou Ferramentas.\n" +
                  "- Configure as datas de limite dos bimestres e o fechamento automático dos diários.\n" +
                  "- Após o prazo, o sistema bloqueia lançamentos de notas/faltas para professores.\n" +
                  "- Se precisar, reabra diários específicos individualmente.";
        } else if (lowercaseMsg.includes("estagio") || lowercaseMsg.includes("estágio")) {
          reply = "### Controle de Estágios Supervisionados\n" +
                  "- Acesse o painel e clique no botão **\"Gerenciar Estágios\"**.\n" +
                  "- Selecione o aluno pesquisando por nome ou matrícula.\n" +
                  "- Insira o **Local do Estágio** (ex: Hospital, Clínica) e a **Nota Final**.\n" +
                  "- Caso não preenchidos, o status do componente aparecerá para o aluno como **\"PENDENTE\"** na cor laranja.";
        } else {
          reply = "### Painel do Administrador\n" +
                  "- **Registros Acadêmicos**: Gestão de alunos, professores e turmas (busca por Nome ou Matrícula).\n" +
                  "- **Gerenciar Estágios**: Controle de locais e notas homologadas de estágio.\n" +
                  "- **Central de Mensagens**: Comunicação institucional geral.\n" +
                  "- **Segurança & Backups**: Controle de prazos, bloqueios de diários e backups redundantes no Firestore.";
        }
      } else if (role === "teacher") {
        if (lowercaseMsg.includes("nota") || lowercaseMsg.includes("falta") || lowercaseMsg.includes("frequencia") || lowercaseMsg.includes("lançar") || lowercaseMsg.includes("lancar")) {
          reply = "### Lançar Notas & Frequências\n" +
                  "1. Selecione a **Turma** e a **Disciplina (Componente)**.\n" +
                  "2. Acesse a aba **\"Notas & Frequência\"**.\n" +
                  "3. Preencha notas e faltas diretamente na planilha.\n" +
                  "4. **Importante**: Clique em **\"Salvar Alterações\"** no final da tabela para salvar os dados no banco.";
        } else if (lowercaseMsg.includes("prazo") || lowercaseMsg.includes("bloque") || lowercaseMsg.includes("limite")) {
          reply = "### Prazos e Bloqueios\n" +
                  "- Alertas de prazos limite são exibidos no topo do seu painel em vermelho.\n" +
                  "- Se o prazo vencer, o diário é bloqueado de forma automática para novos lançamentos.\n" +
                  "- Para alterações fora do prazo, solicite a reabertura administrativa na Secretaria.";
        } else if (lowercaseMsg.includes("aula") || lowercaseMsg.includes("conteudo") || lowercaseMsg.includes("ministrado") || lowercaseMsg.includes("diario")) {
          reply = "### Registrar Diário de Classe\n" +
                  "1. Vá para a aba **\"Diário de Classe\"** na disciplina selecionada.\n" +
                  "2. Clique em **\"Registrar Nova Aula\"**.\n" +
                  "3. Digite a data, o título da aula e o conteúdo pedagógico ministrado e salve.";
        } else {
          reply = "### Painel do Professor\n" +
                  "- **Notas & Frequência**: Lançamento direto na planilha interativa (clique em Salvar Alterações).\n" +
                  "- **Diário de Classe**: Registro oficial de conteúdos e aulas dadas.\n" +
                  "- **Mensagens**: Comunicação direta com a turma.\n" +
                  "- **Alertas**: Verifique no topo os prazos de fechamento dos diários.";
        }
      } else { // Student
        if (lowercaseMsg.includes("nota") || lowercaseMsg.includes("falta") || lowercaseMsg.includes("boletim") || lowercaseMsg.includes("aproveitamento")) {
          reply = "### Notas e Frequências\n" +
                  "- Acesse a aba **\"📁 Aproveitamento\"** no seu painel.\n" +
                  "- Veja as notas e médias bimestrais e a frequência acumulada de cada componente.\n" +
                  "- **Atenção**: É exigida a frequência mínima de **75%** para aprovação.";
        } else if (lowercaseMsg.includes("documento") || lowercaseMsg.includes("declara") || lowercaseMsg.includes("transporte") || lowercaseMsg.includes("escolaridade")) {
          reply = "### Emissão de Declarações\n" +
                  "- Acesse a aba **\"📄 Solicitar Declarações\"** no seu painel.\n" +
                  "- Escolha entre **Declaração de Escolaridade**, **Transporte** ou **Vacina em Dia**.\n" +
                  "- Imprima ou baixe o PDF gerado imediatamente com assinatura digital homologada.";
        } else if (lowercaseMsg.includes("estagio") || lowercaseMsg.includes("estágio")) {
          reply = "### Acompanhamento de Estágios\n" +
                  "- Acesse a aba **\" Meus Estágios\"** (ou use o botão rápido **\"Acompanhar Estágios\"** no topo).\n" +
                  "- Acompanhe o progresso de horas concluídas.\n" +
                  "- Locais ou notas de estágios pendentes de definição administrativa são exibidos com o status laranja **\"PENDENTE\"** e aviso **\"Pendente de Lançamento\"**.";
        } else {
          reply = "### Portal do Aluno\n" +
                  "- **Aproveitamento**: Consulta de boletim, notas, médias e frequência oficial (mínimo 75%).\n" +
                  "- **Solicitar Declarações**: Emissão instantânea de documentos com assinatura digital.\n" +
                  "- **Meus Documentos**: Envio de fotos do RG, CPF e Diploma para secretaria.\n" +
                  "- **Meus Estágios**: Consulta de carga horária, locais e notas de estágio (itens não lançados aparecem como PENDENTE).";
        }
      }

      return res.json({ text: reply });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `
Você é o LYNX Assistente do Portal Acadêmico do Colégio Oswaldo Cruz (COC).
Seu único objetivo é responder diretamente a perguntas de suporte técnico ou de uso da plataforma feitas pelo usuário atual, cujo nome é "${userName || 'Usuário'}" e tem a função de "${role}".

Diretrizes estritas de resposta:
1. Responda de forma extremamente objetiva, direta e simples, sem enrolação, sem saudações redundantes ou vazias ("Olá, como posso ajudar", "Olá Administrador", etc.) e sem perguntas ou sugestões de conversação ao final.
2. Não forneça menus, tópicos ou listas de alternativas de diálogo. Apenas responda a pergunta do usuário e encerre a resposta.
3. Não invente nenhuma funcionalidade. Baseie-se estritamente na realidade do sistema:
   - Alunos:
     * Notas, médias e faltas estão na aba 'Aproveitamento'. Mínimo de 75% de frequência exigido para aprovação.
     * Declarações (Escolaridade/Matrícula, Transporte, Vacina) são emitidas na hora com assinatura digital na aba 'Solicitar Declarações'.
     * Estágios Supervisionados (progresso de horas, local, notas) estão na aba 'Meus Estágios'. Itens sem local ou nota aparecem em laranja como "PENDENTE" (com aviso "Pendente de Lançamento").
     * Envio de documentos (RG, CPF, Diploma) é feito na aba de documentos.
   - Professores:
     * Lançamento de Notas e Faltas: Selecionar turma/disciplina, aba 'Notas & Frequência', preencher na planilha e clicar obrigatoriamente no botão azul 'Salvar Alterações'.
     * Registro de Aulas: Aba 'Diário de Classe' -> botão 'Registrar Nova Aula' (título, data, conteúdo ministrado).
     * Prazos e Bloqueios: Alertas vermelhos de prazos limites no topo do painel. Ao atingir o prazo limite, os diários são bloqueados automaticamente para novos lançamentos.
     * Mensagens: Canal de comunicação direta com a turma.
   - Administradores:
     * Cadastro e busca de alunos/professores na aba 'Registros Acadêmicos'. A busca é feita APENAS por Nome ou Matrícula (busca por CPF foi desativada).
     * Controle de Estágios: Aba ou botão 'Gerenciar Estágios' permite definir o local do estágio e a nota final do aluno. Se não lançado, fica pendente em laranja para o aluno.
     * Prazos e Fechamentos: Configura prazos e realiza o bloqueio/desbloqueio administrativo de diários.
     * Backups e Segurança: Gestão de backups redundantes na nuvem (Firestore e Firebase Storage).
4. Suas respostas devem ser COMPLETAS, mas extremamente enxutas, curtas e sem enrolação. Nunca interrompa o texto no meio de uma frase.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `O usuário perguntou: "${message}"` }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
          maxOutputTokens: 2500,
        }
      });

      const replyText = response.text || "Desculpe, não consegui processar sua resposta no momento.";
      return res.json({ text: replyText });
    } catch (error) {
      console.error("Erro na chamada do Gemini API:", error);
      return res.status(500).json({ error: "Erro interno ao processar inteligência artificial." });
    }
  });

  // Detect production environment robustly
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.argv[1] && (process.argv[1].includes("server.cjs") || process.argv[1].includes("dist")));

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Development catch-all route to serve and transform index.html
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Como o server.cjs compilado fica dentro da pasta 'dist' em produção,
    // o __dirname aponta diretamente para '/app/applet/dist'.
    const distPath = typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Production catch-all route to serve the built index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
