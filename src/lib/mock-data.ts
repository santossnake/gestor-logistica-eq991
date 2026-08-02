import { Viatura, LocalItem, Pedido, RegistoMarcha, HistoricoGps, Anomalia, EmprestimoExterno, FotoEmprestimo, UtilizadorLogistica } from './supabase/client';

export const MOCK_UTILIZADORES_LOGISTICA: UtilizadorLogistica[] = [
  {
    id: 'user-001',
    nome: 'Manuel Oliveira',
    posto: 'Sargento-Ajudante',
    especialidade: 'MELECA',
    email: 'logistica.eq991@emfa.pt',
    trigrama: 'OLV',
    is_ativo: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'user-002',
    nome: 'António Ferreira',
    posto: 'Tenente',
    especialidade: 'LOGISTICA',
    email: 'ferreira.eq991@emfa.pt',
    trigrama: 'FER',
    is_ativo: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'user-003',
    nome: 'João Silva',
    posto: 'Capitão',
    especialidade: 'MELIA',
    email: 'silva.eq991@emfa.pt',
    trigrama: 'SIL',
    is_ativo: true,
    created_at: new Date().toISOString()
  }
];

export const MOCK_VIATURAS: Viatura[] = [
  {
    id: 'vtr-001',
    matricula: 'AM-96-11',
    modelo: 'Nissan Navara 4x4',
    num_lugares: 5,
    tem_gancho_reboque: true,
    km_atuais: 98620,
    estado: 'DISPONIVEL',
    necessita_limpeza: false,
    localizacao_atual_viatura: 'Parque Principal EQ991 (Ota)',
    localizacao_atual_chave: 'Chaveiro Principal - Armário A',
    latitude_atual: 39.0940,
    longitude_atual: -8.9670,
    fonte_ultima_localizacao: 'GPS_VEICULO',
    ultima_localizacao_at: new Date().toISOString(),
    qr_code_token: 'VTR-991-01',
    is_forcada_recomendada: true,
    km_proxima_revisao: 110000,
    created_at: new Date().toISOString()
  },
  {
    id: 'vtr-002',
    matricula: 'AM-96-12',
    modelo: 'Nissan Navara 4x4',
    num_lugares: 5,
    tem_gancho_reboque: true,
    km_atuais: 105888,
    estado: 'DISPONIVEL',
    necessita_limpeza: true,
    localizacao_atual_viatura: 'Parque Principal EQ991 (Ota)',
    localizacao_atual_chave: 'Chaveiro Principal - Armário A',
    latitude_atual: 39.0945,
    longitude_atual: -8.9675,
    fonte_ultima_localizacao: 'GPS_VEICULO',
    ultima_localizacao_at: new Date().toISOString(),
    qr_code_token: 'VTR-991-02',
    is_forcada_recomendada: false,
    km_proxima_revisao: 115000,
    created_at: new Date().toISOString()
  },
  {
    id: 'vtr-003',
    matricula: 'AM-96-13',
    modelo: 'Nissan Navara 4x4',
    num_lugares: 5,
    tem_gancho_reboque: true,
    km_atuais: 102614,
    estado: 'DISPONIVEL',
    necessita_limpeza: false,
    localizacao_atual_viatura: 'Parque Principal EQ991 (Ota)',
    localizacao_atual_chave: 'Chaveiro Principal - Armário A',
    latitude_atual: 39.0935,
    longitude_atual: -8.9665,
    fonte_ultima_localizacao: 'GPS_VEICULO',
    ultima_localizacao_at: new Date().toISOString(),
    qr_code_token: 'VTR-991-03',
    is_forcada_recomendada: false,
    km_proxima_revisao: 110000,
    created_at: new Date().toISOString()
  }
];

export const MOCK_LOCAIS: LocalItem[] = [
  { id: 'loc-1', nome: 'Parque Principal EQ991', tipo: 'VIATURA', is_predefinido: true, is_ativo: true },
  { id: 'loc-2', nome: 'Hangar de Manutenção Base', tipo: 'VIATURA', is_predefinido: false, is_ativo: true },
  { id: 'loc-3', nome: 'Parque de Viaturas Pesadas', tipo: 'VIATURA', is_predefinido: false, is_ativo: true },
  { id: 'loc-4', nome: 'Chaveiro Principal - Armário A', tipo: 'CHAVE', is_predefinido: true, is_ativo: true },
  { id: 'loc-5', nome: 'Corpo de Guarda - Receção', tipo: 'CHAVE', is_predefinido: false, is_ativo: true },
  { id: 'loc-6', nome: 'Gabinete de Logística EQ991', tipo: 'CHAVE', is_predefinido: false, is_ativo: true }
];

