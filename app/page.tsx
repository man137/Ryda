"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import debounce from "lodash/debounce";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";

// Types
type PaymentMethod = "online" | "cash";
import {
  LocationSuggestion,
  RouteGeometry,
  Driver,
  RideStatus,
} from "./types";
import { HistoryRide } from "./components/RideHistory";

// Services
import { locationService } from "./services/location.service";
import { routeService } from "./services/route.service";
import { driverService } from "./services/driver.service";
import { razorpayService } from "./services/razorpay.service";

// Hooks
import { useGeolocation } from "./hooks/useGeolocation";
import { useStableWebSocket } from "./hooks/useStableWebSocket";

// Utils
import { normalizeCoordinates, calculateDistance } from "./utils/coordinates";
import { calculateFare } from "./utils/fare";
import { WS_CONFIG } from "./constants";

// Components
import { Header } from "./components/Header";
import { LocationInput } from "./components/LocationInput";
import { GlassCard } from "./components/GlassCard";
import { GlowButton } from "./components/GlowButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { StatusIndicators } from "./components/StatusIndicators";
import { RideCompletion } from "./components/RideCompletion";
import { PriceDisplay } from "./components/PriceDisplay";
import { RazorpayPaymentModal } from "./components/RazorpayPaymentModal";
import { RideSummary } from "./components/RideSummary";
import { RideHistory } from "./components/RideHistory";

// Icons
import {
  Car,
  MapPin,
  Navigation,
  Sparkles,
  ChevronRight,
  Loader2,
  CircleAlert,
  Compass,
} from "lucide-react";

// Dynamic Map import
const MapView = dynamic(() => import("./components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center">
            <Compass className="w-6 h-6 text-white" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
          Loading map...
        </p>
      </div>
    </div>
  ),
});

// ─── Animation Variants ───────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Glow Button ───────────────────────────────────────────────────────────

function GlowButton({
  children,
  disabled,
  onClick,
  loading,
  variant = "primary",
  className = "",
  icon,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  icon?: React.ReactNode;
}) {
  const base =
    "relative overflow-hidden rounded-xl px-5 py-3.5 text-sm font-semibold transition-all duration-300 ease-out flex items-center justify-center gap-2";

  const variants = {
    primary:
      "bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 shadow-lg shadow-black/10 dark:shadow-white/10 hover:shadow-xl hover:shadow-black/15 dark:hover:shadow-white/15 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    secondary:
      "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 active:scale-[0.98]",
    ghost:
      "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-[0.98]",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </motion.button>
  );
}

// ─── Glass Card ────────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
  padding = "p-5",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/20 dark:border-white/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-black/[0.02] dark:shadow-black/[0.08] ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Section Divider ───────────────────────────────────────────────────────

