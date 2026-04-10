/**
 * AnimationRegistry — Central registry for injectable map animations.
 * Each animation is a standalone module: start/stop/attach to any layer.
 */
import type mapboxgl from "mapbox-gl";
import type { MapAnimationModule } from "./types";

class AnimationRegistryImpl {
  private animations = new Map<string, MapAnimationModule>();

  register(anim: MapAnimationModule) {
    this.animations.set(anim.id, anim);
  }

  start(map: mapboxgl.Map, animId: string, targetLayerIds: string[]) {
    const anim = this.animations.get(animId);
    if (anim && !anim.active) {
      anim.start(map, targetLayerIds);
    }
  }

  stop(animId: string) {
    const anim = this.animations.get(animId);
    if (anim?.active) {
      anim.stop();
    }
  }

  stopAll() {
    for (const anim of this.animations.values()) {
      if (anim.active) anim.stop();
    }
  }

  isActive(animId: string): boolean {
    return this.animations.get(animId)?.active ?? false;
  }

  getRegistered(): string[] {
    return Array.from(this.animations.keys());
  }
}

export const AnimationRegistry = new AnimationRegistryImpl();
