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

const clearStoredData = (): void => {
  localStorage.removeItem("spoonity_token");
  localStorage.removeItem("spoonity_token_expiry");
  localStorage.removeItem("spoonity_user_data");
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
  const [businessType, setBusinessType] = useState<"corporate" | "franchise">(
    "corporate"
  );
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Pricing Calculator state variables (missing from original file)
  const [plan, setPlan] = useState("loyalty");
  const [stores, setStores] = useState(10);
  const [transactions, setTransactions] = useState(1000);
  const [marketing, setMarketing] = useState(10000);
  const [giftCard, setGiftCard] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsMessages, setSmsMessages] = useState("");
  const [smsCountry, setSmsCountry] = useState("USA");
  const [independentServer, setIndependentServer] = useState(false);
  const [premiumSupport, setPremiumSupport] = useState(false);
  const [premiumSLA, setPremiumSLA] = useState(false);
  const [cms, setCms] = useState(false);
  const [appType, setAppType] = useState("none");
  const [dataIngestion, setDataIngestion] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappCountry, setWhatsappCountry] = useState("Mexico");
  const [whatsappMarketTicket, setWhatsappMarketTicket] = useState(0);
  const [whatsappUtility, setWhatsappUtility] = useState(0);
  const [whatsappMarketing, setWhatsappMarketing] = useState(0);
  const [whatsappOtp, setWhatsappOtp] = useState(0);
  const [monthlyFees, setMonthlyFees] = useState(0);
  const [setupFees, setSetupFees] = useState(0);
  const [perStore, setPerStore] = useState(0);
  const [totalBeforeSupport, setTotalBeforeSupport] = useState(0);
  const [feeBreakdown, setFeeBreakdown] = useState({
    total: 0,
    connection: 0,
    baseLicense: 0,
    transaction: 0,
    marketing: 0,
    giftCard: 0,
    sms: 0,
    whatsapp: {
      base: 0,
      perStore: 0,
      messages: 0,
      total: 0,
    },
    server: 0,
    sla: 0,
    cms: 0,
    app: 0,
    support: 0,
    corporate: 0,
    franchisee: 0,
    franchiseePerStore: 0,
    setup: {
      total: 0,
      onboarding: 0,
      appSetup: 0,
      dataIngestion: 0,
    },
  });
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Function to reset all states to default values
  const resetAllStates = () => {
    // Clear all localStorage items
    localStorage.clear(); // This will remove all items from localStorage

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
    setPlan("loyalty");
    setStores(10);
    setTransactions(1000);
    setMarketing(10000);
    setGiftCard(false);
    setPushNotifications(false);
    setSmsEnabled(true);
    setSmsMessages("");
    setSmsCountry("USA");
    setIndependentServer(false);
    setPremiumSupport(false);
    setPremiumSLA(false);
    setCms(false);
    setAppType("none");
    setDataIngestion(false);
    setWhatsappEnabled(false);
    setWhatsappCountry("Mexico");
    setWhatsappMarketTicket(0);
    setWhatsappUtility(0);
    setWhatsappMarketing(0);
    setWhatsappOtp(0);
    setMonthlyFees(0);
    setSetupFees(0);
    setPerStore(0);
    setActiveTab("inputs");
    setTotalBeforeSupport(0);
    setFeeBreakdown({
      total: 0,
      connection: 0,
      baseLicense: 0,
      transaction: 0,
      marketing: 0,
      giftCard: 0,
      sms: 0,
      whatsapp: {
        base: 0,
        perStore: 0,
        messages: 0,
        total: 0,
      },
      server: 0,
      sla: 0,
      cms: 0,
      app: 0,
      support: 0,
      corporate: 0,
      franchisee: 0,
      franchiseePerStore: 0,
      setup: {
        total: 0,
        onboarding: 0,
        appSetup: 0,
        dataIngestion: 0,
      },
    });
    setIsLoggedIn(false);
    setSubmitSuccess(false);
    setIsSubmitting(false);
    setSubmitError("");
    setWebhookLogs([]);
    setShowLogs(false);
    // Reset rewards calculator specific states
    setItems([]);
    setTiers([]);
    setResults([]);
    setShowAddTier(false);
    setNewTierPrice("");
    setConfig({
      pointsPerDollar: 100,
      defaultPayback: 7,
      cogsMargin: 30,
      currencyName: "Points",
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

    setIsSubmitting(true);

    // Clear all previous errors
    setTokenError("");
    setFirstNameError("");
    setLastNameError("");
    setEmailError("");
    setPhoneError("");
    setCompanyError("");
    setRoleError("");
    setCountryError("");
    setSubmitError("");

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

        setSubmitError("Please fix the errors below");
        return;
      }

      if (!token.trim()) {
        setTokenError("Please enter your access token");
        setSubmitError("Please enter your access token");
        return;
      }

      // Validate token
      const isValidToken = await validateToken(token);
      if (!isValidToken) {
        setTokenError("Invalid access token");
        setSubmitError("Invalid access token");
        return;
      }

      // If validation passes, set initial values based on country selection
      if (country === "Other") {
        // If "Other" country, initialize SMS to false and disabled
        setSmsEnabled(false);
        setSmsMessages("");
        setSmsCountry("USA");
      } else {
        // Set the SMS country to match the selected country
        setSmsCountry(country);
      }

      // Save token and user data
      saveTokenAndData(token, userData);

      // Set logged in state
      setIsLoggedIn(true);
      setSubmitSuccess(true);

      // Scroll to top
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error("Login error:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [activeTab, setActiveTab] = useState("setup");
  const [config, setConfig] = useState({
    pointsPerDollar: 100,
    defaultPayback: 7,
    cogsMargin: 30,
    currencyName: "Points",
  });
  const [items, setItems] = useState<Item[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [showAddTier, setShowAddTier] = useState(false);
  const [newTierPrice, setNewTierPrice] = useState("");

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
      setTiers(
        tiers.map((tier) => {
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
  }, [config.defaultPayback, config.pointsPerDollar]);

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
          'Could not find name and price columns. Please ensure your CSV has columns containing "name" and "price".'
        );
        return;
      }

      const newItems = lines
        .slice(1)
        .filter((line: string) => line.trim())
        .map((line: string, index: number) => {
          const values = line.split(",").map((v: string) => v.trim());
          const price = parseFloat(values[priceIndex]);
          if (isNaN(price)) return null;

          return {
            id: index,
            name: values[nameIndex] || `Item ${index + 1}`,
            retailPrice: price,
            included: true,
          };
        })
        .filter((item: any) => item !== null) as Item[];

      setItems(newItems);
      setActiveTab("items"); // Auto-advance to items tab
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

  // Add new tier at specified price point
  const addNewTier = () => {
    const pricePoint = parseFloat(newTierPrice);
    if (isNaN(pricePoint) || pricePoint <= 0) {
      alert("Please enter a valid price point");
      return;
    }

    const includedItems = items.filter((item) => item.included);
    if (includedItems.length === 0) return;

    const prices = includedItems
      .map((item) => item.retailPrice)
      .sort((a, b) => a - b);

    // Add the new price point to existing prices and remove duplicates
    const allPrices = [...new Set([...prices, pricePoint])].sort(
      (a, b) => a - b
    );

    // Regenerate tiers with the new price point included
    const numTiers = 5; // Keep 5 tiers
    const newTiers = [];

    for (let i = 0; i < numTiers; i++) {
      const startIndex = Math.floor((i * allPrices.length) / numTiers);
      const endIndex = Math.floor(((i + 1) * allPrices.length) / numTiers) - 1;

      const minPrice = i === 0 ? 0 : allPrices[startIndex];
      const maxPrice = i === numTiers - 1 ? Infinity : allPrices[endIndex];

      // Calculate suggested point cost based on average price in tier
      const tierPrices = allPrices.slice(startIndex, endIndex + 1);
      const avgPrice =
        tierPrices.reduce((sum, price) => sum + price, 0) / tierPrices.length;
      const suggestedPointCost = Math.round(
        (avgPrice / (config.defaultPayback / 100)) * config.pointsPerDollar
      );
      const tierName = `${roundToNiceNumber(suggestedPointCost)} Points`;

      newTiers.push({
        id: i,
        name: tierName,
        minPrice,
        maxPrice,
        paybackRate: config.defaultPayback,
        suggestedPointCost,
      });
    }

    setTiers(newTiers);
    setShowAddTier(false);
    setNewTierPrice("");
  };

  // Generate tiers
  const generateTiers = () => {
    if (items.length === 0) return;

    const includedItems = items.filter((item) => item.included);
    const prices = includedItems
      .map((item) => item.retailPrice)
      .sort((a, b) => a - b);

    if (prices.length === 0) return;

    const numTiers = 5; // Always generate 5 tiers
    const generatedTiers = [];

    for (let i = 0; i < numTiers; i++) {
      const startIndex = Math.floor((i * prices.length) / numTiers);
      const endIndex = Math.floor(((i + 1) * prices.length) / numTiers) - 1;

      const minPrice = i === 0 ? 0 : prices[startIndex];
      const maxPrice = i === numTiers - 1 ? Infinity : prices[endIndex];

      // Calculate suggested point cost based on average price in tier
      const tierPrices = prices.slice(startIndex, endIndex + 1);
      const avgPrice =
        tierPrices.reduce((sum, price) => sum + price, 0) / tierPrices.length;
      const suggestedPointCost = Math.round(
        (avgPrice / (config.defaultPayback / 100)) * config.pointsPerDollar
      );

      const tierName = `${roundToNiceNumber(suggestedPointCost)} Points`;

      generatedTiers.push({
        id: i,
        name: tierName,
        minPrice,
        maxPrice,
        paybackRate: config.defaultPayback,
        suggestedPointCost,
      });
    }

    setTiers(generatedTiers);
    setActiveTab("tiers"); // Auto-advance to tiers tab
  };

  // Calculate point value (for display purposes)
  const calculatePointValue = () => {
    return config.defaultPayback / 100 / config.pointsPerDollar;
  };

  // Calculate suggested point cost for a given payback rate and price
  const calculateSuggestedPointCost = (price: number, paybackRate: number) => {
    // Point Cost = (Retail Price ÷ Payback Rate) × Points per Dollar
    return Math.round((price / (paybackRate / 100)) * config.pointsPerDollar);
  };

  // Update tier
  const updateTier = (tierId: number, field: string, value: any) => {
    setTiers(
      tiers.map((tier) => {
        if (tier.id === tierId) {
          const updatedTier = { ...tier, [field]: value };

          // Recalculate suggested point cost when payback rate changes
          if (field === "paybackRate") {
            const avgPrice =
              (tier.minPrice +
                (tier.maxPrice === Infinity
                  ? tier.minPrice * 2
                  : tier.maxPrice)) /
              2;
            updatedTier.suggestedPointCost = calculateSuggestedPointCost(
              avgPrice,
              value
            );
          }

          return updatedTier;
        }
        return tier;
      })
    );
  };

  // Calculate results
  const calculateResults = () => {
    const includedItems = items.filter((item) => item.included);
    if (includedItems.length === 0 || tiers.length === 0) return;

    console.log("=== STARTING CALCULATIONS ===");
    console.log("Config:", config);
    console.log("Available Tiers:", tiers);

    const calculatedResults = includedItems.map((item) => {
      // Find appropriate tier
      const tier =
        tiers.find(
          (t) =>
            item.retailPrice >= t.minPrice &&
            (t.maxPrice === Infinity || item.retailPrice <= t.maxPrice)
        ) || tiers[tiers.length - 1];

      console.log(`\n--- ITEM: ${item.name} ---`);
      console.log(`Retail Price: $${item.retailPrice}`);
      console.log(
        `Matched Tier: ${tier.name} (${tier.minPrice} - ${
          tier.maxPrice === Infinity ? "∞" : tier.maxPrice
        })`
      );
      console.log(`Tier Payback Rate FROM TIER OBJECT: ${tier.paybackRate}%`);
      console.log(`Tier object full details:`, tier);

      // Calculate point cost: how much customer needs to spend to earn this reward
      const paybackRateDecimal = tier.paybackRate / 100;
      console.log(
        `Payback Rate as decimal: ${tier.paybackRate} / 100 = ${paybackRateDecimal}`
      );

      // Point Cost = (Retail Price ÷ Payback Rate) × Points per Dollar
      const customerSpendRequired = item.retailPrice / paybackRateDecimal;
      console.log(
        `Customer Spend Required: $${item.retailPrice} ÷ ${paybackRateDecimal} = $${customerSpendRequired}`
      );

      // VERIFICATION CHECK
      if (Math.abs(customerSpendRequired - item.retailPrice) < 0.01) {
        console.log(
          `🚨 ERROR: Customer spend required equals retail price! This means payback rate = 100%`
        );
        console.log(`🚨 Check: paybackRateDecimal = ${paybackRateDecimal}`);
      }

      const pointCost = Math.round(
        customerSpendRequired * config.pointsPerDollar
      );
      console.log(
        `Point Cost: $${customerSpendRequired} × ${config.pointsPerDollar} = ${pointCost} points`
      );

      // Effective cost to business = retail price of the reward item
      const effectiveCost = item.retailPrice;

      // Calculate profit impact: reward cost vs profit from required customer spend
      const profitMargin = config.cogsMargin / 100;
      const profitFromSpend = customerSpendRequired * profitMargin;
      const netBenefit = profitFromSpend - effectiveCost;
      const profitImpact = (effectiveCost / profitFromSpend) * 100;

      console.log(
        `Profit from $${customerSpendRequired} spend at ${
          config.cogsMargin
        }% margin: $${profitFromSpend.toFixed(2)}`
      );
      console.log(`Reward costs: $${effectiveCost.toFixed(2)}`);
      console.log(
        `Profit Impact: (${effectiveCost} ÷ ${profitFromSpend.toFixed(
          2
        )}) × 100 = ${profitImpact.toFixed(1)}%`
      );

      const result = {
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

      console.log(`🔍 FINAL RESULT OBJECT for ${item.name}:`, result);
      console.log(`  - customerSpendRequired: ${result.customerSpendRequired}`);
      console.log(`  - profitFromSpend: ${result.profitFromSpend}`);
      console.log(`  - profitImpact: ${result.profitImpact}`);

      return result;
    });

    // Sort results by point cost (ascending)
    calculatedResults.sort((a, b) => a.pointCost - b.pointCost);

    console.log("=== FINAL RESULTS ARRAY ===");
    console.log("Results array length:", calculatedResults.length);
    calculatedResults.forEach((result, index) => {
      console.log(`[${index}] ${result.name}:`);
      console.log(`  - retailPrice: ${result.retailPrice}`);
      console.log(`  - customerSpendRequired: ${result.customerSpendRequired}`);
      console.log(`  - profitFromSpend: ${result.profitFromSpend}`);
      console.log(`  - profitImpact: ${result.profitImpact}`);
      console.log(`  - pointCost: ${result.pointCost}`);
    });

    console.log("🔄 About to call setResults with:", calculatedResults);
    setResults(calculatedResults);
    console.log("✅ setResults called");
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

  const toggleItemIncluded = (itemId: number) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, included: !item.included } : item
      )
    );
  };

  const TabContent = () => {
    switch (activeTab) {
      case "setup":
        return (
          <div className="space-y-6">
            {/* Loyalty Program Configuration Section */}
            <div className="bg-[#0a0a0a] border border-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Loyalty Program Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points per Dollar Spent
                  </label>
                  <input
                    type="number"
                    value={config.pointsPerDollar}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        pointsPerDollar: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#640C6F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Payback Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.defaultPayback}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        defaultPayback: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#640C6F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    COGS Margin (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.cogsMargin}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        cogsMargin: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#640C6F]"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-white text-black border-white border rounded-md">
                <p className="text-sm">
                  <strong>Calculation Logic:</strong> Point cost = (Retail Price
                  ÷ Payback %) × Points per Dollar Spent
                </p>
                <p className="text-xs mt-1">
                  <strong>Customer Spend Required Formula:</strong> Retail Price
                  ÷ (Payback Rate ÷ 100)
                </p>
                <p className="text-xs mt-1">
                  <strong>Step-by-step example:</strong> $3.50 item with 7%
                  payback:
                </p>
                <div className="text-xs mt-1 ml-4">
                  <p>1. Convert payback to decimal: 7% ÷ 100 = 0.07</p>
                  <p>2. Calculate spend needed: $3.50 ÷ 0.07 = $50</p>
                  <p>
                    3. Convert to points: $50 × 100 points/dollar = 5,000 points
                  </p>
                  <p>
                    4. <strong>Logic:</strong> When customer spends $50, they
                    earn $50 × 7% = $3.50 worth of points
                  </p>
                  <p>
                    5. Those $3.50 worth of points can redeem the $3.50 item
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setActiveTab("items")}
                  className="px-4 py-2 bg-[#FF7E3D] text-white rounded-md hover:bg-[#ff7e3dde] focus:outline-none focus:ring-2 focus:ring-[#640C6F]"
                >
                  Next: Upload Items &gt;
                </button>
              </div>
            </div>
          </div>
        );

      case "items":
        return (
          <div className="space-y-6">
            <div className="bg-white border rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Upload Product Items
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File (columns: name, price)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#FF7E3D] file:text-white hover:file:bg-[#ff7e3dde]"
                />
              </div>
            </div>

            {items.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium">
                    Product Items ({items.filter((i) => i.included).length}{" "}
                    selected)
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Include
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Retail Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={item.included}
                              onChange={() => toggleItemIncluded(item.id)}
                              className="h-4 w-4 text-[#640C6F] rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.retailPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
                  <button
                    onClick={() => setActiveTab("setup")}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ← Back to Setup
                  </button>
                  <button
                    onClick={generateTiers}
                    disabled={items.filter((i) => i.included).length === 0}
                    className="px-4 py-2 bg-[#FF7E3D] text-white rounded-md hover:bg-[#ff7e3dde] disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Generate Tiers →
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case "tiers":
        return (
          <div className="space-y-6">
            {tiers.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Reward Tiers & Payback Rates
                  </h2>

                  <div className="grid gap-4">
                    {tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Tier Name
                            </label>
                            <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                              {tier.name}
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Price Range
                            </label>
                            <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                              ${tier.minPrice.toFixed(2)} -{" "}
                              {tier.maxPrice === Infinity
                                ? "∞"
                                : `${tier.maxPrice.toFixed(2)}`}
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Payback Rate (%)
                            </label>
                            <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                              {tier.paybackRate}% (from setup)
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Suggested Points Cost
                            </label>
                            <p className="text-sm font-medium text-[#640C6F]">
                              {tier.suggestedPointCost.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              (Customer spends $
                              {(
                                tier.suggestedPointCost / config.pointsPerDollar
                              ).toFixed(2)}
                              )
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-between items-center">
                    <button
                      onClick={() => setActiveTab("items")}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      ← Back to Items
                    </button>
                    <button
                      onClick={calculateResults}
                      className="px-4 py-2 bg-[#FF7E3D] text-white rounded-md hover:bg-[#ff7e3dde]"
                    >
                      Calculate Results →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-xl font-semibold mb-4">
                  No Tiers Generated
                </h2>
                <p className="text-gray-600 mb-4">
                  Please go back and upload items first, then generate tiers.
                </p>
                <button
                  onClick={() => setActiveTab("items")}
                  className="px-4 py-2 bg-[#FF7E3D] text-white rounded-md hover:bg-[#ff7e3dde]"
                >
                  ← Back to Items
                </button>
              </div>
            )}
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
                      {results.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
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
                                    : "text-green-600"
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

      default:
        return null;
    }
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
