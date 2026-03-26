
-- Parcel job details for structured parcel workflows
CREATE TABLE IF NOT EXISTS public.parcel_job_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid UNIQUE NOT NULL REFERENCES public.mobility_jobs(id) ON DELETE CASCADE,
  parcel_type text NOT NULL DEFAULT 'general_goods',
  package_size text NOT NULL DEFAULT 'medium_box',
  package_weight_kg numeric,
  package_count integer NOT NULL DEFAULT 1,
  fragile boolean NOT NULL DEFAULT false,
  perishable boolean NOT NULL DEFAULT false,
  temperature_sensitive boolean NOT NULL DEFAULT false,
  contains_liquid boolean NOT NULL DEFAULT false,
  contains_electronics boolean NOT NULL DEFAULT false,
  contains_documents boolean NOT NULL DEFAULT false,
  requires_signature boolean NOT NULL DEFAULT false,
  requires_id_check boolean NOT NULL DEFAULT false,
  requires_photo_proof boolean NOT NULL DEFAULT false,
  requires_otp boolean NOT NULL DEFAULT false,
  pickup_contact_name text,
  pickup_contact_phone text,
  dropoff_contact_name text,
  dropoff_contact_phone text,
  pickup_notes text,
  dropoff_notes text,
  declared_value_amount numeric,
  declared_value_currency text DEFAULT 'AED',
  special_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.parcel_job_details ENABLE ROW LEVEL SECURITY;

-- Customers can read their own parcel details
CREATE POLICY "Users can read own parcel details" ON public.parcel_job_details
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mobility_jobs mj
      WHERE mj.id = parcel_job_details.job_id
      AND mj.customer_user_id = auth.uid()
    )
  );

-- Riders assigned to job can read parcel details
CREATE POLICY "Riders can read assigned parcel details" ON public.parcel_job_details
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mobility_jobs mj
      WHERE mj.id = parcel_job_details.job_id
      AND mj.rider_user_id = auth.uid()
    )
  );

CREATE INDEX idx_parcel_job_details_job_id ON public.parcel_job_details(job_id);
