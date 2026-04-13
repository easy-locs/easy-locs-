import { memo, useEffect } from "react";
import { motion } from "framer-motion";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";
import { platformBus } from "@/lib/shared/platform-bus";
import { useExploreViewModel } from "./explore.view-model";
import { ExploreHeader } from "./ExploreHeader";
import { ExploreStoryRails } from "./ExploreStoryRails";
import { ExploreQuickActions } from "./ExploreQuickActions";
import { ExploreEntitySection } from "./ExploreEntitySection";
import { ExploreContinue } from "./ExploreContinue";
import { ExploreAISuggestions } from "./ExploreAISuggestions";

export const ExploreScreen = memo(function ExploreScreen() {
  const vm = useExploreViewModel();

  useEffect(() => {
    platformBus.emit("explore:section_viewed", { surface: "explore", timestamp: Date.now() }, "explore");
  }, []);

  return (
    <div className="w-full min-h-[100dvh] bg-background pb-20">
      <ExploreHeader
        greeting={vm.greeting}
        locationLabel={vm.locationLabel}
        onLocationTap={vm.onLocationTap}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ExploreStoryRails feeds={vm.storyFeeds} />

        <ExploreEntitySection
          title="For You"
          icon="✨"
          items={vm.forYouItems}
          seeAllRoute="/radar?sort=for_you"
          feedKey="explore_for_you"
          emptyMessage="Discovering personalized picks..."
        />

        <ExploreEntitySection
          title="Near You"
          icon="📍"
          items={vm.nearYouItems}
          seeAllRoute="/radar?sort=distance"
          feedKey="explore_near_you"
          emptyMessage="Finding places near you..."
        />

        <ExploreQuickActions actions={vm.quickActions} />

        <ExploreContinue items={vm.continueItems} />

        <ExploreEntitySection
          title="Trending"
          icon="🔥"
          items={vm.trendingItems}
          seeAllRoute="/radar?sort=trending"
          feedKey="explore_trending"
        />

        <ExploreAISuggestions suggestions={vm.aiSuggestions} />
      </motion.div>

      <AddressSelectorSheet open={vm.addressSheetOpen} onOpenChange={vm.onAddressSheetChange} />
    </div>
  );
});

export default ExploreScreen;
