import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { HomeScreen } from "@/features/home/HomeScreen";
import { BeatScreen } from "@/features/stores/BeatScreen";
import { ScoreScreen } from "@/features/score/ScoreScreen";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { TabBar } from "./TabBar";
import type { AppTabsParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabsParamList>();

/** The signed-in app shell: Home / Beat / Score / Profile + center Add-Kirana FAB. */
export function AppTabs() {
    return (
        <Tab.Navigator
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <TabBar {...props} />}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Beat" component={BeatScreen} />
            <Tab.Screen name="Score" component={ScoreScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
