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
    latitude_atual: 39.0920,
    longitude_atual: -8.9680,
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
    latitude_atual: 39.0920,
    longitude_atual: -8.9680,
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
    latitude_atual: 39.0920,
    longitude_atual: -8.9680,
    fonte_ultima_localizacao: 'GPS_VEICULO',
    ultima_localizacao_at: new Date().toISOString(),
    qr_code_token: 'VTR-991-03',
    is_forcada_recomendada: false,
    km_proxima_revisao: 110000,
    data_proxima_revisao: '2027-08-02',
    created_at: new Date().toISOString()
  }
];

// Locations are fetched 100% live from online Supabase DB
export const MOCK_LOCAIS: LocalItem[] = [];

// Clean empty arrays for production use with real data
export const MOCK_PEDIDOS: Pedido[] = [];
export const MOCK_MARCHAS: RegistoMarcha[] = [];
export const MOCK_ANOMALIAS: Anomalia[] = [];
export const MOCK_EMPRESTIMOS: EmprestimoExterno[] = [];
export const MOCK_FOTOS_EMPRESTIMO: FotoEmprestimo[] = [];
export const MOCK_GPS: HistoricoGps[] = [];
// Users are fetched 100% live from online Supabase DB
export const MOCK_UTILIZADORES_LOGISTICA: UtilizadorLogistica[] = [];
