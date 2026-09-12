export type Crop = {
  id: string;
  name: string;
  category: string;
  unit: string;
};

export type Market = {
  id: string;
  name: string;
  state: string;
  district: string | null;
  market_type: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type MarketPrice = {
  id: string;
  crop_id: string;
  market_id: string;
  price_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  arrival_qty: number | null;
  unit: string;
  crops?: Crop | null;
  markets?: Market | null;
};

export type Policy = {
  id: string;
  title: string;
  category: string;
  ministry: string | null;
  description: string;
  eligibility: string | null;
  benefits: string | null;
  application_url: string | null;
  state: string | null;
};

export type PriceAlert = {
  id: string;
  crop_id: string;
  market_id: string | null;
  user_id: string | null;
  threshold_price: number | null;
  alert_type: string;
  is_active: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  crop_name: string;
  farmer_name: string;
  quantity: number;
  unit: string;
  asking_price: number;
  state: string;
  district: string | null;
  contact_phone: string;
  quality_grade: string | null;
  description: string | null;
  created_at: string;
};
