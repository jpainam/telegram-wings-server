require("source-map-support").install();
require("dotenv").config();
import { Request, Response } from "express";
import { sendEmail } from "./mail";

const md5 = require("md5");
const crypto = require("crypto");
const axios = require("axios");
const nanoid = require("nanoid");

const qrcode = (amount: number, orderNo: string) => {
  const nonce_str = crypto.randomUUID().replaceAll("-", "");
  const data = {
    amount: amount,
    body: "TestingQRCode",
    currency: "USD",
    merchant_no: `${process.env.HANTEPAY_MERCHANT_NO}`,
    nonce_str: nonce_str,
    notify_url: `${process.env.BASE_URL}/hantepay/notify/${orderNo}`,
    out_trade_no: orderNo,
    payment_method: "wechatpay",
    store_no: `${process.env.HANTEPAY_STORE_NO}`,
    time: Math.floor(Date.now() / 1000),
  };
  let signature = "";
  for (const key of Object.keys(data).sort()) {
    signature += `${key}=${data[key]}&`;
  }
  signature += `${process.env.HANTEPAY_API_KEY}`;
  data["signature"] = md5(signature);
  data["sign_type"] = "MD5";
  return data;
};

const qrpay = (amount: number, orderNo: string, payment_method: string) => {
  const nonce_str = crypto.randomUUID().replaceAll("-", "");
  const data = {
    merchant_no: `${process.env.HANTEPAY_MERCHANT_NO}`,
    store_no: `${process.env.HANTEPAY_STORE_NO}`,
    nonce_str: nonce_str,
    time: Math.floor(Date.now() / 1000),
    out_trade_no: orderNo,
    amount: amount,
    currency: "USD",
    notify_url: `${process.env.BASE_URL}/hantepay/notify/${orderNo}`,
    callback_url: `${process.env.BASE_URL}/hantepay/callback/${orderNo}`,
    body: "TestingQRCode",
  };
  let signature = "";
  for (const key of Object.keys(data).sort()) {
    signature += `${key}=${data[key]}&`;
  }
  signature += `${process.env.HANTEPAY_API_KEY}`;
  data["signature"] = md5(signature);
  //data["sign_type"] = "MD5";
  return data;
};
export const processPayment = async (
  amount: number,
  payment_method: string
) => {
  try {
    const orderNo = nanoid(12); // e.g. "HjFTrrBybSco"
    //const dataConfig = await qrcode(amount, orderNo);
    const dataConfig = await qrpay(amount, orderNo, payment_method);
    const data = JSON.stringify(dataConfig);
    //const link2 = "https://gateway.hantepay.com/v2/gateway/qrcode";
    const link = "https://gateway.hantepay.com/v2/gateway/qrpay";
    const res = await axios.post(link, data, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    const response = res.data;
    if (response["return_code"] != "ok") {
      return {
        success: false,
        data: { ...response },
        message: `${response["result_code"]} - ${response.return_msg}`,
      };
    } else {
      return {
        success: true,
        data: { ...response["data"] },
        payUrl: response["data"]["code_url"],
      };
    }
  } catch (error) {
    throw error;
  }
};

export const makePayment = async (request: Request, response: Response) => {
  try {
    const { amount, email, payment_method } = request.body;
    const data = await processPayment(amount, payment_method);
    console.log(data);
    if (data.success) {
      const res = await sendEmail(data.payUrl, email);
      return response.json({ success: true, data: data });
    } else {
      return response
        .status(500)
        .json({ success: false, message: data.message });
    }
  } catch (error) {
    return response.status(501).json({ success: false, error: error });
  }
};
export function notify(request: Request, response: Response) {
  //
}

export function callback(request: Request, response: Response) {
  //
}
