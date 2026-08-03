import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Viatura {
  id: string;
  matricula: string;
  modelo: string;
  num_lugares: number;
  tem_gancho_reboque: boolean;
  km_atuais: number;
  estado: 'DISPONIVEL' | 'RESERVADA' | 'EM_USO' | 'MANUTENCAO' | 'EMPRESTADA_EXTERNO';
  necessita_limpeza: boolean;
  data_ultima_limpeza?: string;
  limpo_por_nip?: string;
  localizacao_atual_viatura: string;
  localizacao_atual_chave: string;
  latitude_atual: number;
  longitude_atual: number;
  fonte_ultima_localizacao?: string;
  ultima_localizacao_at?: string;
  qr_code_token: string;
  is_forcada_recomendada?: boolean;
  km_proxima_revisao?: number;
  data_proxima_revisao?: string;
  created_at: string;
}

export interface RegistoAbastecimento {
  id: string;
  viatura_id: string;
  registo_marcha_id?: string;
  nip_responsavel: string;
  tipo_abastecimento: 'UNIDADE_MILITAR' | 'POSTO_COMERCIAL';
  unidade_militar?: string;
  posto_comercial_nome?: string;
  latitude_posto?: number;
  longitude_posto?: number;
  litros: number;
  valor_euros?: number;
  km_no_abastecimento: number;
  registado_at: string;
}

export interface LocalItem {
  id: string;
  nome: string;
  tipo: 'VIATURA' | 'CHAVE';
  is_predefinido: boolean;
  is_ativo: boolean;
}

export interface Pedido {
  id: string;
  nome_utilizador: string;
  nip: string;
  posto: string;
  email: string;
  data_inicio: string;
  data_fim: string;
  destino: string;
  motivo: string;
  necessita_reboque: boolean;
  viatura_id?: string;
  estado_pedido: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CONCLUIDO';
  created_at: string;
}

export interface RegistoMarcha {
  id: string;
  pedido_id?: string;
  viatura_id: string;
  nip_inicio: string;
  nip_fim?: string;
  km_inicial: number;
  km_final?: number;
  nivel_combustivel?: 'RESERVA' | '1/4' | '1/2' | '3/4' | 'CHEIO';
  litros_abastecidos?: number;
  valor_abastecido?: number;
  localizacao_chave?: string;
  localizacao_viatura?: string;
  latitude_inicio?: number;
  longitude_inicio?: number;
  latitude_fecho?: number;
  longitude_fecho?: number;
  checklist_documentos?: boolean;
  checklist_cartao?: boolean;
  checklist_seguranca?: boolean;
  necessita_limpeza?: boolean;
  alerta_esquecimento_enviado?: boolean;
  fechado_por_admin?: boolean;
  data_saida: string;
  data_chegada?: string;
}

export interface HistoricoGps {
  id: string;
  viatura_id: string;
  registo_marcha_id?: string;
  nip_operador: string;
  latitude: number;
  longitude: number;
  precisao_metros?: number;
  tipo_evento: 'INICIO_MARCHA' | 'PING_PERCURSO' | 'FOTO_ODOMETRO' | 'INCIDENTE' | 'FIM_MARCHA';
  registado_at: string;
}

export interface Anomalia {
  id: string;
  viatura_id: string;
  registo_marcha_id?: string;
  descricao: string;
  foto_url?: string;
  latitude_incidente?: number;
  longitude_incidente?: number;
  gravidade: 'LEVE' | 'MODERADA' | 'GRAVE';
  estado_anomalia: 'PENDENTE' | 'EM_RESOLUCAO' | 'RESOLVIDO';
  notas_logistica?: string;
  created_at: string;
}

export interface EmprestimoExterno {
  id: string;
  viatura_id: string;
  entidade_externa: string;
  nome_responsavel: string;
  contacto_responsavel: string;
  email_responsavel: string;
  data_inicio: string;
  data_fim_prevista: string;
  data_devolucao_real?: string;
  km_inicio: number;
  km_fim?: number;
  observacoes_inicial?: string;
  observacoes_final?: string;
  estado: 'ATIVO' | 'CONCLUIDO';
  criado_por_admin?: string;
  created_at: string;
}

export interface UtilizadorLogistica {
  id: string;
  nome: string;
  posto: string;
  especialidade: string;
  email: string;
  trigrama: string;
  is_ativo: boolean;
  ultimo_acesso?: string;
  created_at?: string;
}

export interface FotoEmprestimo {
  id: string;
  emprestimo_id: string;
  tipo_fase: 'INICIO' | 'DEVOLUCAO';
  angulo_zona: 'FRENTE' | 'TRASEIRA' | 'ESQUERDA' | 'DIREITA' | 'INTERIOR' | 'PAINEL' | 'DANO';
  foto_url: string;
  created_at: string;
}
