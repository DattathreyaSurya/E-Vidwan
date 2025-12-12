const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // Email for which OTP is generated
  otp: { type: Number, required: true }, // Generated OTP
  otpExpires: { type: Date, required: true }, // Expiry time for the OTP
});

module.exports = mongoose.model("Otp", otpSchema);