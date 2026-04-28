import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
// Trạm thu phí Axios
import axiosClient from "@/utils/axiosClient";

interface Schedule {
  showtimeId: number;
  roomName: string;
  startTime: string;
  basePrice: number;
}

interface CinemaGroup {
  cinemaId: number;
  cinemaName: string;
  schedules: Schedule[];
}

const CINEMA_COORDS: Record<string, { lat: number; lon: number }> = {
  cgv: { lat: 21.010283, lon: 105.849472 },
  bhd: { lat: 21.006561, lon: 105.830215 },
  beta: { lat: 20.98802, lon: 105.84155 },
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

export default function ShowtimesScreen() {
  const router = useRouter();
  const { movieId, movieTitle, ageRestriction, posterUrl } =
    useLocalSearchParams();

  const [cinemas, setCinemas] = useState<CinemaGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [cityName, setCityName] = useState<string>("Đang định vị...");

  const getBrandTheme = (cinemaName: string) => {
    const nameLower = cinemaName.toLowerCase();
    if (nameLower.includes("cgv"))
      return { borderTopColor: "#E53E3E", icon: "🍿", textColor: "#FC8181" };
    if (nameLower.includes("bhd"))
      return { borderTopColor: "#48BB78", icon: "🎬", textColor: "#9AE6B4" };
    if (nameLower.includes("beta"))
      return { borderTopColor: "#ED8936", icon: "🎟️", textColor: "#FBD38D" };
    return { borderTopColor: "#4299E1", icon: "🎥", textColor: "#63B3ED" };
  };

  const getLocalDateString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const [availableDates] = useState<Date[]>(generateDates());
  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateString(availableDates[0]),
  );

  useEffect(() => {
    const fetchShowtimes = async () => {
      try {
        // Dùng axiosClient thay cho fetch
        const response = await axiosClient.get(`/Showtimes/movie/${movieId}`);
        setCinemas(response.data);
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          setCinemas([]);
        } else {
          console.error(error);
          Alert.alert("Lỗi", "Không thể tải lịch chiếu lúc này.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchShowtimes();
  }, [movieId]);

  useEffect(() => {
    const getLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCityName("Hà Nội");
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        });

        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode.length > 0) {
          const city =
            geocode[0].city ||
            geocode[0].subregion ||
            geocode[0].region ||
            "Hà Nội";
          setCityName(city);
        }
      } catch (error) {
        console.log("Lỗi GPS:", error);
        setCityName("Hà Nội");
      }
    };

    getLocation();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    let hours = date.getHours().toString().padStart(2, "0");
    let minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const filteredCinemas = cinemas
    .map((cinema) => ({
      ...cinema,
      schedules: cinema.schedules.filter((s) =>
        s.startTime.startsWith(selectedDate),
      ),
    }))
    .filter((cinema) => cinema.schedules.length > 0);

  const getCinemaDistance = (cinemaName: string) => {
    if (!userLocation) return null;
    const nameLower = cinemaName.toLowerCase();
    let targetCoords = null;

    if (nameLower.includes("cgv")) targetCoords = CINEMA_COORDS.cgv;
    else if (nameLower.includes("bhd")) targetCoords = CINEMA_COORDS.bhd;
    else if (nameLower.includes("beta")) targetCoords = CINEMA_COORDS.beta;

    if (targetCoords) {
      return calculateDistance(
        userLocation.lat,
        userLocation.lon,
        targetCoords.lat,
        targetCoords.lon,
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.movieTitle} numberOfLines={1}>
            {movieTitle}
          </Text>
          <Text style={styles.subTitle}>Chọn Rạp & Suất Chiếu</Text>
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateContainer}
        >
          {availableDates.map((date, index) => {
            const dateString = getLocalDateString(date);
            const isSelected = selectedDate === dateString;

            return (
              <TouchableOpacity
                key={index}
                style={[styles.dateBox, isSelected && styles.dateActive]}
                onPress={() => setSelectedDate(dateString)}
              >
                <Text
                  style={[styles.dateMonth, isSelected && { color: "#FFF" }]}
                >
                  Tháng {date.getMonth() + 1}
                </Text>
                <Text style={[styles.dateDay, isSelected && { color: "#FFF" }]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.locationRow}>
        <Text style={styles.recommendText}>
          Rạp đề xuất ({filteredCinemas.length})
        </Text>
        <TouchableOpacity style={styles.cityBadge}>
          <Text style={styles.cityText}>📍 {cityName}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredCinemas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Hiện chưa có suất chiếu nào cho ngày này.
            </Text>
          </View>
        ) : (
          filteredCinemas.map((cinema) => {
            const brandTheme = getBrandTheme(cinema.cinemaName);
            const distance = getCinemaDistance(cinema.cinemaName);

            return (
              <View
                key={cinema.cinemaId}
                style={[
                  styles.cinemaCard,
                  {
                    borderTopWidth: 4,
                    borderTopColor: brandTheme.borderTopColor,
                  },
                ]}
              >
                <View style={styles.cinemaHeader}>
                  <Text style={styles.cinemaIcon}>{brandTheme.icon}</Text>
                  <Text
                    style={[styles.cinemaName, { color: brandTheme.textColor }]}
                  >
                    {cinema.cinemaName}
                  </Text>
                  {distance && (
                    <Text style={styles.distanceText}> • {distance} km</Text>
                  )}
                </View>
                <View style={styles.divider} />
                <Text style={styles.roomType}>2D Phụ Đề Việt</Text>
                <View style={styles.timeGrid}>
                  {cinema.schedules.map((schedule) => (
                    <TouchableOpacity
                      key={schedule.showtimeId}
                      style={[
                        styles.timeButton,
                        { borderColor: brandTheme.borderTopColor },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        router.push({
                          pathname: "/seat-selection" as any,
                          params: {
                            showtimeId: schedule.showtimeId,
                            movieTitle: movieTitle,
                            ageRestriction: ageRestriction,
                            posterUrl: posterUrl,
                            roomName: schedule.roomName,
                            startTime: formatTime(schedule.startTime),
                          },
                        });
                      }}
                    >
                      <Text style={styles.timeText}>
                        {formatTime(schedule.startTime)}
                      </Text>
                      <Text style={styles.roomText}>{schedule.roomName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A202C" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#2D3748",
  },
  backButton: { padding: 5, marginRight: 10 },
  backText: { fontSize: 20, color: "#FFF" },
  headerTitleContainer: { flex: 1, alignItems: "center", marginRight: 30 },
  movieTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },
  subTitle: { fontSize: 13, color: "#A0AEC0", marginTop: 2 },
  scrollContent: { paddingBottom: 40 },
  dateContainer: { flexDirection: "row", padding: 20, gap: 15 },
  dateBox: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#2D3748",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4A5568",
  },
  dateActive: { backgroundColor: "#E53E3E", borderColor: "#E53E3E" },
  dateMonth: { fontSize: 12, color: "#A0AEC0", marginBottom: 4 },
  dateDay: { fontSize: 18, fontWeight: "bold", color: "#CBD5E0" },
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  recommendText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  cityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 62, 62, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E53E3E",
  },
  cityText: { color: "#FC8181", fontWeight: "bold", fontSize: 13 },
  distanceText: { color: "#A0AEC0", fontSize: 13, marginLeft: 5 },
  emptyState: { padding: 40, alignItems: "center", marginTop: 50 },
  emptyText: { color: "#A0AEC0", fontSize: 16, textAlign: "center" },
  cinemaCard: {
    backgroundColor: "#2D3748",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
  },
  cinemaHeader: { flexDirection: "row", alignItems: "center" },
  cinemaIcon: { fontSize: 20, marginRight: 8 },
  cinemaName: { fontSize: 18, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#4A5568", marginVertical: 12 },
  roomType: { fontSize: 14, color: "#A0AEC0", marginBottom: 12 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeButton: {
    backgroundColor: "#1A202C",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: "center",
    width: "30%",
  },
  timeText: { fontSize: 16, fontWeight: "bold", color: "#FFF" },
  roomText: { fontSize: 10, color: "#A0AEC0", marginTop: 4 },
});
