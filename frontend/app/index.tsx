import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

export default function IndexScreen() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<"/(tabs)" | "/(admin-tabs)">("/(tabs)");

  useEffect(() => {
    const checkRole = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === "Admin" || user.Role === "Admin") {
            setInitialRoute("/(admin-tabs)");
            setIsReady(true);
            return;
          }
        }
      } catch (error) {
        console.error("Lỗi đọc session:", error);
      }
      setInitialRoute("/(tabs)");
      setIsReady(true);
    };

    checkRole();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A202C" }}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  return <Redirect href={initialRoute} />;
}