function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function RideShareHome() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // UI State
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Location State
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(
    null
  );
  const [destinationCoords, setDestinationCoords] = useState<
    [number, number] | null
  >(null);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] =
    useState(false);
  const [showPrice, setShowPrice] = useState(false);

  // Route State
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(
    null
  );
  const [isRouting, setIsRouting] = useState(false);
  const [fare, setFare] = useState<number | null>(null);

  // Ride State
  const [rideStatus, setRideStatus] = useState<RideStatus>("idle");
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isFindingDriver, setIsFindingDriver] = useState(false);
  const [isLoadingDriverDetails, setIsLoadingDriverDetails] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [completedRide, setCompletedRide] = useState<{
    driver: Driver;
    fare: number;
  } | null>(null);

  // Payment State
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<
    "card" | "upi" | "cash"
  >("card");

  // Ride History
  const [rideHistory, setRideHistory] = useState<HistoryRide[]>([]);
  const [showRideHistory, setShowRideHistory] = useState(false);
  const [showRideSummary, setShowRideSummary] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cancellation UI State
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");

  // Geolocation
  const { coords: currentCoords, error: geoError } = useGeolocation();

  // WebSocket Client ID
  const clientId = useMemo(
    () => session?.user?.email || `client-${Date.now()}`,
    [session?.user?.email]
  );

  // Redirect drivers to their dashboard
  useEffect(() => {
    if (
      status === "authenticated" &&
      (session?.user as any)?.accountType === "driver"
    ) {
      const userId = (session?.user as any)?.id;
      if (userId) {
        router.push(`/drivers/${userId}`);
      }
    }
  }, [status, session, router]);

  // Restore ride and history from localStorage on mount
  useEffect(() => {
    const savedRide = localStorage.getItem("ongoingRide");
    const savedHistory = localStorage.getItem("rideHistory");

    if (savedRide) {
      try {
        const ride = JSON.parse(savedRide);
        setPickup(ride.pickup || "");
        setDestination(ride.destination || "");
        setPickupCoords(ride.pickupCoords || null);
        setDestinationCoords(ride.destinationCoords || null);
        setRouteGeometry(ride.routeGeometry || null);
        setFare(ride.fare || null);
        setRideStatus(ride.rideStatus || "idle");
        setDriver(ride.driver || null);
        setIsFindingDriver(ride.isFindingDriver || false);
        setActiveRideId(ride.activeRideId || null);
        setCompletedRide(ride.completedRide || null);
        setShowRideSummary(ride.showRideSummary || false);
        
        // If there's an active ride or price was shown, restore showPrice
        if ((ride.rideStatus && ride.rideStatus !== "idle") || ride.showPrice) {
          setShowPrice(true);
        }
      } catch {
        // ignore corrupt state
      }
    }

    if (savedHistory) {
      try {
        setRideHistory(JSON.parse(savedHistory));
      } catch {
        // ignore
      }
    }
    
    setIsInitialized(true);
  }, []);

  // Persist ongoing ride
  useEffect(() => {
    const rideState = {
      pickup,
      destination,
      pickupCoords,
      destinationCoords,
      routeGeometry,
      fare,
      rideStatus,
      driver,
      isFindingDriver,
      activeRideId,
      completedRide,
      showRideSummary,
      showPrice,
    };
    if (rideStatus !== "idle") {
      localStorage.setItem("ongoingRide", JSON.stringify(rideState));
    } else {
      localStorage.removeItem("ongoingRide");
    }
  }, [
    pickup,
    destination,
    pickupCoords,
    destinationCoords,
    routeGeometry,
    fare,
    rideStatus,
    driver,
    isFindingDriver,
    activeRideId,
    completedRide,
    showRideSummary,
  ]);

  // Persist ride history
  useEffect(() => {
    localStorage.setItem("rideHistory", JSON.stringify(rideHistory));
  }, [rideHistory]);

  // Multi-tab ride sync
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "ongoingRide" && event.newValue) {
        try {
          const ride = JSON.parse(event.newValue);
          setPickup(ride.pickup);
          setDestination(ride.destination);
          setPickupCoords(ride.pickupCoords);
          setDestinationCoords(ride.destinationCoords);
          setRouteGeometry(ride.routeGeometry);
          setFare(ride.fare);
          setRideStatus(ride.rideStatus);
          setDriver(ride.driver);
          setIsFindingDriver(ride.isFindingDriver);
          setActiveRideId(ride.activeRideId);
          setCompletedRide(ride.completedRide);
          setShowRideSummary(ride.showRideSummary || false);
          
          if ((ride.rideStatus && ride.rideStatus !== "idle") || ride.showPrice) {
            setShowPrice(true);
          }
        } catch {
          // ignore
        }
      } else if (event.key === "ongoingRide" && !event.newValue) {
        resetAllStates();
      } else if (event.key === "rideHistory" && event.newValue) {
        try {
          setRideHistory(JSON.parse(event.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    async (data: any) => {
      console.log("📨 Received:", data.type, data);
      switch (data.type) {
        case "connected":
          console.log("✅ Server connected:", data.message);
          break;
        case "driver_response":
        case "driver_accepted":
          if (data.accepted && data.driverId) {
            setIsLoadingDriverDetails(true);
            setIsFindingDriver(false);
            try {
              const realDriverData = await driverService.fetchDetails(
                data.driverId
              );
              if (realDriverData) {
                const completeDriverData: Driver = {
                  ...realDriverData,
                  coords:
                    data.coords ||
                    data.driverCoords ||
                    realDriverData.coords,
                  status: "accepted",
                  estimatedArrival: data.estimatedArrival,
                };
                setDriver(completeDriverData);
                setRideStatus("driver-found");
                setTimeout(() => setRideStatus("driver-coming"), 2000);
              } else {
                setApiError("Failed to load driver details.");
                setIsFindingDriver(true);
              }
            } catch {
              setApiError("Failed to load driver details.");
              setIsFindingDriver(true);
            } finally {
              setIsLoadingDriverDetails(false);
            }
          } else {
            setApiError("Driver declined. Searching for another driver...");
          }
          break;

        case "driver_location_update":
        case "location_update":
        case "driver_location":
          if (data.coords) {
            const coords = normalizeCoordinates(data.coords);
            setDriver((prev) => {
              if (!prev) return null;
              setPickupCoords((currentPickup) => {
                if (coords && currentPickup) {
                  const distance = calculateDistance(coords, currentPickup);
                  if (
                    distance < WS_CONFIG.ARRIVAL_THRESHOLD &&
                    prev.status !== "arrived"
                  ) {
                    setRideStatus("driver-arrived");
                  }
                }
                return currentPickup;
              });
              return {
                ...prev,
                ...(coords ? { coords } : {}),
                status: data.status || prev.status,
              };
            });
          }
          break;

        case "ride_started":
          setRideStatus("in-progress");
          setApiError(null);
          break;

        case "ride_completed":
          setDriver((currentDriver) => {
            setFare((currentFare) => {
              const completedDriver =
                currentDriver || {
                  id: data.driverId || "unknown",
                  name: data.driverName || "Driver",
                  vehicleNumber: data.vehicleNumber || "N/A",
                  coords: [0, 0] as [number, number],
                  status: "completed" as const,
                  phone: "",
                  vehicleType: "Car",
                  rating: 4.5,
                };
              const finalFare =
                data.estimatedFare || data.fare || currentFare || 0;
              setCompletedRide({ driver: completedDriver, fare: finalFare });
              setRideStatus("completed");
              setIsFindingDriver(false);
              setIsLoadingDriverDetails(false);
              setApiError(null);
              return currentFare;
            });
            return null;
          });
          break;

        case "ride_status":
          if (data.status) setRideStatus(data.status);
          setDriver((prev) =>
            prev
              ? {
                  ...prev,
                  id: data.driverId || prev.id,
                  coords: data.driverCoords || prev.coords,
                  status: data.status || prev.status,
                }
              : null
          );
          break;

        case "ride_canceled":
          setApiError(`Ride was canceled by the driver. Reason: ${data.reason}`);
          setIsFindingDriver(false);
          setRideStatus("idle");
          setDriver(null);
          setActiveRideId(null);
          break;

        case "no_drivers_available":
          setApiError(data.message || "No drivers available.");
          setIsFindingDriver(false);
          break;

        case "error":
          setApiError(data.message || "An error occurred.");
          break;
      }
    },
    [pickupCoords]
  );

  const shouldConnect =
    isFindingDriver ||
    rideStatus === "driver-found" ||
    rideStatus === "driver-coming" ||
    rideStatus === "driver-arrived" ||
    rideStatus === "in-progress" ||
    rideStatus === "completed";

  const { connectionStatus, sendMessage, disconnect } = useStableWebSocket(
    clientId,
    handleWebSocketMessage,
    shouldConnect
  );

  // Reset all ride states
  const resetAllStates = useCallback(() => {
    setRideStatus("idle");
    setDriver(null);
    setShowPrice(false);
    setIsFindingDriver(false);
    setApiError(null);
    setCompletedRide(null);
    setPickup("");
    setDestination("");
    setPickupCoords(null);
    setDestinationCoords(null);
    setRouteGeometry(null);
    setFare(null);
    setActiveRideId(null);
    setIsLoadingDriverDetails(false);
    setIsPaying(false);
    setPaymentMethod("online");
    setPaymentError(null);
    setIsPaymentModalOpen(false);
    setShowRideSummary(false);
    disconnect();
  }, [disconnect]);

  // ===================== PAYMENT HANDLERS =====================
  const handleCreateOrderAndOpenRazorpay = useCallback(async () => {
    if (!completedRide || !session?.user?.name || !session.user.email)
      return null;
    setIsPaying(true);
    setPaymentError(null);
    try {
      const orderData = await razorpayService.createRazorpayOrder(
        completedRide.fare,
        session.user.name,
        clientId,
        session.user.email,
        (session.user as any).phone || "9999999999"
      );
      return orderData;
    } catch (error: any) {
      setPaymentError(error.message || "Unknown payment error.");
      setIsPaying(false);
      setIsPaymentModalOpen(false);
      return null;
    }
  }, [completedRide, clientId, session]);

  const handleCloseOnlinePayment = useCallback(() => {
    setIsPaymentModalOpen(false);
    setIsPaying(false);
    setPaymentError(null);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    if (completedRide && pickup && destination) {
      const newRide: HistoryRide = {
        id: `ride_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        pickup,
        destination,
        distance: routeGeometry
          ? `${(routeGeometry.distance / 1000).toFixed(1)} km`
          : "5.2 km",
        duration: routeGeometry
          ? `${Math.round(routeGeometry.duration / 60)} mins`
          : "25 mins",
        fare: completedRide.fare,
        paymentMethod: lastPaymentMethod,
        driverName: completedRide.driver.name,
        driverRating: completedRide.driver.rating,
        status: "completed",
      };
      setRideHistory((prev) => [newRide, ...prev]);
    }
    setIsPaymentModalOpen(false);
    setShowRideSummary(true);
  }, [completedRide, pickup, destination, lastPaymentMethod, routeGeometry]);

  const handleCashPayment = useCallback(() => {
    setPaymentError(null);
    if (completedRide && pickup && destination) {
      const newRide: HistoryRide = {
        id: `ride_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        pickup,
        destination,
        distance: routeGeometry
          ? `${(routeGeometry.distance / 1000).toFixed(1)} km`
          : "5.2 km",
        duration: routeGeometry
          ? `${Math.round(routeGeometry.duration / 60)} mins`
          : "25 mins",
        fare: completedRide.fare,
        paymentMethod: "cash",
        driverName: completedRide.driver.name,
        driverRating: completedRide.driver.rating,
        status: "completed",
      };
      setRideHistory((prev) => [newRide, ...prev]);
    }
    setIsPaymentModalOpen(false);
    setShowRideSummary(true);
  }, [completedRide, pickup, destination, routeGeometry]);

  const handleConfirmPayment = useCallback(() => {
    if (paymentMethod === "cash") {
      handleCashPayment();
    } else {
      setLastPaymentMethod("card");
      setIsPaying(true);
      setIsPaymentModalOpen(true);
    }
  }, [paymentMethod, handleCashPayment]);

  // ===================== LOCATION & SEARCH HANDLERS =====================
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setApiError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setPickupCoords(coords);
        try {
          const address = await locationService.reverseGeocode(coords);
          if (address) setPickup(address);
        } catch (error) {
          console.error(error);
        }
      },
      () => setApiError("Could not get your current location"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const debouncedPickupSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length >= 3) {
          try {
            const results = await locationService.search(query);
            setPickupSuggestions(results);
          } catch {
            setPickupSuggestions([]);
          }
        } else setPickupSuggestions([]);
      }, 300),
    []
  );

  const debouncedDestinationSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length >= 3) {
          try {
            const results = await locationService.search(query);
            setDestinationSuggestions(results);
          } catch {
            setDestinationSuggestions([]);
          }
        } else setDestinationSuggestions([]);
      }, 300),
    []
  );

  const handlePickupChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPickup(value);
      debouncedPickupSearch(value);
    },
    [debouncedPickupSearch]
  );

  const handleDestinationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setDestination(value);
      debouncedDestinationSearch(value);
    },
    [debouncedDestinationSearch]
  );

  const handleSelectPickup = useCallback((loc: LocationSuggestion) => {
    setPickup(loc.display);
    setPickupCoords(loc.coords);
    setPickupSuggestions([]);
    setShowPickupSuggestions(false);
  }, []);

  const handleSelectDestination = useCallback((loc: LocationSuggestion) => {
    setDestination(loc.display);
    setDestinationCoords(loc.coords);
    setDestinationSuggestions([]);
    setShowDestinationSuggestions(false);
  }, []);

  const handleSeePrices = useCallback(() => {
    if (routeGeometry) {
      const distanceInKm = routeGeometry.distance / 1000;
      const calculatedFare = calculateFare(distanceInKm);
      setFare(calculatedFare);
      setShowPrice(true);
    }
  }, [routeGeometry]);

  const handleRequestRide = useCallback(() => {
    if (pickupCoords && destinationCoords && session) {
      const rideId = `ride-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)}`;
      setActiveRideId(rideId);
      setIsFindingDriver(true);
      setRideStatus("searching");
      setApiError(null);

      sendMessage({
        type: "request_driver",
        rideId,
        pickup: pickupCoords,
        pickupAddress: pickup,
        destination: destinationCoords,
        destinationAddress: destination,
        estimatedFare: fare,
        clientId,
        timestamp: Date.now(),
      });
    }
  }, [
    pickupCoords,
    destinationCoords,
    session,
    pickup,
    destination,
    fare,
    clientId,
    sendMessage,
  ]);

  const handleCancelRequest = useCallback(() => {
    setIsCancelDialogOpen(true);
  }, []);

  const submitCancelRequest = useCallback(() => {
    const finalReason = cancelReason === "Other" ? customCancelReason : cancelReason;
    if (!finalReason) {
      setApiError("Please provide a reason for cancellation.");
      return;
    }
    sendMessage({ type: "cancel_ride", rideId: activeRideId, reason: finalReason, canceledBy: "client" });
    setIsCancelDialogOpen(false);
    setCancelReason("");
    setCustomCancelReason("");
    resetAllStates();
  }, [activeRideId, cancelReason, customCancelReason, sendMessage, resetAllStates]);

  const dismissError = useCallback(() => setApiError(null), []);

  // Route effect
  useEffect(() => {
    if (pickupCoords && destinationCoords) {
      setIsRouting(true);
      routeService
        .getRoute(pickupCoords, destinationCoords)
        .then((geometry) => {
          setRouteGeometry(geometry);
          setIsRouting(false);
        })
        .catch(() => {
          setIsRouting(false);
          setApiError("Could not calculate route");
        });
    } else setRouteGeometry(null);
  }, [pickupCoords, destinationCoords]);

  // Before unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        isFindingDriver ||
        rideStatus === "in-progress" ||
        rideStatus === "driver-coming" ||
        rideStatus === "driver-arrived"
      ) {
        event.preventDefault();
        event.returnValue =
          "You have an active ride. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFindingDriver, rideStatus]);

  const normalizeDriver = (driver: Driver | null) => {
    if (!driver) return null;
    const statusMap: Record<string, "available" | "on-way" | "arrived"> = {
      searching: "available",
      accepted: "on-way",
      "on-way": "on-way",
      arrived: "arrived",
      completed: "available",
    };
    const coords = normalizeCoordinates(driver.coords);
    if (!coords) return null;
    return {
      id: driver.id,
      status: statusMap[driver.status] || ("available" as const),
      coords: coords,
    };
  };

  if (!isInitialized || status === "loading") {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Compass className="w-8 h-8 text-white animate-[spin_3s_linear_infinite]" />
            </div>
          </div>
          <p className="text-sm font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Loading Ryda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-50 selection:bg-blue-500/20 selection:text-blue-700 dark:selection:text-blue-300">
      
      {/* ─────── Ambient background glow ─────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/10 via-indigo-400/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-400/10 via-teal-400/5 to-transparent blur-3xl" />
      </div>

      {/* ─────── Header ─────── */}
      <div className="relative z-10">
        <Header
          session={session}
          status={status}
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          onViewRideHistory={() => setShowRideHistory(true)}
        />
      </div>

      {/* ─────── Main Content ─────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 flex flex-col lg:flex-row h-[calc(100vh-64px)] w-full"
      >
        {/* ─── Left Panel ─── */}
        <motion.div
          variants={itemVariants}
          className="w-full lg:w-2/5 h-auto lg:h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
        >
          <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 w-full max-w-xl mx-auto">
            
            {/* ── Title ── */}
            <motion.div variants={fadeUp} className="mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                    Where to?
                  </span>
                </h1>
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 ml-10">
                Get a reliable ride in minutes.
              </p>
            </motion.div>

            {/* ── Status Indicators ── */}
            <motion.div variants={fadeUp}>
              <StatusIndicators
                connectionStatus={
                  isFindingDriver ? connectionStatus : "disconnected"
                }
                isLoadingDriverDetails={isLoadingDriverDetails}
                apiError={apiError}
                onDismissError={dismissError}
              />
            </motion.div>

            {/* ── Completion / Summary Views ── */}
            <AnimatePresence mode="wait">
              {rideStatus === "completed" && completedRide && !showRideSummary ? (
                <motion.div
                  key="completion"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <GlassCard className="mt-4">
                    <RideCompletion
                      driver={completedRide.driver}
                      fare={completedRide.fare}
                      onConfirmPayment={handleConfirmPayment}
                      isPaying={isPaying}
                      paymentMethod={paymentMethod}
                      setPaymentMethod={setPaymentMethod}
                      paymentError={paymentError}
                      onBackToDashboard={resetAllStates}
                    />
                  </GlassCard>
                </motion.div>
              ) : showRideSummary && completedRide ? (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <GlassCard className="mt-4">
                    <RideSummary
                      driver={completedRide.driver}
                      fare={completedRide.fare}
                      paymentMethod={lastPaymentMethod}
                      pickupAddress={pickup}
                      destinationAddress={destination}
                      onNewRide={() => {
                        setShowRideSummary(false);
                        resetAllStates();
                      }}
                      onViewHistory={() => setShowRideHistory(true)}
                    />
                  </GlassCard>
                </motion.div>
              ) : (
                <motion.div
                  key="booking"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* ── Location Inputs ── */}
                  <div className="space-y-2">
                    <GlassCard padding="p-4">
                      <LocationInput
                        value={pickup}
                        onChange={handlePickupChange}
                        suggestions={pickupSuggestions}
                        onSelect={handleSelectPickup}
                        placeholder="Current location"
                        icon={
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-blue-500" />
                          </div>
                        }
                        showSuggestions={showPickupSuggestions}
                        onFocus={() => setShowPickupSuggestions(true)}
                        onBlur={() =>
                          setTimeout(
                            () => setShowPickupSuggestions(false),
                            200
                          )
                        }
                        currentLocationHandler={getCurrentLocation}
                      />
                    </GlassCard>

                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md">
                        <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                      </div>
                    </div>

                    <GlassCard padding="p-4">
                      <LocationInput
                        value={destination}
                        onChange={handleDestinationChange}
                        suggestions={destinationSuggestions}
                        onSelect={handleSelectDestination}
                        placeholder="Destination"
                        icon={
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                            <Navigation className="w-4 h-4 text-emerald-500" />
                          </div>
                        }
                        showSuggestions={showDestinationSuggestions}
                        onFocus={() => setShowDestinationSuggestions(true)}
                        onBlur={() =>
                          setTimeout(
                            () => setShowDestinationSuggestions(false),
                            200
                          )
                        }
                      />
                    </GlassCard>
                  </div>

                                  {/* ── Find Rides Button ── */}
                  <motion.div variants={fadeUp} className="mt-5">
                    <GlowButton
                      disabled={isRouting || !pickupCoords || !destinationCoords}
                      onClick={handleSeePrices}
                      loading={isRouting}
                      icon={!isRouting ? <Sparkles className="w-4 h-4" /> : undefined}
                      className="w-full text-base py-4"
                    >
                      {isRouting ? "Calculating Route..." : "Find Rides"}
                    </GlowButton>
                  </motion.div>

                  {/* ── Price Display ── */}
                  <AnimatePresence>
                    {showPrice && fare !== null && routeGeometry && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-4"
                      >
                        <GlassCard>
                          <PriceDisplay
                            fare={fare}
                            routeGeometry={routeGeometry}
                            isFindingDriver={isFindingDriver}
                            driver={driver}
                            rideStatus={rideStatus}
                            pickupCoords={pickupCoords}
                            handleCancelRequest={handleCancelRequest}
                            handleRequestRide={handleRequestRide}
                            session={session}
                            isLoadingDriverDetails={isLoadingDriverDetails}
                          />
                        </GlassCard>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Error Messages ── */}
                  <AnimatePresence>
                    {geoError && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4"
                      >
                        <div className="flex items-center gap-3 rounded-xl border border-red-200/50 dark:border-red-800/30 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm px-4 py-3">
                          <CircleAlert className="w-5 h-5 text-red-500 shrink-0" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">
                            {geoError}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ─── Right Panel — Map ─── */}
        <motion.div
          variants={itemVariants}
          className="w-full lg:w-3/5 h-64 lg:h-full"
        >
          <div className="relative w-full h-full">
            {/* subtle gradient overlay on top edge */}
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-white/60 dark:from-slate-950/60 to-transparent z-10 pointer-events-none lg:hidden" />
            <MapView
              pickupCoords={pickupCoords}
              destinationCoords={destinationCoords}
              routeGeometry={routeGeometry}
              currentCoords={currentCoords}
              driver={normalizeDriver(driver)}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* ─────── Payment Modal ─────── */}
      <AnimatePresence>
        {isPaymentModalOpen && completedRide && session?.user && !showRideSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md"
            >
              <RazorpayPaymentModal
                fare={completedRide.fare}
                clientName={session.user.name || "Ryda User"}
                clientEmail={session.user.email || ""}
                clientPhone={(session.user as any).phone || "9999999999"}
                isPaying={isPaying}
                onCreateOrderAndPay={handleCreateOrderAndOpenRazorpay}
                onClose={handleCloseOnlinePayment}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={setPaymentError}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────── Ride History Modal ─────── */}
      <AnimatePresence>
        {showRideHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg max-h-[80vh] overflow-y-auto"
            >
              <RideHistory
                rides={rideHistory}
                onBack={() => setShowRideHistory(false)}
                onClose={() => setShowRideHistory(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────── Cancel Ride Modal ─────── */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Ride</DialogTitle>
            <DialogDescription>
              Please select a reason for canceling your ride.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {["Driver is too far away", "Driver asked me to cancel", "Changed my mind", "Other"].map((reason) => (
              <button
                key={reason}
                onClick={() => setCancelReason(reason)}
                className={`text-left px-4 py-3 rounded-lg border transition-all ${
                  cancelReason === reason 
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                {reason}
              </button>
            ))}
            {cancelReason === "Other" && (
              <input
                type="text"
                placeholder="Please specify..."
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-blue-800"
              />
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsCancelDialogOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors mr-2"
            >
              Keep Ride
            </button>
            <button
              onClick={submitCancelRequest}
              disabled={!cancelReason || (cancelReason === "Other" && !customCancelReason)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Confirm Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
