"use client";

import { useState, useEffect } from "react";

// Login Types
interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  country: string;
  businessType: "corporate" | "franchise";
}

// Rewards Calculator Types
interface Item {
  id: number;
  name: string;
  retailPrice: number;
  included: boolean;
  enabled?: boolean; // Add enabled property for enhanced functionality
  tier?: string;
  tierSuggestedCost?: number;
  tierPayback?: number;
  pointCost?: number;
  customerSpendRequired?: number;
  profitFromSpend?: number;
  effectiveCost?: number;
  profitImpact?: number;
}

interface Tier {
  id: number;
  name: string;
  minPrice: number;
  maxPrice: number;
  paybackRate: number;
  suggestedPointCost: number;
  avgPrice?: number; // Add for enhanced functionality
  itemCount?: number; // Add for enhanced functionality
  totalValue?: number; // Add for enhanced functionality
  priceRange?: string; // Add for enhanced functionality
  items?: Item[]; // Add for enhanced functionality
}

interface Result {
  id: number;
  name: string;
  retailPrice: number;
  tier: string;
  tierSuggestedCost: number;
  tierPayback: number;
  pointCost: number;
  customerSpendRequired: number;
  profitFromSpend: number;
  effectiveCost: number;
  profitImpact: number;
  included: boolean;
}

// Constants
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const TOKEN_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Country dial codes mapping
const countryDialCodes: Record<string, string> = {
  USA: "+1",
  Mexico: "+52",
  Argentina: "+54",
  UAE: "+971",
  Ecuador: "+593",
  Australia: "+61",
  Colombia: "+57",
  Guatemala: "+502",
  "Costa Rica": "+506",
  Honduras: "+504",
  Nicaragua: "+505",
  "El Salvador": "+503",
  Chile: "+56",
};

// SMS Rates for country dropdown
const smsRates: Record<string, number> = {
  USA: 0.01015,
  Mexico: 0.06849,
  Argentina: 0.07967,
  UAE: 0.1243,
  Ecuador: 0.20303,
  Australia: 0.02033,
  Colombia: 0.04668,
  Guatemala: 0.07614,
  "Costa Rica": 0.09145,
  Honduras: 0.09145,
  Nicaragua: 0.09145,
  "El Salvador": 0.09145,
  Chile: 0.03553,
};

// Login Utility Functions
const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateToken = async (inputToken: string): Promise<boolean> => {
  try {
    // First, try to decode the Base64 string
    const decodedString = atob(inputToken);

    // Then parse the JSON
    const tokenData = JSON.parse(decodedString);

    // Check if the token contains the required paraphrase and is not expired
    const isValid =
      tokenData.paraphrase === "client-specific-encrypt-key" &&
      new Date(tokenData.expiresAt) > new Date();

    return isValid;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
};

const saveTokenAndData = (token: string, userData: UserData): void => {
  const expiryTime = Date.now() + TOKEN_EXPIRY;
  localStorage.setItem("spoonity_token", token);
  localStorage.setItem("spoonity_token_expiry", expiryTime.toString());
  localStorage.setItem("spoonity_user_data", JSON.stringify(userData));
};

const checkTokenExpiry = (): boolean => {
  const expiryTime = localStorage.getItem("spoonity_token_expiry");
  if (expiryTime && parseInt(expiryTime) < Date.now()) {
    // Token expired
    localStorage.removeItem("spoonity_token");
    localStorage.removeItem("spoonity_token_expiry");
    localStorage.removeItem("spoonity_user_data");
    return true; // Token expired
  }
  return false; // Token still valid
};

const getStoredUserData = (): UserData | null => {
  const userData = localStorage.getItem("spoonity_user_data");
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      return null;
    }
  }
  return null;
};

