/* =========================================================
   MODELOS DA VTN — extraídos (somente leitura) dos documentos
   mais recentes de cada tipo nas pastas da empresa:
   OneDrive\00_VTN\00_SERVIÇOS e Área de Trabalho (01/11/2026).
   Os textos seguem os originais; dados do cliente/obra viram {{VARIÁVEIS}}.
   ========================================================= */
window.VTN_MODELOS = (() => {
  const VERSAO = 3;

  /* Sócios e responsáveis (conforme os contratos da VTN) */
  const SOCIOS = [
    { nome: 'Ismael José Viana Timóteo', cpf: '', rg: '', titulo: 'Engenheiro Civil', crea: 'CREA/MG 251884', rt: true, estadoCivil: 'casado' },
    { nome: 'Victor Hugo Bertoni Alves', titulo: 'Engenheiro Civil', crea: 'CREA/MG 346007' },
    { nome: 'Geraldo Magela Viana Timóteo', cpf: '', rg: '' },
    { nome: 'Marcos Arlindo Viana', cpf: '' }
  ];
  const EMPRESA = {
    sede: 'Rodovia Anel Rodoviário Celso Mello Azevedo, nº 27001, Bairro Nazaré, CEP 31990-055, Belo Horizonte/MG',
    escritorio: 'Edifício Cristiano Machado – Rua Juruá, nº 46, Sala 704, 7º Andar, Bairro Graça, CEP 31140-020, Belo Horizonte/MG',
    email: 'contato@vtnengenharia.com.br', telefone: '(31) 9 9539-1592', site: 'vtnengenharia.com.br', crea: 'Registro CREA/MG 1546368', slogan: 'Seu projeto, nossa missão!'
  };

  /* Tabela de preços de projetos (planilha ORÇAMENTO.xlsx – out/2026) */
  const PRECOS_PROJETOS = [
    ['Projetos e documentação (tabela VTN)', 'ART – Anotação de Responsabilidade Técnica de Projetos', 'verba', 110],
    ['Projetos e documentação (tabela VTN)', 'Levantamento topográfico de lote', 'verba', 850],
    ['Projetos e documentação (tabela VTN)', 'Topografia + terraplenagem', 'verba', 800],
    ['Projetos e documentação (tabela VTN)', 'Elaboração de projeto arquitetônico', 'verba', 3500],
    ['Projetos e documentação (tabela VTN)', 'Elaboração de projeto estrutural', 'm²', 16],
    ['Projetos e documentação (tabela VTN)', 'Elaboração de projeto de instalações elétricas', 'm²', 7],
    ['Projetos e documentação (tabela VTN)', 'Elaboração de projeto de instalações hidrossanitárias', 'm²', 7],
    ['Projetos e documentação (tabela VTN)', 'PCI CAIXA', 'verba', 500],
    ['Projetos e documentação (tabela VTN)', 'PLS CAIXA (por medição)', 'un', 380],
    ['Projetos e documentação (tabela VTN)', 'Plantas topográficas + memoriais descritivos', 'verba', 450],
    ['Projetos e documentação (tabela VTN)', 'Entrada e aprovação de documentação na prefeitura', 'verba', 900],
    ['Projetos e documentação (tabela VTN)', 'Vistoria de engenharia – imóvel', 'hora', 250],
    ['Projetos e documentação (tabela VTN)', 'Deslocamento', 'verba', 200],
    ['Projetos e documentação (tabela VTN)', 'Construção (referência por m²)', 'm²', 4150]
  ];

  /* Modelos prontos de orçamento (planilhas da VTN) */
  const MODELOS_ORC = [
    { id: 'projetos_m2', nome: 'Projetos residenciais (tabela VTN por m²)', origem: 'ORÇAMENTO.xlsx – Pedro & Rosimar (27/10/2026)', imposto: 6, porArea: true,
      itens: [['ART – Anotação de Responsabilidade Técnica de Projetos', 'verba', 1, 110], ['Elaboração de projeto estrutural', 'm²', 'A', 16], ['Elaboração de projeto de instalações hidrossanitárias', 'm²', 'A', 7], ['Elaboração de projeto de instalações elétricas', 'm²', 'A', 7]],
      condicoes: 'PIX, depósito, transferência ou boleto: 50% na assinatura do contrato e 50% na entrega dos projetos, ou à vista com 10% de desconto. Cartão de crédito: à vista ou em até 6x sem juros.', obs: 'Não inclusos: taxas da prefeitura, protocolos e taxas cartoriais, execução da obra.' },
    { id: 'projetos_completo', nome: 'Pacote completo de projetos + CAIXA', origem: 'ORÇAMENTO.xlsx – projetos (out/2026)', imposto: 6, porArea: true,
      itens: [['Levantamento topográfico de lote', 'verba', 1, 850], ['Elaboração de projeto arquitetônico', 'verba', 1, 3500], ['Elaboração de projeto estrutural', 'm²', 'A', 16], ['Elaboração de projeto de instalações elétricas', 'm²', 'A', 7], ['Elaboração de projeto de instalações hidrossanitárias', 'm²', 'A', 7], ['PCI CAIXA', 'verba', 1, 500], ['PLS CAIXA (por medição)', 'un', 10, 380], ['ART – Anotação de Responsabilidade Técnica de Projetos', 'verba', 1, 110]],
      condicoes: '50% no início e 50% na entrega dos projetos. À vista via PIX com 5% de desconto, ou cartão de crédito em até 10x sem juros.', obs: 'Não inclusos: taxas e alvarás da prefeitura.' },
    { id: 'topografia', nome: 'Levantamento topográfico + aprovação', origem: 'Proposta 179_R1/2026 – Rodrigo (29/10/2026)', imposto: 0,
      itens: [['Levantamento topográfico dos lotes e confrontações', 'verba', 1, 1200], ['Plantas topográficas + memoriais descritivos', 'verba', 1, 450], ['Entrada e aprovação de documentação na prefeitura', 'verba', 1, 900], ['ART – Anotação de Responsabilidade Técnica de Projetos', 'verba', 1, 110]],
      condicoes: '60% no início e 40% na entrega das plantas aprovadas. À vista via PIX com 10% de desconto, ou cartão de crédito em até 3x.', obs: 'Não inclusos: taxas e alvarás da prefeitura, taxas cartoriais, levantamento da documentação e coleta de anuência das confrontações.' },
    { id: 'obra_mo', nome: 'Obra – mão de obra (modelo VTN)', origem: 'ORÇAMENTO.xlsx – Marcos & Júlia (12/11/2025)', imposto: 10.5,
      itens: [['Alvenaria', 'm²', 0, 60], ['Piso porcelanato', 'm²', 0, 60], ['Contrapiso', 'm²', 0, 40], ['Revestimento parede cozinha', 'm²', 0, 60], ['Revestimento parede área de serviço', 'm²', 0, 60], ['Revestimento parede banheiro', 'm²', 0, 100], ['Reboco externo', 'm²', 0, 60], ['Emboço interno', 'm²', 0, 40], ['Reboco interno', 'm²', 0, 40], ['Pontos de iluminação', 'pts', 0, 180], ['Pontos de tomada', 'pts', 0, 100], ['Pontos de hidráulica', 'pts', 0, 440], ['Pontos de esgoto', 'pts', 0, 580], ['Sapatas', 'un', 0, 300], ['Vigas baldrame', 'm', 0, 40], ['Vigas', 'm', 0, 60], ['Pilares', 'un', 0, 120], ['Laje', 'm²', 0, 35], ['Portas', 'un', 0, 200], ['Escada – acabamentos', 'degrau', 0, 300], ['Escada – concretagem', 'degrau', 0, 150]],
      condicoes: 'Pagamento por medições a cada 15 dias, via depósito, transferência, boleto ou cartão de crédito.', obs: 'Não inclusos: pintura geral, forro/reboco de teto, telhado, taxas da prefeitura, materiais e insumos.' },
    { id: 'vistoria', nome: 'Vistoria / laudo (por hora)', origem: 'Recibo VTN00471 (12/12/2025) e Proposta 118/2025', imposto: 0,
      itens: [['Vistoria de engenharia – imóvel', 'hora', 2, 250], ['Laudo de vistoria', 'verba', 1, 0]],
      condicoes: 'À vista via PIX/TED, ou cartão de crédito em até 3x (acréscimo de 5%).', obs: 'Laudo entregue em até 10 dias após a visita. Inclui ART e nota fiscal.' }
  ];

  const ASS_PROJ = '{{ASSINATURAS_PROJETO}}', ASS_OBRA = '{{ASSINATURAS_OBRA}}';

  const DOCS = [
    { id: 'vtn_contrato_projetos', categoria: 'Contrato', nome: 'Contrato de elaboração de projetos – modelo VTN 2026', origem: '00_CONTRATO_PROJETOS_PEDRO&ROSIMAR_VTN.docx (30/10/2026)', corpo:
`<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ELABORAÇÃO DE PROJETOS – {{ANO}}</h1>
<p>Este Contrato de Prestação de Serviços de Elaboração de Projetos é celebrado em {{DATA}}, na cidade de {{CIDADE_ASSINATURA}}, entre:</p>
<h2>PARTES CONTRATANTES</h2>
<p><b>CONTRATANTE:</b> {{CLIENTES_QUALIFICACAO}}, doravante denominado(s), em conjunto, simplesmente CONTRATANTE.</p>
<p><b>CONTRATADA:</b> {{EMPRESA_NOME}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{EMPRESA_CNPJ}}, com escritório localizado no {{EMPRESA_ESCRITORIO}}, neste ato representada por seu sócio e administrador {{REPRESENTANTE_QUALIFICACAO}}.</p>
<p>As partes acima identificadas, doravante denominadas individualmente "Parte" e conjuntamente "Partes", celebram o presente Contrato de Prestação de Serviços de Elaboração de Projetos, que se regerá pelas cláusulas e condições seguintes, bem como pela {{PROPOSTA_REF}}, que é parte integrante e indissociável deste instrumento:</p>
<h2>DO OBJETO DO CONTRATO</h2>
<p class="cl">CLÁUSULA PRIMEIRA – Objeto:</p>
<p>O presente contrato tem como objeto a prestação, pela CONTRATADA, de serviços técnicos de engenharia para a {{OBJETO}} de uma residência unifamiliar com área projetada de {{OBRA_AREA}} m², a ser construída no imóvel localizado na {{OBRA_ENDERECO}}, na cidade de {{OBRA_CIDADE}}, em área de terreno de {{TERRENO_AREA}} m², de propriedade do CONTRATANTE.</p>
<p class="cl">CLÁUSULA SEGUNDA – Escopo dos Serviços:</p>
<p>Os serviços contratados compreendem:</p>{{LISTA_ESCOPO}}
<p>Os projetos serão desenvolvidos com base no projeto arquitetônico aprovado pela Prefeitura Municipal de {{OBRA_CIDADE}}, fornecido pelo CONTRATANTE, o qual é parte integrante deste contrato.</p>
<p>Não inclusos os seguintes itens:</p>{{LISTA_NAO_INCLUSO}}
<h2>DAS OBRIGAÇÕES E RESPONSABILIDADES</h2>
<p class="cl">CLÁUSULA TERCEIRA – Obrigações da CONTRATADA:</p>
<ol class="rom"><li>Elaborar os projetos objeto deste contrato em estrita observância ao projeto arquitetônico aprovado, às normas técnicas da ABNT aplicáveis e à legislação municipal pertinente.</li><li>Emitir a ART – Anotação de Responsabilidade Técnica referente aos projetos elaborados, junto ao CREA/MG.</li><li>Entregar os projetos nos formatos e prazos estabelecidos neste contrato.</li><li>Prestar ao CONTRATANTE os esclarecimentos técnicos necessários ao entendimento dos projetos elaborados.</li><li>Corrigir, sem ônus para o CONTRATANTE, eventuais erros ou omissões técnicas de sua responsabilidade identificados nos projetos entregues.</li><li>Comunicar ao CONTRATANTE, em tempo hábil, qualquer fato que possa comprometer o prazo ou a adequada elaboração dos projetos.</li><li>Emitir nota fiscal referente aos serviços prestados.</li></ol>
<p class="cl">CLÁUSULA QUARTA – Obrigações do CONTRATANTE:</p>
<ol class="rom"><li>Fornecer à CONTRATADA o projeto arquitetônico aprovado pela Prefeitura, preferencialmente em formato DWG, bem como as demais informações e documentos necessários à elaboração dos projetos (levantamento topográfico, sondagem do solo, entre outros, quando solicitados).</li><li>Efetuar os pagamentos nas condições e prazos estabelecidos.</li><li>Comunicar previamente à CONTRATADA qualquer alteração no projeto arquitetônico, ciente de que tais alterações poderão impactar os prazos e os valores ajustados.</li><li>Arcar com as taxas, emolumentos e demais custos não inclusos no escopo deste contrato.</li></ol>
<p class="cl">CLÁUSULA QUINTA – Autonomia e Qualidade da CONTRATADA:</p>
<p>A CONTRATADA executará seus trabalhos de forma autônoma e independente, sem qualquer vínculo empregatício com o CONTRATANTE, sendo responsável pelos encargos trabalhistas, previdenciários e fiscais de sua equipe e garantindo a qualidade dos serviços contratados.</p>
<h2>DA ENTREGA, ALTERAÇÕES E ACOMPANHAMENTO</h2>
<p class="cl">CLÁUSULA SEXTA – Forma de Apresentação e Entrega:</p>
<ol class="rom"><li>Os projetos elaborados serão enviados ao CONTRATANTE via e-mail, nos formatos DWG e PDF.</li><li>A ART – Anotação de Responsabilidade Técnica será entregue assinada, em via física e digital.</li></ol>
<p class="cl">CLÁUSULA SÉTIMA – Alterações e Serviços Adicionais:</p>
<p>Alterações nos projetos solicitadas pelo CONTRATANTE após a sua entrega, ou decorrentes de modificações no projeto arquitetônico, bem como quaisquer serviços não previstos neste contrato, deverão ser objeto de um Termo Aditivo específico, com a descrição dos serviços, prazos e custos adicionais.</p>
<p class="cl">CLÁUSULA OITAVA – Acompanhamento da Execução:</p>
<p>Está incluso o acompanhamento técnico da execução dos projetos caso a obra seja executada pela VTN Engenharia e Construções. Caso a obra seja executada por terceiros, o acompanhamento não está incluso neste contrato e, se desejado, deverá ser contratado à parte.</p>
<p class="cl">CLÁUSULA NONA – Utilização dos Projetos:</p>
<p>Os projetos elaborados destinam-se exclusivamente à construção da residência objeto deste contrato, sendo vedada a sua reutilização em outras obras sem autorização expressa da CONTRATADA, nos termos da Lei nº 9.610/1998.</p>
<h2>DO PREÇO, PAGAMENTO, PRAZO E CONDIÇÕES GERAIS</h2>
<p class="cl">CLÁUSULA DÉCIMA – Preço e Forma de Pagamento:</p>
<p>O valor global ajustado pela prestação dos serviços objeto deste contrato é de <b>{{VALOR}} ({{VALOR_EXTENSO}})</b>, com impostos aplicados, assim discriminado:</p>{{LISTA_ESCOPO_VALORES}}
<p>O pagamento poderá ser realizado via PIX, depósito, transferência, boleto bancário ou cartão de crédito, conforme a opção escolhida pelo CONTRATANTE:</p>
<p>( ) PIX, depósito, transferência ou boleto à vista com {{DESCONTO_PIX}}% de desconto ({{VALOR_PIX}}) ou 50% (cinquenta por cento), equivalente a {{VALOR_50}}, no início dos serviços (assinatura deste contrato), e 50% (cinquenta por cento), equivalente a {{VALOR_50}}, após a entrega dos projetos;</p>
<p>( ) Cartão de crédito: {{VALOR}} à vista ou em até {{PARCELAS_CARTAO}} parcelas sem juros.</p>
<p>A CONTRATADA emitirá a nota fiscal correspondente aos serviços prestados.</p>
<p class="cl">CLÁUSULA DÉCIMA PRIMEIRA – Prazo de Entrega:</p>
<p>Os projetos serão entregues em até {{PRAZO_DIAS}} ({{PRAZO_DIAS_EXTENSO}}) dias contados do recebimento, pela CONTRATADA, do projeto arquitetônico aprovado pela Prefeitura em formato DWG. Início programado para {{DATA_INICIO}}.</p>
<p>O prazo acima ficará suspenso enquanto houver pendência de informações, documentos ou definições de responsabilidade do CONTRATANTE, bem como em hipóteses de caso fortuito ou força maior devidamente comprovadas.</p>
<p class="cl">CLÁUSULA DÉCIMA SEGUNDA – Responsabilidade Técnica:</p>
<p>A CONTRATADA responde tecnicamente pelos projetos por ela elaborados, nos termos da ART emitida. Não lhe caberá responsabilidade por falhas decorrentes de execução em desacordo com os projetos, de alterações promovidas por terceiros sem sua anuência ou de informações incorretas fornecidas pelo CONTRATANTE.</p>
<p class="cl">CLÁUSULA DÉCIMA TERCEIRA – Rescisão Contratual:</p>
<p>A rescisão deste contrato ocorrerá de forma plena, podendo ser por iniciativa da CONTRATADA ou do CONTRATANTE, caso uma das Partes não cumpra qualquer das cláusulas e condições estabelecidas neste contrato, após notificação e prazo de 15 dias para regularização.</p>
<p>Em caso de rescisão, será devida à CONTRATADA a remuneração proporcional aos serviços efetivamente executados até a data da rescisão, sem prejuízo de eventuais multas e encargos aplicáveis à parte que houver dado causa à rescisão.</p>
<p class="cl">CLÁUSULA DÉCIMA QUARTA – Multa por Rescisão Antecipada (Desistência):</p>
<p>Em caso de descumprimento ou rescisão antecipada (desistência) de qualquer uma das Partes, a Parte desistente arcará com uma multa de 10% (dez por cento) do valor global do contrato, sem prejuízo de outras perdas e danos.</p>
<p class="cl">CLÁUSULA DÉCIMA QUINTA – Perdas e Danos:</p>
<p>As Partes acordam que a Parte que infringir quaisquer cláusulas deste contrato responderá por perdas e danos causados à outra Parte, além das multas contratuais.</p>
<p class="cl">CLÁUSULA DÉCIMA SEXTA – Vigência:</p>
<p>O presente contrato passa a vigorar entre as Partes a partir da data de sua assinatura, permanecendo válido até a entrega dos projetos e a quitação integral do valor ajustado.</p>
<p class="cl">CLÁUSULA DÉCIMA SÉTIMA – Foro:</p>
<p>Para dirimir quaisquer controvérsias oriundas do presente contrato, as Partes elegem o foro da comarca de {{FORO}}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
<p>E por estarem assim justos e contratados, firmam o presente instrumento em 02 (duas) vias de igual teor e forma.</p>
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
${ASS_PROJ}` },

    { id: 'vtn_empreitada_global', categoria: 'Contrato', nome: 'Contrato de construção por empreitada global (CAIXA) – modelo VTN 2026', origem: 'CONTRATO DE CONSTRUÇÃO POR EMPREITADA GLOBAL - RAFAEL&RAIANE.docx (20/10/2026)', corpo:
`<h1>CONTRATO DE CONSTRUÇÃO POR EMPREITADA GLOBAL – {{ANO}}</h1>
<p>Este Contrato de Construção por Empreitada Global é celebrado em {{DATA_EXTENSO}}, na cidade de {{CIDADE_ASSINATURA}}, entre:</p>
<h2>PARTES CONTRATANTES</h2>
<p><b>CONTRATANTE:</b> {{CLIENTES_QUALIFICACAO}}.</p>
<p><b>CONTRATADA:</b> {{EMPRESA_NOME}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{EMPRESA_CNPJ}}, com sede na {{EMPRESA_SEDE}}, neste ato representada por seus sócios e administradores {{SOCIOS_QUALIFICACAO}}.</p>
<p>As partes acima identificadas, doravante denominadas individualmente "Parte" e conjuntamente "Partes", celebram o presente Contrato de Construção por Empreitada Global, que se regerá pelas cláusulas e condições seguintes:</p>
<h2>DO OBJETO DO CONTRATO</h2>
<p class="cl">CLÁUSULA PRIMEIRA – Objeto:</p>
<p>O presente contrato tem como objeto {{OBJETO}} e a construção do imóvel residencial localizado na {{OBRA_ENDERECO}}, na cidade de {{OBRA_CIDADE}}, de propriedade do CONTRATANTE.</p>
<p class="cl">CLÁUSULA SEGUNDA – Execução da Obra:</p>
<p>O serviço de construção da residência de {{OBRA_AREA}} m² será executado integralmente pela CONTRATADA, em conformidade com os projetos arquitetônicos, estruturais, hidráulicos e elétricos, os quais são partes integrantes e indissociáveis deste contrato, devendo as especificações técnicas neles contidas serem rigorosamente seguidas.</p>
<p>Não inclusos os seguintes itens (internos e externos à construção de {{OBRA_AREA}} m²):</p>{{LISTA_NAO_INCLUSO}}
<h2>DA EXECUÇÃO E RESPONSABILIDADES</h2>
<p class="cl">CLÁUSULA TERCEIRA – Responsabilidade Trabalhista e por Acidentes:</p>
<p>A execução das obras será de responsabilidade exclusiva da CONTRATADA, que se obriga ao pagamento de todos os encargos sociais, trabalhistas e previdenciários (INSS, FGTS, PIS/PASEP, entre outros) referentes à mão de obra empregada na construção. A CONTRATADA será a única e integral responsável por eventuais acidentes de trabalho, danos a terceiros ou quaisquer outros eventos danosos decorrentes da execução da obra.</p>
<p class="cl">CLÁUSULA QUARTA – Fornecimento de Mão de Obra, Ferramentas e Equipamentos:</p>
<p>A CONTRATADA fornecerá todo o pessoal necessário para a execução do serviço, bem como todas as ferramentas, máquinas e equipamentos necessários para a concretização da obra, em perfeitas condições de uso e segurança, obrigando-se ainda a:</p>
<ol class="rom"><li>Executar a obra em estrita observância ao projeto, ao memorial descritivo e às normas técnicas da ABNT aplicáveis, bem como à legislação municipal pertinente.</li><li>Providenciar a Anotação de Responsabilidade Técnica (ART) referente à execução da obra junto ao CREA/MG.</li><li>Manter profissional habilitado como Responsável Técnico durante toda a execução da obra.</li><li>Manter diário semanal de obra atualizado, registrando etapas executadas, ocorrências, paralisações e providências.</li><li>Observar as Normas Regulamentadoras (NRs) de segurança e medicina do trabalho aplicáveis à construção civil, fornecendo EPIs à sua equipe.</li><li>Responsabilizar-se integralmente pelos encargos trabalhistas, previdenciários, fiscais e securitários de sua equipe própria e subcontratada, não recaindo sobre o CONTRATANTE qualquer responsabilidade solidária ou subsidiária quanto a tais encargos.</li><li>Zelar pela limpeza e organização do canteiro de obras.</li><li>Comunicar ao CONTRATANTE, em tempo hábil, qualquer fato que possa comprometer o cronograma ou o orçamento da obra.</li></ol>
<p class="cl">CLÁUSULA QUINTA – Responsabilidades do CONTRATANTE:</p>
<ol class="rom"><li>Fornecer energia elétrica e água no local da obra.</li><li>Efetuar os pagamentos nas condições e prazos estabelecidos.</li><li>Disponibilizar o terreno livre, desimpedido e com acesso viável para a execução da obra, na data de início prevista.</li><li>Abster-se de contratar terceiros para intervir na obra em execução, ou de promover alterações por conta própria sem anuência da CONTRATADA, sob pena de exclusão de responsabilidade desta quanto aos efeitos de tal intervenção.</li><li>Adotar tempestivamente todas as providências de sua alçada perante a Caixa Econômica Federal para a liberação das parcelas do financiamento.</li></ol>
<p class="cl">CLÁUSULA SEXTA – Autonomia e Qualidade da CONTRATADA:</p>
<p>A CONTRATADA executará seus trabalhos de forma autônoma e independente, sem qualquer vínculo empregatício com o CONTRATANTE. A CONTRATADA deverá cumprir os horários e funções de seus colaboradores, garantindo a qualidade dos serviços contratados e o rigoroso cumprimento do cronograma físico-financeiro da obra de acordo com a PCI CAIXA.</p>
<h2>DOS MATERIAIS, ACABAMENTOS E VISTORIAS</h2>
<p class="cl">CLÁUSULA SÉTIMA – Aquisição de Materiais:</p>
<p>A CONTRATADA será responsável pela aquisição de todos os materiais necessários para a execução da obra, bem como pelo respectivo pagamento aos fornecedores.</p>
<p class="cl">CLÁUSULA OITAVA – Responsabilidade pelos Materiais:</p>
<p>O CONTRATANTE será responsável pela guarda e uso adequado de todos os materiais de construção entregues na obra.</p>
<p class="cl">CLÁUSULA NONA – Tabela de Acabamentos:</p>
<p>A tabela a seguir discrimina os itens de acabamentos a serem executados na obra, conforme as especificações definidas pelo CONTRATANTE:</p>{{TABELA_ACABAMENTOS}}
<p>Em caso de reajuste no valor dos materiais a CONTRATADA será responsável por arcar com os acréscimos, salvo quando a referida variação decorrer de fato imprevisível, alheio à vontade das partes e não imputável à CONTRATADA, tais como: caso fortuito ou força maior (art. 393, CC), calamidade pública, desastre natural, determinação governamental (tributária, cambial ou regulatória) que onere diretamente o insumo, ou desabastecimento comprovado do mercado fornecedor.</p>
<p class="cl">CLÁUSULA DÉCIMA – Vistorias:</p>
<p>É facultado ao CONTRATANTE realizar vistorias na obra a qualquer dia e horário, para acompanhar a execução dos trabalhos. A CONTRATADA se compromete a realizar a obra conforme as especificações dos projetos, que são partes integrantes deste contrato, e disponibilizar o acesso para as vistorias.</p>
<h2>DO PREÇO, PAGAMENTO, PRAZO E CONDIÇÕES GERAIS</h2>
<p class="cl">CLÁUSULA DÉCIMA PRIMEIRA – Preço e Forma de Pagamento:</p>
{{LISTA_ESCOPO_VALORES}}
<p>O valor total ajustado pela construção e entrega da obra é de <b>{{VALOR}} ({{VALOR_EXTENSO}})</b>.</p>
<p>Na mobilização da obra para início da construção será efetuado pelo CONTRATANTE pagamento de 5% do valor do contrato para fins de mobilização do canteiro de obras.</p>
<p>Os demais pagamentos serão realizados conforme a liberação de cada etapa do Cronograma Físico-Financeiro (Cronograma CAIXA) através da medição conforme PLS CAIXA, após as verificações do cumprimento da fase correspondente pela CONTRATADA.</p>
<p>O valor do contrato referente à execução da obra poderá ser reajustado pelo INCC (Índice Nacional de Custo da Construção) até a data de início da obra.</p>
<p class="cl">CLÁUSULA DÉCIMA SEGUNDA – Prazo de Execução:</p>
<p>A CONTRATADA se compromete a executar a obra no prazo de {{PRAZO_MESES}} ({{PRAZO_MESES_EXTENSO}}) meses, contados a partir da mobilização da obra. Este prazo é improrrogável, ressalvadas as hipóteses de força maior ou caso fortuito devidamente comprovados e registrados no Relatório Semanal de Obras.</p>
<p class="cl">CLÁUSULA DÉCIMA TERCEIRA – Da Subcontratação:</p>
<p>A CONTRATADA poderá subcontratar serviços especializados (instalações elétricas, hidrossanitárias, impermeabilização, esquadrias, entre outros), permanecendo integralmente responsável perante o CONTRATANTE pela qualidade, prazo e adequação técnica dos serviços subcontratados.</p>
<p class="cl">CLÁUSULA DÉCIMA QUARTA – Serviços Adicionais:</p>
<p>Os serviços adicionais a serem realizados na área externa da residência, e não previstos neste contrato, deverão ser objeto de um Termo Aditivo específico, com a descrição dos serviços, prazos e custos adicionais.</p>
<p class="cl">CLÁUSULA DÉCIMA QUINTA – Da Garantia da Obra:</p>
<p>A CONTRATADA garante, nos termos do art. 618 do Código Civil, a solidez e a segurança da obra pelo prazo de 5 (cinco) anos, contados da entrega definitiva, respondendo por vícios ou defeitos que comprometam a estrutura ou a segurança da edificação, desde que decorrentes de falha de execução ou de materiais empregados pela CONTRATADA.</p>
<p>Não estão cobertos pela garantia: desgaste natural, mau uso, falta de manutenção predial ordinária, alterações ou intervenções promovidas por terceiros não autorizados pela CONTRATADA, bem como danos decorrentes de caso fortuito, força maior ou eventos da natureza.</p>
<p>Vícios ou defeitos aparentes deverão ser comunicados por escrito à CONTRATADA no prazo de até 90 (noventa) dias contados da entrega da obra, sob pena de presunção de aceitação, sem prejuízo do prazo legal de garantia estrutural.</p>
<p class="cl">CLÁUSULA DÉCIMA SEXTA – Rescisão Contratual:</p>
<p>A rescisão deste contrato ocorrerá de forma plena, podendo ser por iniciativa da CONTRATADA ou do CONTRATANTE, caso uma das Partes não cumpra qualquer das cláusulas e condições estabelecidas neste contrato, após notificação e prazo de 15 dias para regularização.</p>
<p>Em caso de rescisão, será devida à CONTRATADA a remuneração proporcional aos serviços efetivamente executados e medidos até a data da rescisão, sem prejuízo de eventuais multas e encargos aplicáveis à parte que houver dado causa à rescisão.</p>
<p class="cl">CLÁUSULA DÉCIMA SÉTIMA – Multa por Rescisão Antecipada (Desistência):</p>
<p>Em caso de descumprimento ou rescisão antecipada (desistência) de qualquer uma das Partes, a Parte desistente arcará com uma multa de 10% (dez por cento) do valor global do contrato, sem prejuízo de outras perdas e danos, salvo em caso de não aprovação do financiamento da construção na CAIXA, mediante comprovação documental expedida pelo banco.</p>
<p class="cl">CLÁUSULA DÉCIMA OITAVA – Perdas e Danos:</p>
<p>As Partes acordam que a Parte que infringir quaisquer cláusulas deste contrato responderá por perdas e danos causados à outra Parte, além das multas contratuais.</p>
<p class="cl">CLÁUSULA DÉCIMA NONA – Vigência:</p>
<p>O presente contrato passa a vigorar entre as Partes a partir da data de sua assinatura.</p>
<p class="cl">CLÁUSULA VIGÉSIMA – Foro:</p>
<p>Para dirimir quaisquer controvérsias oriundas do presente contrato, as Partes elegem o foro da comarca de {{FORO}}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
<p>E por estarem assim justos e contratados, firmam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença das 02 (duas) testemunhas abaixo.</p>
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
${ASS_OBRA}` },

    { id: 'vtn_prestacao_servico', categoria: 'Contrato', nome: 'Contrato de prestação de serviços de engenharia (simples) – modelo VTN', origem: 'CONTRATO_PRESTAÇÃO_SERVIÇO-GLEDERSON&FERNANDA_R1 (05/06/2026) e THALISON (27/12/2025)', corpo:
`<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
<p>Pelo presente instrumento particular de Contrato de Prestação de Serviços de Engenharia, celebrado, de um lado, por {{CLIENTES_QUALIFICACAO}}, doravante denominado(s) CONTRATANTE e, de outro lado, pela empresa {{EMPRESA_NOME}} – CNPJ nº {{EMPRESA_CNPJ}}, devidamente inscrita no CREA/MG sob nº 1546368, neste ato representada por seu sócio {{REPRESENTANTE_QUALIFICACAO}}, residente na {{EMPRESA_SEDE}}, doravante denominada CONTRATADA, estabelecem as partes, de comum acordo, as seguintes disposições.</p>
<p class="cl">CLÁUSULA PRIMEIRA: Do Objeto</p>
<p>O objeto deste contrato é a prestação de serviços de engenharia para {{OBJETO}}, conforme itens listados a seguir:</p>{{LISTA_ESCOPO_VALORES}}
<p class="cl">CLÁUSULA SEGUNDA: Do Prazo</p>
<p>O presente ajuste tem início em {{DATA_INICIO}}, com duração enquanto vigorar o acordo e todas as atividades da CLÁUSULA PRIMEIRA forem concluídas de acordo com a demanda do CONTRATANTE.</p>
<p>Cada item será entregue em até {{PRAZO_DIAS}} ({{PRAZO_DIAS_EXTENSO}}) dias a contar da data de solicitação da realização da atividade, não havendo impedimentos devido a pendências de informações, tramitação de documentação na Prefeitura ou qualquer outro evento fortuito não previsto anteriormente.</p>
<p class="cl">CLÁUSULA TERCEIRA: Do Valor e Forma de Pagamento</p>
<p>Pelos serviços descritos na CLÁUSULA PRIMEIRA, a CONTRATADA fará jus à remuneração de <b>{{VALOR}} ({{VALOR_EXTENSO}})</b>, já incluso neste valor a ART e todos os tributos incidentes ou que vierem a incidir sobre os serviços objeto deste contrato, tais como impostos, contribuições, encargos sociais e previdenciários.</p>
<p>O pagamento será efetuado pelo CONTRATANTE da seguinte forma: {{CONDICOES_PAGAMENTO}}</p>
<p>Os valores podem ser pagos via transferência bancária (TED/PIX), boleto ou cartão de crédito/débito.</p>
<p class="cl">CLÁUSULA QUARTA: Do Regime</p>
<p>A CONTRATADA não terá qualquer vínculo empregatício com o CONTRATANTE, desempenhando suas atividades como empresa autônoma. Por meio deste contrato e da ART que será emitida, a CONTRATADA será responsável somente pelos serviços descritos, não fazendo parte deste acordo a execução da obra.</p>
<p class="cl">CLÁUSULA QUINTA: Da Rescisão</p>
<p>O presente instrumento poderá ser rescindido, a qualquer tempo, pela inadimplência de qualquer das partes. O CONTRATANTE pode a qualquer momento rescindir este instrumento, desde que esteja adimplente com os valores devidos aos serviços já entregues. A CONTRATADA, por outro lado, pode rescindir este instrumento desde que esteja adimplente com a entrega dos serviços já quitados e haja inadimplência por parte do CONTRATANTE.</p>
<p class="cl">CLÁUSULA SEXTA: Do Foro</p>
<p>Fica eleito o Foro da Comarca de {{FORO}} como competente para dirimir qualquer litígio decorrente deste contrato.</p>
<p>E, por assim estarem justas e acordadas, firmam o presente instrumento em duas vias de igual teor.</p>
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
{{ASSINATURAS_RT}}` },

    { id: 'vtn_acompanhamento_reforma', categoria: 'Contrato', nome: 'Contrato de acompanhamento técnico de reforma (com ART) – modelo VTN', origem: 'CONTRATO_PRESTAÇÃO_SERVIÇO_REFORMA_AP_BLAYNER_MENDES (30/06/2025)', corpo:
`<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
<p>Pelo presente instrumento particular de Contrato de Prestação de Serviços, celebrado, de um lado, por {{CLIENTES_QUALIFICACAO}}, doravante denominado(s) CONTRATANTE e, de outro lado, pela empresa {{EMPRESA_NOME}} – CNPJ nº {{EMPRESA_CNPJ}}, devidamente inscrita no CREA/MG sob nº 1546368, neste ato representada por seu sócio {{REPRESENTANTE_QUALIFICACAO}}, doravante denominada CONTRATADA, estabelecem as partes, de comum acordo, as seguintes disposições:</p>
<p class="cl">CLÁUSULA PRIMEIRA: Do Objeto</p>
<p>O objeto deste contrato é a prestação de Serviços de Engenharia com emissão de ART relacionados ao acompanhamento da execução de {{OBJETO}}, consistindo em:</p>{{LISTA_ESCOPO}}
<p class="cl">CLÁUSULA SEGUNDA: Do Prazo</p>
<p>O presente ajuste tem duração de {{DATA_INICIO}} até o fim das obras, com a entrega do Laudo de Reforma e sua respectiva aprovação por parte do CONTRATANTE.</p>
<p class="cl">CLÁUSULA TERCEIRA: Do Valor</p>
<p>Pelos serviços descritos na cláusula primeira, a CONTRATADA fará jus à remuneração de <b>{{VALOR}} ({{VALOR_EXTENSO}})</b>, sendo pagos em 3 parcelas (30% no início dos trabalhos, 40% durante e os 30% restantes ao fim da obra e aceite final), já incluso neste valor todos os tributos incidentes ou que vierem a incidir sobre os serviços objeto deste contrato, tais como impostos, contribuições, encargos sociais e previdenciários.</p>
<p class="cl">CLÁUSULA QUARTA: Do Regime</p>
<p>A CONTRATADA não terá qualquer vínculo empregatício com o CONTRATANTE, desempenhando suas atividades como empresa autônoma.</p>
<p class="cl">CLÁUSULA QUINTA: Da Rescisão</p>
<p>O presente instrumento poderá ser rescindido, a qualquer tempo, pela inadimplência de qualquer parte.</p>
<p class="cl">CLÁUSULA SEXTA: Do Foro</p>
<p>Fica eleito o Foro da Comarca de {{FORO}} como competente para dirimir qualquer litígio decorrente deste contrato.</p>
<p>E, por assim estarem justas e acordadas, firmam o presente instrumento em duas vias de igual teor.</p>
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
{{ASSINATURAS_RT}}` },

    { id: 'vtn_proposta_2026', categoria: 'Proposta', nome: 'Proposta comercial – modelo VTN 2026 (projetos, topografia, serviços)', origem: 'PROPOSTA_COMERCIAL_TOPOGRAFIA_RODRIGO (29/10/2026) e PROJETOS_JONATAN (20/10/2026)', corpo:
`<h1>PROPOSTA COMERCIAL<br><small>{{TITULO}}</small></h1>
<table class="kv"><tr><th>CLIENTE</th><td>{{CLIENTES_NOMES}}</td><th>DATA</th><td>{{DATA_EXTENSO}}</td><th>PROPOSTA Nº</th><td>{{NUMERO}}</td></tr></table>
<h2>1. APRESENTAÇÃO</h2>
<p>{{CLIENTE_SAUDACAO}},</p>
<p>É com satisfação que a VTN Engenharia e Construções apresenta esta proposta para {{OBJETO}}. Nossa missão é superar expectativas entregando projetos com rigoroso controle técnico, segurança, economia e qualidade.</p>
<h2>2. ESCOPO DOS SERVIÇOS</h2>{{LISTA_ESCOPO_VALORES}}
<h2>3. VALOR GLOBAL</h2>
<div class="valor-box"><span>VALOR GLOBAL</span><b>{{VALOR}}</b><em>{{VALOR_EXTENSO}}</em></div>
<p class="nota">* Valor fixo, sem reajuste, para os serviços listados no escopo.</p>
<h2>4. CONDIÇÕES DE PAGAMENTO</h2>
<table class="kv"><tr><th>Formas de pagamento</th><td>Depósito, transferência (TED/PIX), cartão de crédito.</td></tr><tr><th>Pagamento</th><td>{{CONDICOES_PAGAMENTO}}</td></tr></table>
<h2>5. O QUE ESTÁ INCLUSO</h2>
<div class="inc"><div><b>✅ INCLUSO</b>{{LISTA_INCLUSO}}</div><div><b>❌ NÃO INCLUSO</b>{{LISTA_NAO_INCLUSO}}</div></div>
<h2>6. OBSERVAÇÕES GERAIS</h2>
<ul><li>Esta proposta é válida por {{VALIDADE_DIAS}} dias a partir da data de emissão.</li><li>O prazo de execução será definido após aprovação e assinatura do contrato.</li><li>Esta proposta refere-se exclusivamente aos serviços descritos no item 2.</li><li>Permanecemos à inteira disposição para esclarecimentos, visita técnica ou ajustes nesta proposta.</li></ul>
<p>Com expressões de consideração e apreço,</p>
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
{{ASSINATURA_RT}}` },

    { id: 'vtn_carta_proposta_obra', categoria: 'Proposta', nome: 'Carta proposta – execução de obra (mão de obra) – modelo VTN', origem: 'PROPOSTA_COMERCIAL_OBRA_2ºANDAR_MARCOS_JÚLIA (Proposta 120/2025)', corpo:
`<h1>CARTA PROPOSTA PARA PRESTAÇÃO DE SERVIÇOS<br><small>{{TITULO}}</small></h1>
<p class="ref">Proposta – {{NUMERO}}</p>
<p>{{CLIENTE_SAUDACAO}},</p>
<p>é com satisfação que disponibilizamos serviços de engenharia no âmbito de PROJETOS e EXECUÇÕES. A preocupação principal é atingir as expectativas no que tange aos procedimentos técnicos de engenharia, prezando principalmente pela economia, segurança e qualidade. Para a elaboração do orçamento, visando o entendimento dos serviços que serão prestados, discriminam-se os seguintes atos:</p>
<h2>1. Serviços propostos</h2>{{TABELA_ITENS}}
<h2>2. Valor global do orçamento (impostos aplicados)</h2>
<div class="valor-box"><span>VALOR GLOBAL</span><b>{{VALOR}}</b><em>{{VALOR_EXTENSO}}</em></div>
<h2>3. Formas de pagamento</h2>
<p>O pagamento pode ser feito via depósito, transferência, boleto bancário ou cartão de crédito. {{CONDICOES_PAGAMENTO}}</p>
<h2>4. Observações</h2>
<ul><li>Proposta relacionada exclusivamente à prestação dos serviços discriminados no item 1;</li><li>Nota fiscal dos serviços prestados;</li><li>Não inclusos os seguintes itens:</li></ul>{{LISTA_NAO_INCLUSO}}
<p>Permanecemos ao inteiro dispor para prestar quaisquer informações adicionais julgadas necessárias.</p>
<p>Com expressões de consideração e apreço,</p>
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
{{ASSINATURA_RT}}` },

    { id: 'vtn_carta_proposta_vistoria', categoria: 'Proposta', nome: 'Carta proposta – vistoria / laudo / acompanhamento – modelo VTN', origem: 'PROPOSTA_COMERCIAL_VISTORIA_STARLEY (Proposta 118/2025)', corpo:
`<h1>CARTA PROPOSTA PARA PRESTAÇÃO DE SERVIÇOS<br><small>{{TITULO}}</small></h1>
<p class="ref">Proposta – {{NUMERO}}</p>
<p>{{CLIENTE_SAUDACAO}},</p>
<p>é com satisfação que disponibilizamos serviços de engenharia no âmbito de PROJETOS, EXECUÇÕES e VISTORIAS. A preocupação principal é atingir as expectativas no que tange aos procedimentos técnicos de engenharia, prezando principalmente pela economia, segurança e qualidade. Para a elaboração do orçamento, visando o entendimento dos serviços que serão prestados, discriminam-se os seguintes atos:</p>
<h2>1. Serviços propostos</h2>{{LISTA_ESCOPO}}
<h2>2. Valor global do orçamento referente aos serviços</h2>
<div class="valor-box"><span>VALOR GLOBAL</span><b>{{VALOR}}</b><em>{{VALOR_EXTENSO}}</em></div>
<h2>3. Forma de apresentação e entrega de documentos</h2>
<ul><li>Os documentos elaborados serão enviados ao CONTRATANTE via e-mail em formato DWG e PDF;</li><li>ART – Anotação de Responsabilidade Técnica assinada, via física e digital.</li></ul>
<h2>4. Prazos</h2>
<ul><li>Vistoria feita in loco – data a ser agendada;</li><li>Laudo de vistoria entregue em até {{PRAZO_DIAS}} dias após a visita.</li></ul>
<h2>5. Formas de pagamento</h2>
<p>O pagamento pode ser feito via depósito, transferência, boleto bancário ou cartão de crédito.</p>
<ul><li>À vista no PIX/TED: <b>{{VALOR}}</b>;</li><li>No cartão de crédito, à vista ou em até 3x: <b>{{VALOR_CARTAO}}</b>.</li></ul>
<h2>6. Observações</h2>
<ul><li>Proposta relacionada exclusivamente à prestação dos serviços discriminados no item 1;</li><li>Emissão de ART – Anotação de Responsabilidade Técnica;</li><li>Nota fiscal dos serviços prestados.</li></ul>
<p>Permanecemos ao inteiro dispor para prestar quaisquer informações adicionais julgadas necessárias.</p>
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
{{ASSINATURA_RT}}` },

    { id: 'vtn_termo_acesso', categoria: 'Termo', nome: 'Termo de autorização e ciência – levantamento topográfico (lindeiros)', origem: 'TERMO ACESSO.docx – Ivonete Dornelas (22/10/2026)', corpo:
`<h1>TERMO DE AUTORIZAÇÃO E CIÊNCIA PARA LEVANTAMENTO TOPOGRÁFICO</h1>
<p>O presente termo tem como objetivo formalizar a ciência e a autorização dos proprietários (ou representantes dos mesmos) dos imóveis lindeiros relacionados a seguir, para a realização de levantamento topográfico do imóvel situado à {{OBRA_ENDERECO}}, {{OBRA_CIDADE}}, de posse de {{CLIENTES_NOMES}}, para fins de {{OBJETO}}.</p>
{{LINDEIROS}}
<p>Os signatários autorizam o acesso da equipe técnica, sob responsabilidade do profissional abaixo identificado, às divisas comuns com o imóvel levantado, para medição, cravação de marcos e registro fotográfico, e declaram estar cientes da finalidade do levantamento.</p>
<p>Este termo refere-se exclusivamente à realização do levantamento topográfico, não implicando reconhecimento de direitos, renúncia ou transmissão de propriedade, nem substituindo a manifestação de anuência que venha a ser exigida no procedimento correspondente.</p>
{{ASSINATURAS_LINDEIROS}}
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>` },

    { id: 'vtn_recibo', categoria: 'Recibo', nome: 'Recibo / cotação de serviço – modelo VTN', origem: 'Recibo Vistoria 12-12-25 - VTN00471.pdf', corpo:
`<h1>RECIBO DE PAGAMENTO<br><small>Cotação nº {{NUMERO}} · {{DATA}}</small></h1>
<table class="kv"><tr><th>Cliente</th><td>{{CLIENTES_NOMES}}</td></tr><tr><th>Endereço</th><td>{{OBRA_ENDERECO}} – {{OBRA_CIDADE}}</td></tr></table>
{{TABELA_ITENS}}
<div class="valor-box"><span>TOTAL RECEBIDO</span><b>{{VALOR}}</b><em>{{VALOR_EXTENSO}}</em></div>
<p>Declaramos que recebemos, para os devidos fins de comprovação, o pagamento no valor de <b>{{VALOR}}</b> referente ao serviço prestado acima, em {{DATA}}.</p>
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
{{ASSINATURA_RT}}` },

    { id: 'vtn_declaracao_cno', categoria: 'Declaração', nome: 'Declaração de despesas com materiais aplicados no CNO', origem: 'Total de Despesas com materiais aplicados na CNO.docx (24/04/2026)', corpo:
`<h1>DECLARAÇÃO – DESPESAS COM MATERIAIS APLICADOS NO CNO</h1>
<p>Declaramos, para fins de aferição junto à Receita Federal, a movimentação financeira da obra {{OBRA_NOME}}, localizada na {{OBRA_ENDERECO}}, {{OBRA_CIDADE}}, cadastrada no CNO nº {{OBRA_CNO}}:</p>
{{TABELA_CNO}}
<p class="local">{{CIDADE_ASSINATURA}}, {{DATA_EXTENSO}}.</p>
{{ASSINATURA_RT}}` }
  ];

  /* Junta os modelos da VTN ao banco do app (sem apagar os do usuário) */
  function sync() {
    const db = Store.db; if (!db) return;
    db.modelosContrato = db.modelosContrato || [];
    const versao = (db.vtnModelosVersao || 0);
    DOCS.forEach(d => {
      const i = db.modelosContrato.findIndex(m => m.id === d.id);
      const rec = Object.assign({ vtn: true }, d);
      if (i < 0) db.modelosContrato.push(rec); else if (versao < VERSAO && !db.modelosContrato[i].editado) db.modelosContrato[i] = rec;
    });
    // categorias dos modelos antigos do app
    const catApp = { empreitada: 'Contrato', projetos: 'Contrato', engenharia: 'Contrato', aditivo: 'Termo', entrega: 'Termo', proposta: 'Proposta' };
    db.modelosContrato.forEach(m => { if (!m.categoria) m.categoria = catApp[m.id] || 'Contrato'; if (!m.origem && !m.vtn) m.origem = 'Modelo criado no app'; });
    // empresa: sócios, sede e contatos dos documentos oficiais
    const e = db.empresa = db.empresa || {};
    if (!e.socios) e.socios = SOCIOS;
    ['sede', 'escritorio', 'email', 'telefone', 'site', 'crea', 'slogan'].forEach(k => { if (!e[k]) e[k] = EMPRESA[k]; });
    // catálogo: preços do gerador e tabela de projetos
    if (versao < VERSAO) {
      db.catalogo = db.catalogo || [];
      const norm = s => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
      (window.VTN_PRECOS || []).forEach(([desc, un, tipo, preco, forn]) => {
        const c = db.catalogo.find(x => norm(x.desc) === norm(desc));
        if (c) { if (!c.unit && preco) c.unit = preco; }
        else if (preco) db.catalogo.push({ id: Store.nextId('catalogo'), grupo: tipo === 'Material' ? 'Materiais (gerador VTN)' : 'Serviços (gerador VTN)', desc, un, unit: preco, fornecedor: forn });
      });
      PRECOS_PROJETOS.forEach(([g, desc, un, preco]) => { if (!db.catalogo.some(x => norm(x.desc) === norm(desc))) db.catalogo.push({ id: Store.nextId('catalogo'), grupo: g, desc, un, unit: preco }); });
      db.vtnModelosVersao = VERSAO;
      Store.save();
    }
  }
  return { VERSAO, SOCIOS, EMPRESA, DOCS, MODELOS_ORC, PRECOS_PROJETOS, sync };
})();
document.addEventListener('vtn:pronto', () => setTimeout(() => { try { VTN_MODELOS.sync(); } catch (e) { console.error(e); } }, 0));
