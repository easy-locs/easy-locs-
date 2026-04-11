import {
  isValidVertical,
  getAllowedCardTemplates,
  isCardTemplateAllowed,
  getDefaultCardTemplate,
  type CanonicalVertical,
  type CardTemplate,
} from "@/lib/taxonomy/canonical-registry";
import { shouldExcludeFromPublic } from "@/services/quarantine/quarantine-engine";
import type { EntityLifecycleStatus } from "@/domains/content-pipeline/types";
import { captureInvalidRenderPath, captureRenderMismatch } from "@/lib/observability/sentry-helpers";

export interface RenderableEntity {
  id: string;
  vertical: string;
  category: string;
  subcategory: string;
  canonicalType: string;
  canonicalSubtype: string | null;
  canonicalPath: string;
  publishStatus: EntityLifecycleStatus;
  validationStatus: EntityLifecycleStatus;
}

export interface RenderContract {
  canRender: boolean;
  allowedTemplate: CardTemplate;
  fallbackReason: string | null;
  shouldFlag: boolean;
  shouldHide: boolean;
}

export function evaluateRenderContract(entity: RenderableEntity): RenderContract {
  if (shouldExcludeFromPublic(entity.publishStatus)) {
    const contract: RenderContract = {
      canRender: false,
      allowedTemplate: "GenericCard",
      fallbackReason: `Entity status "${entity.publishStatus}" is not publicly visible — only "published" entities are allowed`,
      shouldFlag: true,
      shouldHide: true,
    };
    triggerRenderProtection(entity, contract);
    return contract;
  }

  if (entity.validationStatus !== "approved" && entity.validationStatus !== "published") {
    const contract: RenderContract = {
      canRender: false,
      allowedTemplate: "GenericCard",
      fallbackReason: `Validation status "${entity.validationStatus}" has not been approved — entities must be validated before rendering`,
      shouldFlag: true,
      shouldHide: true,
    };
    triggerRenderProtection(entity, contract);
    return contract;
  }

  if (!isValidVertical(entity.vertical)) {
    const contract: RenderContract = {
      canRender: false,
      allowedTemplate: "GenericCard",
      fallbackReason: `Invalid vertical "${entity.vertical}"`,
      shouldFlag: true,
      shouldHide: true,
    };
    triggerRenderProtection(entity, contract);
    return contract;
  }

  if (!entity.canonicalType) {
    const contract: RenderContract = {
      canRender: false,
      allowedTemplate: getDefaultCardTemplate(entity.vertical),
      fallbackReason: "Missing canonical type",
      shouldFlag: true,
      shouldHide: false,
    };
    triggerRenderProtection(entity, contract);
    return contract;
  }

  const allowedTemplates = getAllowedCardTemplates(entity.canonicalType);
  if (allowedTemplates.length === 0) {
    return {
      canRender: true,
      allowedTemplate: getDefaultCardTemplate(entity.vertical),
      fallbackReason: "No template rules defined for canonical type",
      shouldFlag: false,
      shouldHide: false,
    };
  }

  return {
    canRender: true,
    allowedTemplate: allowedTemplates[0],
    fallbackReason: null,
    shouldFlag: false,
    shouldHide: false,
  };
}

function triggerRenderProtection(entity: RenderableEntity, contract: RenderContract): void {
  try {
    import("@/lib/auto-protect").then(({ protectRender }) => {
      protectRender(entity, contract);
    }).catch(() => {});
  } catch {}
}

export function isRestaurantEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "food" && entity.canonicalPath.startsWith("food.restaurant.");
}

export function isCafeEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "food" && entity.canonicalPath.startsWith("food.cafe.");
}

export function isHotelEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "stay" && (
    entity.canonicalPath.startsWith("stay.hotel.") ||
    entity.canonicalPath.startsWith("stay.aparthotel.") ||
    entity.canonicalPath.startsWith("stay.holiday_rental.")
  );
}

export function isClinicEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "health" && (
    entity.canonicalPath.startsWith("health.clinic.") ||
    entity.canonicalPath.startsWith("health.hospital.")
  );
}

export function isGymEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "fitness" && entity.canonicalPath.startsWith("fitness.gym.");
}

export function isPropertyEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "property";
}

export function isServiceEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "services";
}

export function isShopEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "shops";
}

export function isBeautyEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "beauty";
}

export function isMobilityEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "mobility";
}

export function isExperienceEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "experiences";
}

export function isUtilityEntity(entity: RenderableEntity): boolean {
  return entity.vertical === "utility";
}

export function getEntityTypeGuard(vertical: string): ((entity: RenderableEntity) => boolean) | null {
  const guards: Record<string, (entity: RenderableEntity) => boolean> = {
    food: (e) => e.vertical === "food",
    stay: isHotelEntity,
    health: isClinicEntity,
    fitness: isGymEntity,
    property: isPropertyEntity,
    services: isServiceEntity,
    shops: isShopEntity,
    beauty: isBeautyEntity,
    mobility: isMobilityEntity,
    experiences: isExperienceEntity,
    utility: isUtilityEntity,
    grocery: (e) => e.vertical === "grocery",
  };
  return guards[vertical] ?? null;
}

export function validateCardRendering(
  entity: RenderableEntity,
  requestedTemplate: CardTemplate,
): { valid: boolean; error: string | null } {
  if (!entity.canonicalType) {
    captureInvalidRenderPath(entity.id, "unknown", "Entity has no canonical type", {
      vertical: entity.vertical,
      canonicalPath: entity.canonicalPath,
    });
    return { valid: false, error: "Entity has no canonical type" };
  }

  if (!isCardTemplateAllowed(entity.canonicalType, requestedTemplate)) {
    const allowed = getAllowedCardTemplates(entity.canonicalType);
    captureRenderMismatch(entity.id, entity.vertical, entity.canonicalType, requestedTemplate, {
      canonicalPath: entity.canonicalPath,
      allowedTemplates: allowed,
    });
    return {
      valid: false,
      error: `Template "${requestedTemplate}" not allowed for type "${entity.canonicalType}". Allowed: ${allowed.join(", ")}`,
    };
  }

  return { valid: true, error: null };
}

export function filterPublicEntities(entities: RenderableEntity[]): RenderableEntity[] {
  return entities.filter(entity => {
    const contract = evaluateRenderContract(entity);
    return contract.canRender && !contract.shouldHide;
  });
}

export function partitionEntities(entities: RenderableEntity[]): {
  renderable: RenderableEntity[];
  hidden: RenderableEntity[];
  flagged: RenderableEntity[];
} {
  const renderable: RenderableEntity[] = [];
  const hidden: RenderableEntity[] = [];
  const flagged: RenderableEntity[] = [];

  for (const entity of entities) {
    const contract = evaluateRenderContract(entity);
    if (contract.shouldHide) {
      hidden.push(entity);
    } else if (contract.shouldFlag) {
      flagged.push(entity);
    } else if (contract.canRender) {
      renderable.push(entity);
    } else {
      hidden.push(entity);
    }
  }

  return { renderable, hidden, flagged };
}
