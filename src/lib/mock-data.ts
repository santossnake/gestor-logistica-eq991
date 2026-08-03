import { Viatura, LocalItem, Pedido, RegistoMarcha, Anomalia, EmprestimoExterno, FotoEmprestimo, HistoricoGps, UtilizadorLogistica } from './supabase/client';

// Real Fleet: 3 Nissan Navaras Esquadra 991 with exact real odometers and maintenance targets
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
    localizacao_atual_viatura: 'Telheiro 991',
    localizacao_atual_chave: 'Chaveiro 991',
    latitude_atual: 39.0940,
    longitude_atual: -8.9670,
    fonte_ultima_localizacao: 'GPS_VEICULO',
    ultima_localizacao_at: new Date().toISOString(),
    qr_code_token: 'VTR-991-01',
    is_forcada_recomendada: true,
    km_proxima_revisao: 100000,
    data_proxima_revisao: '2027-08-02',
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
    necessita_limpeza: false,
    localizacao_atual_viatura: 'Telheiro 991',
    localizacao_atual_chave: 'Chaveiro 991',
    latitude_atual: 39.0945,
    longitude_atual: -8.9675,
    fonte_ultima_localizacao: 'GPS_VEICULO',
    ultima_localizacao_at: new Date().toISOString(),
    qr_code_token: 'VTR-991-02',
    is_forcada_recomendada: false,
    km_proxima_revisao: 110000,
    data_proxima_revisao: '2027-08-02',
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
    localizacao_atual_viatura: 'Telheiro 991',
    localizacao_atual_chave: 'Chaveiro 991',
    latitude_atual: 39.0935,
    longitude_atual: -8.9665,
    fonte_ultima_localizacao: 'GPS_VEICULO',
    ultima_localizacao_at: new Date().toISOString(),
    qr_code_token: 'VTR-991-03',
    is_forcada_recomendada: false,
    km_proxima_revisao: 110000,
    data_proxima_revisao: '2027-08-02',
    created_at: new Date().toISOString()
  }
];

// Official Locations
export const MOCK_LOCAIS: LocalItem[] = [
  { id: 'loc-01', nome: 'Telheiro 991', tipo: 'VIATURA', is_predefinido: true, is_ativo: true },
  { id: 'loc-02', nome: 'Estacionamento Alternativo ao Telheiro 991', tipo: 'VIATURA', is_predefinido: false, is_ativo: true },
  { id: 'loc-03', nome: 'Hangar 6', tipo: 'VIATURA', is_predefinido: false, is_ativo: true },
  { id: 'loc-04', nome: 'Oficial de Dia', tipo: 'VIATURA', is_predefinido: false, is_ativo: true },
  { id: 'loc-05', nome: 'Hotel Mirandela', tipo: 'VIATURA', is_predefinido: false, is_ativo: true },
  { id: 'loc-06', nome: 'Alojamento BA11', tipo: 'VIATURA', is_predefinido: false, is_ativo: true },
  { id: 'loc-07', nome: 'Chaveiro 991', tipo: 'CHAVE', is_predefinido: true, is_ativo: true },
  { id: 'loc-08', nome: 'Logística', tipo: 'CHAVE', is_predefinido: false, is_ativo: true },
  { id: 'loc-09', nome: 'Oficial de Dia', tipo: 'CHAVE', is_predefinido: false, is_ativo: true }
];

// Clean empty arrays for production use with real data
export const MOCK_PEDIDOS: Pedido[] = [];
export const MOCK_MARCHAS: RegistoMarcha[] = [];
export const MOCK_ANOMALIAS: Anomalia[] = [];
export const MOCK_EMPRESTIMOS: EmprestimoExterno[] = [];
export const MOCK_FOTOS_EMPRESTIMO: FotoEmprestimo[] = [];
export const MOCK_GPS: HistoricoGps[] = [];
export const MOCK_UTILIZADORES_LOGISTICA: UtilizadorLogistica[] = [
  {
    id: 'usr-01',
    nome: 'Manuel Oliveira',
    posto: 'TEN',
    especialidade: 'MELECA',
    email: 'oliveira@emfa.pt',
    trigrama: 'OLV',
    password: '123456',
    is_ativo: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-02',
    nome: 'João Silva',
    posto: '1SAR',
    especialidade: 'MELIA',
    email: 'silva@emfa.pt',
    trigrama: 'SIL',
    password: '123456',
    is_ativo: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-03',
    nome: 'Pedro Ferreira',
    posto: 'CAP',
    especialidade: 'LOGÍSTICA',
    email: 'ferreira@emfa.pt',
    trigrama: 'FER',
    password: '123456',
    is_ativo: true,
    created_at: new Date().toISOString()
  }
];
