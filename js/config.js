/* =========================================================
   CONFIGURAÇÃO GERAL
   - AUTH.enabled = false  → entra direto como Administrador.
   - Mude para true quando quiser exigir login (tela já pronta).
   - API.baseUrl → quando tiver backend, aponte aqui e troque as
     funções de Store (store.js) por chamadas fetch().
   ========================================================= */
window.CONFIG = {
  appName: 'VTN Hub',
  APP_VERSION: '2026.11.03-1100',   // muda a cada atualização publicada
  appTagline: 'Gestão de obras e engenharia',
  AUTH: {
    enabled: true,            // login obrigatório (desligue com false)
    defaultUserId: 'US-0001', // usuário usado enquanto o login está desligado
    sessionKey: 'vtn_session'
  },
  API: {
    baseUrl: null             // ex.: 'https://api.suaempresa.com.br/v1'
  },
  impostoPadrao: 6,           // % imposto padrão em orçamentos
  moeda: 'BRL'
};

/* Papéis e permissões.
   '*' = acesso total. Use can('financeiro.editar') no código. */
window.PERMISSOES = [
  ['dashboard',          'Painel e métricas'],
  ['obras.ver',          'Ver obras/serviços'],
  ['obras.editar',       'Criar/editar obras, etapas, medições'],
  ['os',                 'Ordens de serviço'],
  ['pendencias',         'Pendências e entregas'],
  ['financeiro.ver',     'Ver caixa, balanço, lucro'],
  ['financeiro.editar',  'Lançar receitas/despesas e pagamentos'],
  ['orcamentos',         'Orçamentos'],
  ['contratos',          'Contratos'],
  ['pessoas',            'Clientes, equipe e fornecedores'],
  ['arquivos',           'Subir/baixar arquivos'],
  ['calendario',         'Calendário'],
  ['chat',               'Chat e grupos'],
  ['relatorios',         'Relatórios'],
  ['config',             'Configurações e usuários']
];

window.PAPEIS = {
  admin:      { nome: 'Administrador', perms: ['*'] },
  gestor:     { nome: 'Gestor de obras', perms: ['dashboard','obras.ver','obras.editar','os','pendencias','financeiro.ver','orcamentos','contratos','pessoas','arquivos','calendario','chat','relatorios'] },
  financeiro: { nome: 'Financeiro', perms: ['dashboard','obras.ver','financeiro.ver','financeiro.editar','orcamentos','contratos','pessoas','arquivos','calendario','chat','relatorios'] },
  engenheiro: { nome: 'Engenheiro / Técnico', perms: ['obras.ver','obras.editar','os','pendencias','arquivos','calendario','chat'] },
  colaborador:{ nome: 'Colaborador de campo', perms: ['obras.ver','os','pendencias','calendario','chat'] },
  cliente:    { nome: 'Cliente (portal)', perms: ['obras.ver','chat','arquivos'] },
  leitor:     { nome: 'Somente visualização', perms: ['dashboard','obras.ver','os','pendencias','financeiro.ver','orcamentos','contratos','pessoas','arquivos','calendario','chat','relatorios'] }
};

/* Listas usadas em formulários */
window.LISTAS = {
  statusObra: ['Prospecção','Orçamento','Contratada','Em planejamento','Em execução','Paralisada','Em entrega','Concluída','Cancelada'],
  origem: ['Indicação de cliente','Indicação de parceiro/arquiteto','Correspondente CAIXA','Instagram','Facebook','Google / site','WhatsApp','Cliente recorrente','Licitação / credenciamento','Placa de obra','Outro'],
  tipoObra: ['Obra','Serviço','Projeto','Reforma','Laudo/Vistoria'],
  modalidade: ['Empreitada global','Administração','Financiamento CAIXA','Prestação de serviço de engenharia','Elaboração de projetos','Mão de obra'],
  pastas: [
    '00_COMERCIAL','01_PLANEJAMENTO','02_EXECUÇÃO','03_ENTREGA',
    'COTAÇÕES','QUANTITATIVOS','MEDIÇÕES','PROJETOS CLIENTE',
    'DOCUMENTOS EMITIDOS VTN','COMPROVANTES_PG_CLIENTE','NOTAS FISCAIS','FOTOS'
  ],
  tipoPessoa: ['Cliente','Funcionário','Responsável técnico','Arquiteto(a)','Fornecedor','Prestador/Empreiteiro','Sócio','Outro'],
  catReceita: ['Recebimento etapa com NF','Recebimento etapa sem NF','Serviço de engenharia','Projetos','Aditivo','Outras receitas'],
  catDespesa: ['Material','Mão de obra','Empreiteiro','Equipamentos/Locação','Projetos/Terceiros','Taxas (ART/Alvará/CNO)','Impostos','Deslocamento','Administrativo','Marketing / anúncios','Outras despesas'],
  formaPgto: ['PIX','Transferência','Boleto','Dinheiro','Cartão de crédito','Cheque','Financiamento CAIXA'],
  prioridade: ['Baixa','Média','Alta','Crítica'],
  statusPend: ['Aberta','Em andamento','Resolvida'],
  statusEntrega: ['Pendente','Em elaboração','Entregue','Aprovada'],
  statusOS: ['Aberta','Em execução','Aguardando','Concluída','Cancelada'],
  disciplinas: ['Arquitetônico','Estrutural','Hidrossanitário','Elétrico','3D / Imagens','Orçamento','Contrato','Proposta','PCI/PLS CAIXA','Outro'],
  statusRev: ['Em elaboração','Enviada','Em análise','Aprovada','Substituída'],
  tipoEvento: ['Reunião','Visita','Medição','Entrega','Vencimento','Outro'],
  statusOrc: ['Rascunho','Enviado','Aprovado','Recusado'],
  statusContrato: ['Rascunho','Enviado','Assinado','Encerrado','Cancelado']
};

/* Tabela de incidências CAIXA (limites mín/máx por serviço) —
   extraída de LIMITES_INCIDÊNCIAS_ETAPAS_CAIXA.xlsx */
window.CAIXA_SERVICOS = [
  ['Serviços Preliminares e Gerais', 1.13, 3.97],
  ['Infraestrutura', 3.07, 7.43],
  ['Supra estrutura', 12.17, 17.67],
  ['Paredes e Painéis', 4.80, 10.67],
  ['Esquadrias', 4.16, 13.27],
  ['Vidros e Plásticos', 0, 2.45],
  ['Coberturas', 0, 12.94],
  ['Impermeabilizações', 0, 10.10],
  ['Revestimentos Internos', 6.81, 9.32],
  ['Forros', 0, 2.18],
  ['Revestimentos Externos', 3.87, 5.30],
  ['Pintura', 3.63, 6.47],
  ['Pisos', 8.41, 11.51],
  ['Acabamentos', 1.01, 1.38],
  ['Inst. Elétricas e Telefônicas', 3.75, 4.85],
  ['Instalações Hidráulicas', 3.63, 4.27],
  ['Inst. Esgoto e Águas Pluviais', 3.65, 4.30],
  ['Louças e Metais', 4.14, 4.87],
  ['Complementos', 0.24, 2.29],
  ['Outros Serviços', 0, 10.00]
];
