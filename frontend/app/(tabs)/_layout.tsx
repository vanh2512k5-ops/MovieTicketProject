import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#E53E3E", // Màu đỏ chủ đạo của app phim cho lúc được chọn
        tabBarInactiveTintColor: "#A0AEC0", // Màu xám nhạt lúc không chọn
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: "#1A202C", // Nền tối đồng bộ với app
          borderTopColor: "#2D3748", // Viền trên thanh tab
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      {/* Tab 1: Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* Tab 2: Cụm rạp */}
      <Tabs.Screen
        name="cinemas"
        options={{
          title: "Rạp phim",
          // Dùng icon cuộn phim hoặc bản đồ (tùy bộ icon sếp đang dùng, film.fill là an toàn)
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="film.fill" color={color} />
          ),
        }}
      />

      {/* Tab 3: Vé của khách hàng */}
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Vé của tôi",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="ticket.fill" color={color} />
          ),
        }}
      />

      {/* Tab 4: Trang cá nhân */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