export const MOCK_PEDIDOS: Pedido[] = [
  {
    id: 'ped-101',
    nome_utilizador: 'Tenente Silva',
    nip: '134890-A',
    posto: 'Tenente',
    email: 'silva.134890@emfa.pt',
    data_inicio: new Date(Date.now() + 3600000).toISOString(),
    data_fim: new Date(Date.now() + 28800000).toISOString(),
    destino: 'Base Aérea Nº 1 - Sintra',
    motivo: 'Transporte de material logístico e equipamentos de voo',
    necessita_reboque: true,
    viatura_id: 'vtr-001',
    estado_pedido: 'PENDENTE',
    created_at: new Date().toISOString()
  }
];

export const MOCK_MARCHAS: RegistoMarcha[] = [
  {
    id: 'mar-901',
    viatura_id: 'vtr-002',
    nip_inicio: '128912-B',
    nip_fim: '128912-B',
    km_inicial: 68350,
    km_final: 68400,
    nivel_combustivel: '3/4',
    litros_abastecidos: 30,
    valor_abastecido: 48.50,
    localizacao_chave: 'Claviculário Principal - Armário A',
    localizacao_viatura: 'Parque Principal EQ991',
    latitude_inicio: 38.8315,
    longitude_inicio: -9.3385,
    latitude_fecho: 38.8315,
    longitude_fecho: -9.3385,
    checklist_documentos: true,
    checklist_cartao: true,
    checklist_seguranca: true,
    necessita_limpeza: false,
    alerta_esquecimento_enviado: false,
    fechado_por_admin: false,
    data_saida: new Date(Date.now() - 86400000).toISOString(),
    data_chegada: new Date(Date.now() - 72000000).toISOString()
  }
];

export const MOCK_GPS: HistoricoGps[] = [
  {
    id: 'gps-1',
    viatura_id: 'vtr-001',
    nip_operador: '134890-A',
    latitude: 39.0940,
    longitude: -8.9670,
    precisao_metros: 5,
    tipo_evento: 'INICIO_MARCHA',
    registado_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'gps-2',
    viatura_id: 'vtr-001',
    nip_operador: '134890-A',
    latitude: 39.0965,
    longitude: -8.9645,
    precisao_metros: 4,
    tipo_evento: 'PING_PERCURSO',
    registado_at: new Date(Date.now() - 1800000).toISOString()
  }
];

export const MOCK_EMPRESTIMOS: EmprestimoExterno[] = [
  {
    id: 'emp-501',
    viatura_id: 'vtr-003',
    entidade_externa: 'Base Aérea Nº 1 (Granja do Marquês)',
    nome_responsavel: 'Capitão Ferreira',
    contacto_responsavel: '912 345 678',
    email_responsavel: 'ferreira.cpt@emfa.pt',
    data_inicio: new Date(Date.now() - 172800000).toISOString(),
    data_fim_prevista: new Date(Date.now() + 86400000).toISOString(),
    km_inicio: 34800,
    observacoes_inicial: 'Viatura cedida com depósito cheio e kit de ferramentas completo.',
    estado: 'ATIVO',
    criado_por_admin: 'Sargento Ajudante Oliveira',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

export const MOCK_FOTOS_EMPRESTIMO: FotoEmprestimo[] = [
  {
    id: 'foto-1',
    emprestimo_id: 'emp-501',
    tipo_fase: 'INICIO',
    angulo_zona: 'FRENTE',
    foto_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600',
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'foto-2',
    emprestimo_id: 'emp-501',
    tipo_fase: 'INICIO',
    angulo_zona: 'PAINEL',
    foto_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

export const MOCK_ANOMALIAS: Anomalia[] = [
  {
    id: 'ano-1',
    viatura_id: 'vtr-004',
    descricao: 'Rulho anómalo na suspensão dianteira direita e luz de aviso de motor acesa no painel.',
    foto_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600',
    latitude_incidente: 38.8320,
    longitude_incidente: -9.3390,
    gravidade: 'GRAVE',
    estado_anomalia: 'PENDENTE',
    notas_logistica: 'Agendada inspeção na oficina especializada da Base.',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];
