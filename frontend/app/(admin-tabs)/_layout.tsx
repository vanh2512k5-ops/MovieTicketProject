import { Tabs } from "expo-router";
import React from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function AdminTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3182CE", // Màu xanh chủ đạo cho Admin
        tabBarInactiveTintColor: "#A0AEC0",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1A202C", 
          borderTopColor: "#2D3748",
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tổng quan",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.pie.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: "Phim",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="film.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cinemas"
        options={{
          title: "Rạp",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="building.2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="showtimes"
        options={{
          title: "Suất chiếu",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="calendar.badge.clock" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Người dùng",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.2.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
