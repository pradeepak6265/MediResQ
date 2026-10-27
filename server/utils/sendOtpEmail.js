const sendOtpEmail = async ({ email, name, otp }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "MediResQ";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email configuration is missing.");
  }

  if (
    apiKey === "your_brevo_api_key" ||
    senderEmail === "your_verified_sender_email"
  ) {
    throw new Error("Brevo credentials have not been configured.");
  }

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email,
            name,
          },
        ],
        subject: "Verify Your MediResQ Account",
        textContent: [
          `Hello ${name},`,
          "",
          `Your MediResQ verification code is: ${otp}`,
          "",
          "This code expires in 10 minutes.",
          "Do not share this code with anyone.",
          "",
          "If you did not request this code, you can ignore this email.",
          "",
          "MediResQ Team",
        ].join("\n"),
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    // Do not log API keys, OTPs, or other secrets.
    console.error("Brevo email request failed:", {
      status: response.status,
      details: errorText.slice(0, 500),
    });

    throw new Error("Unable to send the verification email.");
  }

  return true;
};

module.exports = sendOtpEmail;