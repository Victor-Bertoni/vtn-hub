/* =========================================================
   BASE INICIAL (só usada se a pasta do banco estiver vazia)
   Os dados reais da VTN ficam na pasta BANCO DE DADOS do OneDrive,
   nunca no código (o código fica público no GitHub).
   O primeiro cadastro feito numa pasta vazia vira administrador.
   ========================================================= */
window.Seed = (() => {
  function build() {
    return {
      versao: 1, seq: {}, incidencias: {},
      empresa: { nome: 'VTN Engenharia e Construções LTDA', cnpj: '57.617.873/0001-65', cidade: 'Belo Horizonte', uf: 'MG', imposto: 6 },
      usuarios: [], pessoas: [], obras: [], etapas: [], medicoes: [], lancamentos: [], os: [], pendencias: [], entregas: [], revisoes: [],
      arquivos: [], eventos: [], grupos: [], mensagens: [], orcamentos: [], contratos: [], diario: [], catalogo: [], modelosContrato: []
    };
  }
  return { build };
})();