const validateUserData = (
  userData: Partial<UserData>,
  country: string,
  otherCountry: string
): { isValid: boolean; fieldErrors: Record<string, string> } => {
  const fieldErrors: Record<string, string> = {};

  if (!userData.firstName?.trim()) {
    fieldErrors.firstName = "Please enter your first name";
  }

  if (!userData.lastName?.trim()) {
    fieldErrors.lastName = "Please enter your last name";
  }

  if (!userData.email?.trim() || !validateEmail(userData.email)) {
    fieldErrors.email = "Please enter a valid email address";
  }

  if (!userData.phone?.trim()) {
    fieldErrors.phone = "Please enter your cell phone number";
  }

  if (!userData.company?.trim()) {
    fieldErrors.company = "Please enter your company name";
  }

  if (!userData.role?.trim()) {
    fieldErrors.role = "Please enter your role";
  }

  if (country === "Other" && !otherCountry?.trim()) {
    fieldErrors.country = "Please enter your country";
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
};

export default function SpoonityRewardsCalculator() {
  // Login/User state variables
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("USA");
  const [otherCountry, setOtherCountry] = useState("");
  const [businessType, setBusinessType] = useState<"corporate" | "franchise">("corporate");
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [roleError, setRoleError] = useState("");
  const [countryError, setCountryError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Rewards Calculator state variables
  const [activeTab, setActiveTab] = useState("setup");
  const [config, setConfig] = useState({
    pointsPerDollar: 100,
    defaultPayback: 7,
    cogsMargin: 30,
    currencyName: "Points",
    defaultPaybackRate: 5,
  });
  const [items, setItems] = useState<Item[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  // Function to reset all states to default values
  const resetAllStates = () => {
    // Clear all localStorage items
    localStorage.clear();

    // Reset all state variables
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setRole("");
    setCountry("USA");
    setOtherCountry("");
    setBusinessType("corporate");
    setToken("");
    setTokenError("");
    setFirstNameError("");
    setLastNameError("");
    setEmailError("");
    setPhoneError("");
    setCompanyError("");
    setRoleError("");
    setCountryError("");
    setActiveTab("inputs");
    setIsLoggedIn(false);
    setItems([]);
    setTiers([]);
    setResults([]);
    setConfig({
      pointsPerDollar: 100,
      defaultPayback: 7,
      cogsMargin: 30,
      currencyName: "Points",
      defaultPaybackRate: 5,
    });
  };

  // Add a dedicated sign out function
  const handleSignOut = () => {
    resetAllStates();
    // Scroll to top after signing out
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Login handler function
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear all previous errors
    setTokenError("");
    setFirstNameError("");
    setLastNameError("");
    setEmailError("");
    setPhoneError("");
    setCompanyError("");
    setRoleError("");
    setCountryError("");

    try {
      // Basic validation
      const userData: UserData = {
        firstName,
        lastName,
        email,
        phone,
        company,
        role,
        country: country === "Other" ? otherCountry : country,
        businessType,
      };

      const validation = validateUserData(userData, country, otherCountry);
      if (!validation.isValid) {
        // Set individual field errors
        if (validation.fieldErrors.firstName)
          setFirstNameError(validation.fieldErrors.firstName);
        if (validation.fieldErrors.lastName)
          setLastNameError(validation.fieldErrors.lastName);
        if (validation.fieldErrors.email)
          setEmailError(validation.fieldErrors.email);
        if (validation.fieldErrors.phone)
          setPhoneError(validation.fieldErrors.phone);
        if (validation.fieldErrors.company)
          setCompanyError(validation.fieldErrors.company);
        if (validation.fieldErrors.role)
          setRoleError(validation.fieldErrors.role);
        if (validation.fieldErrors.country)
          setCountryError(validation.fieldErrors.country);

        return;
      }

      if (!token.trim()) {
        setTokenError("Please enter your access token");
        return;
      }

      // Validate token
      const isValidToken = await validateToken(token);
      if (!isValidToken) {
        setTokenError("Invalid access token");
        return;
      }

      // Save token and user data
      saveTokenAndData(token, userData);

      // Set logged in state
      setIsLoggedIn(true);

      // Scroll to top
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Check for existing token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem("spoonity_token");
    const expiryTime = localStorage.getItem("spoonity_token_expiry");
    const userData = getStoredUserData();

    if (
      storedToken &&
      expiryTime &&
      parseInt(expiryTime) > Date.now() &&
      userData
    ) {
      // Token is valid, restore user data
      setFirstName(userData.firstName);
      setLastName(userData.lastName);
      setEmail(userData.email);
      setPhone(userData.phone);
      setCompany(userData.company);
      setRole(userData.role);
      setCountry(userData.country);
      setOtherCountry(userData.country === "Other" ? userData.country : "");
      setBusinessType(userData.businessType);
      setToken(storedToken);
      setIsLoggedIn(true);
    }

    // Set up interval to check token expiry
    const intervalId = setInterval(() => {
      if (checkTokenExpiry()) {
        setIsLoggedIn(false);
        // Reset user data when token expires
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setCompany("");
        setRole("");
        setCountry("USA");
        setOtherCountry("");
        setBusinessType("corporate");
        setToken("");
        setTokenError("");
      }
    }, TOKEN_CHECK_INTERVAL);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Update all tiers when payback rate changes in setup
  useEffect(() => {
    if (tiers.length > 0) {
      setTiers((currentTiers) =>
        currentTiers.map((tier) => {
          const newSuggestedPointCost = Math.round(
            ((tier.minPrice +
              (tier.maxPrice === Infinity
                ? tier.minPrice * 2
                : tier.maxPrice)) /
              2 /
              (config.defaultPayback / 100)) *
              config.pointsPerDollar
          );
          const tierName = `${roundToNiceNumber(newSuggestedPointCost)} Points`;

          return {
            ...tier,
            name: tierName,
            paybackRate: config.defaultPayback,
            suggestedPointCost: newSuggestedPointCost,
          };
        })
      );
    }
  }, [config.defaultPayback, config.pointsPerDollar, tiers.length]);

  // Debug: Log results state whenever it changes
  useEffect(() => {
    console.log("📊 RESULTS STATE UPDATED:", results);
    if (results.length > 0) {
      console.log("📊 First result in state:", results[0]);
      console.log(
        "📊 customerSpendRequired in state:",
        results[0].customerSpendRequired
      );
    }
  }, [results]);

  const tabs = [
    { id: "setup", name: "Setup", icon: "⚙️" },
    { id: "items", name: "Items", icon: "📦" },
    { id: "tiers", name: "Tiers", icon: "🎯" },
    { id: "results", name: "Results", icon: "📊" },
    { id: "results-tiers", name: "Results (Tiers)", icon: "🎯" },
  ];

  // Handle CSV upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result;
      if (typeof csv !== "string") return;

      const lines = csv.split("\n");
      const headers = lines[0].split(",").map((h: string) => h.trim());

      const nameIndex = headers.findIndex(
        (h) =>
          h.toLowerCase().includes("name") || h.toLowerCase().includes("item")
      );
      const priceIndex = headers.findIndex(
        (h) =>
          h.toLowerCase().includes("price") || h.toLowerCase().includes("cost")
      );

      if (nameIndex === -1 || priceIndex === -1) {
        alert(
          "Could not find name and price columns. Please ensure your CSV has columns containing &quot;name&quot; and &quot;price&quot;."
        );
        return;
      }

      const newItems = lines
        .slice(1)
        .filter((line: string) => line.trim())
        .map((line: string) => {
          const values = line.split(",").map((v: string) => v.trim());
          const price = parseFloat(values[priceIndex]);
          if (isNaN(price)) return null;

          const item: Item = {
            id: Math.random(),
            name: values[nameIndex] || `Item ${Math.random()}`,
            retailPrice: price,
            included: true,
            enabled: true,
          };
          return item;
        })
        .filter((item): item is Item => item !== null);

      setItems(newItems);

      if (newItems.length > 0) {
        generateAutomaticTiers(newItems.filter((item) => item.enabled));
      }

      setActiveTab("items");
    };
    reader.readAsText(file);
  };

  // Round point cost to nice round numbers for tier names
  const roundToNiceNumber = (points: number) => {
    if (points >= 10000) return Math.round(points / 5000) * 5000;
    if (points >= 5000) return Math.round(points / 1000) * 1000;
    if (points >= 1000) return Math.round(points / 500) * 500;
    if (points >= 500) return Math.round(points / 100) * 100;
    return Math.round(points / 50) * 50;
  };

  // Generate automatic tiers based on price distribution (enhanced tier generation)
  const generateAutomaticTiers = (itemsData: Item[]) => {
    if (itemsData.length === 0) {
      setTiers([]);
      return;
    }

    // Sort items by price
    const sortedItems = [...itemsData].sort(
      (a, b) => a.retailPrice - b.retailPrice
    );

    // Create 5 tiers based on price quintiles
    const tierSize = Math.ceil(sortedItems.length / 5);
    const generatedTiers: Tier[] = [];

    for (let i = 0; i < 5; i++) {
      const startIndex = i * tierSize;
      const endIndex = Math.min(startIndex + tierSize, sortedItems.length);
      const tierItems = sortedItems.slice(startIndex, endIndex);

      if (tierItems.length === 0) continue;

      // Calculate tier statistics
      const minPrice = tierItems[0].retailPrice;
      const maxPrice = tierItems[tierItems.length - 1].retailPrice;
      const avgPrice =
        tierItems.reduce((sum, item) => sum + item.retailPrice, 0) /
        tierItems.length;
      const totalValue = tierItems.reduce(
        (sum, item) => sum + item.retailPrice,
        0
      );

      // Calculate optimal point cost for this tier using average price
      const customerSpendRequired =
        avgPrice / (config.defaultPaybackRate / 100);
      const suggestedPointCost = Math.round(
        customerSpendRequired * config.pointsPerDollar
      );

      generatedTiers.push({
        id: i + 1,
        name: `Tier ${i + 1}`,
        minPrice,
        maxPrice,
        avgPrice,
        itemCount: tierItems.length,
        totalValue,
        suggestedPointCost,
        priceRange: `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`,
        items: tierItems,
        paybackRate: config.defaultPaybackRate,
      });
    }

    setTiers(generatedTiers);
  };

  // Generate tiers with specific config (for real-time updates)
  const generateAutomaticTiersWithConfig = (
    itemsData: Item[],
    configToUse: typeof config
  ) => {
    if (itemsData.length === 0) {
      setTiers([]);
      return;
    }

    const sortedItems = [...itemsData].sort(
      (a, b) => a.retailPrice - b.retailPrice
    );
    const tierSize = Math.ceil(sortedItems.length / 5);
    const generatedTiers: Tier[] = [];

    for (let i = 0; i < 5; i++) {
      const startIndex = i * tierSize;
      const endIndex = Math.min(startIndex + tierSize, sortedItems.length);
      const tierItems = sortedItems.slice(startIndex, endIndex);

      if (tierItems.length === 0) continue;

      const minPrice = tierItems[0].retailPrice;
      const maxPrice = tierItems[tierItems.length - 1].retailPrice;
      const avgPrice =
        tierItems.reduce((sum, item) => sum + item.retailPrice, 0) /
        tierItems.length;
      const totalValue = tierItems.reduce(
        (sum, item) => sum + item.retailPrice,
        0
      );

      // Use the provided config for calculations
      const customerSpendRequired =
        avgPrice / (configToUse.defaultPaybackRate / 100);
      const suggestedPointCost = Math.round(
        customerSpendRequired * configToUse.pointsPerDollar
      );

      generatedTiers.push({
        id: i + 1,
        name: `Tier ${i + 1}`,
        minPrice,
        maxPrice,
        avgPrice,
        itemCount: tierItems.length,
        totalValue,
        suggestedPointCost,
        priceRange: `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`,
        items: tierItems,
        paybackRate: configToUse.defaultPaybackRate,
      });
    }

    setTiers(generatedTiers);
  };

  // Enhanced config change handler
  const handleConfigChange = (field: string, value: string | number) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);

    // Regenerate tiers with new payback rate if items exist
    if (field === "defaultPaybackRate" && items.length > 0) {
      const enabledItems = items.filter((item) => item.enabled);
      if (enabledItems.length > 0) {
        generateAutomaticTiersWithConfig(enabledItems, newConfig);
      }
    }
  };

  // Enhanced calculate results function with automatic tier assignment
  const calculateResultsEnhanced = () => {
    // Only calculate for enabled items
    const enabledItems = items.filter((item) => item.enabled);

    if (enabledItems.length === 0) {
      alert(
        "No items are enabled for calculation. Please enable at least one item."
      );
      return;
    }

    const calculatedResults = enabledItems.map((item) => {
      // Find the tier that contains this item's price
      let assignedTier = tiers.find(
        (tier) =>
          item.retailPrice >= tier.minPrice && item.retailPrice <= tier.maxPrice
      );

      // Fallback: if no exact match, find closest tier by average price
      if (!assignedTier && tiers.length > 0) {
        assignedTier = tiers.reduce((closest, current) => {
          const closestDiff = Math.abs(
            (closest.avgPrice || 0) - item.retailPrice
          );
          const currentDiff = Math.abs(
            (current.avgPrice || 0) - item.retailPrice
          );
          return currentDiff < closestDiff ? current : closest;
        });
      }

      // Default tier if none found
      if (!assignedTier) {
        const customerSpendRequired =
          item.retailPrice / (config.defaultPaybackRate / 100);
        assignedTier = {
          id: 0,
          name: "Default",
          suggestedPointCost: Math.round(
            customerSpendRequired * config.pointsPerDollar
          ),
          avgPrice: item.retailPrice,
          minPrice: 0,
          maxPrice: Infinity,
          paybackRate: config.defaultPaybackRate,
        };
      }

      // Calculate points needed for this specific item using the correct formula
      // Step 1: Calculate customer spend required = Retail Price ÷ (Payback Rate ÷ 100)
      const customerSpendRequired =
        item.retailPrice / (config.defaultPaybackRate / 100);
      // Step 2: Convert customer spend to points = Customer Spend × Points per Dollar
      const pointCost = Math.round(
        customerSpendRequired * config.pointsPerDollar
      );
      const effectiveCost = item.retailPrice;

      // Calculate profit impact
      const profitMargin = (100 - config.cogsMargin) / 100;
      const profitFromSpend = customerSpendRequired * profitMargin;
      const profitImpact = (effectiveCost / profitFromSpend) * 100;

      return {
        ...item,
        tier: assignedTier.name,
        tierSuggestedCost: assignedTier.suggestedPointCost,
        tierPayback: config.defaultPaybackRate,
        pointCost,
        customerSpendRequired,
        effectiveCost,
        profitImpact,
        profitFromSpend,
      };
    });

    setResults(calculatedResults);
    setActiveTab("results");
  };

  // Download CSV for tier-based results
  const downloadTierCSV = () => {
    if (results.length === 0) {
      alert("No results to download. Please calculate results first.");
      return;
    }

    const headers = [
      "Item Name",
      "Retail Price",
      "Assigned Tier",
      "Payback Rate",
      "Current Tier Points",
      "Customer Spend Required",
      "Profit Impact %",
      "Points Modified",
    ];
    const csvData = [
      headers.join(","),
      ...results.map((item) => {
        // Get current tier points (live values)
        const currentTier = tiers.find((tier) => tier.name === item.tier);
        const currentTierPoints = currentTier
          ? currentTier.suggestedPointCost
          : item.tierSuggestedCost || 0;
        const tierCustomerSpend = currentTierPoints / config.pointsPerDollar;
        const profitMargin = (100 - config.cogsMargin) / 100;
        const profitFromTierSpend = tierCustomerSpend * profitMargin;
        const tierProfitImpact =
          tierCustomerSpend > 0
            ? (item.retailPrice / profitFromTierSpend) * 100
            : 0;
        const wasModified =
          currentTier && currentTierPoints !== (item.tierSuggestedCost || 0);

        return [
          `"${item.name}"`,
          item.retailPrice.toFixed(2),
          `"${item.tier || "N/A"}"`,
          `${config.defaultPaybackRate}%`,
          currentTierPoints.toLocaleString(),
          tierCustomerSpend.toFixed(2),
          tierProfitImpact > 0 ? `${tierProfitImpact.toFixed(1)}%` : "N/A",
          wasModified ? "Yes" : "No",
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rewards-analysis-tier-based-results.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const TabContent = () => {
    switch (activeTab) {
      case "setup":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points per Dollar
                  </label>
                  <input
                    type="number"
                    value={config.pointsPerDollar}
                    onChange={(e) =>
                      handleConfigChange(
                        "pointsPerDollar",
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    COGS Margin (%)
                  </label>
                  <input
                    type="number"
                    value={config.cogsMargin}
                    onChange={(e) =>
                      handleConfigChange("cogsMargin", parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payback Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.defaultPaybackRate}
                    onChange={(e) =>
                      handleConfigChange(
                        "defaultPaybackRate",
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Updates tier calculations in real-time
                  </p>
                </div>
              </div>

              {/* Calculation Logic Explanation */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  📊 Calculation Logic
                </h3>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>
                    <strong>Step 1:</strong> Customer Spend Required = Retail
                    Price ÷ (Payback Rate ÷ 100)
                  </p>
                  <p>
                    <strong>Step 2:</strong> Point Cost = Customer Spend
                    Required × Points per Dollar
                  </p>
                  <div className="mt-2 p-2 bg-white rounded border-l-2 border-blue-300">
                    <p className="font-medium">
                      Example with current settings:
                    </p>
                    <p>$3.50 item with {config.defaultPaybackRate}% payback:</p>
                    <p>
                      1. Customer Spend = $3.50 ÷ ({config.defaultPaybackRate}%
                      ÷ 100) = $3.50 ÷{" "}
                      {(config.defaultPaybackRate / 100).toFixed(2)} = $
                      {(3.5 / (config.defaultPaybackRate / 100)).toFixed(2)}
                    </p>
                    <p>
                      2. Points = $
                      {(3.5 / (config.defaultPaybackRate / 100)).toFixed(2)} ×{" "}
                      {config.pointsPerDollar} ={" "}
                      {Math.round(
                        (3.5 / (config.defaultPaybackRate / 100)) *
                          config.pointsPerDollar
                      ).toLocaleString()}{" "}
                      points
                    </p>
                    <p className="mt-1" style={{ color: "#640C6F" }}>
                      <strong>Logic:</strong> Customer spends $
                      {(3.5 / (config.defaultPaybackRate / 100)).toFixed(2)},
                      earns $
                      {(3.5 / (config.defaultPaybackRate / 100)).toFixed(2)} ×{" "}
                      {config.defaultPaybackRate}% = $3.50 worth of points
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Items</h2>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:text-white file:bg-purple-800 hover:file:bg-purple-700"
              />
              <p className="text-sm text-gray-600 mt-2">
                Upload a CSV file with columns: Item Name, Retail Price
              </p>

              {/* Automatic Tier Generation Info */}
              {items.length === 0 && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-800 mb-2">
                    🤖 Automatic Tier Generation
                  </h3>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>
                      • Analyzes your data and creates 5 tiers based on price
                      distribution
                    </li>
                    <li>• Shows price ranges for each tier</li>
                    <li>
                      • Automatically calculates optimal point costs for each
                      tier
                    </li>
                    <li>• Real-time updates when you adjust payback rates</li>
                    <li>
                      • Tier analytics: average price, item count, and dollar
                      value
                    </li>
                  </ul>
                </div>
              )}

              {items.length > 0 && tiers.length > 0 && (
                <div
                  className="mt-4 p-4 rounded-lg"
                  style={{ backgroundColor: "#f3f0ff" }}
                >
                  <h3
                    className="text-sm font-medium mb-1"
                    style={{ color: "#640C6F" }}
                  >
                    ✅ Auto-Generated {tiers.length} Tiers
                  </h3>
                  <p className="text-xs" style={{ color: "#640C6F" }}>
                    Created {tiers.length} tiers from {items.length} items.
                    Check the Tiers tab to see the analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "items":
        const enabledItems = items.filter((item) => item.enabled);
        const disabledItems = items.filter((item) => !item.enabled);

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Item Management ({items.length} total)
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      <span
                        className="font-medium"
                        style={{ color: "#640C6F" }}
                      >
                        {enabledItems.length} enabled
                      </span>
                      {disabledItems.length > 0 && (
                        <span className="text-gray-400">
                          {" "}
                          • {disabledItems.length} disabled
                        </span>
                      )}
                    </div>
                    {enabledItems.length > 0 && tiers.length > 0 && (
                      <button
                        onClick={calculateResultsEnhanced}
                        className="px-4 py-2 text-white rounded-md hover:bg-opacity-90 transition-colors font-medium flex items-center gap-2"
                        style={{ backgroundColor: "#640C6F" }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        Calculate Results
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Items Uploaded
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Upload a CSV file in the Setup tab to get started.
                  </p>
                  <button
                    onClick={() => setActiveTab("setup")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Go to Setup
                  </button>
                </div>
              ) : (
                <>
                  {/* Bulk Actions */}
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => {
                            const updatedItems = items.map((item) => ({
                              ...item,
                              enabled: true,
                            }));
                            setItems(updatedItems);
                            generateAutomaticTiers(updatedItems);
                          }}
                          className="text-sm font-medium hover:opacity-80 transition-opacity"
                          style={{ color: "#640C6F" }}
                        >
                          Enable All
                        </button>
                        <button
                          onClick={() => {
                            setItems(
                              items.map((item) => ({ ...item, enabled: false }))
                            );
                            setTiers([]);
                          }}
                          className="text-sm font-medium hover:opacity-80 transition-opacity"
                          style={{ color: "#640C6F" }}
                        >
                          Disable All
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Toggle items on/off to include or exclude them from
                        calculations
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Retail Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr
                            key={item.id}
                            className={`${
                              item.enabled ? "bg-white" : "bg-gray-50"
                            } hover:bg-gray-50`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex items-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.enabled}
                                    onChange={(e) =>
                                      toggleItem(item.id, e.target.checked)
                                    }
                                    className="sr-only peer"
                                  />
                                  <div
                                    className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                                    style={{
                                      backgroundColor: item.enabled
                                        ? "#640C6F"
                                        : "#d1d5db",
                                    }}
                                  ></div>
                                  <span className="ml-3 text-sm font-medium">
                                    {item.enabled ? (
                                      <span style={{ color: "#640C6F" }}>
                                        Enabled
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">
                                        Disabled
                                      </span>
                                    )}
                                  </span>
                                </label>
                              </div>
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                item.enabled ? "text-gray-900" : "text-gray-400"
                              }`}
                            >
                              {item.name}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm ${
                                item.enabled ? "text-gray-500" : "text-gray-300"
                              }`}
                            >
                              ${item.retailPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() =>
                                  toggleItem(item.id, !item.enabled)
                                }
                                className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded transition-colors ${
                                  item.enabled
                                    ? "text-white hover:bg-opacity-90"
                                    : "text-white hover:bg-opacity-90"
                                }`}
                                style={{
                                  backgroundColor: item.enabled
                                    ? "#640C6F"
                                    : "#640C6F",
                                  opacity: item.enabled ? 1 : 0.7,
                                }}
                              >
                                {item.enabled ? "Disable" : "Enable"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-6">
                        <span className="text-gray-600">
                          <span
                            className="font-medium"
                            style={{ color: "#640C6F" }}
                          >
                            {enabledItems.length}
                          </span>{" "}
                          items will be included in calculations
                        </span>
                        {disabledItems.length > 0 && (
                          <span className="text-gray-400">
                            <span className="font-medium">
                              {disabledItems.length}
                            </span>{" "}
                            items excluded
                          </span>
                        )}
                      </div>
                      {enabledItems.length === 0 && (
                        <span className="text-amber-600 font-medium">
                          ⚠️ No items enabled for calculation
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case "tiers":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Automatic Tier Analysis
                  </h2>
                  {items.length > 0 && (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() =>
                          generateAutomaticTiers(
                            items.filter((item) => item.enabled)
                          )
                        }
                        className="px-4 py-2 text-white rounded-md hover:bg-opacity-90 transition-colors text-sm"
                        style={{ backgroundColor: "#640C6F" }}
                      >
                        Regenerate Tiers
                      </button>
                      <button
                        onClick={() =>
                          generateAutomaticTiers(
                            items.filter((item) => item.enabled)
                          )
                        }
                        className="px-4 py-2 text-white rounded-md hover:bg-opacity-90 transition-colors text-sm"
                        style={{ backgroundColor: "#ff6b35" }}
                      >
                        Reset to Auto-Generated
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {tiers.length === 0 && items.length === 0 && (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Data Available
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Upload items first to generate automatic tiers based on your
                    data.
                  </p>
                  <button
                    onClick={() => setActiveTab("setup")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Upload Items
                  </button>
                </div>
              )}

              {tiers.length > 0 && (
                <div className="p-6">
                  {/* Interactive Tier Points Info */}
                  <div
                    className="mb-4 p-4 rounded-lg"
                    style={{ backgroundColor: "#f3f0ff" }}
                  >
                    <h3
                      className="text-sm font-medium mb-1"
                      style={{ color: "#640C6F" }}
                    >
                      🎛️ Interactive Tier Points
                    </h3>
                    <p className="text-xs mb-2" style={{ color: "#640C6F" }}>
                      Tier points are now <strong>fully editable</strong>!
                      Experiment with different values to see how they affect
                      your rewards program.
                    </p>
                    <div
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
                      style={{ color: "#640C6F" }}
                    >
                      <div>
                        <strong>📊 Main Results Tab:</strong> Uses individual
                        item calculations (not affected by tier changes)
                      </div>
                      <div>
                        <strong>🎯 Results (Tiers) Tab:</strong> Uses your
                        edited tier points for all calculations
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-800">
                        Enabled Items
                      </h3>
                      <p className="text-2xl font-bold text-blue-900">
                        {items.filter((item) => item.enabled).length}
                      </p>
                      <p className="text-xs text-blue-700">
                        of {items.length} total items
                      </p>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: "#f3f0ff" }}
                    >
                      <h3
                        className="text-sm font-medium"
                        style={{ color: "#640C6F" }}
                      >
                        Total Value
                      </h3>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: "#640C6F" }}
                      >
                        $
                        {items
                          .filter((item) => item.enabled)
                          .reduce((sum, item) => sum + item.retailPrice, 0)
                          .toFixed(2)}
                      </p>
                      <p className="text-xs" style={{ color: "#640C6F" }}>
                        enabled items only
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-purple-800">
                        Average Price
                      </h3>
                      <p className="text-2xl font-bold text-purple-900">
                        $
                        {items.filter((item) => item.enabled).length > 0
                          ? (
                              items
                                .filter((item) => item.enabled)
                                .reduce(
                                  (sum, item) => sum + item.retailPrice,
                                  0
                                ) / items.filter((item) => item.enabled).length
                            ).toFixed(2)
                          : "0.00"}
                      </p>
                      <p className="text-xs text-purple-700">
                        of enabled items
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-orange-800">
                        Payback Rate
                      </h3>
                      <p className="text-2xl font-bold text-orange-900">
                        {config.defaultPaybackRate}%
                      </p>
                    </div>
                  </div>

                  {/* Tier Analytics Cards */}
                  <div className="space-y-4">
                    {tiers.map((tier) => (
                      <div key={tier.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {tier.name}
                          </h3>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            {tier.itemCount || 0} items
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">
                              Price Range
                            </p>
                            <p className="text-sm font-semibold">
                              {tier.priceRange}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">
                              Average Price
                            </p>
                            <p className="text-sm font-semibold">
                              ${(tier.avgPrice || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">
                              Total Value
                            </p>
                            <p className="text-sm font-semibold">
                              ${(tier.totalValue || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded border-2 border-blue-200">
                            <p className="text-xs text-blue-500 font-medium mb-2">
                              🎛️ Suggested Points (Editable)
                            </p>
                            <div className="relative">
                              <input
                                type="number"
                                value={tier.suggestedPointCost}
                                onChange={(e) =>
                                  updateTierPoints(tier.id, e.target.value)
                                }
                                className="w-full px-3 py-2 text-sm font-semibold text-blue-900 bg-white border-2 border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter points"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg
                                  className="w-4 h-4 text-blue-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                              </div>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              = $
                              {(
                                tier.suggestedPointCost / config.pointsPerDollar
                              ).toFixed(2)}{" "}
                              customer spend
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">
                              Customer Spend
                            </p>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: "#640C6F" }}
                            >
                              $
                              {(
                                tier.suggestedPointCost / config.pointsPerDollar
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar showing tier size relative to total */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Tier Distribution</span>
                            <span>
                              {(
                                ((tier.itemCount || 0) / items.length) *
                                100
                              ).toFixed(1)}
                              % of items
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  ((tier.itemCount || 0) / items.length) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tier Generation Logic Info */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">
                      🎯 Tier Points Experimentation
                    </h3>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>
                        • <strong>Auto-Generated:</strong> Initial points
                        calculated using average price per tier ÷ (
                        {config.defaultPaybackRate}% ÷ 100) ×{" "}
                        {config.pointsPerDollar} points/dollar
                      </p>
                      <p>
                        • <strong>Editable:</strong> Modify any tier&apos;s points to
                        test different customer spending thresholds
                      </p>
                      <p>
                        • <strong>Real-time Impact:</strong> Changes immediately
                        affect &quot;Results (Tiers)&quot; tab calculations
                      </p>
                      <p>
                        • <strong>Experimentation Tips:</strong> Try increasing
                        points for premium tiers or reducing them for
                        entry-level rewards
                      </p>
                      <div className="mt-2 p-2 bg-white rounded border-l-2 border-blue-300">
                        <p className="font-medium">
                          Example: Change Tier 2 from{" "}
                          {tiers
                            .find((t) => t.name === "Tier 2")
                            ?.suggestedPointCost?.toLocaleString() || "X"}{" "}
                          to 3,000 points
                        </p>
                        <p>
                          Customer spend requirement changes from $
                          {(() => {
                            const tier2 = tiers.find((t) => t.name === "Tier 2");
                            return tier2?.suggestedPointCost
                              ? (tier2.suggestedPointCost / config.pointsPerDollar).toFixed(2)
                              : "X";
                          })()}{" "}
                          to $30.00
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "results":
        return (
          <div className="space-y-6">
            {results.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                      Calculated Rewards
                    </h2>
                    <button
                      onClick={downloadCSV}
                      disabled={results.length === 0}
                      className="px-4 py-2 bg-[#FF7E3D] text-white rounded-md hover:bg-[#ff7e3dde] disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download CSV
                    </button>
                  </div>
                  <div className="mt-2 p-4 bg-amber-50 rounded-md">
                    <h3 className="text-sm font-medium text-amber-800 mb-2">
                      Profit Impact Explanation:
                    </h3>
                    <p className="text-xs text-amber-700">
                      <strong>Profit Impact %</strong> = (Reward Cost ÷ Profit
                      from Required Customer Spend) × 100
                    </p>
                    {results.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-amber-700">
                          <strong>Example from your data:</strong>{" "}
                          {results[0].name} ($
                          {results[0].retailPrice.toFixed(2)}),{" "}
                          {results[0].tierPayback}% payback, {config.cogsMargin}
                          % margin
                        </p>
                        <p className="text-xs text-amber-700">
                          → Customer spends $
                          {results[0].customerSpendRequired.toFixed(2)} → You
                          earn ${results[0].profitFromSpend.toFixed(2)} profit →
                          Reward costs ${results[0].effectiveCost.toFixed(2)} →
                          Impact = {results[0].profitImpact.toFixed(1)}%
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          <strong>Meaning:</strong>{" "}
                          {results[0].profitImpact.toFixed(1)}% of your profit
                          from the required customer spending goes to paying for
                          this reward
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Retail Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tier Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payback %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Spend Required
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Calculation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit from Spend
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit Impact %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.retailPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.tierSuggestedCost?.toLocaleString() || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.tierPayback || "N/A"}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.pointCost?.toLocaleString() || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.customerSpendRequired !== undefined
                              ? `$${item.customerSpendRequired.toFixed(2)}`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                            {item.tierPayback
                              ? `$${item.retailPrice.toFixed(2)} ÷ ${(
                                  item.tierPayback / 100
                                ).toFixed(3)}`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.profitFromSpend !== undefined
                              ? `$${item.profitFromSpend.toFixed(2)}`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.profitImpact !== undefined ? (
                              <span
                                className={
                                  item.profitImpact > 50
                                    ? "text-red-600"
                                    : item.profitImpact > 25
                                    ? "text-yellow-600"
                                    : ""
                                }
                                style={
                                  item.profitImpact <= 25
                                    ? { color: "#640C6F" }
                                    : {}
                                }
                              >
                                {item.profitImpact.toFixed(1)}%
                              </span>
                            ) : (
                              "N/A"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
                  <button
                    onClick={() => setActiveTab("tiers")}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ← Back to Tiers
                  </button>
                  <button
                    onClick={calculateResults}
                    className="px-4 py-2 bg-[#FF7E3D] text-white rounded-md hover:bg-[#ff7e3dde]"
                  >
                    Recalculate
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-xl font-semibold mb-4">No Results Yet</h2>
                <p className="text-gray-600 mb-4">
                  Complete the previous steps and calculate results to see the
                  data here.
                </p>
                <button
                  onClick={() => setActiveTab("tiers")}
                  className="px-4 py-2 bg-[#FF7E3D] text-white rounded-md hover:bg-[#ff7e3dde]"
                >
                  ← Back to Tiers
                </button>
              </div>
            )}
          </div>
        );

      case "results-tiers":
        return (
          <div className="space-y-6">
            {results.length > 0 ? (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                      Live Tier-Based Rewards Analysis
                    </h2>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-500">
                        Using current tier points (edit in Tiers tab)
                      </div>
                      <button
                        onClick={downloadTierCSV}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Download Tier CSV
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Retail Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned Tier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payback Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tier Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Spend Required
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit Impact %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...results]
                        .sort((a, b) => {
                          // Sort by tier name (ascending)
                          if (a.tier < b.tier) return -1;
                          if (a.tier > b.tier) return 1;
                          return 0;
                        })
                        .map((item) => {
                          // Find current tier to get LIVE suggested points (not stored values)
                          const currentTier = tiers.find(
                            (tier) => tier.name === item.tier
                          );
                          const currentTierPoints = currentTier
                            ? currentTier.suggestedPointCost
                            : item.tierSuggestedCost || 0;

                          // Calculate using CURRENT TIER points instead of stored values
                          const tierCustomerSpend =
                            currentTierPoints / config.pointsPerDollar;
                          const profitMargin = (100 - config.cogsMargin) / 100;
                          const profitFromTierSpend =
                            tierCustomerSpend * profitMargin;
                          const tierProfitImpact =
                            tierCustomerSpend > 0
                              ? (item.retailPrice / profitFromTierSpend) * 100
                              : 0;

                          return (
                            <tr key={item.id} className="bg-white hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${item.retailPrice.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {item.tier || "N/A"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {config.defaultPaybackRate}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900">
                                <div className="flex items-center">
                                  {currentTierPoints.toLocaleString()}
                                  {currentTier &&
                                    currentTierPoints !==
                                      (item.tierSuggestedCost || 0) && (
                                      <span
                                        className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                          backgroundColor: "#f3f0ff",
                                          color: "#640C6F",
                                        }}
                                      >
                                        EDITED
                                      </span>
                                    )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${tierCustomerSpend.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {tierProfitImpact > 0 ? (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      tierProfitImpact > 50
                                        ? "bg-red-100 text-red-800"
                                        : tierProfitImpact > 25
                                        ? "bg-yellow-100 text-yellow-800"
                                        : ""
                                    }`}
                                    style={
                                      tierProfitImpact <= 25
                                        ? {
                                            backgroundColor: "#f3f0ff",
                                            color: "#640C6F",
                                          }
                                        : {}
                                    }
                                  >
                                    {tierProfitImpact.toFixed(1)}%
                                  </span>
                                ) : (
                                  "N/A"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Showing {results.length} items (sorted by tier, using LIVE
                      tier points)
                    </span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: "#f3f0ff" }}
                        ></div>
                        <span>Good (&lt;25%)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></div>
                        <span>Moderate (25-50%)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-100 rounded-full mr-2"></div>
                        <span>High (&gt;50%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tier-Based Calculation Explanation */}
                <div className="px-6 py-4 bg-purple-50 border-t border-purple-200">
                  <h3 className="text-sm font-medium text-purple-800 mb-2">
                    🎯 Live Tier-Based Calculations
                  </h3>
                  <div className="text-xs text-purple-700 space-y-1">
                    <p>
                      <strong>Real-Time Updates:</strong> This view uses the
                      CURRENT tier points from the Tiers tab. Edit tier points
                      there and see instant changes here!
                    </p>
                    <p>
                      <strong>Customer Spend:</strong> Current Tier Points ÷{" "}
                      {config.pointsPerDollar} points/dollar = Required spending
                    </p>
                    <p>
                      <strong>Profit Impact:</strong> (Item Retail Price ÷
                      Profit from Current Tier-Based Spend) × 100
                    </p>
                    <p>
                      <strong>Comparison:</strong> Compare this with the main
                      Results tab to see how your edited tier structure affects
                      profit margins.
                    </p>
                    <div className="mt-2 p-2 bg-white rounded border-l-2 border-purple-300">
                      <p className="font-medium">
                        💡 Experiment: Go to Tiers tab → Edit points → Return
                        here to see live updates!
                      </p>
                      <p style={{ color: "#640C6F" }}>
                        Purple &quot;EDITED&quot; badges show items using modified tier
                        points
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-xl font-semibold mb-4">
                  No Tier Results Yet
                </h2>
                <p className="text-gray-600 mb-4">
                  Please calculate results first to see tier-based analysis.
                </p>
                <button
                  onClick={() => setActiveTab("results")}
                  className="px-4 py-2 text-white rounded-md hover:bg-opacity-90 transition-colors"
                  style={{ backgroundColor: "#ff6b35" }}
                >
                  View Item Results
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Toggle item enabled/disabled (enhanced item management)
  const toggleItem = (id: number, enabled: boolean) => {
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, enabled, included: enabled } : item
    );
    setItems(updatedItems);

    // Regenerate tiers with updated enabled items
    const enabledItems = updatedItems.filter((item) => item.enabled);
    if (enabledItems.length > 0) {
      generateAutomaticTiers(enabledItems);
    } else {
      setTiers([]);
    }
  };

  // Update tier suggested points (interactive tier editing)
  const updateTierPoints = (tierId: number, newPoints: string | number) => {
    setTiers(
      tiers.map((tier) =>
        tier.id === tierId
          ? {
              ...tier,
              suggestedPointCost: parseInt(newPoints.toString()) || 0,
            }
          : tier
      )
    );
  };

  // Calculate results
  const calculateResults = () => {
    const includedItems = items.filter((item) => item.included);
    if (includedItems.length === 0 || tiers.length === 0) return;

    const calculatedResults = includedItems.map((item) => {
      // Find appropriate tier
      const tier =
        tiers.find(
          (t) =>
            item.retailPrice >= t.minPrice &&
            (t.maxPrice === Infinity || item.retailPrice <= t.maxPrice)
        ) || tiers[tiers.length - 1];

      // Calculate point cost: how much customer needs to spend to earn this reward
      const paybackRateDecimal = tier.paybackRate / 100;
      const customerSpendRequired = item.retailPrice / paybackRateDecimal;
      const pointCost = Math.round(customerSpendRequired * config.pointsPerDollar);
      const effectiveCost = item.retailPrice;

      // Calculate profit impact: reward cost vs profit from required customer spend
      const profitMargin = config.cogsMargin / 100;
      const profitFromSpend = customerSpendRequired * profitMargin;
      const netBenefit = profitFromSpend - effectiveCost;
      const profitImpact = (effectiveCost / profitFromSpend) * 100;

      return {
        ...item,
        tier: tier.name,
        tierSuggestedCost: tier.suggestedPointCost,
        tierPayback: tier.paybackRate,
        pointCost,
        customerSpendRequired,
        effectiveCost,
        profitImpact,
        netBenefit,
        profitFromSpend,
      };
    });

    // Sort results by point cost (ascending)
    calculatedResults.sort((a, b) => a.pointCost - b.pointCost);
    setResults(calculatedResults);
    setActiveTab("results"); // Auto-advance to results tab
  };

  // Download results as CSV
  const downloadCSV = () => {
    if (results.length === 0) return;

    // Define CSV headers
    const headers = [
      "Item Name",
      "Retail Price",
      "Tier Points",
      "Payback %",
      "Points Cost",
      "Customer Spend Required",
      "Profit from Spend",
      "Profit Impact %",
    ];

    // Convert results to CSV rows
    const csvData = results.map((item) => [
      `"${item.name}"`, // Wrap in quotes to handle commas in names
      item.retailPrice.toFixed(2),
      item.tierSuggestedCost || "",
      item.tierPayback || "",
      item.pointCost || "",
      item.customerSpendRequired ? item.customerSpendRequired.toFixed(2) : "",
      item.profitFromSpend ? item.profitFromSpend.toFixed(2) : "",
      item.profitImpact ? item.profitImpact.toFixed(1) : "",
    ]);

    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map((row) => row.join(","))
      .join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `spoonity-rewards-results-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoggedIn) {
    return (
      <div className="w-full max-w-md mx-auto p-6">
        <div className="border rounded-lg shadow-sm overflow-hidden">
          <div className="bg-[#640C6F] p-6 text-white text-center">
            <h1 className="text-2xl font-bold mb-1">Spoonity</h1>
            <p className="text-white opacity-90">Reward Calculator</p>
          </div>

          <div className="p-4 border-b bg-[#F7F7F7]">
            <h2 className="text-lg font-medium">
              Please enter your information to continue
            </h2>
            <p className="text-sm text-gray-600">
              Configure your loyalty program and analyze reward costse
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="token"
                >
                  Access Token
                </label>
                <input
                  id="token"
                  type="text"
                  className={`w-full border rounded-md p-2.5 input-field ${
                    tokenError ? "border-red-500" : ""
                  }`}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTokenError("");
                  }}
                  required
                  placeholder="Enter your access token"
                />
                {tokenError && (
                  <p className="text-red-500 text-xs mt-1">{tokenError}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="country"
                >
                  Country
                </label>
                <select
                  id="country"
                  className="w-full border rounded-md p-2.5 input-field"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setCountryError("");
                    if (e.target.value === "Other") {
                      setOtherCountry("");
                    }
                  }}
                  required
                >
                  {Object.keys(smsRates).map((countryName) => (
                    <option key={countryName} value={countryName}>
                      {countryName}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              {country === "Other" && (
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="otherCountry"
                  >
                    Please Specify Country
                  </label>
                  <input
                    id="otherCountry"
                    type="text"
                    className={`w-full border rounded-md p-2.5 input-field ${
                      countryError ? "border-red-500" : ""
                    }`}
                    value={otherCountry}
                    onChange={(e) => {
                      setOtherCountry(e.target.value);
                      setCountryError("");
                    }}
                    required
                    placeholder="Enter your country"
                  />
                  {countryError && (
                    <p className="text-red-500 text-xs mt-1">{countryError}</p>
                  )}
                </div>
              )}

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="firstName"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`w-full border rounded-md p-2.5 input-field ${
                    firstNameError ? "border-red-500" : ""
                  }`}
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setFirstNameError("");
                  }}
                  required
                  placeholder="John"
                />
                {firstNameError && (
                  <p className="text-red-500 text-xs mt-1">{firstNameError}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="lastName"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`w-full border rounded-md p-2.5 input-field ${
                    lastNameError ? "border-red-500" : ""
                  }`}
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setLastNameError("");
                  }}
                  required
                  placeholder="Smith"
                />
                {lastNameError && (
                  <p className="text-red-500 text-xs mt-1">{lastNameError}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={`w-full border rounded-md p-2.5 input-field ${
                  emailError ? "border-red-500" : ""
                }`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                required
                placeholder="you@example.com"
              />
              {emailError && (
                <p className="text-red-500 text-xs mt-1">{emailError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="phone">
                Cell Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                className={`w-full border rounded-md p-2.5 input-field ${
                  phoneError ? "border-red-500" : ""
                }`}
                value={phone}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numbers and '+' symbol
                  if (/^[+\d]*$/.test(value)) {
                    setPhone(value);
                    setPhoneError("");
                  }
                }}
                required
                placeholder={
                  country !== "Other"
                    ? `${countryDialCodes[country]} followed by your number`
                    : "Enter phone number"
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                {country !== "Other"
                  ? `Country code ${countryDialCodes[country]} will be automatically added`
                  : "Please include country code"}
              </p>
              {phoneError && (
                <p className="text-red-500 text-xs mt-1">{phoneError}</p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="company"
              >
                Company Name
              </label>
              <input
                id="company"
                type="text"
                className={`w-full border rounded-md p-2.5 input-field ${
                  companyError ? "border-red-500" : ""
                }`}
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setCompanyError("");
                }}
                required
                placeholder="Your Company"
              />
              {companyError && (
                <p className="text-red-500 text-xs mt-1">{companyError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="role">
                Your Role
              </label>
              <input
                id="role"
                type="text"
                className={`w-full border rounded-md p-2.5 input-field ${
                  roleError ? "border-red-500" : ""
                }`}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setRoleError("");
                }}
                required
                placeholder="Marketing Manager"
              />
              {roleError && (
                <p className="text-red-500 text-xs mt-1">{roleError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Business Type
              </label>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="corporate"
                    name="businessType"
                    value="corporate"
                    checked={businessType === "corporate"}
                    onChange={() => setBusinessType("corporate")}
                    className="h-4 w-4 text-[#640C6F] focus:ring-[#640C6F] border-gray-300"
                  />
                  <label
                    htmlFor="corporate"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Corporately Owned
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="franchise"
                    name="businessType"
                    value="franchise"
                    checked={businessType === "franchise"}
                    onChange={() => setBusinessType("franchise")}
                    className="h-4 w-4 text-[#640C6F] focus:ring-[#640C6F] border-gray-300"
                  />
                  <label
                    htmlFor="franchise"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Franchised
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#FF7E3D] text-white py-2.5 px-4 rounded-md font-medium transform transition duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              onClick={handleLogin}
            >
              Access Calculator
            </button>

            <p className="text-xs text-gray-500 mt-4">
              By continuing, you agree that we may use your information to
              contact you about Spoonity services.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="bg-[#640C6F] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold ">
                Spoonity Rewards Calculator
              </h1>
              <p className="">
                Configure your loyalty program and analyze reward costs
              </p>
            </div>
            <div className="text-sm text-right hidden sm:block">
              <div className="text-white opacity-90">Welcome,</div>
              <div className="font-medium text-white">
                {firstName} {lastName} •{" "}
                <button
                  onClick={handleSignOut}
                  className="text-white opacity-90 hover:underline"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border border-white bg-[#0a0a0a] rounded-t-lg mt-6">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-[#640C6F] text-[#640C6F]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="border-white border-x border-b rounded-b-lg shadow mb-6">
          <div className="p-6">
            <TabContent />
          </div>
        </div>
      </div>
    </div>
  );
}
