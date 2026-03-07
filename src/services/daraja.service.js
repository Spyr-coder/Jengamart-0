const axios = require("axios");
const ApiError = require("../utils/apiError");

const MPESA_ENV = process.env.MPESA_ENV || "sandbox";

const baseUrls = {
  sandbox: {
    auth: "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    stkPush: "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
  },
  production: {
    auth: "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    stkPush: "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
  }
};

const getTimestamp = () => {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
};

const getPassword = (shortcode, passkey, timestamp) => {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
};

const getAccessToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new ApiError(500, "Missing M-Pesa consumer credentials");
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const response = await axios.get(baseUrls[MPESA_ENV].auth, {
    headers: {
      Authorization: `Basic ${auth}`
    }
  });

  if (!response.data?.access_token) {
    throw new ApiError(500, "Failed to get M-Pesa access token");
  }

  return response.data.access_token;
};

const normalizePhone = (phone) => {
  let value = String(phone).trim();

  if (value.startsWith("+")) {
    value = value.slice(1);
  }

  if (value.startsWith("0")) {
    value = `254${value.slice(1)}`;
  }

  if (value.startsWith("7")) {
    value = `254${value}`;
  }

  return value;
};

const initiateStkPush = async ({ phone, amount, accountReference, transactionDesc }) => {
  const token = await getAccessToken();

  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!shortcode || !passkey || !callbackUrl) {
    throw new ApiError(500, "Missing M-Pesa STK configuration");
  }

  const timestamp = getTimestamp();
  const password = getPassword(shortcode, passkey, timestamp);
  const formattedPhone = normalizePhone(phone);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(Number(amount)),
    PartyA: formattedPhone,
    PartyB: shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc
  };

  try {
    const response = await axios.post(baseUrls[MPESA_ENV].stkPush, payload, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.errorMessage ||
      error.response?.data?.ResponseDescription ||
      error.message ||
      "M-Pesa STK push failed";

    throw new ApiError(400, message);
  }
};

module.exports = {
  initiateStkPush,
  normalizePhone
};