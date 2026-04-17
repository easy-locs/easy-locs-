import type {
  BusinessCore,
  OnboardingStep,
  OnboardingStepName,
  BusinessType,
} from './business-types';
import { ONBOARDING_STEPS, REQUIRED_STEPS, VERTICAL_MODULES } from './business-types';
import { db } from '@/services/db';

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export interface OnboardingState {
  businessId: string;
  businessType: BusinessType;
  steps: OnboardingStep[];
  progress: number;
  canPublish: boolean;
  blockers: string[];
}

export interface StepValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const STEP_VALIDATORS: Record<OnboardingStepName, (b: BusinessCore) => StepValidation> = {
  identity: (b) => {
    const errors: string[] = [];
    if (!b.name?.trim()) errors.push('Business name is required');
    if (!b.business_type) errors.push('Business type is required');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  location: (b) => {
    const errors: string[] = [];
    if (!b.address_line1?.trim()) errors.push('Address is required');
    if (!b.city?.trim()) errors.push('City is required');
    if (!b.country?.trim()) errors.push('Country is required');
    const warnings: string[] = [];
    if (!b.lat || !b.lng) warnings.push('GPS coordinates improve discoverability');
    return { valid: errors.length === 0, errors, warnings };
  },
  media: (b) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!b.logo_media_id) warnings.push('Logo improves brand recognition');
    if (!b.cover_media_id) warnings.push('Cover image increases engagement');
    if (!b.gallery_ids?.length) warnings.push('Gallery photos attract more customers');
    return { valid: true, errors, warnings };
  },
  category: (b) => {
    const errors: string[] = [];
    if (!b.canonical_path?.trim()) errors.push('Business category is required');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  catalog: (b) => {
    const warnings: string[] = [];
    const modules = VERTICAL_MODULES[b.business_type] ?? [];
    if (modules.length === 0) warnings.push('No catalog modules configured for this vertical');
    return { valid: true, errors: [], warnings };
  },
  pricing: (b) => {
    const errors: string[] = [];
    if (!b.currency) errors.push('Currency must be set');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  availability: () => {
    return { valid: true, errors: [], warnings: ['Set your availability to start receiving orders'] };
  },
  policies: () => {
    return { valid: true, errors: [], warnings: ['Adding policies builds customer trust'] };
  },
  contact: (b) => {
    const errors: string[] = [];
    if (!b.phone && !b.email) errors.push('At least one contact method is required');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
  hours: (b) => {
    const warnings: string[] = [];
    if (!b.is_24_7 && !b.opening_hours_json) warnings.push('Set your operating hours');
    return { valid: true, errors: [], warnings };
  },
  team: () => {
    return { valid: true, errors: [], warnings: [] };
  },
  verification: (b) => {
    const warnings: string[] = [];
    if (b.verification_status === 'pending') warnings.push('Verification pending — submit documents to speed up');
    return { valid: true, errors: [], warnings };
  },
  review: () => {
    return { valid: true, errors: [], warnings: ['Review your profile before going live'] };
  },
  go_live: (b) => {
    const errors: string[] = [];
    if (b.status === 'suspended') errors.push('Account is suspended');
    return { valid: errors.length === 0, errors, warnings: [] };
  },
};

export const onboardingEngine = {
  async getState(business: BusinessCore): Promise<OnboardingState> {
    const { data } = await cFrom('onboarding_steps')
      .select('*')
      .eq('business_id', business.business_id)
      .order('step_index');

    let steps = (data ?? []) as OnboardingStep[];

    if (steps.length === 0) {
      steps = await this.initializeSteps(business.business_id);
    }

    const completedCount = steps.filter(s => s.status === 'completed').length;
    const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

    const blockers: string[] = [];
    for (const reqStep of REQUIRED_STEPS) {
      const step = steps.find(s => s.step_name === reqStep);
      if (!step || step.status !== 'completed') {
        blockers.push(`Step "${reqStep}" is required but not completed`);
      }
    }

    return {
      businessId: business.business_id,
      businessType: business.business_type,
      steps,
      progress,
      canPublish: blockers.length === 0,
      blockers,
    };
  },

  async initializeSteps(businessId: string): Promise<OnboardingStep[]> {
    const steps: Omit<OnboardingStep, 'step_id'>[] = ONBOARDING_STEPS.map((name, i) => ({
      business_id: businessId,
      step_name: name,
      step_index: i,
      status: 'pending' as const,
      required: REQUIRED_STEPS.includes(name),
      validation_errors: [],
      completed_at: null,
    }));

    const { data } = await cFrom('onboarding_steps').insert(steps).select();
    return (data ?? []) as OnboardingStep[];
  },

  validateStep(stepName: OnboardingStepName, business: BusinessCore): StepValidation {
    const validator = STEP_VALIDATORS[stepName];
    return validator ? validator(business) : { valid: true, errors: [], warnings: [] };
  },

  async completeStep(businessId: string, stepName: OnboardingStepName, business: BusinessCore): Promise<StepValidation> {
    const validation = this.validateStep(stepName, business);

    if (validation.valid) {
      await cFrom('onboarding_steps')
        .update({
          status: 'completed',
          validation_errors: [],
          completed_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .eq('step_name', stepName);
    } else {
      await cFrom('onboarding_steps')
        .update({
          status: 'blocked',
          validation_errors: validation.errors,
        })
        .eq('business_id', businessId)
        .eq('step_name', stepName);
    }

    const state = await this.getState(business);
    await cFrom('business_core')
      .update({ onboarding_progress: state.progress, updated_at: new Date().toISOString() })
      .eq('business_id', businessId);

    return validation;
  },

  async canGoLive(business: BusinessCore): Promise<{ allowed: boolean; blockers: string[] }> {
    const state = await this.getState(business);
    return { allowed: state.canPublish, blockers: state.blockers };
  },

  async goLive(business: BusinessCore): Promise<{ success: boolean; error?: string }> {
    const check = await this.canGoLive(business);
    if (!check.allowed) {
      return { success: false, error: check.blockers.join('; ') };
    }

    await cFrom('business_core')
      .update({ status: 'active', onboarding_progress: 100, updated_at: new Date().toISOString() })
      .eq('business_id', business.business_id);

    return { success: true };
  },
};
