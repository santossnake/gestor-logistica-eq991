'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Navigation, Radio, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface LiveGpsTrackerProps {
  viaturaId: string;
  registoMarchaId?: string;
  nipOperador: string;
  isActive: boolean;
  onPositionUpdate?: (lat: number, lng: number) => void;
}

export function LiveGpsTracker(_props: LiveGpsTrackerProps) {
  // Rastreio GPS desativado em toda a aplicação
  return null;
}
