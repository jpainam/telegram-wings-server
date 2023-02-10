require("source-map-support").install();
require("dotenv").config();
import { Request, Response } from "express";
import { sendEmail } from "./mail";

const md5 = require("md5");
const crypto = require("crypto");
const axios = require("axios");
const nanoid = require("nanoid");

type PAYMENT_METHOD = "wechatpay" | "alipay";
const CURRENCY = "USD";

const qrcode = (
  amount: number,
  orderNo: string,
  body: string,
  payment_method: PAYMENT_METHOD
) => {
  const nonce_str = crypto.randomUUID().replaceAll("-", "");
  const data = {
    merchant_no: `${process.env.HANTEPAY_MERCHANT_NO}`,
    store_no: `${process.env.HANTEPAY_STORE_NO}`,
    nonce_str: nonce_str.substring(0, 6),
    time: Math.floor(Date.now() / 1000),
    out_trade_no: orderNo,
    amount: amount,
    currency: CURRENCY,
    payment_method: `${payment_method}`,
    notify_url: `${process.env.BASE_URL}/hantepay/notify/${orderNo}`,
    body: body,
  };
  let signature = "";
  for (const key of Object.keys(data).sort()) {
    signature += `${key}=${data[key]}&`;
  }
  signature += `${process.env.HANTEPAY_API_KEY}`;
  console.log(signature)
  data["signature"] = md5(signature);
  //data["sign_type"] = "MD5";
  return data;
};

const qrpay = (amount: number, orderNo: string, body: string) => {
  const nonce_str = crypto.randomUUID().replaceAll("-", "");
  const data = {
    merchant_no: `${process.env.HANTEPAY_MERCHANT_NO}`,
    store_no: `${process.env.HANTEPAY_STORE_NO}`,
    nonce_str: nonce_str,
    time: Math.floor(Date.now() / 1000),
    out_trade_no: orderNo,
    amount: amount,
    currency: CURRENCY,
    notify_url: `${process.env.BASE_URL}/hantepay/notify/${orderNo}`,
    callback_url: `${process.env.BASE_URL}/hantepay/callback/${orderNo}`,
    body: body,
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
  body: string,
  payment_method: PAYMENT_METHOD,
  payment_type: "qrcode" | "qrpay"
) => {
  try {
    const orderNo = nanoid(12); // e.g. "HjFTrrBybSco"
    let dataConfig;
    if (payment_type == "qrcode") {
      dataConfig = qrcode(amount, orderNo, body, payment_method);
    } else {
      dataConfig = qrpay(amount, orderNo, body);
    }
    console.log(dataConfig);
    const data = JSON.stringify(dataConfig);
    console.log(data);
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
    const { amount, email, payment_method, body, payment_type } = request.body;
    if(!amount || !email || !payment_method || !body || !payment_type){
      return response.json({success: false, message: "Invalid params", data: {...request.body}});
    }
    const data = await processPayment(
      amount,
      body,
      payment_method,
      payment_type
    );
    console.log(data);
    if (data.success) {
      const res = sendEmail(data.payUrl, email);
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
